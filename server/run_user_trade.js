import pool from './db.js';
import { print_log } from './print_log.js';
import { bildirim_ekle, formatPriceTickSize } from './utils.js';
import { notifyOrderOpen, notifyOrderFailed, notifyOpenPositionExists } from './run_user_notification.js';

const SIGNAL_CANCEL_MINUTES = 15;

async function checkSignalTimeout(us, sg, s_id, user_id, us_id, ch_id) {
    const signalTime = new Date(sg.tarih).getTime();
    const now = new Date().getTime();
    const minutesPassed = (now - signalTime) / (1000 * 60);

    if (minutesPassed > SIGNAL_CANCEL_MINUTES && us.open == 0) {
        await pool.query("UPDATE `user_signals` SET `event`='Signal expired and was not opened.', status=2, ticket='-1', `close`=?, `closetime`=NOW() WHERE `id`=?", [sg.entry1, us.id]);
        const log_str = `Signal expired after ${SIGNAL_CANCEL_MINUTES} minutes.`;
        print_log({ id: s_id, uid: user_id, usid: us_id, chid: ch_id, msg: log_str, pool });
        return false; // Signal has timed out
    }
    return true; // Signal is still valid
}



async function openPrimaryOrder(borsa, us, sg, api, bysym, api_exchange) {
    try {
        // USDT miktarını al
        const usdtAmount = parseFloat(api.lotsize);
        
        // Mevcut fiyatı al
        let currentPrice = 0;
        try {
            let ticker;
            if (api_exchange === 'binance') {
                ticker = await borsa.call('/fapi/v1/ticker/price', 0, { symbol: us.symbol });
            } else if (api_exchange === 'bybit') {
                ticker = await borsa.call('/v5/market/tickers', 0, { category: 'linear', symbol: us.symbol });
                if (ticker && ticker.result && ticker.result.list && ticker.result.list[0]) {
                    ticker = { price: ticker.result.list[0].lastPrice };
                }
            } else if (api_exchange === 'bingx') {
                ticker = await borsa.call('/openApi/swap/v2/quote/price', 0, { symbol: us.symbol });
                if (ticker && ticker.data) {
                    ticker = { price: ticker.data.price };
                }
            }
            
            if (ticker && ticker.price) {
                currentPrice = parseFloat(ticker.price);
            } else {
                throw new Error('Could not get current price');
            }
        } catch (priceError) {
            print_log({ id: sg.id, uid: us.user_id, usid: us.id, chid: sg.channel_id, msg: `Error getting current price: ${priceError.message}`, pool });
            throw priceError;
        }
        
        // USDT miktarını fiyata bölerek quantity hesapla
        const quantity = usdtAmount / currentPrice;
        
        // Quantity'yi stepSize'a göre yuvarla
        const stepSize = parseFloat(bysym.stepSize);
        const roundedQuantity = Math.floor(quantity / stepSize) * stepSize;
        
        // Minimum notional kontrolü (Binance için 5 USDT)
        const notional = roundedQuantity * currentPrice;
        if (notional < 5) {
            throw new Error(`Order notional (${notional.toFixed(2)} USDT) is below minimum (5 USDT)`);
        }
        
        print_log({ id: sg.id, uid: us.user_id, usid: us.id, chid: sg.channel_id, msg: `Calculated quantity: ${roundedQuantity} (${usdtAmount} USDT / ${currentPrice} price = ${notional.toFixed(2)} USDT notional)`, pool });
        
        const side = sg.direction === 'LONG' ? 'BUY' : 'SELL';
        
        const order = await borsa.order_send(us.symbol, side, 'MARKET', roundedQuantity, 0);

        if (order && order.orderId) {
            const openPrice = parseFloat(order.avgPrice) || parseFloat(order.price);
            await pool.query("UPDATE user_signals SET ticket=?, open=?, opentime=NOW(), status=1, volume=? WHERE id=?", [order.orderId, openPrice, roundedQuantity, us.id]);
            const notifyMsg = notifyOrderOpen(us.symbol, sg.direction, api.api_name, api_exchange, openPrice, roundedQuantity);
            await bildirim_ekle(us.user_id, notifyMsg);
            print_log({ id: sg.id, uid: us.user_id, usid: us.id, chid: sg.channel_id, msg: `Primary order opened successfully: ${JSON.stringify(order)}`, pool });
            return { ticket: order.orderId, openPrice: openPrice };
        } else {
            throw new Error(order ? JSON.stringify(order) : "Unknown error");
        }
    } catch (error) {
        const errorMsg = `Failed to open primary order: ${error.message}`;
        print_log({ id: sg.id, uid: us.user_id, usid: us.id, chid: sg.channel_id, msg: errorMsg, pool });
        await pool.query("UPDATE user_signals SET status=3, event=? WHERE id=?", [errorMsg, us.id]);
        const notifyMsg = notifyOrderFailed(us.symbol, sg.direction, api.api_name, api_exchange, error.message);
        await bildirim_ekle(us.user_id, notifyMsg);
        return null;
    }
}

