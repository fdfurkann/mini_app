import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import path from 'path';
import { createCanvas, loadImage, registerFont } from 'canvas';
import { print_log } from './print_log.js';
import { formatPriceTickSize } from './utils.js';
import svg2img from 'svg2img';
import phttp from './phttp.js';
let fetch;
try {
  fetch = global.fetch || require('node-fetch');
} catch (e) {
  fetch = require('node-fetch');
}
// Anton font dosyasını kaydet ve kaydettiğimiz fontu global olarak register et
const antonFontPath = path.join(process.cwd(), 'server', 'fonts', 'Anton-Regular.ttf');
if (fs.existsSync(antonFontPath)) {
    try {
        registerFont(antonFontPath, { family: 'Anton' });
    } catch (_) { /* font birden fazla kez register edilmeye çalışılırsa yoksay */ }
}

// Rate limit haritaları
const userSendTimestamps = new Map();
const channelSendTimestamps = new Map();

function canSendToTarget(targetId, map, limit, intervalMs) {
    print_log({ call_func: { functionName: 'canSendToTarget', params: [targetId, map, limit, intervalMs] } });
  const now = Date.now();
  if (!map.has(targetId)) map.set(targetId, []);
  const timestamps = map.get(targetId).filter(ts => now - ts < intervalMs);
  if (timestamps.length >= limit) return false;
  timestamps.push(now);
  map.set(targetId, timestamps);
  return true;
}



// Gerçek PNL görseli oluşturucu
async function generatePnlImage(notification, envConfig = {}) {
  try {
      const imagePath = path.join(process.cwd(), 'server', 'pnl_image.png');
      if (!fs.existsSync(imagePath)) {
          print_log({ msg: `PNL şablon dosyası bulunamadı: ${imagePath}`, status: 'error' });
          return null;
      }
      const baseImage = await loadImage(imagePath);
      const width = baseImage.width * 2;
      const height = baseImage.height * 2;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(baseImage, 0, 0, width, height);
      const pistachioGreen = '#39FF14';
      const marginLeft = width * 0.1;
      const trendY = height * 0.30;
      const profitY = height * 0.45;
      ctx.font = 'bold 155px "Anton"';
      ctx.fillStyle = notification.trend === 'LONG' ? '#39FF14' : '#FF1744';
      ctx.textBaseline = 'top';
      ctx.fillText(notification.trend, marginLeft, trendY);
      const trendWidth = ctx.measureText(notification.trend).width;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(notification.symbol, marginLeft + trendWidth + 40, trendY);
      ctx.font = 'bold 170px "Anton"';
      ctx.fillStyle = pistachioGreen;
      const profitText = `+%${parseFloat(notification.profit).toFixed(3)}`;
      ctx.fillText(profitText, marginLeft, profitY);
      const iconSize = width * 0.06;
      const iconY = profitY + 450;
      const iconX = marginLeft-20;
      // Kanal ikonunu ve linkini düzgün işle
      let channelIconPath = null;
      if (notification.channel_img) {
          let cleanedPath = notification.channel_img.trim();
          if (cleanedPath && cleanedPath.startsWith('/')) cleanedPath = cleanedPath.slice(1);
          if (cleanedPath) {
            const possiblePath = path.join(process.cwd(), cleanedPath);
            if (fs.existsSync(possiblePath)) {
                channelIconPath = possiblePath;
            } else {
                print_log({ msg: `Kanal resmi bulunamadı: ${possiblePath}`, status: 'warn' });
            }
          }
      }
      if (!channelIconPath) {
          channelIconPath = path.join(process.cwd(), 'server', 'channel_icon.png');
      }
      if (fs.existsSync(channelIconPath)) {
          const channelIcon = await loadImage(channelIconPath);
          ctx.save();
          ctx.beginPath();
          ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(channelIcon, iconX, iconY, iconSize, iconSize);
          ctx.restore();
      }
      // Kanal linkini düzgün oluştur
      function getTelegramLink(rawLink) {
          if (!rawLink || rawLink.trim() === '') return 'https://t.me/OrcaTradeBot';
          const link = rawLink.trim();
          if (link.startsWith('https://t.me')) return link;
          if (link.startsWith('@')) return 'https://t.me/' + link.slice(1);
          return 'https://t.me/' + link;
      }
      const channelUrl = notification.pnl_msg;
      ctx.font = 'bold 90px "Anton"';
      ctx.fillStyle = '#FFFFFF';
      ctx.textBaseline = 'middle';
      ctx.fillText(channelUrl, iconX + iconSize + 40, iconY + iconSize / 2);
      const generatedImageName = `${notification.id}_${Date.now()}.png`;
      const pnlDir = path.join(process.cwd(), 'public', 'pnl');
      if (!fs.existsSync(pnlDir)) {
          fs.mkdirSync(pnlDir, { recursive: true });
      }
      const outputPath = path.join(pnlDir, generatedImageName);
      const out = fs.createWriteStream(outputPath);
      const stream = canvas.createPNGStream();
      await new Promise((resolve, reject) => {
          stream.pipe(out);
          out.on('finish', resolve);
          out.on('error', reject);
      });

      return outputPath;
  } catch (error) {
      print_log({ msg: `PNL resmi oluşturulurken hata: ${error.message}`, status: 'error' });
      return null;
  }
}



