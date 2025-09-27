import TelegramBot from 'node-telegram-bot-api';
import pool from './db.js';
import { formatPriceTickSize } from './utils.js';

// Sinyal mesajını parse eden yardımcı fonksiyon
function parseSignalCommand(text) {

    const parts = text.trim().split(/\s+/);
    if (parts.length !== 7) return null;
    if (parts[0].toLowerCase() !== 'create_signal') return null;
    // Türkçe karakter içeren pariteleri filtrele
    const turkceKarakterRegex = /[İÇŞÜÖĞ]/i;
    if (turkceKarakterRegex.test(parts[1])) return null;
    const [_, symbol, trend, slPercent, entryRangePercent, tpCount, tpSpacingPercent] = parts;
    const trendNorm = trend.toUpperCase() === 'BUY' ? 'LONG' : trend.toUpperCase() === 'SELL' ? 'SHORT' : null;
    if (!trendNorm) return null;
    return {
        symbol: symbol.toUpperCase(),
        trend: trendNorm,
        slPercent: parseFloat(slPercent),
        entryRangePercent: parseFloat(entryRangePercent),
        tpCount: parseInt(tpCount),
        tpSpacingPercent: parseFloat(tpSpacingPercent)
    };
}

function listenTelegramSignals(bot) {
    console.log("listenTelegramSignals() başlatıldı");
    bot.on('channel_post', async (msg) => {
        let channel_id = msg.chat.id.toString().substr(4)
        const text = msg.text || msg.caption;
        if (!text) return;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
            const parsed = parseSignalCommand(line);
            if (!parsed) continue;
            // Fiyatı veritabanından çek
            const [rateRows] = await pool.query('SELECT price, digits, vdigits, tickSize FROM rates WHERE symbol = ? ORDER BY id DESC LIMIT 1', [parsed.symbol]);
            if (!rateRows.length) return;
            const price = parseFloat(rateRows[0].price);
            const digits = parseInt(rateRows[0].digits);
            const vdigits = parseInt(rateRows[0].vdigits);
            const tickSize = parseFloat(rateRows[0].tickSize);
            // Giriş, SL, TP hesapla
            const entryRangeHalf = parsed.entryRangePercent / 2;
            let entry1 = 'N/A', entry2 = 'N/A', stopLoss = 'N/A';
            const tps = {};
            if (price > 0 && tickSize > 0) {
                if (parsed.trend === 'LONG') {
                    entry1 = formatPriceTickSize(price * (1 - entryRangeHalf / 100), tickSize, digits);
                    entry2 = formatPriceTickSize(price * (1 + entryRangeHalf / 100), tickSize, digits);
                    stopLoss = formatPriceTickSize(entry1 * (1 - parsed.slPercent / 100), tickSize, digits);
                    for (let i = 1; i <= parsed.tpCount; i++) {
                        tps[`tp${i}`] = formatPriceTickSize(entry2 * (1 + (parsed.tpSpacingPercent * i) / 100), tickSize, digits);
                    }
                } else {
                    entry1 = formatPriceTickSize(price * (1 + entryRangeHalf / 100), tickSize, digits);
                    entry2 = formatPriceTickSize(price * (1 - entryRangeHalf / 100), tickSize, digits);
                    stopLoss = formatPriceTickSize(entry1 * (1 + parsed.slPercent / 100), tickSize, digits);
                    for (let i = 1; i <= parsed.tpCount; i++) {
                        tps[`tp${i}`] = formatPriceTickSize(entry2 * (1 - (parsed.tpSpacingPercent * i) / 100), tickSize, digits);
                    }
                }
            }
            // Sinyal formatı oluştur
            let signalMsg = `${parsed.trend === 'LONG' ? '🟢 LONG' : '🔴 SHORT'}\n`;
            signalMsg += `❇️ ${parsed.symbol}\n`;
            signalMsg += `☣ Entry : ${entry1} - ${entry2}\n`;
            for (let i = 1; i <= parsed.tpCount; i++) {
                if (tps[`tp${i}`] && tps[`tp${i}`] !== 'N/A' && tps[`tp${i}`] !== '0') {
                    signalMsg += `☪ Target ${i} - ${tps[`tp${i}`]}\n`;
                }
            }
            signalMsg += `⛔️ Stop Loss : ${stopLoss}\n`;
            signalMsg += `\nThis is not investment advice.`;
            // Mesajı düzenle
            try {
                await bot.editMessageText(signalMsg, {
                    chat_id: msg.chat.id,
                    message_id: msg.message_id
                });
                const now = new Date();
                const pad = n => n.toString().padStart(2, '0');
                const dateStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
                const oneLineMsg = signalMsg.replace(/\n/g, ' ');
                console.log(`${dateStr} listenTelegramSignals: Mesaj düzenlendi -> ${oneLineMsg}`);
            } catch (err) {
                console.log('listenTelegramSignals: Mesaj düzenlenemedi', err.message);
            }
            // signals tablosuna ekle
            await pool.query(
                `INSERT INTO signals (channel_id, message_id, symbol, direction, entry1, entry2, stop_loss, tp1, tp2, tp3, tp4, tp5, tp6, tp7, tp8, tp9, tp10, status, signal_hash, created_at, updated_at, profit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)`,
                [
                    channel_id,
                    msg.message_id,
                    parsed.symbol,
                    parsed.trend,
                    entry1,
                    entry2,
                    stopLoss,
                    tps.tp1 || null,
                    tps.tp2 || null,
                    tps.tp3 || null,
                    tps.tp4 || null,
                    tps.tp5 || null,
                    tps.tp6 || null,
                    tps.tp7 || null,
                    tps.tp8 || null,
                    tps.tp9 || null,
                    tps.tp10 || null,
                    'pending',
                    line.trim(),
                    0 // profit alanı
                ]
            );
        }
    });
}

export { listenTelegramSignals };
