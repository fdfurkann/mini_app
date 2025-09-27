import { TradeData, UserSignal } from '@/utils/types';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// API_BASE_URL sonuna /api eklenmiş hali
const API_BASE = API_BASE_URL.endsWith('/api') ? API_BASE_URL : API_BASE_URL + '/api';

export interface User {
  id: number;
  telegram_id: string;
  name: string;
  username: string;
  created_at: string;
}

export interface ApiKey {
  id: number;
  user_id: number;
  api_name: string;
  api_key: string;
  api_secret: string;
  api_type?: number; // 1=Binance, 2=Bybit, 3=BingX
  created_at: string;
  updated_at: string;
  // API ayarları
  auto_trade?: number | boolean;
  leverage?: number | string;
  lotsize?: string;
  margin_type?: string;
  max_orders?: number | string;
  take_profit?: string;
  take_profit_trading_setting?: string;
  percent_profit?: string;
  stop_loss?: number | boolean;
  stop_loss_settings?: string;
  percent_loss?: string;
  trail_stop?: number | string;
  tp0?: number | string;
  tp1?: number | string;
  tp2?: number | string;
  tp3?: number | string;
  tp4?: number | string;
  tp5?: number | string;
  tp6?: number | string;
  tp7?: number | string;
  tp8?: number | string;
  tp9?: number | string;
  tp10?: number | string;
  bot_room?: number | string;
  withdraw_to_cost?: number | boolean;
  is_profit_target_enabled?: number | boolean;
  profit_amount?: string;
  profit_target_amount?: string;
  sl_tp_order?: number | boolean;
  break_even?: number | boolean;
  break_even_level?: string;
}

export interface Channel {
  id: number;
  room_id: string;
  room_name: string;
  description: string;
  telegram_link: string;
  signal_count?: number;
  success_rate?: number;
  total_profit?: number;
  created_at: string;
  updated_at: string;
  signalCount?: number;
  successRate?: number;
  totalProfit?: number;
}

export interface Signal2 {
  id: number;
  symbol: string;
  trend: string;
  entry1: number;
  entry2: number;
  sl: number;
  tp1: number;
  tp2: number;
  tp3: number;
  tp4: number;
  tp5: number;
  tp6: number;
  tp7: number;
  tp8: number;
  tp9: number;
  tp10: number;
  stoploss: number;
  takeprofit: number;
  open: number;
  close: number;
  opendate: string;
  closedate: string;
  signalgrup?: string;
  room_name?: string;
  status?: 'open' | 'closed';
  profit?: number;
}

export interface SignalFormData {
  symbol: string;
  trend: "BUY" | "SELL";
  slPercentage: number;
  entryRangePercentage: number;
  tpCount: number;
  tpRangePercentage: number;
}

