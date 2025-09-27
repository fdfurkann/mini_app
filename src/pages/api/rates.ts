import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { symbol } = req.query;

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // Eğer sembol parametresi belirtilmişse, sadece o sembolün fiyatını getir
    if (symbol) {
      const [rows] = await connection.execute(
        'SELECT symbol, price, dates, digits, vdigits FROM rates WHERE symbol = ?',
        [symbol]
      );
      
      await connection.end();
      // rows bir array olacaktır
      return res.status(200).json(Array.isArray(rows) && rows.length > 0 ? rows[0] : null);
    } else {
      // Sembol belirtilmemişse tüm fiyatları getir
      const [rows] = await connection.execute(
        'SELECT symbol, price, dates, digits, vdigits FROM rates ORDER BY symbol ASC'
      );
      
      await connection.end();
      return res.status(200).json(rows);
    }
  } catch (error) {
    console.error('Rates API error:', error);
    return res.status(500).json({ message: 'Fiyat bilgileri alınırken hata oluştu' });
  }
}; 