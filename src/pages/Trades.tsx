import React from "react";
import TradeHistory from "@/components/TradeHistory";
import TradeHistoryMain from '@/components/TradeHistoryMain';
import { useLang } from '@/hooks/useLang';

const TradesPage = () => {
  const { t } = useLang();
  return <TradeHistory />;
};

export default TradesPage;
