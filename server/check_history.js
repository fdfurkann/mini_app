import pool from './db.js';
import rbinance from './exchanges/binance_rest.js';
import phttp from './phttp.js';

const binance = new rbinance();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatDateYMDHIS(date) {
  const pad = n => n < 10 ? '0' + n : n;
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export async function check_history() {
  try {
    // 1. History tablosundaki symbol'ler
    const [symbolsRows] = await pool.query('SELECT DISTINCT symbol FROM history');
    const historySymbols = symbolsRows.map(r => r.symbol);
    
    // 2. Her symbol için eksik veri tamamlama (mevcut mantık)
    for (const symbol of historySymbols) {
      const [lastRows] = await pool.query('SELECT timeframe, MAX(time) as last_time FROM history WHERE symbol = ? GROUP BY timeframe', [symbol]);
      for (const row of lastRows) {
        const timeframe = row.timeframe;
        let lastTime = row.last_time ? new Date(row.last_time) : null;
        if (!lastTime) continue;
        let startTime = lastTime.getTime();
        let now = Date.now();
        let interval = timeframe;
        while (startTime < now) {
          let klines = await fetchBinanceKlines(symbol, interval, startTime, now, 1000);
          if (!Array.isArray(klines)) klines = [];
        
          if (!klines || klines.length === 0) {
            break;
          }
          // Toplu ekleme için verileri biriktir
          let batchValues = [];
          for (const k of klines) {
            const openTime = new Date(k[0]);
            const open = parseFloat(k[1]);
            const high = parseFloat(k[2]);
            const low = parseFloat(k[3]);
            const close = parseFloat(k[4]);
            const volume = parseFloat(k[5]);
            batchValues.push([symbol, interval, openTime, open, high, low, close, volume]);
          }
          if (batchValues.length > 0) {
            try {
              const [insertResult] = await pool.query(
                'INSERT IGNORE INTO history (symbol, timeframe, time, open, high, low, close, volume) VALUES ?',
                [batchValues]
              );
           
            } catch (dbErr) {
              console.error('Veritabanı hatası (toplu insert):', dbErr);
            }
          }
          const lastKline = klines[klines.length - 1];
          startTime = lastKline[0] + 1;
          if (klines.length < 1000) break;
          await sleep(500);
        }
      }
    }
    // 3. Signals tablosundaki symbol'ler
    const [signalSymbolsRows] = await pool.query('SELECT DISTINCT symbol FROM signals WHERE symbol IS NOT NULL AND symbol != ""');
    const signalSymbols = signalSymbolsRows.map(r => r.symbol);
    for (const symbol of signalSymbols) {
      if (historySymbols.includes(symbol)) continue; // Zaten history'de var
      // Sinyallerdeki en eski tarih (öncelik open_time, yoksa created_at)
      const [signalRow] = await pool.query('SELECT MIN(COALESCE(open_time, created_at)) as min_time FROM signals WHERE symbol = ?', [symbol]);
      let minTime = signalRow[0]?.min_time ? new Date(signalRow[0].min_time) : null;
      if (!minTime) continue;
      let startTime = minTime.getTime();
      let now = Date.now();
      let interval = '5m'; // Varsayılan olarak 5m kullanıyoruz, gerekirse sinyalden alınabilir
      while (startTime < now) {
        let klines = await fetchBinanceKlines(symbol, interval, startTime, now, 1000);
        if (!Array.isArray(klines)) klines = [];
        
        if (!klines || klines.length === 0) {
          break;
        }
        for (const k of klines) {
          const openTime = new Date(k[0]);
          const open = parseFloat(k[1]);
          const high = parseFloat(k[2]);
          const low = parseFloat(k[3]);
          const close = parseFloat(k[4]);
          const volume = parseFloat(k[5]);
          try {
            const [insertResult] = await pool.query(
              'INSERT IGNORE INTO history (symbol, timeframe, time, open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [symbol, interval, openTime, open, high, low, close, volume]
            );
            // console.log('INSERT IGNORE sonucu:', insertResult);
          } catch (dbErr) {
            console.error('Veritabanı hatası:', dbErr);
          }
        }
        const lastKline = klines[klines.length - 1];
        startTime = lastKline[0] + 1;
        if (klines.length < 1000) break;
        await sleep(500);
      }
    }
  } catch (err) {
    console.error('check_history hata:', err);
  }
}

async function fetchBinanceKlines(symbol, interval, startTime, endTime, limit = 1000) {
  const params = {
    symbol,
    interval,
    startTime,
    endTime,
    limit
  };
  const url = 'https://fapi.binance.com/fapi/v1/klines';
  try {
    const query = Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&');
  
    const res = await phttp.request(url + '?' + query);
    return await res.json();
  } catch (e) {
    console.error('fetchBinanceKlines hata:', e);
    return [];
  }
} 