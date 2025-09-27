import React, { useEffect, useState } from "react";
import { 
  ArrowUp, 
  ArrowDown, 
  Zap, 
  BarChart3, 
  AlertCircle,
  Settings,
  DollarSign,
  Activity,
  Target,
  BarChart,
  TrendingUp,
  TrendingDown
} from "lucide-react";

import { useLang } from '@/hooks/useLang';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

// Import the newly created components
import StatCard from "./dashboard/StatCard";
import BalanceChart from "./dashboard/BalanceChart";
import SignalsList from "./dashboard/SignalsList";
import TradesList from "./dashboard/TradesList";

const Dashboard: React.FC = () => {
  const { lang } = useLang();
  const { t } = useLang();
  const [trades, setTrades] = useState([]);
  const [openTrades, setOpenTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openAccordion, setOpenAccordion] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | number | null>(null);

  useEffect(() => {
    const telegramId = sessionStorage.getItem("telegramId"); // Test için varsayılan ID
    fetch(`/api/dashboard/${telegramId}`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(apiData => {
        if (!apiData || !apiData.trades || !Array.isArray(apiData.trades)) {
          console.error("API yanıtı geçersiz format:", apiData);
          setTrades([]);
          setOpenTrades([]);
          return;
        }

        const rawTrades = apiData.trades;
        console.log("API'den gelen ham veri:", apiData);
        console.log("İşlenecek trades verisi:", rawTrades);

        const mappedTrades = rawTrades.map((t: any) => {
          try {
            const symbol = t.parite || t.symbol || t.sembol || "Bilinmiyor";
            const side = (typeof t.trend === 'string' && t.trend.toUpperCase() === "LONG" ? "buy" : typeof t.trend === 'string' && t.trend.toUpperCase() === "SHORT" ? "sell" : t.side || t.yon || t.pozisyon || "buy").toLowerCase();
            const entryPrice = parseFloat(t.open_price || t.price || t.giris || "0");
            const timestamp = t.open_time || t.timestamp || t.zaman || new Date().toISOString();
            const exchange = t.borsa_ismi || t.exchange_id || t.exchange || "Bilinmiyor";
            const pnl = parseFloat(t.profit || t.kar_zarar || t.kar || "0");
            const status = (typeof t.durum === 'string' ? t.durum.toLowerCase() : t.status || "active");

            return {
              id: t.id || Math.random().toString(36).substr(2, 9),
              symbol,
              side,
              entryPrice,
              timestamp,
              exchange,
              pnl,
              status,
            };
          } catch (error) {
            console.error("Trade verisi işlenirken hata:", error, t);
            return null;
          }
        }).filter(t => t !== null);

        setTrades(mappedTrades);
        setOpenTrades(mappedTrades);
      })
      .catch(error => {
        // Hata durumunda konsola log yaz ve state'leri boş diziye ayarla
        console.error("Dashboard veri çekme/işleme hatası:", error);
        setTrades([]);
        setOpenTrades([]);
      })
      .finally(() => setLoading(false));
  }, []);

  // Calculate summary statistics
  const activeTrades = trades.length;
  const activeSignals = trades.length;
  
  // Calculate performance
  const pnl = trades
    .filter(t => t.pnl !== undefined)
    .reduce((sum, trade) => sum + (trade.pnl || 0), 0);
  
  // Data for chart
  const chartData = Array.from({ length: 14 }, (_, i) => ({
    date: new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000).toLocaleDateString("tr-TR", { month: "short", day: "numeric" }),
    value: 10000 + Math.random() * 2000 * (i + 1) + (i * 200), // Bakiye büyümesi
    profit: (Math.random() - 0.3) * 800, // Günlük kar/zarar
  }));

  const handleCloseTrade = (id: string | number) => {
    setOpenTrades(prev => prev.filter(trade => trade.id !== id));
  };

  if (loading) return <div>{t('loading')}</div>;
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t('dashboard')}</h2>
        <div className="flex gap-2">
          <Button size="sm">
            <Settings size={16} className="mr-1" />
            {t('settings')}
          </Button>
        </div>
      </div>
      
      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalProfit')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1,234.56</div>
            <p className="text-xs text-muted-foreground">
              +20.1% {t('fromLastMonth')}
            </p>
          </CardContent>
        </Card>
        <Card onClick={() => setOpenAccordion(!openAccordion)} className="cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('activeTrades')}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openTrades.length}</div>
            <p className="text-xs text-muted-foreground">+2 {t('newTrades')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('winRate')}</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">68.5%</div>
            <p className="text-xs text-muted-foreground">
              +4.2% {t('fromLastMonth')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalTrades')}</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <p className="text-xs text-muted-foreground">
              +12 {t('thisMonth')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bakiye Grafiği */}
      <BalanceChart data={chartData} />
      
      {/* Son Sinyaller ve İşlemler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <SignalsList trades={trades} />
        <TradesList trades={trades} />
      </div>

      {openAccordion && (
        <Accordion type="single" value={openAccordion ? 'open' : undefined} className="my-4">
          <AccordionItem value="open">
            <AccordionTrigger>{t('openTrades')}</AccordionTrigger>
            <AccordionContent>
              <table className="min-w-full text-xs border">
                <thead>
                  <tr>
                    <th className="border px-2 py-1">{t('exchange')}</th>
                    <th className="border px-2 py-1">{t('symbol')}</th>
                    <th className="border px-2 py-1">{t('side')}</th>
                    <th className="border px-2 py-1">{t('pnl')}</th>
                    <th className="border px-2 py-1">{t('action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {openTrades.map(trade => (
                    <>
                      <tr key={trade.id} className="cursor-pointer hover:bg-gray-100" onClick={() => setExpandedRow(expandedRow === trade.id ? null : trade.id)}>
                        <td className="border px-2 py-1">{trade.exchange}</td>
                        <td className="border px-2 py-1">{trade.symbol}</td>
                        <td className="border px-2 py-1">{trade.side === 'buy' ? 'LONG' : 'SHORT'}</td>
                        <td className="border px-2 py-1">{trade.pnl ?? '-'}</td>
                        <td className="border px-2 py-1">
                          <Button size="sm" variant="destructive" onClick={e => { e.stopPropagation(); handleCloseTrade(trade.id); }}>{t('close')}</Button>
                        </td>
                      </tr>
                      {expandedRow === trade.id && (
                        <tr>
                          <td colSpan={5} className="border px-2 py-1 bg-gray-50">
                            {t('entryPrice')}: {trade.entryPrice ?? '-'}<br />
                            {t('entryDate')}: {typeof trade.timestamp === 'string' ? trade.timestamp : trade.timestamp.toLocaleString(lang === 'en' ? 'en-US' : 'tr-TR')}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
};

export default Dashboard;
