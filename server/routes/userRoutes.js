import { Router } from 'express';
import pool from '../db.js';
import { getCacheKey, getFromCache, setCache } from '../cache.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Get user by telegram ID - Auth korumalı
router.get('/users/:telegramId', authMiddleware, async (req, res) => {
  try {
    const cacheKey = getCacheKey(req);
    const cachedData = getFromCache(cacheKey);
    
    if (cachedData) {
      console.log('Returning cached user data');
      res.json(cachedData);
      return;
    }
    
    console.log('Fetching user with telegramId:', req.params.telegramId);
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [req.params.telegramId]
    );
    
    if (rows.length === 0) {
      console.log('No user found');
      res.status(404).json({ error: 'Kullanıcı bulunamadı' });
      return;
    }
    
    setCache(cacheKey, rows[0]);
    res.json(rows[0]);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check if user is admin by telegram ID
router.get('/check-admin', async (req, res) => {
  const { user_id } = req.query; // Bu frontend'den gelen user_id

  if (!user_id) {
    return res.status(400).json({ error: 'user_id query parametresi eksik' });
  }

  try {
    console.log('Checking admin status for user_id (using app_admin):', user_id);
    
    // app_admin tablosundan kontrol et
    // user_id'nin app_admin.admin_users içinde LIKE ile aranacağını varsayıyoruz
    const [adminRows] = await pool.execute(
      "SELECT id FROM app_admin WHERE admin_users LIKE ?",
      [`%${user_id}%`]
    );

    // Eğer adminRows içinde kayıt varsa, kullanıcı admin_users listesindedir.
    const isAdmin = adminRows.length > 0;
    
    console.log('Admin status for user_id:', user_id, 'is', isAdmin);
    res.json({ isAdmin });

  } catch (error) {
    console.error('Admin check (app_admin) database error:', error);
    res.status(500).json({ error: 'Admin durumu kontrol edilirken sunucu hatası oluştu: ' + error.message });
  }
});

// Enrolled users endpoint
router.get('/enrolled-users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const cacheKey = `enrolled:${userId}`;
    
    // Redis'ten önbelleklenmiş veriyi kontrol et
    const cachedData = getFromCache(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Cache miss - veritabanından çek
    const [rows] = await pool.query(
      `SELECT 
        eu.*,
        p.package_name,
        p.package_description,
        p.package_price
       FROM enrolled_users eu
       LEFT JOIN packages p ON p.id = eu.package_id
       WHERE eu.user_id = ?
       ORDER BY eu.start_date DESC`, 
      [userId]
    );

    // Veriyi Redis'e önbellekle (5 dakika TTL)
    setCache(cacheKey, rows, 300);
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching enrolled users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dashboard data endpoint - tüm verileri tek seferde getir
router.get('/dashboard/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const cacheKey = `dashboard:${userId}`;
      const cachedData = getFromCache(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData);
      }
  
      // Tüm verileri paralel olarak çek
      const [user, trades, signals] = await Promise.all([
        pool.execute('SELECT * FROM users WHERE id = ?', [userId])
          .then(([rows]) => rows[0]),
        pool.execute(
          'SELECT * FROM user_signals WHERE user_id = ? and open = 0 OR close = 0 ORDER BY id DESC LIMIT 10', 
          [userId]
        ).then(([rows]) => rows)
      ]);
  
      const result = {
        user,
        trades,
        signals,
        timestamp: Date.now()
      };
  
      // 30 saniyelik cache
      setCache(cacheKey, result, 30000);
      
      res.json(result);
    } catch (error) {
      console.error('Dashboard data error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Kullanıcı arama endpoint'i
  router.get('/search_users', async (req, res) => {
    try {
      const search = req.query.search || '';
      if (!search) return res.json([]);
      const [rows] = await pool.execute(
        'SELECT id, username FROM users WHERE username LIKE ? LIMIT 20',
        [`%${search}%`]
      );
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

export default router; 