import React, { useEffect, useState } from 'react';
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronRight, ArrowLeft, PlayCircle, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getChannels, ApiChannel } from "@/services/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
} from "recharts";
import {
  Table,
  TableHeader,
  TableBody,
  TableCell,
  TableRow,
  TableHead,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { useToast } from "@/components/ui/use-toast";
import { useBackTestState } from './BackTestState';
import BackTestForm from './BackTestForm';
import { useLang } from '@/hooks/useLang';

// Helper function to format dates
const formatDate = (dateStr: string | null | undefined, locale: string = 'en-US'): string => {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return "-"; 
    }
    // Use the provided locale for formatting
    return date.toLocaleString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    console.error("Date formatting error:", e, "Input:", dateStr);
    return "-";
  }
};

const BackTest = () => {
  const navigate = useNavigate();
  const { lang, t } = useLang();
  const { toast } = useToast();
  const state = useBackTestState(t, toast, navigate);
  const {
    channels, selectedChannel, setSelectedChannel, loadingChannels, dateRange, setDateRange, isLoadingBacktest, backtestResults, chartData, backtestError,
    autoTrade, setAutoTrade, leverage, setLeverage, entryAmount, setEntryAmount, tradeType, setTradeType, entryType, setEntryType, singleTpValue, setSingleTpValue, stopLossType, setStopLossType, customStopLoss, setCustomStopLoss, breakEvenLevel, setBreakEvenLevel, trailStopLevel, setTrailStopLevel, maxOrders, setMaxOrders, stopLossActionType, setStopLossActionType, specificLossPercentage, setSpecificLossPercentage, multipleTpValues, setMultipleTpValues, handleBacktestStart
  } = state;
  const [checkingPremium, setCheckingPremium] = useState(true);
  const [hasPremium, setHasPremium] = useState(false);
  useEffect(() => {
    const checkPremium = async () => {
      try {
        const telegramId = sessionStorage.getItem("telegramId");
        if (!telegramId) return setHasPremium(false);
        const userRes = await fetch(`/api/users/${telegramId}`);
        if (!userRes.ok) return setHasPremium(false);
        const userData = await userRes.json();
        const enrolledRes = await fetch(`/api/enrolled-users/${userData.id}`);
        if (!enrolledRes.ok) return setHasPremium(false);
        const enrolledData = await enrolledRes.json();
        const now = new Date();
        const has = enrolledData.some((e: any) => e.package_api_rights === 1 && new Date(e.end_date) > now);
        setHasPremium(has);
      } finally {
        setCheckingPremium(false);
      }
    };
    checkPremium();
  }, []);
  if (checkingPremium) return <div className="flex items-center justify-center min-h-screen">Yükleniyor...</div>;
  if (!hasPremium) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <Card className="max-w-lg w-full p-8 text-center">
          <CardHeader>
            <CardTitle>Backtest Özelliği Premium Üyelere Açık</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-6 text-lg">Backtest özelliğini kullanabilmek için premium üye olmanız gerekmektedir.</p>
            <Button asChild size="lg" className="w-full">
              <Link to="/subscription">Premium üye olmak için tıklayın</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Backtest başlatıldığında toast göster
  const handleBacktestStartWithToast = async (...args: any[]) => {
    toast({
      title: 'Backtest Başlıyor',
      description: 'Hesaplamalar yapılırken lütfen bekleyin...',
      duration: 3000
    });
    await handleBacktestStart(...args);
  };

  return (
    <div className="w-full max-w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16 space-y-6 relative">
      {/* Loading Overlay */}
      {isLoadingBacktest && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-50">
          <img src="/loading.gif" alt="Yükleniyor" />
          <div className="text-white text-lg font-semibold">Backtest başlıyor, hesaplamalar yapılırken lütfen bekleyin...</div>
        </div>
      )}
      <div className="flex items-center gap-2 mb-6">
        {/* Geri butonu isteğe bağlı olarak kalabilir veya kaldırılabilir */}
        {/* <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button> */}
        <h1 className="text-2xl font-bold">{t('backtest.title')}</h1>
      </div>

      <Card>
        <BackTestForm
          t={t}
          lang={lang}
          channels={channels}
          selectedChannel={selectedChannel}
          setSelectedChannel={setSelectedChannel}
          loadingChannels={loadingChannels}
          dateRange={dateRange}
          setDateRange={setDateRange}
          autoTrade={autoTrade}
          setAutoTrade={setAutoTrade}
          leverage={leverage}
          setLeverage={setLeverage}
          entryAmount={entryAmount}
          setEntryAmount={setEntryAmount}
          tradeType={tradeType}
          setTradeType={setTradeType}
          entryType={entryType}
          setEntryType={setEntryType}
          singleTpValue={singleTpValue}
          setSingleTpValue={setSingleTpValue}
          stopLossType={stopLossType}
          setStopLossType={setStopLossType}
          customStopLoss={customStopLoss}
          setCustomStopLoss={setCustomStopLoss}
          breakEvenLevel={breakEvenLevel}
          setBreakEvenLevel={setBreakEvenLevel}
          trailStopLevel={trailStopLevel}
          setTrailStopLevel={setTrailStopLevel}
          maxOrders={maxOrders}
          setMaxOrders={setMaxOrders}
          stopLossActionType={stopLossActionType}
          setStopLossActionType={setStopLossActionType}
          specificLossPercentage={specificLossPercentage}
          setSpecificLossPercentage={setSpecificLossPercentage}
          multipleTpValues={multipleTpValues}
          setMultipleTpValues={setMultipleTpValues}
          isLoadingBacktest={isLoadingBacktest}
          handleBacktestStart={handleBacktestStartWithToast}
          cn={cn}
        />
      </Card>
      
      {/* Backtest Başlat Butonu */}
      <div className="flex justify-end mt-6">
        <Button 
          onClick={handleBacktestStartWithToast}
          disabled={!selectedChannel || loadingChannels || !dateRange?.from || !dateRange?.to}
          size="lg"
          className="gap-2"
        >
            <PlayCircle size={18} />
            {t('backtest.startBacktest')}
        </Button>
      </div>

    </div>
  );
};

export default BackTest; 