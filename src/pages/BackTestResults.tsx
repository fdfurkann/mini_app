import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import BacktestHistoryTable from '@/components/BacktestHistoryTable';
import { TradeData, calculateProfitChartData } from '@/components/BacktestHistoryUtils';
import { useLang } from '@/hooks/useLang';

// Kullanıcının girdiği işlem miktarını (ör: 100 USDT) al
const getEntryAmount = (results: any) => {
  if (results && results.entryAmount) {
    const val = parseFloat(results.entryAmount);
    if (!isNaN(val) && val > 0) return val;
  }
  // Eski API'da yoksa default 100
  return 100;
};

const mapBacktestToTradeData = (tableData: any[]): TradeData[] => {
  return tableData.map((trade, idx) => {
    // profit'i number olarak parse et
    let profitNum = trade.profit;
    if (typeof profitNum === 'string') {
      const parsed = parseFloat(profitNum);
      profitNum = isNaN(parsed) ? undefined : parsed;
    }
    // profitStr'i oluştur
    const profitStr = profitNum !== undefined && profitNum !== null ? profitNum.toFixed(3) + ' USDT' : '-';
    return {
      ticket: idx + 1,
      symbol: trade.symbol,
      side: trade.direction === 'BUY' ? 'BUY' : 'SELL',
      openPrice: trade.openPrice,
      openTime: trade.openDate,
      sl: trade.sl,
      tp: trade.tp,
      lot: trade.lot,
      closePrice: trade.closePrice,
      closeTime: trade.closeDate,
      profit: profitNum,
      profitStr, // <-- eklendi
      profitUSDT: profitNum, // Mobil görünüm için eklendi
      totalProfit: trade.totalProfit,
      status: 'Tamamlandı',
      statusCode: 2,
      apiName: 'Backtest',
      event: undefined
    };
  });
};

const ITEMS_PER_PAGE = 30;

const BackTestResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLang();
  const results = location.state?.results;

  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!results) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <p className="text-red-500 mb-4">{t('backtest.noResults')}</p>
        <Button onClick={() => navigate('/backtest')} variant="outline" size="sm">
          {t('backtest.goBack')}
        </Button>
      </div>
    );
  }

  const entryAmount = getEntryAmount(results);
  const trades: TradeData[] = useMemo(() => mapBacktestToTradeData(results.tableData || []), [results.tableData]);
  const filteredTrades = trades;
  const totalPages = Math.ceil(filteredTrades.length / ITEMS_PER_PAGE);
  const paginatedTrades = filteredTrades.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const { chartData: profitChartData, apiNames: profitChartApiNames } = calculateProfitChartData(filteredTrades);

  const toggleRowExpansion = (ticket: number) => {
    setExpandedRows(prev => ({ ...prev, [ticket]: !prev[ticket] }));
  };
  const goToPreviousPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  return (
    <div className="w-full max-w-none space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{t('backtest.results')}</h1>
      </div>
      <Card>
        <BacktestHistoryTable
          trades={trades}
          filteredTrades={filteredTrades}
          paginatedTrades={paginatedTrades}
          profitChartData={profitChartData}
          profitChartApiNames={profitChartApiNames}
          isMobileView={isMobileView}
          expandedRows={expandedRows}
          toggleRowExpansion={toggleRowExpansion}
          loading={false}
          t={t}
          currentPage={currentPage}
          totalPages={totalPages}
          goToPreviousPage={goToPreviousPage}
          goToNextPage={goToNextPage}
          openEditDialog={() => {}}
          openDeleteDialog={() => {}}
          showBacktestLotProfit={true}
          entryAmount={entryAmount}
        />
      </Card>
    </div>
  );
};

export default BackTestResults; 