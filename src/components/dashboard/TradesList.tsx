import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Trade } from "@/utils/types";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useLang } from '@/hooks/useLang';

interface TradesListProps {
  trades: Trade[];
  limit?: number;
}

const TradesList: React.FC<TradesListProps> = ({ trades, limit = 4 }) => {
  const { lang } = useLang();
  const { t } = useLang();
  const [expandedTrade, setExpandedTrade] = React.useState<string | number | null>(null);

  const formatPrice = (price: any) => {
    const numPrice = Number(price);
    return !isNaN(numPrice) ? numPrice.toFixed(4) : '0.0000';
  };

  const formatDate = (date: any) => {
    try {
      return new Date(date).toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle>{t('allTrades')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="w-full">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2">{t('ticket')}</th>
                <th className="text-left p-2">{t('symbol')}</th>
                <th className="text-left p-2">{t('side')}</th>
                <th className="text-left p-2">{t('entryPrice')}</th>
                <th className="text-left p-2">{t('entryDate')}</th>
                <th className="text-left p-2"></th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <React.Fragment key={trade.id || trade.ticket}>
                  <tr className="border-b hover:bg-muted/50 cursor-pointer" 
                      onClick={() => setExpandedTrade(expandedTrade === trade.id ? null : trade.id)}>
                    <td className="p-2 font-medium">{trade.ticket || trade.id}</td>
                    <td className="p-2">{trade.symbol}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        trade.direction?.toUpperCase() === 'LONG' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {trade.direction?.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-2">{formatPrice(trade.open_price || trade.price || trade.open)}</td>
                    <td className="p-2">{formatDate(trade.open_time || trade.created_at || trade.timestamp)}</td>
                    <td className="p-2">
                      {expandedTrade === trade.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </td>
                  </tr>
                  {expandedTrade === trade.id && (
                    <tr className="bg-muted/20">
                      <td colSpan={6} className="p-4">
                        <div className="text-sm space-y-1">
                          <div>{t('quantity')}: {trade.quantity}</div>
                          <div>{t('sl')}: {formatPrice(trade.stopLoss)}</div>
                          <div>{t('tp')}: {formatPrice(trade.takeProfit)}</div>
                          <div>{t('closePrice')}: {formatPrice(trade.closePrice)}</div>
                          <div>{t('closeTime')}: {formatDate(trade.closeTime)}</div>
                          <div className="font-medium">{t('pnl')}: <span className={trade.pnl && trade.pnl > 0 ? 'text-green-600' : 'text-red-600'}>{trade.pnl ? trade.pnl.toFixed(2) : '0.00'}</span></div>
                          <div>{t('status')}: <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs">{trade.status}</span></div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default TradesList;
