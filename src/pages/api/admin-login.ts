import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id, password } = req.body;

  if (!id || !password) {
    return res.status(400).json({ error: 'id ve password gerekli' });
  }

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // Virgülle ayrılmış ID'leri kontrol et
    const [adminRows] = await connection.execute(
      'SELECT admin_users, adminpass FROM app_admin WHERE admin_users LIKE CONCAT(\'%\', ?, \'%\')',
      [id]
    );

    if (!Array.isArray(adminRows) || adminRows.length === 0) {
      await connection.end();
      return res.status(403).json({ success: false, message: 'Yetkisiz erişim' });
    }

    const adminData = adminRows[0] as { admin_users: string; adminpass: string };
    
    // ID'nin gerçekten listede olup olmadığını kontrol et
    const adminIds = adminData.admin_users.split(',').map(id => id.trim());
    if (!adminIds.includes(id.toString())) {
      await connection.end();
      return res.status(403).json({ success: false, message: 'Yetkisiz erişim' });
    }
    
    // Şifre kontrolü
    if (adminData.adminpass === password) {
      await connection.end();
      return res.status(200).json({ success: true });
    } else {
      await connection.end();
      return res.status(401).json({ success: false, message: 'Yanlış şifre' });
    }

  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ message: 'Database error' });
  }
} 