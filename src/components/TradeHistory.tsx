import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { OrderSide, Trade, Exchange } from "@/utils/types";
import { getUserSignals, UserSignal, getUserByTelegramId, getApiKeys, ApiKey, createSignal } from "@/services/api";
import { ArrowDown, ArrowUp, Search, MoreVertical, Calendar, Download, BarChart2, Loader2, ChevronLeft, ChevronRight, Plus, Edit, Trash, ChevronDown, ChevronUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { calculateProfitChartData, formatDate, TradeData } from './TradeHistoryUtils';
import TradeHistoryTable from './TradeHistoryTable';
import TradeHistoryDialogs from './TradeHistoryDialogs';
import { useLang } from '@/hooks/useLang';

const COLORS = ["hsl(var(--primary))", "hsl(var(--signal-success))", "hsl(var(--signal-warning))", "hsl(var(--signal-danger))"];

// API tiplerini enum olarak tanımlayalım
enum ApiType {
  BINANCE = 1,
  BYBIT = 2,
  BINGX = 3
}

// API tiplerini isimlerle eşleştirelim
const API_TYPE_NAMES = {
  [ApiType.BINANCE]: "Binance",
  [ApiType.BYBIT]: "Bybit",
  [ApiType.BINGX]: "BingX"
};

const ITEMS_PER_PAGE = 30; // Sabit olarak tanımla

// Arayüzde kullanılacak olan Trade tipi (Tablo Sütunlarına Göre)
interface TradeData {
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

const TradeHistory: React.FC = () => {
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [exchangeFilter, setExchangeFilter] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<TradeData | null>(null);
  const [formData, setFormData] = useState<TradeData>({
    ticket: 0,
    symbol: "",
    side: "BUY",
    openPrice: undefined,
    openTime: "",
    volume: undefined,
    sl: undefined,
    tp: undefined,
    closePrice: undefined,
    closeTime: "",
    profit: undefined,
    status: "Açık",
    statusCode: 0,
    apiName: "",
  });
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [isAddSignalDialogOpen, setIsAddSignalDialogOpen] = useState(false);
  const [signalFormData, setSignalFormData] = useState({
    symbol: "",
    trend: "BUY",
    slPercentage: "",
    entryRangePercentage: "",
    tpCount: "1",
    tpRangePercentage: "",
  });

  const { lang } = useLang();
  const { t } = useLang();
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      const screenWidth = window.innerWidth;
      setIsMobileView(screenWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    fetchTrades();
  }, []);

  useEffect(() => {
    if (trades.length > 0) {
      const uniqueSymbols = [...new Set(trades.map(t => t.symbol))];
      const uniqueApiNames = [...new Set(trades.map(t => t.apiName))];
      console.log("Mevcut Semboller:", uniqueSymbols);
      console.log("Mevcut API Adları:", uniqueApiNames);
    }
  }, [trades]);

  const fetchTrades = async () => {
    try {
      setLoading(true);
      setError(null);
      const telegramId = sessionStorage.getItem('telegramId');
      if (!telegramId) throw new Error('Oturum bilgisi bulunamadı');
      const user = await getUserByTelegramId(telegramId);
      if (!user) throw new Error('Kullanıcı bulunamadı');
      const apiKeys = await getApiKeys(user.id);
      const apiKeysMap = apiKeys.reduce((acc: Record<number, ApiKey>, apiKey: ApiKey) => {
        acc[apiKey.id] = apiKey;
        return acc;
      }, {});
      const signals = await getUserSignals(user.id);
      if (!signals || signals.length === 0) {
        setTrades([]);
        setLoading(false);
        return;
      }
      const formattedTrades: TradeData[] = signals.map((signal: UserSignal) => {
        const apiKey = signal.api_id ? apiKeysMap[signal.api_id] : null;
        const apiName = apiKey?.api_name || "Unknown";
        const getNumber = (value: any): number | undefined => {
          if (value === null || value === undefined || value === '') return undefined;
          const num = Number(value);
          return isNaN(num) ? undefined : num;
        };
        const getString = (value: any, defaultValue = ""): string => {
          return value ? String(value) : defaultValue;
        };
        const side = getString(signal.trend) === "LONG" ? "BUY" : "SELL";
        const statusNum = getNumber(signal.status) ?? 0;
        let statusText = t('tradeStatus.unknown');
        switch (statusNum) {
          case 0: statusText = t('tradeStatus.waiting'); break;
          case 1: statusText = t('tradeStatus.open'); break;
          case 2: statusText = t('tradeStatus.completed'); break;
          case 3: statusText = t('tradeStatus.failed'); break;
        }
        return {
          ticket: signal.id,
          symbol: getString(signal.symbol),
          side: side,
          openPrice: getNumber(signal.open),
          openTime: getString(signal.opentime),
          volume: getNumber(signal.volume),
          sl: getNumber(signal.sl),
          tp: getNumber(signal.tp),
          closePrice: getNumber(signal.close),
          closeTime: getString(signal.closetime),
          profit: getNumber(signal.profit),
          status: statusText,
          statusCode: statusNum,
          apiName: apiName,
          event: getString(signal.event)
        };
      });
      setTrades(formattedTrades);
    } catch (err) {
      setError("İşlem geçmişi yüklenirken bir hata oluştu.");
      console.error("İşlem geçmişi yüklenirken hata:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleRowExpansion = (ticket: number) => {
    setExpandedRows(prev => ({ ...prev, [ticket]: !prev[ticket] }));
  };

  const filteredTrades = useMemo(() => {
    let filtered = trades;
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(trade =>
        trade.symbol.toLowerCase().includes(searchLower) ||
        trade.ticket.toString().includes(searchLower) ||
        trade.apiName.toLowerCase().includes(searchLower) ||
        trade.status.toLowerCase().includes(searchLower)
      );
    }
    const now = new Date();
    if (timeRange !== 'all') {
      const timeRangeInDays = timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : 30;
      const cutoffDate = new Date(now.getTime() - (timeRangeInDays * 24 * 60 * 60 * 1000));
      filtered = filtered.filter(trade => {
        const tradeDate = new Date(trade.openTime);
        return tradeDate >= cutoffDate;
      });
    }
    if (exchangeFilter !== 'all') {
      filtered = filtered.filter(trade => trade.apiName === exchangeFilter);
    }
    return filtered;
  }, [trades, exchangeFilter, timeRange, searchTerm]);

  const { chartData: profitChartData, apiNames: profitChartApiNames } = calculateProfitChartData(filteredTrades);

  const totalTrades = filteredTrades.length;
  const completedTrades = filteredTrades.filter(t => t.status === "Tamamlandı");
  const profitableTrades = completedTrades.filter(t => t.profit !== undefined && t.profit > 0).length;
  const totalPnL = completedTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
  const winRate = completedTrades.length > 0 ? (profitableTrades / completedTrades.length) * 100 : 0;

  const totalPages = Math.ceil(filteredTrades.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedTrades = filteredTrades.slice(startIndex, endIndex);

  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const openEditDialog = (trade: TradeData) => {
    setSelectedTrade(trade);
    setFormData({
      ticket: trade.ticket,
      symbol: trade.symbol,
      side: trade.side,
      openPrice: trade.openPrice,
      openTime: trade.openTime,
      volume: trade.volume,
      sl: trade.sl,
      tp: trade.tp,
      closePrice: trade.closePrice,
      closeTime: trade.closeTime,
      profit: trade.profit,
      status: trade.status,
      statusCode: trade.statusCode,
      apiName: trade.apiName,
    });
    setIsEditDialogOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, side: value as "BUY" | "SELL" }));
  };

  const handleEditTrade = () => {
    if (selectedTrade) {
      const updatedTrades = trades.map(trade =>
        trade.ticket === selectedTrade.ticket ? formData : trade
      );
      setTrades(updatedTrades);
      setIsEditDialogOpen(false);
    }
  };

  const openDeleteDialog = (trade: TradeData) => {
    setSelectedTrade(trade);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteTrade = () => {
    if (selectedTrade) {
      const updatedTrades = trades.filter(trade => trade.ticket !== selectedTrade.ticket);
      setTrades(updatedTrades);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleSignalFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const telegramId = sessionStorage.getItem('telegramId');
      if (!telegramId) {
        throw new Error('Oturum bilgisi bulunamadı');
      }
      const user = await getUserByTelegramId(telegramId);
      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }
      await createSignal({
        user_id: user.id,
        symbol: signalFormData.symbol,
        trend: signalFormData.trend as "BUY" | "SELL",
        slPercentage: parseFloat(signalFormData.slPercentage),
        entryRangePercentage: parseFloat(signalFormData.entryRangePercentage),
        tpCount: parseInt(signalFormData.tpCount),
        tpRangePercentage: parseFloat(signalFormData.tpRangePercentage),
      });
      setSignalFormData({
        symbol: "",
        trend: "BUY",
        slPercentage: "",
        entryRangePercentage: "",
        tpCount: "1",
        tpRangePercentage: "",
      });
      setIsAddSignalDialogOpen(false);
      await fetchTrades();
    } catch (error) {
      console.error("Sinyal eklenirken hata:", error);
      setError("Sinyal eklenirken bir hata oluştu");
    }
  };

  const handleSignalInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSignalFormData(prev => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[400px]">
        <div className="flex flex-col items-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={fetchTrades} variant="outline" size="sm">
          {t('retry')}
        </Button>
      </div>
    );
  }

  console.log("Render öncesi trades state:", trades);
  console.log("Render öncesi filteredTrades:", filteredTrades);
  console.log("Render öncesi paginatedTrades:", paginatedTrades);
  console.log(`Sayfa: ${currentPage}/${totalPages}`);

  console.log("Seçilen Borsa:", exchangeFilter);
  console.log("Filtrelenmiş Sinyaller:", filteredTrades);

  return (
    <div className="space-y-6">
      {isMobileView && (
        <></>
      )}

      <div className="main-content">
        <div className="space-y-4 overflow-x-auto">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">{t('tradeHistory')}</h2>
            <div className="flex gap-2">
              <Button 
                onClick={() => navigate('/add-user-signal')}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-1" />
                {t('addSignal')}
              </Button>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder={t('timeRange')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">{t('last24Hours')}</SelectItem>
                  <SelectItem value="7d">{t('last7Days')}</SelectItem>
                  <SelectItem value="30d">{t('last30Days')}</SelectItem>
                  <SelectItem value="all">{t('allTime')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* İstatistikler */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            <Card className="dashboard-card w-full min-w-0">
              <CardHeader className="p-2 pb-1">
                <CardTitle className="text-sm font-medium overflow-hidden text-ellipsis whitespace-nowrap">{t('totalTrades')}</CardTitle>
              </CardHeader>
              <CardContent className="p-2 pt-0">
                <div className="stat-value min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{totalTrades}</div>
                <div className="stat-label min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{t('allExchanges')}</div>
              </CardContent>
            </Card>

            <Card className="dashboard-card min-w-0 w-full">
              <CardHeader className="p-2 pb-1">
                <CardTitle className="text-sm font-medium overflow-hidden text-ellipsis whitespace-nowrap">{t('winRate')}</CardTitle>
              </CardHeader>
              <CardContent className="p-2 pt-0">
                <div className="stat-value min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{winRate.toFixed(1)}%</div>
                <div className="stat-label min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{t('profitableTrades')}</div>
              </CardContent>
            </Card>

            <Card className="dashboard-card min-w-0 w-full">
              <CardHeader className="p-2 pb-1">
                <CardTitle className="text-sm font-medium overflow-hidden text-ellipsis whitespace-nowrap">{t('totalPnL')}</CardTitle>
              </CardHeader>
              <CardContent className="p-2 pt-0">
                <div className={`stat-value min-w-0 overflow-hidden text-ellipsis whitespace-nowrap ${totalPnL >= 0 ? 'text-signal-success' : 'text-signal-danger'}`}>
                  {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)} USDT
                </div>
                <div className="stat-label min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{t('realizedPnL')}</div>
              </CardContent>
            </Card>

            <Card className="dashboard-card min-w-0 w-full">
              <CardHeader className="p-2 pb-1">
                <CardTitle className="text-sm font-medium overflow-hidden text-ellipsis whitespace-nowrap">{t('averageTrade')}</CardTitle>
              </CardHeader>
              <CardContent className="p-2 pt-0">
                <div className={`stat-value min-w-0 overflow-hidden text-ellipsis whitespace-nowrap ${(completedTrades.length > 0 ? totalPnL / completedTrades.length : 0) >= 0 ? 'text-signal-success' : 'text-signal-danger'}`}>
                  {completedTrades.length > 0 ? 
                    ((totalPnL / completedTrades.length) >= 0 ? '+' : '' ) + (totalPnL / completedTrades.length).toFixed(2) 
                    : '0.00'} USDT
                </div>
                <div className="stat-label min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{t('perCompletedTrade')}</div>
              </CardContent>
            </Card>
          </div>

          <TradeHistoryTable
            trades={trades}
            filteredTrades={filteredTrades}
            paginatedTrades={paginatedTrades}
            profitChartData={profitChartData}
            profitChartApiNames={profitChartApiNames}
            isMobileView={isMobileView}
            expandedRows={expandedRows}
            toggleRowExpansion={toggleRowExpansion}
            loading={loading}
            t={t}
            currentPage={currentPage}
            totalPages={totalPages}
            goToPreviousPage={goToPreviousPage}
            goToNextPage={goToNextPage}
            openEditDialog={openEditDialog}
            openDeleteDialog={openDeleteDialog}
          />
        </div>
      </div>

      <TradeHistoryDialogs
        isEditDialogOpen={isEditDialogOpen}
        setIsEditDialogOpen={setIsEditDialogOpen}
        isDeleteDialogOpen={isDeleteDialogOpen}
        setIsDeleteDialogOpen={setIsDeleteDialogOpen}
        isAddSignalDialogOpen={isAddSignalDialogOpen}
        setIsAddSignalDialogOpen={setIsAddSignalDialogOpen}
        formData={formData}
        setFormData={setFormData}
        handleInputChange={handleInputChange}
        handleSelectChange={handleSelectChange}
        handleEditTrade={handleEditTrade}
        selectedTrade={selectedTrade}
        handleDeleteTrade={handleDeleteTrade}
        signalFormData={signalFormData}
        handleSignalFormSubmit={handleSignalFormSubmit}
        handleSignalInputChange={handleSignalInputChange}
        t={t}
      />
    </div>
  );
};

export default TradeHistory;
