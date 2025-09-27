import pool from './db.js';
import { print_log } from './print_log.js';

async function refreshData(us_id, symbol, ch_id, user_id) {
    try {
        const [userSignalRows] = await pool.query("SELECT * FROM user_signals WHERE id = ?", [us_id]);
        const currentUserSignal = userSignalRows[0];

        if (!currentUserSignal) {
            print_log({ id: us_id, uid: user_id, usid: us_id, chid: ch_id, msg: `user_signals not found for id: ${us_id}`, pool });
            return null;
        }

        const [signalRows] = await pool.query("SELECT * FROM `signals` WHERE id=?", [currentUserSignal.signal_id]);
        const currentSignal = signalRows[0];

        const [apiRows] = await pool.query("SELECT * FROM `api_keys` WHERE id=?", [currentUserSignal.api_id]);
        const currentApi = apiRows[0];

        const [rateRows] = await pool.query("SELECT * FROM rates WHERE symbol=?", [symbol]);
        const currentRate = rateRows[0];

        if (!currentSignal || !currentApi || !currentRate) {
            print_log({ id: us_id, uid: user_id, usid: us_id, chid: ch_id, msg: `Missing critical data for signal loop. Signal: ${!!currentSignal}, API: ${!!currentApi}, Rate: ${!!currentRate}`, pool });
            return null;
        }

        return { currentUserSignal, currentSignal, currentApi, currentRate };

    } catch (error) {
        print_log({ id: us_id, uid: user_id, usid: us_id, chid: ch_id, msg: `Error refreshing data in signal loop: ${error.message}`, pool });
        return null;
    }
}

export { refreshData };
