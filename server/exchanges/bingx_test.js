import { rbingx } from './bingx_rest.js';

// BingX API anahtarlarınızı buraya girin
const API_KEY = "koGGZHtNpvWeseK6vaZgz9gEnKARzH9CRjO8f4nnC3tffs4oBQbDDXA2H7S4Kq19ELElZkENXODKj3G1SlbyQ";
const API_SECRET = "Qe2uG2XnUCD2xUMmsZ5wSRtBVgktN2qLkDYca40opPwXqaKnVcLD2G1o9sRAfe02oGOGrOJQyoszTJrUdm2DA";

// Emir parametreleri
const symbol = 'KNC-USDT'; // BingX'te sembol formatı genellikle tireli
const side = 'BUY'; // 'BUY' veya 'SELL'
const type = 'MARKET'; // Piyasa emri
const amount = 6; // Lot miktarı

async function main() {
    const bingx = new rbingx(API_KEY, API_SECRET);

    // Sembol hassasiyetini çek
    const exchangeInfo = await bingx.get_exchange();
    let pricePrecision = 2;
    if (exchangeInfo && Array.isArray(exchangeInfo)) {
        const symbolInfo = exchangeInfo.find(s => s.symbol === symbol);
        if (symbolInfo && typeof symbolInfo.pricePrecision === 'number') {
            pricePrecision = symbolInfo.pricePrecision;
        }
    }

    // Son fiyatı al
    const ticker = await bingx.call('/openApi/swap/v2/quote/price', 0, { symbol });
    console.log('BingX ticker cevabı:', JSON.stringify(ticker));
    if (!ticker || !ticker.data || !ticker.data.price) {
        console.error('Fiyat alınamadı!');
        return;
    }
    const price = parseFloat(ticker.data.price);

    // Piyasa emri aç
    const order = await bingx.order_send(symbol.replace('-', ''), side, type, amount, price);
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
    let slOrder = await bingx.order_send(symbol.replace('-', ''), side === 'BUY' ? 'SELL' : 'BUY', 'SL', amount, slPrice);
    console.log('Stop Loss Emir:', slOrder);

    // Take Profit (TP) emri
    const tpOrder = await bingx.order_send(symbol.replace('-', ''), side === 'BUY' ? 'SELL' : 'BUY', 'TP', amount, tpPrice);
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
                delResult = await bingx.order_delete(symbol.replace('-', ''), currentSlOrderId);
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
        } else {
            console.log('SL emri açılmadı veya geçersiz, silme işlemi atlandı.');
        }
        // SL fiyatını %0.1 yukarı taşı
        currentSlPrice = parseFloat((currentSlPrice * 1.001).toFixed(pricePrecision));
        // Yeni SL emrini aç
        slOrder = await bingx.order_send(symbol.replace('-', ''), side === 'BUY' ? 'SELL' : 'BUY', 'SL', amount, currentSlPrice);
        currentSlOrderId = slOrder.orderId;
        console.log(`Yeni SL Emir:`, slOrder);
    }
}

main().catch(console.error); 