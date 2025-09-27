// TradeHistory yardımcı fonksiyonları ve tipleri
export interface TradeData {
  ticket: number; // signal.id
  symbol: string; // signal.symbol
  side: "BUY" | "SELL"; // signal.trend
  openPrice: number | undefined; // signal.open
  openTime: string; // signal.opentime
  volume: number | undefined; // signal.volume
  sl: number | undefined; // signal.sl
  tp: number | undefined; // signal.tp
  closePrice: number | undefined; // signal.close
  closeTime: string; // signal.closetime
  profit: number | undefined; // signal.profit
  status: string; // Metinsel durum (Açık, Hatalı vb.)
  statusCode: number; // Sayısal durum (0, 1, 2, 3)
  apiName: string; // API Anahtarı Adı (apiKeysMap ile bulunur)
  event?: string; // Hata mesajı için (signal.event)
  direction?: string; // LONG/SHORT
  tp_hit?: number; // Hangi TP'ye kadar gitmiş
  sl_hit?: number; // SL vurmuş mu
  stop_loss?: number; // SL fiyatı
  tp1?: number; tp2?: number; tp3?: number; tp4?: number; tp5?: number; tp6?: number; tp7?: number; tp8?: number; tp9?: number; tp10?: number;
}

export const formatDate = (dateStr: string) => {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateStr;
  }
};

// /channels API endpointindekiyle birebir aynı mantıkta kar yüzdesi hesaplama
export function calcSignalPercent(signal: any): number {
  const open = parseFloat(signal.open_price ?? signal.openPrice);
  const direction = signal.direction ?? signal.side;
  const tp_hit = parseInt(signal.tp_hit ?? 0);
  const sl_hit = parseInt(signal.sl_hit ?? 0);
  let closePrice = open;
  if (tp_hit > 0) {
    closePrice = parseFloat(signal[`tp${tp_hit}`]) || open;
  } else if (sl_hit === 1) {
    closePrice = parseFloat(signal.stop_loss) || open;
  }
  if (tp_hit > 0) {
    if (direction === 'LONG' || direction === 'BUY') {
      return ((closePrice - open) / open) * 100;
    } else {
      return ((open - closePrice) / open) * 100;
    }
  } else if (sl_hit === 1) {
    if (direction === 'LONG' || direction === 'BUY') {
      return ((closePrice - open) / open) * 100;
    } else {
      return ((open - closePrice) / open) * 100;
    }
  }
  return 0;
}

// Kar grafiği: /channels API endpointiyle aynı mantıkta kümülatif yüzdelik kar
export const calculateProfitChartData = (trades: TradeData[]) => {
  const validCompletedTrades = trades
    .filter(t => t.statusCode === 2 && t.closeTime && t.openPrice && (t.tp_hit || t.sl_hit))
    .map(t => ({ ...t, closeDate: new Date(t.closeTime!) }))
    .sort((a, b) => a.closeDate.getTime() - b.closeDate.getTime());
  if (validCompletedTrades.length === 0) {
    return { chartData: [], apiNames: [] };
  }
  const apiNames = [...new Set(validCompletedTrades.map(t => t.apiName))];
  const cumulativePercents: Record<string, number> = {};
  apiNames.forEach(name => cumulativePercents[name] = 0);
  const chartDataMap = new Map<number, any>();
  validCompletedTrades.forEach(trade => {
    const percent = calcSignalPercent(trade);
    cumulativePercents[trade.apiName] += percent;
    const timestamp = trade.closeDate.getTime();
    const dataPoint: any = {
      timestamp: timestamp,
      name: formatDate(trade.closeTime!)
    };
    apiNames.forEach(name => {
      dataPoint[name] = cumulativePercents[name];
    });
    chartDataMap.set(timestamp, dataPoint);
  });
  const chartData = Array.from(chartDataMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  return { chartData, apiNames };
};

// Tabloya kar/zarar yüzdesi ve pozitif/negatif gösterim için yardımcı
export function getSignalProfitStatus(signal: any): { percent: number; isProfit: boolean } {
  const percent = calcSignalPercent(signal);
  return { percent, isProfit: percent > 0 };
}

// Toplam sinyal sayısı
export const getSignalCount = (trades: TradeData[]) => trades.length;

// Başarı oranı (pozitif kar/zarar yüzdesi olan işlemlerin oranı)
export const getSuccessRate = (trades: TradeData[]) => {
  const valid = trades.filter(t => t.statusCode === 2 && typeof t.openPrice === 'number' && typeof t.closePrice === 'number');
  if (valid.length === 0) return 0;
  const success = valid.filter(t => ((t.closePrice! - t.openPrice!) / t.openPrice!) * 100 > 0).length;
  return (success / valid.length) * 100;
};

// Toplam kâr yüzdesi (grafikteki son değer)
export const getTotalProfitPercent = (trades: TradeData[]) => {
  const { chartData, apiNames } = calculateProfitChartData(trades);
  if (!chartData.length || !apiNames.length) return 0;
  const lastPoint = chartData[chartData.length - 1];
  return lastPoint[apiNames[0]] || 0;
}; 