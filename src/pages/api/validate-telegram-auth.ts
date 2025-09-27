import crypto from 'crypto';

const BOT_TOKEN = process.env.BOT_TOKEN;

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  allows_write_to_pm?: boolean;
  photo_url?: string;
}

interface AuthData {
  user: TelegramUser;
  auth_date: string;
  hash: string;
  signature: string;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const authData: AuthData = req.body;

    // Gerekli alanların kontrolü
    if (!authData.user || !authData.auth_date || !authData.hash || !authData.signature) {
      return res.status(400).json({ valid: false, message: 'Missing required fields' });
    }

    // Auth date kontrolü (24 saat)
    const authDate = parseInt(authData.auth_date);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) {
      return res.status(401).json({ valid: false, message: 'Auth date expired' });
    }

    // Data string oluştur
    const dataCheckString = Object.keys(authData.user)
      .sort()
      .map(key => `${key}=${authData.user[key as keyof TelegramUser]}`)
      .concat(`auth_date=${authData.auth_date}`)
      .join('\n');

    // Secret key oluştur
    const secretKey = crypto
      .createHash('sha256')
      .update(BOT_TOKEN || '')
      .digest();

    // Hash hesapla
    const hmac = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Hash doğrula
    if (hmac === authData.hash) {
      return res.status(200).json({ valid: true, user: authData.user });
    }

    return res.status(401).json({ valid: false, message: 'Invalid hash' });
  } catch (error) {
    console.error('Validation error:', error);
    return res.status(500).json({ valid: false, message: 'Internal server error' });
  }
} 