import { Router } from 'express';
import crypto from 'crypto';
import { validate, parse } from '@telegram-apps/init-data-node';
import pool from '../db.js';
import { getFromCache, setCache } from '../cache.js';
import TelegramBot from 'node-telegram-bot-api';

const router = Router();

// Bot token'ı .env'den al
const BOT_TOKEN = process.env.BOT_TOKEN;

// Telegram doğrulama endpoint'i
router.post('/validate-telegram-auth', async (req, res) => {
  try {
    if (typeof req.body !== 'string' || !req.body) {
      return res.status(400).json({ valid: false, message: 'Invalid request body format (expected text/plain)' });
    }
    
    const receivedDataString = req.body;
    console.log("Received data string:", receivedDataString);

    try { 
      // Telegram'ın resmi kütüphanesi ile doğrula
      validate(receivedDataString, BOT_TOKEN, {
        expiresIn: 86400 // 24 saat
      });

      // Doğrulama başarılı ise veriyi parse et
      const initData = parse(receivedDataString);
      console.log("Parsed init data:", initData);

      // Login hash oluştur
      const timestamp = Date.now().toString();
      const login_hash = crypto
        .createHash('md5')
        .update(receivedDataString + timestamp)
        .digest('hex');

      // Kullanıcıyı veritabanında kontrol et veya güncelle
      if (initData.user) {
        try {
          const [existingUser] = await pool.execute(
            'SELECT * FROM users WHERE id = ?',
            [initData.user.id]
          );

          let userId;
          let finalLoginHash;
          let userPhotoUrl = null;
          // Telegram API'den gerçek profil fotoğrafı al
          try {
            const bot = new TelegramBot(BOT_TOKEN, { polling: false });
            const photos = await bot.getUserProfilePhotos(initData.user.id, { limit: 1 });
            console.log("Photos:", photos);
            if (photos.total_count > 0 && photos.photos[0].length > 0) {
              const biggestPhoto = photos.photos[0][photos.photos[0].length - 1];
              const file = await bot.getFile(biggestPhoto.file_id);
              console.log("File:", file);
              if (file && file.file_path) {
                userPhotoUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
              }
            }
          } catch (e) {
            userPhotoUrl = initData.user.photo_url || null;
          }
          if (existingUser.length === 0) {
            // Yeni kullanıcı ekle
            const [result] = await pool.execute(
              'INSERT INTO users (id, username, full_name, photo, last_login, login_hash) VALUES (?, ?, ?, ?, NOW(), ?)',
              [initData.user.id, initData.user.username || null, (initData.user.first_name || '') + ' ' + (initData.user.last_name || ''), userPhotoUrl, login_hash]
            );
            userId = result.insertId;
            finalLoginHash = login_hash;
          } else {
            // Mevcut kullanıcının login_hash'ini değiştirme, mevcut login_hash'i döndür
            userId = existingUser[0].id;
            finalLoginHash = existingUser[0].login_hash;
            // Kullanıcı bilgilerini güncelle (username, full_name, photo, last_login)
            await pool.execute(
              'UPDATE users SET username = ?, full_name = ?, photo = ?, last_login = NOW() WHERE id = ?',
              [initData.user.username || null, (initData.user.first_name || '') + ' ' + (initData.user.last_name || ''), userPhotoUrl, initData.user.id]
            );
          }

          // Güncel kullanıcı bilgilerini al
          const [updatedUser] = await pool.execute(
            'SELECT id, login_hash FROM users WHERE id = ?',
            [initData.user.id]
          );

          return res.status(200).json({
            valid: true,
            user: updatedUser[0]
          });

        } catch (dbError) {
          console.error("Database error during user upsert:", dbError);
          return res.status(500).json({ valid: false, message: 'Database error: ' + dbError.message });
        }
      }
      
    } catch (validationError) {
      console.error("Validation error:", validationError);
      return res.status(401).json({ valid: false, message: validationError.message });
    }
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ valid: false, message: 'Internal server error' });
  }
});

// Check admin access
router.post('/check-admin-access', async (req, res) => {
  try {
    const { user_id } = req.body;
    const cacheKey = `admin:access:${user_id}`;
    
    // Redis'ten önbelleklenmiş veriyi kontrol et
    const cachedAccess = getFromCache(cacheKey);
    if (cachedAccess) {
      return res.json({ exists: cachedAccess === 'true' });
    }

    // Cache miss - veritabanından kontrol et
    const [rows] = await pool.execute(
      'SELECT id FROM app_admin WHERE admin_users LIKE ?',
      [`%${user_id}%`]
    );
    
    const hasAccess = rows.length > 0;
    
    // Sonucu Redis'e önbellekle (1 saat TTL)
    setCache(cacheKey, hasAccess.toString(), 3600);
    
    res.json({ exists: hasAccess });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get admin users
router.get('/admin-users', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT admin_users FROM app_admin WHERE id = 1'
    );
    
    if (rows.length === 0) {
      res.json({ admin_users: "" });
      return;
    }
    
    res.json({ admin_users: rows[0].admin_users });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check auth endpoint
router.post('/check-auth', async (req, res) => {
  try {
    const { app_id, login_hash } = req.body;
    
    if (!app_id || !login_hash) {
      return res.status(400).json({ exists: false });
    }

    const [rows] = await pool.execute(
      'SELECT id FROM users WHERE id = ? AND login_hash = ?',
      [app_id, login_hash]
    );

    res.json({ exists: rows.length > 0 });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin login endpoint
router.post('/admin-login-simple', async (req, res) => {
    const { password } = req.body;
  
    if (!password) {
      return res.status(400).json({ message: 'Şifre gerekli' });
    }
  
    try {
      // Redis'ten önbelleklenmiş admin şifresini kontrol et
      const cacheKey = 'admin:password';
      const cachedPassword = getFromCache(cacheKey);
      
      if (cachedPassword === password) {
        return res.status(200).json({ success: true });
      }
  
      // Cache miss - veritabanından kontrol et
      const [rows] = await pool.execute(
        'SELECT adminpass FROM app_admin WHERE adminpass = ?',
        [password]
      );
  
      if (Array.isArray(rows) && rows.length > 0) {
        // Şifreyi Redis'e önbellekle (1 saat TTL)
        setCache(cacheKey, password, 3600);
        return res.status(200).json({ success: true });
      } else {
        return res.status(401).json({ success: false, message: 'Şifre yanlış' });
      }
    } catch (error) {
      console.error('Database error:', error);
      return res.status(500).json({ message: 'Database error', error: error.message });
    }
  });

// Kullanıcıdan profil fotoğrafı güncelleme endpointi
router.post('/update-profile-photo', async (req, res) => {
  try {
    const { user_id, photo_url } = req.body;
    if (!user_id || !photo_url) {
      return res.status(400).json({ success: false, message: 'Eksik parametre' });
    }
    await pool.execute('UPDATE users SET photo = ? WHERE id = ?', [photo_url, user_id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router; 