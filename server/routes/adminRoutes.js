import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Helper function to get exchange instance
const getBorsaInstance = async (api) => {
    if (api.api_type === 1) {
        const { rbinance } = await import('../exchanges/binance_rest.js');
        return new rbinance(api.api_key, api.api_secret);
    } else if (api.api_type === 2) {
        const { rbybit } = await import('../exchanges/bybit_rest.js');
        return new rbybit(api.api_key, api.api_secret);
    } else if (api.api_type === 3) {
        const { rbingx } = await import('../exchanges/bingx_rest.js');
        return new rbingx(api.api_key, api.api_secret);
    }
    return null;
};

// Positions endpoint
router.get('/admin/api-keys/:id/positions', authMiddleware, async (req, res) => {
  const apiKeyId = req.params.id;
  try {
    // api_keys tablosundan api_key, api_secret ve api_type çek
    const [rows] = await pool.query('SELECT * FROM api_keys WHERE id = ?', [apiKeyId]);
    if (!rows.length) {
      return res.status(404).json({ error: 'API anahtarı bulunamadı' });
    }
    const api = rows[0];
    let borsa;
    let positions;
    if (api.api_type === 1) {
      // Binance
      const { rbinance } = await import('../exchanges/binance_rest.js');
      borsa = new rbinance(api.api_key, api.api_secret);
      const form = await borsa.call('/fapi/v2/positionRisk', 1, {}, 'GET');
      // Sadece miktarı 0 olmayanları ve gerekli alanları ile diziye çevir
      positions = (Array.isArray(form) ? form : [])
        .filter(pos => Number(pos.positionAmt) !== 0)
        .map(pos => ({
          symbol: pos.symbol,
          positionAmt: pos.positionAmt,
          entryPrice: pos.entryPrice,
          unRealizedProfit: pos.unRealizedProfit,
          leverage: pos.leverage,
          positionSide: pos.positionSide,
          marginType: pos.marginType
        }));
    } else if (api.api_type === 2) {
      // Bybit
      const { rbybit } = await import('../exchanges/bybit_rest.js');
      borsa = new rbybit(api.api_key, api.api_secret);
      positions = await borsa.open_positions();
    } else if (api.api_type === 3) {
      // BingX
      const { rbingx } = await import('../exchanges/bingx_rest.js');
      borsa = new rbingx(api.api_key, api.api_secret);
      positions = await borsa.open_positions();
    } else {
      return res.status(400).json({ error: 'Desteklenmeyen borsa tipi' });
    }
    res.json(positions);
  } catch (error) {
    console.error('Pozisyonlar çekilirken hata:', error);
    res.status(500).json({ error: 'Pozisyonlar alınamadı', detail: error.message });
  }
});

// Open orders endpoint
router.get('/admin/api-keys/:id/open_orders', authMiddleware, async (req, res) => {
  const apiKeyId = req.params.id;
  try {
    const [rows] = await pool.query('SELECT * FROM api_keys WHERE id = ?', [apiKeyId]);
    if (!rows.length) {
      return res.status(404).json({ error: 'API anahtarı bulunamadı' });
    }
    const api = rows[0];
    let borsa;
    let orders;
    if (api.api_type === 1) {
      const { rbinance } = await import('../exchanges/binance_rest.js');
      borsa = new rbinance(api.api_key, api.api_secret);
      orders = await borsa.open_orders();
      // reduceOnly veya closePosition varsa ekle
      orders = Array.isArray(orders) ? orders.map(o => ({ ...o, reduceOnly: o.reduceOnly ?? o.closePosition ?? false })) : orders;
    } else if (api.api_type === 2) {
      const { rbybit } = await import('../exchanges/bybit_rest.js');
      borsa = new rbybit(api.api_key, api.api_secret);
      orders = await borsa.open_orders();
      orders = Array.isArray(orders) ? orders.map(o => ({ ...o, reduceOnly: o.reduceOnly ?? o.closeOnTrigger ?? false })) : orders;
    } else if (api.api_type === 3) {
      const { rbingx } = await import('../exchanges/bingx_rest.js');
      borsa = new rbingx(api.api_key, api.api_secret);
      orders = await borsa.open_orders();
      orders = Array.isArray(orders) ? orders.map(o => ({ ...o, reduceOnly: o.reduceOnly ?? false })) : orders;
    } else {
      return res.status(400).json({ error: 'Desteklenmeyen borsa tipi' });
    }
    res.json(orders);
  } catch (error) {
    console.error('Açık emirler çekilirken hata:', error);
    res.status(500).json({ error: 'Açık emirler alınamadı', detail: error.message });
  }
});