async function generateUserPnlImage(notification, tpLevel = '') {
    try {
        const imagePath = path.join(process.cwd(), 'server', 'pnl_image.png');
        if (!fs.existsSync(imagePath)) {
            print_log({ msg: `PNL şablon dosyası bulunamadı: ${imagePath}`, status: 'error' });
            return null;
        }
        const baseImage = await loadImage(imagePath);
        const width = baseImage.width * 2;
        const height = baseImage.height * 2;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(baseImage, 0, 0, width, height);

        const marginLeft = width * 0.1;
        const trendY = height * 0.30;

        ctx.font = 'bold 155px "Anton"';
        ctx.fillStyle = notification.trend === 'LONG' ? '#39FF14' : '#FF1744';
        ctx.textBaseline = 'top';
        ctx.fillText(notification.trend, marginLeft, trendY);

        const trendWidth = ctx.measureText(notification.trend).width;
        ctx.fillStyle = '#FFFFFF'; // Reverted color for symbol
        ctx.fillText(notification.symbol, marginLeft + trendWidth + 40, trendY);

        const profitY = height * 0.45;
        const goldColor = '#FFD700';

        // TP level
        if (tpLevel) {
            ctx.font = 'bold 120px "Anton"';
            ctx.fillStyle = goldColor;
            ctx.fillText(tpLevel, marginLeft, profitY);
        }

        // Profit percentage - FIX for NaN
        ctx.font = 'bold 170px "Anton"';
        const profitValue = parseFloat(notification.profit);
        let profitText;

        if (isNaN(profitValue)) {
            profitText = 'N/A';
            print_log({ msg: `PNL resmi için geçersiz kar değeri: ${notification.profit}`, status: 'error', chid: notification.user_id });
            ctx.fillStyle = '#FFD700'; // Yellow for N/A
        } else {
            const isProfit = profitValue >= 0;
            ctx.fillStyle = isProfit ? '#39FF14' : '#FF1744'; // Green for profit, red for loss
            profitText = `${isProfit ? '+' : ''}${profitValue.toFixed(2)}%`;
        }
        
        ctx.fillText(profitText, marginLeft, profitY + 150); // Adjusted Y position

        const iconSize = width * 0.06 * 1.4; // %40 büyüt
        const iconY = profitY + 450;
        const iconX = marginLeft-20;
        let channelIcon = null;
        if (notification.channel_img) {
            let imgUrl = notification.channel_img.trim();
            if (imgUrl.startsWith('http')) {
                if (imgUrl.endsWith('.svg')) {
                    const svgBuffer = await phttp.request(imgUrl).then(r => Buffer.from(r.body));
                    await new Promise((resolve, reject) => {
                        svg2img(svgBuffer, { width: iconSize, height: iconSize }, async (error, buffer) => {
                            if (error) return reject(error);
                            channelIcon = await loadImage(buffer);
                            resolve();
                        });
                    });
                } else {
                    channelIcon = await loadImage(imgUrl);
                }
            } else {
                let cleanedPath = imgUrl;
                if (cleanedPath.startsWith('/')) cleanedPath = cleanedPath.slice(1);
                const possiblePath = path.join(process.cwd(), cleanedPath);
                if (fs.existsSync(possiblePath)) {
                    channelIcon = await loadImage(possiblePath);
                }
            }
        }
        if (!channelIcon && notification.channel_img) {
            print_log({ msg: `Kullanıcı resmi yüklenemedi: ${notification.channel_img}`, status: 'error' });
        }
        if (!channelIcon) {
            const channelIconPath = path.join(process.cwd(), 'server', 'channel_icon.png');
            if (fs.existsSync(channelIconPath)) {
                channelIcon = await loadImage(channelIconPath);
            }
        }
        if (channelIcon) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(channelIcon, iconX, iconY, iconSize, iconSize);
            ctx.restore();
        }
        // Profil resmi çizimini kaldır
        // Kullanıcı adı
        ctx.font = 'bold 112px "Anton"'; // %40 büyütme
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'middle';
        ctx.fillText(`@${notification.channel_name || ''}`, iconX + iconSize + 40, iconY + iconSize / 2);
        const generatedImageName = `${notification.id}_${Date.now()}.png`;
        const pnlDir = path.join(process.cwd(), 'public', 'pnl');
        if (!fs.existsSync(pnlDir)) {
            fs.mkdirSync(pnlDir, { recursive: true });
        }
        const outputPath = path.join(pnlDir, generatedImageName);
        const out = fs.createWriteStream(outputPath);
        const stream = canvas.createPNGStream();
        await new Promise((resolve, reject) => {
            stream.pipe(out);
            out.on('finish', resolve);
            out.on('error', reject);
        });
        if (!fs.existsSync(outputPath)) {
            print_log({ msg: `PNL görseli oluşturulamadı: ${outputPath}`, status: 'error' });
            return null;
        }
        return outputPath;
    } catch (error) {
        print_log({ msg: `Kullanıcı PNL resmi oluşturulurken hata: ${error.message}`, status: 'error' });
        return null;
    }
}

