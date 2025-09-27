import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useLang } from '@/hooks/useLang';
import { X } from 'lucide-react';
import axios from 'axios';

interface Trade {
  id: number;
  user_id: number;
  api_id: number;
  signal_id: number;
  lotsize: number;
  levelage: number;
  strateji: string;
  ticket: string;
  symbol: string;
  trend: string;
  open: number;
  opentime: string;
  volume: number;
  closed_volume: number;
  sl: number;
  tp: number;
  close: number;
  closetime: string;
  profit: number;
  profit_usdt?: number;
  event: string;
  status: number;
  sticket: string;
  tticket: string;
  sl_wait: number;
  tp_wait: number;
  exchange: string;
}

interface TradesListProps {
  trades: Trade[];
  loading: boolean;
  limit?: number;
  className?: string;
}

const TradesList: React.FC<TradesListProps> = ({ trades, loading, limit = 5, className }) => {
  const { lang, t } = useLang();
  const [expandedTrade, setExpandedTrade] = React.useState<string | number | null>(null);
  const [closingId, setClosingId] = React.useState<number | null>(null);
  const [openTradesState, setOpenTradesState] = React.useState(trades.filter(trade => trade.status === 1).slice(0, limit));

  React.useEffect(() => {
    setOpenTradesState(trades.filter(trade => trade.status === 1).slice(0, limit));
  }, [trades, limit]);

  const formatPrice = (price: any) => {
    const numPrice = Number(price);
    if (isNaN(numPrice)) {
        return '0.0000';
    }
    const formattedNumber = parseFloat(numPrice.toFixed(8));
    const s = formattedNumber.toString();
    if (s.includes('.')) {
        const decimalPart = s.split('.')[1];
        if (decimalPart.length < 4) {
            return formattedNumber.toFixed(4);
        }
    } else {
        return formattedNumber.toFixed(4);
    }
    return s;
  };

  const formatDate = (date: any) => {
    try {
      return new Date(date).toLocaleString(lang, {
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

  // Sadece açık işlemleri filtrele (status = 1) ve limitli sayıda göster
  const openTrades = trades.filter(trade => trade.status === 1).slice(0, limit);

  const handleManualClose = async (tradeId: number) => {
    setClosingId(tradeId);
    try {
      await axios.post('/api/trades/close', { user_signal_id: tradeId });
      setOpenTradesState(prev => prev.filter(t => t.id !== tradeId));
    } catch (e) {
      // Hata yönetimi
    }
    setClosingId(null);
  };

  return (
    <Card className={className}>
      <CardHeader className="p-1">
        <CardTitle className="text-sm">{t('openTrades')}</CardTitle>
        <CardDescription className="text-xs">{t('openTradesDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">{t('symbol')}</TableHead>
              <TableHead className="text-xs">{t('side')}</TableHead>
              <TableHead className="text-xs">{t('entryPrice')}</TableHead>
              <TableHead className="text-xs">Borsa</TableHead>
              <TableHead className="text-xs">{t('pnl')}</TableHead>
              <TableHead className="w-[32px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {openTradesState.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-xs">
                  {t('noOpenTrades')}
                </TableCell>
              </TableRow>
            ) : (
              openTradesState.map((trade) => (
                <React.Fragment key={trade.id}>
                  <TableRow 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedTrade(expandedTrade === trade.id ? null : trade.id)}
                  >
                    <TableCell className="text-xs font-medium">{trade.symbol}</TableCell>
                    <TableCell className="text-xs">
                      {trade.trend === 'LONG' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-signal-success/10 text-signal-success">
                          LONG
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          SHORT
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{formatPrice(trade.open)}</TableCell>
                    <TableCell className="text-xs">{trade.exchange || '-'}</TableCell>
                    <TableCell className={`text-xs ${trade.profit > 0 ? 'text-green-500' : trade.profit < 0 ? 'text-red-500' : ''}`}>
                      {trade.profit ? (
                        <>
                          {`${trade.profit > 0 ? '+' : ''}${trade.profit.toFixed(2)}%`}
                          {trade.profit_usdt && (
                            <div className={`text-xs opacity-75 ${trade.profit_usdt > 0 ? 'text-green-500' : trade.profit_usdt < 0 ? 'text-red-500' : ''}`}>
                              {`${trade.profit_usdt > 0 ? '+' : ''}${trade.profit_usdt.toFixed(2)} USDT`}
                            </div>
                          )}
                        </>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <button
                        className="text-red-500 hover:text-red-700 disabled:opacity-50"
                        title={t('closeTrade')}
                        disabled={closingId === trade.id}
                        onClick={e => { e.stopPropagation(); handleManualClose(trade.id); }}
                      >
                        {closingId === trade.id ? (
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /></svg>
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </button>
                    </TableCell>
                  </TableRow>
                  {expandedTrade === trade.id && (
                    <TableRow>
                      <TableCell colSpan={5} className="p-1 bg-muted/5">
                        <div className="text-xs space-y-2">
                          <div><strong>{t('ticket')}:</strong> {trade.ticket}</div>
                          <div><strong>{t('volume')}:</strong> {trade.volume}</div>
                          <div><strong>{t('sl')}:</strong> {formatPrice(trade.sl)}</div>
                          <div><strong>{t('tp')}:</strong> {formatPrice(trade.tp)}</div>
                          <div><strong>{t('status')}:</strong> {trade.status === 0 ? t('waiting') : t('open')}</div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default TradesList;
