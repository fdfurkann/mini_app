import { Router } from 'express';
import pool from '../db.js';
import { formatMySQLDateTime, floorTo5Minutes } from '../utils.js';

const router = Router();


// Backtest Başlatma Endpoint'i
router.post('/backtest/start', async (req, res) => {
    console.log("Backtest isteği alındı (USDT Bazlı):", req.body);
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
        `SELECT symbol, vdigits, digits FROM rates WHERE symbol IN (${ratePlaceholders})`,
        uniqueSymbols
      );
      const symbolInfoMap = ratesData.reduce((map, rate) => {
        map[rate.symbol] = { vdigits: Number(rate.vdigits), digits: Number(rate.digits) };
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
          // Trend/yön bilgisini belirle
          let trend = signal.trend;
          if (!trend || (typeof trend === 'string' && trend.trim() === '')) {
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
  
      // 3. TP/SL ile Zaman Adımlı Simülasyon (5dk Aralıklarla - Yuvarlanmış)
      console.log(`--- USDT Bazlı TP/SL Simülasyon (${timeframe}) Başlıyor (5dk Adımlar - Yuvarlanmış) ---`);
      console.log(`Başlangıç Miktarı: ${initialInvestmentUSDT} USDT`);
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
                      console.warn(`[${currentDateTime.toISOString()}] Sinyal ID ${signalToOpen.id} (${symbol}) için açılış fiyatı (${signalToOpen.open_price}) geçersiz, atlanıyor.`);
                      continue;
                  }
                  if (!entryCandle) {
                     console.warn(`[${currentDateTime.toISOString()}] Sinyal ID ${signalToOpen.id} (${symbol}) açılışı için ${timeframe} mum verisi (yuvarlanmış zaman) bulunamadı, atlanıyor.`);
                     continue; 
                  }

                  // --- YENİ: TP'lere göre margin bölerek çoklu pozisyon açma ---
                  if (req.body.entryType === 'percentage' && req.body.multipleTpValues) {
                    const tpPercentagesFromForm = req.body.multipleTpValues;
                    
                    // Sinyalde var olan ve değeri olan TP'leri (tp1, tp2, vb.) bul ve doğru sırala
                    const signalTpKeys = Object.keys(signalToOpen)
                      .filter(key => key.startsWith('tp') && parseFloat(signalToOpen[key]) > 0)
                      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

                    for (let idx = 0; idx < signalTpKeys.length; idx++) {
                      const tpKey = signalTpKeys[idx]; // tpKey 'tp1', 'tp2', etc. olabilir
                      const percent = parseFloat(tpPercentagesFromForm[tpKey]);
                      
                      // Formdan bu TP için bir yüzde gelmiş mi ve geçerli mi kontrol et
                      if (!percent || percent <= 0) {
                        continue;
                      }

                      const margin = initialInvestmentUSDT * (percent / 100);
                      if (margin <= 0) continue;
                      
                      const lotAmount = entryPrice > 0 ? margin / entryPrice : 0;
                      const formattedLot = Number(lotAmount);

                      const tpValueRaw = parseFloat(signalToOpen[tpKey]);
                      const tpValue = tpValueRaw > 0 ? Number(tpValueRaw) : null;

                      const slPrice = signalToOpen.stop_loss > 0 ? Number(signalToOpen.stop_loss) : null;
                      
                      const positionKey = `${symbol}_${signalToOpen.id}_${tpKey}`;
                      if (openPositions[positionKey]) continue;
                      const positionData = {
                        signal: signalToOpen,
                        entryPrice: entryPrice,
                        entryTime: currentDateTime,
                        initialInvestment: margin,
                        resultTableId: tradeCounter++,
                        tpPrice: tpValue,
                        slPrice: slPrice,
                        tpIndex: idx + 1
                      };
                      openPositions[positionKey] = positionData;
                      simulationResults.push({
                        id: positionData.resultTableId,
                        symbol: symbol,
                        yon: signalToOpen.trend,
                        lot: formattedLot,
                        acilisFiyati: entryPrice,
                        acilisTarihi: currentDateTime,
                        kapanisFiyati: null,
                        kapanisTarihi: null,
                        kar: null,
                        toplamKar: `${cumulativeProfitUSDT.toFixed(4)} USDT`,
                        tp: tpKey.toUpperCase(),
                        tpPrice: tpValue,
                        slPrice: slPrice
                      });
                      console.log(`[${currentDateTime.toISOString()}] ${tpKey.toUpperCase()} için Pozisyon Açıldı: ID ${signalToOpen.id}, ${symbol}, ${signalToOpen.trend}, Fiyat: ${entryPrice}, Miktar: ${formattedLot}, TP: ${tpValue}, SL: ${slPrice}`);
                    }
                  } else {
                    // Sabit miktar veya tek emir: mevcut tekli pozisyon açma mantığı
                    const digitsSingle = symbolInfoMap[symbol]?.digits;
                    const vdigitsSingle = symbolInfoMap[symbol]?.vdigits;
                    const lotAmount = entryPrice > 0 ? initialInvestmentUSDT / entryPrice : 0;
                    const formattedLot = Number(lotAmount);

                    let tpPrice = null;
                    if (tradeType === 'single') {
                        // Eğer sinyalde tp1 varsa onu kullan, yoksa formdan gelen yüzdeyi hesapla
                        if (signalToOpen.tp1 > 0) {
                            tpPrice = Number(signalToOpen.tp1);
                        } else if (singleTpValue > 0) {
                            const tpPercent = parseFloat(singleTpValue) / 100;
                            const calcTp = signalToOpen.trend === 'LONG' 
                                ? entryPrice * (1 + tpPercent) 
                                : entryPrice * (1 - tpPercent);
                            tpPrice = Number(calcTp);
                        }
                    }

                    const slPrice = signalToOpen.stop_loss > 0 ? Number(signalToOpen.stop_loss) : null;
                    
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
                    simulationResults.push({
                        id: positionData.resultTableId,
                        symbol: symbol,
                        yon: signalToOpen.trend,
                        lot: formattedLot,
                        acilisFiyati: entryPrice,
                        acilisTarihi: currentDateTime,
                        kapanisFiyati: null,
                        kapanisTarihi: null,
                        kar: null,
                        toplamKar: `${cumulativeProfitUSDT.toFixed(4)} USDT`
                    });
                    console.log(`[${currentDateTime.toISOString()}] Pozisyon Açıldı: ID ${signalToOpen.id}, ${symbol}, ${signalToOpen.trend}, Fiyat: ${entryPrice}, Miktar: ${formattedLot}, TP: ${tpPrice}, SL: ${slPrice}`);
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
                           console.warn(`[${currentDateTime.toISOString()}] Sinyal Kapanışı ID ${signal.id} (${symbol}) çıkış fiyatı geçersiz, mum kapanışı (${exitPrice}) kullanılıyor.`);
                       } else {
                           exitPrice = position.entryPrice; 
                           console.error(`[${currentDateTime.toISOString()}] KRİTİK: Sinyal Kapanışı ID ${signal.id} (${symbol}) için GEÇERLİ KAPANIS FİYATI BULUNAMADI. İşlem giriş fiyatından kapatılıyor.`);
                           closeReason = "Sinyal Kapanışı (Fiyat Yok)";
                       }
                   } 
               }
  
               // Kapanış İşlemleri
               if (shouldClose) {
                   if (!exitPrice || exitPrice <= 0) { // Son bir kontrol
                       console.warn(`[${currentDateTime.toISOString()}] Kapanış ID ${signal.id} (${symbol}) için ${closeReason} fiyatı (${exitPrice}) geçersiz, mum kapanışı (${currentCandle?.close_price ?? position.entryPrice}) kullanılıyor.`);
                       exitPrice = currentCandle?.close_price > 0 ? currentCandle.close_price : position.entryPrice; // En son fallback
                   }
  
                   // Karı USDT olarak hesapla
                   const pnlUSDT = ((exitPrice - position.entryPrice) / position.entryPrice) * (isLong ? 1 : -1) * position.initialInvestment;
                   cumulativeProfitUSDT += pnlUSDT;
  
                   const resultIndex = simulationResults.findIndex(r => r.id === position.resultTableId);
                   if (resultIndex > -1) {
                       simulationResults[resultIndex].kapanisFiyati = exitPrice;
                       simulationResults[resultIndex].kapanisTarihi = currentDateTime;
                       simulationResults[resultIndex].kar = `${pnlUSDT} USDT`;
                       simulationResults[resultIndex].toplamKar = `${cumulativeProfitUSDT.toFixed(4)} USDT`;
                   } else {
                       console.error(`HATA: Kapanacak işlem için tablo satırı bulunamadı (ID: ${position.resultTableId})`);
                   }
  
                   // Grafik verisini USDT olarak ekle
                   chartPoints.push({
                       timestamp: currentTime,
                       profit: cumulativeProfitUSDT
                   });
  
                   console.log(`[${currentDateTime.toISOString()}] Pozisyon Kapandı: ID ${signal.id}, ${symbol}, Neden: ${closeReason}, Fiyat: ${exitPrice}, Kar: ${pnlUSDT} USDT, Toplam Kar: ${cumulativeProfitUSDT.toFixed(4)} USDT`);
  
                   delete openPositions[positionKey];
               }
           }
           
           currentTime += fiveMinutes;
      }
      
      console.log(`--- USDT Bazlı TP/SL Simülasyon (${timeframe}) Tamamlandı (${executedSteps} adım işlendi) ---`);
  
      // 4. Sonuçları Formatla ve Gönder
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
        let slPriceNum = null, tpPriceNum = null, lotNum = null, digits = 4, vdigits = 2;
        if (item.symbol && symbolInfoMap[item.symbol]) {
          digits = symbolInfoMap[item.symbol].digits ?? 4;
          vdigits = symbolInfoMap[item.symbol].vdigits ?? 2;
        }
        if (item.slPrice !== null && item.slPrice !== undefined && item.slPrice !== '') {
          slPriceNum = Number(item.slPrice);
        }
        if (item.tpPrice !== null && item.tpPrice !== undefined && item.tpPrice !== '') {
          tpPriceNum = Number(item.tpPrice);
        }
        if (item.lot !== null && item.lot !== undefined && item.lot !== '') {
          lotNum = Number(item.lot);
        }
        // Fiyat ve lot alanlarını hem string (toFixed) hem number olarak dön
        const openPriceNum = item.acilisFiyati !== null && item.acilisFiyati !== undefined ? Number(item.acilisFiyati) : null;
        const closePriceNum = item.kapanisFiyati !== null && item.kapanisFiyati !== undefined ? Number(item.kapanisFiyati) : null;
        const slPriceStr = slPriceNum !== null ? slPriceNum.toFixed(digits) : null;
        const tpPriceStr = tpPriceNum !== null ? tpPriceNum.toFixed(digits) : null;
        const openPriceStr = openPriceNum !== null ? openPriceNum.toFixed(digits) : null;
        const closePriceStr = closePriceNum !== null ? closePriceNum.toFixed(digits) : null;
        const lotStr = lotNum !== null ? lotNum.toFixed(vdigits) : null;
        const profitNum = item.kar ? parseFloat(parseFloat(String(item.kar).replace(' USDT',''))) : null;
        const profitStr = profitNum !== null ? profitNum.toFixed(4) + ' USDT' : null;
        return {
          id: item.id,
          symbol: item.symbol,
          direction: item.yon === 'LONG' ? 'BUY' : (item.yon === 'SHORT' ? 'SELL' : item.yon),
          lot: lotStr,
          lotNum,
          openPrice: openPriceStr,
          openPriceNum,
          openDate: item.acilisTarihi,
          closePrice: closePriceStr,
          closePriceNum,
          closeDate: item.kapanisTarihi,
          profit: profitNum,
          profitStr,
          totalProfit: item.toplamKar,
          tp: item.tp,
          tpPrice: tpPriceStr,
          tpPriceNum,
          slPrice: slPriceStr,
          slPriceNum,
          digits,
          vdigits
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
