const mysql = require('mysql2/promise');

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'MATICUSDT'];
const TRENDS = ['LONG', 'SHORT'];
const SIGNAL_GROUPS = [123456789, 987654321, 456789123]; // These should match with your bot_rooms table

function randomFloat(min, max, decimals = 8) {
  const str = (Math.random() * (max - min) + min).toFixed(decimals);
  return parseFloat(str);
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateSignal(index) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
  
  const openDate = randomDate(thirtyDaysAgo, now);
  const closeDate = Math.random() > 0.2 ? randomDate(openDate, now) : null; // 20% chance to be open position
  
  const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  const trend = TRENDS[Math.floor(Math.random() * TRENDS.length)];
  const signalgrup = SIGNAL_GROUPS[Math.floor(Math.random() * SIGNAL_GROUPS.length)];
  
  const open = randomFloat(0.1, 100000);
  const close = closeDate ? randomFloat(0.1, 100000) : 0;
  
  // Calculate profit based on trend
  let profit = 0;
  if (close > 0) {
    profit = trend === 'LONG' 
      ? ((close - open) / open) * 100
      : ((open - close) / open) * 100;
  }

  return {
    signalgrup,
    signalid: index + 1,
    signal_data: JSON.stringify({
      message_id: Math.floor(Math.random() * 1000000),
      chat_id: signalgrup
    }),
    symbol,
    trend,
    entry1: randomFloat(0.1, 100000),
    entry2: randomFloat(0.1, 100000),
    sl: randomFloat(0.1, 100000),
    tp1: randomFloat(0.1, 100000),
    tp2: randomFloat(0.1, 100000),
    tp3: randomFloat(0.1, 100000),
    tp4: randomFloat(0.1, 100000),
    tp5: randomFloat(0.1, 100000),
    tp6: randomFloat(0.1, 100000),
    tp7: randomFloat(0.1, 100000),
    tp8: randomFloat(0.1, 100000),
    tp9: randomFloat(0.1, 100000),
    tp10: randomFloat(0.1, 100000),
    tarih: new Date().toISOString(),
    tickdate: Math.floor(Date.now() / 1000),
    bid: randomFloat(0.1, 100000),
    ask: randomFloat(0.1, 100000),
    open,
    opendate: openDate.toISOString(),
    stoploss: randomFloat(0.1, 100000),
    takeprofit: randomFloat(0.1, 100000),
    close,
    closedate: closeDate ? closeDate.toISOString() : null,
    profit,
    last_tp: randomFloat(0.1, 100000),
    last_sl: randomFloat(0.1, 100000)
  };
}

async function main() {
  // Create the connection
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'orcatradebot'
  });

  try {
    // Generate 100 signals
    const signals = Array.from({ length: 100 }, (_, i) => generateSignal(i));
    
    // Insert signals in batches
    const batchSize = 10;
    for (let i = 0; i < signals.length; i += batchSize) {
      const batch = signals.slice(i, i + batchSize);
      await connection.query('INSERT INTO signals2 SET ?', batch);
      console.log(`Inserted signals ${i + 1} to ${Math.min(i + batchSize, signals.length)}`);
    }

    console.log('Successfully generated and inserted demo data!');
  } catch (error) {
    console.error('Error generating demo data:', error);
  } finally {
    await connection.end();
  }
}

main().catch(console.error); 