// Position history endpoint
router.get('/admin/api-keys/:id/position_history', authMiddleware, async (req, res) => {
  const apiKeyId = req.params.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  try {
    const [rows] = await pool.query('SELECT * FROM api_keys WHERE id = ?', [apiKeyId]);
    if (!rows.length) {
      return res.status(404).json({ error: 'API anahtarı bulunamadı' });
    }
    const api = rows[0];
    let borsa;
    let history;
    if (api.api_type === 1) {
      const { rbinance } = await import('../exchanges/binance_rest.js');
      borsa = new rbinance(api.api_key, api.api_secret);
      let all = await borsa.trade_history();
      all = Array.isArray(all) ? all : [];
      all.sort((a, b) => (b.time || 0) - (a.time || 0));
      history = all.slice((page - 1) * limit, page * limit);
    } else if (api.api_type === 2) {
      const { rbybit } = await import('../exchanges/bybit_rest.js');
      borsa = new rbybit(api.api_key, api.api_secret);
      history = await borsa.fapi_historicalTrades();
    } else if (api.api_type === 3) {
      const { rbingx } = await import('../exchanges/bingx_rest.js');
      borsa = new rbingx(api.api_key, api.api_secret);
      history = await borsa.fapi_historicalTrades();
    } else {
      return res.status(400).json({ error: 'Desteklenmeyen borsa tipi' });
    }
    res.json(history);
  } catch (error) {
    console.error('Pozisyon geçmişi çekilirken hata:', error);
    res.status(500).json({ error: 'Pozisyon geçmişi alınamadı', detail: error.message });
  }
});

// Order history endpoint
router.get('/admin/api-keys/:id/order_history', authMiddleware, async (req, res) => {
  const apiKeyId = req.params.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  try {
    const [rows] = await pool.query('SELECT * FROM api_keys WHERE id = ?', [apiKeyId]);
    if (!rows.length) {
      return res.status(404).json({ error: 'API anahtarı bulunamadı' });
    }
    const api = rows[0];
    let borsa;
    let orders;
    if (api.api_type === 1) {
      const { rbinance } = await import('../exchanges/binance_rest.js');
      borsa = new rbinance(api.api_key, api.api_secret);
      let all = await borsa.order_history();
      all = Array.isArray(all) ? all : [];
      all.sort((a, b) => (b.updateTime || b.time || 0) - (a.updateTime || a.time || 0));
      orders = all.slice((page - 1) * limit, page * limit);
    } else if (api.api_type === 2) {
      const { rbybit } = await import('../exchanges/bybit_rest.js');
      borsa = new rbybit(api.api_key, api.api_secret);
      orders = await borsa.fapi_historicalTrades();
    } else if (api.api_type === 3) {
      const { rbingx } = await import('../exchanges/bingx_rest.js');
      borsa = new rbingx(api.api_key, api.api_secret);
      orders = await borsa.fapi_historicalTrades();
    } else {
      return res.status(400).json({ error: 'Desteklenmeyen borsa tipi' });
    }
    res.json(orders);
  } catch (error) {
    console.error('Emir geçmişi çekilirken hata:', error);
    res.status(500).json({ error: 'Emir geçmişi alınamadı', detail: error.message });
  }
});

// Admin - Get all members with search and pagination
router.get('/admin/members', authMiddleware, async (req, res) => {
    try {
      const { search = '' } = req.query;
      let page = parseInt(req.query.page, 10);
      let limit = 30;
      if (isNaN(page) || page < 1) page = 1;
      // limit sabit 30, isterseniz dinamik yapabilirsiniz
      const offset = (page - 1) * limit;
  
      let query = `
        SELECT 
          id,
          username,
          full_name,
          email,
          phone,
          is_admin,
          is_vip,
          subscription_expires_at,
          created_at,
          last_login,
          status,
          language
        FROM users
      `;
      let countQuery = 'SELECT COUNT(*) as total FROM users';
      
      if (search) {
        const searchCondition = `
          WHERE full_name LIKE ? 
          OR username LIKE ? 
          OR email LIKE ? 
          OR phone LIKE ?
          OR id LIKE ?
        `;
        query += searchCondition;
        countQuery += searchCondition;
      }
      
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      
      const searchParam = search ? `%${search}%` : '';
      const queryParams = search ? 
        [searchParam, searchParam, searchParam, searchParam, searchParam, limit, offset] : 
        [limit, offset];
      
      const countParams = search ? 
        [searchParam, searchParam, searchParam, searchParam, searchParam] : 
        [];
  
      const [[{ total }], [members]] = await Promise.all([
        pool.query(countQuery, countParams),
        pool.query(query, queryParams)
      ]);
  
      res.json({
        members,
        total,
        page: Number(page),
        limit
      });
    } catch (error) {
      console.error('Üyeler alınırken hata:', error);
      res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Admin - Get member by ID
router.get('/admin/members/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
      
      if (rows.length === 0) {
        res.status(404).json({ error: 'Üye bulunamadı' });
        return;
      }
      
      res.json(rows[0]);
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: error.message });
    }
});

