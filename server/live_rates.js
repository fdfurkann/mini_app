import pool from './db.js';
import phttp from './phttp.js';

function to_datetime(time) {
    time = Math.round(parseFloat(time));
    const date = new Date(time * 1000);
    const pad = n => n < 10 ? '0' + n : n;
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

let sym_info = {};
let _exchangeInfoCacheTime = 0;
const EXCHANGEINFO_CACHE_MS = 60 * 1000; // 1 dakika

async function getExchangeInfo() {
    const now = Date.now();
    if ((now - _exchangeInfoCacheTime < EXCHANGEINFO_CACHE_MS)) {
        return sym_info;
    }
    try {
        const exch = await phttp.request('https://fapi.binance.com/fapi/v1/exchangeInfo');
        const exchange = exch.data;
        let new_info = {};
        for (const sym of exchange.symbols) {
            let stepSize = '';
            let tickSize = '';
            for (const filter of sym.filters) {
                if (filter.filterType === 'LOT_SIZE' || filter.filterType === 'MARKET_LOT_SIZE') {
                    stepSize = filter.stepSize;
                }
                if (filter.filterType === 'PRICE_FILTER') {
                    tickSize = filter.tickSize;
                }
            }
            new_info[sym.symbol] = {
                digits: sym.pricePrecision,
                vdigits: sym.quantityPrecision,
                stepSize,
                tickSize
            };
        }
        sym_info = new_info;
        _exchangeInfoCacheTime = now;
    } catch (ee) {
        console.log('digits error:', ee);
    }
    return sym_info;
}

async function fetchAndUpdateRates(conn,iprint=0) {
    try {
        const r = await phttp.request('https://fapi.binance.com/fapi/v1/ticker/price');
        const rates = r.data;
        for (const symbol of rates) {
            const [check] = await conn.query(`select * from rates where symbol='${symbol.symbol}'`);
            if (check.length === 0) {
                await getExchangeInfo();
                const query1 = `INSERT INTO rates (id, symbol, price, dates, digits, vdigits, stepSize, tickSize) VALUES (NULL, '${symbol.symbol}', '${symbol.price}', '${to_datetime(Math.round(Date.now() / 1000))}','${sym_info[symbol.symbol]?.digits}','${sym_info[symbol.symbol]?.vdigits}','${sym_info[symbol.symbol]?.stepSize}','${sym_info[symbol.symbol]?.tickSize}')`;
                await conn.query(query1);
                if (iprint==1) console.log(`${to_datetime(Math.round(Date.now() / 1000))} ${symbol.symbol} insert ${symbol.price}`);
            } else {
                // Sadece fiyat değiştiyse update et (digits kadar toFixed ile karşılaştır)
                const digits = sym_info[symbol.symbol]?.digits ?? 8;
                const oldPrice = Number(check[0].price).toFixed(digits);
                const newPrice = Number(symbol.price).toFixed(digits);
                if (oldPrice !== newPrice) {
                    const query2 = `update rates set digits= '${sym_info[symbol.symbol]?.digits}', vdigits= '${sym_info[symbol.symbol]?.vdigits}', price='${symbol.price}', dates='${to_datetime(Math.round(Date.now() / 1000))}', stepSize='${sym_info[symbol.symbol]?.stepSize}', tickSize='${sym_info[symbol.symbol]?.tickSize}' where symbol='${symbol.symbol}'`;
                    await conn.query(query2);
                    if (iprint==1) console.log(`${to_datetime(Math.round(Date.now() / 1000))} ${symbol.symbol} update ${symbol.price}`);
                }

            }
        }
    } catch (ee) {
        console.log('ticker error:', ee);
    }
}

// Ana döngü: saniyede bir fetchAndUpdateRates çağır
if (import.meta.url === `file://${process.argv[1]}`) {
    (async function loop() {
        let lastPrint = 0;
        await getExchangeInfo();
        while (true) {
            const start = Date.now();
            let iprint = 0;
            if (start - lastPrint > 60000*5) {
                iprint = 1;
                lastPrint = start;
            }
            await fetchAndUpdateRates(pool, iprint);
            const elapsed = Date.now() - start;
            const wait = Math.max(0, 1000 - elapsed);
            if (wait > 0) await new Promise(r => setTimeout(r, wait));
        }
    })();
}

export { getExchangeInfo, fetchAndUpdateRates, to_datetime, sym_info };

