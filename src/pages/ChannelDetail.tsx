import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { Signal as SignalIcon, TrendingUp, Users, Percent, ExternalLink, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { getChannelById, Signal2 } from '@/services/api';
import { Badge } from "@/components/ui/badge";

import ChannelDetailTable from '@/components/ChannelDetailTable';
import { calculateProfitChartData, getSignalProfitStatus, TradeData } from '@/components/ChannelDetailUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLang } from '@/hooks/useLang';

const COLORS = ["hsl(var(--primary))"];

const formatDate = (dateStr: string) => {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) { return dateStr; }
};

const ChannelDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [channelData, setChannelData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { lang } = useLang();
  const { t } = useLang();
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const isMobileView = useIsMobile();

  // trades -> doğrudan API'den gelen signals dizisini kullan
  const trades: TradeData[] = useMemo(() => {
    if (!channelData || !channelData.signals) return [];
    return channelData.signals.map((signal: any) => ({
      ...signal,
      ticket: signal.id,
      symbol: signal.symbol,
      side: (typeof signal.direction === 'string' && signal.direction.toUpperCase() === 'LONG') ? 'BUY' : 'SELL',
      openPrice: signal.open_price,
      openTime: signal.open_time || '',
      closePrice: signal.close_price,
      closeTime: signal.close_time || '',
      status: signal.status || '',
      statusCode: 2,
      apiName: channelData?.room_name,
      // profit, profit_percent, signal_message ve diğer tüm alanlar korunur
    }));
  }, [channelData]);

  // Sayfalama işlemini trades üzerinden yap
  const pageSize = 30;
  const totalPages = Math.ceil(trades.length / pageSize);
  const paginatedTrades = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return trades.slice(start, start + pageSize);
  }, [trades, currentPage]);

  // filteredTrades: arama veya filtreleme yoksa trades'in kendisi
  const filteredTrades = trades;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getChannelById(id, 1, 10000) // limit=10000 olarak gönder
      .then(data => {
        if (!data) {
          setError('Kanal bulunamadı');
        } else {
          console.log("--- [1] API'den gelen ham veri (channelData):", data);
          setChannelData(data);
        }
      })
      .catch(err => {
        console.error('Veriler yüklenirken hata:', err);
        setError('Veriler yüklenirken bir hata oluştu');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  // Kar grafiği verisi: Yeni utility fonksiyonunu kullanarak hesapla
  const { chartData: profitChartData } = useMemo(() => {
    if (!channelData || !channelData.signals) {
      return { chartData: [] };
    }
    return calculateProfitChartData(channelData.signals);
  }, [channelData]);


  const toggleRowExpansion = (ticket: number) => {
    setExpandedRows(prev => ({ ...prev, [ticket]: !prev[ticket] }));
  };
  const goToPreviousPage = () => setCurrentPage(p => Math.max(1, p - 1));
  const goToNextPage = () => setCurrentPage(p => Math.min(totalPages, p + 1));

  // Telegram linkini kurallara göre oluştur
  function getTelegramLink(rawLink: string | undefined): string {
    if (!rawLink || rawLink.trim() === '') return 'https://t.me/OrcaTradeBot';
    const link = rawLink.trim();
    if (link.startsWith('https://t.me')) return link;
    if (link.startsWith('@')) return 'https://t.me/' + link.slice(1);
    return 'https://t.me/' + link;
  }

  if (loading && !channelData) {
    return <div className="flex justify-center items-center py-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  if (error || !channelData) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">{error || t('channel_not_found')}</p>
        <Button onClick={() => navigate('/channels')} size="sm">{t('back_to_channels')}</Button>
      </div>
    );
  }

  const {
    room_name,
    telegram_link,
    totalSignals,
    successRate,
    totalProfit,
    signals,
    pagination,
    profitData,
    channel_img,
    channel_desc
  } = channelData;

  return (
    <div className="max-w-5xl mx-auto px-2 md:px-4">
      {/* Kanal başlığı ve butonlar ortalanmış şekilde */}
      <div className="flex flex-col items-center justify-center mb-4">
        <h1 className="text-2xl font-bold text-center mb-2">{room_name}</h1>
        <div className="flex gap-2 justify-center">
          <Button asChild variant="outline" size="sm" className="rounded-full gap-1 text-xs h-8">
            <Link to={getTelegramLink(telegram_link)} target="_blank">
              {t('go_to_channel')}
              <ExternalLink className="w-3 h-3" />
            </Link>
          </Button>
          <Button size="sm" className="rounded-full gap-1 text-xs h-8">
            <SignalIcon className="w-3 h-3" />{t('subscribe')}
          </Button>
        </div>
      </div>
      {/* Kümülatif bilgi kartları kanal başlığının ALTINA taşındı */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card className="flex-1"><CardContent className="py-2 px-1 flex flex-col items-center justify-center gap-1"><span className="text-base font-semibold">Toplam Sinyal</span><span className="text-base font-semibold">{totalSignals ?? 0}</span></CardContent></Card>
        <Card className="flex-1"><CardContent className="py-2 px-1 flex flex-col items-center justify-center gap-1"><span className="text-base font-semibold">Başarı Oranı</span><span className="text-base font-semibold text-green-500">{successRate?.toFixed(2) ?? 0}%</span></CardContent></Card>
        <Card className="flex-1"><CardContent className="py-2 px-1 flex flex-col items-center justify-center gap-1"><span className="text-base font-semibold">Toplam Kar</span><span className={`text-base font-semibold ${totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>{totalProfit?.toFixed(2) ?? 0}%</span></CardContent></Card>
      </div>
      {channel_img && (
        <div className="flex justify-center mb-2">
          <img src={channel_img} alt="Kanal Resmi" className="max-h-40 rounded shadow" />
        </div>
      )}
      {channel_desc && (
        <div className="text-center text-muted-foreground mb-4">
          <span>{channel_desc}</span>
        </div>
      )}
      {/* Kümülatif kar/zarar grafiği güncellendi */}
      <Card className="border mb-8">
        <CardHeader className="py-2 px-3"><CardTitle className="text-sm">{t('cumulative_profit_loss')}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="h-[300px] w-full">
            {profitChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={profitChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} 
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} 
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickLine={{ stroke: "hsl(var(--border))" }}
                    tickFormatter={(value) => `${value.toFixed(0)}%`}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      borderColor: "hsl(var(--border))",
                      color: "hsl(var(--foreground))",
                      fontSize: '12px',
                      borderRadius: '0.5rem',
                    }}
                    labelStyle={{ fontWeight: 'bold' }}
                    formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, t('cumulative_profit')]}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke={COLORS[0]}
                    strokeWidth={2}
                    dot={false}
                    name={t('cumulative_profit')}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {t('no_chart_data')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      {/* Grafik ile işlemler arasında boşluk */}
      <div className="mb-8" />
      <Card className="border">
        <CardContent className="p-0">
          <ChannelDetailTable
            trades={trades}
            filteredTrades={filteredTrades}
            paginatedTrades={paginatedTrades}
            isMobileView={isMobileView}
            expandedRows={expandedRows}
            toggleRowExpansion={toggleRowExpansion}
            loading={loading}
            t={t}
            currentPage={currentPage}
            totalPages={totalPages}
            goToPreviousPage={goToPreviousPage}
            goToNextPage={goToNextPage}
            getSignalProfitStatus={(signal) => getSignalProfitStatus(signal)}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default ChannelDetail;