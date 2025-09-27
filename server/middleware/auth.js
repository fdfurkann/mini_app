import pool from '../db.js';

const debug = 1; // Or import from a config file

// Login kontrol fonksiyonu
async function login_check(user_id, login_hash) {
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

// Auth middleware
const authMiddleware = async (req, res, next) => {
  // /api/validate-telegram-auth için middleware'i atla
  if (req.path === '/api/validate-telegram-auth') {
    return next();
  }

  const user_id = req.headers['x-telegram-id'];
  const login_hash = req.headers['x-login-hash'];

  if (debug) {
    console.log('\x1b[33m%s\x1b[0m', `${req.method} ${req.url}   data:${JSON.stringify(req.query || req.body || {})}`);
    console.log('\x1b[36m%s\x1b[0m', `user_id=${user_id}  login_hash=${login_hash}`);
    console.log('Gelen X-Telegram-ID:', user_id);
    console.log('Gelen X-Login-Hash:', login_hash);
  }

  const isAuthenticated = await login_check(user_id, login_hash);

  if (!isAuthenticated) {
    return res.status(401).json({ error: 'Request rejected' });
  }

  next();
};

export { authMiddleware, login_check }; 