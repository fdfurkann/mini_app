import pool from './db.js';
import { getExchangeInfo, fetchAndUpdateRates } from './live_rates.js';

const sym_info = await getExchangeInfo();
async function liveRatesLoop() {
    try {
        for (const symbol in sym_info) {
            const [check] = await pool.query(`SELECT * FROM rates WHERE symbol=?`, [symbol]);
            if (check.length === 0) {
                await pool.query(
                    `INSERT INTO rates (symbol, digits, vdigits, stepSize, tickSize) VALUES (?, ?, ?, ?, ?)`,
                    [
                        symbol,
                        sym_info[symbol].digits,
                        sym_info[symbol].vdigits,
                        sym_info[symbol].stepSize,
                        sym_info[symbol].tickSize
                    ]
                );
            } else {
                await pool.query(
                    `UPDATE rates SET digits=?, vdigits=?, stepSize=?, tickSize=? WHERE symbol=?`,
                    [
                        sym_info[symbol].digits,
                        sym_info[symbol].vdigits,
                        sym_info[symbol].stepSize,
                        sym_info[symbol].tickSize,
                        symbol
                    ]
                );
            }
        }
        await fetchAndUpdateRates(pool, sym_info);
    } catch (e) {
        console.log('liveRatesLoop error:', e);
    }
    // console.log("------------------------------------------------------");
    setTimeout(liveRatesLoop, 10000);
}

liveRatesLoop(); 