async function placeSlOrder(borsa, us, sg, api, bysym, api_exchange) {
    try {
        const side = sg.direction === 'LONG' ? 'SELL' : 'BUY';
        const slPrice = formatPriceTickSize(us.sl, bysym.tickSize);
        const slOrder = await borsa.order_send(us.symbol, side, 'SL', 0, slPrice, 1);
        
        if (slOrder && slOrder.orderId) {
            await pool.query("UPDATE user_signals SET sticket=? WHERE id=?", [slOrder.orderId, us.id]);
            print_log({ id: sg.id, uid: us.user_id, usid: us.id, chid: sg.channel_id, msg: `SL order placed: ${JSON.stringify(slOrder)}`, pool });
        } else {
             throw new Error(slOrder ? JSON.stringify(slOrder) : "Unknown error placing SL");
        }
    } catch (error) {
        const errorMsg = `Failed to place SL order: ${error.message}`;
        print_log({ id: sg.id, uid: us.user_id, usid: us.id, chid: sg.channel_id, msg: errorMsg, pool });
        // Optionally notify user about SL placement failure
    }
}

async function placeTpOrder(borsa, us, sg, api, bysym, api_exchange) {
     try {
        const side = sg.direction === 'LONG' ? 'SELL' : 'BUY';
        const tpPrice = formatPriceTickSize(us.tp, bysym.tickSize);
        const tpOrder = await borsa.order_send(us.symbol, side, 'TP', 0, tpPrice, 1);
        
        if (tpOrder && tpOrder.orderId) {
            await pool.query("UPDATE user_signals SET tticket=? WHERE id=?", [tpOrder.orderId, us.id]);
            print_log({ id: sg.id, uid: us.user_id, usid: us.id, chid: sg.channel_id, msg: `TP order placed: ${JSON.stringify(tpOrder)}`, pool });
        } else {
             throw new Error(tpOrder ? JSON.stringify(tpOrder) : "Unknown error placing TP");
        }
    } catch (error) {
        const errorMsg = `Failed to place TP order: ${error.message}`;
        print_log({ id: sg.id, uid: us.user_id, usid: us.id, chid: sg.channel_id, msg: errorMsg, pool });
        // Optionally notify user about TP placement failure
    }
}

async function placeLimitTpOrders(borsa, us, sg, api, bysym, api_exchange) {
    try {
        const side = sg.direction === 'LONG' ? 'SELL' : 'BUY';
        // USDT miktarını al ve quantity hesapla
        const usdtAmount = parseFloat(api.lotsize);
        
        // Mevcut fiyatı al
        let currentPrice = 0;
        try {
            let ticker;
            if (api_exchange === 'binance') {
                ticker = await borsa.call('/fapi/v1/ticker/price', 0, { symbol: us.symbol });
            } else if (api_exchange === 'bybit') {
                ticker = await borsa.call('/v5/market/tickers', 0, { category: 'linear', symbol: us.symbol });
                if (ticker && ticker.result && ticker.result.list && ticker.result.list[0]) {
                    ticker = { price: ticker.result.list[0].lastPrice };
                }
            } else if (api_exchange === 'bingx') {
                ticker = await borsa.call('/openApi/swap/v2/quote/price', 0, { symbol: us.symbol });
                if (ticker && ticker.data) {
                    ticker = { price: ticker.data.price };
                }
            }
            
            if (ticker && ticker.price) {
                currentPrice = parseFloat(ticker.price);
            } else {
                throw new Error('Could not get current price for limit TP orders');
            }
        } catch (priceError) {
            print_log({ id: sg.id, uid: us.user_id, usid: us.id, chid: sg.channel_id, msg: `Error getting current price for limit TP: ${priceError.message}`, pool });
            return; // Limit TP emirleri olmadan devam et
        }
        
        // USDT miktarını fiyata bölerek quantity hesapla
        const quantity = usdtAmount / currentPrice;
        
        // Quantity'yi stepSize'a göre yuvarla
        const stepSize = parseFloat(bysym.stepSize);
        const roundedQuantity = Math.floor(quantity / stepSize) * stepSize;
        
        // TP1'den TP10'a kadar limit emirleri yerleştir
        for (let i = 1; i <= 10; i++) {
            const tpPrice = sg[`tp${i}`];
            if (tpPrice && parseFloat(tpPrice) > 0) {
                const formattedPrice = formatPriceTickSize(tpPrice, bysym.tickSize);
                const limitOrder = await borsa.order_send(us.symbol, side, 'LIMIT', roundedQuantity, formattedPrice, 1); // reduceOnly
                
                if (limitOrder && limitOrder.orderId) {
                    print_log({ id: sg.id, uid: us.user_id, usid: us.id, chid: sg.channel_id, msg: `Limit TP${i} order placed: ${JSON.stringify(limitOrder)}`, pool });
                } else {
                    print_log({ id: sg.id, uid: us.user_id, usid: us.id, chid: sg.channel_id, msg: `Failed to place limit TP${i} order`, pool });
                }
            }
        }
    } catch (error) {
        const errorMsg = `Failed to place limit TP orders: ${error.message}`;
        print_log({ id: sg.id, uid: us.user_id, usid: us.id, chid: sg.channel_id, msg: errorMsg, pool });
    }
}

