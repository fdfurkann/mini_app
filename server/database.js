import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env dosyasını yükle
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('Database Config:', {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

// MySQL connection pool
export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Login kontrol fonksiyonu
export async function login_check(user_id, login_hash) {
  if (!user_id || !login_hash) return false;

  try {
    const [rows] = await pool.execute(
      'SELECT id FROM users WHERE id = ? AND login_hash = ?',
      [user_id, login_hash]
    );
    return rows.length > 0;
  } catch (error) {
    console.error('Login check error:', error);
    return false;
  }
} 