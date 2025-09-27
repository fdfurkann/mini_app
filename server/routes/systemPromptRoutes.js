import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// System Prompt güncelleme endpoint'i
router.put('/system_prompt/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { question, answer } = req.body;
      if (!question && !answer) {
        return res.status(400).json({ error: 'En az bir alan güncellenmeli' });
      }
      let updateQuery = 'UPDATE system_prompt SET ';
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
        return res.status(404).json({ error: 'Prompt bulunamadı' });
      }
      res.json({ message: 'Prompt başarıyla güncellendi' });
    } catch (error) {
      console.error('System Prompt güncelleme hatası:', error);
      res.status(500).json({ error: 'Prompt güncellenemedi' });
    }
});

// System Prompt silme endpoint'i
router.delete('/system_prompt/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const [result] = await pool.query(
        'UPDATE system_prompt SET status = 0 WHERE id = ?',
        [id]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Prompt bulunamadı' });
      }
      res.json({ message: 'Prompt başarıyla silindi' });
    } catch (error) {
      console.error('System Prompt silme hatası:', error);
      res.status(500).json({ error: 'Prompt silinemedi' });
    }
});

// System Prompt listeleme endpoint'i
router.get('/system_prompt', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT id, question, answer FROM system_prompt WHERE status = 1 ORDER BY id ASC');
      res.json(rows);
    } catch (error) {
      console.error('System Prompt listeleme hatası:', error);
      res.status(500).json({ error: 'Prompt verileri alınamadı' });
    }
});

// System Prompt ekleme endpoint'i
router.post('/system_prompt', authMiddleware, async (req, res) => {
    try {
      const { question, answer } = req.body;
      if (!question || !answer) {
        return res.status(400).json({ error: 'Başlık ve içerik zorunludur.' });
      }
      const [result] = await pool.query(
        'INSERT INTO system_prompt (question, answer, status) VALUES (?, ?, 1)',
        [question, answer]
      );
      res.json({ message: 'Prompt başarıyla eklendi', id: result.insertId });
    } catch (error) {
      console.error('System Prompt ekleme hatası:', error);
      res.status(500).json({ error: 'Prompt eklenemedi' });
    }
});

export default router; 