import { Router } from 'express';
import pool from '../db.js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const router = Router();

// Telegram mesajı göndermek için gerçek fonksiyon
async function sendTelegramMessage(telegramId, message) {
  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (!BOT_TOKEN) return;
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: telegramId,
      text: message
    })
  });
}

// Kanal sahibi başvuru endpointi
router.post('/channel-owner', async (req, res) => {
  try {
    const { channelName, channelLink, followerCount, fullName, email, phoneNumber, ownerTelegram } = req.body;
    if (!channelName || !channelLink || !followerCount || !fullName || !email || !phoneNumber || !ownerTelegram) {
      return res.status(400).json({ error: 'Eksik bilgi' });
    }

    // bot_rooms tablosuna pasif kanal ekle
    await pool.execute(
      'INSERT INTO bot_rooms (room_id, room_name, channel_desc, channel_img, register, active) VALUES (?, ?, ?, ?, ?, ?)',
      [
        0, // room_id
        channelName,
        ``,
        '', // channel_img zorunlu, boş string
        new Date().toISOString().slice(0, 19).replace('T', ' '),
        0 // pasif
      ]
    );

    // app_admin tablosundaki admin_users sütunundaki id'leri al
    const [adminRows] = await pool.execute('SELECT admin_users FROM app_admin LIMIT 1');
    let adminIds = [];
    if (adminRows.length > 0 && adminRows[0].admin_users) {
      adminIds = adminRows[0].admin_users.split(',').map(id => id.trim()).filter(Boolean);
    }
    const message = `Yeni kanal başvurusu:\nKanal Adı: ${channelName}\nSahip: ${fullName}\nEmail: ${email}\nTelefon: ${phoneNumber}\nTakipçi: ${followerCount}\nTelegram: ${ownerTelegram}\nKanal Linki: ${channelLink}`;
    for (const adminId of adminIds) {
      await sendTelegramMessage(adminId, message);
    }

    // Form tekrar gösterilsin diye success:false dön
    res.json({ success: false });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router; 