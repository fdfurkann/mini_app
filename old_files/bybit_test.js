import rbybit from './bybit_rest.js';

// --- Kullanıcı Bilgileri ve İşlem Parametreleri ---
const API_KEY = 'Qt1M5KcBLRbILo4jNQ';
const API_SECRET = 'bkJw6nvA94qKrMiwtUMFClSbt1rv9qMtNxmE';
const SYMBOL = 'HIGHUSDT';
const LEVERAGE = 20; // Kaldıraç
const MARGIN_TYPE = 'CROSSED';
const ORDER_MARGIN_USDT = 6; // İşlem büyüklüğü (USDT)
const STOPLOSS_PERCENT = 5; // %5
const TAKEPROFIT_PERCENT = 5; // %5
const bulk_order = 1;

async function main() {
    const bybit = new rbybit(API_KEY, API_SECRET);
    try {
        // 1. Sembol Bilgisi
        const exchangeInfo = await bybit.get_exchange();
        const symbolInfo = exchangeInfo.find(s => s.symbol === SYMBOL);
        if (!symbolInfo) throw new Error('Sembol bulunamadı!');
        console.log('symbolInfo:', symbolInfo);

        // StepSize, minQty ve tickSize bul
        let stepSize = 1;
        let minQty = 1;
        let tickSize = 0.00001;
        if (symbolInfo.lotSizeFilter) {
            stepSize = parseFloat(symbolInfo.lotSizeFilter.qtyStep);
            minQty = parseFloat(symbolInfo.lotSizeFilter.minOrderQty);
        }
        if (symbolInfo.priceFilter) {
            tickSize = parseFloat(symbolInfo.priceFilter.tickSize);
        }
        // digits ve vdigits hesapla
        bybit.digits = symbolInfo.priceScale ? parseInt(symbolInfo.priceScale) : (tickSize.toString().split('.')[1] || '').length;
        bybit.vdigits = (stepSize.toString().split('.')[1] || '').length;

        // 2. Kaldıraç Ayarla
        const leverageResult = await bybit.api_set_leverage(SYMBOL, LEVERAGE);
        console.log('Kaldıraç Ayar Sonucu:', leverageResult);

        // 3. Margin Tipi Ayarla
        const marginTypeResult = await bybit.api_set_margin_type(SYMBOL, MARGIN_TYPE);
        console.log('Margin Tipi Ayar Sonucu:', marginTypeResult);

        // 4. Son fiyatı al
        const priceInfo = (await bybit.call('/v5/market/tickers', 0, { category: 'linear', symbol: SYMBOL }, 'GET'));
        const lastPrice = parseFloat(priceInfo.result.list[0].lastPrice);
        console.log('Son Fiyat:', lastPrice);

        // 5. Miktarı hesapla (USDT cinsinden)
        let quantity = ORDER_MARGIN_USDT / lastPrice;
        quantity = Math.floor(quantity / stepSize) * stepSize;
        if (quantity < minQty) {
            throw new Error(`Hesaplanan miktar minQty'den küçük! (${quantity} < ${minQty})`);
        }
        quantity = parseFloat(quantity.toFixed(bybit.vdigits));
        console.log('İşlem Miktarı:', quantity);

        if(bulk_order==0) {
            // 6. Piyasa Emri Aç (LONG)
            const marketOrder = await bybit.order_send(SYMBOL, 'BUY', 'MARKET', quantity, lastPrice);
            console.log('Piyasa Emri Sonucu:', marketOrder);

            // 7. Stop Loss Fiyatı Hesapla
            const stopLossPrice = (lastPrice * (1 - STOPLOSS_PERCENT / 100)).toFixed(bybit.digits);
            // 8. Take Profit Fiyatı Hesapla
            const takeProfitPrice = (lastPrice * (1 + TAKEPROFIT_PERCENT / 100)).toFixed(bybit.digits);
            console.log('Stop Loss Fiyatı:', stopLossPrice);
            console.log('Take Profit Fiyatı:', takeProfitPrice);

            // 9. Stop Loss Emri Aç (reduceOnly olmadan)
            const stopOrder = await bybit.order_send(SYMBOL, 'SELL', 'SL', quantity, stopLossPrice);
            console.log('Stop Loss Emri Sonucu:', stopOrder);

            // 10. Take Profit Emri Aç (reduceOnly olmadan)
            const tpOrder = await bybit.order_send(SYMBOL, 'SELL', 'TP', quantity, takeProfitPrice);
            console.log('Take Profit Emri Sonucu:', tpOrder);
        } else {
            // 7. Stop Loss Fiyatı Hesapla
            const stopLossPrice = (lastPrice * (1 - STOPLOSS_PERCENT / 100)).toFixed(bybit.digits);
            // 8. Take Profit Fiyatı Hesapla
            const takeProfitPrice = (lastPrice * (1 + TAKEPROFIT_PERCENT / 100)).toFixed(bybit.digits);
            console.log('Stop Loss Fiyatı:', stopLossPrice);
            console.log('Take Profit Fiyatı:', takeProfitPrice);

            // Emirleri hazırlayıp topluca gönder
            const orders = [];
            orders.push(bybit.prepare_order(SYMBOL, 'BUY', 'MARKET', quantity, lastPrice));
            orders.push(bybit.prepare_order(SYMBOL, 'SELL', 'SL', quantity, stopLossPrice));
            orders.push(bybit.prepare_order(SYMBOL, 'SELL', 'TP', quantity, takeProfitPrice));
            console.log('orders:', orders);
            const bulkResult = await bybit.bulk_order_send(orders);
            console.log('Bulk Order Sonucu:', bulkResult);
        }

        // --- YENİ: Kademeli Limit TP Emirleri ---
        const tpPercents = [1, 2, 3, 4];
        const tpQtyPercent = 0.20; // %20
        for (let i = 0; i < tpPercents.length; i++) {
            let tpPrice = lastPrice * (1 + tpPercents[i] / 100);
            tpPrice = Math.floor(tpPrice / tickSize) * tickSize;
            tpPrice = parseFloat(tpPrice.toFixed(bybit.digits));
            let tpQty = quantity * tpQtyPercent;
            tpQty = Math.floor(tpQty / stepSize) * stepSize;
            if (tpQty < minQty) continue;
            tpQty = parseFloat(tpQty.toFixed(bybit.vdigits));
            const limitTpOrder = await bybit.order_send(SYMBOL, 'SELL', 'LIMIT', tpQty, tpPrice, 1);
            console.log(`%${tpPercents[i]} TP Limit Emri:`, limitTpOrder);
        }
		

		var p_risk = await bybit.position_risk();
		console.log("position_risk:",p_risk);		
		
    } catch (err) {
        console.error('Hata:', err.message);
    }
}

main(); 