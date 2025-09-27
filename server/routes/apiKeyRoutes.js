import { Router } from 'express';
import pool from '../db.js';

const router = Router();
const debug = 1;

// API Keys endpoint'i
router.get('/keys', async (req, res) => {
    try {
      const { user_id } = req.query;
      if (!user_id) {
        return res.status(400).json({ error: 'User ID gerekli' });
      }
  
      // Veritabanından api_keys tablosundan sorgula
      const [rows] = await pool.execute(
        'SELECT * FROM api_keys WHERE user_id = ? ORDER BY id DESC',
        [user_id]
      );
  
      res.json(rows);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      res.status(500).json({ error: 'API anahtarları alınamadı' });
    }
  });
  
  // Get API keys for a specific enrollment
  router.get('/keys/enrollment/:enrollmentId', async (req, res) => {
    const { enrollmentId } = req.params;
  
    if (!enrollmentId) {
      return res.status(400).json({ error: 'Enrollment ID gerekli' });
    }
  
    try {
      console.log('Fetching API keys for enrolled_id:', enrollmentId);
      // api_keys tablosunda enrolled_id bir sütun 
      const [rows] = await pool.execute(
        'SELECT id, api_name, api_key FROM api_keys WHERE enrolled_id = ? ORDER BY id DESC',
        [enrollmentId]
      );
  
      if (rows.length === 0) {
        console.log('No API keys found for enrolled_id:', enrollmentId);
        return res.json([]); 
      }
  
      console.log('API keys found for enrolled_id:', enrollmentId, 'count:', rows.length);
      res.json(rows);
  
    } catch (error) {
      console.error('Error fetching API keys for enrollment:', error);
      res.status(500).json({ error: 'Üyelik için API anahtarları alınırken sunucu hatası oluştu: ' + error.message });
    }
  });
  
  // API Key ekleme endpoint'i
  router.post('/keys', async (req, res) => {
    try {
      const { user_id, api_name, api_key, api_secret } = req.body;
      
      if (!user_id || !api_name || !api_key || !api_secret) {
        return res.status(400).json({ error: 'Tüm alanlar gerekli' });
      }
  
      const defaultSettings = {
        lotsize: '6',
        leverage: 20,
        margin_type: 'ISOLATED',
        max_orders: 10,
        auto_trade: 1,
        stop_loss: 0,
        stop_loss_settings: 'signal',
        percent_loss: null,
        stop_amount: null,
        take_profit: null,
        take_profit_trading_setting: null,
        signal_profit: null,
        percent_profit: null,
        tp0: null,
        tp1: '20',
        tp2: '20',
        tp3: '20',
        tp4: '20',
        tp5: '20',
        tp6: '20',
        tp7: '20',
        tp8: '20',
        tp9: '20',
        tp10: '20',
        is_profit_target_enabled: null,
        profit_amount: null,
        profit_target_amount: null,
        withdraw_to_cost: null,
        trail_stop: 0,
        sl_tp_order: 0,
        break_even_level: 'none',
        status: 1
      };
  
      const columns = ['user_id', 'api_name', 'api_key', 'api_secret'];
      const values = [user_id, api_name, api_key, api_secret];
      if (typeof req.body.bot_room !== 'undefined') {
        columns.push('bot_room');
        values.push(req.body.bot_room);
      }
      columns.push(...Object.keys(defaultSettings));
      values.push(...Object.values(defaultSettings));
      const placeholders = columns.map(() => '?').join(', ');
      const sql = `INSERT INTO api_keys (${columns.join(', ')}, created_at, updated_at) VALUES (${placeholders}, NOW(), NOW())`;
  
      const [result] = await pool.execute(sql, values);
  
      const [newKey] = await pool.execute(
        'SELECT * FROM api_keys WHERE id = ?',
        [result.insertId]
      );
  
      res.json(newKey[0]);
    } catch (error) {
      console.error('Error adding API key:', error);
      res.status(500).json({ error: 'API anahtarı eklenemedi' });
    }
  });
  
  // API Key güncelleme endpoint'i
  router.put('/keys/:id', async (req, res) => {
    if (debug) {
      console.log(`[PUT] ${req.originalUrl}   data:`, req.body);
    }
    try {
      const { id } = req.params;
      const allowedFields = ['user_id', 'api_name', 'api_key', 'api_secret', 'api_type', 'bot_room', 'enrolled_id'];
      const updates = [];
      const params = [];
      for (const field of allowedFields) {
        if (typeof req.body[field] !== 'undefined') {
          updates.push(`${field} = ?`);
          let value = req.body[field];
          if ((field === 'bot_room' || field === 'enrolled_id') && (value === '' || value === 0)) {
            value = null;
          }
          params.push(value);
        }
      }
      if (updates.length === 0) {
        return res.status(400).json({ error: 'Güncellenecek alan yok' });
      }
      updates.push('updated_at = NOW()');
      const sql = `UPDATE api_keys SET ${updates.join(', ')} WHERE id = ?`;
      params.push(id);
      await pool.execute(sql, params);
      const [updatedKey] = await pool.execute('SELECT * FROM api_keys WHERE id = ?', [id]);
      res.json(updatedKey[0]);
    } catch (error) {
      console.error('Error updating API key:', error);
      res.status(500).json({ error: 'API anahtarı güncellenemedi' });
    }
  });
  
  // API Key silme endpoint'i
  router.delete('/keys/:id', async (req, res) => {
    if (debug) {
      console.log(`[DELETE] ${req.originalUrl}   data:`, req.query);
    }
    try {
      const { id } = req.params;
      const { user_id } = req.query;
  
      console.log('Silme isteği alındı:', { id, user_id });
  
      if (!user_id) {
        return res.status(400).json({ error: 'User ID gerekli' });
      }
  
      await pool.execute(
        'DELETE FROM api_keys WHERE id = ? AND user_id = ?',
        [id, user_id]
      );
  
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting API key:', error);
      res.status(500).json({ error: 'API anahtarı silinemedi' });
    }
  });
  
  // API Key detay görüntüleme endpoint'i (ID'ye göre)
  router.get('/keys/:id', async (req, res) => {
    try {
      const { id } = req.params;
  
      const [rows] = await pool.execute(
        'SELECT * FROM api_keys WHERE id = ?',
        [id]
      );
  
      if (rows.length === 0) {
        return res.status(404).json({ error: 'API anahtarı bulunamadı' });
      }
  
      res.json(rows[0]);
    } catch (error) {
      console.error('Error fetching API key:', error);
      res.status(500).json({ error: 'API anahtarı alınamadı' });
    }
  });
  
  // API Key ayarlarını güncelleme endpoint'i
  router.put('/keys/settings/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const settings = req.body;


      const [checkRows] = await pool.execute(
        'SELECT id FROM api_keys WHERE id = ?',
        [id]
      );
  
      if (checkRows.length === 0) {
        return res.status(404).json({ error: 'API anahtarı bulunamadı' });
      }
  
      // id hariç anahtarlar
      const keys = Object.keys(settings).filter(key => key !== 'id');
      const setClause = keys.map(key => `${key} = ?`).join(', ');
      const params = keys.map(key => settings[key]);
      params.push(id);
  
      console.log('[updateApiKeySettings] Gelen settings:', settings);
      console.log('[updateApiKeySettings] Güncellenecek alanlar:', keys);
      console.log('[updateApiKeySettings] SQL Query:', `UPDATE api_keys SET ${setClause}, updated_at = NOW() WHERE id = ?`);
      console.log('[updateApiKeySettings] Parametreler:', params);
  
      await pool.execute(
        `UPDATE api_keys SET ${setClause}, updated_at = NOW() WHERE id = ?`,
        params
      );
  
      console.log('[updateApiKeySettings] Güncelleme başarılı');
  
      const [updatedKey] = await pool.execute(
        'SELECT * FROM api_keys WHERE id = ?',
        [id]
      );
  
      console.log('[updateApiKeySettings] Güncellenmiş veri:', updatedKey[0]);
      res.json(updatedKey[0]);
    } catch (error) {
      console.error('[updateApiKeySettings] Hata:', error);
      console.error('[updateApiKeySettings] Hata detayı:', error.message);
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        console.error('[updateApiKeySettings] Veritabanında olmayan alan:', error.sqlMessage);
      }
      res.status(500).json({ error: 'API anahtarı ayarları güncellenemedi: ' + error.message });
    }
  });
  

export default router; 