// Admin - Get member details with all related data
router.get('/admin/members/:id/details', async (req, res) => {
    try {
      const memberId = req.params.id;
      
      // Üye detayları
      const [memberRows] = await pool.query(
        'SELECT id, username, full_name, email, phone, created_at, status, is_admin, is_vip, subscription_expires_at FROM users WHERE id = ?',
        [memberId]
      );
  
      if (memberRows.length === 0) {
        return res.status(404).json({ error: 'Üye bulunamadı' });
      }
  
      // İşlemler (son 10 işlem)
      const [tradesRows] = await pool.query(
        `SELECT id, ticket, symbol, trend, open, opentime, volume, sl, tp, close, closetime, profit, status 
         FROM user_signals 
         WHERE user_id = ? 
         ORDER BY id DESC 
         LIMIT 10`,
        [memberId]
      );
  
      // API anahtarları
      const [apiKeysRows] = await pool.query(
        `SELECT id, api_name, api_key, api_secret, api_type, bot_room, status, created_at 
         FROM api_keys 
         WHERE user_id = ?`,
        [memberId]
      );
  
      // Bildirimler (son 5 bildirim)
      const [notificationsRows] = await pool.query(
        `SELECT id, msg as message, gonderim as sent_status 
         FROM bildirimler 
         WHERE user_id = ? 
         ORDER BY id DESC 
         LIMIT 5`,
        [memberId]
      );
  
      // Abonelikler
      const [subscriptionsRows] = await pool.query(
        `SELECT eu.id, eu.package_time, eu.package_api_rights, eu.start_date, eu.end_date,
                p.package_name, p.package_price, p.package_description
         FROM enrolled_users eu 
         JOIN packages p ON eu.package_id = p.id 
         WHERE eu.user_id = ?`,
        [memberId]
      );
  
      res.json({
        member: memberRows[0],
        trades: tradesRows,
        apiKeys: apiKeysRows,
        notifications: notificationsRows,
        subscriptions: subscriptionsRows
      });
  
    } catch (error) {
      console.error('Üye detayları alınırken hata:', error);
      res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Admin - Update member
router.put('/admin/members/:id', authMiddleware, async (req, res) => {
    try {
      const memberId = req.params.id;
      const { username, full_name, email } = req.body;
  
      await pool.query(
        'UPDATE users SET username = ?, full_name = ?, email = ? WHERE id = ?',
        [username, full_name, email, memberId]
      );
  
      res.json({ message: 'Üye güncellendi' });
    } catch (error) {
      console.error('Üye güncellenirken hata:', error);
      res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Profil düzenleme endpoint'i
router.put('/admin/members/:id/profile', authMiddleware, async (req, res) => {
    try {
      const memberId = req.params.id;
      const {
        username,
        full_name,
        email,
        phone,
        is_admin,
        is_vip,
        subscription_expires_at,
        status,
        language,
        notes
      } = req.body;
  
      // Önce kullanıcının var olduğunu kontrol et
      const [existingUser] = await pool.query(
        'SELECT id FROM users WHERE id = ?',
        [memberId]
      );
  
      if (existingUser.length === 0) {
        return res.status(404).json({ error: 'Üye bulunamadı' });
      }
  
      // Güncelleme sorgusu
      await pool.query(
        `UPDATE users SET 
          username = ?,
          full_name = ?,
          email = ?,
          phone = ?,
          is_admin = ?,
          is_vip = ?,
          subscription_expires_at = ?,
          status = ?,
          language = ?,
          notes = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [
          username,
          full_name,
          email,
          phone,
          is_admin,
          is_vip,
          subscription_expires_at,
          status,
          language,
          notes,
          memberId
        ]
      );
  
      // Güncellenmiş kullanıcı bilgilerini getir
      const [updatedUser] = await pool.query(
        `SELECT id, username, full_name, email, phone, is_admin, is_vip, 
                subscription_expires_at, status, language, notes, 
                created_at, updated_at
         FROM users 
         WHERE id = ?`,
        [memberId]
      );
  
      res.json({
        message: 'Profil başarıyla güncellendi',
        user: updatedUser[0]
      });
  
    } catch (error) {
      console.error('Profil güncellenirken hata:', error);
      res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Admin - Delete member
router.delete('/admin/members/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await pool.execute('DELETE FROM users WHERE id = ?', [id]);
      res.json({ success: true });
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: error.message });
    }
});

// Get full details for a single API key
router.get('/admin/api-keys/:keyId', authMiddleware, async (req, res) => {
    try {
        const { keyId } = req.params;
        const [rows] = await pool.query('SELECT * FROM api_keys WHERE id = ?', [keyId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'API anahtarı bulunamadı' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching API key details:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Update a single API key
router.put('/admin/api-keys/:keyId', authMiddleware, async (req, res) => {
    try {
        const { keyId } = req.params;
        const fieldsToUpdate = req.body;

        // Güvenlik için güncellenmesine izin verilmeyen alanları kaldır
        delete fieldsToUpdate.id;
        delete fieldsToUpdate.user_id;
        delete fieldsToUpdate.created_at;

        if (Object.keys(fieldsToUpdate).length === 0) {
            return res.status(400).json({ error: 'Güncellenecek alan yok' });
        }

        await pool.query('UPDATE api_keys SET ? WHERE id = ?', [fieldsToUpdate, keyId]);

        const [updatedRows] = await pool.query('SELECT * FROM api_keys WHERE id = ?', [keyId]);

        res.json({ message: 'API anahtarı başarıyla güncellendi', apiKey: updatedRows[0] });
    } catch (error) {
        console.error('Error updating API key:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});


// Endpoint to get logs for a specific user_signal
router.get('/admin/user_signals/:id/logs', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const [logs] = await pool.query(
            'SELECT * FROM bot_logs WHERE user_signals_id = ? ORDER BY created_at ASC',
            [id]
        );
        res.json(logs);
    } catch (error) {
        console.error('Error fetching bot logs for user_signal:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Admin - Get member notifications with search and pagination
router.get('/admin/member-notifications', async (req, res) => {
    try {
      const { search = '', page = 1, limit = 30 } = req.query;
      const offset = (page - 1) * limit;
      
      let query = `
        SELECT 
          n.*,
          u.username,
          u.full_name
        FROM bildirimler n
        LEFT JOIN users u ON u.id = n.user_id
      `;
      
      let countQuery = 'SELECT COUNT(*) as total FROM bildirimler n LEFT JOIN users u ON u.id = n.user_id';
      const params = [];
      
      if (search) {
        query += ' WHERE u.username LIKE ? OR u.full_name LIKE ?';
        countQuery += ' WHERE u.username LIKE ? OR u.full_name LIKE ?';
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam);
      }
      
      query += ' ORDER BY n.id DESC LIMIT ? OFFSET ?';
      params.push(Number(limit), offset);
      
      const [rows] = await pool.execute(query, params);
      const [countResult] = await pool.execute(countQuery, search ? params.slice(0, -2) : []);
      
      res.json({
        notifications: rows,
        total: countResult[0].total,
        page: Number(page),
        limit: Number(limit)
      });
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: error.message });
    }
});

// Admin - Update notification
router.put('/admin/member-notifications/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { user_id, msg, gonderim } = req.body;
      
      await pool.execute(
        'UPDATE bildirimler SET user_id = ?, msg = ?, gonderim = ? WHERE id = ?',
        [user_id, msg, gonderim, id]
      );
      
      const [updatedNotification] = await pool.execute('SELECT * FROM bildirimler WHERE id = ?', [id]);
      res.json(updatedNotification[0]);
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: error.message });
    }
});

// Admin - Delete notification
router.delete('/admin/member-notifications/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await pool.execute('DELETE FROM bildirimler WHERE id = ?', [id]);
      res.json({ success: true });
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: error.message });
    }
});

// Admin - Reset notification sending time
router.put('/admin/member-notifications/:id/reset-sending', async (req, res) => {
    try {
      const { id } = req.params;
      await pool.execute(
        'UPDATE bildirimler SET gonderim = 0 WHERE id = ?',
        [id]
      );
      
      const [updatedNotification] = await pool.execute('SELECT * FROM bildirimler WHERE id = ?', [id]);
      res.json(updatedNotification[0]);
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: error.message });
    }
});


// Bildirim okundu işaretleme endpoint'i
router.put('/admin/members/:memberId/notifications/:notificationId', authMiddleware, async (req, res) => {
    try {
      const { memberId, notificationId } = req.params;
  
      await pool.query(
        'UPDATE notifications SET read = true WHERE id = ? AND user_id = ?',
        [notificationId, memberId]
      );
  
      res.json({ message: 'Bildirim okundu olarak işaretlendi' });
    } catch (error) {
      console.error('Bildirim güncellenirken hata:', error);
      res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Admin - Get channel notifications with search and pagination
router.get('/admin/channel-notifications', async (req, res) => {
    try {
      const { search = '', page = 1, limit = 30 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      
      let query = `
        SELECT 
          bch.*, 
          br.room_name 
        FROM bildirimler_ch bch 
        LEFT JOIN bot_rooms br ON bch.channel_id = br.room_id 
      `; 
      
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM bildirimler_ch bch 
        LEFT JOIN bot_rooms br ON bch.channel_id = br.room_id
      `;
      
      const params = [];
      const countParams = [];
      
      if (search) {
        const searchCondition = ' WHERE (bch.symbol LIKE ? OR bch.trend LIKE ? OR bch.msg LIKE ? OR br.room_name LIKE ? OR bch.channel_id LIKE ?) ';
        query += searchCondition;
        countQuery += searchCondition;
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam, searchParam, searchParam);
        countParams.push(searchParam, searchParam, searchParam, searchParam, searchParam);
      }
      
      query += ' ORDER BY bch.id DESC LIMIT ? OFFSET ?';
      params.push(Number(limit), Number(offset));
      
      const [countResult] = await pool.execute(countQuery, countParams);
      const total = countResult[0].total;
  
      const [rows] = await pool.execute(query, params);
      
      res.json({
        notifications: rows,
        total: total,
        page: Number(page),
        limit: Number(limit)
      });
    } catch (error) {
      console.error('Database error @ /api/admin/channel-notifications:', error);
      res.status(500).json({ error: error.message });
    }
});

// Admin - Delete channel notification
router.delete('/admin/channel-notifications/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await pool.execute('DELETE FROM bildirimler_ch WHERE id = ?', [id]);
      res.json({ success: true });
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: error.message });
    }
});

// Admin - Get subscriptions with search and pagination
router.get('/admin/subscriptions', async (req, res) => {
    try {
      const { search = '', page = 1, limit = 30 } = req.query;
      const offset = (page - 1) * limit;
      
      let query = `
        SELECT 
          e.*,
          u.username,
          u.full_name,
          p.package_name
        FROM enrolled_users e
        LEFT JOIN users u ON u.id = e.user_id
        LEFT JOIN packages p ON p.id = e.package_id
      `;
      
      let countQuery = 'SELECT COUNT(*) as total FROM enrolled_users';
      const params = [];
      
      if (search) {
        query += ' WHERE e.user_id LIKE ? OR u.username LIKE ? OR u.full_name LIKE ? OR p.package_name LIKE ?';
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam, searchParam);
      }
      
      query += ' ORDER BY e.id DESC LIMIT ? OFFSET ?';
      params.push(Number(limit), Number(offset));
      
      const [rows] = await pool.execute(query, params);
      const [countResult] = await pool.execute(countQuery, search ? params.slice(0, -2) : []);
      
      res.json({
        subscriptions: rows,
        total: countResult[0].total,
        page: Number(page),
        limit: Number(limit)
      });
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: error.message });
    }
});

