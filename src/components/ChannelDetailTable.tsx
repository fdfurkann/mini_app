import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { TradeData, formatDate } from './ChannelDetailUtils';
import { formatNumberByDigits } from '@/utils/helpers';

interface ChannelDetailTableProps {
  trades: TradeData[];
  filteredTrades: TradeData[];
  paginatedTrades: TradeData[];
  isMobileView: boolean;
  expandedRows: Record<number, boolean>;
  toggleRowExpansion: (ticket: number) => void;
  loading: boolean;
  t: any;
  currentPage: number;
  totalPages: number;
  goToPreviousPage: () => void;
  goToNextPage: () => void;
  getSignalProfitStatus: (signal: any) => { percent: number; isProfit: boolean };
}

const ChannelDetailTable: React.FC<ChannelDetailTableProps> = ({
  trades,
  filteredTrades,
  paginatedTrades,
  isMobileView,
  expandedRows,
  toggleRowExpansion,
  loading,
  t,
  currentPage,
  totalPages,
  goToPreviousPage,
  goToNextPage,
  getSignalProfitStatus
}) => {
  return (
    <Card className="w-full max-w-full overflow-x-auto">
      <CardContent className="p-2">
        <div className="mb-2 flex justify-between items-center">
          <div className="font-semibold text-base">{t('closed_signals')}</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToPreviousPage} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-xs">{t('page')} {currentPage} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={goToNextPage} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              {isMobileView ? (
                <>
                  <TableHead className="px-2 py-2 text-xs">{t('symbol')}</TableHead>
                  <TableHead className="px-2 py-2 text-xs">{t('direction')}</TableHead>
                  <TableHead className="px-2 py-2 text-xs text-right">{t('openPrice')}</TableHead>
                  <TableHead className="px-2 py-2 text-xs text-right">{t('openTime')}</TableHead>
                  <TableHead className="px-2 py-2 text-xs text-right">{t('profitLoss')}</TableHead>
                  <TableHead className="px-2 py-2 text-xs w-10"></TableHead>
                </>
              ) : (
                <>
                  <TableHead className="w-[60px] px-2 py-2 text-xs">{t('ticket')}</TableHead>
                  <TableHead className="px-2 py-2 text-xs">{t('symbol')}</TableHead>
                  <TableHead className="px-2 py-2 text-xs">{t('direction')}</TableHead>
                  <TableHead className="px-2 py-2 text-xs text-right">{t('openPrice')}</TableHead>
                  <TableHead className="px-2 py-2 text-xs text-right">{t('openTime')}</TableHead>
                  <TableHead className="px-2 py-2 text-xs text-right">{t('closePrice')}</TableHead>
                  <TableHead className="px-2 py-2 text-xs text-right">{t('closeTime')}</TableHead>
                  <TableHead className="px-2 py-2 text-xs text-right">{t('profitLoss')}</TableHead>
                  <TableHead className="px-2 py-2 text-xs">{t('status')}</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTrades.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isMobileView ? 7 : 9} className="text-center">
                  {loading ? t('loading') : (filteredTrades.length > 0 ? t('noTradeOnPage') : t('tradeRecordNotFound'))}
                </TableCell>
              </TableRow>
            ) : (
              paginatedTrades.map((trade) => {
                const profitStatus = getSignalProfitStatus(trade);
                return isMobileView ? (
                  <React.Fragment key={trade.ticket}>
                    <TableRow className="text-xs cursor-pointer hover:bg-muted/50" onClick={() => toggleRowExpansion(trade.ticket)}>
                      <TableCell className="px-2 py-1.5">{trade.symbol}</TableCell>
                      <TableCell className="px-2 py-1.5">
                        <Badge className={`${trade.side === "BUY" ? "bg-blue-100 text-blue-800 border-blue-300" : "bg-red-100 text-red-800 border-red-300"} px-1.5 py-0.5 text-[10px] rounded-full`}>
                          {trade.side === "BUY" ? "LONG" : "SHORT"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-2 py-1.5 text-right">{trade.open_price ?? '-'}</TableCell>
                      <TableCell className="px-2 py-1.5 text-right">{trade.open_time ? formatDate(trade.open_time) : '-'}</TableCell>
                      <TableCell className="px-2 py-1.5 text-right">
                        <span className={`font-medium ${profitStatus.isProfit ? 'text-green-600' : 'text-red-600'}`}>{profitStatus.percent.toFixed(2)}%</span>
                      </TableCell>
                      <TableCell className="px-2 py-1.5 text-center">{expandedRows[trade.ticket] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</TableCell>
                    </TableRow>
                    {expandedRows[trade.ticket] && (
                      <TableRow className="text-xs bg-muted/20">
                        <TableCell colSpan={7} className="px-3 py-2">
                          <div className="space-y-1 text-[12px]">
                            <div><span className="font-medium">{t('ticket')}:</span> {trade.ticket}</div>
                            <div><span className="font-medium">{t('closePrice')}:</span> {trade.close_price ?? '-'}</div>
                            <div><span className="font-medium">{t('closeTime')}:</span> {formatDate(trade.closeTime)}</div>
                            {trade.signal_message && (
                              <div dangerouslySetInnerHTML={{ __html: trade.signal_message }} />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ) : (
                  <React.Fragment key={trade.ticket}>
                    <TableRow className="text-xs cursor-pointer hover:bg-muted/50" onClick={() => toggleRowExpansion(trade.ticket)}>
                      <TableCell className="font-medium px-2 py-1.5">{trade.ticket}</TableCell>
                      <TableCell className="px-2 py-1.5">{trade.symbol}</TableCell>
                      <TableCell className="px-2 py-1.5">
                        <Badge className={`${trade.side === "BUY" ? "bg-blue-100 text-blue-800 border-blue-300" : "bg-red-100 text-red-800 border-red-300"} px-1.5 py-0.5 text-[10px] rounded-full`}>
                          {trade.side === "BUY" ? "LONG" : "SHORT"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-2 py-1.5 text-right">{trade.open_price ?? '-'}</TableCell>
                      <TableCell className="px-2 py-1.5 text-right">{trade.open_time ? formatDate(trade.open_time) : '-'}</TableCell>
                      <TableCell className="px-2 py-1.5 text-right">{trade.close_price ?? '-'}</TableCell>
                      <TableCell className="px-2 py-1.5 text-right">{formatDate(trade.closeTime)}</TableCell>
                      <TableCell className="px-2 py-1.5 text-right">
                        <span className={`font-medium ${profitStatus.isProfit ? 'text-green-600' : 'text-red-600'}`}>{trade.profit ?? '-'}</span>
                      </TableCell>
                      <TableCell className="px-2 py-1.5">
                        <Badge className={
                          `px-1.5 py-0.5 text-[10px] rounded-full ${
                            trade.statusCode === 2 ? "bg-green-100 text-green-800 border-green-300" : 
                            trade.statusCode === 3 ? "bg-red-100 text-red-800 border-red-300" : 
                            "bg-yellow-100 text-yellow-800 border-yellow-300"
                          }`
                        }>
                          {t(trade.status.toLowerCase())}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    {expandedRows[trade.ticket] && (
                      <TableRow className="text-xs bg-muted/20">
                        <TableCell colSpan={9} className="px-3 py-2">
                          <div className="space-y-1 text-[12px]">
                            {trade.signal_message && (
                              <div 
                              dangerouslySetInnerHTML={{ __html: trade.signal_message }} />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ChannelDetailTable; 