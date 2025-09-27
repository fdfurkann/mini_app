import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'id query parametresi eksik' });
  }

  console.log('Checking admin status for id:', id);

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('Database connected successfully');

    // Basit bir sorgu ile direk ID'yi kontrol edelim
    const [rows] = await connection.execute(
      'SELECT * FROM app_admin WHERE admin_users REGEXP ?',
      [`(^|,)${id}(,|$)`]
    );

    console.log('Query result:', rows);

    await connection.end();

    const isAdmin = Array.isArray(rows) && rows.length > 0;
    console.log('Is admin:', isAdmin);

    return res.status(200).json({ isAdmin });

  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ message: 'Database error', error: error.message });
  }
} 