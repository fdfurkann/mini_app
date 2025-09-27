import pool from './db.js';
import { print_log } from './print_log.js';
import { bildirim_ekle, formatQuantityStepSize } from './utils.js';
import { notifyOrderOpen, notifyOrderFailed } from './run_user_notification.js';
import { formatPriceTickSize } from './utils.js';

// Merkezi olay kayıt fonksiyonu
// appendEvent fonksiyonunu ve tüm kullanımlarını kaldır

async function create_order(binance, api_exchange, api, user_id, us, sg, bysym) {
    // Eğer ticket, sticket ve tticket doluysa tekrar işlem açma
    if (us.ticket) {
        return;
    }
    const symbol = sg.symbol;
    const s_id = sg.id;
    const us_id = us.id;
    const chid = api.bot_room;

    print_log({ id: s_id, uid: user_id, usid: us_id, chid, msg: `create_order() başlatıldı. Yön: ${sg.direction}`, pool });

    try {
        // --- Borsadan canlı hassasiyet bilgilerini çek ---
        let stepSize = 0, tickSize = 0, digits = 8, vdigits = 3, minQty = 0.0001;
        let price = bysym['price'];
        if (api_exchange === 'binance' && typeof binance.get_exchange === 'function') {
            const exchangeInfo = await binance.get_exchange();
            if (exchangeInfo && exchangeInfo.symbols) {
                const symbolInfo = exchangeInfo.symbols.find(s => s.symbol === symbol);
                if (symbolInfo) {
                    for (const filter of symbolInfo.filters) {
                        if (filter.filterType === 'LOT_SIZE' || filter.filterType === 'MARKET_LOT_SIZE') {
                            stepSize = parseFloat(filter.stepSize);
                            minQty = parseFloat(filter.minQty);
                        }
                        if (filter.filterType === 'PRICE_FILTER') {
                            tickSize = parseFloat(filter.tickSize);
                        }
                    }
                    digits = (symbolInfo.pricePrecision !== undefined) ? symbolInfo.pricePrecision : (tickSize.toString().split('.')[1] || '').length;
                    vdigits = (symbolInfo.quantityPrecision !== undefined) ? symbolInfo.quantityPrecision : (stepSize.toString().split('.')[1] || '').length;
                }
            }
        } else if (api_exchange === 'bingx' && typeof binance.get_exchange === 'function') {
            // BingX için
            const exchangeInfo = await binance.get_exchange();
            if (exchangeInfo && exchangeInfo.data && Array.isArray(exchangeInfo.data)) {
                const symbolInfo = exchangeInfo.data.find(s => (s.symbol || '').replace('-', '') === symbol.replace('-', ''));
                if (symbolInfo) {
                    stepSize = parseFloat(symbolInfo.lotSize || symbolInfo.minTradeQty || 0.0001);
                    tickSize = parseFloat(symbolInfo.priceStep || symbolInfo.minTickSize || 0.0001);
                    digits = symbolInfo.pricePrecision !== undefined ? symbolInfo.pricePrecision : (tickSize.toString().split('.')[1] || '').length;
                    vdigits = symbolInfo.quantityPrecision !== undefined ? symbolInfo.quantityPrecision : (stepSize.toString().split('.')[1] || '').length;
                    minQty = parseFloat(symbolInfo.minTradeQty || 0.0001);
                }
            }
        } else if (api_exchange === 'bybit' && typeof binance.get_exchange === 'function') {
            // Bybit için
            const exchangeInfo = await binance.get_exchange();
            if (Array.isArray(exchangeInfo)) {
                const symbolInfo = exchangeInfo.find(s => s.symbol === symbol);
                if (symbolInfo && symbolInfo.lotSizeFilter && symbolInfo.priceFilter) {
                    stepSize = parseFloat(symbolInfo.lotSizeFilter.qtyStep || symbolInfo.lotSizeFilter.minOrderQty || 0.0001);
                    tickSize = parseFloat(symbolInfo.priceFilter.tickSize || 0.0001);
                    digits = (symbolInfo.priceFilter.tickSize || '').split('.')[1]?.length || 8;
                    vdigits = (symbolInfo.lotSizeFilter.qtyStep || '').split('.')[1]?.length || 3;
                    minQty = parseFloat(symbolInfo.lotSizeFilter.minOrderQty || 0.0001);
                }
            }
        } else {
            // fallback: bysym'den al
            stepSize = bysym.stepSize;
            tickSize = bysym.tickSize;
            digits = bysym.digits;
            vdigits = bysym.vdigits;
            minQty = 0.0001;
        }
        // --- Fiyat ve miktarları hassasiyete göre formatla ---
        function formatTick(val) {
            if (val === null || typeof val === 'undefined' || isNaN(parseFloat(val))) return val;
            const floored = Math.floor(parseFloat(val) / tickSize) * tickSize;
            return parseFloat(floored.toFixed(digits)).toString();
        }
        function formatStep(val) {
            if (val === null || typeof val === 'undefined' || isNaN(parseFloat(val))) return val;
            const floored = Math.floor(parseFloat(val) / stepSize) * stepSize;
            return parseFloat(floored.toFixed(vdigits)).toString();
        }
        const raw_lot = api.lotsize / price;
        const volume = formatStep(raw_lot);
        if (parseFloat(volume) < minQty) {
            const errMsg = `Hesaplanan hacim minQty'den küçük! (${volume} < ${minQty})`;
            print_log({ id: s_id, uid: user_id, usid: us_id, chid, msg: errMsg, pool });
            await pool.query("UPDATE user_signals SET status=3, event=? WHERE id=?", [errMsg, us.id]);
            const failMsg = notifyOrderFailed(symbol, sg.direction, api.api_name || '', api_exchange, errMsg);
            await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, failMsg]);
            return;
        }
        print_log({ id: s_id, uid: user_id, usid: us_id, chid, msg: `Hesaplanan hacim: ${volume} (API Lot: ${api.lotsize}, Fiyat: ${price}, StepSize: ${stepSize})`, pool });
        let tprice = 0;
        const openSide = sg.direction === 'LONG' ? 'BUY' : 'SELL';
        
        // Sadece ana piyasa emrini hazırla
        if (parseFloat(volume) >= minQty) {
            let qty = formatStep(volume);
            const marketOrder = binance.prepare_order(symbol, openSide, "MARKET", qty, formatTick(price));
            print_log({ id: s_id, uid: user_id, usid: us_id, chid, msg: `Ana piyasa emri hazırlanıyor: ${openSide} ${qty} ${symbol}`, pool });

            try {
                const orderResult = await binance.order_send(symbol, openSide, "MARKET", qty, formatTick(price));
                print_log({ id: s_id, uid: user_id, usid: us_id, chid, msg: `[borsa_cevap_alindi] ${JSON.stringify(orderResult)}`, pool });

                if (orderResult && orderResult.orderId) {
                    const ticket = orderResult.orderId;
                    let open_price = orderResult.avgPrice || orderResult.price;
                    if ((!open_price || open_price == 0) && orderResult.fills && Array.isArray(orderResult.fills) && orderResult.fills.length > 0) {
                        let cumQty = 0, cumQuote = 0;
                        for (const fill of orderResult.fills) {
                            cumQty += parseFloat(fill.qty);
                            cumQuote += parseFloat(fill.qty) * parseFloat(fill.price);
                        }
                        if (cumQty > 0) open_price = cumQuote / cumQty;
                    }
                    if (!open_price || open_price == 0) open_price = bysym.price;

                    const update_sql = "UPDATE user_signals SET open=?, opentime=NOW(), ticket=?, volume=?, status=1, event='Emir oluşturuldu' WHERE id = ?";
                    await pool.query(update_sql, [open_price, ticket, volume, us.id]);

                    const leverage = api.leverage || 1;
                    const opentime = new Date().toLocaleString('tr-TR', { hour12: false });
                    const openMsg = notifyOrderOpen(symbol, sg.direction, api.api_name || '', api_exchange, open_price, volume, leverage, opentime);
                    await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, openMsg]);
                    print_log({ id: s_id, uid: user_id, usid: us_id, chid, msg: `Başarılı: ${openMsg}`, pool });

                } else {
                    let errorMsg = orderResult.msg || JSON.stringify(orderResult);
                    await pool.query("UPDATE user_signals SET status=3, event=? WHERE id=?", [errorMsg, us.id]);
                    print_log({ id: s_id, uid: user_id, usid: us_id, chid, msg: `HATA: ${errorMsg}`, pool });
                    const failMsg = notifyOrderFailed(symbol, sg.direction, api.api_name || '', api_exchange, errorMsg);
                    await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, failMsg]);
                }
            } catch (e) {
                 const errorMsg = `create_order içinde emir gönderilirken hata: ${e.message}`;
                 print_log({ id: s_id, uid: user_id, usid: us_id, chid, msg: `HATA: ${errorMsg}`, pool });
                 await pool.query("UPDATE user_signals SET status=3, event=? WHERE id=?", [errorMsg, us.id]);
                 await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, errorMsg]);
            }
        }
    } catch (e) {
        const errorMsg = `create_order içinde hata: ${e.message}`;
        print_log({ id: s_id, uid: user_id, usid: us_id, chid, msg: `HATA: ${errorMsg}`, pool });
        await pool.query("UPDATE user_signals SET status=3, event=? WHERE id=?", [errorMsg, us.id]);
        await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, errorMsg]);
    }
}

export { create_order }; 