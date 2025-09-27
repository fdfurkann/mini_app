import type { Request, Response } from 'express';
import mysql from 'mysql2/promise';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: 'Şifre gerekli' });
  }

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // Sadece şifre kontrolü yap
    const [rows] = await connection.execute(
      'SELECT adminpass FROM app_admin WHERE adminpass = ?',
      [password]
    );

    await connection.end();

    // Şifre doğru mu?
    if (Array.isArray(rows) && rows.length > 0) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(401).json({ success: false, message: 'Şifre yanlış' });
    }

  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ message: 'Database error', error: error.message });
  }
} 