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

export const calculateProfitChartData = (trades: TradeData[]) => {
  const validCompletedTrades = trades
    .filter(t => 
        t.statusCode === 2 && 
        t.closeTime && 
        t.profit !== undefined &&
        !isNaN(new Date(t.closeTime).getTime())
    )
    .map(t => ({ ...t, closeDate: new Date(t.closeTime!) }))
    .sort((a, b) => a.closeDate.getTime() - b.closeDate.getTime());

  if (validCompletedTrades.length === 0) {
    return { chartData: [], apiNames: [] };
  }

  const apiNames = [...new Set(validCompletedTrades.map(t => t.apiName))];
  const cumulativeProfits: Record<string, number> = {};
  apiNames.forEach(name => cumulativeProfits[name] = 0);
  const chartDataMap = new Map<number, any>();

  validCompletedTrades.forEach(trade => {
    cumulativeProfits[trade.apiName] += trade.profit!;
    const timestamp = trade.closeDate.getTime();
    const dataPoint: any = {
      timestamp: timestamp,
      name: formatDate(trade.closeTime!)
    };
    apiNames.forEach(name => {
        dataPoint[name] = cumulativeProfits[name];
    });
    chartDataMap.set(timestamp, dataPoint);
  });

  const chartData = Array.from(chartDataMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  return { chartData, apiNames };
}; 