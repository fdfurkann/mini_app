import { rbinance } from './exchanges/binance_rest.js';
import { rbingx } from './exchanges/bingx_rest.js';
import { rbybit } from './exchanges/bybit_rest.js';
import { print_log } from './print_log.js';
import pool from './db.js';

function getExchangeName(api_type) {
    switch (api_type) {
        case 1: return 'binance';
        case 2: return 'bybit';
        case 3: return 'bingx';
        default: return null;
    }
}

async function createExchange(api, s_id, user_id, us_id, ch_id) {
    const api_exchange = getExchangeName(api.api_type);
    if (!api_exchange) {
        const errorMsg = `Unsupported exchange type: ${api.api_type}`;
        print_log({ id: s_id, uid: user_id, usid: us_id, chid: ch_id, msg: errorMsg, pool });
        await pool.query("UPDATE user_signals SET status = 3, event = ? WHERE id = ?", [errorMsg, us_id]);
        return null;
    }

    const { api_key, api_secret } = api;
    let borsa;
    if (api_exchange === "binance") {
        borsa = new rbinance(api_key, api_secret);
    } else if (api_exchange === "bingx") {
        borsa = new rbingx(api_key, api_secret);
    } else { // bybit
        borsa = new rbybit(api_key, api_secret);
    }
    print_log({ id: s_id, uid: user_id, usid: us_id, chid: ch_id, msg: `run_user: ${api_exchange} exchange object created`, pool });
    return borsa;
}

async function getSymbolInfo(borsa, api_exchange, symbol, s_id, user_id, us_id, ch_id) {
    const bysym = {};
    try {
        const exchanges = await borsa.get_exchange();

        if (api_exchange === "binance") {
            const symbolInfo = exchanges['symbols'].find(s => s.symbol === symbol);
            if (symbolInfo) {
                const priceFilter = symbolInfo.filters.find(f => f.filterType === 'PRICE_FILTER');
                const lotSizeFilter = symbolInfo.filters.find(f => f.filterType === 'LOT_SIZE');
                bysym.digits = (priceFilter.minPrice.split('.')[1] || '').length;
                bysym.vdigits = (lotSizeFilter.stepSize.split('.')[1] || '').length;
                bysym.tickSize = parseFloat(priceFilter.tickSize);
                bysym.stepSize = parseFloat(lotSizeFilter.stepSize);
            }
        } else if (api_exchange === "bingx") {
            const symbolInfo = exchanges.data.find(b => b.symbol.replace("-", "") === symbol);
            if(symbolInfo){
                bysym.vdigits = symbolInfo.quantityPrecision;
                bysym.digits = symbolInfo.pricePrecision;
                // BingX does not provide tickSize and stepSize directly, needs to be calculated or fetched differently if required.
                bysym.tickSize = Math.pow(10, -symbolInfo.pricePrecision);
                bysym.stepSize = Math.pow(10, -symbolInfo.quantityPrecision);
            }
        } else { // bybit
            const symbolInfo = exchanges.find(s => s.symbol === symbol);
            if(symbolInfo){
                bysym.vdigits = (symbolInfo.lotSizeFilter.minTradingQty.split('.')[1] || '').length;
                bysym.digits = (symbolInfo.priceFilter.tickSize.split('.')[1] || '').length;
                bysym.tickSize = parseFloat(symbolInfo.priceFilter.tickSize);
                bysym.stepSize = parseFloat(symbolInfo.lotSizeFilter.qtyStep);
            }
        }

        if (bysym.digits === undefined || bysym.vdigits === undefined) {
            let [rateRows] = await pool.query('SELECT digits, vdigits, tickSize, stepSize FROM rates WHERE symbol = ? ORDER BY id DESC LIMIT 1', [symbol]);
            if (rateRows.length > 0) {
                if (bysym.digits === undefined) bysym.digits = rateRows[0].digits;
                if (bysym.vdigits === undefined) bysym.vdigits = rateRows[0].vdigits;
                if (bysym.tickSize === undefined) bysym.tickSize = rateRows[0].tickSize;
                if (bysym.stepSize === undefined) bysym.stepSize = rateRows[0].stepSize;
            } else {
                 throw new Error(`Symbol info not found in rates table for ${symbol}`);
            }
        }
        print_log({ id: s_id, uid: user_id, usid: us_id, chid: ch_id, msg: `Symbol details ${symbol}: digits=${bysym.digits}, vdigits=${bysym.vdigits}, tickSize=${bysym.tickSize}, stepSize=${bysym.stepSize}`, pool });
        return bysym;
    } catch (error) {
        print_log({ id: s_id, uid: user_id, usid: us_id, chid: ch_id, msg: `Failed to get symbol info for ${symbol}: ${error.message}`, pool });
        return null;
    }
}

export { createExchange, getSymbolInfo, getExchangeName };