async function generateChannelPnlImage(notification) {
    // Mevcut generatePnlImage fonksiyonunun içeriğini buraya taşıyabilirsin, kanal için özel alanlar ekleyebilirsin.
}

// Fiyatı tickSize hassasiyetine göre yuvarlama fonksiyonu
// KALDIRILDI: Artık utils.js üzerinden import edilecek

export async function send_user_notifications(bot, pool) {
  try {
    const [userNotifs] = await pool.query('SELECT * FROM bildirimler WHERE gonderim = 0 ORDER BY id ASC LIMIT 1');
    if (!userNotifs.length) return;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    for (const notif of userNotifs) {
      if (!canSendToTarget(notif.user_id, userSendTimestamps, 20, 60 * 1000)) {
        await new Promise(res => setTimeout(res, 3000));
        break;
      }
      try {
        await pool.query('UPDATE bildirimler SET gonderim = ? WHERE id = ?', [currentTimestamp, notif.id]);
        // TP bildirimi ise görsel üret ve gönder
        if (/TP\d+ HİT|TP\d+ HIT|TP\d+ HEDEF ALINDI|TP\d+ TARGET HIT|TP\d+/i.test(notif.msg)) {
          // Kullanıcı bilgilerini users tablosundan al
          let username = '';
          let user_photo = '';
          try {
            const [userRows] = await pool.query('SELECT username, photo FROM users WHERE id = ?', [notif.user_id]);
            if (userRows && userRows.length > 0) {
              username = userRows[0].username || '';
              user_photo = userRows[0].photo || '';
            }
          } catch (e) { /* ignore */ }
          // TP mesajından symbol, trend, profit, tpLevel parse et
          let symbol = '';
          let trend = '';
          let profit = '0'; // Default to 0 to avoid NaN
          let tpLevel = '';
          const symbolMatch = notif.msg.match(/\*\*(\w+)\s+(LONG|SHORT)/i);
          if (symbolMatch) {
            symbol = symbolMatch[1];
            trend = symbolMatch[2];
          }
          
          // FIX for profit parsing
          const profitMatch = notif.msg.match(/Profit:.*?([+\-\d\.]+)%\)/i); // Looks for "Profit: ... (+0.36%)"
          if (profitMatch && profitMatch[1]) {
            profit = profitMatch[1];
          } else {
            // Fallback for simpler "Profit: %3.02" or "Profit: 3.02" formats
            const altProfitMatch = notif.msg.match(/Profit:\s*%?([+\-\d\.]+)/i);
            if (altProfitMatch && altProfitMatch[1]) {
              profit = altProfitMatch[1];
            }
          }

          const tpMatch = notif.msg.match(/TP(\d+)/i);
          if (tpMatch) {
            tpLevel = `TP${tpMatch[1]} HIT`;
          }
          // Eğer username veya user_photo hala yoksa Telegram'dan çekmeye çalış
          if ((!username || !user_photo) && bot.getChat) {
            try {
              const userInfo = await bot.getChat(notif.user_id);
              if (userInfo) {
                if (!username && userInfo.username) username = userInfo.username;
                if (!user_photo && userInfo.photo && userInfo.photo.big_file_id) {
                  const file = await bot.getFile(userInfo.photo.big_file_id);
                  if (file && file.file_path) user_photo = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
                }
              }
            } catch (e) { /* ignore */ }
          }
          // PNL görseli için notification objesi hazırla
          const pnlNotification = { ...notif, channel_name: username, channel_img: user_photo, symbol, trend, profit };
          const imagePath = await generateUserPnlImage(pnlNotification, tpLevel);
          if (imagePath && fs.existsSync(imagePath)) {
            await bot.sendPhoto(notif.user_id, fs.readFileSync(imagePath), { caption: notif.msg });
            fs.unlinkSync(imagePath);
            print_log({ chid: notif.user_id, id: notif.id, msg: `[user_notification_sent_with_pnl] user_id=${notif.user_id}, notification_id=${notif.id}` });
            await new Promise(res => setTimeout(res, 1000));
            continue;
          }
        }
        // Diğer bildirimler için eski davranış
        await bot.sendMessage(notif.user_id, notif.msg);
        print_log({ chid: notif.user_id, id: notif.id, msg: `[user_notification_sent] user_id=${notif.user_id}, notification_id=${notif.id}` });
        await new Promise(res => setTimeout(res, 1000));
      } catch (err) {
        await pool.query('UPDATE bildirimler SET gonderim = -1, error_message = ? WHERE id = ?', [err.message.substring(0,255), notif.id]);
        print_log({ chid: notif.user_id, id: notif.id, msg: `[user_notification_error] user_id=${notif.user_id}, notification_id=${notif.id}, error=${err.message}` });
      }
    }
  } catch (err) {
    print_log({ msg: `[user_notifications_general_error] ${err.message}` });
  }
}

