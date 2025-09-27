import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import https from 'https';
import axios from 'axios';

// Axios için özel bir agent oluşturarak IPv4 kullanımını zorunlu kıl
const httpsAgent = new https.Agent({ family: 4 });

dotenv.config();

import pool from '../db.js';

const router = Router();

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Multer ayarları (resim yükleme için)
const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        // server/routes -> server -> uploads/channels
        cb(null, path.join(__dirname, '..', '..', 'uploads/channels'));
      },
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `channel_${Date.now()}${ext}`);
      }
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) cb(null, true);
      else cb(new Error('Sadece resim dosyası yükleyebilirsiniz!'));
    }
});

const BOT_TOKEN = process.env.BOT_TOKEN;
let botInstance = null;
if (BOT_TOKEN) {
  botInstance = new TelegramBot(BOT_TOKEN, { polling: false });
}

// Get all channels from bot_rooms with search and pagination
router.get('/channels', async (req, res) => {
    try {
      const query = `
        SELECT 
          br.id, 
          br.room_id, 
          br.room_name, 
          br.active, 
          u.username as admin_username
        FROM bot_rooms br
        LEFT JOIN users u ON br.admin_id = u.id
        ORDER BY br.sira DESC;
      `;
  
      const [rows] = await pool.execute(query);
      // Her kanal için istatistikleri hesapla
      for (const row of rows) {
        // O kanala ait sadece kapanmış sinyalleri çek
        const [signals] = await pool.execute('SELECT open_price, direction, stop_loss, tp1, tp2, tp3, tp4, tp5, tp6, tp7, tp8, tp9, tp10, tp_hit, sl_hit, profit, close_time FROM signals WHERE channel_id = ? AND close_time IS NOT NULL AND profit IS NOT NULL', [row.room_id]);
        let totalProfit = 0;
        let signalCount = signals.length;
        let closedCount = 0;
        let successCount = 0;
        for (const signal of signals) {
          const open = parseFloat(signal.open_price);
          let maxTpIdx = parseInt(signal.tp_hit) || 0;
          let closePrice = open;
          if (maxTpIdx > 0) {
            closePrice = parseFloat(signal[`tp${maxTpIdx}`]) || open;
          } else if (signal.sl_hit == 1) {
            closePrice = parseFloat(signal.stop_loss) || open;
          }
          let percent = 0;
          if (maxTpIdx > 0) {
            if (signal.direction === 'LONG') {
              percent = ((closePrice - open) / open) * 100;
            } else {
              percent = ((open - closePrice) / open) * 100;
            }
          } else if (signal.sl_hit == 1) {
            if (signal.direction === 'LONG') {
              percent = ((closePrice - open) / open) * 100;
            } else {
              percent = ((open - closePrice) / open) * 100;
            }
          }
          totalProfit += percent * 20;
          // Kapanmış sinyal (close_time ve profit doluysa)
          if (signal.close_time && signal.profit !== null && signal.profit !== undefined) {
            closedCount++;
            if (parseFloat(signal.profit) > 0) successCount++;
          }
        }
        row.totalProfit = Number(totalProfit.toFixed(2));
        row.signalCount = signalCount;
        row.closedCount = closedCount;
        row.successCount = successCount;
        row.successRate = closedCount > 0 ? Number(((successCount / closedCount) * 100).toFixed(1)) : 0;
      }
      const data = rows.map(row => {
        return {
          ...row,
          totalProfit: row.totalProfit || 0,
          signalCount: row.signalCount || 0,
          closedCount: row.closedCount || 0,
          successCount: row.successCount || 0,
          successRate: row.successRate || 0,
        };
      });
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

// Kanal detay (admin username ile)
router.get('/channels/:id', async (req, res) => {
    try {
      const { id } = req.params;
      // limit ve page parametrelerinde isNaN kontrolü ekle
      let page = parseInt(req.query.page, 10);
      let limit = parseInt(req.query.limit, 10);
      if (isNaN(page) || page < 1) page = 1;
      if (isNaN(limit) || limit < 1) limit = 10000; // default yüksek limit
      // limit sınırı kaldırıldı
      const offset = (page - 1) * limit;
      const safeLimit = limit;
      const safeOffset = Math.max(0, offset);

      // Kanalın ana bilgilerini ve istatistiklerini al
      const channelQuery = `
        SELECT 
          br.id, br.room_id, br.room_name, br.telegram_link, br.channel_desc, br.channel_img, br.admin_id, br.active, br.pnl_msg,
          u.username as admin_username,
          COUNT(s.id) as totalSignals,
          SUM(CASE WHEN s.profit > 0 THEN 1 ELSE 0 END) as profitableSignals,
          COUNT(CASE WHEN s.close_time IS NOT NULL THEN 1 ELSE 0 END) as closedSignals,
          SUM(s.profit) as totalProfit
        FROM bot_rooms br
        LEFT JOIN users u ON br.admin_id = u.id
        LEFT JOIN signals s ON br.room_id = s.channel_id
        WHERE br.id = ?
        GROUP BY br.id, br.room_id, br.room_name, br.telegram_link, br.channel_desc, br.channel_img, br.admin_id, br.active, br.pnl_msg, u.username;
      `;
      const [channelRows] = await pool.execute(channelQuery, [id]);
      if (channelRows.length === 0) {
        return res.status(404).json({ error: 'Kanal bulunamadı' });
      }
      const channelData = channelRows[0];
      if (!channelData.room_id) {
        console.error('Channel room_id is null or undefined:', channelData);
        return res.status(500).json({ error: 'Kanal room_id bulunamadı' });
      }
      // Kanala ait kapanmış sinyalleri (tümünü veya yüksek limitle) al
      const signalsQuery = `
        SELECT * 
        FROM signals 
        WHERE channel_id = ? AND close_time IS NOT NULL AND profit IS NOT NULL
        ORDER BY close_time asc;
      `;
      const [signalsRows] = await pool.execute('SELECT open_price, direction, stop_loss, tp1, tp2, tp3, tp4, tp5, tp6, tp7, tp8, tp9, tp10, tp_hit, sl_hit, profit, close_time, open_time, close_price, symbol, entry1, entry2, id, status, signal_hash, message_id FROM signals WHERE channel_id = ? AND close_time IS NOT NULL AND profit IS NOT NULL ORDER BY close_time desc', [channelData.room_id]);
      let totalProfit = 0;
      let signalCount = signalsRows.length;
      let closedCount = 0;
      let successCount = 0;
      // Fiyatı rates tablosundan yuvarlamak için yardımcı fonksiyon
      function formatPriceWithTick(val, digits, tickSize) {
        if (val === null || val === undefined || isNaN(val)) return '-';
        if (!digits || !tickSize) return Number(val).toFixed(6);
        const rounded = Math.round(parseFloat(val) / tickSize) * tickSize;
        return rounded.toFixed(digits);
      }
      const signalsWithProfitPercent = await Promise.all(signalsRows.map(async signal => {
        // rates tablosundan digits ve tickSize çek
        let digits = 6, tickSize = 0.000001;
        try {
          const [rateRows] = await pool.query('SELECT digits, tickSize FROM rates WHERE symbol = ? ORDER BY id DESC LIMIT 1', [signal.symbol]);
          if (rateRows.length) {
            digits = parseInt(rateRows[0].digits) || 6;
            tickSize = parseFloat(rateRows[0].tickSize) || 0.000001;
          }
        } catch (e) {}
        const open = parseFloat(signal.open_price);
        let maxTpIdx = parseInt(signal.tp_hit) || 0;
        let closePrice = open;
        if (maxTpIdx > 0) {
          closePrice = parseFloat(signal[`tp${maxTpIdx}`]) || open;
        } else if (signal.sl_hit == 1) {
          closePrice = parseFloat(signal.stop_loss) || open;
        }
        let percent = 0;
        if (maxTpIdx > 0) {
          if (signal.direction === 'LONG') {
            percent = ((closePrice - open) / open) * 100 * 20;
          } else {
            percent = ((open - closePrice) / open) * 100 * 20;
          }
        } else if (signal.sl_hit == 1) {
          if (signal.direction === 'LONG') {
            percent = ((closePrice - open) / open) * 100 * 20;
          } else {
            percent = ((open - closePrice) / open) * 100 * 20;
          }
        }
        // Kar değerlerini 3 haneli string olarak hazırla
        const profitStr = typeof percent === 'number' ? Number(percent).toFixed(3) : percent;
        signal.profit = profitStr;
        totalProfit += percent;
        if (signal.close_time && signal.profit !== null && signal.profit !== undefined) {
          closedCount++;
          if (parseFloat(signal.profit) > 0) successCount++;
        }
        // Last TP hesapla
        let last_tp = 0;
        if (signal.tp_hit && Number(signal.tp_hit) > 0 && signal[`tp${signal.tp_hit}`]) {
          last_tp = formatPriceWithTick(signal[`tp${signal.tp_hit}`], digits, tickSize);
        }
        // Last StopLoss hesapla
        let last_sl = (signal.sl_hit == 1 && signal.stop_loss && signal.stop_loss !== '-') ? formatPriceWithTick(signal.stop_loss, digits, tickSize) : '0';
        // Kanala atılan mesaj formatı (<br> ile)
        let signalMsg = `${signal.direction === 'LONG' ? '🟢 LONG' : '🔴 SHORT'}<br>`;
        signalMsg += `❇️ ${signal.symbol}<br>`;
        signalMsg += `☣ Entry : ${formatPriceWithTick(signal.entry1, digits, tickSize)} - ${formatPriceWithTick(signal.entry2, digits, tickSize)}<br>`;
        for (let i = 1; i <= 10; i++) {
          if (signal[`tp${i}`] && signal[`tp${i}`] !== 'N/A' && signal[`tp${i}`] !== '0') {
            let checked = (signal.tp_hit && Number(signal.tp_hit) >= i) ? ' ✅' : '';
            signalMsg += `☪ Target ${i} - ${formatPriceWithTick(signal[`tp${i}`], digits, tickSize)}${checked}<br>`;
          }
        }
        let stopLine = `⛔️ Stop Loss : ${formatPriceWithTick(signal.stop_loss, digits, tickSize)}`;
        if (signal.sl_hit == 1) {
          stopLine += ' ❌';
        }
        signalMsg += stopLine + '<br><br>';
        signalMsg += `Last TakeProfit: ${last_tp}${last_tp !== 0 ? ` (TP${signal.tp_hit || 0})` : ''}<br>`;
        signalMsg += `Last StopLoss: ${last_sl}`;
        let profit = signal.profit;
        if ((profit === null || profit === undefined) && closePrice && open) {
          profit = signal.direction === 'LONG' ? (closePrice - open) : (open - closePrice);
        }
        // Tüm fiyat alanlarını string olarak formatla
        return {
          ...signal,
          profit_percent: profitStr,
          signal_message: signalMsg,
          profit: profitStr,
          last_tp,
          open_price: formatPriceWithTick(signal.open_price, digits, tickSize),
          close_price: formatPriceWithTick(signal.close_price, digits, tickSize),
          stop_loss: formatPriceWithTick(signal.stop_loss, digits, tickSize),
          entry1: formatPriceWithTick(signal.entry1, digits, tickSize),
          entry2: formatPriceWithTick(signal.entry2, digits, tickSize),
          tp1: formatPriceWithTick(signal.tp1, digits, tickSize),
          tp2: formatPriceWithTick(signal.tp2, digits, tickSize),
          tp3: formatPriceWithTick(signal.tp3, digits, tickSize),
          tp4: formatPriceWithTick(signal.tp4, digits, tickSize),
          tp5: formatPriceWithTick(signal.tp5, digits, tickSize),
          tp6: formatPriceWithTick(signal.tp6, digits, tickSize),
          tp7: formatPriceWithTick(signal.tp7, digits, tickSize),
          tp8: formatPriceWithTick(signal.tp8, digits, tickSize),
          tp9: formatPriceWithTick(signal.tp9, digits, tickSize),
          tp10: formatPriceWithTick(signal.tp10, digits, tickSize)
        };
      }));
      const successRate = closedCount > 0 ? (successCount / closedCount) * 100 : 0;
      // Sadece en yeni 1000 sinyali gönder (tarihe göre azalan sırala)
      const signalsToSend = signalsWithProfitPercent
        .sort((a, b) => new Date(b.close_time).getTime() - new Date(a.close_time).getTime())
        .slice(0, 1000);
      res.json({
        ...channelData,
        totalProfit: Number(totalProfit.toFixed(2)) || 0,
        totalSignals: signalCount,
        successRate: Number(successRate.toFixed(2)) || 0,
        signals: signalsToSend,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(closedCount / limit),
          totalSignals: closedCount
        }
      });
    } catch (error) {
      console.error(`Error fetching channel detail for ID ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
});

// Kanal ekleme
router.post('/channels', async (req, res) => {
    try {
      let { room_id, room_name, admin_id, channel_desc, telegram_link, active, pnl_msg } = req.body;
      const register = new Date().toISOString().slice(0, 19).replace('T', ' ');
      if (!admin_id || admin_id === '' || admin_id === null) admin_id = 0;
      const [result] = await pool.execute(
        'INSERT INTO bot_rooms (room_id, room_name, admin_id, channel_desc, telegram_link, register, active, pnl_msg) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [room_id, room_name, admin_id, channel_desc, telegram_link || '', register, active, pnl_msg || '']
      );
      res.json({ success: true, id: result.insertId });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
});
  
// Kanal güncelleme
router.put('/channels/:id', async (req, res) => {
    try {
      let { room_id, room_name, admin_id, channel_desc, telegram_link, active, pnl_msg } = req.body;
      if (!admin_id || admin_id === '' || admin_id === null || isNaN(Number(admin_id))) admin_id = 0;
      await pool.execute(
        'UPDATE bot_rooms SET room_id=?, room_name=?, admin_id=?, channel_desc=?, telegram_link=?, active=?, pnl_msg=? WHERE id=?',
        [room_id, room_name, Number(admin_id), channel_desc, telegram_link || '', active, pnl_msg || '', req.params.id]
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
});

// Kanal silme
router.delete('/channels/:id', async (req, res) => {
    try {
      await pool.execute('DELETE FROM bot_rooms WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
});

// Kanal resmi yükleme
router.post('/channels/:id/upload-img', upload.single('channel_img'), async (req, res) => {
    try {
      const filePath = `/uploads/channels/${req.file.filename}`;
      await pool.execute('UPDATE bot_rooms SET channel_img = ? WHERE id = ?', [filePath, req.params.id]);
      res.json({ success: true, channel_img: filePath });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
});
  
// Kanal resmi silme
router.post('/channels/:id/delete-img', async (req, res) => {
    try {
      await pool.execute('UPDATE bot_rooms SET channel_img = "" WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
});

// Kanal üyeliği kontrolü
router.post('/channels/check-member', async (req, res) => {
  const { telegramUserId, channelId } = req.body;
  console.log('[DEBUG] /channels/check-member called with:', { telegramUserId, channelId });
  if (!telegramUserId || !channelId) {
    console.log('[DEBUG] Eksik parametre:', { telegramUserId, channelId });
    return res.status(400).json({ ok: false, error: 'Eksik parametre.' });
  }
  if (!BOT_TOKEN) {
    console.log('[DEBUG] Bot başlatılamadı.');
    return res.status(500).json({ ok: false, error: 'Bot başlatılamadı.' });
  }
  let fixedChannelId = channelId;
  if (!String(channelId).startsWith('@') && !String(channelId).startsWith('-100')) {
    fixedChannelId = '-100' + String(channelId);
    console.log('[DEBUG] channelId düzeltildi:', { original: channelId, fixed: fixedChannelId });
  }
  const restApiUrl = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getChatMember?chat_id=${fixedChannelId}&user_id=${telegramUserId}`;
  console.log('[DEBUG] getChatMember REST API linki:', restApiUrl);
  try {
    console.log('[DEBUG] getChatMember çağrılıyor (axios ile):', { channelId: fixedChannelId, telegramUserId });
    
    const response = await axios.get(restApiUrl, { httpsAgent });
    const member = response.data.result;

    console.log('[DEBUG] getChatMember sonucu:', member);
    if (member && ['member', 'administrator', 'creator'].includes(member.status)) {
      console.log('[DEBUG] Kullanıcı abone, status:', member.status);
      return res.json({ ok: true });
    } else {
      console.log('[DEBUG] Kullanıcı abone değil, status:', member ? member.status : null);
      return res.status(403).json({ ok: false, error: 'Kullanıcı abone değil.' });
    }
  } catch (err) {
    console.log('[DEBUG] getChatMember hata:', err.response ? err.response.data : (err.message || err));
    const errorMessage = err.response && err.response.data && err.response.data.description ? err.response.data.description : 'Kullanıcı abone değil veya erişim yok.';
    return res.status(403).json({ ok: false, error: errorMessage });
  }
});

// Toplu mesaj gönderme (bildirimler tablosuna ekle)
router.post('/channels/:id/bulk-notification', async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Mesaj boş olamaz' });
    }
    // Kanalın room_id'sini bul
    const [roomRows] = await pool.execute('SELECT room_id, room_name FROM bot_rooms WHERE id = ?', [id]);
    if (!roomRows.length) {
      return res.status(404).json({ error: 'Kanal bulunamadı' });
    }
    const room_id = roomRows[0].room_id;
    const room_name = roomRows[0].room_name;
    // Bu kanaldan sinyal alan tüm user_id'leri bul (user_signals tablosundan)
    const [userRows] = await pool.execute('SELECT DISTINCT user_id FROM user_signals WHERE api_id = ?', [room_id]);
    if (!userRows.length) {
      return res.status(404).json({ error: 'Bu kanala ait kullanıcı bulunamadı' });
    }
    // Bildirimler tablosuna ekle (bildirimler_ch)
    const now = new Date();
    const values = userRows.map(u => [u.user_id, message, room_id, room_name, now]);
    // Bildirimler tablosu: bildirimler_ch (varsayım: user_id, msg, channel_id, channel_name, created_at)
    await pool.query('INSERT INTO bildirimler_ch (user_id, msg, channel_id, channel_name, created_at) VALUES ?',[values]);
    res.json({ success: true, count: userRows.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;