export const checkDatabaseConnection = async () => {
  try {
    console.log('Checking API connection...');
    const response = await fetch(`${API_BASE_URL}/check-connection`);
    console.log('API response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('API response data:', data);
    return data;
  } catch (error) {
    console.error('API connection error:', error);
    return {
      isConnected: false,
      error: error instanceof Error ? error.message : 'API bağlantısı kurulamadı'
    };
  }
};

export const getUserByTelegramId = async (telegramId: string): Promise<User | null> => {
  try {
    console.log('Fetching user data for telegramId:', telegramId);
    const response = await fetch(`${API_BASE_URL}/users/${telegramId}`);
    console.log('User API response status:', response.status);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('User API response data:', data);
    return data;
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// API key management functions
export async function getApiKeys(userId: number): Promise<ApiKey[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/keys?user_id=${userId}`);
    if (!response.ok) {
      throw new Error('API anahtarları alınamadı');
    }
    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
}

export async function addApiKey(userId: number, apiName: string, apiKey: string, apiSecret: string, apiType: number, botRoom?: number | string): Promise<ApiKey> {
  try {
    const response = await fetch(`${API_BASE_URL}/keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      body: JSON.stringify({
        user_id: userId,
        api_name: apiName,
        api_key: apiKey,
        api_secret: apiSecret,
        api_type: apiType,
        bot_room: botRoom
      })
    });

    if (!response.ok) {
      throw new Error('API anahtarı eklenemedi');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
}

export async function updateApiKey(apiId: number, userId: number, apiName: string, apiKey: string, apiSecret: string, apiType: number, botRoom?: number | string, enrolledId?: number | string): Promise<ApiKey> {
  try {
    const body: any = {
      user_id: userId,
      api_name: apiName,
      api_key: apiKey,
      api_secret: apiSecret,
      api_type: apiType,
    };
    if (typeof botRoom !== 'undefined') body.bot_room = botRoom;
    if (typeof enrolledId !== 'undefined') body.enrolled_id = enrolledId;
    const response = await fetch(`${API_BASE_URL}/keys/${apiId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error('API anahtarı güncellenemedi');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
}

export async function deleteApiKey(userId: number, apiId: number): Promise<void> {
  try {
    const id = localStorage.getItem('id');
    const loginHash = localStorage.getItem('login_hash');
    const response = await fetch(`${API_BASE_URL}/keys/${apiId}?user_id=${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': id || '',
        'X-Login-Hash': loginHash || '',
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'API anahtarı silinemedi');
    }
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
}

export async function getApiKeyById(apiId: number): Promise<ApiKey | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/keys/${apiId}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('API anahtarı alınamadı');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
}

export async function updateApiKeySettings(apiId: number, settings: any): Promise<ApiKey | null> {
  try {
    const response = await fetch(`${API_BASE}/keys/settings/${apiId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      throw new Error('API anahtarı ayarları güncellenemedi');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating API key settings:', error);
    throw error;
  }
}

// ApiChannel interface'i
export interface ApiChannel {
  id: number;
  room_id: string;
  room_name: string;
  active: number;
  admin_username?: string;
  active_text?: string;
  signals?: Signal2[];
  pagination?: { [key: string]: any };
}

// Fetch channels from bot_rooms table
export async function getChannels(): Promise<ApiChannel[]> {
  try {
    // Önbellekleme için kullan
    const cacheKey = 'channels_cache';
    const cachedData = sessionStorage.getItem(cacheKey);
    
    // Önbellekte veri varsa ve son 5 dakika içinde alınmışsa, önbellekten döndür
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData);
      const now = new Date().getTime();
      // 5 dakika = 300000 ms
      if (now - timestamp < 300000) {
        console.log('Using cached channels data');
        return data;
      }
    }
    
    console.log('Fetching channels from API');
    const response = await fetch(`${API_BASE_URL}/channels`);
    if (!response.ok) {
      throw new Error('Kanal listesi alınamadı');
    }
    const data = await response.json();
    console.log('Fetched channels:', data); // Debug log
    
    // API yanıtı doğrudan dizi veya { channels: [...] } formatında gelebilir
    const channels = data.channels || data;
    
    if (!Array.isArray(channels)) {
      console.error('Unexpected API response structure:', data);
      throw new Error('API yanıtı beklenen formatta değil');
    }
    
    // Önbelleğe kaydet
    sessionStorage.setItem(cacheKey, JSON.stringify({
      data: channels,
      timestamp: new Date().getTime()
    }));
    
    return channels;
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
}

// Fetch single channel by ID
export async function getChannelById(channelId: number | string, page: number = 1, limit: number = 30): Promise<ApiChannel | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/channels/${channelId}?page=${page}&limit=${limit}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('Kanal bilgisi alınamadı');
    }
    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
}

// Fetch all signals for a user
export async function getUserSignals(userId: number): Promise<UserSignal[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/signals?user_id=${userId}`);
    if (!response.ok) {
      throw new Error('Sinyal verileri alınamadı');
    }
    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
}

// Fetch a specific signal by ID
export async function getUserSignalById(userId: number, signalId: number): Promise<UserSignal | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/signals/${signalId}?user_id=${userId}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('Sinyal verisi alınamadı');
    }
    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
}

// Fetch signals from signals2 table
export async function getSignals2(userId?: number): Promise<Signal2[]> {
  try {
    const url = userId 
      ? `${API_BASE_URL}/signals2?user_id=${userId}`
      : `${API_BASE_URL}/signals2`;
      
    console.log('Fetching signals2 from:', url);
    const response = await fetch(url);
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`Sinyal verileri alınamadı: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Raw API Response:', data); // Ham API yanıtını logla
    
    // API yanıtının yapısını kontrol et
    let signals: Signal2[];
    if (Array.isArray(data)) {
      signals = data;
    } else if (data.signals && Array.isArray(data.signals)) {
      signals = data.signals;
    } else if (data.data && Array.isArray(data.data)) {
      signals = data.data;
    } else {
      console.error('Unexpected API response structure:', data);
      throw new Error('API yanıtı beklenen formatta değil');
    }
    
    console.log('Processed signals count:', signals.length);
    console.log('Sample signal:', signals[0]);
    return signals;
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
}

export const createSignal = async (signalData: Partial<UserSignal>): Promise<UserSignal> => {
    const response = await api.post<UserSignal>('/signals', signalData);
    return response.data;
};

export const updateSignal = async (id: number, signalData: Partial<TradeData>): Promise<TradeData> => {
    const response = await api.put<TradeData>(`/signals/${id}`, signalData);
    return response.data;
};

export const deleteSignal = async (id: number): Promise<void> => {
    await api.delete(`/signals/${id}`);
};