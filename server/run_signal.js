import pool from './db.js';
import { print_log } from './print_log.js';
import { formatPriceTickSize } from './utils.js';

function getMaxTp(signal) {
  let maxTp=0, maxVal=0; 
  for(let i=1;i<=10;i++){
    if(typeof signal[`tp${i}`] !== 'undefined' && signal[`tp${i}`]>maxVal){
      maxVal=signal[`tp${i}`];
      maxTp=i;
    }
  }
  return `tp${maxTp}=${maxVal}`;
}

function print_rr(arr, alt = 0) {
  let str = [];
  if (!Array.isArray(arr) && typeof arr !== 'object') arr = [arr];
  for (const a in arr) {
    const b = arr[a];
    if (typeof b === 'object') {
      str.push(`${a}=[${print_rr(b, 1)}] `);
    } else {
      str.push(`${a}=${b} `);
    }
  }
  if (alt === 1) {
    return str.join(', ') + '\n';
  } else {
    console.log(str.join(', '));
  }
}

async function ch_bildirim_ekle(sid, channel_id, post_id, symbol, trend, open, opendate, sl, last, lastdate, cmd, profit, msg, gonderim = 0) {
  if (!msg || channel_id == 0) {
    print_log({ chid: channel_id, id: sid, msg: 'ch_bildirim_ekle: mesaj veya channel_id eksik, bildirim eklenmedi (post_id: ' + post_id + ')', pool });
    return;
  }
  msg = msg.replace(/'/g, '').replace(/"/g, '');
  let msg1 = msg.replace(/\n/g, '');
  print_log({ chid: channel_id, id: sid, msg: `bildirim_ch = ${msg1}`, pool });
  const bild_sql = `INSERT INTO bildirimler_ch (channel_id, post_id, symbol, trend, open, opendate, sl, last, lastdate, cmd, profit, msg, gonderim, error_message, result) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', 0)`;
  await pool.query(bild_sql, [channel_id, post_id, symbol, trend, open, opendate, sl, last, lastdate, cmd, profit, msg, gonderim]);
}

async function run_user_signals(sid, rmd = 0) {

  const [e_signal] = await pool.query('SELECT * FROM signals WHERE id = ?', [sid]);
  const es = e_signal[0];
  if (!es) {
    print_log({ chid: '', id: sid, msg: 'run_user_signals: sinyal bulunamadı, signals tablosunda id=' + sid + ' kaydı yok', pool });
    return;
  }
  const channel_id = es.channel_id;
  print_log({ chid: channel_id, id: sid, msg: 'run_user_signals(); çağrıldı, channel_id=' + channel_id + ', message_id=' + es.message_id, pool });
  const symbol = es.symbol;
  const direction = es.direction;
  const stop_loss = es.stop_loss;
  const tp1 = es.tp1;

  // Kanal ile ilişkili aktif API anahtarlarını bul
  let apiKeys = [];
  if (channel_id < 0) {
    // Sadece signals.message_id ile eşleşen api anahtarı
    const [apiKeyRows] = await pool.query('SELECT * FROM api_keys WHERE id = ? AND status = 1', [es.message_id]);
    apiKeys = apiKeyRows;
    print_log({ chid: channel_id, id: sid, msg: `run_user_signals: channel_id < 0, sadece message_id (${es.message_id}) ile eşleşen api anahtarı aranıyor, bulunan: ${apiKeys.length}`, pool });
  } else {
    const [apiKeyRows] = await pool.query('SELECT * FROM api_keys WHERE bot_room = ? AND status = 1', [channel_id]);
    apiKeys = apiKeyRows;
    print_log({ chid: channel_id, id: sid, msg: `run_user_signals: channel_id >= 0, bot_room=${channel_id} ile eşleşen aktif api anahtarları: ${apiKeys.length}`, pool });
  }
  if (!apiKeys.length) {
    print_log({ chid: channel_id, id: sid, msg: 'run_user_signals: Bu kanala bağlı aktif API anahtarı yok, user_signals eklenmedi', pool });
    // Eğer bireysel sinyal (channel_id < 0) ise kullanıcıya bildirim gönder
    if (channel_id < 0 && es.message_id) {
      // api anahtarı üzerinden user_id bul
      const [apiKeyRows] = await pool.query('SELECT * FROM api_keys WHERE id = ?', [es.message_id]);
      if (apiKeyRows.length > 0) {
        const user_id = apiKeyRows[0].user_id;
        // Bu kullanıcı ve api anahtarı için aktif abonelik var mı kontrol et
        const [enrolled] = await pool.query('SELECT * FROM enrolled_users WHERE user_id = ? AND end_date > NOW()', [user_id]);
        if (!enrolled.length) {
          print_log({ chid: channel_id, id: sid, uid: user_id, msg: 'run_user_signals: Kullanıcıya bildirim gönderildi, aktif abonelik yok', pool });
          await pool.query('INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, 0)', [user_id, 'Tanımlı abonelik paketiniz yok. Sinyal işleme alınmadı.']);
        } else {
          print_log({ chid: channel_id, id: sid, uid: user_id, msg: 'run_user_signals: Kullanıcıda aktif abonelik var ama api anahtarı yok', pool });
        }
      } else {
        print_log({ chid: channel_id, id: sid, msg: 'run_user_signals: message_id ile api anahtarı bulunamadı', pool });
      }
    }
    return;
  }
  for (const apiKey of apiKeys) {
    // Kullanıcının aktif aboneliği var mı kontrol et
    const [enrolled] = await pool.query('SELECT * FROM enrolled_users WHERE user_id = ? AND end_date > NOW()', [apiKey.user_id]);
    if (!enrolled.length) {
      print_log({ chid: channel_id, id: sid, uid: apiKey.user_id, msg: `run_user_signals: Kullanıcı ${apiKey.user_id} için aktif abonelik yok, user_signals eklenmedi, atlanıyor.`, pool });
      continue;
    }
    // auto_trade kontrolü
    if (apiKey.auto_trade != 1) {
      print_log({ chid: channel_id, id: sid, uid: apiKey.user_id, msg: `run_user_signals: Kullanıcı ${apiKey.user_id} için auto_trade aktif değil (auto_trade=${apiKey.auto_trade}), user_signals eklenmedi, atlanıyor.`, pool });
      continue;
    }
    // Aynı user_signals kaydı var mı?
    const [existing] = await pool.query('SELECT id,status FROM user_signals WHERE user_id = ? AND api_id = ? AND signal_id = ?', [apiKey.user_id, apiKey.id, sid]);
    if(existing.length > 0){
      print_log({ chid: channel_id, id: sid, uid: apiKey.user_id, usid: existing[0].id, msg: `run_user_signals: Kullanıcı ${apiKey.user_id} için zaten user_signals kaydı var (id=${existing[0].id}, status=${existing[0].status}), tekrar eklenmedi.`, pool });
      continue;
    }

    let us_id;
    if (existing.length > 0) {
      us_id = existing[0].id;
      print_log({
        chid: channel_id,
        id: sid,
        uid: apiKey.user_id,
        usid: us_id,
        msg: `run_user_signals: Kullanıcı ${apiKey.user_id} için mevcut user_signals bulundu: ${us_id}, api_name=${apiKey.api_name || ''}, ${symbol} ${direction} o:${es?.open_price || ''} v:${apiKey.lotsize || ''} c:${es?.close_price || ''} sl=${stop_loss} tp=${tp1}, ${(() => { let maxTp=0, maxVal=0; for(let i=1;i<=10;i++){if(typeof es[`tp${i}`] !== 'undefined' && es[`tp${i}`]>maxVal){maxVal=es[`tp${i}`];maxTp=i;}} return `tp${maxTp}=${maxVal}`; })()}`,
        pool
      });
    } else {
      // Yeni user_signals kaydı oluştur
      const [result] = await pool.query(
        'INSERT INTO user_signals (user_id, api_id, signal_id, lotsize, levelage, strateji, ticket, symbol, trend, open, opentime, volume, closed_volume, sl, tp, close, closetime, profit, event, status, sticket, tticket, sl_wait, tp_wait) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          apiKey.user_id,
          apiKey.id,
          sid,
          apiKey.lotsize || 0,
          apiKey.leverage || 0,
          apiKey.strateji || '',
          '',
          symbol,
          direction,
          0,
          null,
          0,
          0,
          stop_loss,
          // tp1 yerine, en büyük ve 0'dan büyük tp fiyatı
          (() => {
            let maxTpVal = 0;
            for(let i=1;i<=10;i++){
              if(typeof es[`tp${i}`] !== 'undefined' && es[`tp${i}`]>maxTpVal){
                maxTpVal=es[`tp${i}`];
              }
            }
            return maxTpVal;
          })(),
          0,
          null,
          0,
          'Signal received',
          0,
          '', '', 0, 0
        ]
      );
      us_id = result.insertId;
      print_log({ chid: channel_id, id: sid, uid: apiKey.user_id, usid: us_id, msg: `run_user_signals: Kullanıcı ${apiKey.user_id} için yeni user_signals oluşturuldu: ${us_id}`, pool });
    }
    
   
    // run_user(us_id) yerine nohup ile arkaplanda çalıştır
    const { exec } = await import('child_process');
    const command = `nohup php /home/user/mini_app/server/run_user.php ${us_id} ${channel_id} > /dev/null 2>&1 &`;
   
    exec(command, (error, stdout, stderr) => {
   

      if (error) {
        print_log({ chid: channel_id, id: sid, uid: apiKey.user_id, usid: us_id, msg: `run_user_signals: nohup komutu hatası: ${error.message}`, pool });
      } else {
        const pid = stdout.trim();
        print_log({ chid: channel_id, id: sid, uid: apiKey.user_id, usid: us_id, msg: `run_user_signals: nohup komutu başarıyla çalıştırıldı, PID: ${pid}`, pool });
      }
    });
   
    print_log({
      chid: channel_id,
      id: sid,
      uid: apiKey.user_id,
      usid: us_id,
      msg: `run_user_signals: nohup ile run_user çağrıldı user_signal_id=${us_id}, api_name=${apiKey.api_name || ''}, ${symbol} ${direction}, open=${es?.open_price || ''}, lot_size=${apiKey.lotsize || ''}, close=${es?.close_price || ''}, sl=${stop_loss}, tp=${tp1}, max_tp=${(() => { let maxTp=0, maxVal=0; for(let i=1;i<=10;i++){if(typeof es[`tp${i}`] !== 'undefined' && es[`tp${i}`]>maxVal){maxVal=es[`tp${i}`];maxTp=i;}} return `tp${maxTp}=${maxVal}`; })()}`,
      pool
    });
    await new Promise(res => setTimeout(res, 100));
  }
}

