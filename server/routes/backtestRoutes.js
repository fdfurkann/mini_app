import { Router } from 'express';
import pool from '../db.js';
import { formatMySQLDateTime, floorTo5Minutes } from '../utils.js';

const router = Router();


// Backtest Başlatma Endpoint'i
router.post('/backtest/start', async (req, res) => {
    console.log("Backtest isteği alındı (USDT Bazlı):", req.body);
    if (req.body.multipleTpValues) {
      console.log("multipleTpValues:", JSON.stringify(req.body.multipleTpValues));
    }
    const { 
      selectedChannel, 
      startDate, 
      endDate, 
      leverage, // Henüz PnL hesaplamasında kullanılmıyor
      entryAmount, // Başlangıç miktarı (USDT)
      // --- TP/SL Ayarları ---
      tradeType,      // 'single', 'multiple'
      singleTpValue,  // % olarak tek TP değeri
      multipleTpValues, // Henüz kullanılmıyor
      stopLossType,   // 'none', 'custom', 'atr', 'previous_low_high'
      customStopLoss, // % olarak özel SL değeri
      // breakEvenLevel, // Henüz kullanılmıyor
      // trailStopLevel, // Henüz kullanılmıyor
      // stopLossActionType, // Henüz kullanılmıyor
      // specificLossPercentage, // Henüz kullanılmıyor
      // entryType, // Henüz kullanılmıyor
    } = req.body;
  
    if (!selectedChannel || !startDate || !endDate) {
      return res.status(400).json({ message: 'Kanal ID, başlangıç ve bitiş tarihleri gereklidir.' });
    }
  
    const startDt = new Date(startDate);
    const endDt = new Date(endDate);
    const timeframe = '5m'; 
  
    try {
      // 1. İlgili Sinyalleri Çek (open > 0 ve close > 0 olanlar)
      let signalChannelId;
      if (typeof selectedChannel === 'string') {
        signalChannelId = selectedChannel.startsWith('-100') 
          ? selectedChannel.substring(4) 
          : selectedChannel;
      } else if (typeof selectedChannel === 'number') {
        signalChannelId = String(selectedChannel).startsWith('-100')
          ? String(selectedChannel).substring(4)
          : String(selectedChannel);
      } else {
        signalChannelId = String(selectedChannel);
      }
          
      const [signals] = await pool.execute(
        `SELECT * FROM signals 
         WHERE channel_id = ? 
         AND open_time >= ? 
         AND close_time <= ? 
         AND open_time IS NOT NULL 
         AND close_time IS NOT NULL 
         AND open_price > 0 AND close_price > 0 -- Sadece geçerli fiyatları olanları al
         ORDER BY open_time ASC`, 
        [signalChannelId, startDt, endDt]
      );
  
      console.log(`Bulunan toplam geçerli (open>0, close>0) sinyal sayısı: ${signals.length}`);
  
      if (signals.length === 0) {
        return res.json({ message: "Belirtilen kriterlere uygun geçerli (open>0, close>0) sinyal bulunamadı.", tableData: [], chartData: [] });
      }
  
      // 2. Gerekli Tüm Geçmiş Veriyi Çek (History Tablosundan)
      let uniqueSymbols = [...new Set(signals.map(s => s.symbol))]
          .filter(s => typeof s === 'string' && s.length > 0); // Sadece geçerli string semboller
  
      if (uniqueSymbols.length === 0) {
          console.warn("Geçerli sembol bulunamadı, backtest devam edemiyor.");
          return res.json({ message: "Sinyallerde geçerli sembol bulunamadı.", tableData: [], chartData: [] });
      }
  
      // Sembollerin volume_digits bilgilerini rates tablosundan çek
      const ratePlaceholders = uniqueSymbols.map(() => '?').join(',');
      const [ratesData] = await pool.execute(
        `SELECT symbol, vdigits, digits, stepSize, tickSize FROM rates WHERE symbol IN (${ratePlaceholders})`,
        uniqueSymbols
      );
      const symbolInfoMap = ratesData.reduce((map, rate) => {
        map[rate.symbol] = { 
          vdigits: Number(rate.vdigits), 
          digits: Number(rate.digits), 
          stepSize: rate.stepSize ? parseFloat(rate.stepSize) : null,
          tickSize: rate.tickSize ? parseFloat(rate.tickSize) : null
        };
        return map;
      }, {});
  
      // Tarih sınırlarını sinyallerden al
      const signalOpenTimes = signals.map(s => new Date(s.open_time).getTime());
      const signalCloseTimes = signals.map(s => new Date(s.close_time).getTime());
      const minSignalOpenTime = Math.min(...signalOpenTimes);
      const maxSignalCloseTime = Math.max(...signalCloseTimes);
  
      // Tarihleri yuvarla ve geçmiş veri aralığını belirle
      const historyStartTime = floorTo5Minutes(minSignalOpenTime - 5 * 60 * 1000); // Biraz öncesinden başla
      const historyEndTime = floorTo5Minutes(maxSignalCloseTime + 5 * 60 * 1000); // Biraz sonrasına kadar git
      const historyStartDate = new Date(historyStartTime);
      const historyEndDate = new Date(historyEndTime);
      const fiveMinutes = 5 * 60 * 1000; 
  
      if (isNaN(historyStartTime) || isNaN(historyEndTime)) {
          console.error("Geçersiz tarih aralığı hesaplandı:", { historyStartDate, historyEndDate });
          return res.status(400).json({ error: "Sinyal tarihlerinden geçerli bir aralık hesaplanamadı." });
      }
  
      console.log(`Geçmiş ${timeframe} verisi çekilecek semboller:`, uniqueSymbols, `Tarih Aralığı (Yuvarlanmış): ${historyStartDate.toISOString()} - ${historyEndDate.toISOString()}`);
  
      let historyData = [];
      try {
          const placeholders = uniqueSymbols.map(() => '?').join(','); 
          const query = `SELECT symbol, time, open, high, low, close
                       FROM history
                       WHERE symbol IN (${placeholders})
                       AND timeframe = ?
                       AND time >= ?
                       AND time <= ?
                       ORDER BY time ASC`;
                       
          const formattedStartDate = formatMySQLDateTime(historyStartDate);
          const formattedEndDate = formatMySQLDateTime(historyEndDate);
          const params = [...uniqueSymbols, timeframe, formattedStartDate, formattedEndDate];
          
          console.log("Executing history query with dynamic placeholders and params:", JSON.stringify(params));
          console.log("Generated Query:", query);
  
          [historyData] = await pool.execute(query, params);
  
      } catch (dbError) {
          console.error('History tablosu sorgu hatası:', dbError);
          console.error('Sorgu:', dbError.sql); // Hata nesnesindeki sorgu genellikle ? ile gelir
          console.error('Oluşturulan Sorgu (Tekrar):', `SELECT symbol, time, open, high, low, close FROM history WHERE symbol IN (${uniqueSymbols.map(() => '?').join(',')}) AND timeframe = ? AND time >= ? AND time <= ? ORDER BY time ASC`);
          console.error('Parametreler (Tekrar):', JSON.stringify([...uniqueSymbols, timeframe, formatMySQLDateTime(historyStartDate), formatMySQLDateTime(historyEndDate)]));
          return res.status(500).json({ error: 'Geçmiş veri çekilirken veritabanı hatası: ' + dbError.message });
      }
      
      console.log(`Toplam ${historyData.length} adet ${timeframe} geçmiş veri kaydı bulundu.`);
  
      if (historyData.length === 0) {
           return res.status(404).json({ error: `Belirtilen tarih aralığı ve semboller için ${timeframe} geçmiş verisi bulunamadı. Lütfen önce verinin indirildiğinden emin olun.` });
      }
  
      // historyMap oluştururken zaman damgasını yuvarla
      const historyMap = {};
      for (const candle of historyData) {
          const timestamp = floorTo5Minutes(new Date(candle.time).getTime()); // YUVARLA
          if (!historyMap[candle.symbol]) {
              historyMap[candle.symbol] = {};
          }
          historyMap[candle.symbol][timestamp] = {
              ...candle,
              open: parseFloat(candle.open),
              high: parseFloat(candle.high),
              low: parseFloat(candle.low),
              close: parseFloat(candle.close)
          };
      }
  
      // signalsByOpenTime oluştururken zaman damgasını yuvarla
      const signalsByOpenTime = {};
      for (const signal of signals) {
        // Yön bilgisini belirle: Öncelik direction alanında
        let trend = null;
        if (signal.direction && typeof signal.direction === 'string' && signal.direction.trim() !== '') {
          if (signal.direction.toUpperCase() === 'LONG' || signal.direction.toUpperCase() === 'BUY') {
            trend = 'LONG';
          } else if (signal.direction.toUpperCase() === 'SHORT' || signal.direction.toUpperCase() === 'SELL') {
            trend = 'SHORT';
          }
        }
        // Eğer direction yoksa veya tanımsızsa, eski trend mantığına bak
        if (!trend) {
          if (signal.trend && typeof signal.trend === 'string' && signal.trend.trim() !== '') {
            trend = signal.trend.toUpperCase() === 'SHORT' ? 'SHORT' : 'LONG';
          } else {
            const openP = parseFloat(signal.open_price);
            const closeP = parseFloat(signal.close_price);
            if (!isNaN(openP) && !isNaN(closeP)) {
              if (closeP > openP) trend = 'LONG';
              else if (closeP < openP) trend = 'SHORT';
              else trend = 'LONG'; // eşitse default LONG
            } else {
              trend = 'LONG'; // fallback
            }
          }
        }
        signal.trend = trend;
        const openTimestamp = floorTo5Minutes(new Date(signal.open_time).getTime()); // YUVARLA
        if (!signalsByOpenTime[openTimestamp]) {
          signalsByOpenTime[openTimestamp] = [];
        }
        signalsByOpenTime[openTimestamp].push(signal);
      }
  
      // Başlangıç miktarını doğrula ve varsayılan ata
      let initialInvestmentUSDT = parseFloat(entryAmount);
      if (isNaN(initialInvestmentUSDT) || initialInvestmentUSDT <= 0) {
        console.warn(`Geçersiz veya eksik başlangıç miktarı (${entryAmount}), varsayılan 1000 USDT kullanılıyor.`);
        initialInvestmentUSDT = 1000;
      }

      // YENİ: Kaldıraç değerini al ve doğrula
      let userLeverage = parseFloat(leverage);
      if (isNaN(userLeverage) || userLeverage <= 0) {
          console.warn(`Geçersiz veya eksik kaldıraç (${leverage}), varsayılan olarak 1 (kaldıraçsız) kullanılacak.`);
          userLeverage = 1;
      }

      // 3. TP/SL ile Zaman Adımlı Simülasyon (5dk Aralıklarla - Yuvarlanmış)
      console.log(`--- USDT Bazlı TP/SL Simülasyon (${timeframe}) Başlıyor (5dk Adımlar - Yuvarlanmış) ---`);
      console.log(`Başlangıç Miktarı: ${initialInvestmentUSDT} USDT, Kaldıraç: ${userLeverage}x`);
      console.log(`Ayarlar: tradeType=${tradeType}, singleTpValue=${singleTpValue}, stopLossType=${stopLossType}, customStopLoss=${customStopLoss}`);
      
      const simulationResults = [];
      const chartPoints = []; // [(timestamp, kümülatif_kar_usdt)]
      let cumulativeProfitUSDT = 0; // Kümülatif karı USDT olarak takip et
      let openPositions = {}; 
      let tradeCounter = 1;
  
      // Döngü sınırlarını yuvarlanmış değerlerden al
      const loopStartTime = floorTo5Minutes(minSignalOpenTime); // YUVARLA
      const loopEndTime = floorTo5Minutes(maxSignalCloseTime);   // YUVARLA
      let executedSteps = 0; // İşlenen adım sayacı
  
      let currentTime = loopStartTime;
      console.log(`Simülasyon Zaman Aralığı (Yuvarlanmış): ${new Date(loopStartTime).toISOString()} - ${new Date(loopEndTime).toISOString()}`);
  
      // Zaman adımlarında (5dk) ilerle
      while (currentTime <= loopEndTime) {
          executedSteps++;
          const currentDateTime = new Date(currentTime);
  
          // --- Yeni Pozisyonları Aç --- 
          if (signalsByOpenTime[currentTime]) {
              for (const signalToOpen of signalsByOpenTime[currentTime]) {
                  const symbol = signalToOpen.symbol;
                  const entryCandle = historyMap[symbol]?.[currentTime];
                  const digits = symbolInfoMap[symbol]?.digits;
                  const vdigits = symbolInfoMap[symbol]?.vdigits;
                  const entryPriceRaw = parseFloat(signalToOpen.entry2);
                  const entryPrice = entryPriceRaw > 0 ? Number(entryPriceRaw) : 0;
  
                  if (!entryPrice || entryPrice <= 0) {
                      console.warn(`[${formatMySQLDateTime(currentDateTime)}] Sinyal ID ${signalToOpen.id} (${symbol}) için açılış fiyatı (${signalToOpen.open_price}) geçersiz, atlanıyor.`);
                      continue;
                  }
                  if (!entryCandle) {
                     console.warn(`[${formatMySQLDateTime(currentDateTime)}] Sinyal ID ${signalToOpen.id} (${symbol}) açılışı için ${timeframe} mum verisi (yuvarlanmış zaman) bulunamadı, atlanıyor.`);
                     continue; 
                  }

                  // --- YENİ: TP'lere göre margin bölerek çoklu pozisyon açma ---
                  if (req.body.entryType === 'percentage' && req.body.multipleTpValues) {
                    const tpPercentagesFromForm = req.body.multipleTpValues;
                    
                    // Sinyalde var olan ve değeri olan TP'leri (tp1, tp2, vb.) bul ve doğru sırala
                    const signalTpKeys = Object.keys(signalToOpen)
                      .filter(key => key.startsWith('tp') && key!="tp_hit" && key!="sl_hit" && parseFloat(signalToOpen[key]) > 0)
                      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

                    // Formdan gelen multipleTpValues içindeki dolu oranları sırala
                    const formTpPercents = Object.entries(tpPercentagesFromForm)
                      .filter(([k, v]) => parseFloat(v) > 0)
                      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

                    // Sinyaldeki TP'lere sırayla formdaki oranları ata
                    for (let idx = 0; idx < signalTpKeys.length; idx++) {
                      const tpKey = signalTpKeys[idx];
                      const [formKey, formPercent] = formTpPercents[idx] || [];
                      const percent = formPercent !== undefined ? parseFloat(formPercent) : 0;
                      if (!percent || percent <= 0) continue;
                      
                      const marginForTp = initialInvestmentUSDT * (percent / 100);
                      if (marginForTp <= 0) continue;

                      const positionValue = marginForTp * userLeverage; // Kaldıraç uygulandı
                      const lotAmount = entryPrice > 0 ? positionValue / entryPrice : 0;
                      const formattedLot = Number(lotAmount);
                      
                      let slPrice = null; // Varsayalın olarak SL yok
                      if (stopLossType === 'signal') {
                        slPrice = signalToOpen.stop_loss > 0 ? Number(signalToOpen.stop_loss) : null;
                      } else if (stopLossType === 'custom' && customStopLoss > 0) {
                        const slPercent = parseFloat(customStopLoss) / 100;
                        slPrice = signalToOpen.trend === 'LONG'
                          ? entryPrice * (1 - slPercent)
                          : entryPrice * (1 + slPercent);
                      }
                      
                      // TP fiyatı doğrudan tpKey ile
                      console.log("signalToOpen[tpKey]", signalToOpen[tpKey]," tpKey",tpKey);

                      const tpPrice = (signalToOpen[tpKey] !== undefined && signalToOpen[tpKey] !== null && !isNaN(parseFloat(signalToOpen[tpKey])) && parseFloat(signalToOpen[tpKey]) > 0) ? parseFloat(signalToOpen[tpKey]) : 0;
                      const positionKey = `${symbol}_${signalToOpen.id}_${tpKey}`;
                      if (openPositions[positionKey]) continue;
                      
                      const positionData = {
                        signal: signalToOpen,
                        entryPrice: parseFloat(entryPrice),
                        entryTime: currentDateTime,
                        initialInvestment: parseFloat(marginForTp),
                        resultTableId: tradeCounter++,
                        tpPrice: parseFloat(tpPrice), // Doğrudan tpX fiyatı
                        slPrice: parseFloat(slPrice),
                        tpIndex: idx + 1,
                        lot: lotAmount // lot number olarak kaydediliyor
                      };

                      console.log("positionData", positionData);


                      openPositions[positionKey] = positionData;
                      // Pozisyon açılırken (çoklu TP)
                      simulationResults.push({
                        id: positionData.resultTableId,
                        symbol: symbol,
                        direction: signalToOpen.trend === 'LONG' ? 'BUY' : 'SELL',
                        openPrice: entryPrice,
                        openDate: currentDateTime,
                        volume: lotAmount, // number olarak
                        lot: lotAmount,    // number olarak
                        slPrice: slPrice,
                        tpPrice: tpPrice, // Doğrudan tpX fiyatı
                        tpKey: tpKey, // Hangi tpX ile açıldı (ör: tp1, tp2)
                        closePrice: null,
                        closeDate: null,
                        profit: null,
                        status: 'Tamamlandı',
                        statusCode: 2,
                        apiName: 'Backtest',
                        tp: idx + 1, // Sayısal TP seviyesi
                        yon: signalToOpen.trend,
                        acilisFiyati: entryPrice,
                        acilisTarihi: currentDateTime,
                        kapanisFiyati: null,
                        kapanisTarihi: null,
                        kar: null,
                        toplamKar: null, // Açılışta null bırak
                        signal: signalToOpen
                      });
                      // Pozisyon açılırken logu detaylandır
                      const allTpValues = [];
                      for (let i = 1; i <= 10; i++) {
                        const tpVal = signalToOpen[`tp${i}`];
                        if (tpVal !== undefined && tpVal !== null && !isNaN(parseFloat(tpVal)) && parseFloat(tpVal) > 0) {
                          allTpValues.push(`tp${i}: ${parseFloat(tpVal)}`);
                        }
                      }
                      const logDetails = [
                        `Yön: ${signalToOpen.trend}`,
                        `Tarih: ${signalToOpen.open_time}`,
                        `entry1: ${signalToOpen.entry1}`,
                        `entry2: ${signalToOpen.entry2}`,
                        `sl: ${signalToOpen.stop_loss}`,
                        ...allTpValues
                      ].join(', ');
                      const logTime = formatMySQLDateTime(currentDateTime);
                      console.log(`[${logTime}] Sinyal Detay: ${logDetails}`);
                      console.log(`[${logTime}] Sinyal Kayıt (signals tablosu): ${JSON.stringify(signalToOpen)}`);
                      console.log(`[${logTime}] ${tpKey.toUpperCase()} için Pozisyon Açıldı: ID ${signalToOpen.id}, ${symbol}, ${signalToOpen.trend}, Fiyat: ${entryPrice}, Miktar: ${formattedLot}, TP: ${tpPrice}, SL: ${slPrice}`);
                    }
                  } else {
                    // Sabit miktar veya tek emir: mevcut tekli pozisyon açma mantığı
                    const positionKey = `${symbol}_${signalToOpen.id}`;
                    if (openPositions[positionKey]) continue;

                    const digitsSingle = symbolInfoMap[symbol]?.digits;
                    const vdigitsSingle = symbolInfoMap[symbol]?.vdigits;
                    const positionValue = initialInvestmentUSDT * userLeverage; // Kaldıraç uygulandı
                    const lotAmount = entryPrice > 0 ? positionValue / entryPrice : 0;
                    const formattedLot = Number(lotAmount);

                    let tpPrice = null;
                    // TP fiyatı belirleme:
                    if (signalToOpen.tp1 > 0) {
                        tpPrice = Number(signalToOpen.tp1);
                    } else if (singleTpValue > 0) {
                        const tpPercent = parseFloat(singleTpValue) / 100;
                        const calcTp = signalToOpen.trend === 'LONG' 
                            ? entryPrice * (1 + tpPercent) 
                            : entryPrice * (1 - tpPercent);
                        tpPrice = Number(calcTp);
                    }

                    let slPrice = null; // Varsayılan olarak SL yok
                    if (stopLossType === 'signal') {
                      slPrice = signalToOpen.stop_loss > 0 ? Number(signalToOpen.stop_loss) : null;
                    } else if (stopLossType === 'custom' && customStopLoss > 0) {
                      const slPercent = parseFloat(customStopLoss) / 100;
                      slPrice = signalToOpen.trend === 'LONG'
                        ? entryPrice * (1 - slPercent)
                        : entryPrice * (1 + slPercent);
                    }
                    
                    const positionData = {
                        signal: signalToOpen,
                        entryPrice: entryPrice,
                        entryTime: currentDateTime,
                        initialInvestment: initialInvestmentUSDT,
                        resultTableId: tradeCounter++,
                        tpPrice: tpPrice, 
                        slPrice: slPrice  
                    };
                    openPositions[positionKey] = positionData;
                    // Pozisyon açılırken (tekli TP)
                    simulationResults.push({
                      id: positionData.resultTableId,
                      symbol: symbol,
                      direction: signalToOpen.trend === 'LONG' ? 'BUY' : 'SELL',
                      openPrice: entryPrice,
                      openDate: currentDateTime,
                      volume: lotAmount, // number olarak
                      lot: lotAmount,    // number olarak
                      slPrice: slPrice,
                      tpPrice: tpPrice,
                      closePrice: null,
                      closeDate: null,
                      profit: null,
                      status: 'Tamamlandı',
                      statusCode: 2,
                      apiName: 'Backtest',
                      tp: tpPrice ? 1 : null, // Tekli TP'de 1 olarak ata
                      yon: signalToOpen.trend,
                      acilisFiyati: entryPrice,
                      acilisTarihi: currentDateTime,
                      kapanisFiyati: null,
                      kapanisTarihi: null,
                      kar: null,
                      toplamKar: null // Açılışta null bırak
                    });
                    console.log(`[${formatMySQLDateTime(currentDateTime)}] Pozisyon Açıldı: ID ${signalToOpen.id}, ${symbol}, ${signalToOpen.trend}, Fiyat: ${entryPrice}, Miktar: ${formattedLot}, TP: ${tpPrice}, SL: ${slPrice}`);
                  }
              }
          }
  
          // --- Açık Pozisyonları Kontrol Et (Kapanış için) --- 
          const positionKeysToCheck = Object.keys(openPositions);
          for (const positionKey of positionKeysToCheck) {
               const position = openPositions[positionKey];
               const signal = position.signal;
               const symbol = signal.symbol;
               const digits = symbolInfoMap[symbol]?.digits ?? 4;
               const currentCandle = historyMap[symbol]?.[currentTime];
               const isLong = signal.trend === 'LONG';
               let shouldClose = false;
               let exitPrice = null;
               let closeReason = "";
  
               // TP/SL Kontrolü (eğer mum varsa)
               if (currentCandle?.high && currentCandle?.low) {
                   const candleHigh = currentCandle.high;
                   const candleLow = currentCandle.low;
                   
                   // 1. SL Kontrolü
                   if (position.slPrice !== null && !shouldClose) {
                       if ((isLong && candleLow <= position.slPrice) || (!isLong && candleHigh >= position.slPrice)) {
                           shouldClose = true;
                           exitPrice = position.slPrice;
                           closeReason = "SL Hit";
                       }
                   }
                   // 2. TP Kontrolü
                   if (position.tpPrice !== null && !shouldClose) {
                       if ((isLong && candleHigh >= position.tpPrice) || (!isLong && candleLow <= position.tpPrice)) {
                           shouldClose = true;
                           exitPrice = position.tpPrice;
                           closeReason = "TP Hit";
                       }
                   }
               }
               
               // 3. Sinyal Kapanış Zamanı Kontrolü
               const signalCloseTimestamp = floorTo5Minutes(new Date(signal.close_time).getTime());
               if (!shouldClose && currentTime >= signalCloseTimestamp) {
                   shouldClose = true; // Kapanması gerektiğini işaretle
                   exitPrice = parseFloat(signal.close_price);
                   closeReason = "Sinyal Kapanışı";
                   // Sinyal kapanış fiyatı geçersizse fallback yap
                   if (!exitPrice || exitPrice <= 0) {
                       const fallbackCandle = historyMap[symbol]?.[currentTime] ?? historyMap[symbol]?.[signalCloseTimestamp]; 
                       if(fallbackCandle?.close_price > 0) {
                           exitPrice = fallbackCandle.close_price;
                           console.warn(`[${formatMySQLDateTime(currentDateTime)}] Sinyal Kapanışı ID ${signal.id} (${symbol}) çıkış fiyatı geçersiz, mum kapanışı (${exitPrice}) kullanılıyor.`);
                       } else {
                           exitPrice = position.entryPrice; 
                           console.error(`[${formatMySQLDateTime(currentDateTime)}] KRİTİK: Sinyal Kapanışı ID ${signal.id} (${symbol}) için GEÇERLİ KAPANIS FİYATI BULUNAMADI. İşlem giriş fiyatından kapatılıyor.`);
                           closeReason = "Sinyal Kapanışı (Fiyat Yok)";
                       }
                   } 
               }
  
               // Kapanış İşlemleri
               if (shouldClose) {
                   if (!exitPrice || exitPrice <= 0) {
                       exitPrice = currentCandle?.close_price > 0 ? currentCandle.close_price : position.entryPrice;
                   }
                   // Karı USDT olarak hesapla (kapanış fiyatı - açılış fiyatı) * lot
                   const lot = Number(position.lot ?? position.volume ?? 0);
                   console.log('DEBUG lot:', lot, 'position.lot:', position.lot, 'position.volume:', position.volume);
                   console.log('DEBUG exitPrice:', exitPrice, 'entryPrice:', position.entryPrice);
                   let pnlUSDT = 0;
                   if (!isNaN(lot) && lot > 0) {
                       pnlUSDT = (exitPrice - position.entryPrice) * lot;
                       console.log('DEBUG pnlUSDT:', pnlUSDT, '= (', exitPrice, '-', position.entryPrice, ')*', lot);
                   } else {
                       console.log('DEBUG: lot değeri geçersiz, kar hesaplanmadı');
                   }
                   cumulativeProfitUSDT += pnlUSDT;
                   const resultIndex = simulationResults.findIndex(r => r.id === position.resultTableId);
                   if (resultIndex > -1) {
                       simulationResults[resultIndex].closePrice = exitPrice;
                       simulationResults[resultIndex].closeDate = currentDateTime;
                       simulationResults[resultIndex].profit = pnlUSDT.toFixed(3);
                       simulationResults[resultIndex].kapanisFiyati = exitPrice;
                       simulationResults[resultIndex].kapanisTarihi = currentDateTime;
                       simulationResults[resultIndex].kar = pnlUSDT.toFixed(3) + ' USDT';
                       simulationResults[resultIndex].toplamKar = cumulativeProfitUSDT.toFixed(3) + ' USDT';
                       simulationResults[resultIndex].tpPrice = position.tpPrice;
                       simulationResults[resultIndex].slPrice = position.slPrice;
                       simulationResults[resultIndex].closeReason = closeReason;
                       console.log('DEBUG simulationResults[resultIndex]:', simulationResults[resultIndex]);
                   }
                   // Grafik verisini USDT olarak ekle
                   chartPoints.push({
                       timestamp: currentTime,
                       profit: cumulativeProfitUSDT
                   });
                   delete openPositions[positionKey];
               }
           }
           
           currentTime += fiveMinutes;
      }
      
      console.log(`--- USDT Bazlı TP/SL Simülasyon (${timeframe}) Tamamlandı (${executedSteps} adım işlendi) ---`);
  
      // 4. Sonuçları Formatla ve Gönder
 
      // Fiyatları ve lotları formatlamak için yardımcı fonksiyonlar
      const formatPrice = (price, info) => {
          if (price === null || price === undefined || isNaN(Number(price)) || Number(price) <= 0) return '-';
 
          let priceNum = Number(price);
          // Varsayılan hassasiyet olarak info.digits veya 8 kullan
          let precision = info.digits !== undefined ? info.digits : 8;
 
          if (info.tickSize && info.tickSize > 0) {
              // 1. Fiyatı tickSize'a göre yuvarla
              priceNum = Math.round(priceNum / info.tickSize) * info.tickSize;
 
              // 2. tickSize'dan doğru ondalık basamak sayısını (hassasiyeti) belirle
              const tickSizeStr = info.tickSize.toString();
              if (tickSizeStr.includes('e-')) {
                  // Bilimsel gösterimi işler, örn. '1e-7' -> 7
                  precision = parseInt(tickSizeStr.split('e-')[1], 10);
              } else if (tickSizeStr.includes('.')) {
                  // Ondalık gösterimi işler, örn. '0.001' -> 3
                  precision = tickSizeStr.split('.')[1].length;
              } else {
                  // 1, 10 gibi tamsayıları işler
                  precision = 0;
              }
          }
 
          return priceNum.toFixed(precision);
      };
 
      const formatLot = (lot, info) => {
          if (lot === null || lot === undefined || isNaN(Number(lot))) return '-';
          let lotNum = Number(lot);
          if (info.stepSize && info.stepSize > 0) {
            lotNum = Math.floor(lotNum / info.stepSize) * info.stepSize;
          }
          return lotNum.toFixed(info.vdigits || 2); // Fallback to 2 decimals
      };
 
      const finalChartData = chartPoints
          .reduce((acc, point) => {
               if (!acc.length || acc[acc.length - 1].timestamp !== point.timestamp) {
                   acc.push(point);
               } else {
                   acc[acc.length - 1].profit = point.profit; 
               }
               return acc;
           }, [])
          .sort((a, b) => a.timestamp - b.timestamp)
          .map(point => ({
              name: new Date(point.timestamp).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
              profit: parseFloat(point.profit)
          }));
  
      simulationResults.sort((a, b) => b.id - a.id);
  
      // Alan adlarını frontend ile uyumlu hale getir
      const mappedResults = simulationResults.map(item => {
        const info = symbolInfoMap[item.symbol] || { vdigits: 2, digits: 6, stepSize: null, tickSize: null };
        
        let profitNum = 0;
        if (item.profit !== undefined && !isNaN(Number(item.profit))) {
          profitNum = Number(item.profit);
        } else if (item.kar !== undefined && typeof item.kar === 'string') {
          const val = parseFloat(item.kar);
          if (!isNaN(val)) profitNum = val;
        }
        const profitStr = (item.kar && typeof item.kar === 'string') ? item.kar : profitNum.toFixed(3) + ' USDT';
        const totalProfitStr = item.toplamKar ?? '0.000 USDT';
        return {
          symbol: item.symbol,
          direction: item.direction,
          lot: formatLot(item.lot, info),
          openPrice: formatPrice(item.openPrice, info),
          openDate: item.openDate,
          sl: formatPrice(item.slPrice, info),
          tp: formatPrice(item.tpPrice, info),
          closePrice: formatPrice(item.closePrice, info),
          closeDate: item.closeDate,
          profit: profitNum,
          profitStr: profitStr,
          totalProfit: totalProfitStr
        };
      });
  
      res.json({ 
          message: `Backtest tamamlandı. ${signals.length} geçerli sinyal ve ${executedSteps} zaman adımı işlendi.`, 
          tableData: mappedResults, 
          chartData: finalChartData 
      });
  
    } catch (error) {
      console.error('Backtest API Hatası:', error);
      res.status(500).json({ error: 'Backtest sırasında sunucu hatası oluştu: ' + error.message });
    }
  });


export default router;
