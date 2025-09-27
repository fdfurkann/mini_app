import { Router } from 'express';
import pool from '../db.js';
import dotenv from 'dotenv';
import axios from 'axios';
import https from 'https';

// Axios için özel bir agent oluşturarak IPv4 kullanımını zorunlu kıl
const httpsAgent = new https.Agent({ family: 4 });

dotenv.config();

const router = Router();

// Telegram mesajı göndermek için gerçek fonksiyon
async function sendTelegramMessage(telegramId, message) {
  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (!BOT_TOKEN) return;
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, {
      chat_id: telegramId,
      text: message
    }, { httpsAgent });
  } catch (error) {
    console.error(`Telegram mesajı gönderilemedi (${telegramId}):`, error.response ? error.response.data : error.message);
  }
}

// Kanal sahibi başvuru endpointi
router.post('/channel-owner', async (req, res) => {
  try {
    const { channelName, channelLink, followerCount, fullName, email, phoneNumber, ownerTelegram } = req.body;
    if (!channelName || !channelLink || !followerCount || !fullName || !email || !phoneNumber || !ownerTelegram) {
      return res.status(400).json({ error: 'Eksik bilgi' });
    }

    const description = `Başvuru Bilgileri:\n- Sahip: ${fullName}\n- Email: ${email}\n- Telefon: ${phoneNumber}\n- Takipçi: ${followerCount}\n- Telegram: ${ownerTelegram}\n- Kanal Linki: ${channelLink}`;

    // bot_rooms tablosuna pasif kanal ekle
    await pool.execute(
      'INSERT INTO bot_rooms (room_id, room_name, channel_desc, channel_img, register, active) VALUES (?, ?, ?, ?, ?, ?)',
      [
        0, // room_id (admin tarafından güncellenecek)
        channelName,
        description,
        '', // channel_img
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

    res.json({ success: true });
  } catch (error) {
    console.error('Kanal başvurusu hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;