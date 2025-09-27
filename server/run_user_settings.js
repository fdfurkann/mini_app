import { print_log } from './print_log.js';
import pool from './db.js';
import { getExchangeName } from './run_user_exchange.js';

async function setMarginAndLeverage(borsa, api, us, sg, s_id, user_id, us_id, ch_id) {
    if (us.ticket) {
        return true; // Settings already applied
    }

    const symbol = us.symbol;
    const api_exchange = getExchangeName(api.api_type);

    try {
        // Set Margin Type
        let marginType = api.margin_type;
        if (!marginType || (marginType !== "ISOLATED" && marginType !== "CROSSED")) {
            marginType = "CROSSED";
        }
        const margin_sonuc = await borsa.api_set_margin_type(symbol, marginType);
        print_log({ id: s_id, uid: user_id, usid: us_id, chid: ch_id, msg: `Margin mode set: ${JSON.stringify(margin_sonuc)}`, pool });

        // Set Leverage
        let user_leverage = api.leverage;
        const leverages = await borsa.get_leverage(symbol);

        if (api_exchange === "binance") {
            // Binance specific leverage adjustment logic
             if (Array.isArray(leverages)) {
                const leverageInfo = leverages.find(l => l.symbol === symbol);
                if (leverageInfo) {
                    let prev_not = 0;
                    for (const bracket of leverageInfo.brackets) {
                         if (bracket.notionalCap > api.lotsize && prev_not <= api.lotsize && user_leverage > bracket.initialLeverage) {
                            user_leverage = bracket.initialLeverage;
                        }
                        prev_not = bracket.notionalCap;
                    }
                }
            }
        } else if (api_exchange === "bingx") {
            // BingX specific leverage adjustment logic
             if (leverages && leverages.data) {
                const maxLeverage = sg.direction === "LONG" ? leverages.data.maxLongLeverage : leverages.data.maxShortLeverage;
                if (user_leverage > maxLeverage) {
                    user_leverage = maxLeverage;
                }
            }
        } else { // bybit
            // Bybit specific leverage adjustment logic
             if (Array.isArray(leverages)) {
                const leverageInfo = leverages.find(l => l.symbol === symbol);
                if (leverageInfo && user_leverage > leverageInfo.leverageFilter.maxLeverage) {
                    user_leverage = leverageInfo.leverageFilter.maxLeverage;
                }
            }
        }

        const level_status = await borsa.api_set_leverage(symbol, user_leverage);
        print_log({ id: s_id, uid: user_id, usid: us_id, chid: ch_id, msg: `Leverage status: ${JSON.stringify(level_status)}`, pool });
        
        return true;

    } catch (error) {
        const errorMsg = `Error setting margin/leverage: ${error.message}`;
        print_log({ id: s_id, uid: user_id, usid: us_id, chid: ch_id, msg: errorMsg, pool });
        await pool.query("UPDATE user_signals SET status = 3, event = ? WHERE id = ?", [errorMsg, us_id]);
        return false;
    }
}

export { setMarginAndLeverage };
