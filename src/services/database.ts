import mysql from 'mysql2/promise';

let isDatabaseConnected = false;
let connectionError: string | null = null;

// Create a connection to test database access
const testConnection = async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'orcatradebot'
    });
    
    console.log('Database connection test successful');
    isDatabaseConnected = true;
    connectionError = null;
    await connection.end();
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    isDatabaseConnected = false;
    if (error instanceof Error) {
      connectionError = error.message;
    } else {
      connectionError = 'Veritabanına bağlanılamadı';
    }
    return false;
  }
};

// Test the connection immediately
testConnection();

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'orcatradebot',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export interface User {
  id: number;
  name: string;
  username: string;
  created_at: Date;
}

export const checkDatabaseConnection = () => {
  return {
    isConnected: isDatabaseConnected,
    error: connectionError
  };
};

export const getUserById = async (id: number): Promise<User | null> => {
  try {
    if (!isDatabaseConnected) {
      throw new Error(connectionError || 'Veritabanı bağlantısı kurulamadı');
    }

    console.log('Attempting to connect to database...');
    
    const connection = await pool.getConnection();
    console.log('Database connection established');
    
    try {
      console.log('Executing query for id:', id);
      const [rows] = await connection.execute(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );
      
      console.log('Query result:', rows);
      
      const users = rows as User[];
      if (users.length > 0) {
        console.log('User found:', users[0]);
        return users[0];
      } else {
        console.log('No user found with id:', id);
        return null;
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Database error details:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
    throw new Error('Veritabanı işlemi sırasında bir hata oluştu');
  }
};

// Periodically check database connection
setInterval(testConnection, 30000); // Her 30 saniyede bir bağlantıyı kontrol et

export default pool; 