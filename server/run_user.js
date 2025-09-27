import rbinance from './exchanges/binance_rest.js';
import rbingx from './exchanges/bingx_rest.js';
import rbybit from './exchanges/bybit_rest.js';
import pool from './db.js';
import {
    print_log
} from './print_log.js';
import {
    notifyOrderOpen,
    notifyOrderFailed,
    notifyTp,
    notifySl,
    notifyTrailStop,
    notifyBreakEven
} from './run_user_notification.js';

async function logEvent(id, uid,us_id, chid, message, pool) {
    print_log({ id: id, uid: uid, usid: us_id, chid: chid, msg: message, pool });
    
    const currentEvents = await pool.query("SELECT event FROM user_signals WHERE id=?", [us_id]);
    const existingEvents = currentEvents[0]?.[0]?.event || '';
    const newEvents = existingEvents ? `${existingEvents}\n${message}` : message;
    
    await pool.query("UPDATE user_signals SET event=? WHERE id=?", [newEvents, us_id]);
}

async function run_user(id) {
    let user_id = null;
    let us_id = null;
    let ch_id = null;
    let s_id = null;


    let [init_us] = await pool.query("SELECT * FROM `user_signals` WHERE id=?", [id]);
    const us = init_us[0];
    let [init_sg] = await pool.query("SELECT * FROM `signals` WHERE id=?", [us?.signal_id]);
    const sg = init_sg[0];
    let [init_api] = await pool.query("SELECT * FROM `api_keys` WHERE id=?", [us?.api_id]);
    const api = init_api[0];
    user_id = us?.user_id || api?.user_id;
    us_id = us?.id;
    ch_id = sg?.channel_id;
    s_id = us?.signal_id;

    /*
    const my_id = 5118957445;
    
    if (user_id != my_id) {
        return;
    }
    */

    print_log({
        id: s_id,
        uid: user_id,
        usid: us_id,
        chid: ch_id,
        msg: `run_user started. id: ${id}`,
        pool
    });

    const API_KEY = api?.api_key;
    const API_SECRET = api?.api_secret;
    const SYMBOL = us?.symbol;
    const LEVERAGE = api?.leverage || 20;
    const MARGIN_TYPE = api?.margin_type || 'CROSSED';
    const ORDER_MARGIN_USDT = parseFloat(api?.lotsize) || 6;
    const STOPLOSS_PERCENT = parseFloat(api?.stop_loss) || 5;
    const TAKEPROFIT_PERCENT = parseFloat(api?.take_profit) || 5;
    const bulk_order = 1;

    let borsa;
    // const exchange = api?.exchange?.toLowerCase();
    let exchange = 'binance';
    let exchangeName = 'Binance';
    if (api?.api_type === 2) {
        exchange = 'bybit';
        exchangeName = 'Bybit';
    } else if (api?.api_type === 3) {
        exchange = 'bingx';
        exchangeName = 'BingX';
    }

    if (exchange === 'bingx') {
        borsa = new rbingx(API_KEY, API_SECRET);
    } else if (exchange === 'bybit') {
        borsa = new rbybit(API_KEY, API_SECRET);
    } else {
        borsa = new rbinance(API_KEY, API_SECRET);
    }

    try {

        const positionRisk = await borsa.position_risk();

        if (us?.status > 0) {
            let hasSymbolPosition = false;

            if (positionRisk && typeof positionRisk === 'object') {
                for (const [symbol, amount] of Object.entries(positionRisk)) {
                    if (symbol === SYMBOL && Math.abs(parseFloat(amount)) > 0) {
                        hasSymbolPosition = true;
                        break;
                    }
                }
            }

            if (!hasSymbolPosition) {
                print_log({
                    id: s_id,
                    uid: user_id,
                    usid: us_id,
                    chid: ch_id,
                    msg: `run_user finished 1. id: ${id}`,
                    pool
                });
                return;
            }
        } else {


            let [ratesRows] = await pool.query("SELECT * FROM rates WHERE symbol = ? ORDER BY id DESC LIMIT 1", [SYMBOL]);
            if (!ratesRows.length) {
                console.log('Rates tablosunda fiyat bulunamadı!');
                await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, `❌ **CANNOT OPEN TRADE**\n\n**Symbol:** ${SYMBOL}\n**Exchange:** ${exchange}\n\nNo price found in rates table!`]);
                print_log({
                    id: s_id,
                    uid: user_id,
                    usid: us_id,
                    chid: ch_id,
                    msg: `run_user finished (No price in rates). id: ${id}`,
                    pool
                });
                return;
            }
            const lastPrice = parseFloat(ratesRows[0].price);


            if (positionRisk && typeof positionRisk === 'object') {
                for (const [symbol, amount] of Object.entries(positionRisk)) {
                    if (Math.abs(parseFloat(amount)) > 0) {
                        if (symbol === SYMBOL) {
                            const duplicateMsg = `❌ **CANNOT OPEN TRADE**\n\n` +
                                `**Symbol:** ${SYMBOL}\n` +
                                `**API Name:** ${api.api_name}\n` +
                                `**Exchange:** ${exchangeName}\n\n` +
                                `You already have an open position in ${SYMBOL}.`;
                            await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, duplicateMsg]);
                            print_log({
                                id: s_id,
                                uid: user_id,
                                usid: us_id,
                                chid: ch_id,
                                msg: `run_user finished 2. id: ${id}`,
                                pool
                            });
                            return;
                   
                        }
                    }
                }
            }

            const exchangeInfo = await borsa.get_exchange();
            await borsa.set_symbol(SYMBOL, exchangeInfo);
            // Kaldıraç ve margin type ayarla (BingX/Bybit)
            if (exchange === 'bingx' || exchange === 'bybit') {
                const marginTypeResult = await borsa.api_set_margin_type(SYMBOL, MARGIN_TYPE);
                print_log({
                    id: s_id,
                    uid: user_id,
                    usid: us_id,
                    chid: ch_id,
                    msg: `set_margin yanıtı: ${JSON.stringify(marginTypeResult)}`,
                    pool
                });
            }
            const leverageResult = await borsa.api_set_leverage(SYMBOL, LEVERAGE);
            print_log({
                id: s_id,
                uid: user_id,
                usid: us_id,
                chid: ch_id,
                msg: `set_leverage yanıtı: ${JSON.stringify(leverageResult)}`,
                pool
            });
            // BingX/Bybit/Binance sembol parametrelerini yazdır
            print_log({ id: s_id, uid: user_id, usid: us_id, chid: ch_id, msg: `SYMBOL: ${SYMBOL}`, pool });
            print_log({ id: s_id, uid: user_id, usid: us_id, chid: ch_id, msg: `stepSize: ${borsa.stepSize}`, pool });
            print_log({ id: s_id, uid: user_id, usid: us_id, chid: ch_id, msg: `vdigits: ${borsa.vdigits}`, pool });
            print_log({ id: s_id, uid: user_id, usid: us_id, chid: ch_id, msg: `minQty: ${borsa.minQty}`, pool });
            print_log({ id: s_id, uid: user_id, usid: us_id, chid: ch_id, msg: `tickSize: ${borsa.tickSize}`, pool });
            print_log({ id: s_id, uid: user_id, usid: us_id, chid: ch_id, msg: `digits: ${borsa.digits}`, pool });
            print_log({ id: s_id, uid: user_id, usid: us_id, chid: ch_id, msg: `symbolInfo: ${JSON.stringify(borsa.symbolInfo)}`, pool });
            print_log({ id: s_id, uid: user_id, usid: us_id, chid: ch_id, msg: `minQty: ${borsa.minQty}`, pool });
            print_log({ id: s_id, uid: user_id, usid: us_id, chid: ch_id, msg: `lastPrice: ${lastPrice}`, pool });
            print_log({ id: s_id, uid: user_id, usid: us_id, chid: ch_id, msg: `ORDER_MARGIN_USDT: ${ORDER_MARGIN_USDT}`, pool });


            // BingX için miktar hesaplama ve kontrol
            let quantity = ORDER_MARGIN_USDT / lastPrice;
            if (borsa.stepSize) {
                quantity = Math.floor(quantity / borsa.stepSize) * borsa.stepSize;
            }
            if (typeof borsa.vdigits !== 'undefined') {
                quantity = parseFloat(quantity.toFixed(borsa.vdigits));
            }

            print_log({ id: s_id, uid: user_id, usid: us_id, chid: ch_id, msg: `quantity: ${quantity}`, pool });

            if (quantity < borsa.minQty || isNaN(quantity) || quantity <= 0) {
                console.log('HATALI MİKTAR! Hesaplanan quantity:', quantity, 'minQty:', borsa.minQty);
                await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, `❌ **CANNOT OPEN TRADE**\n\n**Symbol:** ${SYMBOL}\n**Exchange:** ${exchange}\n\nInvalid quantity: ${quantity}, minQty: ${borsa.minQty}`]);
                print_log({
                    id: s_id,
                    uid: user_id,
                    usid: us_id,
                    chid: ch_id,
                    msg: `run_user finished (BingX quantity error). id: ${id}`,
                    pool
                });
                return;
            }
            quantity = parseFloat(quantity.toFixed(borsa.vdigits));

            let stopLossPrice = null;
            if (api?.stop_loss_settings === 'none') {
                stopLossPrice = null;
            } else if (api?.stop_loss_settings === 'signal') {
                stopLossPrice = sg?.stop_loss;
            }
            if (stopLossPrice) {
                stopLossPrice = Math.floor(stopLossPrice / borsa.tickSize) * borsa.tickSize;
                stopLossPrice = parseFloat(stopLossPrice.toFixed(borsa.digits));
            }

            let takeProfitPrice = null;
            if (api?.take_profit === 'none') {
                takeProfitPrice = null;
            } else if (api?.take_profit === 'signal') {
                for (let i = 10; i >= 1; i--) {
                    const tpKey = `tp${i}`;
                    if (sg && sg[tpKey] && parseFloat(sg[tpKey]) > 0) {
                        takeProfitPrice = sg[tpKey];
                        break;
                    }
                }
            }
            if (takeProfitPrice) {
                takeProfitPrice = Math.floor(takeProfitPrice / borsa.tickSize) * borsa.tickSize;
                takeProfitPrice = parseFloat(takeProfitPrice.toFixed(borsa.digits));
            }



            const openSide = sg?.direction === 'LONG' ? 'BUY' : 'SELL';
            const closeSide = sg?.direction === 'LONG' ? 'SELL' : 'BUY';

            let order_ticket = null;
            let sl_ticket = null;
            let tp_ticket = null;
            let orderFailureInfo = null;

            if (bulk_order == 0) {
                print_log({
                    id: s_id,
                    uid: user_id,
                    usid: us_id,
                    chid: ch_id,
                    msg: `BingX emir açma parametreleri: SYMBOL: ${SYMBOL}, quantity: ${quantity}, minQty: ${borsa.minQty}, minUSDT: ${borsa.minUSDT}, lastPrice: ${lastPrice}, stepSize: ${borsa.stepSize}, vdigits: ${borsa.vdigits}`,
                    pool
                });
                const marketOrder = await borsa.order_send(SYMBOL, openSide, 'MARKET', quantity, lastPrice);
                print_log({
                    id: s_id,
                    uid: user_id,
                    usid: us_id,
                    chid: ch_id,
                    msg: `BingX market order yanıtı: ${JSON.stringify(marketOrder)}`,
                    pool
                });
                order_ticket = marketOrder?.orderId || marketOrder?.order_id || null;
                if (order_ticket) {
                    print_log({
                        id: s_id,
                        uid: user_id,
                        usid: us_id,
                        chid: ch_id,
                        msg: `#${order_ticket} ${SYMBOL} ${openSide} MARKET ${quantity} ${lastPrice} SUCCESS`,
                        pool
                    });
                    await logEvent(s_id, user_id, us_id, ch_id, `işlem açıldı ${lastPrice}`, pool);
                } else {
                    const errorMsg = marketOrder?.msg || marketOrder?.code || JSON.stringify(marketOrder) || 'Unknown error';
                    print_log({
                        id: s_id,
                        uid: user_id,
                        usid: us_id,
                        chid: ch_id,
                        msg: `#FAILED ${SYMBOL} ${openSide} MARKET ${quantity} ${lastPrice} ERROR: ${errorMsg}`,
                        pool
                    });
                }



            } else {


                const orders = [];
                orders.push(borsa.prepare_order(SYMBOL, openSide, 'MARKET', quantity, lastPrice));
                
                const bulkResult = await borsa.bulk_order_send(orders);
                console.log('bulkResult: ', bulkResult);
                if (Array.isArray(bulkResult)) {
                    for (const order of bulkResult) {
                        if (order.code && order.msg) {
                            orderFailureInfo = order;
                            break;
                        }

                        if (order?.type === 'MARKET' || order?.orderId || order?.status === 'FILLED') {
                            order_ticket = order?.orderId || order?.order_id || null;

                            console.log('order_ticket: ', order_ticket);

                            if (order_ticket) {
                                print_log({
                                    id: s_id,
                                    uid: user_id,
                                    usid: us_id,
                                    chid: ch_id,
                                    msg: `#${order_ticket} ${SYMBOL} ${openSide} MARKET ${quantity} ${lastPrice} SUCCESS`,
                                    pool
                                });
                                await logEvent(s_id, user_id, us_id, ch_id, `işlem açıldı ${lastPrice}`, pool);
                            } else {
                                const errorMsg = order?.msg || order?.code || JSON.stringify(order) || 'Unknown error';
                                print_log({
                                    id: s_id,
                                    uid: user_id,
                                    usid: us_id,
                                    chid: ch_id,
                                    msg: `#FAILED ${SYMBOL} ${openSide} MARKET ${quantity} ${lastPrice} ERROR: ${errorMsg}`,
                                    pool
                                });
                            }
                        }
                    }
                } else if (bulkResult && bulkResult.code && bulkResult.msg) {
                    orderFailureInfo = bulkResult;
                }
            }

            console.log('order_ticket: ', order_ticket);
            print_log({
                id: s_id,
                uid: user_id,
                usid: us_id,
                chid: ch_id,
                msg: `order_ticket: ${order_ticket}`,
                pool
            });


            if (order_ticket) {
                const leverage = LEVERAGE;
                const opentime = new Date().toLocaleString('tr-TR', {
                    hour12: false
                });
                const open_price = lastPrice;
                const update_sql = "UPDATE user_signals SET open=?, opentime=NOW(), ticket=?, volume=?, status=1, event='Emir oluşturuldu' WHERE id = ?";
                await pool.query(update_sql, [open_price, order_ticket, quantity, us_id]);
                const openMsg = notifyOrderOpen(
                    SYMBOL,
                    sg.direction,
                    api.api_name || '',
                    exchangeName,
                    open_price,
                    quantity,
                    leverage,
                    opentime
                );
                await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, openMsg]);
                print_log({
                    id: s_id,
                    uid: user_id,
                    usid: us_id,
                    chid: ch_id,
                    msg: `Success: ${openMsg}`,
                    pool
                });
                // --- POZİSYONUN GERÇEKTEN AÇILDIĞINI KONTROL ET ---
                let positionOpened = false;
                let userPosition = null;
                for (let i = 0; i < 20; i++) { // max 10 sn bekle (her 500ms)
                    const positions = await borsa.positions(SYMBOL);
                    userPosition = Array.isArray(positions)
                        ? positions.find(pos => (pos.symbol === SYMBOL || pos.symbol === SYMBOL.replace('USDT', '-USDT')) && Math.abs(parseFloat(pos.positionAmt)) > 0)
                        : null;
                    if (userPosition) {
                        positionOpened = true;
                        break;
                    }
                    await new Promise(res => setTimeout(res, 500));
                }
                if (!positionOpened) {
                    print_log({
                        id: s_id,
                        uid: user_id,
                        usid: us_id,
                        chid: ch_id,
                        msg: `POSITION NOT OPENED! SL/TP orders will not be sent.`,
                        pool
                    });
                } else {
                    // --- POZİSYON AÇILDI, GERÇEK MİKTAR VE FİYATLA SL/TP HESAPLA ---
                    const realQty = Math.abs(parseFloat(userPosition.positionAmt));
                    const entryPrice = parseFloat(userPosition.entryPrice);
                    let realStopLossPrice = null;
                    let realTakeProfitPrice = null;
                    if (api?.stop_loss_settings === 'none') {
                        realStopLossPrice = null;
                    } else if (api?.stop_loss_settings === 'signal') {
                        realStopLossPrice = sg?.stop_loss;
                    }
                    if (realStopLossPrice) {
                        realStopLossPrice = Math.floor(realStopLossPrice / borsa.tickSize) * borsa.tickSize;
                        realStopLossPrice = parseFloat(realStopLossPrice.toFixed(borsa.digits));
                    }
                    if (api?.take_profit === 'none') {
                        realTakeProfitPrice = null;
                    } else if (api?.take_profit === 'signal') {
                        for (let i = 10; i >= 1; i--) {
                            const tpKey = `tp${i}`;
                            if (sg && sg[tpKey] && parseFloat(sg[tpKey]) > 0) {
                                realTakeProfitPrice = sg[tpKey];
                                break;
                            }
                        }
                    }
                    if (realTakeProfitPrice) {
                        realTakeProfitPrice = Math.floor(realTakeProfitPrice / borsa.tickSize) * borsa.tickSize;
                        realTakeProfitPrice = parseFloat(realTakeProfitPrice.toFixed(borsa.digits));
                    }
                    // --- POZİSYON AÇILDI, ŞİMDİ SL/TP EMİRLERİNİ GÖNDER ---
                    if (realStopLossPrice) {
                        print_log({ id: s_id, uid: user_id, usid: us_id, chid: ch_id, msg: `Bybit SL order_send çağrılıyor: ${SYMBOL} ${closeSide} ${realQty} ${realStopLossPrice}`, pool });
                        const stopOrder = await borsa.order_send(SYMBOL, closeSide, 'SL', realQty, realStopLossPrice);
                        print_log({ id: s_id, uid: user_id, usid: us_id, chid: ch_id, msg: `Bybit SL order yanıtı: ${JSON.stringify(stopOrder)}`, pool });
                        const sl_ticket = stopOrder?.orderId || stopOrder?.order_id || null;
                        if (sl_ticket || stopOrder?.msg === 'OK' || stopOrder?.retMsg === 'OK') {
                            print_log({
                                id: s_id,
                                uid: user_id,
                                usid: us_id,
                                chid: ch_id,
                                msg: `#${sl_ticket} ${SYMBOL} ${closeSide} SL ${realQty} ${realStopLossPrice} SUCCESS`,
                                pool
                            });
                            // sticket güncelle
                            await pool.query("UPDATE user_signals SET sticket=? WHERE id=?", [sl_ticket, us_id]);
                        } else {
                            const errorMsg = stopOrder?.msg || stopOrder?.code || JSON.stringify(stopOrder) || 'Unknown error';
                            print_log({
                                id: s_id,
                                uid: user_id,
                                usid: us_id,
                                chid: ch_id,
                                msg: `#FAILED ${SYMBOL} ${closeSide} SL ${realQty} ${realStopLossPrice} ERROR: ${errorMsg}`,
                                pool
                            });
                        }
                    }
                    if (realTakeProfitPrice) {
                        print_log({ id: s_id, uid: user_id, usid: us_id, chid: ch_id, msg: `Bybit TP order_send çağrılıyor: ${SYMBOL} ${closeSide} ${realQty} ${realTakeProfitPrice}`, pool });
                        const tpOrder = await borsa.order_send(SYMBOL, closeSide, 'TP', realQty, realTakeProfitPrice);
                        print_log({ id: s_id, uid: user_id, usid: us_id, chid: ch_id, msg: `Bybit TP order yanıtı: ${JSON.stringify(tpOrder)}`, pool });
                        const tp_ticket = tpOrder?.orderId || tpOrder?.order_id || null;
                        if (tp_ticket || tpOrder?.msg === 'OK' || tpOrder?.retMsg === 'OK') {
                            print_log({
                                id: s_id,
                                uid: user_id,
                                usid: us_id,
                                chid: ch_id,
                                msg: `#${tp_ticket} ${SYMBOL} ${closeSide} TP ${realQty} ${realTakeProfitPrice} SUCCESS`,
                                pool
                            });
                            // tticket güncelle
                            await pool.query("UPDATE user_signals SET tticket=? WHERE id=?", [tp_ticket, us_id]);
                        } else {
                            const errorMsg = tpOrder?.msg || tpOrder?.code || JSON.stringify(tpOrder) || 'Unknown error';
                            print_log({
                                id: s_id,
                                uid: user_id,
                                usid: us_id,
                                chid: ch_id,
                                msg: `#FAILED ${SYMBOL} ${closeSide} TP ${realQty} ${realTakeProfitPrice} ERROR: ${errorMsg}`,
                                pool
                            });
                        }
                    }




                    if (api?.take_profit === 'signal') {
                        for (let i = 1; i <= 10; i++) {
                            const tpVal = sg[`tp${i}`];
                            const apiVal = api[`tp${i}`];
                            if (apiVal > 0 && tpVal > 0 && !isNaN(tpVal)) {
                                let tpPrice = Math.floor(tpVal / borsa.tickSize) * borsa.tickSize;
                                tpPrice = parseFloat(tpPrice.toFixed(borsa.digits));
                                const tpQty = quantity * (apiVal / 100);
                                const limitTpOrder = await borsa.order_send(SYMBOL, closeSide, 'LIMIT', tpQty, tpPrice, 1);
                            }
                        }
        
                    }


                }
            } else {
                let errorMsg = 'Order could not be opened';
                let errorDetail = '';
                if (typeof marketOrder === 'object' && marketOrder && (marketOrder.msg || marketOrder.code)) {
                    errorDetail = JSON.stringify(marketOrder);
                    errorMsg = marketOrder.msg || marketOrder.code;
                } else if (orderFailureInfo) {
                    errorDetail = JSON.stringify(orderFailureInfo);
                    errorMsg = orderFailureInfo.msg || orderFailureInfo.code || errorDetail;
                }
                const failMsg = notifyOrderFailed(
                    SYMBOL,
                    sg.direction,
                    api.api_name || '',
                    exchangeName,
                    errorMsg + (errorDetail ? `\nDetail: ${errorDetail}` : '')
                );
                await pool.query("UPDATE user_signals SET status=3, event=? WHERE id=?", [typeof errorMsg === 'object' ? errorMsg.msg : errorMsg, us_id]);
                print_log({
                    id: s_id,
                    uid: user_id,
                    usid: us_id,
                    chid: ch_id,
                    msg: `ERROR: ${errorMsg} ${errorDetail}`,
                    pool
                });
                await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, failMsg]);
            }



        }

        let positionCheckCounter = 0;
        // signalLoop başlamadan önce: user_signals.id == 1 ise stoploss'u 3 kere 1 saniye arayla 1. tp'ye taşı


        async function signalLoop() {
            try {
                let [init_us] = await pool.query("SELECT * FROM `user_signals` WHERE id=?", [id]);
                const us = init_us[0];
                let [init_sg] = await pool.query("SELECT * FROM `signals` WHERE id=?", [us?.signal_id]);
                const sg = init_sg[0];
                let [init_api] = await pool.query("SELECT * FROM `api_keys` WHERE id=?", [us?.api_id]);
                const api = init_api[0];

                if (!us || !sg || !api) {
                    print_log({
                        id: s_id,
                        uid: user_id,
                        usid: us_id,
                        chid: ch_id,
                        msg: `signalLoop: User signal, signal, or API key not found. Exiting.`,
                        pool
                    });
                    return;
                }

                let [ratesData] = await pool.query("SELECT * FROM `rates` WHERE symbol=?", [SYMBOL]);
                const currentPrice = ratesData[0]?.price || 0;

                // currentTpLevel'ı burada tanımla, böylece her zaman erişilebilir olur
                const currentTpLevel = parseInt(sg.tp_hit);

                // quantity her döngüde güncellensin (140. satırdaki gibi)
                let quantity1 = 0;
                if (api && typeof api.lotsize !== 'undefined' && currentPrice > 0) {
                    quantity1 = parseFloat(api.lotsize) / currentPrice;
                    if (borsa.stepSize) {
                        quantity1 = Math.floor(quantity1 / borsa.stepSize) * borsa.stepSize;
                    }
                    if (typeof borsa.vdigits !== 'undefined') {
                        quantity1 = parseFloat(quantity1.toFixed(borsa.vdigits));
                    }
                }
                
                positionCheckCounter++;
                
                if (us && us.ticket && positionCheckCounter >= 5) {
                    positionCheckCounter = 0;

                    let positions = await borsa.positions(SYMBOL);
                    // Eğer array değilse, array'e çevir
                    if (!Array.isArray(positions) && positions && typeof positions === 'object') {
                        positions = Object.values(positions);
                    }
                    const userPosition = positions?.find(pos => (pos.symbol === SYMBOL || pos.symbol === SYMBOL.replace('USDT', '-USDT')));
                    const positionQuantity = userPosition ? Math.abs(parseFloat(userPosition.positionAmt)) : 0;

                    if (!userPosition || positionQuantity === 0) {
                        print_log({ id: s_id, uid: user_id, usid: us_id, chid: ch_id, msg: `Position not found or quantity is 0. Positions: ${JSON.stringify(positions)}`, pool });
                        await pool.query(
                            "UPDATE user_signals SET status=?, closetime=?, close=? WHERE id=?",
                            [2, new Date().toISOString(), currentPrice, us_id]
                        );

                        let profit = 0;
                        let profitPercent = 0;
                        if (us.open && us.volume) {
                            if (us.trend === 'LONG') {
                                profit = (currentPrice - parseFloat(us.open)) * parseFloat(us.volume);
                                profitPercent = ((currentPrice - parseFloat(us.open)) / parseFloat(us.open)) * 100;
                            } else {
                                profit = (parseFloat(us.open) - currentPrice) * parseFloat(us.volume);
                                profitPercent = ((parseFloat(us.open) - currentPrice) / parseFloat(us.open)) * 100;
                            }
                        }
                        const profitSign = profit >= 0 ? '+' : '';
                        const profitText = profitPercent !== 0 ? `\n**Profit/Loss:** ${profitSign}${profit.toFixed(2)} USDT (${profitSign}${profitPercent.toFixed(2)}%)` : '';

                        const positionClosedMsg = `📈 **POSITION CLOSED**\n\n` +
                            `**Symbol:** ${SYMBOL}\n` +
                            `**API Name:** ${api.api_name}\n` +
                            `**Exchange:** ${exchangeName}\n` +
                            `**Close Price:** ${currentPrice}\n` +
                            `**Close Time:** ${new Date().toLocaleString('en-GB', { hour12: false })}${profitText}\n\n` +
                            `Position was closed automatically (not found in market).`;
                        await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, positionClosedMsg]);
                        print_log({
                            id: s_id,
                            uid: user_id,
                            usid: us_id,
                            chid: ch_id,
                            msg: `run_user finished. id: ${id}`,
                            pool
                        });

                        return;
                    }

                    let openOrders = await borsa.open_orders(SYMBOL);
                    if (!Array.isArray(openOrders) && openOrders && typeof openOrders === 'object') {
                        openOrders = Object.values(openOrders);
                    }
                    const stopLossOrder = openOrders?.find(order => order.type === 'STOP_MARKET' || order.type === 'SL');
                    const takeProfitOrder = openOrders?.find(order => order.type === 'TAKE_PROFIT_MARKET' || order.type === 'TP');

                    let shouldClosePosition = false;
                    let closeReason = '';

                    if (us.trend === 'LONG') {
                        if (us.sl && parseFloat(currentPrice) <= parseFloat(us.sl)) {
                            shouldClosePosition = true;
                            closeReason = 'Stop Loss kırıldı';
                        } else if (us.tp && parseFloat(currentPrice) >= parseFloat(us.tp)) {
                            shouldClosePosition = true;
                            closeReason = 'Take Profit ulaşıldı';
                        }
                    } else if (us.trend === 'SHORT') {
                        if (us.sl && parseFloat(currentPrice) >= parseFloat(us.sl)) {
                            shouldClosePosition = true;
                            closeReason = 'Stop Loss kırıldı';
                        } else if (us.tp && parseFloat(currentPrice) <= parseFloat(us.tp)) {
                            shouldClosePosition = true;
                            closeReason = 'Take Profit ulaşıldı';
                        }
                    }

                    if (!stopLossOrder && us.sl && shouldClosePosition && closeReason.includes('Stop Loss')) {

                        const closeResult = await borsa.close_position(SYMBOL);
                        await logEvent(s_id, user_id, us_id, ch_id, `pozisyon kapatıldı ${currentPrice}`, pool);

                        await pool.query(
                            "UPDATE user_signals SET status=?, closetime=?, close=? WHERE id=?",
                            [2, new Date().toISOString(), currentPrice, us_id]
                        );
                        let profit = 0;
                        let profitPercent = 0;
                        if (us.open && us.volume) {
                            if (us.trend === 'LONG') {
                                profit = (currentPrice - parseFloat(us.open)) * parseFloat(us.volume);
                                profitPercent = ((currentPrice - parseFloat(us.open)) / parseFloat(us.open)) * 100;
                            } else {
                                profit = (parseFloat(us.open) - currentPrice) * parseFloat(us.volume);
                                profitPercent = ((parseFloat(us.open) - currentPrice) / parseFloat(us.open)) * 100;
                            }
                        }
                        const profitSign = profit >= 0 ? '+' : '';
                        const profitText = profitPercent !== 0 ? `\n**Profit/Loss:** ${profitSign}${profit.toFixed(2)} USDT (${profitSign}${profitPercent.toFixed(2)}%)` : '';

                        const marketCloseMsg = `🔴 **POSITION SL BY MARKET**\n\n` +
                            `**Symbol:** ${SYMBOL}\n` +
                            `**API Name:** ${api.api_name}\n` +
                            `**Exchange:** ${exchangeName}\n` +
                            `**Reason:** ${closeReason}\n` +
                            `**Close Price:** ${currentPrice}\n` +
                            `**Close Time:** ${new Date().toLocaleString('en-GB', { hour12: false })}${profitText}\n\n` +
                            `Position was closed at market price due to missing SL order.`;
                        await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, marketCloseMsg]);
                        print_log({
                            id: s_id,
                            uid: user_id,
                            usid: us_id,
                            chid: ch_id,
                            msg: `run_user finished. id: ${id}`,
                            pool
                        });

                        return;
                    }

                    if (!takeProfitOrder && us.tp && shouldClosePosition && closeReason.includes('Take Profit')) {

                        const closeResult = await borsa.close_position(SYMBOL);
                        await logEvent(s_id, user_id, us_id, ch_id, `pozisyon kapatıldı ${currentPrice}`, pool);

                        await pool.query(
                            "UPDATE user_signals SET status=?, closetime=?, close=? WHERE id=?",
                            [2, new Date().toISOString(), currentPrice, us_id]
                        );
                        let profit = 0;
                        let profitPercent = 0;
                        if (us.open && us.volume) {
                            if (us.trend === 'LONG') {
                                profit = (currentPrice - parseFloat(us.open)) * parseFloat(us.volume);
                                profitPercent = ((currentPrice - parseFloat(us.open)) / parseFloat(us.open)) * 100;
                            } else {
                                profit = (parseFloat(us.open) - currentPrice) * parseFloat(us.volume);
                                profitPercent = ((parseFloat(us.open) - currentPrice) / parseFloat(us.open)) * 100;
                            }
                        }
                        const profitSign = profit >= 0 ? '+' : '';
                        const profitText = profitPercent !== 0 ? `\n**Profit/Loss:** ${profitSign}${profit.toFixed(2)} USDT (${profitSign}${profitPercent.toFixed(2)}%)` : '';

                        const marketCloseMsg = `🟢 **POSITION TP BY MARKET**\n\n` +
                            `**Symbol:** ${SYMBOL}\n` +
                            `**API Name:** ${api.api_name}\n` +
                            `**Exchange:** ${exchangeName}\n` +
                            `**Reason:** ${closeReason}\n` +
                            `**Close Price:** ${currentPrice}\n` +
                            `**Close Time:** ${new Date().toLocaleString('en-GB', { hour12: false })}${profitText}\n\n` +
                            `Position was closed at market price due to missing TP order.`;
                        await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, marketCloseMsg]);
                        print_log({
                            id: s_id,
                            uid: user_id,
                            usid: us_id,
                            chid: ch_id,
                            msg: `run_user finished. id: ${id}`,
                            pool
                        });

                        return;
                    }

                    // status = 5 ise sinyali market fiyatından kapat ve status'ü 1 yap
                    if (us.status === 5) {
                        const closeResult = await borsa.close_position(SYMBOL);
                        await logEvent(s_id, user_id, us_id, ch_id, `status=5: pozisyon marketten kapatıldı ${currentPrice}`, pool);
                        await pool.query(
                            "UPDATE user_signals SET status=?, closetime=?, close=? WHERE id=?",
                            [1, new Date().toISOString(), currentPrice, us_id]
                        );
                        const marketCloseMsg = `🔴 **POSITION CLOSED BY STATUS=5**\n\n` +
                            `**Symbol:** ${SYMBOL}\n` +
                            `**API Name:** ${api.api_name}\n` +
                            `**Exchange:** ${exchangeName}\n` +
                            `**Reason:** Status 5 (manuel/otomatik kapama)\n` +
                            `**Close Price:** ${currentPrice}\n` +
                            `**Close Time:** ${new Date().toLocaleString('en-GB', { hour12: false })}\n\n` +
                            `Position was closed at market price due to status=5.`;
                        await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, marketCloseMsg]);
                        print_log({
                            id: s_id,
                            uid: user_id,
                            usid: us_id,
                            chid: ch_id,
                            msg: `status=5: run_user finished. id: ${id}`,
                            pool
                        });
                        return;
                    }

                    if (userPosition && us.sl && !stopLossOrder && (us.sl_wait || 0) < 3) {

                        try {
                            const slOrderSide = us.trend === 'LONG' ? 'SELL' : 'BUY';
                            const newStopOrder = await borsa.order_send(SYMBOL, slOrderSide, 'SL', positionQuantity, us.sl);

                            let orderIdForDb = null;
                            if (newStopOrder && (newStopOrder.orderId || newStopOrder.order_id)) {
                                orderIdForDb = newStopOrder.orderId || newStopOrder.order_id;
                                print_log({
                                    id: s_id,
                                    uid: user_id,
                                    usid: us_id,
                                    chid: ch_id,
                                    msg: `#${orderIdForDb} ${SYMBOL} ${slOrderSide} SL ${positionQuantity} ${us.sl} SUCCESS`,
                                    pool
                                });
                            } else {
                                const errorMsg = newStopOrder?.msg || newStopOrder?.code || JSON.stringify(newStopOrder) || 'Unknown error';
                                print_log({
                                    id: s_id,
                                    uid: user_id,
                                    usid: us_id,
                                    chid: ch_id,
                                    msg: `#FAILED ${SYMBOL} ${slOrderSide} SL ${positionQuantity} ${us.sl} ERROR: ${errorMsg}`,
                                    pool
                                });

                                const newSlWait = (us.sl_wait || 0) + 1;
                                await pool.query(
                                    "UPDATE user_signals SET sl_wait=? WHERE id=?",
                                    [newSlWait, us_id]
                                );

                                if (newSlWait >= 3) {
                                    await logEvent(s_id, user_id, us_id, ch_id, `sl 3 denemede koyulamadı ${currentPrice}`, pool);
                                    let exchangeResponse = 'Unknown error';
                                    if (newStopOrder && typeof newStopOrder === 'object') {
                                        exchangeResponse = JSON.stringify(newStopOrder);
                                    } else if (newStopOrder) {
                                        exchangeResponse = newStopOrder.toString();
                                    }

                                    const slFailMsg = `❌ **STOP LOSS ORDER FAILED**\n\n` +
                                        `**Symbol:** ${SYMBOL}\n` +
                                        `**API Name:** ${api.api_name}\n` +
                                        `**Exchange:** ${exchangeName}\n` +
                                        `**Exchange Response:** ${exchangeResponse}\n\n` +
                                        `Stop Loss order could not be placed after 3 attempts.\n\n` +
                                        `🤖 But don't worry, Orca is tracking the signal for you.`;
                                    await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, slFailMsg]);
                                }
                            }
                        } catch (error) {

                            const newSlWait = (us.sl_wait || 0) + 1;
                            await pool.query(
                                "UPDATE user_signals SET sl_wait=? WHERE id=?",
                                [newSlWait, us_id]
                            );

                            if (newSlWait >= 3) {
                                await logEvent(s_id, user_id, us_id, ch_id, `sl 3 denemede koyulamadı ${currentPrice}`, pool);
                                const slFailMsg = `❌ **STOP LOSS ORDER FAILED**\n\n` +
                                    `**Symbol:** ${SYMBOL}\n` +
                                    `**API Name:** ${api.api_name}\n` +
                                    `**Exchange:** ${exchangeName}\n` +
                                    `**Error:** ${error.message}\n\n` +
                                    `Stop Loss order failed after 3 attempts.\n\n` +
                                    `🤖 But don't worry, Orca is tracking the signal for you.`;
                                await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, slFailMsg]);
                            }
                        }
                    }

                    if (userPosition && us.tp && !takeProfitOrder && (us.tp_wait || 0) < 3) {

                        try {
                            const tpOrderSide = us.trend === 'LONG' ? 'SELL' : 'BUY';
                            const newTakeOrder = await borsa.order_send(SYMBOL, tpOrderSide, 'TP', positionQuantity, us.tp);

                            let orderIdForDb = null;
                            if (newTakeOrder && (newTakeOrder.orderId || newTakeOrder.order_id)) {
                                orderIdForDb = newTakeOrder.orderId || newTakeOrder.order_id;
                                print_log({
                                    id: s_id,
                                    uid: user_id,
                                    usid: us_id,
                                    chid: ch_id,
                                    msg: `#${orderIdForDb} ${SYMBOL} ${tpOrderSide} TP ${positionQuantity} ${us.tp} SUCCESS`,
                                    pool
                                });

                                await pool.query(
                                    "UPDATE user_signals SET tticket=?, tp_wait=? WHERE id=?",
                                    [orderIdForDb, 0, us_id]
                                );
                            } else {
                                const errorMsg = newTakeOrder?.msg || newTakeOrder?.code || JSON.stringify(newTakeOrder) || 'Unknown error';
                                print_log({
                                    id: s_id,
                                    uid: user_id,
                                    usid: us_id,
                                    chid: ch_id,
                                    msg: `#FAILED ${SYMBOL} ${tpOrderSide} TP ${positionQuantity} ${us.tp} ERROR: ${errorMsg}`,
                                    pool
                                });
                                const newTpWait = (us.tp_wait || 0) + 1;
                                await pool.query(
                                    "UPDATE user_signals SET tp_wait=? WHERE id=?",
                                    [newTpWait, us_id]
                                );

                                if (newTpWait >= 3) {
                                    await logEvent(s_id, user_id, us_id, ch_id, `tp 3 denemede koyulamadı ${currentPrice}`, pool);
                                    let exchangeResponse = 'Unknown error';
                                    if (newTakeOrder && typeof newTakeOrder === 'object') {
                                        exchangeResponse = JSON.stringify(newTakeOrder);
                                    } else if (newTakeOrder) {
                                        exchangeResponse = newTakeOrder.toString();
                                    }

                                    const tpFailMsg = `❌ **TAKE PROFIT ORDER FAILED**\n\n` +
                                        `**Symbol:** ${SYMBOL}\n` +
                                        `**API Name:** ${api.api_name}\n` +
                                        `**Exchange:** ${exchangeName}\n` +
                                        `**Exchange Response:** ${exchangeResponse}\n\n` +
                                        `Take Profit order could not be placed after 3 attempts.\n\n` +
                                        `🤖 But don't worry, Orca is tracking the signal for you.`;
                                    await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, tpFailMsg]);
                                }
                            }
                        } catch (error) {

                            const newTpWait = (us.tp_wait || 0) + 1;
                            await pool.query(
                                "UPDATE user_signals SET tp_wait=? WHERE id=?",
                                [newTpWait, us_id]
                            );

                            if (newTpWait >= 3) {
                                await logEvent(s_id, user_id, us_id, ch_id, `tp 3 denemede koyulamadı ${currentPrice}`, pool);
                                const tpFailMsg = `❌ **TAKE PROFIT ORDER FAILED**\n\n` +
                                    `**Symbol:** ${SYMBOL}\n` +
                                    `**API Name:** ${api.api_name}\n` +
                                    `**Exchange:** ${exchangeName}\n` +
                                    `**Error:** ${error.message}\n\n` +
                                    `Take Profit order failed after 3 attempts.\n\n` +
                                    `🤖 But don't worry, Orca is tracking the signal for you.`;
                                await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, tpFailMsg]);
                            }
                        }
                    }

                    if (api.stop_loss_settings === 'signal' && sg && parseInt(sg.sl_hit) === 1) {
                        let profit = 0;
                        let profitPercent = 0;

                        if (us.open && us.volume) {
                            if (us.trend === 'LONG') {
                                profit = (currentPrice - parseFloat(us.open)) * parseFloat(us.volume);
                                profitPercent = ((currentPrice - parseFloat(us.open)) / parseFloat(us.open)) * 100;
                            } else { // SHORT
                                profit = (parseFloat(us.open) - currentPrice) * parseFloat(us.volume);
                                profitPercent = ((parseFloat(us.open) - currentPrice) / parseFloat(us.open)) * 100;
                            }
                        }
                        try {
                            const slMessage = notifySl(
                                us,
                                sg,
                                profit,
                                profitPercent,
                                positionQuantity,
                                currentPrice,
                                api,
                                exchangeName,
                                borsa.stepSize,
                                borsa.vdigits
                            );
                            await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, slMessage]);

                        } catch (error) {
                            print_log({
                                id: s_id,
                                uid: user_id,
                                usid: us_id,
                                chid: ch_id,
                                msg: `SL notification error: ${error.message}`,
                                pool
                            });
                        }

                        try {
                            if (us.ticket) {
                                let positions = await borsa.positions(SYMBOL);
                                // Eğer array değilse, array'e çevir
                                if (!Array.isArray(positions) && positions && typeof positions === 'object') {
                                    positions = Object.values(positions);
                                }
                                const userPositionAfterSl = positions?.find(pos => pos.symbol === SYMBOL && Math.abs(parseFloat(pos.positionAmt)) > 0);

                                if (userPositionAfterSl) {

                                    const closeResult = await borsa.close_position(SYMBOL);
                                    await logEvent(s_id, user_id, us_id, ch_id, `pozisyon kapatıldı ${currentPrice}`, pool);

                                    if (closeResult.success) {
                                        const positionClosedMsg = `✅ **POSITION CLOSED SUCCESSFULLY**\n\n` +
                                            `**Symbol:** ${SYMBOL}\n` +
                                            `**API Name:** ${api.api_name}\n` +
                                            `**Exchange:** ${exchangeName}\n` +
                                            `**Reason:** Signal Stop Loss\n` +
                                            `**Close Price:** ${currentPrice}\n` +
                                            `**Close Time:** ${new Date().toLocaleString('en-GB', { hour12: false })}\n\n` +
                                            `Position closed successfully due to signal stop loss.`;
                                        await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, positionClosedMsg]);
                                    } else {
                                        const positionFailMsg = `❌ **POSITION CLOSE FAILED**\n\n` +
                                            `**Symbol:** ${SYMBOL}\n` +
                                            `**API Name:** ${api.api_name}\n` +
                                            `**Exchange:** ${exchangeName}\n` +
                                            `**Error:** ${closeResult.message}\n\n` +
                                            `Failed to close position due to signal stop loss.`;
                                        await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, positionFailMsg]);
                                    }
                                } else {
                                    print_log({
                                        id: s_id,
                                        uid: user_id,
                                        usid: us_id,
                                        chid: ch_id,
                                        msg: `SL Hit, but position already seems closed.`, pool});
                                }
                            }
                        } catch (error) {
                             print_log({
                                id: s_id,
                                uid: user_id,
                                usid: us_id,
                                chid: ch_id,
                                msg: `Error during SL close: ${error.message}`, pool});
                        }

                        await pool.query(
                            "UPDATE user_signals SET status=?, closetime=?, close=? WHERE id=?",
                            [2, new Date().toISOString(), currentPrice, us_id]
                        );
                        print_log({
                            id: s_id,
                            uid: user_id,
                            usid: us_id,
                            chid: ch_id,
                            msg: `run_user finished. id: ${id}`,
                            pool
                        });

                        return;
                    }

                    if (sg && us && api && parseInt(us.tp_hit) < currentTpLevel) {

                        for (let tpIndex = parseInt(us.tp_hit) + 1; tpIndex <= currentTpLevel; tpIndex++) {
                            const tpColumnName = `tp${tpIndex}`;
                            const apiTpPercentage = parseFloat(api[tpColumnName]) || 0; // API TP yüzdesi

                            if (apiTpPercentage > 0) {

                                const entryPrice = parseFloat(us.open);
                                const tpPrice = parseFloat(sg[`tp${tpIndex}`]) || currentPrice;
                                let profit = 0;
                                let profitPercent = 0;

                                if (us.trend === 'LONG') {
                                    profit = (tpPrice - entryPrice) * parseFloat(us.volume || 0);
                                    profitPercent = ((tpPrice - entryPrice) / entryPrice) * 100;
                                } else {
                                    profit = (entryPrice - tpPrice) * parseFloat(us.volume || 0);
                                    profitPercent = ((entryPrice - tpPrice) / entryPrice) * 100;
                                }

                                try {
                                    await logEvent(s_id, user_id, us_id, ch_id, `tp${tpIndex} e ulaştı ${currentPrice}`, pool);
                                    const tpMessage = notifyTp(
                                        us,
                                        sg,
                                        tpIndex,
                                        profit,
                                        profitPercent,
                                        (positionQuantity * apiTpPercentage) / 100,
                                        api,
                                        exchangeName,
                                        borsa.stepSize,
                                        borsa.vdigits
                                    );
                                    await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, tpMessage]);


                                } catch (error) {
                                    print_log({
                                        id: s_id,
                                        uid: user_id,
                                        usid: us_id,
                                        chid: ch_id,
                                        msg: `TP notification error: ${error.message}`,
                                        pool
                                    });
                                }
                            }
                        }

                        await pool.query(
                            "UPDATE user_signals SET tp_hit=? WHERE id=?",
                            [currentTpLevel, us_id] // sg.tp_hit yerine currentTpLevel kullanılıyor
                        );
                    }

                    // Bu if bloğu orijinalde ayrıydı ve önceki us.tp_hit güncellemesinin ardından geliyordu.
                    // Şimdi önceki if bloğunun hemen altına entegre edilebilir veya ayrı bir mantık olarak kalabilir.
                    // Şimdilik ayrı kalıp currentTpLevel'ı kullanması sağlanıyor.
                    if (sg && us && api && parseInt(us.tp_hit) < currentTpLevel) {

                        if (api.trail_stop > 0) {

                            const trailIdx = parseInt(api.trail_stop);
                            const tpHit = currentTpLevel;
                            let newSl = null;
                            let tpLevelForNotification = null; // Notification için ayrı değişken

                            if ((tpHit - trailIdx) === 0) {
                                newSl = us.open;
                                tpLevelForNotification = 0;
                            } else if ((tpHit - trailIdx) > 0) {
                                tpLevelForNotification = tpHit - trailIdx;
                                newSl = sg[`tp${tpLevelForNotification}`];
                            }

                            let shouldUpdateSl = false;
                            if (newSl && parseFloat(newSl) > 0) { // yeni SL geçerli bir değerse
                                if (us.trend === 'LONG') {
                                    if (parseFloat(newSl) > parseFloat(us.sl)) { // Sadece yeni SL eskisinden daha iyi (yukarıda) ise güncelle
                                        shouldUpdateSl = true;
                                    }
                                } else if (us.trend === 'SHORT') {
                                    if (parseFloat(newSl) < parseFloat(us.sl)) { // Sadece yeni SL eskisinden daha iyi (aşağıda) ise güncelle
                                        shouldUpdateSl = true;
                                    }
                                }
                            }

                            if (shouldUpdateSl) {

                                const openOrders = await borsa.open_orders(SYMBOL);
                                if (!Array.isArray(openOrders) && openOrders && typeof openOrders === 'object') {
                                    openOrders = Object.values(openOrders);
                                }
                                const stopOrder = Array.isArray(openOrders) ? openOrders.find(order => order.type === 'STOP_MARKET' || order.type === 'SL') : null;
                                if (stopOrder) {
                                    try {
                                        let delete_result = await borsa.order_delete(SYMBOL, stopOrder.orderId);
                                        print_log({id: s_id, uid: user_id, usid: us_id, chid: ch_id, msg: `Old SL order deleted: ${stopOrder.orderId} | Exchange response: ${JSON.stringify(delete_result)}`, pool});
                                    } catch (e) {
                                        print_log({id: s_id, uid: user_id, usid: us_id, chid: ch_id, msg: `Error while deleting old SL order: ${e.message}`, pool});
                                    }
                                }

                                const newStopLossPrice = newSl;
                                let newStopOrder = null;
                                let orderIdForDb = null;
                                let success = false;

                                for (let attempt = 1; attempt <= 3; attempt++) {
                                    print_log({id: s_id, uid: user_id, usid: us_id, chid: ch_id, msg: `Trail Stop SL placement attempt ${attempt}/3`, pool});
                                    newStopOrder = await borsa.order_send(SYMBOL, us.trend === 'LONG' ? 'SELL' : 'BUY', 'SL', positionQuantity, newStopLossPrice);
                                    
                                    if (newStopOrder && (newStopOrder.orderId || newStopOrder.order_id)) {
                                        orderIdForDb = newStopOrder.orderId || newStopOrder.order_id;
                                        success = true;
                                        break; // Başarılı, döngüden çık
                                    }
                                    
                                    if (!success && attempt < 3) {
                                        await new Promise(res => setTimeout(res, 250)); // 500ms bekle
                                    }
                                }

                                if (success) {
                                    print_log({
                                        id: s_id,
                                        uid: user_id,
                                        usid: us_id,
                                        chid: ch_id,
                                        msg: `#${orderIdForDb} ${SYMBOL} ${us.trend === 'LONG' ? 'SELL' : 'BUY'} SL ${positionQuantity} ${newStopLossPrice} SUCCESS (TRAIL STOP)`,
                                        pool
                                    });
                                    await logEvent(s_id, user_id, us_id, ch_id, `trail stop çalıştı ${currentPrice}`, pool);
                                    
                                    // Bildirimi burada gönder
                                    const trailStopMsg = notifyTrailStop(us, sg, tpLevelForNotification, newSl, api, exchangeName);
                                    await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, trailStopMsg]);

                                } else {
                                    const errorMsg = newStopOrder?.msg || newStopOrder?.code || JSON.stringify(newStopOrder) || 'Unknown error';
                                    print_log({
                                        id: s_id,
                                        uid: user_id,
                                        usid: us_id,
                                        chid: ch_id,
                                        msg: `#FAILED ${SYMBOL} ${us.trend === 'LONG' ? 'SELL' : 'BUY'} SL ${positionQuantity} ${newStopLossPrice} ERROR: ${errorMsg} (TRAIL STOP after 3 attempts)`,
                                        pool
                                    });
                                }
                                
                                // Başarılı veya başarısız, DB'yi her zaman güncelle. Başarısızlık durumunda sticket null olur.
                                await pool.query(
                                    "UPDATE user_signals SET sl=?, sticket=? WHERE id=?",
                                    [newSl, orderIdForDb, us_id]
                                );
                            }

                        }

                        if (api.break_even_level > 0) {

                            const breakEvenIdx = parseInt(api.break_even_level);
                            const tpHit = currentTpLevel;
                            let newSl = null;
                            let tpLevelForNotification = null;

                            if (tpHit >= breakEvenIdx) {
                                newSl = us.open;
                                tpLevelForNotification = 0;
                            }

                            let shouldUpdateSl = false;
                            if (newSl && parseFloat(newSl) > 0) {
                                if (us.trend === 'LONG') {
                                    if (parseFloat(newSl) > parseFloat(us.sl)) {
                                        shouldUpdateSl = true;
                                    }
                                } else if (us.trend === 'SHORT') {
                                    if (parseFloat(newSl) < parseFloat(us.sl)) {
                                        shouldUpdateSl = true;
                                    }
                                }
                            }

                            if (shouldUpdateSl) {

                                const openOrders = await borsa.open_orders(SYMBOL);
                                if (!Array.isArray(openOrders) && openOrders && typeof openOrders === 'object') {
                                    openOrders = Object.values(openOrders);
                                }
                                const stopOrder = Array.isArray(openOrders) ? openOrders.find(order => order.type === 'STOP_MARKET' || order.type === 'SL') : null;
                                if (stopOrder) {
                                    try {
                                        let delete_result = await borsa.order_delete(SYMBOL, stopOrder.orderId);
                                        print_log({id: s_id, uid: user_id, usid: us_id, chid: ch_id, msg: `Old SL order deleted: ${stopOrder.orderId} | Exchange response: ${JSON.stringify(delete_result)}`, pool});
                                    } catch (e) {
                                        print_log({id: s_id, uid: user_id, usid: us_id, chid: ch_id, msg: `Error while deleting old SL order: ${e.message}`, pool});
                                    }
                                }

                                const newStopLossPrice = newSl;
                                let newStopOrder = null;
                                let orderIdForDb = null;
                                let success = false;

                                for (let attempt = 1; attempt <= 3; attempt++) {
                                    print_log({id: s_id, uid: user_id, usid: us_id, chid: ch_id, msg: `Break Even SL placement attempt ${attempt}/3`, pool});
                                    newStopOrder = await borsa.order_send(SYMBOL, us.trend === 'LONG' ? 'SELL' : 'BUY', 'SL', positionQuantity, newStopLossPrice);

                                    if (newStopOrder && (newStopOrder.orderId || newStopOrder.order_id)) {
                                        orderIdForDb = newStopOrder.orderId || newStopOrder.order_id;
                                        success = true;
                                        break; // Başarılı, döngüden çık
                                    }
                                    
                                    if (!success && attempt < 3) {
                                        await new Promise(res => setTimeout(res, 250)); // 500ms bekle
                                    }
                                }

                                if (success) {
                                    print_log({
                                        id: s_id,
                                        uid: user_id,
                                        usid: us_id,
                                        chid: ch_id,
                                        msg: `#${orderIdForDb} ${SYMBOL} ${us.trend === 'LONG' ? 'SELL' : 'BUY'} SL ${positionQuantity} ${newStopLossPrice} SUCCESS (BREAK EVEN)`,
                                        pool
                                    });
                                    await logEvent(s_id, user_id, us_id, ch_id, `maliyetine çek ${currentPrice}`, pool);

                                    // Bildirimi burada gönder
                                    const breakEvenMsg = notifyBreakEven(us, sg, breakEvenIdx, newSl, api, exchangeName);
                                    await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, breakEvenMsg]);

                                } else {
                                    const errorMsg = newStopOrder?.msg || newStopOrder?.code || JSON.stringify(newStopOrder) || 'Unknown error';
                                    print_log({
                                        id: s_id,
                                        uid: user_id,
                                        usid: us_id,
                                        chid: ch_id,
                                        msg: `#FAILED ${SYMBOL} ${us.trend === 'LONG' ? 'SELL' : 'BUY'} SL ${positionQuantity} ${newStopLossPrice} ERROR: ${errorMsg} (BREAK EVEN after 3 attempts)`,
                                        pool
                                    });
                                }
                                
                                // Başarılı veya başarısız, DB'yi her zaman güncelle. Başarısızlık durumunda sticket null olur.
                                await pool.query(
                                    "UPDATE user_signals SET sl=?, sticket=? WHERE id=?",
                                    [newSl, orderIdForDb, us_id]
                                );
                            }
                        }

                    }

                }


            } catch (err) { 
                let errorMsg = '';
                if (err instanceof Error) {
                    errorMsg = err.stack || err.message;
                } else if (typeof err === 'object') {
                    try {
                        errorMsg = JSON.stringify(err);
                    } catch (e) {
                        errorMsg = String(err);
                    }
                } else {
                    errorMsg = String(err);
                }
                print_log({
                    id: s_id,
                    uid: user_id,
                    usid: us_id,
                    chid: ch_id,
                    msg: `ERROR: ${errorMsg}`,
                    pool
                });
                console.log('run_user.js error:', err);
            }

            setTimeout(signalLoop, 1000);
        }


        signalLoop();


    } catch (err) { 
        let errorMsg = '';
        if (err instanceof Error) {
            errorMsg = err.stack || err.message;
        } else if (typeof err === 'object') {
            try {
                errorMsg = JSON.stringify(err);
            } catch (e) {
                errorMsg = String(err);
            }
        } else {
            errorMsg = String(err);
        }
        print_log({
            id: s_id,
            uid: user_id,
            usid: us_id,
            chid: ch_id,
            msg: `ERROR: ${errorMsg}`,
            pool
        });
        console.log('run_user.js error2:', err);
    }
}

export {
    run_user
};