async function monitorPosition(borsa, us, sg, api, bysym, currentPrice, api_exchange, lastPositionCheck) {
    // Her 5 saniyede bir borsa hesabından positions ve open_orders kontrolü yap
    const now = Date.now();
    const checkInterval = 5000; // 5 saniye
    
    if (now - lastPositionCheck < checkInterval) {
        // Henüz 5 saniye geçmemiş, sadece market fiyat kontrolü yap
        // Check for market-based SL hit
        if (us.sl > 0) {
            if ((sg.direction === 'LONG' && currentPrice <= us.sl) || (sg.direction === 'SHORT' && currentPrice >= us.sl)) {
                print_log({ id: sg.id, uid: us.user_id, usid: us.id, chid: sg.channel_id, msg: `Market price SL triggered. Price: ${currentPrice}, SL: ${us.sl}`, pool });
                return await closePosition(borsa, us, sg, api, currentPrice, "Market SL Hit", api_exchange, bysym);
            }
        }

        // Check for market-based TP hit
        if (us.tp > 0) {
             if ((sg.direction === 'LONG' && currentPrice >= us.tp) || (sg.direction === 'SHORT' && currentPrice <= us.tp)) {
                print_log({ id: sg.id, uid: us.user_id, usid: us.id, chid: sg.channel_id, msg: `Market price TP triggered. Price: ${currentPrice}, TP: ${us.tp}`, pool });
                return await closePosition(borsa, us, sg, api, currentPrice, "Market TP Hit", api_exchange, bysym);
            }
        }
        
        return us;
    }
    
    // 5 saniye geçmiş, borsa hesabından kontrol yap
    print_log({ id: sg.id, uid: us.user_id, usid: us.id, chid: sg.channel_id, msg: `Performing 5-second position and orders check`, pool });
    
    try {
        // Borsa hesabından positions kontrolü
        const positions = await borsa.position_risk();
        const position = positions[us.symbol];
        
        if (!position || Math.abs(parseFloat(position)) === 0) {
            // Pozisyon kapandı, sinyali kapat
            print_log({ id: sg.id, uid: us.user_id, usid: us.id, chid: sg.channel_id, msg: `Position closed on exchange. Closing signal.`, pool });
            return await closePosition(borsa, us, sg, api, currentPrice, "Position Closed on Exchange", api_exchange, bysym);
        }
        
        // Borsa hesabından open_orders kontrolü
        const openOrders = await borsa.open_orders(us.symbol);
        
        // Check for market-based SL hit
        if (us.sl > 0) {
            if ((sg.direction === 'LONG' && currentPrice <= us.sl) || (sg.direction === 'SHORT' && currentPrice >= us.sl)) {
                print_log({ id: sg.id, uid: us.user_id, usid: us.id, chid: sg.channel_id, msg: `Market price SL triggered. Price: ${currentPrice}, SL: ${us.sl}`, pool });
                return await closePosition(borsa, us, sg, api, currentPrice, "Market SL Hit", api_exchange, bysym);
            }
        }

        // Check for market-based TP hit
        if (us.tp > 0) {
             if ((sg.direction === 'LONG' && currentPrice >= us.tp) || (sg.direction === 'SHORT' && currentPrice <= us.tp)) {
                print_log({ id: sg.id, uid: us.user_id, usid: us.id, chid: sg.channel_id, msg: `Market price TP triggered. Price: ${currentPrice}, TP: ${us.tp}`, pool });
                return await closePosition(borsa, us, sg, api, currentPrice, "Market TP Hit", api_exchange, bysym);
            }
        }
        
        // Check if SL order still exists on exchange, if not, replace it
        if (us.sl > 0 && us.sticket) {
            const slOrderExists = openOrders.some(o => o.orderId === us.sticket);
            if (!slOrderExists) {
                print_log({ id: sg.id, uid: us.user_id, usid: us.id, chid: sg.channel_id, msg: `SL order ${us.sticket} not found on exchange. Replacing it.`, pool });
                await placeSlOrder(borsa, us, sg, api, bysym, api_exchange);
            }
        }

        // Check if TP order still exists on exchange, if not, replace it
        if (us.tp > 0 && us.tticket) {
            const tpOrderExists = openOrders.some(o => o.orderId === us.tticket);
            if (!tpOrderExists) {
                 print_log({ id: sg.id, uid: us.user_id, usid: us.id, chid: sg.channel_id, msg: `TP order ${us.tticket} not found on exchange. Replacing it.`, pool });
                await placeTpOrder(borsa, us, sg, api, bysym, api_exchange);
            }
        }
        
        // Son kontrol zamanını güncelle
        return { updatedUserSignal: us, newLastPositionCheck: now };
        
    } catch (error) {
        print_log({ id: sg.id, uid: us.user_id, usid: us.id, chid: sg.channel_id, msg: `Error during position/orders check: ${error.message}`, pool });
        // Hata durumunda da son kontrol zamanını güncelle ki sürekli hata vermesin
        return { updatedUserSignal: us, newLastPositionCheck: now };
    }

    return { updatedUserSignal: us, newLastPositionCheck: lastPositionCheck };
}