export async function send_channel_notifications(bot, pool) {
  try {
    const [chNotifs] = await pool.query('SELECT * FROM bildirimler_ch WHERE gonderim = 0 ORDER BY id ASC LIMIT 1');
    if (!chNotifs.length) return;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    for (const notif of chNotifs) {
      if (!canSendToTarget(notif.channel_id, channelSendTimestamps, 20, 60 * 1000)) {
        await new Promise(res => setTimeout(res, 3000));
        break;
      }
      // Bildirim tekrar kontrolü
      const [dupCheck] = await pool.query('SELECT COUNT(*) as cnt FROM bildirimler_ch WHERE post_id = ? AND symbol = ? AND cmd = ? AND msg = ? AND gonderim > 0', [notif.post_id, notif.symbol, notif.cmd, notif.msg]);
      if (dupCheck && dupCheck[0] && dupCheck[0].cnt > 0) {
        print_log({ chid: notif.channel_id, id: notif.id, msg: `[duplicate_notification_skipped] post_id=${notif.post_id}, symbol=${notif.symbol}, cmd=${notif.cmd}` });
        await pool.query('UPDATE bildirimler_ch SET gonderim = -1, error_message = ? WHERE id = ?', ['Duplicate notification skipped', notif.id]);
        continue;
      }
      await pool.query('UPDATE bildirimler_ch SET gonderim = ? WHERE id = ?', [currentTimestamp, notif.id]);
      let orj_channelId = notif.channel_id.toString();
      let channelId = notif.channel_id.toString();
      if (!channelId.startsWith('-100')) {
        channelId = '-100' + channelId.replace(/^-?100/, '');
      }
      let finalTelegramChannelId = parseInt(channelId);
      const cmd = notif.cmd || '';
      let replyOptions = {};
      if (!/tp/i.test(cmd)) {
        const keyboardButtons = [
          { text: 'OrcaTradeBot', url: 'https://t.me/OrcaTrade_Bot' },
          { text: 'Support', url: 'https://t.me/OrcaTradebot_Destek' }
        ];
        replyOptions.reply_markup = { inline_keyboard: [keyboardButtons] };
      }
      const tpLevel = cmd.startsWith('TP') ? parseInt(cmd.replace('TP', '')) : 0;
      let imagePath = null;
      if (tpLevel >= 1) {
        // bot_rooms'tan kanal görseli ve linkini al
        let channelExtra = {};
        try {
          const cleanId = Math.abs(parseInt(orj_channelId));
          const [roomRows] = await pool.query('SELECT channel_img, telegram_link,pnl_msg FROM bot_rooms WHERE room_id = ? LIMIT 1', [cleanId]);
       
          if (roomRows && roomRows.length > 0) {
            if (roomRows[0].channel_img) channelExtra.channel_img = roomRows[0].channel_img;
            if (roomRows[0].pnl_msg) channelExtra.pnl_msg = roomRows[0].pnl_msg;
          }
        } catch (e) { console.log('[bot_rooms_query_error]', e.message); }
       
        const pnlNotification = { ...notif, ...channelExtra };
      
        imagePath = await generatePnlImage(pnlNotification, {});
      }
      // --- ANA SİNYAL MESAJINI GÜNCELLE ---
      // TP veya SL veya OPEN bildirimi ise ana sinyal mesajını güncelle
      if ((/TP\d+|SL/i.test(cmd) || cmd === 'OPEN') && notif.post_id && notif.channel_id) {
        // signals tablosundan güncel verileri çek
        const [signalRows] = await pool.query('SELECT * FROM signals WHERE message_id = ? AND channel_id = ? LIMIT 1', [notif.post_id, notif.channel_id]);
        if (signalRows && signalRows.length > 0) {
          let signal = signalRows[0];
          // Eğer bildirim bir TP ise, signals.tablosundaki tp_hit değerini öne çek (güncelle)
          // Böylece ana sinyal mesajı düzenlendiğinde check işareti doğru gösterilir.
          try {
            const tpMatchForUpdate = (cmd || '').match(/^TP(\d+)$/i);
            if (tpMatchForUpdate && tpMatchForUpdate[1]) {
              const tpToSet = parseInt(tpMatchForUpdate[1], 10);
              if (tpToSet > 0) {
                // Güncelleme: mevcut tp_hit'ten daha büyükse veya null ise güncelle
                await pool.query('UPDATE signals SET tp_hit = GREATEST(IFNULL(tp_hit,0), ?) WHERE id = ? AND channel_id = ?', [tpToSet, signal.id, signal.channel_id]);
                // Yeniden çek ve signal objesini güncelle
                const [reloaded] = await pool.query('SELECT * FROM signals WHERE id = ? LIMIT 1', [signal.id]);
                if (reloaded && reloaded.length > 0) signal = reloaded[0];
              }
            }
          } catch (e) { print_log({ chid: notif.channel_id, id: notif.id, msg: `[update_tp_hit_error] ${e.message}` }); }
          let pricePrecision = 8;
          let tickSize = 0.000001;
          try {
            const [rateInfo] = await pool.query('SELECT digits, tickSize FROM rates WHERE symbol = ? ORDER BY id DESC LIMIT 1', [signal.symbol]);
            if (rateInfo && rateInfo.length > 0) {
              pricePrecision = rateInfo[0].digits;
              tickSize = parseFloat(rateInfo[0].tickSize || tickSize);
            }
          } catch (e) {}
          const trendIcon = signal.direction === 'LONG' ? '🟢' : '🔴';
          let messageText = `${trendIcon} ${signal.direction}\n`;
          messageText += `❇️ ${signal.symbol}\n`;
          messageText += `☣ Entry : ${formatPriceTickSize(signal.entry1, tickSize, pricePrecision)} - ${formatPriceTickSize(signal.entry2, tickSize, pricePrecision)}\n`;
          for (let i = 1; i <= 10; i++) {
            const tpKey = `tp${i}`;
            if (signal[tpKey] && signal[tpKey] > 0) {
              const check = (signal.tp_hit && signal.tp_hit >= i) ? ' ✅' : '';
              messageText += `☪ Target ${i} - ${formatPriceTickSize(signal[tpKey], tickSize, pricePrecision)}${check}\n`;
            }
          }
          const slCheck = (signal.sl_hit === 1) ? ' ❌' : '';
          messageText += `⛔️ Stop Loss : ${formatPriceTickSize(signal.stop_loss, tickSize, pricePrecision)}${slCheck}\n`;
          messageText += `\nThis is not investment advice.`;
          // Butonları ekle
          const keyboardButtons = [
            { text: 'OrcaTradeBot', url: 'https://t.me/OrcaTrade_Bot' },
            { text: 'Support', url: 'https://t.me/OrcaTradebot_Destek' }
          ];
          try {
            // Önce mevcut mesaj içeriğini kontrol et
            let canEdit = true;
            try {
              const currentMsgResp = await bot.getChat(finalTelegramChannelId); // orayı düzeltmek gerekebilir
            } catch (ignoreErr) {}
            // Basit önlem: messageText içeriği notif.msg ile aynıysa düzenleme yapma
            if (notif.msg && notif.msg.trim() === messageText.trim()) {
              canEdit = false;
            }
            if (canEdit) {
              await bot.editMessageText(messageText, {
                chat_id: finalTelegramChannelId,
                message_id: notif.post_id,
                reply_markup: { inline_keyboard: [keyboardButtons] }
              });
            } else {
              print_log({ chid: notif.channel_id, id: notif.id, msg: `[editMessageText_skipped] Mevcut mesaj ile yeni mesaj aynı, düzenleme yapılmadı.` });
            }
          } catch (e) {
            let errorDetail = e && e.stack ? e.stack : e;
            if (e && e.errors) errorDetail += '\nErrors: ' + JSON.stringify(e.errors);
            if (e && e.code) errorDetail += '\nCode: ' + e.code;
            if (e && e.response && e.response.body) errorDetail += '\nResponse: ' + JSON.stringify(e.response.body);
            if (e && e.name === 'AggregateError') {
              errorDetail += '\nAggregateError: Birden fazla hata oluştu. Telegram API veya bağlantı problemleri olabilir.';
            }
            print_log({ chid: notif.channel_id, id: notif.id, msg: `[editMessageText_error] ${errorDetail}` });
          }
        }
        // Eğer cmd OPEN ise yeni mesaj gönderme
        if (cmd === 'OPEN') continue;
      }
      

      let finalMsg = notif.msg;
      // TP bildirimi ise özel formatı uygula ve gönder
      if (/TP\d+ HİT|TP\d+ HIT|TP\d+ HEDEF ALINDI|TP\d+ TARGET HIT/i.test(finalMsg)) {
        // TP seviyesi
        const tpMatch = finalMsg.match(/TP(\d+)/i);
        const tpLevel = tpMatch ? parseInt(tpMatch[1]) : 1;
        // Sembol
        const symbolMatch = finalMsg.match(/\*\*(\w+)\s+(LONG|SHORT)/i);
        const symbol = symbolMatch ? symbolMatch[1] : '-';
        const direction = symbolMatch ? symbolMatch[2] : '-';
        // Open fiyatı
        const openMatch = finalMsg.match(/Entry Price: ([\d\.]+)/i);
        let open = openMatch ? openMatch[1] : '-';
        // TP fiyatı
        const tpPriceMatch = finalMsg.match(new RegExp(`TP${tpLevel} Price: ([\\d\.]+)`, 'i'));
        let tpPrice = tpPriceMatch ? tpPriceMatch[1] : '-';
        // Profit yüzdesi
        let profitPercent = '-';
        if (notif.profit && !isNaN(parseFloat(notif.profit))) {
          profitPercent = parseFloat(notif.profit).toFixed(2).toString();
        } else {
          // signals tablosundan kar yüzdesi çek
          const [signalRows] = await pool.query('SELECT profit FROM signals WHERE message_id = ? AND channel_id = ? LIMIT 1', [notif.post_id, notif.channel_id]);
          if (signalRows && signalRows.length > 0 && signalRows[0].profit && !isNaN(parseFloat(signalRows[0].profit))) {
            profitPercent = parseFloat(signalRows[0].profit).toFixed(2).toString();
          }
        }
        // Sayısal değerleri yuvarla
        if (!isNaN(parseFloat(open))) open = parseFloat(open).toFixed(4);
        if (!isNaN(parseFloat(tpPrice))) tpPrice = parseFloat(tpPrice).toFixed(7);
        // Yeni format
        finalMsg = `#${symbol} ${direction} Take-Profit ${tpLevel} ✅\nOpen: ${open}\nTarget ${tpLevel}: ${tpPrice}\nProfit: %${profitPercent}`;
      }
      if (notif.post_id) replyOptions.reply_to_message_id = notif.post_id;
      try {
        if (imagePath && fs.existsSync(imagePath)) {
          await bot.sendPhoto(finalTelegramChannelId, fs.readFileSync(imagePath), {
            caption: finalMsg,
            ...replyOptions
          });
          fs.unlinkSync(imagePath);
          print_log({ chid: notif.channel_id, id: notif.id, msg: `${notif.msg}` });
          await new Promise(res => setTimeout(res, 1000));
        } else {
          // cmd OPEN veya SL ise kanala mesaj gönderme
          if (cmd === 'OPEN' || cmd === 'SL') {
            continue;
          }
          // SL mesajı ise kanala yeni mesaj gönderme
          if (/Stop Loss triggered|STOP LOSS|Stop Loss|SL/i.test(finalMsg)) {
            continue;
          }
          await bot.sendMessage(finalTelegramChannelId, finalMsg, replyOptions);
          print_log({ chid: notif.channel_id, id: notif.id, msg: `${notif.msg}` });
          await new Promise(res => setTimeout(res, 1000));
        }
      } catch (err) {
        let errorDetail = err && err.stack ? err.stack : err;
        if (err && err.errors) errorDetail += '\nErrors: ' + JSON.stringify(err.errors);
        if (err && err.code) errorDetail += '\nCode: ' + err.code;
        if (err && err.response && err.response.body) errorDetail += '\nResponse: ' + JSON.stringify(err.response.body);
        if (err && err.name === 'AggregateError') {
          errorDetail += '\nAggregateError: Birden fazla hata oluştu. Telegram API veya bağlantı problemleri olabilir.';
        }
        await pool.query('UPDATE bildirimler_ch SET gonderim = -1, error_message = ? WHERE id = ?', [errorDetail.toString().substring(0,255), notif.id]);
        console.log(`[channel_notification_error] channel_id=${notif.channel_id}, notification_id=${notif.id}, error=${errorDetail}`);
        // Telegram rate limit hatası için dinamik bekleme
        if (err.message && err.message.includes('ETELEGRAM: 429 Too Many Requests: retry after')) {
          const match = err.message.match(/retry after (\d+)/i);
          if (match && match[1]) {
            const retryAfter = parseInt(match[1], 10);
            if (retryAfter > 0) {
              await new Promise(res => setTimeout(res, retryAfter * 1000));
            }
          }
        }
      }
    }
  } catch (err) {
    console.log('[channel_notifications_general_error]', err.message);
  }
}

export async function send_notifications(bot, pool) {
  await send_user_notifications(bot, pool);
  await send_channel_notifications(bot, pool);
}