// Admin - Create subscription
router.post('/admin/subscriptions', async (req, res) => {
    try {
      const { package_id, user_id, package_time, package_api_rights, start_date, end_date } = req.body;
      
      const [result] = await pool.execute(
        `INSERT INTO enrolled_users 
         (package_id, user_id, package_time, package_api_rights, start_date, end_date) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [package_id, user_id, package_time, package_api_rights, start_date, end_date]
      );
      
      const [newSubscription] = await pool.execute(
        'SELECT * FROM enrolled_users WHERE id = ?',
        [result.insertId]
      );
  
      // Kullanıcının boşta bekleyen api anahtarı varsa, yeni aboneliği ona ata
      const [apiKeys] = await pool.execute(
        'SELECT id FROM api_keys WHERE user_id = ? AND (enrolled_id IS NULL OR enrolled_id = "") LIMIT 1',
        [user_id]
      );
      if (apiKeys.length > 0) {
        await pool.execute(
          'UPDATE api_keys SET enrolled_id = ?, auto_trade = 1 WHERE id = ?',
          [result.insertId, apiKeys[0].id]
        );
  
        // Kullanıcıya bildirim mesajı oluştur ve bildirimler tablosına ekle
        const [userRows] = await pool.execute('SELECT id FROM users WHERE id = ?', [user_id]);
        if (userRows.length > 0 && userRows[0].id) {
          const apiKeyId = apiKeys[0].id;
          const apiKeyRow = await pool.execute('SELECT api_name FROM api_keys WHERE id = ?', [apiKeyId]);
          const apiKeyName = apiKeyRow[0][0]?.api_name || 'API Anahtarınız';
          const start = new Date(newSubscription[0].start_date).toLocaleDateString('tr-TR');
          const end = new Date(newSubscription[0].end_date).toLocaleDateString('tr-TR');
          const message = `🎉 *Abonelik Kaydınız Başarıyla Oluşturuldu!* 🎉\n\n🗓️  *Başlangıç:*   ${start}\n⏰  *Bitiş:*        ${end}\n🔑  *API Anahtarı:* ${apiKeyName}\n🤖  *Auto Trade:*   Aktif ✅\n\n✨ Artık yeni gelen sinyallerde işlemlere otomatik katılacaksınız!\n💡 *Daha fazla bilgi ve destek için bize ulaşabilirsiniz.*\n\n🙏 Bizi tercih ettiğiniz için teşekkür ederiz!`;
          await pool.execute(
            'INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)',
            [user_id, message]
          );
        }
      }
  
      res.status(201).json(newSubscription[0]);
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: error.message });
    }
});

// Yeni abonelik ekleme endpoint'i
router.post('/admin/members/:memberId/subscriptions', authMiddleware, async (req, res) => {
    try {
      const { memberId } = req.params;
      const { package_id, start_date, end_date } = req.body;
  
      await pool.query(
        'INSERT INTO subscriptions (user_id, package_id, start_date, end_date, status) VALUES (?, ?, ?, ?, "active")',
        [memberId, package_id, start_date, end_date]
      );
  
      // Üyenin subscription_expires_at alanını güncelle
      await pool.query(
        'UPDATE users SET subscription_expires_at = ? WHERE id = ?',
        [end_date, memberId]
      );
  
      res.json({ message: 'Abonelik eklendi' });
    } catch (error) {
      console.error('Abonelik eklenirken hata:', error);
      res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Admin - Update subscription
router.put('/admin/subscriptions/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { package_id, user_id, package_time, package_api_rights, start_date, end_date } = req.body;
      
      await pool.execute(
        `UPDATE enrolled_users 
         SET package_id = ?, user_id = ?, package_time = ?, 
             package_api_rights = ?, start_date = ?, end_date = ? 
         WHERE id = ?`,
        [package_id, user_id, package_time, package_api_rights, start_date, end_date, id]
      );
      
      const [updatedSubscription] = await pool.execute(
        'SELECT * FROM enrolled_users WHERE id = ?',
        [id]
      );
      
      if (updatedSubscription.length === 0) {
        res.status(404).json({ error: 'Abonelik bulunamadı' });
        return;
      }
      
      res.json(updatedSubscription[0]);
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: error.message });
    }
});

// Admin - Delete subscription
router.delete('/admin/subscriptions/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await pool.execute('DELETE FROM enrolled_users WHERE id = ?', [id]);
      res.json({ success: true });
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: error.message });
    }
});

// Abonelik iptal endpoint'i
router.put('/admin/members/:memberId/subscriptions/:subscriptionId/cancel', authMiddleware, async (req, res) => {
    try {
      const { memberId, subscriptionId } = req.params;
  
      await pool.query(
        'UPDATE subscriptions SET status = "cancelled" WHERE id = ? AND user_id = ?',
        [subscriptionId, memberId]
      );
  
      // En son aktif aboneliğin bitiş tarihini bul
      const [rows] = await pool.query(
        'SELECT MAX(end_date) as last_end_date FROM subscriptions WHERE user_id = ? AND status = "active"',
        [memberId]
      );
  
      // Üyenin subscription_expires_at alanını güncelle
      await pool.query(
        'UPDATE users SET subscription_expires_at = ? WHERE id = ?',
        [rows[0].last_end_date, memberId]
      );
  
      res.json({ message: 'Abonelik iptal edildi' });
    } catch (error) {
      console.error('Abonelik iptal edilirken hata:', error);
      res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Admin - Get single subscription by id
router.get('/admin/subscriptions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      `SELECT * FROM enrolled_users WHERE id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Abonelik bulunamadı' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Admin - Get packages for dropdown
router.get('/admin/packages-list', async (req, res) => {
    try {
      const [rows] = await pool.execute('SELECT id, package_name, package_date, package_api_rights, premium_price FROM packages WHERE status = 1');
      res.json(rows);
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: error.message });
    }
});
  
// Kullanıcı arama (id, username, full_name)
router.get('/admin/users-list', async (req, res) => {
    try {
        const { search = '' } = req.query;
        if (!search || search.length < 2) {
            return res.json([]);
        }
        const searchParam = `%${search}%`;
        const [rows] = await pool.execute(
            'SELECT id, username, full_name FROM users WHERE id LIKE ? OR username LIKE ? OR full_name LIKE ? ORDER BY id DESC LIMIT 20',
            [searchParam, searchParam, searchParam]
        );
        // username boşsa full_name kullan
        const result = rows.map(u => ({
            id: u.id,
            username: u.username && u.username.trim() !== '' ? u.username : u.full_name,
            full_name: u.full_name
        }));
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Kullanıcı arama hatası' });
    }
});

// Admin - Get signals with search and pagination
router.get('/admin/signals', async (req, res) => {
    try {
      const { search = '', page = 1, limit = 30 } = req.query;
      const cacheKey = `admin-signals:${search}:${page}`;
      
      // Removed cache logic as per new_code, as positions, open_orders, etc. are now direct API calls.
      // If caching is still desired, it would need to be re-implemented based on the new_code's data structure.
      // For now, we'll just fetch directly.
  
      const offset = (page - 1) * Number(limit);
      let query = `
        SELECT s.id, s.channel_id, s.message_id, s.symbol, s.direction, s.entry1, s.entry2, s.stop_loss, s.tp1, s.tp2, s.tp3, s.tp4, s.tp5, s.tp6, s.tp7, s.tp8, s.tp9, s.tp10, s.status, s.signal_hash, s.open_time, s.open_price, s.close_time, s.close_price, s.tp_hit, s.sl_hit, s.closed_reason, s.profit, s.created_at, s.updated_at, br.room_name
        FROM signals s
        LEFT JOIN bot_rooms br ON s.channel_id = br.room_id
      `;
      const params = [];
      if (search) {
        query += ' WHERE s.symbol LIKE ? OR s.direction LIKE ? OR br.room_name LIKE ?';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      query += ' ORDER BY s.id DESC LIMIT ? OFFSET ?';
      params.push(Number(limit), offset);
  
      const [rows] = await pool.execute(query, params);
      const [totalRows] = await pool.execute('SELECT COUNT(*) as total FROM signals');
  
      const result = {
        signals: rows,
        total: totalRows[0].total,
        page: parseInt(page)
      };
  
      // Removed setCache(cacheKey, result, 300);
      
      res.json(result);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin - Get API settings with search and pagination
router.get('/admin/api-settings', async (req, res) => {
    try {
      const { search = '', page = 1, limit = 30 } = req.query;
      const offset = (page - 1) * limit;
      
      let query = `
        SELECT 
          a.*,
          u.username,
          u.full_name,
          br.room_name
        FROM users_api a
        LEFT JOIN users u ON u.id = a.user_id
        LEFT JOIN bot_rooms br ON br.id = a.bot_room
      `;
      
      let countQuery = 'SELECT COUNT(*) as total FROM users_api';
      const params = [];
      
      if (search) {
        query += ' WHERE a.user_id LIKE ? OR a.api_name LIKE ? OR u.username LIKE ? OR u.full_name LIKE ?';
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam, searchParam);
      }
      
      query += ' ORDER BY a.id DESC LIMIT ? OFFSET ?';
      params.push(Number(limit), Number(offset));
      
      const [rows] = await pool.execute(query, params);
      const [countResult] = await pool.execute(countQuery, search ? params.slice(0, -2) : []);
      
      res.json({
        apiSettings: rows,
        total: countResult[0].total,
        page: Number(page),
        limit: Number(limit)
      });
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: error.message });
    }
});

// Admin - Get all API keys with search and pagination
router.get('/admin/api-keys', async (req, res) => {
    try {
      const { search = '', page = 1, limit = 30 } = req.query;
      const offset = (page - 1) * limit;
      
      let query = `
        SELECT 
          a.*, 
          u.username, 
          u.full_name, 
          br.room_name
        FROM api_keys a
        LEFT JOIN users u ON u.id = a.user_id
        LEFT JOIN bot_rooms br ON br.id = a.bot_room
      `;
      
      let countQuery = 'SELECT COUNT(*) as total FROM api_keys';
      const params = [];
      
      if (search) {
        query += ' WHERE a.user_id LIKE ? OR a.api_name LIKE ? OR u.username LIKE ? OR u.full_name LIKE ?';
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam, searchParam);
      }
      
      query += ' ORDER BY a.id DESC LIMIT ? OFFSET ?';
      params.push(Number(limit), Number(offset));
      
      const [rows] = await pool.execute(query, params);
      const [countResult] = await pool.execute(countQuery, search ? params.slice(0, -2) : []);
      
      res.json({
        api_keys: rows,
        total: countResult[0].total,
        page: Number(page),
        limit: Number(limit)
      });
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: error.message });
    }
});