async function handleTrailStop(borsa, us, sg, api, bysym, api_exchange) {
    if (!api.trail_stop || us.open <= 0 || us.close > 0) return us;

    const trailIdx = parseInt(api.trail_stop);
    const tpHit = parseInt(sg.tp_hit);
    let newSl = null;
    let tpLevel = null;

    if ((tpHit - trailIdx) === 0) {
        newSl = us.open;
        tpLevel = 0; // Breakeven
    } else if ((tpHit - trailIdx) > 0) {
        tpLevel = tpHit - trailIdx;
        newSl = sg[`tp${tpLevel}`];
    }
    
    if (newSl && parseFloat(newSl) > 0 && us.sl != newSl) {
        print_log({ id: sg.id, uid: us.user_id, usid: us.id, chid: sg.channel_id, msg: `Trailstop triggered. Old SL: ${us.sl}, New SL: ${newSl}`, pool });
        await updateSl(borsa, us, sg, api, bysym, newSl, api_exchange);
        us.sl = newSl; // Update local copy
        // await bildirim_ekle(...) for trail stop
    }

    return us;
}


async function handleBreakEven(borsa, us, sg, api, bysym, api_exchange) {
    if (!api.break_even_level || us.close > 0) return us;
    
    const breakEvenIdx = parseInt(api.break_even_level);
    if (sg.tp_hit >= breakEvenIdx && us.sl < us.open) {
        const newSl = us.open;
        print_log({ id: sg.id, uid: us.user_id, usid: us.id, chid: sg.channel_id, msg: `Breakeven triggered. New SL: ${newSl}`, pool });
        await updateSl(borsa, us, sg, api, bysym, newSl, api_exchange);
        us.sl = newSl; // Update local copy
        // await bildirim_ekle(...) for break even
    }

    return us;
}


async function updateSl(borsa, us, sg, api, bysym, newSlPrice, api_exchange) {
     try {
        // Cancel existing SL order
        const openOrders = await borsa.open_orders(us.symbol);
        for (const order of openOrders) {
            if (order.orderId === us.sticket || order.type.includes('STOP')) {
                 await borsa.order_delete(us.symbol, order.orderId);
                 print_log({ id: sg.id, uid: us.user_id, usid: us.id, chid: sg.channel_id, msg: `Cancelled existing SL order ${order.orderId} for update.`, pool });
            }
        }
    } catch(e) {
        print_log({ id: sg.id, uid: us.user_id, usid: us.id, chid: sg.channel_id, msg: `Could not cancel SL for update: ${e.message}`, pool });
    }

    // Place new SL order
    const updatedUserSignal = { ...us, sl: newSlPrice };
    await placeSlOrder(borsa, updatedUserSignal, sg, api, bysym, api_exchange);
    await pool.query('UPDATE user_signals SET sl=? WHERE id=?', [newSlPrice, us.id]);
}


