import { rbybit } from './bybit_rest.js';

// Bybit API anahtarlarınızı buraya girin
const API_KEY = "Qt1M5KcBLRbILo4jNQ";
const API_SECRET = "bkJw6nvA94qKrMiwtUMFClSbt1rv9qMtNxmE";

// Emir parametreleri
const symbol = 'KNCUSDT'; // İşlem yapılacak sembol
const side = 'BUY'; // 'BUY' veya 'SELL'
const type = 'MARKET'; // Piyasa emri
const amount = 15; // Lot miktarı

async function main() {
    const bybit = new rbybit(API_KEY, API_SECRET);

    // Sembol listesini ekrana yazdır
    const exchangeInfo = await bybit.get_exchange();
    console.log('Bybit sembol listesi:', JSON.stringify(exchangeInfo));

    // Tüm semboller için ticker cevabını ekrana yazdır
    const allTickers = await bybit.call('/v5/market/ticker', 0, { category: 'linear' });
    console.log('Bybit ticker tüm semboller:', JSON.stringify(allTickers));

    // Sembol hassasiyetini çek
    let pricePrecision = 2;
    if (exchangeInfo && exchangeInfo.symbols) {
        const symbolInfo = exchangeInfo.symbols.find(s => s.symbol === symbol);
        if (symbolInfo && typeof symbolInfo.pricePrecision === 'number') {
            pricePrecision = symbolInfo.pricePrecision;
        }
    }

    // Son fiyatı al
    const ticker = await bybit.call('/v5/market/tickers', 0, { category: 'linear', symbol });
    console.log('Bybit ticker cevabı:', JSON.stringify(ticker));
    if (!ticker || !ticker.result || !ticker.result.list || !ticker.result.list[0] || !ticker.result.list[0].lastPrice) {
        console.error('Fiyat alınamadı!');
        return;
    }
    const price = parseFloat(ticker.result.list[0].lastPrice);

    // Piyasa emri aç
    const order = await bybit.order_send(symbol, side, type, amount, price);
    console.log('Açılan Emir:', order);

    // SL ve TP fiyatlarını hesapla
    let slPrice, tpPrice;
    if (side === 'BUY') {
        slPrice = price * 0.99; // %1 aşağıda
        tpPrice = price * 1.02; // %2 yukarıda
    } else {
        slPrice = price * 1.01; // %1 yukarıda
        tpPrice = price * 0.98; // %2 aşağıda
    }
    // Hassasiyete göre yuvarla
    slPrice = parseFloat(slPrice.toFixed(pricePrecision));
    tpPrice = parseFloat(tpPrice.toFixed(pricePrecision));

    // Stop Loss (SL) emri
    let slOrder = await bybit.order_send(symbol, side === 'BUY' ? 'SELL' : 'BUY', 'SL', amount, slPrice);
    console.log('Stop Loss Emir:', slOrder);

    // Take Profit (TP) emri
    const tpOrder = await bybit.order_send(symbol, side === 'BUY' ? 'SELL' : 'BUY', 'TP', amount, tpPrice);
    console.log('Take Profit Emir:', tpOrder);

    // SL orderId ve stopPrice
    let currentSlOrderId = slOrder.orderId;
    let currentSlPrice = slPrice;
    for (let i = 0; i < 5; i++) {
        await new Promise(res => setTimeout(res, 3000));
        // SL emrini sil
        if (currentSlOrderId) {
            let delResult = null;
            try {
                delResult = await bybit.order_delete({ symbol, orderId: currentSlOrderId });
            } catch (e) {
                console.log(`SL emri silinirken hata: ${e}`);
            }
            if (delResult && delResult.status === 'CANCELED') {
                console.log(`SL emri silindi: ${currentSlOrderId}`);
            } else if (delResult && delResult.code) {
                console.log(`SL emri silinemedi: ${delResult.code} - ${delResult.msg}`);
            } else {
                console.log(`SL emri silinemedi veya cevap alınamadı: ${currentSlOrderId}`);
            }
        }
        // SL fiyatını %0.1 yukarı taşı
        currentSlPrice = parseFloat((currentSlPrice * 1.001).toFixed(pricePrecision));
        // Yeni SL emrini aç
        slOrder = await bybit.order_send(symbol, side === 'BUY' ? 'SELL' : 'BUY', 'SL', amount, currentSlPrice);
        currentSlOrderId = slOrder && slOrder.orderId ? slOrder.orderId : null;
        console.log(`Yeni SL Emir:`, slOrder);
    }
}

main().catch(console.error); 