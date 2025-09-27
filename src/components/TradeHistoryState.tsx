import { useState, useEffect, useMemo } from "react";
import { getUserSignals, UserSignal, getUserByTelegramId, getApiKeys, ApiKey, createSignal } from "@/services/api";
import { TradeData, calculateProfitChartData } from './TradeHistoryUtils';

export function useTradeHistoryState() {
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
        setTrades([]); setLoading(false); return;
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
        let statusText = "Bilinmeyen";
        switch (statusNum) {
          case 0: statusText = "Bekliyor"; break;
          case 1: statusText = "Açık"; break;
          case 2: statusText = "Tamamlandı"; break;
          case 3: statusText = "Hatalı"; break;
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

  const handleExchangeChange = (value: string) => {
    setExchangeFilter(value);
  };

  const { chartData: profitChartData, apiNames: profitChartApiNames } = calculateProfitChartData(filteredTrades);

  const totalTrades = filteredTrades.length;
  const completedTrades = filteredTrades.filter(t => t.status === "Tamamlandı");
  const profitableTrades = completedTrades.filter(t => t.profit !== undefined && t.profit > 0).length;
  const totalPnL = completedTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
  const winRate = completedTrades.length > 0 ? (profitableTrades / completedTrades.length) * 100 : 0;

  const ITEMS_PER_PAGE = 30;
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
    setFormData({ ...trade });
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
      if (!telegramId) throw new Error('Oturum bilgisi bulunamadı');
      const user = await getUserByTelegramId(telegramId);
      if (!user) throw new Error('Kullanıcı bulunamadı');
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

  return {
    trades,
    setTrades,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    exchangeFilter,
    setExchangeFilter,
    timeRange,
    setTimeRange,
    currentPage,
    setCurrentPage,
    isEditDialogOpen,
    setIsEditDialogOpen,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    selectedTrade,
    setSelectedTrade,
    formData,
    setFormData,
    isMobileView,
    setIsMobileView,
    expandedRows,
    setExpandedRows,
    isAddSignalDialogOpen,
    setIsAddSignalDialogOpen,
    signalFormData,
    setSignalFormData,
    toggleRowExpansion,
    filteredTrades,
    handleExchangeChange,
    profitChartData,
    profitChartApiNames,
    totalTrades,
    completedTrades,
    profitableTrades,
    totalPnL,
    winRate,
    totalPages,
    startIndex,
    endIndex,
    paginatedTrades,
    goToPreviousPage,
    goToNextPage,
    openEditDialog,
    handleInputChange,
    handleSelectChange,
    handleEditTrade,
    openDeleteDialog,
    handleDeleteTrade,
    handleSignalFormSubmit,
    handleSignalInputChange,
  };
} 