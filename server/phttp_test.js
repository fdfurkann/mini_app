import phttp from './phttp.js';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function test() {
  // 10 saniye boyunca her saniye tüm sembollerin tick verisini çek
  for (let i = 0; i < 10; i++) {
    try {
      const tickerRes = await phttp.request('https://fapi.binance.com/fapi/v1/ticker/price');
      console.log(`[${i+1}] Binance Tüm Semboller Tick status:`, tickerRes.statusCode);
      // Sadece ilk 3 sembolü örnek olarak gösterelim, çok uzun olmasın
      const arr = JSON.parse(tickerRes.bodyString);
      console.log(`[${i+1}] İlk 3 sembol örnek:`, arr.slice(0, 3));
    } catch (err) {
      console.error(`[${i+1}] Binance Tüm Semboller Tick hatası:`, err);
    }
    await sleep(1000);
  }

  // Binance'e örnek order gönder (gerçek API key kullanılmaz, sadece örnek)
  try {
    const orderData = JSON.stringify({
      symbol: 'BTCUSDT',
      side: 'BUY',
      type: 'LIMIT',
      quantity: 0.001,
      price: 20000,
      timeInForce: 'GTC',
      recvWindow: 5000,
      timestamp: Date.now()
      // signature eklenmeli, gerçek API için gereklidir
    });
    const orderRes = await phttp.request({
      method: 'POST',
      url: 'https://fapi.binance.com/fapi/v1/order',
      headers: {
        'Content-Type': 'application/json',
        'X-MBX-APIKEY': 'API_KEYINIZ', // Gerçek anahtarınızı buraya koymayın
        'Content-Length': Buffer.byteLength(orderData)
      }
    }, orderData);
    console.log('Binance Order POST status:', orderRes.statusCode);
    console.log('Binance Order POST body:', orderRes.bodyString);
  } catch (err) {
    console.error('Binance Order POST hatası:', err);
  }

  // Binance'te örnek order silme (DELETE)
  try {
    const delRes = await phttp.request({
      method: 'DELETE',
      url: 'https://fapi.binance.com/fapi/v1/order?symbol=BTCUSDT&orderId=123456',
      headers: {
        'X-MBX-APIKEY': 'API_KEYINIZ' // Gerçek anahtarınızı buraya koymayın
      }
    });
    console.log('Binance Order DELETE status:', delRes.statusCode);
    console.log('Binance Order DELETE body:', delRes.bodyString);
  } catch (err) {
    console.error('Binance Order DELETE hatası:', err);
  }
}

test();
