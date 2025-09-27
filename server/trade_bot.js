import pool from './db.js';
import { run_signal } from './run_signal.js';
import TelegramBot from 'node-telegram-bot-api';
import { listenTelegramSignals } from './telegram_listen.js';
import dotenv from 'dotenv';
import { send_notifications } from './notification_sender.js';
import { run_user } from './run_user.js';
import { check_history } from './check_history.js';

dotenv.config();
const botToken = process.env.BOT_TOKEN;

let p_name = process.argv[2] || '';
/*
// trade_bot başlarken eski açık görünüp borsada olmayan pozisyonları kontrol et
(async () => {
    const [rows] = await pool.query("SELECT id FROM user_signals WHERE status<2 AND ticket != ''");
    for (const row of rows) {
        console.log('run_user çağrıldı ', row.id);
        run_user(row.id);
        await new Promise(resolve => setTimeout(resolve, 500)); // Her işlem arasına 500ms bekleme ekle
    }
})();
*/

let start_ed = {};

async function check_new_signals() {
    const [signals] = await pool.query("SELECT * FROM signals WHERE (status='pending' OR status='created' OR status='active')");
    for (const sg of signals) {
        const id = sg.id;
        const symbol = sg.symbol;
        if (!start_ed[id]) {
            run_signal(id);
            start_ed[id] = true;
        }
    }
    setTimeout(check_new_signals, 500);
}

const telegramClient = (apiKey, options = {}) => {
    return new TelegramBot(apiKey, options);
};

let bot;
let apiBot;
if (botToken) {
    // Sadece bir yerde polling: true ile başlat
    bot = telegramClient(botToken, {
        polling: true,
        request: {
            agentOptions: {
                keepAlive: true,
                family: 4
            }
        }
    });
    bot.on('polling_error', (error) => {
        console.log('Polling error:', error.code);
        console.log('Error message:', error.message);
        setTimeout(() => {
            bot.startPolling();
        }, 30000);
    });
    listenTelegramSignals(bot);
    // Diğer işlemler için polling: false ile ayrı instance
    apiBot = telegramClient(botToken, {
        polling: false,
        request: {
            agentOptions: {
                keepAlive: true,
                family: 4
            }
        }
    });
}

async function main() {
    // Telegram bot başlat
    // Bildirim gönderici döngüsü
    console.log("send_notifications() başlatıldı");
    setInterval(() => send_notifications(bot, pool), 500);
 
    console.log("check_new_signals() başlatıldı");
    check_new_signals();
    // check_history başlat
    console.log("check_history() başlatıldı");
    
    //check_history();
    /*
    setInterval(() => {
        console.log("check_history() tekrar çağrıldı");
        check_history();
    }, 5 * 60 * 1000);
     */
}

main().catch(err => {
    console.error('trade_bot.js hata:', err);
    process.exit(1);
}); 