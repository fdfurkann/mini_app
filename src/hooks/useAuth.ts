import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  language_code: string;
  allows_write_to_pm: boolean;
  photo_url: string;
}

interface TelegramData {
  user: TelegramUser;
  chat_instance: string;
  chat_type: string;
  auth_date: number;
  signature: string;
  hash: string;
}

function getCookie(name: string) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
}

// Orijinal fetch'i yedekle
const originalFetch = window.fetch;

// Fetch'i override et
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const id = localStorage.getItem('id');
  const login_hash = localStorage.getItem('login_hash');

  // Header'ları birleştir
  const headers = {
    ...(init?.headers || {}),
    'X-Telegram-ID': id || '',
    'X-Login-Hash': login_hash || ''
  };

  // Yeni init objesi oluştur
  const newInit = {
    ...init,
    headers
  };

  // Orijinal fetch'i çağır
  return originalFetch(input, newInit);
};

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    /*
    // Kimlik bilgileri eksikse otomatik olarak giriş ekranına yönlendir
    const id = localStorage.getItem('id');
    const login_hash = localStorage.getItem('login_hash');
    const telegramId = sessionStorage.getItem('telegramId');
    if (!id || !login_hash || !telegramId) {
      // Tüm kimlik bilgilerini temizle
      localStorage.removeItem('id');
      localStorage.removeItem('login_hash');
      localStorage.removeItem('telegram_id');
      localStorage.removeItem('user');
      localStorage.removeItem('telegramData');
      localStorage.removeItem('tgWebAppData');
      sessionStorage.removeItem('telegramId');
      sessionStorage.removeItem('isAdmin');
      window.location.href = '/login';
      return;
    }*/

    const validateTelegramData = async () => {
      try {
        // 1. URL'den kontrol et
        const urlParams = new URLSearchParams(window.location.hash.substring(1));
        let tgWebAppData = urlParams.get('tgWebAppData');

        // 2. Cookie'den kontrol et
        if (!tgWebAppData) {
          tgWebAppData = getCookie('tgWebAppData');
        }

        // 3. localStorage'dan kontrol et
        if (!tgWebAppData) {
          tgWebAppData = localStorage.getItem('tgWebAppData') || '';
        }

        if (!tgWebAppData) {
          showTelegramError();
          return;
        }

        // Cookie ve localStorage'a kaydet
        document.cookie = `tgWebAppData=${tgWebAppData}; path=/;`;
        localStorage.setItem('tgWebAppData', tgWebAppData);

        const params = new URLSearchParams(tgWebAppData);
        const userData = JSON.parse(decodeURIComponent(params.get('user') || '{}'));
        const authDate = params.get('auth_date');
        const hash = params.get('hash');

        if (userData && userData.id) {
          const telegramData = {
            user: userData,
            auth_date: authDate,
            hash: hash,
            chat_instance: params.get('chat_instance'),
            chat_type: params.get('chat_type'),
            signature: params.get('signature')
          };

          // Server'da doğrulama yap
          const response = await fetch('/api/validate-telegram-auth', {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain'
            },
            body: tgWebAppData
          });

          const serverData = await response.json();

          if (serverData.valid && serverData.user) {
            // Server'dan gelen kullanıcı bilgilerini kaydet
            localStorage.setItem('id', (serverData.user.id));
            localStorage.setItem('telegram_id', (serverData.user.telegram_id));
            localStorage.setItem('login_hash', (serverData.user.login_hash));
            document.cookie = `id=${(serverData.user.id)}; path=/`;
            document.cookie = `telegram_id=${(serverData.user.telegram_id)}; path=/`;
            document.cookie = `login_hash=${(serverData.user.login_hash)}; path=/`;
            localStorage.setItem('user', JSON.stringify(serverData.user));
            localStorage.setItem('telegramData', JSON.stringify(telegramData));
            sessionStorage.setItem('telegramId', userData.id.toString());
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
          }

          showTelegramError();
          return;
        }

        showTelegramError();
      } catch (error) {
        console.error('Telegram doğrulama hatası:', error);
        showTelegramError();
      } finally {
        setIsLoading(false);
      }
    };

    validateTelegramData();
  }, []);

  const showTelegramError = () => {
    toast.error('Lütfen Telegram üzerinden giriş yapın', {
      duration: Infinity,
      dismissible: false,
      action: {
        label: 'Telegram\'a Git',
        onClick: () => window.location.href = 'https://t.me/your_bot_username'
      }
    });
  };

  return { isLoading, isAuthenticated };
} 