import { useEffect, useState } from 'react';
import { format } from "date-fns";
import { getChannels, ApiChannel } from "@/services/api";

export function useBackTestState(t: any, toast: any, navigate: any) {
  const [channels, setChannels] = useState<ApiChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [dateRange, setDateRange] = useState<any>();
  const [isLoadingBacktest, setIsLoadingBacktest] = useState(false);
  const [backtestResults, setBacktestResults] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [backtestError, setBacktestError] = useState<string | null>(null);

  // Settings'ten kopyalanan state'ler
  const [autoTrade, setAutoTrade] = useState(false);
  const [leverage, setLeverage] = useState([20]);
  const [entryAmount, setEntryAmount] = useState<string>("100");
  const [tradeType, setTradeType] = useState("ISOLATED");
  const [entryType, setEntryType] = useState("percentage");
  const [singleTpValue, setSingleTpValue] = useState("50");
  const [stopLossType, setStopLossType] = useState("signal");
  const [customStopLoss, setCustomStopLoss] = useState("10");
  const [breakEvenLevel, setBreakEvenLevel] = useState("none");
  const [trailStopLevel, setTrailStopLevel] = useState("none");
  const [maxOrders, setMaxOrders] = useState("10");
  const [stopLossActionType, setStopLossActionType] = useState("none");
  const [specificLossPercentage, setSpecificLossPercentage] = useState("10");
  const [multipleTpValues, setMultipleTpValues] = useState({
    tp1: 100, tp2: 0, tp3: 0, tp4: 0, tp5: 0,
    tp6: 0, tp7: 0, tp8: 0, tp9: 0, tp10: 0
  });

  useEffect(() => {
    const fetchChannelsData = async () => {
      try {
        if (loadingChannels) {
          setLoadingChannels(true);
          const channelsData = await getChannels();
          setChannels(channelsData);
          setLoadingChannels(false);
        }
      } catch (error) {
        console.error("Kanallar yüklenirken hata:", error);
        toast({
          title: t('error'),
          description: t('backtest.channelLoadError'),
          variant: "destructive",
        });
        setLoadingChannels(false);
      }
    };
    fetchChannelsData();
  }, [toast, t]);

  const handleBacktestStart = async () => {
    try {
      setIsLoadingBacktest(true);
      setBacktestError(null);
      const params = {
        selectedChannel,
        startDate: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd HH:mm:ss') : null,
        endDate: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd HH:mm:ss') : null,
        autoTrade,
        leverage: leverage[0],
        entryAmount,
        tradeType,
        entryType,
        singleTpValue,
        stopLossType,
        customStopLoss,
        breakEvenLevel,
        trailStopLevel,
        maxOrders,
        stopLossActionType,
        specificLossPercentage,
        multipleTpValues
      };
      const response = await fetch(`${import.meta.env.VITE_API_URL}/backtest/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
        setBacktestError(errorMessage);
        toast({ title: t('error'), description: errorMessage, variant: "destructive" });
        return;
      }
      const data = await response.json();
      setBacktestResults(data.tableData);
      setChartData(data.chartData);
      navigate('/backtest/results', { state: { results: data } });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('backtest.unknownError');
      setBacktestError(errorMessage);
      toast({ title: t('error'), description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoadingBacktest(false);
    }
  };

  return {
    channels, selectedChannel, setSelectedChannel, loadingChannels, dateRange, setDateRange, isLoadingBacktest, backtestResults, chartData, backtestError,
    autoTrade, setAutoTrade, leverage, setLeverage, entryAmount, setEntryAmount, tradeType, setTradeType, entryType, setEntryType, singleTpValue, setSingleTpValue, stopLossType, setStopLossType, customStopLoss, setCustomStopLoss, breakEvenLevel, setBreakEvenLevel, trailStopLevel, setTrailStopLevel, maxOrders, setMaxOrders, stopLossActionType, setStopLossActionType, specificLossPercentage, setSpecificLossPercentage, multipleTpValues, setMultipleTpValues, handleBacktestStart
  };
} 