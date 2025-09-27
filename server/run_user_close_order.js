import pool from './db.js';
import { print_log } from './print_log.js';
import { bildirim_ekle } from './utils.js';

async function close_order(binance, us) {
    let sg;
    let user_id;
    let chid; 

    try {
        let [sg_rows] = await pool.query("SELECT * FROM signals WHERE id = ?", [us.signal_id]);
        sg = sg_rows[0];

        if (!sg) {
            print_log({ usid: us.id, msg: `HATA: Sinyal (ID: ${us.signal_id}) bulunamadı. Kapatma işlemi yapılamıyor.`, pool });
            return;
        }

        let [api_rows] = await pool.query("SELECT * FROM `api_keys` WHERE id=?", [us.api_id]);
        const api = api_rows[0];
        
        user_id = us.user_id; 
        chid = api.bot_room;
        const s_id = us.signal_id;
        const us_id = us.id;

        // Düzeltilmiş Mantık: Sinyal yönü, mevcut pozisyon yönünün tersi ise kapat.
        if (sg.direction !== us.trend) {
            print_log({ id: s_id, uid: user_id, usid: us_id, chid, msg: `Ters sinyal (${sg.direction}) algılandı. Mevcut ${us.trend} pozisyonu kapatılıyor.`, pool });
            
            const symbol = us.symbol;
            const volume = us.volume;
            const side = us.trend === 'LONG' ? 'SELL' : 'BUY';

            print_log({ id: s_id, uid: user_id, usid: us_id, chid, msg: `Kapanış Emri Gönderiliyor: ${symbol} ${side} ${volume}`, pool });
            
            try {
                const close_ticket = await binance.order_send(symbol, side, "MARKET", volume, 0, 1);
                if (close_ticket && close_ticket['orderId']) {
                    const eventMsg = `Pozisyon ters sinyal (${sg.direction}) ile kapatıldı.`;
                    await pool.query("UPDATE user_signals SET close=1, cticket=?, event=?, closetime=NOW() WHERE id=?", [close_ticket['orderId'], eventMsg, us.id]);
                    
                    const bildirimMsg = `${symbol} ${us.trend} yönlü pozisyon, ters sinyal geldiği için kapatıldı.`;
                    await bildirim_ekle(user_id, bildirimMsg, 1);
                    print_log({ id: s_id, uid: user_id, usid: us_id, chid, msg: `Başarılı: ${bildirimMsg} Bilet: #${close_ticket['orderId']}`, pool });
                } else {
                    const errorMsg = `Kapanış emri gönderildi ancak orderId alınamadı. Yanıt: ${JSON.stringify(close_ticket)}`;
                    print_log({ id: s_id, uid: user_id, usid: us_id, chid, msg: `HATA: ${errorMsg}`, pool });
                    await bildirim_ekle(user_id, errorMsg, 0);
                    // Başarısız olsa bile pozisyonu DB'de kapalı olarak işaretle
                    await pool.query("UPDATE user_signals SET close=1, event=?, closetime=NOW() WHERE id=?", [`Borsadan bilet alınamadı: ${errorMsg}`, us.id]);
                }
            } catch (e) {
                const errorMsg = `Kapanış emri gönderilirken hata oluştu: ${e.message}`;
                print_log({ id: s_id, uid: user_id, usid: us_id, chid, msg: `HATA: ${errorMsg}`, pool });
                await bildirim_ekle(user_id, errorMsg, 0);
                // Hata durumunda bile pozisyonu DB'de kapalı olarak işaretle
                await pool.query("UPDATE user_signals SET close=1, event=?, closetime=NOW() WHERE id=?", [`Borsa Hatası: ${errorMsg}`, us.id]);
            }
        }
    } catch (e) {
        const errorMsg = `close_order içinde genel hata: ${e.message}`;
        print_log({ id: sg ? sg.id : us.signal_id, uid: user_id, usid: us.id, chid, msg: `HATA: ${errorMsg}`, pool });
    }
}

export { close_order }; 