// Tüm fiyat gösterimlerinde ve karşılaştırmalarında formatPriceTickSize kullanılacak

async function run_signal(signal_id, bot) {
  let sid = signal_id;
  // İlk sinyal sorgusu
  const [rsi] = await pool.query('SELECT * FROM signals WHERE id=?', [sid]);
  const signal = rsi[0];
  if (!signal) return;
  const channel_id = signal.channel_id;
  const symbol = signal.symbol;
  let signal_finished = 0;
  let signal_runned = 0;
  let user_signals_called = false;

  /*
  // Sinyal zaten açılmışsa başta bir kez run_user_signals çağrılır (döngüden önce)
  if (signal.open_price > 0) {
    await run_user_signals(sid);
    user_signals_called = true;
  }*/

  print_log({
    chid: channel_id,
    id: sid,
    msg: `run_signal başlatıldı: ${signal.symbol} ${signal.direction}, entry1=${signal.entry1}, entry2=${signal.entry2}, stop_loss=${signal.stop_loss}, max_tp=${(() => { let maxTp=0, maxVal=0; for(let i=1;i<=10;i++){if(signal[`tp${i}`]>maxVal){maxVal=signal[`tp${i}`];maxTp=i;}} return `tp${maxTp}=${maxVal}`; })()}`,
    pool
  });

  if (signal.status === 'pending') {
    await pool.query('UPDATE signals SET status = ? WHERE id = ?', ['created', sid]);
  }
  let fiyatBulunamadiLogSet = new Set();
  while (true) {
    try {
      const [sm1] = await pool.query('SELECT * FROM rates WHERE symbol=?', [symbol]);
      const sym = sm1 && sm1[0];
      if (!sym || typeof sym.price === 'undefined' || sym.price === null) {
        if (!fiyatBulunamadiLogSet.has(symbol)) {
          print_log({ chid: channel_id, id: sid, msg: `run_signal: rates tablosunda ${symbol} için fiyat bulunamadı`, pool });
          fiyatBulunamadiLogSet.add(symbol);
        }
        await new Promise(res => setTimeout(res, 1000));
        continue;
      }
      const ask = parseFloat(sym.price);
      const bid = parseFloat(sym.price);
      const sdate = sym.dates;
      // const tickSize = parseFloat(sym.tickSize);
      // const digits = parseInt(sym.digits);
      // function formatPriceTick(val) { ... } // KALDIRILDI
      if (!(ask > 0 && bid > 0)) {
        await new Promise(res => setTimeout(res, 1000));
        continue;
      }

      const [rsi2] = await pool.query('SELECT * FROM signals WHERE id=?', [sid]);
      const signal2 = rsi2[0];
      if (new Date(signal2.tarih).getTime() / 1000 + 86400 < Date.now() / 1000 && (signal2.open_price == null || signal2.open_price == 0)) {
        print_log({ chid: channel_id, id: sid, msg: `Sinyal #${sid} 24 saat içinde başlamadığı için iptal edildi`, pool });
        await pool.query('UPDATE signals SET open_price=entry1, close_price=entry1, open_time=tarih, close_time=tarih, status=?, closed_reason=? WHERE id=?', ['cancelled', '24saat başlamadı', sid]);
        break;
      }

      if (!signal2.id) {
        print_log({ chid: channel_id, id: sid, msg: `Sinyal #${sid} bulunamadı`, pool });
        break;
      }
      
      if (signal2.close_price && signal2.close_price > 0) {
        print_log({ chid: channel_id, id: sid, msg: `Sinyal #${sid} başarı ile tamamlandı`, pool });
        await pool.query('UPDATE signals SET status=?, close_time=NOW() WHERE id=?', ['closed', sid]);
        break;
      }

      if (signal2.direction === 'LONG') {
        if (signal2.open_price == null || signal2.open_price == 0) {
          const kucuk = Math.min(signal2.entry1, signal2.entry2);
          const buyuk = Math.max(signal2.entry1, signal2.entry2);
          if ((kucuk <= ask && buyuk >= ask)) {
            const signal_str = `#${signal2.symbol} ${signal2.direction} signal is being tracked. ✅\nEntry1: ${signal2.entry1}\nEntry2: ${signal2.entry2}  Ask: ${sym.price}`;
            await ch_bildirim_ekle(sid, signal2.channel_id, signal2.message_id, signal2.symbol, signal2.direction, ask, sdate, signal2.stop_loss ?? 0, 0, 0, 'OPEN', 0, signal_str);
            await pool.query('UPDATE signals SET open_price=?, open_time=?, status=? WHERE id=?', [ask, sdate, 'active', sid]);
            print_log({ chid: channel_id, id: sid, msg: `Sinyal #${sid} açıldı: ${signal2.symbol} ${signal2.direction}, entry1=${signal2.entry1}, entry2=${signal2.entry2}, sl=${signal2.stop_loss}, max_tp=${getMaxTp(signal2)}`, pool });
            if (!user_signals_called) {
              await run_user_signals(sid);
              user_signals_called = true;
            }
            signal_runned = 1;
          }
        } else {
          for (let t = 0; t <= 10; t++) {
            if (t == 0) {
              if (signal2.stop_loss > 0 && signal2.stop_loss >= bid) {
                const profit = (((((signal2.stop_loss / signal2.entry2) * 100) - 100) * 20)).toFixed(3);
              
                const [signalRows] = await pool.query('SELECT * FROM signals WHERE id = ? LIMIT 1', [sid]);
                if (signalRows && signalRows.length > 0) {
                  const signal = signalRows[0];
                  let pricePrecision = 8;
                  let tickSize = 0.000001;
                  try {
                    const [rateInfo] = await pool.query('SELECT digits, tickSize FROM rates WHERE symbol = ? ORDER BY id DESC LIMIT 1', [signal.symbol]);
                    if (rateInfo && rateInfo.length > 0) {
                      pricePrecision = rateInfo[0].digits;
                      tickSize = parseFloat(rateInfo[0].tickSize || tickSize);
                    }
                  } catch (e) {}
                  const trendIcon = signal.direction === 'LONG' ? '🟢' : '🔴';
                  let messageText = `${trendIcon} ${signal.direction}\n`;
                  messageText += `❇️ ${signal.symbol}\n`;
                  messageText += `☣ Entry : ${formatPriceTickSize(signal.entry1, tickSize, pricePrecision)} - ${formatPriceTickSize(signal.entry2, tickSize, pricePrecision)}\n`;
                  for (let i = 1; i <= 10; i++) {
                    const tpKey = `tp${i}`;
                    if (signal[tpKey] && signal[tpKey] > 0) {
                      const check = (signal.tp_hit && signal.tp_hit >= i) ? ' ✅' : '';
                      messageText += `☪ Target ${i} - ${formatPriceTickSize(signal[tpKey], tickSize, pricePrecision)}${check}\n`;
                    }
                  }
                  messageText += `⛔️ Stop Loss : ${formatPriceTickSize(signal.stop_loss, tickSize, pricePrecision)} ❌\n`;
                  messageText += `\nThis is not investment advice.`;
                  await ch_bildirim_ekle(sid, signal2.channel_id, signal2.message_id, signal2.symbol, signal2.direction, signal2.open_price, signal2.open_time, signal2.stop_loss ?? 0, bid, sdate, 'SL', profit, messageText);
                }
                await pool.query('UPDATE signals SET sl_hit=1, profit=?, close_price=?, close_time=?, status=?, closed_reason=? WHERE id=?', [profit, signal2.stop_loss, sdate, 'closed', 'SL', sid]);
                // LONG SL logu
                print_log({ chid: channel_id, id: sid, msg: `Sinyal #${sid} SL ile kapandı: ${signal2.symbol} ${signal2.direction}, zarar=%${profit}`, pool });
              }
            } else {
              if (signal2[`tp${t}`] > 0 && signal2[`tp${t}`] <= bid && signal2.tp_hit < t) {
                const profit = (((((signal2[`tp${t}`] / signal2.open_price) * 100) - 100) * 20)).toFixed(3);
                const signal_str = `#${signal2.symbol} ${signal2.direction} Take-Profit ${t} ✅\nOpen: ${formatPriceTickSize(signal2.open_price, sym.tickSize, sym.digits)}\nTarget ${t}: ${formatPriceTickSize(signal2[`tp${t}`], sym.tickSize, sym.digits)}\nProfit: %${parseFloat(profit).toFixed(2)}`;
                if (signal2[`tp${t + 1}`] > 0) {
                  await ch_bildirim_ekle(sid, signal2.channel_id, signal2.message_id, signal2.symbol, signal2.direction, signal2.open_price, signal2.open_time, signal2.stop_loss ?? 0, bid, sdate, `TP${t}`, profit, signal_str);
                  await pool.query('UPDATE signals SET tp_hit=?, profit=? WHERE id=?', [t, profit, sid]);
                  // LONG TP logu
                  print_log({ chid: channel_id, id: sid, msg: `Sinyal #${sid} TP${t} gerçekleşti: ${signal2.symbol} ${signal2.direction}, tp${t}=${signal2[`tp${t}`]}, kar=%${profit}`, pool });
                } else {
                  await ch_bildirim_ekle(sid, signal2.channel_id, signal2.message_id, signal2.symbol, signal2.direction, signal2.open_price, signal2.open_time, signal2.stop_loss ?? 0, bid, sdate, `TP${t}`, profit, signal_str);
                  await pool.query('UPDATE signals SET tp_hit=?, close_price=?, close_time=?, profit=?, status=?, closed_reason=? WHERE id=?', [t, signal2[`tp${t}`], sdate, profit, 'closed', `TP${t}`, sid]);
                  // LONG TP ile kapandı logu
                  print_log({ chid: channel_id, id: sid, msg: `Sinyal #${sid} TP${t} ile kapandı: ${signal2.symbol} ${signal2.direction}, tp${t}=${signal2[`tp${t}`]}, kar=%${profit}`, pool });
                  signal_finished = 1;
                }
                break;
              }
            }
          }

        }
      } else if (signal2.direction === 'SHORT') {
        if (signal2.open_price == null || signal2.open_price == 0) {
          const kucuk = Math.min(signal2.entry1, signal2.entry2);
          const buyuk = Math.max(signal2.entry1, signal2.entry2);
          if (buyuk >= bid && kucuk <= bid) {
            const signal_str = `#${signal2.symbol} ${signal2.direction} signal is being tracked. ✅\nEntry1: ${signal2.entry1}\nEntry2: ${signal2.entry2}  Bid:${sym.price}`;
            await ch_bildirim_ekle(sid, signal2.channel_id, signal2.message_id, signal2.symbol, signal2.direction, ask, sdate, signal2.stop_loss ?? 0, 0, 0, 'OPEN', 0, signal_str);
            await pool.query('UPDATE signals SET open_price=?, open_time=?, status=? WHERE id=?', [ask, sdate, 'active', sid]);
            // SHORT açılış logu
            print_log({ chid: channel_id, id: sid, msg: `Sinyal #${sid} açıldı: ${signal2.symbol} ${signal2.direction}, entry1=${signal2.entry1}, entry2=${signal2.entry2}, sl=${signal2.stop_loss}, max_tp=${getMaxTp(signal2)}`, pool });
            if (!user_signals_called) {
              user_signals_called = true;
              run_user_signals(sid);
              
            }
            signal_runned = 1;
          }
        } else {
          for (let t = 0; t <= 10; t++) {
            if (t == 0) {
              if (signal2.stop_loss > 0 && signal2.stop_loss <= ask) {
                const profit = (((((signal2.entry2 / signal2.stop_loss) * 100) - 100) * 20)).toFixed(3);
                const signal_str = `#${signal2.symbol} ${signal2.direction} Stop Loss triggered. ❌`;
                await ch_bildirim_ekle(sid, signal2.channel_id, signal2.message_id, signal2.symbol, signal2.direction, signal2.open_price, signal2.open_time, signal2.stop_loss ?? 0, bid, sdate, 'SL', profit, signal_str);
                await pool.query('UPDATE signals SET sl_hit=1, profit=?, close_price=?, close_time=?, status=?, closed_reason=? WHERE id=?', [profit, signal2.stop_loss, sdate, 'closed', 'SL', sid]);
                // SHORT SL logu
                print_log({ chid: channel_id, id: sid, msg: `Sinyal #${sid} SL ile kapandı: ${signal2.symbol} ${signal2.direction}, zarar=%${profit}`, pool });
              }
            } else {
              if (signal2[`tp${t}`] > 0 && signal2[`tp${t}`] >= ask && signal2.tp_hit < t) {
                const profit = (((((signal2.open_price / signal2[`tp${t}`]) * 100) - 100) * 20)).toFixed(3);
                const signal_str = `#${signal2.symbol} ${signal2.direction} Take-Profit ${t} ✅\nOpen: ${formatPriceTickSize(signal2.open_price, sym.tickSize, sym.digits)}\nTarget ${t}: ${formatPriceTickSize(signal2[`tp${t}`], sym.tickSize, sym.digits)}\nProfit: %${parseFloat(profit).toFixed(2)}`;
                if (signal2[`tp${t + 1}`] > 0) {
                  await ch_bildirim_ekle(sid, signal2.channel_id, signal2.message_id, signal2.symbol, signal2.direction, signal2.open_price, signal2.open_time, signal2.stop_loss ?? 0, bid, sdate, `TP${t}`, profit, signal_str);
                  await pool.query('UPDATE signals SET tp_hit=?, profit=? WHERE id=?', [t, profit, sid]);
             
                  print_log({ chid: channel_id, id: sid, msg: `Sinyal #${sid} TP${t} gerçekleşti: ${signal2.symbol} ${signal2.direction}, tp${t}=${signal2[`tp${t}`]}, kar=%${profit}`, pool });
                } else {
                  await ch_bildirim_ekle(sid, signal2.channel_id, signal2.message_id, signal2.symbol, signal2.direction, signal2.open_price, signal2.open_time, signal2.stop_loss ?? 0, bid, sdate, `TP${t}`, profit, signal_str);
                  await pool.query('UPDATE signals SET tp_hit=?, close_price=?, close_time=?, profit=?, status=?, closed_reason=? WHERE id=?', [t, signal2[`tp${t}`], sdate, profit, 'closed', `TP${t}`, sid]);
                
                  print_log({ chid: channel_id, id: sid, msg: `Sinyal #${sid} TP${t} ile kapandı: ${signal2.symbol} ${signal2.direction}, tp${t}=${signal2[`tp${t}`]}, kar=%${profit}`, pool });
                  signal_finished = 1;
                }
                break;
              }
            }
          }

        }
      }
     
      const ticktime = Math.floor(Date.now() / 1000);
      await pool.query('UPDATE signals SET ticktime=?,bid=?,ask=? WHERE id=?', [ticktime, ask, bid, sid]);
      // print_log({ chid: channel_id, id: sid, msg: `Sinyal #${sid} tick güncellendi: ticktime=${ticktime}, bid=${ask}, ask=${bid}` });
    } catch (err) {
      let errMsg = (err && err.stack) ? err.stack.replace(/\n/g, ' ') : (err && err.toString ? err.toString() : String(err));
      print_log({ chid: channel_id, id: sid, msg: `HATA: ${errMsg}`, pool });
      break;
    }
    await new Promise(res => setTimeout(res, 1000));
  }
  print_log({ chid: channel_id, id: sid, msg: `Sinyal #${sid} takibi bitirildi`, pool });
}

export { print_rr, ch_bildirim_ekle, run_user_signals, run_signal, getMaxTp }; 