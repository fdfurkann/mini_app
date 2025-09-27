import React, { useState, useEffect, useMemo } from 'react';
import styles from './Signals.module.css';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Signal, ArrowDown, ArrowUp, ChevronDown, ChevronUp } from "lucide-react";
import { getSignals2, getChannels, Signal2, Channel, getUserByTelegramId } from "@/services/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useLang } from '@/hooks/useLang';
import { useNavigate } from 'react-router-dom';

const COLORS = ["hsl(var(--primary))", "hsl(var(--signal-success))", "hsl(var(--signal-warning))", "hsl(var(--signal-danger))"];

// Frontend'de kullanılacak sinyal arayüzü
interface SignalData extends Signal2 {
  profit: number;
  status: 'open' | 'closed';
  channelName: string;
}

type TimeFilter = 'all' | 'last24' | 'last30' | 'last7';

const formatDate = (dateStr: string) => {
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

const calculateProfit = (signal: Signal2): number => {
  if (signal.close === 0) return 0;
  
  if (signal.trend.toUpperCase() === 'LONG') {
    return ((signal.close - signal.open) / signal.open) * 100;
  } else {
    return ((signal.open - signal.close) / signal.open) * 100;
  }
};

// Helper function to prepare data for the profit chart
const calculateProfitChartData = (signals: SignalData[]) => {
  // 1. Filter for completed trades with valid closeTime and profit
  const validClosedSignals = signals
    .filter(s => 
        s.status === "closed" && 
        s.closedate && 
        s.profit !== undefined &&
        !isNaN(new Date(s.closedate).getTime())
    )
    .map(s => ({ ...s, closeDate: new Date(s.closedate) }))
    .sort((a, b) => a.closeDate.getTime() - b.closeDate.getTime());

  if (validClosedSignals.length === 0) {
    return { chartData: [], channelNames: [] };
  }

  // 2. Extract unique channel names
  const channelNames = [...new Set(validClosedSignals.map(s => s.channelName))];

  // 3. Calculate cumulative profit over time for each channel
  const cumulativeProfits: Record<string, number> = {};
  channelNames.forEach(name => {
    if (name) cumulativeProfits[name] = 0;
  });

  const chartDataMap = new Map<number, any>();

  validClosedSignals.forEach(signal => {
    if (signal.channelName) {
      cumulativeProfits[signal.channelName] += signal.profit;
      
      const timestamp = signal.closeDate.getTime();
      const dataPoint: any = {
        timestamp,
        name: formatDate(signal.closedate)
      };
      
      // Add current cumulative profit for all channels
      channelNames.forEach(name => {
        if (name) dataPoint[name] = cumulativeProfits[name];
      });

      chartDataMap.set(timestamp, dataPoint);
    }
  });

  const chartData = Array.from(chartDataMap.values())
    .sort((a, b) => a.timestamp - b.timestamp);

  return { chartData, channelNames: channelNames.filter(Boolean) as string[] };
};

// Yeni interface ekleyelim
interface ExpandedRows {
  [key: number]: boolean;
}

const filterByTime = (signal: SignalData, timeFilter: TimeFilter): boolean => {
  if (timeFilter === 'all') return true;
  
  const now = new Date();
  const signalDate = new Date(signal.opendate);
  const diffHours = Math.floor((now.getTime() - signalDate.getTime()) / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  switch (timeFilter) {
    case 'last24': return diffHours <= 24;
    case 'last30': return diffDays <= 30;
    case 'last7': return diffDays <= 7;
    default: return true;
  }
};

export default function Signals() {
  const navigate = useNavigate();
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<TimeFilter>("all");
  const [expandedRows, setExpandedRows] = useState<ExpandedRows>({});
  const [currentOpenPage, setCurrentOpenPage] = useState(1);
  const [currentClosedPage, setCurrentClosedPage] = useState(1);
  const itemsPerPage = 30;
  const openItemsPerPage = 10;
  const [isMobileView, setIsMobileView] = useState(false);

  const signalsQuery: UseQueryOptions<Signal2[], Error> = {
    queryKey: ['signals2', selectedChannel, selectedTimeFilter, currentOpenPage],
    queryFn: () => getSignals2(),
    staleTime: 0
  };

  const channelsQuery: UseQueryOptions<Channel[], Error> = {
    queryKey: ['channels'],
    queryFn: async () => (await getChannels()) as unknown as Channel[],
    staleTime: 0
  };

  const { data: signalsData, isLoading, error } = useQuery<Signal2[], Error>(signalsQuery);
  const { data: channelsData } = useQuery<Channel[], Error>(channelsQuery);

  const signals = useMemo(() => {
    if (!signalsData || !channelsData) return [];
    
    const channelMap = new Map(
      channelsData.map(channel => [channel.room_id, channel.room_name])
    );

    return signalsData.map(signal => ({
      ...signal,
      channelName: channelMap.get(signal.signalgrup) || 'Unknown',
      profit: calculateProfit(signal),
      status: signal.closedate ? ('closed' as const) : ('open' as const)
    }));
  }, [signalsData, channelsData]);

  const filteredSignals = useMemo(() => {
    if (!signals) return [];
    
    return signals.filter(signal => {
      const channelMatch = selectedChannel === "all" || signal.signalgrup === selectedChannel;
      const timeMatch = filterByTime(signal, selectedTimeFilter);
      return channelMatch && timeMatch;
    });
  }, [signals, selectedChannel, selectedTimeFilter]);

  // Açık ve kapalı pozisyonları ayır
  const openPositions = filteredSignals.filter(signal => signal.status === 'open');
  const closedPositions = filteredSignals.filter(signal => signal.status === 'closed');

  // Pagination calculations
  const openPagesCount = Math.ceil(openPositions.length / openItemsPerPage);
  const closedPagesCount = Math.ceil(closedPositions.length / itemsPerPage);
  
  const paginatedOpenPositions = openPositions.slice(
    (currentOpenPage - 1) * openItemsPerPage,
    currentOpenPage * openItemsPerPage
  );
  
  const paginatedClosedPositions = closedPositions.slice(
    (currentClosedPage - 1) * itemsPerPage,
    currentClosedPage * itemsPerPage
  );

  // Kâr grafiği için veri hazırla
  const { chartData: profitChartData, channelNames: profitChartChannelNames } = calculateProfitChartData(filteredSignals);

  // Row expansion handler
  const toggleRow = (signalId: number) => {
    setExpandedRows(prev => ({
      ...prev,
      [signalId]: !prev[signalId]
    }));
  };

  // Özet istatistikleri hesapla
  const calculateStats = (signals: SignalData[]) => {
    const totalSignals = signals.length;
    const closedSignals = signals.filter(s => s.close > 0);
    const profitableSignals = closedSignals.filter(s => s.profit > 0);
    const winRate = closedSignals.length > 0 
      ? (profitableSignals.length / closedSignals.length * 100)
      : 0;
    
    const totalPL = closedSignals.reduce((sum, signal) => sum + signal.profit, 0);
    const avgPL = closedSignals.length > 0 
      ? totalPL / closedSignals.length
      : 0;

    return {
      totalSignals,
      winRate,
      totalPL,
      avgPL
    };
  };

  const stats = calculateStats(filteredSignals);

  const { lang, t } = useLang();

  if (isLoading) {
    return <div>{t('loading')}</div>;
  }

  if (error) {
    return <div>{t('error')}: {error.message}</div>;
  }

  return (
    <div className={`space-y-4 ${styles.signalsPage}`}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
              {t('signals.title')}
            </h1>
            <Signal className="w-4 h-4 text-primary" />
          </div>
          
          <div className="flex gap-2">
            <Select value={selectedTimeFilter} onValueChange={(value: TimeFilter) => setSelectedTimeFilter(value)}>
              <SelectTrigger className="w-[150px] text-xs">
                <SelectValue placeholder={t('timeSelect')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allTime')}</SelectItem>
                <SelectItem value="last24">{t('last24')}</SelectItem>
                <SelectItem value="last30">{t('last30')}</SelectItem>
                <SelectItem value="last7">{t('last7')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedChannel} onValueChange={setSelectedChannel}>
              <SelectTrigger className="w-[150px] text-xs">
                <SelectValue placeholder={t('channelSelect')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allChannels')}</SelectItem>
                {channelsData?.map(channel => (
                  <SelectItem key={channel.id} value={channel.room_id}>
                    {channel.room_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Özet Kartları */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Card className="dashboard-card">
            <CardContent className="p-2">
              <div className="text-2xl font-bold">{stats.totalSignals}</div>
              <p className="text-[10px] text-muted-foreground">{t('signals.totalTrades')}</p>
            </CardContent>
          </Card>

          <Card className="dashboard-card">
            <CardContent className="p-2">
              <div className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</div>
              <p className="text-[10px] text-muted-foreground">{t('signals.winRate')}</p>
            </CardContent>
          </Card>

          <Card className="dashboard-card">
            <CardContent className="p-2">
              <div className={`text-2xl font-bold ${stats.totalPL >= 0 ? 'text-signal-success' : 'text-signal-danger'}`}>
                {stats.totalPL >= 0 ? '+' : ''}{stats.totalPL.toFixed(2)}%
              </div>
              <p className="text-[10px] text-muted-foreground">{t('signals.totalPL')}</p>
            </CardContent>
          </Card>

          <Card className="dashboard-card">
            <CardContent className="p-2">
              <div className={`text-2xl font-bold ${stats.avgPL >= 0 ? 'text-signal-success' : 'text-signal-danger'}`}>
                {stats.avgPL >= 0 ? '+' : ''}{stats.avgPL.toFixed(2)}%
              </div>
              <p className="text-[10px] text-muted-foreground">{t('signals.avgTrade')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Açık Pozisyonlar */}
        <Card className="shadow-sm">
          <CardHeader className="py-2">
            <CardTitle className="text-sm">{t('signals.openPositions')}</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isMobileView ? (
                      <>
                        <TableHead>{t('signals.ticket')}</TableHead>
                        <TableHead>{t('signals.symbol')}</TableHead>
                        <TableHead>{t('signals.direction')}</TableHead>
                        <TableHead className="text-right">{t('signals.openPrice')}</TableHead>
                        <TableHead>{t('signals.openDate')}</TableHead>
                        <TableHead className="w-10 text-center"></TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead className="text-xs py-2 w-8"></TableHead>
                       <TableHead className="text-xs py-2">{t('signals.symbol')}</TableHead>
                        <TableHead className="text-xs py-2">{t('signals.direction')}</TableHead>
                        <TableHead className="text-xs text-right py-2">{t('signals.openPrice')}</TableHead>
                        <TableHead className="text-xs py-2">{t('signals.openDate')}</TableHead>
                     </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOpenPositions.map((signal) => (
                    <React.Fragment key={signal.id}>
                      {isMobileView ? (
                        <>
                          <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRow(signal.id)}>
                            <TableCell>{signal.id}</TableCell>
                            <TableCell>{signal.symbol}</TableCell>
                            <TableCell>
                              <Badge className={`${signal.trend.toUpperCase() === 'LONG' ? "bg-blue-100 text-blue-800 border-blue-300" : "bg-red-100 text-red-800 border-red-300"} px-1.5 py-0.5 text-[10px] rounded-full`}>
                                {signal.trend.toUpperCase() === 'LONG' ? t('buy') : t('sell')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{typeof signal.open === 'number' ? signal.open.toFixed(4) : '-'}</TableCell>
                            <TableCell>{formatDate(signal.opendate)}</TableCell>
                            <TableCell className="text-center">{expandedRows[signal.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</TableCell>
                          </TableRow>
                          {expandedRows[signal.id] && (
                            <TableRow>
                              <TableCell colSpan={6} className="py-2 px-4 bg-muted/30">
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                  <span><strong>{t('signals.channel')}:</strong> {signal.channelName}</span>
                                  <span><strong>{t('signals.stopLoss')}:</strong> {typeof signal.sl === 'number' ? signal.sl.toFixed(4) : '-'}</span>
                                  <span><strong>{t('signals.takeProfit')}:</strong> {typeof signal.tp1 === 'number' ? signal.tp1.toFixed(4) : '-'}</span>
                                  <span><strong>{t('signals.entry1')}:</strong> {typeof signal.entry1 === 'number' ? signal.entry1.toFixed(4) : '-'}</span>
                                  <span><strong>{t('signals.entry2')}:</strong> {typeof signal.entry2 === 'number' ? signal.entry2.toFixed(4) : '-'}</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ) : (
                        <>
                          <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRow(signal.id)}>
                            <TableCell className="py-1 w-8">{expandedRows[signal.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</TableCell>
                            <TableCell className="py-1">{signal.symbol}</TableCell>
                            <TableCell className="py-1">
                              <Badge className={`${signal.trend.toUpperCase() === 'LONG' ? "bg-blue-100 text-blue-800 border-blue-300" : "bg-red-100 text-red-800 border-red-300"} px-1.5 py-0.5 text-[10px] rounded-full`}>
                                {signal.trend.toUpperCase() === 'LONG' ? t('buy') : t('sell')}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-1 text-right">{typeof signal.open === 'number' ? signal.open.toFixed(4) : '-'}</TableCell>
                            <TableCell className="py-1">{formatDate(signal.opendate)}</TableCell>
                          </TableRow>
                          {expandedRows[signal.id] && (
                            <TableRow>
                              <TableCell colSpan={8} className="py-2 px-4 bg-muted/30">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div>
                                    <span className="text-xs font-medium">{t('signals.channelName')}</span>
                                    <p className="text-sm">{signal.channelName}</p>
                                  </div>
                                  <div>
                                    <span className="text-xs font-medium">{t('signals.trendDirection')}</span>
                                    <p className="text-sm">{signal.trend.toUpperCase()}</p>
                                  </div>
                                  <div>
                                    <span className="text-xs font-medium">{t('signals.symbol')}</span>
                                    <p className="text-sm">{signal.symbol}</p>
                                  </div>
                                  <div>
                                    <span className="text-xs font-medium">{t('signals.entry1')}:</span>
                                    <p className="text-sm">{typeof signal.entry1 === 'number' ? signal.entry1.toFixed(4) : '-'}</p>
                                  </div>
                                  <div>
                                    <span className="text-xs font-medium">{t('signals.entry2')}:</span>
                                    <p className="text-sm">{typeof signal.entry2 === 'number' ? signal.entry2.toFixed(4) : '-'}</p>
                                  </div>
                                  <div>
                                    <span className="text-xs font-medium">{t('signals.sl')}:</span>
                                    <p className="text-sm">{typeof signal.sl === 'number' ? signal.sl.toFixed(4) : '-'}</p>
                                  </div>
                                  {Array.from({ length: 10 }, (_, i) => (
                                    <div key={i}>
                                      <span className="text-xs font-medium">{t('signals.tp')} {i + 1}:</span>
                                      <p className="text-sm">{typeof signal[`tp${i + 1}`] === 'number' ? (signal[`tp${i + 1}`] as number).toFixed(4) : "-"}</p>
                                    </div>
                                  ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
              {openPagesCount > 1 && (
                <div className="flex items-center justify-end gap-2 p-2">
                  <button
                    onClick={() => setCurrentOpenPage(prev => Math.max(1, prev - 1))}
                    disabled={currentOpenPage === 1}
                    className="text-xs px-2 py-1 rounded border disabled:opacity-50"
                  >
                    {t('previous')}
                  </button>
                  <span className="text-xs">
                    {t('page')} {currentOpenPage} / {openPagesCount}
                  </span>
                  <button
                    onClick={() => setCurrentOpenPage(prev => Math.min(openPagesCount, prev + 1))}
                    disabled={currentOpenPage === openPagesCount}
                    className="text-xs px-2 py-1 rounded border disabled:opacity-50"
                  >
                    {t('next')}
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Kâr Grafiği */}
        <Card className="shadow-sm">
          <CardHeader className="py-2">
            <CardTitle className="text-sm">{t('signals.cumulativePL')}</CardTitle>
            <CardDescription className="text-xs">{t('signals.plByChannel')}</CardDescription>
          </CardHeader>
          <CardContent className="p-2">
            <div className="h-64">
              {profitChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={profitChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value.toFixed(2)}%`}
                    />
                    <RechartsTooltip 
                      formatter={(value: number) => [`${value.toFixed(2)}%`, undefined]}
                      labelFormatter={(label) => `${t('date')}: ${label}`}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        borderColor: 'hsl(var(--border))',
                        color: 'hsl(var(--card-foreground))'
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '10px' }} 
                      verticalAlign="top" 
                      align="right" 
                      height={30}
                    />
                    {profitChartChannelNames.map((channelName, index) => (
                      <Line 
                        key={channelName} 
                        type="monotone" 
                        dataKey={channelName} 
                        stroke={COLORS[index % COLORS.length]} 
                        strokeWidth={2}
                        dot={false}
                        name={channelName}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-xs text-muted-foreground">{t('signals.noChartData')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Kapanmış Pozisyonlar */}
        <Card className="shadow-sm">
          <CardHeader className="py-2">
            <CardTitle className="text-sm">{t('signals.closedPositions')}</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isMobileView ? (
                      <>
                        <TableHead>{t('signals.ticket')}</TableHead>
                        <TableHead>{t('signals.symbol')}</TableHead>
                        <TableHead>{t('signals.direction')}</TableHead>
                        <TableHead className="text-right">{t('signals.openPrice')}</TableHead>
                        <TableHead>{t('signals.openDate')}</TableHead>
                        <TableHead className="w-10 text-center"></TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead className="text-xs py-2 w-8"></TableHead>
                        <TableHead className="text-xs py-2">{t('signals.symbol')}</TableHead>
                        <TableHead className="text-xs py-2">{t('signals.direction')}</TableHead>
                        <TableHead className="text-xs text-right py-2">{t('signals.openPrice')}</TableHead>
                        <TableHead className="text-xs py-2">{t('signals.openDate')}</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedClosedPositions.map((signal) => (
                    <React.Fragment key={signal.id}>
                      {isMobileView ? (
                        <>
                          <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRow(signal.id)}>
                            <TableCell>{signal.id}</TableCell>
                            <TableCell>{signal.symbol}</TableCell>
                            <TableCell>
                              <Badge className={`${signal.trend.toUpperCase() === 'LONG' ? "bg-blue-100 text-blue-800 border-blue-300" : "bg-red-100 text-red-800 border-red-300"} px-1.5 py-0.5 text-[10px] rounded-full`}>
                                {signal.trend.toUpperCase() === 'LONG' ? t('buy') : t('sell')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{typeof signal.open === 'number' ? signal.open.toFixed(4) : '-'}</TableCell>
                            <TableCell>{formatDate(signal.opendate)}</TableCell>
                            <TableCell className="text-center">{expandedRows[signal.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</TableCell>
                          </TableRow>
                          {expandedRows[signal.id] && (
                            <TableRow>
                              <TableCell colSpan={5} className="py-2 px-4 bg-muted/30">
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                  <span><strong>{t('signals.channel')}:</strong> {signal.channelName}</span>
                                  <span><strong>{t('signals.stopLoss')}:</strong> {typeof signal.sl === 'number' ? signal.sl.toFixed(4) : '-'}</span>
                                  <span><strong>{t('signals.takeProfit')}:</strong> {typeof signal.tp1 === 'number' ? signal.tp1.toFixed(4) : '-'}</span>
                                  <span><strong>{t('signals.entry1')}:</strong> {typeof signal.entry1 === 'number' ? signal.entry1.toFixed(4) : '-'}</span>
                                  <span><strong>{t('signals.entry2')}:</strong> {typeof signal.entry2 === 'number' ? signal.entry2.toFixed(4) : '-'}</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ) : (
                        <>
                          <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRow(signal.id)}>
                            <TableCell className="py-1 w-8">{expandedRows[signal.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</TableCell>
                            <TableCell className="py-1">{signal.symbol}</TableCell>
                            <TableCell className="py-1">
                              <Badge className={`${signal.trend.toUpperCase() === 'LONG' ? "bg-blue-100 text-blue-800 border-blue-300" : "bg-red-100 text-red-800 border-red-300"} px-1.5 py-0.5 text-[10px] rounded-full`}>
                                {signal.trend.toUpperCase() === 'LONG' ? t('buy') : t('sell')}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-1 text-right">{typeof signal.open === 'number' ? signal.open.toFixed(4) : '-'}</TableCell>
                            <TableCell className="py-1">{formatDate(signal.opendate)}</TableCell>
                          
                          </TableRow>
                          {expandedRows[signal.id] && (
                            <TableRow>
                              <TableCell colSpan={9} className="bg-muted/30 p-[0.7rem]">
                                <div className="grid grid-cols-[150px,1fr] gap-2 max-w-2xl">
                                  <span className="text-xs font-medium">{t('signals.channelName')}:</span>
                                  <span className="text-xs">{signal.channelName || '-'}</span>

                                  <span className="text-xs font-medium">{t('signals.trendDirection')}:</span>
                                  <span className="text-xs">{signal.trend?.toUpperCase() || '-'}</span>

                                  <span className="text-xs font-medium">{t('signals.symbol')}:</span>
                                  <span className="text-xs">{signal.symbol || '-'}</span>

                                  <span className="text-xs font-medium">{t('signals.entry1')}:</span>
                                  <span className="text-xs">{typeof signal.entry1 === 'number' ? signal.entry1.toFixed(8) : '-'}</span>

                                  <span className="text-xs font-medium">{t('signals.entry2')}:</span>
                                  <span className="text-xs">{typeof signal.entry2 === 'number' ? signal.entry2.toFixed(8) : '-'}</span>

                                  <span className="text-xs font-medium">{t('signals.sl')}:</span>
                                  <span className="text-xs">{typeof signal.sl === 'number' ? signal.sl.toFixed(8) : '-'}</span>

                                  {typeof signal.tp1 === 'number' && (
                                    <>
                                      <span className="text-xs font-medium">{t('signals.tp1')}:</span>
                                      <span className="text-xs">{typeof signal.tp1 === 'number' ? (signal.tp1 as number).toFixed(8) : "-"}</span>
                                    </>
                                  )}

                                  {typeof signal.tp2 === 'number' && (
                                    <>
                                      <span className="text-xs font-medium">{t('signals.tp2')}:</span>
                                      <span className="text-xs">{typeof signal.tp2 === 'number' ? (signal.tp2 as number).toFixed(8) : "-"}</span>
                                    </>
                                  )}

                                  {typeof signal.tp3 === 'number' && (
                                    <>
                                      <span className="text-xs font-medium">{t('signals.tp3')}:</span>
                                      <span className="text-xs">{typeof signal.tp3 === 'number' ? (signal.tp3 as number).toFixed(8) : "-"}</span>
                                    </>
                                  )}

                                  {typeof signal.tp4 === 'number' && (
                                    <>
                                      <span className="text-xs font-medium">{t('signals.tp4')}:</span>
                                      <span className="text-xs">{typeof signal.tp4 === 'number' ? (signal.tp4 as number).toFixed(8) : "-"}</span>
                                    </>
                                  )}

                                  {typeof signal.tp5 === 'number' && (
                                    <>
                                      <span className="text-xs font-medium">{t('signals.tp5')}:</span>
                                      <span className="text-xs">{typeof signal.tp5 === 'number' ? (signal.tp5 as number).toFixed(8) : "-"}</span>
                                    </>
                                  )}

                                  {typeof signal.tp6 === 'number' && (
                                    <>
                                      <span className="text-xs font-medium">{t('signals.tp6')}:</span>
                                      <span className="text-xs">{typeof signal.tp6 === 'number' ? (signal.tp6 as number).toFixed(8) : "-"}</span>
                                    </>
                                  )}

                                  {typeof signal.tp7 === 'number' && (
                                    <>
                                      <span className="text-xs font-medium">{t('signals.tp7')}:</span>
                                      <span className="text-xs">{typeof signal.tp7 === 'number' ? (signal.tp7 as number).toFixed(8) : "-"}</span>
                                    </>
                                  )}

                                  {typeof signal.tp8 === 'number' && (
                                    <>
                                      <span className="text-xs font-medium">{t('signals.tp8')}:</span>
                                      <span className="text-xs">{typeof signal.tp8 === 'number' ? (signal.tp8 as number).toFixed(8) : "-"}</span>
                                    </>
                                  )}

                                  {typeof signal.tp9 === 'number' && (
                                    <>
                                      <span className="text-xs font-medium">{t('signals.tp9')}:</span>
                                      <span className="text-xs">{typeof signal.tp9 === 'number' ? (signal.tp9 as number).toFixed(8) : "-"}</span>
                                    </>
                                  )}

                                  {typeof signal.tp10 === 'number' && (
                                    <>
                                      <span className="text-xs font-medium">{t('signals.tp10')}:</span>
                                      <span className="text-xs">{typeof signal.tp10 === 'number' ? (signal.tp10 as number).toFixed(8) : "-"}</span>
                                    </>
                                  )}

                                  <span className="text-xs font-medium">{t('signals.entryPrice')}:</span>
                                  <span className="text-xs">{typeof signal.open === 'number' ? signal.open.toFixed(8) : '-'}</span>

                                  <span className="text-xs font-medium">{t('signals.entryDate')}:</span>
                                  <span className="text-xs">{formatDate(signal.opendate)}</span>

                                  <span className="text-xs font-medium">{t('signals.sl')}:</span>
                                  <span className="text-xs">{typeof signal.sl === 'number' ? signal.sl.toFixed(8) : '-'}</span>

                                  <span className="text-xs font-medium">{t('signals.takeProfit')}:</span>
                                  <span className="text-xs">{typeof signal.tp1 === 'number' ? signal.tp1.toFixed(8) : '-'}</span>

                                  <span className="text-xs font-medium">{t('signals.exitPrice')}:</span>
                                  <span className="text-xs">{typeof signal.close === 'number' ? signal.close.toFixed(8) : '-'}</span>

                                  <span className="text-xs font-medium">{t('signals.exitDate')}:</span>
                                  <span className="text-xs">{formatDate(signal.closedate) || '-'}</span>

                                  <span className="text-xs font-medium">{t('signals.profitLoss')}:</span>
                                  <span className={`text-xs ${typeof signal.profit === 'number' && signal.profit > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {typeof signal.profit === 'number' ? signal.profit.toFixed(2) : '-'}%
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
              {closedPagesCount > 1 && (
                <div className="flex items-center justify-end gap-2 p-2">
                  <button
                    onClick={() => setCurrentClosedPage(prev => Math.max(1, prev - 1))}
                    disabled={currentClosedPage === 1}
                    className="text-xs px-2 py-1 rounded border disabled:opacity-50"
                  >
                    {t('previous')}
                  </button>
                  <span className="text-xs">
                    {t('page')} {currentClosedPage} / {closedPagesCount}
                  </span>
                  <button
                    onClick={() => setCurrentClosedPage(prev => Math.min(closedPagesCount, prev + 1))}
                    disabled={currentClosedPage === closedPagesCount}
                    className="text-xs px-2 py-1 rounded border disabled:opacity-50"
                  >
                    {t('next')}
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <button onClick={() => navigate('/signals/add')} className="btn btn-primary mb-4">Sinyal Ekle</button>
    </div>
  );
}
