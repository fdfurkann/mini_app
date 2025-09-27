import rbingx from './bingx_rest.js';

// --- Kullanıcı Bilgileri ve İşlem Parametreleri ---
const API_KEY = 'dGJdf7VcfVVYJ5qARtJZAPDUf2EMhRAcQy1h41L3AclqzuYQ2T7hT51sGR5w3O0MygzJF5bKiF4acRe5rD81A';
const API_SECRET = 'voeqBhZGHmAkdafX1PEd1E5W4o8nFiOQyzPsKaFlyGWwFKBfNWzhpTHrMUZPWfXhUt96y1vxM1oCbn6FcQ';
const SYMBOL = 'HIGHUSDT';
const LEVERAGE = 20; // Kaldıraç
const MARGIN_TYPE = 'CROSSED';
const ORDER_MARGIN_USDT = 6; // İşlem büyüklüğü (USDT)
const STOPLOSS_PERCENT = 5; // %5
const TAKEPROFIT_PERCENT = 5; // %5
const bulk_order = 1;

async function main() {
    const bingx = new rbingx(API_KEY, API_SECRET);
    try {
        // 1. Sembol Bilgisi
        const exchangeInfo = await bingx.get_exchange();
        const symbolInfo = exchangeInfo.data.find(s => s.symbol.replace('-', '') === SYMBOL);
        if (!symbolInfo) throw new Error('Sembol bulunamadı!');
        console.log('symbolInfo:', symbolInfo);
        bingx.digits = symbolInfo.pricePrecision || 2;
        bingx.vdigits = symbolInfo.quantityPrecision || 3;

        // StepSize, minQty ve tickSize bul
        let stepSize = 0.0001;
        let minQty = 0.0001;
        let tickSize = 0.0001;
        if (symbolInfo.lotSizeFilter) {
            stepSize = parseFloat(symbolInfo.lotSizeFilter.qtyStep);
            minQty = parseFloat(symbolInfo.lotSizeFilter.minOrderQty);
        }
        if (symbolInfo.priceFilter) {
            tickSize = parseFloat(symbolInfo.priceFilter.tickSize);
        }

        // 2. Kaldıraç Ayarla
        const leverageResult = await bingx.api_set_leverage(SYMBOL, LEVERAGE);
        console.log('Kaldıraç Ayar Sonucu:', leverageResult);

        // 3. Margin Tipi Ayarla
        const marginTypeResult = await bingx.api_set_margin_type(SYMBOL, MARGIN_TYPE);
        console.log('Margin Tipi Ayar Sonucu:', marginTypeResult);

        // 4. Son fiyatı al
        const lastPrice = await bingx.get_last_price(SYMBOL);
        if (!lastPrice) throw new Error('Fiyat alınamadı!');
        console.log('Son Fiyat:', lastPrice);

        // 5. Miktarı hesapla (USDT cinsinden)
        let quantity = ORDER_MARGIN_USDT / lastPrice;
        quantity = Math.floor(quantity / stepSize) * stepSize;
        if (quantity < minQty) {
            throw new Error(`Hesaplanan miktar minQty'den küçük! (${quantity} < ${minQty})`);
        }
        quantity = parseFloat(quantity.toFixed(bingx.vdigits));
        console.log('İşlem Miktarı:', quantity);

        if(bulk_order==0) {
            // 6. Piyasa Emri Aç (LONG)
            const marketOrder = await bingx.order_send(SYMBOL, 'BUY', 'MARKET', quantity, lastPrice);
            console.log('Piyasa Emri Sonucu:', marketOrder);

            // 7. Stop Loss Fiyatı Hesapla
            const stopLossPrice = (lastPrice * (1 - STOPLOSS_PERCENT / 100)).toFixed(bingx.digits);
            // 8. Take Profit Fiyatı Hesapla
            const takeProfitPrice = (lastPrice * (1 + TAKEPROFIT_PERCENT / 100)).toFixed(bingx.digits);
            console.log('Stop Loss Fiyatı:', stopLossPrice);
            console.log('Take Profit Fiyatı:', takeProfitPrice);

            // 9. Stop Loss Emri Aç (reduceOnly olmadan)
            const stopOrder = await bingx.order_send(SYMBOL, 'SELL', 'SL', quantity, stopLossPrice);
            console.log('Stop Loss Emri Sonucu:', stopOrder);

            // 10. Take Profit Emri Aç (reduceOnly olmadan)
            const tpOrder = await bingx.order_send(SYMBOL, 'SELL', 'TP', quantity, takeProfitPrice);
            console.log('Take Profit Emri Sonucu:', tpOrder);
        } else {
            // 7. Stop Loss Fiyatı Hesapla
            const stopLossPrice = (lastPrice * (1 - STOPLOSS_PERCENT / 100)).toFixed(bingx.digits);
            // 8. Take Profit Fiyatı Hesapla
            const takeProfitPrice = (lastPrice * (1 + TAKEPROFIT_PERCENT / 100)).toFixed(bingx.digits);
            console.log('Stop Loss Fiyatı:', stopLossPrice);
            console.log('Take Profit Fiyatı:', takeProfitPrice);

            // Emirleri hazırlayıp topluca gönder
            const orders = [];
            orders.push(bingx.prepare_order(SYMBOL, 'BUY', 'MARKET', quantity, lastPrice));
            orders.push(bingx.prepare_order(SYMBOL, 'SELL', 'SL', quantity, stopLossPrice));
            orders.push(bingx.prepare_order(SYMBOL, 'SELL', 'TP', quantity, takeProfitPrice));
            console.log('orders:', orders);
            const bulkResult = await bingx.bulk_order_send(orders);
            console.log('Bulk Order Sonucu:', bulkResult);
        }

        // --- YENİ: Kademeli Limit TP Emirleri ---
        const tpPercents = [1, 2, 3, 4];
        const tpQtyPercent = 0.20; // %20
        for (let i = 0; i < tpPercents.length; i++) {
            let tpPrice = lastPrice * (1 + tpPercents[i] / 100);
            tpPrice = Math.floor(tpPrice / tickSize) * tickSize;
            tpPrice = parseFloat(tpPrice.toFixed(bingx.digits));
            let tpQty = quantity * tpQtyPercent;
            tpQty = Math.floor(tpQty / stepSize) * stepSize;
            if (tpQty < minQty) continue;
            tpQty = parseFloat(tpQty.toFixed(bingx.vdigits));
            const limitTpOrder = await bingx.order_send(SYMBOL, 'SELL', 'LIMIT', tpQty, tpPrice, 1);
            console.log(`%${tpPercents[i]} TP Limit Emri:`, limitTpOrder);
        }
		

		var p_risk = await bingx.position_risk();
		console.log("position_risk:",p_risk);		

    } catch (err) {
        console.error('Hata:', err.message);
    }
}

main(); 