async function closePosition(borsa, us, sg, api, closePrice, event, api_exchange, bysym) {
    try {
        // First, cancel all open orders for the symbol
        const openOrders = await borsa.open_orders(us.symbol);
        for (const order of openOrders) {
            await borsa.order_delete(us.symbol, order.orderId);
        }

        // Then, close the position with a market order
        const side = sg.direction === 'LONG' ? 'SELL' : 'BUY';
        const volume = parseFloat(us.volume);
        const closeOrder = await borsa.order_send(us.symbol, side, 'MARKET', volume, 0, 1); // reduceOnly

        const openPrice = parseFloat(us.open);
        let profit = 0;
        if (sg.direction === 'LONG') {
            profit = (closePrice - openPrice) * volume;
        } else {
            profit = (openPrice - closePrice) * volume;
        }

        await pool.query('UPDATE user_signals SET close=?, closetime=NOW(), closed_volume=?, profit=?, status=2, event=? WHERE id=?', [closePrice, volume, profit, event, us.id]);
        
        print_log({ id: sg.id, uid: us.user_id, usid: us.id, chid: sg.channel_id, msg: `Position closed. Event: ${event}. Profit: ${profit}`, pool });
        // Add notification logic here for close
        
        let closedUs = { ...us, close: closePrice, profit: profit, status: 2 };
        return closedUs;

    } catch (error) {
        const errorMsg = `Failed to close position: ${error.message}`;
        print_log({ id: sg.id, uid: us.user_id, usid: us.id, chid: sg.channel_id, msg: errorMsg, pool });
        await pool.query("UPDATE user_signals SET status=3, event=CONCAT(event, ? ) WHERE id=?", [`; CLOSE FAILED: ${errorMsg}`, us.id]);
        return us; // return original so loop can retry or fail
    }
}

async function handleLimitTpNotifications(us, sg, api, api_exchange) {
    // Kullanıcının belirlediği limit TP değerleri varsa signals tablosundan tp_hit değeri gelince kullanıcıya TP ye ulaştı bildirimi atsın
    if (sg.tp_hit && sg.tp_hit > 0) {
        const tpLevel = sg.tp_hit;
        const tpPrice = sg[`tp${tpLevel}`];
        if (tpPrice) {
            const notifyMsg = `🎯 **TP${tpLevel} HIT** 🎯\n\n` +
                `**Symbol:** ${us.symbol}\n` +
                `**Direction:** ${sg.direction}\n` +
                `**API:** ${api.api_name}\n` +
                `**Exchange:** ${api_exchange}\n` +
                `**TP${tpLevel} Price:** ${tpPrice}\n\n` +
                `Take profit level ${tpLevel} has been reached!`;
            
            await bildirim_ekle(us.user_id, notifyMsg);
            print_log({ id: sg.id, uid: us.user_id, usid: us.id, chid: sg.channel_id, msg: `TP${tpLevel} notification sent to user`, pool });
        }
    }
    return us;
}

async function handleSignalSlLogic(borsa, us, sg, api, bysym, currentPrice, api_exchange) {
    // Kullanıcı sinyal SL kullanıyorsa sl_hit = 1 olduğunda kullanıcının sinyali de stop olsun. 
    // Kullanıcı sinyal SL kullanmıyorsa market fiyatı kendi belirlediği sl fiyatına değince sinyali stop olsun.
    
    if (sg.sl_hit === 1) {
        // Sinyal SL tetiklendi, pozisyonu kapat
        print_log({ id: sg.id, uid: us.user_id, usid: us.id, chid: sg.channel_id, msg: `Signal SL hit, closing position`, pool });
        return await closePosition(borsa, us, sg, api, currentPrice, "Signal SL Hit", api_exchange, bysym);
    }
    
    // Kullanıcı sinyal SL kullanmıyorsa, market fiyatı ile SL kontrolü
    if (us.sl > 0 && !sg.use_signal_sl) {
        const slPrice = parseFloat(us.sl);
        let shouldClose = false;
        
        if (sg.direction === 'LONG' && currentPrice <= slPrice) {
            shouldClose = true;
        } else if (sg.direction === 'SHORT' && currentPrice >= slPrice) {
            shouldClose = true;
        }
        
        if (shouldClose) {
            print_log({ id: sg.id, uid: us.user_id, usid: us.id, chid: sg.channel_id, msg: `Market price SL triggered. Price: ${currentPrice}, SL: ${slPrice}`, pool });
            return await closePosition(borsa, us, sg, api, currentPrice, "Market Price SL", api_exchange, bysym);
        }
    }
    
    return us;
}


export { checkSignalTimeout, openPrimaryOrder, placeSlOrder, placeTpOrder, placeLimitTpOrders, monitorPosition, handleTrailStop, handleBreakEven, handleLimitTpNotifications, handleSignalSlLogic };
