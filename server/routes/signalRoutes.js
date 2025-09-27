import { Router } from 'express';
import pool from '../db.js';
import { getFromCache, setCache } from '../cache.js';

const router = Router();

// Get all signals for a user
router.get('/signals', async (req, res) => {
    try {
      const userId = req.query.user_id;
      console.log('GET /api/signals - Request received');
      console.log('Query parameters:', req.query);
      console.log('Fetching signals for user:', userId);
      
      if (!userId) {
        console.log('No user_id provided in query');
        res.status(400).json({ error: 'user_id is required' });
        return;
      }
  
      // Burada önce tablo yapısını kontrol etmek için tüm sütunları alıyoruz
      const [columns] = await pool.execute(
        'SHOW COLUMNS FROM user_signals'
      );
      
      console.log('Table columns:', columns.map(col => col.Field));
      
      // Tarih sütununa göre sıralama - created_at yerine timestamp veya diğer uygun bir sütunu kullan
      const [rows] = await pool.execute(
        'SELECT us.*, r.digits, r.vdigits FROM user_signals us LEFT JOIN rates r ON us.symbol = r.symbol WHERE us.user_id = ? ORDER BY us.id DESC',
        [userId]
      );
      
      console.log('Signals found:', rows.length);
      res.json(rows);
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get specific signal by ID
  router.get('/signals/:id', async (req, res) => {
    try {
      const userId = req.query.user_id;
      const signalId = req.params.id;
      console.log('GET /api/signals/:id - Request received');
      console.log('Fetching signal ID:', signalId, 'for user:', userId);
      
      if (!userId) {
        console.log('No user_id provided in query');
        res.status(400).json({ error: 'user_id is required' });
        return;
      }
  
      const [rows] = await pool.execute(
        'SELECT * FROM user_signals WHERE id = ? AND user_id = ?',
        [signalId, userId]
      );
      
      if (rows.length === 0) {
        console.log('No signal found with ID:', signalId);
        res.status(404).json({ error: 'Sinyal bulunamadı' });
        return;
      }
      
      res.json(rows[0]);
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get all signals from signals table
  router.get('/signals2', async (req, res) => {
    try {
      let search = req.query.search || '';
      let page = parseInt(req.query.page, 10);
      let limit = parseInt(req.query.limit, 10);
      if (isNaN(page) || page < 1) page = 1;
      if (isNaN(limit) || limit < 1) limit = 30;
      if (limit > 500) limit = 500;
      const offset = (page - 1) * limit;
      const cacheKey = `signals:${search}:${page}:${limit}`;
      // Redis'ten önbelleklenmiş veriyi kontrol et
      const cachedData = getFromCache(cacheKey);
      if (cachedData) {
        return res.json(cachedData);
      }
      let query = `
        SELECT 
          s.*,
          br.room_name,
          COUNT(*) OVER() as total_count
        FROM signals s
        LEFT JOIN bot_rooms br ON s.channel_id = br.room_id
      `;
      if (search) {
        query += ` WHERE s.symbol LIKE '%${search}%' OR s.trend LIKE '%${search}%' OR br.room_name LIKE '%${search}%'`;
      }
      query += ` ORDER BY s.id DESC LIMIT ${limit} OFFSET ${offset}`;
      
      console.log('Query:', query);
      
      const [rows] = await pool.query(query);
      
      const response = {
        signals: rows,
        total: rows.length > 0 ? rows[0].total_count : 0,
        page: parseInt(page),
        limit: parseInt(limit)
      };
      
      // Veriyi Redis'e önbellekle (5 dakika TTL)
      setCache(cacheKey, response, 300);
      
      res.json(response);
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: error.message });
    }
  });

// Kullanıcıdan sinyal ekleme (POST /signals)
router.post('/signals', async (req, res) => {
  try {
    const { user_id, symbol, trend, slPercentage, entryRangePercentage, tpCount, tpRangePercentage, message_id } = req.body;
    if (!user_id || !symbol || !trend) {
      return res.status(400).json({ error: 'user_id, symbol ve trend zorunludur' });
    }
    // channel_id negatif user_id olarak ayarlanır
    const channel_id = -Math.abs(parseInt(user_id));
    // message_id artık api_id olarak atanacak
    const msg_id = message_id ? parseInt(message_id) : 0;
    // Fiyatı rates tablosundan çek
    const [rateInfoRows] = await pool.execute('SELECT price, digits FROM rates WHERE symbol = ? ORDER BY id DESC LIMIT 1', [symbol]);
    if (!rateInfoRows || rateInfoRows.length === 0) {
      return res.status(400).json({ error: 'Fiyat bulunamadı' });
    }
    const currentPrice = parseFloat(rateInfoRows[0].price);
    const pricePrecision = parseInt(rateInfoRows[0].digits);
    const entryRangeHalfPercent = parseFloat(entryRangePercentage) / 2;
    let entry1, entry2, stop_loss;
    const takeProfits = {};
    if ((trend === 'BUY' || trend === 'LONG')) {
      entry1 = parseFloat((currentPrice * (1 - entryRangeHalfPercent / 100)).toFixed(pricePrecision));
      entry2 = parseFloat((currentPrice * (1 + entryRangeHalfPercent / 100)).toFixed(pricePrecision));
      stop_loss = parseFloat((entry1 * (1 - parseFloat(slPercentage) / 100)).toFixed(pricePrecision));
      for (let i = 1; i <= tpCount; i++) {
        takeProfits[`tp${i}`] = parseFloat((entry2 * (1 + (parseFloat(tpRangePercentage) * i) / 100)).toFixed(pricePrecision));
      }
    } else {
      entry1 = parseFloat((currentPrice * (1 + entryRangeHalfPercent / 100)).toFixed(pricePrecision));
      entry2 = parseFloat((currentPrice * (1 - entryRangeHalfPercent / 100)).toFixed(pricePrecision));
      stop_loss = parseFloat((entry1 * (1 + parseFloat(slPercentage) / 100)).toFixed(pricePrecision));
      for (let i = 1; i <= tpCount; i++) {
        takeProfits[`tp${i}`] = parseFloat((entry2 * (1 - (parseFloat(tpRangePercentage) * i) / 100)).toFixed(pricePrecision));
      }
    }
    // Sinyal hash'i oluştur
    const signal_hash = `${symbol}_${trend}_${user_id}_${Date.now()}`;
    // Insert query (user_id yok!)
    const insertQuery = `INSERT INTO signals (channel_id, message_id, symbol, direction, entry1, entry2, stop_loss, tp1, tp2, tp3, tp4, tp5, tp6, tp7, tp8, tp9, tp10, status, signal_hash, profit, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const queryParams = [
      channel_id, msg_id, symbol, (trend === 'BUY' ? 'LONG' : trend === 'SELL' ? 'SHORT' : trend),
      entry1, entry2, stop_loss,
      takeProfits.tp1 || null, takeProfits.tp2 || null, takeProfits.tp3 || null, takeProfits.tp4 || null, takeProfits.tp5 || null,
      takeProfits.tp6 || null, takeProfits.tp7 || null, takeProfits.tp8 || null, takeProfits.tp9 || null, takeProfits.tp10 || null,
      'created', signal_hash, 0, new Date(), new Date()
    ];
    await pool.execute(insertQuery, queryParams);
    res.json({ success: true });
  } catch (error) {
    console.error('Sinyal ekleme hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router; 