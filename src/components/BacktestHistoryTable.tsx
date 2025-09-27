import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Download, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { TradeData, formatDate } from './BacktestHistoryUtils';

interface BacktestHistoryTableProps {
  trades: any[];
  paginatedTrades: any[];
  isMobileView: boolean;
  expandedRows: Record<number, boolean>;
  toggleRowExpansion: (ticket: number) => void;
  loading: boolean;
  t: any;
  currentPage: number;
  totalPages: number;
  goToPreviousPage: () => void;
  goToNextPage: () => void;
  profitChartData: any[];
  profitChartApiNames: string[];
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--signal-success))", "hsl(var(--signal-warning))", "hsl(var(--signal-danger))"];

// Tarih formatlama fonksiyonu
function formatDateYMDHIS(dateStr: string) {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

const BacktestHistoryTable: React.FC<BacktestHistoryTableProps> = ({
  trades,
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
  profitChartData,
  profitChartApiNames
}) => {
  return (
    <Card className="w-full max-w-full overflow-x-auto">
      <CardContent className="p-2">
        {/* Kar Grafiği Kartı */}
        <div className="grid grid-cols-1 gap-2 mb-4">
          <Card className="dashboard-card w-full">
            <CardHeader className="p-2 pb-0">
              <div className="text-sm font-semibold">Backtest Kar Grafiği</div>
            </CardHeader>
            <CardContent className="p-2">
              <div className="w-full h-64 md:h-80">
                {(Array.isArray(profitChartData) && profitChartData.length > 0) ? (
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
                        tickFormatter={(value) => `${value} USDT`}
                      />
                      <RechartsTooltip 
                        formatter={(value) => [`${value} USDT`, undefined]}
                        labelFormatter={(label) => `Tarih: ${label}`}
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
                      {(Array.isArray(profitChartApiNames) ? profitChartApiNames : []).map((apiName, index) => (
                        <Line 
                          key={apiName} 
                          type="monotone" 
                          dataKey={apiName} 
                          stroke={COLORS[index % COLORS.length]} 
                          strokeWidth={2}
                          dot={false}
                          name={apiName}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-xs text-muted-foreground">{t('notEnoughData')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="mb-2 flex justify-between items-center">
          <div className="font-semibold text-base">Backtest İşlem Sonuçları</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToPreviousPage} disabled={currentPage === 1}>{"<"}</Button>
            <span className="text-xs">{t('page')} {currentPage} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={goToNextPage} disabled={currentPage === totalPages}>{">"}</Button>
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
                  <TableHead className="px-2 py-2 text-xs text-right">Lot</TableHead>
                  <TableHead className="px-2 py-2 text-xs text-right">{t('closePrice')}</TableHead>
                  <TableHead className="px-2 py-2 text-xs text-right">Kar (USDT)</TableHead>
                  <TableHead className="px-2 py-2 text-xs text-right">Toplam Kar</TableHead>
                </>
              ) : (
                <>
                  <TableHead className="w-[60px] px-2 py-2 text-xs">{t('ticket')}</TableHead>
                  <TableHead className="px-2 py-2 text-xs">{t('symbol')}</TableHead>
                  <TableHead className="px-2 py-2 text-xs">{t('direction')}</TableHead>
                  <TableHead className="px-2 py-2 text-xs text-right">{t('openPrice')}</TableHead>
                  <TableHead className="px-2 py-2 text-xs text-right">{t('openTime')}</TableHead>
                  <TableHead className="px-2 py-2 text-xs text-right">SL</TableHead>
                  <TableHead className="px-2 py-2 text-xs text-right">TP</TableHead>
                  <TableHead className="px-2 py-2 text-xs text-right">Lot</TableHead>
                  <TableHead className="px-2 py-2 text-xs text-right">Kar (USDT)</TableHead>
                  <TableHead className="px-2 py-2 text-xs text-right">{t('closePrice')}</TableHead>
                  <TableHead className="px-2 py-2 text-xs text-right">{t('closeTime')}</TableHead>
                  <TableHead className="px-2 py-2 text-xs text-right">Toplam Kar</TableHead>
                  <TableHead className="px-2 py-2 text-xs">{t('status')}</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTrades.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isMobileView ? 6 : 13} className="text-center">
                  {loading ? t('loading') : t('tradeRecordNotFound')}
                </TableCell>
              </TableRow>
            ) : (
              paginatedTrades.map((trade) => (
                <React.Fragment key={trade.ticket}>
                  <TableRow className="text-xs cursor-pointer hover:bg-muted/50" onClick={() => toggleRowExpansion(trade.ticket)}>
                    {isMobileView ? (
                      <>
                        <TableCell className="px-2 py-1.5">{trade.symbol}</TableCell>
                        <TableCell className="px-2 py-1.5">
                          <Badge className={`${trade.side === "BUY" ? "bg-blue-100 text-blue-800 border-blue-300" : "bg-red-100 text-red-800 border-red-300"} px-1.5 py-0.5 text-[10px] rounded-full`}>
                            {trade.side === "BUY" ? "LONG" : "SHORT"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-2 py-1.5 text-right">{typeof trade.openPrice === 'number' ? trade.openPrice : '-'}</TableCell>
                        <TableCell className="px-2 py-1.5 text-right">{(trade.lot !== undefined && trade.lot !== null && trade.lot !== 0) ? (typeof trade.lot === 'number' ? trade.lot : Number(trade.lot)) : '-'}</TableCell>
                        <TableCell className="px-2 py-1.5 text-right">{typeof trade.closePrice === 'number' ? trade.closePrice : '-'}</TableCell>
                        <TableCell className="px-2 py-1.5 text-right" style={{color: trade.profitUSDT > 0 ? '#16a34a' : (trade.profitUSDT < 0 ? '#dc2626' : undefined)}}>{trade.profitUSDT !== null && trade.profitUSDT !== undefined ? trade.profitUSDT.toFixed(4) + ' USDT' : '-'}</TableCell>
                        <TableCell className="px-2 py-1.5 text-right">{trade.totalProfit ?? '-'}</TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-medium px-2 py-1.5">{trade.ticket}</TableCell>
                        <TableCell className="px-2 py-1.5">{trade.symbol}</TableCell>
                        <TableCell className="px-2 py-1.5">
                          <Badge className={`${trade.side === "BUY" ? "bg-blue-100 text-blue-800 border-blue-300" : "bg-red-100 text-red-800 border-red-300"} px-1.5 py-0.5 text-[10px] rounded-full`}>
                            {trade.side === "BUY" ? "LONG" : "SHORT"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-2 py-1.5 text-right">{trade.openPrice ?? '-'}</TableCell>
                        <TableCell className="px-2 py-1.5 text-right">{formatDateYMDHIS(trade.openTime)}</TableCell>
                        <TableCell className="px-2 py-1.5 text-right">{trade.sl ?? '-'}</TableCell>
                        <TableCell className="px-2 py-1.5 text-right">{trade.tp ?? '-'}</TableCell>
                        <TableCell className="px-2 py-1.5 text-right">{trade.lot ?? '-'}</TableCell>
                        <TableCell className="px-2 py-1.5 text-right" style={{color: trade.profit > 0 ? 'hsl(var(--signal-success-foreground))' : (trade.profit < 0 ? 'hsl(var(--signal-danger-foreground))' : undefined)}}>{trade.profitStr ?? '-'}</TableCell>
                        <TableCell className="px-2 py-1.5 text-right">{trade.closePrice ?? '-'}</TableCell>
                        <TableCell className="px-2 py-1.5 text-right">{formatDateYMDHIS(trade.closeTime)}</TableCell>
                        <TableCell className="px-2 py-1.5 text-right">{trade.totalProfit ?? '-'}</TableCell>
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
                      </>
                    )}
                  </TableRow>
                  {expandedRows[trade.ticket] && (
                    <TableRow className="text-xs bg-muted/20">
                      <TableCell colSpan={isMobileView ? 6 : 13} className="px-3 py-2">
                        <div className="space-y-1 text-[11px]">
                          {isMobileView && <div><span className="font-medium">{t('ticket')}:</span> {trade.ticket}</div>}
                          <div><span className="font-medium">{t('openTime')}:</span> {formatDateYMDHIS(trade.openTime)}</div>
                          <div><span className="font-medium">SL:</span> {trade.sl ?? '-'}</div>
                          <div><span className="font-medium">TP:</span> {trade.tp ?? '-'}</div>
                          <div><span className="font-medium">{t('closeTime')}:</span> {formatDateYMDHIS(trade.closeTime)}</div>
                          <div><span className="font-medium">{t('profitLoss')}:</span> {trade.profitStr ? <span className={`font-medium ${trade.profit > 0 ? 'text-green-600' : (trade.profit < 0 ? 'text-red-600' : '')}`}> {trade.profitStr}</span> : '-'}</div>
                          <div><span className="font-medium">{t('status')}:</span>
                            <Badge className={
                              `ml-1 ${trade.statusCode === 2 ? "bg-green-100 text-green-800 border-green-300" : 
                              trade.statusCode === 3 ? "bg-red-100 text-red-800 border-red-300" : 
                              "bg-yellow-100 text-yellow-800 border-yellow-300"} px-1.5 py-0.5 text-[10px] rounded-full`
                            }>
                              {t(trade.status.toLowerCase())}
                            </Badge>
                          </div>
                          {trade.statusCode === 3 && trade.event && (
                            <div className="text-red-700 italic"><span className="font-medium">{t('error')}:</span> {trade.event}</div>
                          )}
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

export default BacktestHistoryTable; 