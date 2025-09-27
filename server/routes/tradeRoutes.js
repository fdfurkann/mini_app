import { Router } from 'express';
import pool from '../db.js';

const router = Router();


// Açık işlemleri getir
router.get('/trades/open', async (req, res) => {
    const { userId } = req.query;
  
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
  
    try {
      // Açık işlemleri al
      const [trades] = await pool.execute(
        'SELECT us.*, ak.api_name, ak.api_type FROM user_signals us LEFT JOIN api_keys ak ON us.api_id = ak.id WHERE us.user_id = ? and us.open>0 AND us.status = 1 ORDER BY us.id DESC LIMIT 5',
        [userId]
      );
      
      // İşlem sembolleri için rates tablosundan güncel fiyatları al
      if (trades.length > 0) {
        // Unique sembolleri al
        const symbols = [...new Set(trades.map(trade => trade.symbol))];
        
        // Rates tablosundan sembollerin fiyat bilgilerini çek
        const symbolPlaceholders = symbols.map(() => '?').join(',');
        const [rates] = await pool.execute(
          `SELECT symbol, price FROM rates WHERE symbol IN (${symbolPlaceholders})`,
          symbols
        );
        
        // Fiyatları hızlı erişim için objeye dönüştür
        const currentPrices = {};
        rates.forEach(rate => {
          currentPrices[rate.symbol] = parseFloat(rate.price);
        });
        
        // Kâr/zarar hesaplamasını yap
        trades.forEach(trade => {
          const currentPrice = currentPrices[trade.symbol];
          if (currentPrice && trade.open > 0) {
            const leverage = trade.levelage || 1;
            if (trade.trend === 'LONG') {
              trade.profit = ((currentPrice - trade.open) / trade.open) * 100 * leverage;
            } else {
              trade.profit = ((trade.open - currentPrice) / trade.open) * 100 * leverage;
            }
            
            // USDT cinsinden kâr/zarar
            const positionValue = trade.volume * trade.open;
            trade.profit_usdt = (positionValue * trade.profit) / 100;
          }
          // --- exchange alanını api_name'den ata ---
          trade.exchange = trade.api_name || 'Bilinmiyor';
        });
      }
      
      res.json(trades);
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
});

// Tüm işlemleri getir
router.get('/trades/all', async (req, res) => {
    const { userId } = req.query;
  
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
  
    try {
      const [trades] = await pool.execute(
        'SELECT us.*, ak.api_name, ak.api_type FROM user_signals us LEFT JOIN api_keys ak ON us.api_id = ak.id WHERE us.user_id = ? AND us.close > 0 ORDER BY us.id DESC LIMIT 5',
        [userId]
      );

      // exchange alanını ata
      trades.forEach(trade => {
        if (trade.api_type == 1) trade.exchange = 'binance';
        else if (trade.api_type == 2) trade.exchange = 'bybit';
        else if (trade.api_type == 3) trade.exchange = 'bingx';
        else trade.exchange = trade.api_name || 'Bilinmiyor';
      });

      res.json(trades);
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
});

// Açık işlemi manuel kapat
router.post('/trades/close', async (req, res) => {
    const { user_signal_id } = req.body;
    if (!user_signal_id) {
        return res.status(400).json({ message: 'user_signal_id zorunludur' });
    }
    try {
        await pool.execute('UPDATE user_signals SET status = 5 WHERE id = ?', [user_signal_id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Manuel kapama hatası:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;