// API anahtarı silme endpoint'i
router.delete('/admin/members/:memberId/api-keys/:keyId', authMiddleware, async (req, res) => {
    try {
      const { memberId, keyId } = req.params;
  
      await pool.query(
        'DELETE FROM api_keys WHERE id = ? AND user_id = ?',
        [keyId, memberId]
      );
  
      res.json({ message: 'API anahtarı silindi' });
    } catch (error) {
      console.error('API anahtarı silinirken hata:', error);
      res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Yeni API anahtarı ekleme endpoint'i
router.post('/admin/members/:memberId/api-keys', authMiddleware, async (req, res) => {
    try {
      const { memberId } = req.params;
      const { name, api_key, api_secret } = req.body;
  
      await pool.query(
        'INSERT INTO api_keys (user_id, name, api_key, api_secret, status) VALUES (?, ?, ?, ?, true)',
        [memberId, name, api_key, api_secret]
      );
  
      res.json({ message: 'API anahtarı eklendi' });
    } catch (error) {
      console.error('API anahtarı eklenirken hata:', error);
      res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Yeni: Tek bir pozisyonu kapatma (closeOnly)
router.post('/admin/positions/close-single', authMiddleware, async (req, res) => {
    const { apiKeyId, symbol, positionAmt } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM api_keys WHERE id = ?', [apiKeyId]);
        if (!rows.length) {
            return res.status(404).json({ error: 'API anahtarı bulunamadı' });
        }
        const api = rows[0];
        const borsa = await getBorsaInstance(api);
        if (!borsa) {
            return res.status(400).json({ error: 'Desteklenmeyen borsa tipi' });
        }

        const side = parseFloat(positionAmt) > 0 ? 'SELL' : 'BUY';
        const quantity = Math.abs(parseFloat(positionAmt));

        // order_send(symbol, side, type, amount, price, cls=1 for reduceOnly)
        const result = await borsa.order_send(symbol, side, 'MARKET', quantity, 0, 1);

        res.json({ success: true, message: `Pozisyon kapatma emri gönderildi: ${symbol}`, result });
    } catch (error) {
        console.error('Tekli pozisyon kapatılırken hata:', error);
        res.status(500).json({ error: 'Pozisyon kapatılamadı', detail: error.message });
    }
});

// Yeni: Tüm pozisyonları kapatma (closeOnly)
router.post('/admin/positions/close-all', authMiddleware, async (req, res) => {
    const { apiKeyId } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM api_keys WHERE id = ?', [apiKeyId]);
        if (!rows.length) {
            return res.status(404).json({ error: 'API anahtarı bulunamadı' });
        }
        const api = rows[0];
        const borsa = await getBorsaInstance(api);
        if (!borsa) {
            return res.status(400).json({ error: 'Desteklenmeyen borsa tipi' });
        }

        let openPositions = [];
        if (api.api_type === 1) { // Binance
            const allPositions = await borsa.call('/fapi/v2/positionRisk', 1, {}, 'GET');
            openPositions = (Array.isArray(allPositions) ? allPositions : []).filter(p => Number(p.positionAmt) !== 0);
        } else { // Bybit & BingX
            openPositions = await borsa.open_positions();
        }

        const results = [];
        for (const pos of openPositions) {
            const symbol = pos.symbol;
            const positionAmt = pos.positionAmt;
            const side = parseFloat(positionAmt) > 0 ? 'SELL' : 'BUY';
            const quantity = Math.abs(parseFloat(positionAmt));
            
            try {
                const result = await borsa.order_send(symbol, side, 'MARKET', quantity, 0, 1);
                results.push({ symbol, success: true, result });
            } catch (e) {
                results.push({ symbol, success: false, error: e.message });
            }
        }

        res.json({ success: true, message: 'Tüm pozisyonlar için kapatma emirleri gönderildi.', results });
    } catch (error) {
        console.error('Tüm pozisyonlar kapatılırken hata:', error);
        res.status(500).json({ error: 'Pozisyonlar kapatılamadı', detail: error.message });
    }
});

// Yeni: Seçili pozisyonları kapatma (closeOnly)
router.post('/admin/positions/close-selected', authMiddleware, async (req, res) => {
    const { apiKeyId, positions } = req.body;

    if (!Array.isArray(positions) || positions.length === 0) {
        return res.status(400).json({ error: 'Kapatılacak pozisyon seçilmedi.' });
    }

    try {
        const [rows] = await pool.query('SELECT * FROM api_keys WHERE id = ?', [apiKeyId]);
        if (!rows.length) {
            return res.status(404).json({ error: 'API anahtarı bulunamadı' });
        }
        const api = rows[0];
        const borsa = await getBorsaInstance(api);
        if (!borsa) {
            return res.status(400).json({ error: 'Desteklenmeyen borsa tipi' });
        }

        const results = [];
        for (const pos of positions) {
            const { symbol, positionAmt } = pos;
            const side = parseFloat(positionAmt) > 0 ? 'SELL' : 'BUY';
            const quantity = Math.abs(parseFloat(positionAmt));
            
            try {
                // order_send(symbol, side, type, amount, price, cls=1 for reduceOnly)
                const result = await borsa.order_send(symbol, side, 'MARKET', quantity, 0, 1);
                results.push({ symbol, success: true, result });
            } catch (e) {
                results.push({ symbol, success: false, error: e.message });
            }
        }

        res.json({ success: true, message: 'Seçili pozisyonlar için kapatma emirleri gönderildi.', results });
    } catch (error) {
        console.error('Seçili pozisyonlar kapatılırken hata:', error);
        res.status(500).json({ error: 'Pozisyonlar kapatılamadı', detail: error.message });
    }
});

// Admin - Get user_signals with search and pagination
router.get('/admin/user_signals', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 30 } = req.query;
    const offset = (page - 1) * Number(limit);
    
    let query = `
      SELECT 
        us.*,
        u.username,
        u.full_name,
        ak.api_name
      FROM user_signals us
      LEFT JOIN users u ON us.user_id = u.id
      LEFT JOIN api_keys ak ON us.api_id = ak.id
    `;
    let countQuery = `
      SELECT COUNT(*) as total
      FROM user_signals us
      LEFT JOIN users u ON us.user_id = u.id
      LEFT JOIN api_keys ak ON us.api_id = ak.id
    `;

    const params = [];
    const countParams = [];

    if (search) {
      const searchCondition = ' WHERE u.username LIKE ? OR u.full_name LIKE ? OR ak.api_name LIKE ? OR us.symbol LIKE ? OR us.trend LIKE ? OR us.strateji LIKE ? OR us.ticket LIKE ? OR us.event LIKE ?';
      query += searchCondition;
      countQuery += searchCondition;
      const searchParam = `%${search}%`;
      // Add searchParam for each placeholder
      const searchParams = Array(8).fill(searchParam);
      params.push(...searchParams);
      countParams.push(...searchParams);
    }

    query += ' ORDER BY us.id DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const [rows] = await pool.execute(query, params);
    const [totalRowsResult] = await pool.execute(countQuery, countParams);

    res.json({ user_signals: rows, total: totalRowsResult[0].total, page: parseInt(page) });
  } catch (error) {
    console.error('user_signals alınırken hata:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Admin - Get bot_logs with search and pagination
router.get('/admin/bot_logs', async (req, res) => {
  try {
    const { signals_id = '', user_id = '', user_signals_id = '', channel_id = '', page = 1 } = req.query;
    const limit = parseInt(req.query.limit) || 30;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM bot_logs';
    let countQuery = 'SELECT COUNT(*) as total FROM bot_logs';
    const params = [];
    
    if (signals_id) { query += ' WHERE signals_id LIKE ?'; params.push(`%${signals_id}%`); }
    if (user_id) { query += ' AND user_id LIKE ?'; params.push(`%${user_id}%`); }
    if (user_signals_id) { query += ' AND user_signals_id LIKE ?'; params.push(`%${user_signals_id}%`); }
    if (channel_id) { query += ' AND channel_id LIKE ?'; params.push(`%${channel_id}%`); }
    query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);
    
    const [rows] = await pool.execute(query, params);
    // Toplam kayıt sayısı için aynı filtrelerle count
    let countParams = [];
    if (signals_id) { countQuery += ' AND signals_id LIKE ?'; countParams.push(`%${signals_id}%`); }
    if (user_id) { countQuery += ' AND user_id LIKE ?'; countParams.push(`%${user_id}%`); }
    if (user_signals_id) { countQuery += ' AND user_signals_id LIKE ?'; countParams.push(`%${user_signals_id}%`); }
    if (channel_id) { countQuery += ' AND channel_id LIKE ?'; countParams.push(`%${channel_id}%`); }
    const [totalRows] = await pool.execute(countQuery, countParams);
    res.json({ bot_logs: rows, total: totalRows[0].total, page: parseInt(page) });
  } catch (error) {
    console.error('bot_logs alınırken hata:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Sinyali kapat (status = 'closed')
router.post('/admin/signals/:id/close', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('UPDATE signals SET status = ? WHERE id = ?', ['closed', id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Sinyal bulunamadı' });
    }
    res.json({ success: true, message: 'Sinyal kapatıldı' });
  } catch (e) {
    res.status(500).json({ error: 'Sinyal kapatılamadı', detail: e.message });
  }
});

// Belirli bir sinyale bağlı tüm user_signals kayıtlarını kapat (status = 5)
router.post('/admin/user_signals/close-by-signal/:signal_id', authMiddleware, async (req, res) => {
  const { signal_id } = req.params;
  try {
    const [result] = await pool.query('UPDATE user_signals SET status = 5 WHERE signal_id = ? AND status != 5', [signal_id]);
    res.json({ success: true, message: 'Tüm ilgili user_signals kayıtları kapatıldı', affected: result.affectedRows });
  } catch (e) {
    res.status(500).json({ error: 'User signals kapatılamadı', detail: e.message });
  }
});

// Rates tablosu verilerini dönen endpoint
router.get('/admin/rates', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT symbol, price, digits, vdigits, stepSize, tickSize, dates FROM rates');
    res.json(rows);
  } catch (error) {
    console.error('Rates alınırken hata:', error);
    res.status(500).json({ error: 'Rates alınamadı', detail: error.message });
  }
});


export default router;
