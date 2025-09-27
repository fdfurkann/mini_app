import rbinance from './exchanges/binance_rest.js';
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

async function logEvent(us_id, message, pool) {
    print_log({ id: null, uid: null, usid: us_id, chid: null, msg: message, pool });
    
    const currentEvents = await pool.query("SELECT events FROM user_signals WHERE id=?", [us_id]);
    const existingEvents = currentEvents[0]?.[0]?.events || '';
    const newEvents = existingEvents ? `${existingEvents}\n${message}` : message;
    
    await pool.query("UPDATE user_signals SET events=? WHERE id=?", [newEvents, us_id]);
}

async function run_trader(id) {
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

    print_log({
        id: s_id,
        uid: user_id,
        usid: us_id,
        chid: ch_id,
        msg: `run_trader başlatıldı. id: ${id}`,
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

    const borsa = new rbinance(API_KEY, API_SECRET);

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
                    msg: `run_trader bitti. id: ${id}`,
                    pool
                });
                return;
            }
        } else {


            const priceInfo = (await borsa.call('/fapi/v1/ticker/price', 0, {
                symbol: SYMBOL
            }, 'GET'));
            const lastPrice = parseFloat(priceInfo.price);


            if (positionRisk && typeof positionRisk === 'object') {
                for (const [symbol, amount] of Object.entries(positionRisk)) {
                    if (Math.abs(parseFloat(amount)) > 0) {
                        if (symbol === SYMBOL) {
                            const duplicateMsg = `❌ **CANNOT OPEN TRADE**\n\n` +
                                `**Symbol:** ${SYMBOL}\n` +
                                `**API Name:** ${api.api_name}\n` +
                                `**Exchange:** Binance\n\n` +
                                `You already have an open position in ${SYMBOL}.`;
                            await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, duplicateMsg]);
                            print_log({
                                id: s_id,
                                uid: user_id,
                                usid: us_id,
                                chid: ch_id,
                                msg: `run_trader bitti. id: ${id}`,
                                pool
                            });
                            return;
                        } else {
                            print_log({
                                id: s_id,
                                uid: user_id,
                                usid: us_id,
                                chid: ch_id,
                                msg: `run_trader bitti. id: ${id}`,
                                pool
                            });
                            return;
                        }
                    }
                }
            }

            const exchangeInfo = await borsa.get_exchange();
            await borsa.set_symbol(SYMBOL, exchangeInfo);

            const leverageResult = await borsa.api_set_leverage(SYMBOL, LEVERAGE);

            const marginTypeResult = await borsa.api_set_margin_type(SYMBOL, MARGIN_TYPE);



            let quantity = ORDER_MARGIN_USDT / lastPrice;
            quantity = Math.floor(quantity / borsa.stepSize) * borsa.stepSize;
            if (quantity < borsa.minQty) {
                const lotErrorMsg = `❌ **CANNOT OPEN TRADE**\n\n` +
                    `**Symbol:** ${SYMBOL}\n` +
                    `**API Name:** ${api.api_name}\n` +
                    `**Exchange:** Binance\n\n` +
                    `Calculated lot size is incorrect. Minimum required: ${borsa.minQty}, Calculated: ${quantity}`;
                await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, lotErrorMsg]);
                print_log({
                    id: s_id,
                    uid: user_id,
                    usid: us_id,
                    chid: ch_id,
                    msg: `run_trader bitti. id: ${id}`,
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
            } else if (api?.stop_loss_settings === 'custom' && api?.percent_loss > 0) {
                const percentLoss = parseFloat(api?.percent_loss);
                if (us?.trend === 'LONG') {
                    stopLossPrice = lastPrice * (1 - percentLoss / 100);
                } else if (us?.trend === 'SHORT') {
                    stopLossPrice = lastPrice * (1 + percentLoss / 100);
                }
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
            } else if (api?.take_profit === 'custom' && api?.percent_profit > 0) {
                const percentProfit = parseFloat(api?.percent_profit);
                if (us?.trend === 'LONG') {
                    takeProfitPrice = lastPrice * (1 + percentProfit / 100);
                } else if (us?.trend === 'SHORT') {
                    takeProfitPrice = lastPrice * (1 - percentProfit / 100);
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

            if (bulk_order == 0) {
                const marketOrder = await borsa.order_send(SYMBOL, openSide, 'MARKET', quantity, lastPrice);
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
                    await logEvent(us_id, `işlem açıldı ${lastPrice}`, pool);
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



                if (stopLossPrice) {
                    const stopOrder = await borsa.order_send(SYMBOL, closeSide, 'SL', quantity, stopLossPrice);
                    sl_ticket = stopOrder?.orderId || stopOrder?.order_id || null;
                    if (sl_ticket) {
                        print_log({
                            id: s_id,
                            uid: user_id,
                            usid: us_id,
                            chid: ch_id,
                            msg: `#${sl_ticket} ${SYMBOL} ${closeSide} SL ${quantity} ${stopLossPrice} SUCCESS`,
                            pool
                        });
                    } else {
                        const errorMsg = stopOrder?.msg || stopOrder?.code || JSON.stringify(stopOrder) || 'Unknown error';
                        print_log({
                            id: s_id,
                            uid: user_id,
                            usid: us_id,
                            chid: ch_id,
                            msg: `#FAILED ${SYMBOL} ${closeSide} SL ${quantity} ${stopLossPrice} ERROR: ${errorMsg}`,
                            pool
                        });
                    }
                } else {}

                if (takeProfitPrice) {
                    const tpOrder = await borsa.order_send(SYMBOL, closeSide, 'TP', quantity, takeProfitPrice);
                    tp_ticket = tpOrder?.orderId || tpOrder?.order_id || null;
                    if (tp_ticket) {
                        print_log({
                            id: s_id,
                            uid: user_id,
                            usid: us_id,
                            chid: ch_id,
                            msg: `#${tp_ticket} ${SYMBOL} ${closeSide} TP ${quantity} ${takeProfitPrice} SUCCESS`,
                            pool
                        });
                    } else {
                        const errorMsg = tpOrder?.msg || tpOrder?.code || JSON.stringify(tpOrder) || 'Unknown error';
                        print_log({
                            id: s_id,
                            uid: user_id,
                            usid: us_id,
                            chid: ch_id,
                            msg: `#FAILED ${SYMBOL} ${closeSide} TP ${quantity} ${takeProfitPrice} ERROR: ${errorMsg}`,
                            pool
                        });
                    }
                } else {}
            } else {


                const orders = [];
                orders.push(borsa.prepare_order(SYMBOL, openSide, 'MARKET', quantity, lastPrice));
                if (stopLossPrice) {
                    orders.push(borsa.prepare_order(SYMBOL, closeSide, 'SL', quantity, stopLossPrice));
                }
                if (takeProfitPrice) {
                    orders.push(borsa.prepare_order(SYMBOL, closeSide, 'TP', quantity, takeProfitPrice));
                }
                const bulkResult = await borsa.bulk_order_send(orders);
                if (Array.isArray(bulkResult)) {
                    for (const order of bulkResult) {
                        if (order?.type === 'MARKET') {
                            order_ticket = order?.orderId || order?.order_id || null;
                            if (order_ticket) {
                                print_log({
                                    id: s_id,
                                    uid: user_id,
                                    usid: us_id,
                                    chid: ch_id,
                                    msg: `#${order_ticket} ${SYMBOL} ${openSide} MARKET ${quantity} ${lastPrice} SUCCESS`,
                                    pool
                                });
                                await logEvent(us_id, `işlem açıldı ${lastPrice}`, pool);
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
                        } else if (order?.type === 'STOP_MARKET' || order?.type === 'SL') {
                            sl_ticket = order?.orderId || order?.order_id || null;
                            if (sl_ticket) {
                                print_log({
                                    id: s_id,
                                    uid: user_id,
                                    usid: us_id,
                                    chid: ch_id,
                                    msg: `#${sl_ticket} ${SYMBOL} ${closeSide} SL ${quantity} ${stopLossPrice || 'N/A'} SUCCESS`,
                                    pool
                                });
                            } else {
                                const errorMsg = order?.msg || order?.code || JSON.stringify(order) || 'Unknown error';
                                print_log({
                                    id: s_id,
                                    uid: user_id,
                                    usid: us_id,
                                    chid: ch_id,
                                    msg: `#FAILED ${SYMBOL} ${closeSide} SL ${quantity} ${stopLossPrice || 'N/A'} ERROR: ${errorMsg}`,
                                    pool
                                });
                            }
                        } else if (order?.type === 'TAKE_PROFIT_MARKET' || order?.type === 'TP' || order?.type === 'LIMIT') {
                            tp_ticket = order?.orderId || order?.order_id || null;
                            if (tp_ticket) {
                                print_log({
                                    id: s_id,
                                    uid: user_id,
                                    usid: us_id,
                                    chid: ch_id,
                                    msg: `#${tp_ticket} ${SYMBOL} ${closeSide} TP ${quantity} ${takeProfitPrice || 'N/A'} SUCCESS`,
                                    pool
                                });
                            } else {
                                const errorMsg = order?.msg || order?.code || JSON.stringify(order) || 'Unknown error';
                                print_log({
                                    id: s_id,
                                    uid: user_id,
                                    usid: us_id,
                                    chid: ch_id,
                                    msg: `#FAILED ${SYMBOL} ${closeSide} TP ${quantity} ${takeProfitPrice || 'N/A'} ERROR: ${errorMsg}`,
                                    pool
                                });
                            }
                        }
                    }
                }

            }




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
                    'binance',
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
                    msg: `Başarılı: ${openMsg}`,
                    pool
                });
            } else {
                let errorMsg = 'Emir açılamadı';
                if (typeof marketOrder === 'object' && marketOrder && marketOrder.msg) errorMsg = marketOrder.msg;
                const failMsg = notifyOrderFailed(
                    SYMBOL,
                    sg.direction,
                    api.api_name || '',
                    'binance',
                    errorMsg
                );
                await pool.query("UPDATE user_signals SET status=3, event=? WHERE id=?", [errorMsg, us_id]);
                print_log({
                    id: s_id,
                    uid: user_id,
                    usid: us_id,
                    chid: ch_id,
                    msg: `HATA: ${errorMsg}`,
                    pool
                });
                await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, failMsg]);
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


        let positionCheckCounter = 0;
        async function signalLoop() {
            try {
                let [init_us] = await pool.query("SELECT * FROM `user_signals` WHERE id=?", [id]);
                const us = init_us[0];
                let [init_sg] = await pool.query("SELECT * FROM `signals` WHERE id=?", [us?.signal_id]);
                const sg = init_sg[0];
                let [init_api] = await pool.query("SELECT * FROM `api_keys` WHERE id=?", [us?.api_id]);
                const api = init_api[0];

                let [ratesData] = await pool.query("SELECT * FROM `rates` WHERE symbol=?", [SYMBOL]);
                const currentPrice = ratesData[0]?.price || 0;

                positionCheckCounter++;
                if (us && us.ticket && positionCheckCounter >= 5) {
                    positionCheckCounter = 0;


                    const positions = await borsa.positions(SYMBOL);
                    const userPosition = positions?.find(pos => pos.orderId === us.ticket || pos.id === us.ticket);

                    if (!userPosition) {

                        await pool.query(
                            "UPDATE user_signals SET status=?, closetime=?, close=? WHERE id=?",
                            [2, new Date().toISOString(), currentPrice, us_id]
                        );

                        const positionClosedMsg = `📈 **POSITION CLOSED**\n\n` +
                            `**Symbol:** ${SYMBOL}\n` +
                            `**API Name:** ${api.api_name}\n` +
                            `**Exchange:** Binance\n` +
                            `**Close Price:** ${currentPrice}\n` +
                            `**Close Time:** ${new Date().toLocaleString('en-GB', { hour12: false })}\n\n` +
                            `Position was closed automatically (not found in market).`;
                        await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, positionClosedMsg]);
                        print_log({
                            id: s_id,
                            uid: user_id,
                            usid: us_id,
                            chid: ch_id,
                            msg: `run_trader bitti. id: ${id}`,
                            pool
                        });

                        return;
                    }

                    const openOrders = await borsa.open_orders(SYMBOL);
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
                        await logEvent(us_id, `pozisyon kapatıldı ${currentPrice}`, pool);

                        await pool.query(
                            "UPDATE user_signals SET status=?, closetime=?, close=? WHERE id=?",
                            [2, new Date().toISOString(), currentPrice, us_id]
                        );

                        const marketCloseMsg = `🔴 **POSITION SL BY MARKET**\n\n` +
                            `**Symbol:** ${SYMBOL}\n` +
                            `**API Name:** ${api.api_name}\n` +
                            `**Exchange:** Binance\n` +
                            `**Reason:** ${closeReason}\n` +
                            `**Close Price:** ${currentPrice}\n` +
                            `**Close Time:** ${new Date().toLocaleString('en-GB', { hour12: false })}\n\n` +
                            `Position was closed at market price due to missing SL order.`;
                        await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, marketCloseMsg]);
                        print_log({
                            id: s_id,
                            uid: user_id,
                            usid: us_id,
                            chid: ch_id,
                            msg: `run_trader bitti. id: ${id}`,
                            pool
                        });

                        return;
                    }

                    if (!takeProfitOrder && us.tp && shouldClosePosition && closeReason.includes('Take Profit')) {

                        const closeResult = await borsa.close_position(SYMBOL);
                        await logEvent(us_id, `pozisyon kapatıldı ${currentPrice}`, pool);

                        await pool.query(
                            "UPDATE user_signals SET status=?, closetime=?, close=? WHERE id=?",
                            [2, new Date().toISOString(), currentPrice, us_id]
                        );

                        const marketCloseMsg = `🟢 **POSITION TP BY MARKET**\n\n` +
                            `**Symbol:** ${SYMBOL}\n` +
                            `**API Name:** ${api.api_name}\n` +
                            `**Exchange:** Binance\n` +
                            `**Reason:** ${closeReason}\n` +
                            `**Close Price:** ${currentPrice}\n` +
                            `**Close Time:** ${new Date().toLocaleString('en-GB', { hour12: false })}\n\n` +
                            `Position was closed at market price due to missing TP order.`;
                        await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, marketCloseMsg]);
                        print_log({
                            id: s_id,
                            uid: user_id,
                            usid: us_id,
                            chid: ch_id,
                            msg: `run_trader bitti. id: ${id}`,
                            pool
                        });

                        return;
                    }

                    if (us.sl && !stopLossOrder && (us.sl_wait || 0) < 3) {

                        try {
                            const slOrderSide = us.trend === 'LONG' ? 'SELL' : 'BUY';
                            const newStopOrder = await borsa.order_send(SYMBOL, slOrderSide, 'SL', quantity, us.sl);

                            if (newStopOrder && (newStopOrder.orderId || newStopOrder.order_id)) {
                                print_log({
                                    id: s_id,
                                    uid: user_id,
                                    usid: us_id,
                                    chid: ch_id,
                                    msg: `#${newStopOrder.orderId || newStopOrder.order_id} ${SYMBOL} ${slOrderSide} SL ${quantity} ${us.sl} SUCCESS`,
                                    pool
                                });

                                await pool.query(
                                    "UPDATE user_signals SET sticket=?, sl_wait=? WHERE id=?",
                                    [newStopOrder.orderId || newStopOrder.order_id, 0, us_id]
                                );
                            } else {
                                const errorMsg = newStopOrder?.msg || newStopOrder?.code || JSON.stringify(newStopOrder) || 'Unknown error';
                                print_log({
                                    id: s_id,
                                    uid: user_id,
                                    usid: us_id,
                                    chid: ch_id,
                                    msg: `#FAILED ${SYMBOL} ${slOrderSide} SL ${quantity} ${us.sl} ERROR: ${errorMsg}`,
                                    pool
                                });

                                const newSlWait = (us.sl_wait || 0) + 1;
                                await pool.query(
                                    "UPDATE user_signals SET sl_wait=? WHERE id=?",
                                    [newSlWait, us_id]
                                );

                                if (newSlWait >= 3) {
                                    await logEvent(us_id, `sl 3 denemede koyulamadı ${currentPrice}`, pool);
                                    let exchangeResponse = 'Unknown error';
                                    if (newStopOrder && typeof newStopOrder === 'object') {
                                        exchangeResponse = JSON.stringify(newStopOrder);
                                    } else if (newStopOrder) {
                                        exchangeResponse = newStopOrder.toString();
                                    }

                                    const slFailMsg = `❌ **STOP LOSS ORDER FAILED**\n\n` +
                                        `**Symbol:** ${SYMBOL}\n` +
                                        `**API Name:** ${api.api_name}\n` +
                                        `**Exchange:** Binance\n` +
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
                                await logEvent(us_id, `sl 3 denemede koyulamadı ${currentPrice}`, pool);
                                const slFailMsg = `❌ **STOP LOSS ORDER FAILED**\n\n` +
                                    `**Symbol:** ${SYMBOL}\n` +
                                    `**API Name:** ${api.api_name}\n` +
                                    `**Exchange:** Binance\n` +
                                    `**Error:** ${error.message}\n\n` +
                                    `Stop Loss order failed after 3 attempts.\n\n` +
                                    `🤖 But don't worry, Orca is tracking the signal for you.`;
                                await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, slFailMsg]);
                            }
                        }
                    }

                    if (us.tp && !takeProfitOrder && (us.tp_wait || 0) < 3) {

                        try {
                            const tpOrderSide = us.trend === 'LONG' ? 'SELL' : 'BUY';
                            const newTakeOrder = await borsa.order_send(SYMBOL, tpOrderSide, 'TP', quantity, us.tp);

                            if (newTakeOrder && (newTakeOrder.orderId || newTakeOrder.order_id)) {
                                print_log({
                                    id: s_id,
                                    uid: user_id,
                                    usid: us_id,
                                    chid: ch_id,
                                    msg: `#${newTakeOrder.orderId || newTakeOrder.order_id} ${SYMBOL} ${tpOrderSide} TP ${quantity} ${us.tp} SUCCESS`,
                                    pool
                                });

                                await pool.query(
                                    "UPDATE user_signals SET tticket=?, tp_wait=? WHERE id=?",
                                    [newTakeOrder.orderId || newTakeOrder.order_id, 0, us_id]
                                );
                            } else {
                                const errorMsg = newTakeOrder?.msg || newTakeOrder?.code || JSON.stringify(newTakeOrder) || 'Unknown error';
                                print_log({
                                    id: s_id,
                                    uid: user_id,
                                    usid: us_id,
                                    chid: ch_id,
                                    msg: `#FAILED ${SYMBOL} ${tpOrderSide} TP ${quantity} ${us.tp} ERROR: ${errorMsg}`,
                                    pool
                                });
                                const newTpWait = (us.tp_wait || 0) + 1;
                                await pool.query(
                                    "UPDATE user_signals SET tp_wait=? WHERE id=?",
                                    [newTpWait, us_id]
                                );

                                if (newTpWait >= 3) {
                                    await logEvent(us_id, `tp 3 denemede koyulamadı ${currentPrice}`, pool);
                                    let exchangeResponse = 'Unknown error';
                                    if (newTakeOrder && typeof newTakeOrder === 'object') {
                                        exchangeResponse = JSON.stringify(newTakeOrder);
                                    } else if (newTakeOrder) {
                                        exchangeResponse = newTakeOrder.toString();
                                    }

                                    const tpFailMsg = `❌ **TAKE PROFIT ORDER FAILED**\n\n` +
                                        `**Symbol:** ${SYMBOL}\n` +
                                        `**API Name:** ${api.api_name}\n` +
                                        `**Exchange:** Binance\n` +
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
                                await logEvent(us_id, `tp 3 denemede koyulamadı ${currentPrice}`, pool);
                                const tpFailMsg = `❌ **TAKE PROFIT ORDER FAILED**\n\n` +
                                    `**Symbol:** ${SYMBOL}\n` +
                                    `**API Name:** ${api.api_name}\n` +
                                    `**Exchange:** Binance\n` +
                                    `**Error:** ${error.message}\n\n` +
                                    `Take Profit order failed after 3 attempts.\n\n` +
                                    `🤖 But don't worry, Orca is tracking the signal for you.`;
                                await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, tpFailMsg]);
                            }
                        }
                    }
                }

                if (api.stop_loss_settings === 'signal' && sg && parseInt(sg.sl_hit) === 1) {

                    try {
                        const slMessage = notifySl(
                            us,
                            sg,
                            0,
                            0,
                            us.volume,
                            currentPrice,
                            api,
                            'Binance',
                            borsa.stepSize,
                            borsa.vdigits
                        );

                    } catch (error) {}

                    try {
                        if (us.ticket) {
                            const positions = await borsa.positions(SYMBOL);
                            const userPosition = positions?.find(pos => pos.orderId === us.ticket || pos.id === us.ticket);

                            if (userPosition && Math.abs(parseFloat(userPosition.positionAmt)) > 0) {

                                const closeResult = await borsa.close_position(SYMBOL);
                        await logEvent(us_id, `pozisyon kapatıldı ${currentPrice}`, pool);

                                if (closeResult.success) {
                                    const positionClosedMsg = `✅ **POSITION CLOSED SUCCESSFULLY**\n\n` +
                                        `**Symbol:** ${SYMBOL}\n` +
                                        `**API Name:** ${api.api_name}\n` +
                                        `**Exchange:** Binance\n` +
                                        `**Reason:** Signal Stop Loss\n` +
                                        `**Close Price:** ${currentPrice}\n` +
                                        `**Close Time:** ${new Date().toLocaleString('en-GB', { hour12: false })}\n\n` +
                                        `Position closed successfully due to signal stop loss.`;
                                    await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, positionClosedMsg]);
                                } else {
                                    const positionFailMsg = `❌ **POSITION CLOSE FAILED**\n\n` +
                                        `**Symbol:** ${SYMBOL}\n` +
                                        `**API Name:** ${api.api_name}\n` +
                                        `**Exchange:** Binance\n` +
                                        `**Error:** ${closeResult.message}\n\n` +
                                        `Failed to close position due to signal stop loss.`;
                                    await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, positionFailMsg]);
                                }
                            } else {}
                        }
                    } catch (error) {}

                    await pool.query(
                        "UPDATE user_signals SET status=?, closetime=?, close=? WHERE id=?",
                        [2, new Date().toISOString(), currentPrice, us_id]
                    );
                    print_log({
                        id: s_id,
                        uid: user_id,
                        usid: us_id,
                        chid: ch_id,
                        msg: `run_trader bitti. id: ${id}`,
                        pool
                    });

                    return;
                }

                if (sg && us && api && parseInt(us.tp_hit) < parseInt(sg.tp_hit)) {

                    const currentTpLevel = parseInt(sg.tp_hit);
                    const userTpLevel = parseInt(us.tp_hit);

                    for (let tpIndex = userTpLevel + 1; tpIndex <= currentTpLevel; tpIndex++) {
                        const tpColumnName = `tp${tpIndex}`;
                        const tpPercentage = parseFloat(api[tpColumnName]) || 0;

                        if (tpPercentage > 0) {

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
                                await logEvent(us_id, `tp${tpIndex} e ulaştı ${currentPrice}`, pool);
                                const tpMessage = notifyTp(
                                    us,
                                    sg,
                                    tpIndex,
                                    profit,
                                    profitPercent,
                                    (parseFloat(us.volume || 0) * tpPercentage) / 100,
                                    api,
                                    'Binance',
                                    borsa.stepSize,
                                    borsa.vdigits
                                );


                            } catch (error) {}
                        }
                    }

                    await pool.query(
                        "UPDATE user_signals SET tp_hit=? WHERE id=?",
                        [currentTpLevel, us_id]
                    );
                }

                if (sg && us && api && parseInt(sg.tp_hit) < parseInt(us.tp_hit)) {

                    if (api.trail_stop > 0) {

                        const trailIdx = parseInt(api.trail_stop);
                        const tpHit = parseInt(sg.tp_hit);
                        let newSl = null;
                        let tpLevel = null;

                        if ((tpHit - trailIdx) === 0) {
                            newSl = us.open;
                            tpLevel = 0;
                        } else if ((tpHit - trailIdx) > 0) {
                            tpLevel = tpHit - trailIdx;
                            newSl = sg[`tp${tpLevel}`];
                        }

                        let shouldUpdateSl = false;
                        if (us.trend === 'LONG' && parseFloat(newSl) > parseFloat(us.sl)) {
                            shouldUpdateSl = true;
                        } else if (us.trend === 'SHORT' && parseFloat(newSl) < parseFloat(us.sl)) {
                            shouldUpdateSl = true;
                        }
                        if (newSl && tpLevel >= 0 && parseFloat(newSl) > 0 && shouldUpdateSl) {

                            const openOrders = await borsa.open_orders(SYMBOL);
                            const stopOrder = Array.isArray(openOrders) ? openOrders.find(order => order.type === 'STOP_MARKET' || order.type === 'SL') : null;
                            if (stopOrder) {
                                let delete_result = await borsa.order_delete(SYMBOL, stopOrder.orderId);
                            }

                            const newStopLossPrice = newSl;
                            const newStopOrder = await borsa.order_send(SYMBOL, 'SELL', 'SL', quantity, newStopLossPrice);
                            us.sl = newSl;
                            us.sticket = newStopOrder.orderId || newStopOrder.order_id;
                            us.tp_hit = sg.sl_hit;
                            if (newStopOrder && (newStopOrder.orderId || newStopOrder.order_id)) {
                                print_log({
                                    id: s_id,
                                    uid: user_id,
                                    usid: us_id,
                                    chid: ch_id,
                                    msg: `#${newStopOrder.orderId || newStopOrder.order_id} ${SYMBOL} SELL SL ${quantity} ${newStopLossPrice} SUCCESS (TRAIL/BREAKEVEN)`,
                                    pool
                                });
                                await logEvent(us_id, `trail stop çalıştı ${currentPrice}`, pool);
                                await pool.query(
                                    "UPDATE user_signals SET sl=?, sticket=? WHERE id=?",
                                    [newSl, newStopOrder.orderId || newStopOrder.order_id, us_id]
                                );
                            } else {
                                const errorMsg = newStopOrder?.msg || newStopOrder?.code || JSON.stringify(newStopOrder) || 'Unknown error';
                                print_log({
                                    id: s_id,
                                    uid: user_id,
                                    usid: us_id,
                                    chid: ch_id,
                                    msg: `#FAILED ${SYMBOL} SELL SL ${quantity} ${newStopLossPrice} ERROR: ${errorMsg} (TRAIL/BREAKEVEN)`,
                                    pool
                                });
                                await pool.query(
                                    "UPDATE user_signals SET sl=? WHERE id=?",
                                    [newSl, us_id]
                                );
                            }

                        }

                    }


                    if (api.break_even_level > 0) {

                        const trailIdx = parseInt(api.break_even_level);
                        const tpHit = parseInt(sg.tp_hit);
                        let newSl = null;
                        let tpLevel = null;

                        if ((tpHit - trailIdx) === 0) {
                            newSl = us.open;
                            tpLevel = 0;

                        }

                        let shouldUpdateSl = false;
                        if (us.trend === 'LONG' && parseFloat(newSl) > parseFloat(us.sl)) {
                            shouldUpdateSl = true;
                        } else if (us.trend === 'SHORT' && parseFloat(newSl) < parseFloat(us.sl)) {
                            shouldUpdateSl = true;
                        }

                        if (newSl && tpLevel >= 0 && parseFloat(newSl) > 0 && shouldUpdateSl) {

                            const openOrders = await borsa.open_orders(SYMBOL);
                            const stopOrder = Array.isArray(openOrders) ? openOrders.find(order => order.type === 'STOP_MARKET' || order.type === 'SL') : null;
                            if (stopOrder) {
                                let delete_result = await borsa.order_delete(SYMBOL, stopOrder.orderId);
                            }

                            const newStopLossPrice = newSl;
                            const newStopOrder = await borsa.order_send(SYMBOL, 'SELL', 'SL', quantity, newStopLossPrice);

                            if (newStopOrder && (newStopOrder.orderId || newStopOrder.order_id)) {
                                print_log({
                                    id: s_id,
                                    uid: user_id,
                                    usid: us_id,
                                    chid: ch_id,
                                    msg: `#${newStopOrder.orderId || newStopOrder.order_id} ${SYMBOL} SELL SL ${quantity} ${newStopLossPrice} SUCCESS (TRAIL/BREAKEVEN)`,
                                    pool
                                });
                                await logEvent(us_id, `maliyetine çek ${currentPrice}`, pool);
                                await pool.query(
                                    "UPDATE user_signals SET sl=?, sticket=? WHERE id=?",
                                    [newSl, newStopOrder.orderId || newStopOrder.order_id, us_id]
                                );

                                if (api.break_even_level > 0) {
                                    const breakEvenMsg = notifyBreakEven(us, sg, parseInt(api.break_even_level), newSl, api, 'Binance');
                                    await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, breakEvenMsg]);
                                } else {
                                    const trailStopMsg = notifyTrailStop(us, sg, tpLevel, newSl, api, 'Binance');
                                    await pool.query("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)", [user_id, trailStopMsg]);
                                }
                            } else {
                                const errorMsg = newStopOrder?.msg || newStopOrder?.code || JSON.stringify(newStopOrder) || 'Unknown error';
                                print_log({
                                    id: s_id,
                                    uid: user_id,
                                    usid: us_id,
                                    chid: ch_id,
                                    msg: `#FAILED ${SYMBOL} SELL SL ${quantity} ${newStopLossPrice} ERROR: ${errorMsg} (TRAIL/BREAKEVEN)`,
                                    pool
                                });
                                await pool.query(
                                    "UPDATE user_signals SET sl=? WHERE id=?",
                                    [newSl, us_id]
                                );
                            }

                        }

                    }

                }

                await pool.query(
                    "UPDATE user_signals SET tp_hit=? WHERE id=?",
                    [sg.tp_hit, us_id]
                );

            } catch (err) {}

            setTimeout(signalLoop, 1000);
        }


        signalLoop();


    } catch (err) {}
}

export {
    run_trader
};