import rbinance from './binance_rest.js';

// Binance API anahtarlarınızı buraya girin
const API_KEY = "uRrya0rcs97Jkja72W2E7H0r3PL2aT0qI9ZsStRapYkcO7oSBG3RUOs9zrLxQjE0";
const API_SECRET = "IsLwMJm5SKouBkGwn7Lvvx7EHZjlosAYGRQ8DB56YXVNmrB6rmG6eozT4uM4T8sU";

// Emir parametreleri
const symbol = 'KNCUSDT'; // İşlem yapılacak sembol
const side = 'BUY'; // 'BUY' veya 'SELL'
const type = 'MARKET'; // Piyasa emri
const amount = 15; // Lot miktarı

async function main() {
    const binance = new rbinance(API_KEY, API_SECRET);

    // Sembol hassasiyetini çek
    const exchangeInfo = await binance.get_exchange();
    let pricePrecision = 2;
    if (exchangeInfo && exchangeInfo.symbols) {
        const symbolInfo = exchangeInfo.symbols.find(s => s.symbol === symbol);
        if (symbolInfo && typeof symbolInfo.pricePrecision === 'number') {
            pricePrecision = symbolInfo.pricePrecision;
        }
    }

    // Son fiyatı al
    const ticker = await binance.call('/fapi/v1/ticker/price', 0, { symbol });
    if (!ticker || !ticker.price) {
        console.error('Fiyat alınamadı!');
        return;
    }
    const price = parseFloat(ticker.price);

    // Piyasa emri aç
    const order = await binance.order_send(symbol, side, type, amount, price);
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
    let slOrder = await binance.order_send(symbol, side === 'BUY' ? 'SELL' : 'BUY', 'SL', amount, slPrice);
    console.log('Stop Loss Emir:', slOrder);

    // Take Profit (TP) emri
    const tpOrder = await binance.order_send(symbol, side === 'BUY' ? 'SELL' : 'BUY', 'TP', amount, tpPrice);
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
                delResult = await binance.order_delete(symbol, currentSlOrderId);
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
        slOrder = await binance.order_send(symbol, side === 'BUY' ? 'SELL' : 'BUY', 'SL', amount, currentSlPrice);
        currentSlOrderId = slOrder && slOrder.orderId ? slOrder.orderId : null;
        console.log(`Yeni SL Emir:`, slOrder);
    }
}

main().catch(console.error);
