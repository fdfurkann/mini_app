import rbinance from './binance_rest.js';

// --- Kullanıcı Bilgileri ve İşlem Parametreleri ---
const API_KEY = 'uRrya0rcs97Jkja72W2E7H0r3PL2aT0qI9ZsStRapYkcO7oSBG3RUOs9zrLxQjE0';
const API_SECRET = 'IsLwMJm5SKouBkGwn7Lvvx7EHZjlosAYGRQ8DB56YXVNmrB6rmG6eozT4uM4T8sU';
const SYMBOL = 'XLMUSDT';
const LEVERAGE = 20; // Kaldıraç
const MARGIN_TYPE = 'CROSSED';
const ORDER_MARGIN_USDT = 6; // İşlem büyüklüğü (USDT)
const STOPLOSS_PERCENT = 5; // %5
const TAKEPROFIT_PERCENT = 5; // %5
const bulk_order = 1;

async function main() {
    const binance = new rbinance(API_KEY, API_SECRET);
    try {
        // 1. Sembol Bilgisi
        const exchangeInfo = await binance.get_exchange();
        const symbolInfo = exchangeInfo.symbols.find(s => s.symbol === SYMBOL);
        if (!symbolInfo) throw new Error('Sembol bulunamadı!');
        console.log('symbolInfo:', symbolInfo);
        binance.digits = symbolInfo.pricePrecision || 2;
        binance.vdigits = symbolInfo.quantityPrecision || 3;

        // StepSize, minQty ve tickSize bul
        let stepSize = 0.0001;
        let minQty = 0.0001;
        let tickSize = 0.0001;
        if (symbolInfo.filters) {
            const lotFilter = symbolInfo.filters.find(f => f.filterType === 'LOT_SIZE' || f.filterType === 'MARKET_LOT_SIZE');
            if (lotFilter) {
                stepSize = parseFloat(lotFilter.stepSize);
                minQty = parseFloat(lotFilter.minQty);
            }
            const priceFilter = symbolInfo.filters.find(f => f.filterType === 'PRICE_FILTER');
            if (priceFilter) {
                tickSize = parseFloat(priceFilter.tickSize);
            }
        }

        // 2. Kaldıraç Ayarla
        const leverageResult = await binance.api_set_leverage(SYMBOL, LEVERAGE);
        console.log('Kaldıraç Ayar Sonucu:', leverageResult);

        // 3. Margin Tipi Ayarla
        const marginTypeResult = await binance.api_set_margin_type(SYMBOL, MARGIN_TYPE);
        console.log('Margin Tipi Ayar Sonucu:', marginTypeResult);

        // 4. Son fiyatı al
        const priceInfo = (await binance.call('/fapi/v1/ticker/price', 0, { symbol: SYMBOL }, 'GET'));
        const lastPrice = parseFloat(priceInfo.price);
        console.log('Son Fiyat:', lastPrice);

        // 5. Miktarı hesapla (USDT cinsinden)
        // Doğru: sadece margin/piyasa fiyatı
        let quantity = ORDER_MARGIN_USDT / lastPrice;
        // StepSize'a yuvarla
        quantity = Math.floor(quantity / stepSize) * stepSize;
        // minQty kontrolü
        if (quantity < minQty) {
            throw new Error(`Hesaplanan miktar minQty'den küçük! (${quantity} < ${minQty})`);
        }
        quantity = parseFloat(quantity.toFixed(binance.vdigits));
        console.log('İşlem Miktarı:', quantity);
		
		if(bulk_order==0) {
			
			// 6. Piyasa Emri Aç (LONG)
			const marketOrder = await binance.order_send(SYMBOL, 'BUY', 'MARKET', quantity, lastPrice);
			console.log('Piyasa Emri Sonucu:', marketOrder);

			// 7. Stop Loss Fiyatı Hesapla
			const stopLossPrice = (lastPrice * (1 - STOPLOSS_PERCENT / 100)).toFixed(binance.digits);
			// 8. Take Profit Fiyatı Hesapla
			const takeProfitPrice = (lastPrice * (1 + TAKEPROFIT_PERCENT / 100)).toFixed(binance.digits);
			// 50. satırda fiyatları yazdır
			console.log('Stop Loss Fiyatı:', stopLossPrice);
			console.log('Take Profit Fiyatı:', takeProfitPrice);

			// 9. Stop Loss Emri Aç (reduceOnly olmadan)
			const stopOrder = await binance.order_send(SYMBOL, 'SELL', 'SL', quantity, stopLossPrice);
			console.log('Stop Loss Emri Sonucu:', stopOrder);

			// 10. Take Profit Emri Aç (reduceOnly olmadan)
			const tpOrder = await binance.order_send(SYMBOL, 'SELL', 'TP', quantity, takeProfitPrice);
			console.log('Take Profit Emri Sonucu:', tpOrder);

		} else {
			
			
			
			
			// 7. Stop Loss Fiyatı Hesapla
			const stopLossPrice = (lastPrice * (1 - STOPLOSS_PERCENT / 100)).toFixed(binance.digits);
			// 8. Take Profit Fiyatı Hesapla
			const takeProfitPrice = (lastPrice * (1 + TAKEPROFIT_PERCENT / 100)).toFixed(binance.digits);
			// 50. satırda fiyatları yazdır
			console.log('Stop Loss Fiyatı:', stopLossPrice);
			console.log('Take Profit Fiyatı:', takeProfitPrice);

			// Emirleri hazırlayıp topluca gönder
			const orders = [];
			orders.push(binance.prepare_order(SYMBOL, 'BUY', 'MARKET', quantity, lastPrice));
			orders.push(binance.prepare_order(SYMBOL, 'SELL', 'SL', quantity, stopLossPrice));
			orders.push(binance.prepare_order(SYMBOL, 'SELL', 'TP', quantity, takeProfitPrice));
			console.log("orders:",orders);
			const bulkResult = await binance.bulk_order_send(orders);
			console.log('Bulk Order Sonucu:', bulkResult);
		}

        // --- YENİ: Kademeli Limit TP Emirleri ---
        const tpPercents = [1, 2, 3, 4];
        const tpQtyPercent = 0.20; // %20
        for (let i = 0; i < tpPercents.length; i++) {
            let tpPrice = lastPrice * (1 + tpPercents[i] / 100);
            // TickSize'a uygun fiyat
            tpPrice = Math.floor(tpPrice / tickSize) * tickSize;
            tpPrice = parseFloat(tpPrice.toFixed(binance.digits));
            let tpQty = quantity * tpQtyPercent;
            // StepSize'a yuvarla
            tpQty = Math.floor(tpQty / stepSize) * stepSize;
            if (tpQty < minQty) continue;
            tpQty = parseFloat(tpQty.toFixed(binance.vdigits));
            const limitTpOrder = await binance.order_send(SYMBOL, 'SELL', 'LIMIT', tpQty, tpPrice, 1);
            console.log(`%${tpPercents[i]} TP Limit Emri:`, limitTpOrder);
        }
		
		var p_risk = await binance.position_risk();
		console.log("position_risk:",p_risk);

    } catch (err) {
        console.error('Hata:', err.message);
    }
}

main(); 