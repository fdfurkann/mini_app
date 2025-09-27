import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Download, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { TradeData, formatDate } from './TradeHistoryUtils';

interface TradeHistoryTableProps {
  trades: TradeData[];
  filteredTrades: TradeData[];
  paginatedTrades: TradeData[];
  profitChartData: any[];
  profitChartApiNames: string[];
  isMobileView: boolean;
  expandedRows: Record<number, boolean>;
  toggleRowExpansion: (ticket: number) => void;
  loading: boolean;
  t: any;
  currentPage: number;
  totalPages: number;
  goToPreviousPage: () => void;
  goToNextPage: () => void;
  openEditDialog: (trade: TradeData) => void;
  openDeleteDialog: (trade: TradeData) => void;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--signal-success))", "hsl(var(--signal-warning))", "hsl(var(--signal-danger))"];

const TradeHistoryTable: React.FC<TradeHistoryTableProps> = ({
  trades,
  filteredTrades,
  paginatedTrades,
  profitChartData,
  profitChartApiNames,
  isMobileView,
  expandedRows,
  toggleRowExpansion,
  loading,
  t,
  currentPage,
  totalPages,
  goToPreviousPage,
  goToNextPage,
  openEditDialog,
  openDeleteDialog
}) => {
  return (
    <>
      <div className="grid grid-cols-1 gap-2">
        <Card className="dashboard-card w-full">
          <CardHeader className="p-2 pb-0">
            <CardTitle className="text-sm">{t('cumulativeProfitLoss')}</CardTitle>
            <CardDescription className="text-xs">{t('profitLossByApi')}</CardDescription>
          </CardHeader>
          <CardContent className="p-2">
            <div className="w-full h-64 md:h-80">
              {profitChartData.length > 0 ? (
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
                      formatter={(value: number) => [`${value.toFixed(2)} USDT`, undefined]}
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
                    {profitChartApiNames.map((apiName, index) => (
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

      <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('tradeSearch')}
            className="pl-8"
            // Arama fonksiyonu ana componentte, burada sadece input gösteriliyor
            readOnly
          />
        </div>
        <div className="flex gap-1 w-full sm:w-auto">
          <Select value="all" onValueChange={() => {}}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder={t('filterByExchange')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allExchanges')}</SelectItem>
              {[...new Set(trades.map(t => t.apiName))].map(apiName => (
                <SelectItem key={apiName} value={apiName}>
                  {apiName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="w-full max-w-full overflow-x-auto">
        <CardHeader className="p-2 pb-0">
          <CardTitle className="text-sm">{t('allTrades')}</CardTitle>
          <CardDescription className="text-xs">{t('tradeHistory')}</CardDescription>
        </CardHeader>
        <CardContent className="p-2">
          <div className="">
            <Table>
              <TableHeader>
                <TableRow>
                  {isMobileView ? (
                    <>
                      <TableHead className="px-2 py-2 text-xs w-[60px]">{t('ticket')}</TableHead>
                      <TableHead className="px-2 py-2 text-xs">{t('symbol')}</TableHead>
                      <TableHead className="px-2 py-2 text-xs">{t('direction')}</TableHead>
                      <TableHead className="px-2 py-2 text-xs text-right">{t('openPrice')}</TableHead>
                      <TableHead className="px-2 py-2 text-xs text-right">{t('openTime')}</TableHead>
                      <TableHead className="px-2 py-2 text-xs w-10"></TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="w-[60px] px-2 py-2 text-xs">{t('ticket')}</TableHead>
                      <TableHead className="px-2 py-2 text-xs">{t('symbol')}</TableHead>
                      <TableHead className="px-2 py-2 text-xs">{t('direction')}</TableHead>
                      <TableHead className="px-2 py-2 text-xs text-right">{t('openPrice')}</TableHead>
                      <TableHead className="px-2 py-2 text-xs text-right">{t('openTime')}</TableHead>
                      <TableHead className="px-2 py-2 text-xs text-right">{t('volume')}</TableHead>
                      <TableHead className="px-2 py-2 text-xs text-right">{t('sl')}</TableHead>
                      <TableHead className="px-2 py-2 text-xs text-right">{t('tp')}</TableHead>
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
                    <TableCell colSpan={isMobileView ? 6 : 12} className="text-center">
                      {loading ? t('loading') : (filteredTrades.length > 0 ? t('noTradeOnPage') : t('tradeRecordNotFound'))}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTrades.map((trade) => (
                    isMobileView ? (
                      <React.Fragment key={trade.ticket}>
                        <TableRow onClick={() => toggleRowExpansion(trade.ticket)} className="cursor-pointer text-xs hover:bg-muted/50">
                          <TableCell className="font-medium px-2 py-1.5">{trade.ticket}</TableCell>
                          <TableCell className="px-2 py-1.5">{trade.symbol}</TableCell>
                          <TableCell className="px-2 py-1.5">
                            <Badge className={`${trade.side === "BUY" ? "bg-blue-100 text-blue-800 border-blue-300" : "bg-red-100 text-red-800 border-red-300"} px-1.5 py-0.5 text-[10px] rounded-full`}>
                              {trade.side === "BUY" ? "LONG" : "SHORT"}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-2 py-1.5 text-right">
                            {typeof trade.openPrice === 'number' ? trade.openPrice.toFixed(4) : '-'}
                          </TableCell>
                          <TableCell className="px-2 py-1.5 text-right">{formatDate(trade.openTime)}</TableCell>
                          <TableCell className="px-2 py-1.5 text-center">
                            {expandedRows[trade.ticket] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </TableCell>
                        </TableRow>
                        {expandedRows[trade.ticket] && (
                          <TableRow className="text-xs bg-muted/20">
                            <TableCell colSpan={6} className="px-3 py-2">
                              <div className="space-y-1 text-[11px]">
                                <div><span className="font-medium">{t('volume')}:</span> {trade.volume?.toFixed(2) || '-'}</div>
                                <div><span className="font-medium">{t('sl')}:</span> {typeof trade.sl === 'number' ? trade.sl.toFixed(4) : '-'}</div>
                                <div><span className="font-medium">{t('tp')}:</span> {typeof trade.tp === 'number' ? trade.tp.toFixed(4) : '-'}</div>
                                <div><span className="font-medium">{t('closePrice')}:</span> {typeof trade.closePrice === 'number' ? trade.closePrice.toFixed(4) : '-'}</div>
                                <div><span className="font-medium">{t('closeTime')}:</span> {formatDate(trade.closeTime)}</div>
                                <div>
                                  <span className="font-medium">{t('profitLoss')}:</span> 
                                  {(() => {
                                    if (trade.statusCode !== 2) return ' -';
                                    let calculatedProfit: number | undefined = undefined;
                                    if (typeof trade.openPrice === 'number' && typeof trade.closePrice === 'number' && typeof trade.volume === 'number') {
                                      calculatedProfit = trade.side === "BUY"
                                        ? (trade.closePrice - trade.openPrice) * trade.volume
                                        : (trade.openPrice - trade.closePrice) * trade.volume;
                                    }
                                    const profitColor = calculatedProfit !== undefined && calculatedProfit > 0 ? "text-green-600" : calculatedProfit !== undefined && calculatedProfit < 0 ? "text-red-600" : "";
                                    return <span className={`font-medium ${profitColor}`}> {calculatedProfit !== undefined ? calculatedProfit.toFixed(2) : '-'}</span>;
                                  })()}
                                </div>
                                <div>
                                  <span className="font-medium">{t('status')}:</span>
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
                    ) : (
                      <React.Fragment key={trade.ticket}>
                        <TableRow className="text-xs">
                          <TableCell className="font-medium px-2 py-1.5">{trade.ticket}</TableCell>
                          <TableCell className="px-2 py-1.5">{trade.symbol}</TableCell>
                          <TableCell className="px-2 py-1.5">
                            <Badge className={`${trade.side === "BUY" ? "bg-blue-100 text-blue-800 border-blue-300" : "bg-red-100 text-red-800 border-red-300"} px-1.5 py-0.5 text-[10px] rounded-full`}>
                              {trade.side === "BUY" ? "LONG" : "SHORT"}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-2 py-1.5 text-right">
                            {typeof trade.openPrice === 'number' ? trade.openPrice.toFixed(4) : '-'}
                          </TableCell>
                          <TableCell className="px-2 py-1.5 text-right">{formatDate(trade.openTime)}</TableCell>
                          <TableCell className="px-2 py-1.5 text-right">
                            {trade.volume?.toFixed(2) || '-'}
                          </TableCell>
                          <TableCell className="px-2 py-1.5 text-right">
                            {typeof trade.sl === 'number' ? trade.sl.toFixed(4) : '-'}
                          </TableCell>
                          <TableCell className="px-2 py-1.5 text-right">
                            {typeof trade.tp === 'number' ? trade.tp.toFixed(4) : '-'}
                          </TableCell>
                          <TableCell className="px-2 py-1.5 text-right">
                            {typeof trade.closePrice === 'number' ? trade.closePrice.toFixed(4) : '-'}
                          </TableCell>
                          <TableCell className="px-2 py-1.5 text-right">{formatDate(trade.closeTime)}</TableCell>
                          <TableCell className="px-2 py-1.5 text-right">
                            {(() => {
                              if (trade.statusCode !== 2) {
                                return '-';
                              }
                              let calculatedProfit: number | undefined = undefined;
                              if (typeof trade.openPrice === 'number' && typeof trade.closePrice === 'number' && typeof trade.volume === 'number') {
                                calculatedProfit = trade.side === "BUY"
                                  ? (trade.closePrice - trade.openPrice) * trade.volume
                                  : (trade.openPrice - trade.closePrice) * trade.volume;
                              }
                              const profitColor = calculatedProfit !== undefined && calculatedProfit > 0 ? "text-green-600" : "text-red-600";
                              return (
                                <span className={`font-medium ${profitColor}`}>
                                  {calculatedProfit !== undefined ? calculatedProfit.toFixed(2) : '-'}
                                </span>
                              );
                            })()}
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
                        {trade.statusCode === 3 && trade.event && (
                          <TableRow className="bg-red-50 hover:bg-red-100">
                            <TableCell colSpan={12} className="py-1 px-2 text-[11px] text-red-700 italic">
                              {t('error')}: {trade.event}
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        {totalPages > 1 && (
          <div className="flex items-center justify-end space-x-2 p-2 border-t">
            <span className="text-sm text-muted-foreground">
              {t('page')} {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">{t('previousPage')}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">{t('nextPage')}</span>
            </Button>
          </div>
        )}
      </Card>
    </>
  );
};

export default TradeHistoryTable; 