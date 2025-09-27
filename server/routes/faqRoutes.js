import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();


// FAQ güncelleme endpoint'i
router.put('/faq/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { question, answer } = req.body;
      
      if (!question && !answer) {
        return res.status(400).json({ error: 'En az bir alan güncellenmeli' });
      }
  
      let updateQuery = 'UPDATE faq SET ';
      let updateValues = [];
      let updateFields = [];
  
      if (question) {
        updateFields.push('question = ?');
        updateValues.push(question);
      }
      
      if (answer) {
        updateFields.push('answer = ?');
        updateValues.push(answer);
      }
  
      updateQuery += updateFields.join(', ') + ' WHERE id = ?';
      updateValues.push(id);
  
      const [result] = await pool.query(updateQuery, updateValues);
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'S.S.S bulunamadı' });
      }
  
      res.json({ message: 'S.S.S başarıyla güncellendi' });
    } catch (error) {
      console.error('FAQ güncelleme hatası:', error);
      res.status(500).json({ error: 'S.S.S güncellenemedi' });
    }
});

// FAQ silme endpoint'i
router.delete('/faq/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
  
      const [result] = await pool.query(
        'UPDATE faq SET status = 0 WHERE id = ?',
        [id]
      );
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'S.S.S bulunamadı' });
      }
  
      res.json({ message: 'S.S.S başarıyla silindi' });
    } catch (error) {
      console.error('FAQ silme hatası:', error);
      res.status(500).json({ error: 'S.S.S silinemedi' });
    }
});

// SSS (FAQ) listeleme endpoint'i (kullanıcıya açık)
router.get('/faq', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT id, question, answer FROM faq WHERE status = 1 ORDER BY id ASC');
      res.json(rows);
    } catch (error) {
      console.error('FAQ listeleme hatası:', error);
      res.status(500).json({ error: 'S.S.S verileri alınamadı' });
    }
});

// SSS (FAQ) ekleme endpoint'i (sadece admin)
router.post('/faq', authMiddleware, async (req, res) => {
    try {
      const { question, answer } = req.body;
      if (!question || !answer) {
        return res.status(400).json({ error: 'Soru ve cevap zorunludur.' });
      }
      const [result] = await pool.query(
        'INSERT INTO faq (question, answer, status) VALUES (?, ?, 1)',
        [question, answer]
      );
      res.json({ message: 'S.S.S başarıyla eklendi', id: result.insertId });
    } catch (error) {
      console.error('FAQ ekleme hatası:', error);
      res.status(500).json({ error: 'S.S.S eklenemedi' });
    }
});

export default router; 