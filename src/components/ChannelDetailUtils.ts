import { Signal2 } from '@/services/api';

// TradeData arayüzünü ChannelDetail sayfası için uyarlıyoruz
export interface TradeData {
  id: number;
  symbol: string;
  direction: string;
  open_price: number;
  close_price: number | null;
  close_time: string | null;
  profit: number | null;
}

/**
 * Verilen sinyal verilerinden kümülatif kar grafiği için veri dizisi oluşturur.
 * @param trades - Kanal detayından gelen sinyal (trade) dizisi.
 * @returns Recharts uyumlu veri dizisi.
 */
export const calculateProfitChartData = (trades: TradeData[]) => {
  if (!trades || trades.length === 0) {
    return { chartData: [], apiNames: [] };
  }

  // İşlemleri kapanış zamanına göre sırala (en eskiden en yeniye)
  const sortedTrades = [...trades]
    .filter(t => t.close_time && t.profit !== null)
    .sort((a, b) => new Date(a.close_time!).getTime() - new Date(b.close_time!).getTime());

  let cumulativeProfit = 0;
  const chartData = sortedTrades.map(trade => {
    const profit = Number(trade.profit) || 0;
    cumulativeProfit += profit;
    
    return {
      name: formatDate(trade.close_time!),
      profit: cumulativeProfit,
    };
  });

  // Bu sayfada tek bir kanal olduğu için apiNames'e sadece bir isim ekliyoruz
  const apiNames = ['profit'];

  return { chartData, apiNames };
};

/**
 * Tarih string'ini "GG.AA.YYYY" formatına çevirir.
 * @param dateStr - Tarih string'i.
 * @returns Formatlanmış tarih.
 */
export const formatDate = (dateStr: string): string => {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
};

// Diğer yardımcı fonksiyonlar (ihtiyaç halinde eklenebilir)
export const getSignalCount = (trades: TradeData[]) => trades.length;

export const getSuccessRate = (trades: TradeData[]) => {
  const closedTrades = trades.filter(t => t.close_time && t.profit !== null);
  if (closedTrades.length === 0) return 0;
  const successfulTrades = closedTrades.filter(t => t.profit! > 0).length;
  return (successfulTrades / closedTrades.length) * 100;
};

export const getTotalProfitPercent = (trades: TradeData[]) => {
  return trades.reduce((acc, trade) => acc + (Number(trade.profit) || 0), 0);
};

export const getSignalProfitStatus = (signal: { profit: number | null | undefined }) => {
  const profit = signal.profit;
  const percent = Number(profit) || 0;
  const isProfit = percent > 0;
  return { percent, isProfit };
};
