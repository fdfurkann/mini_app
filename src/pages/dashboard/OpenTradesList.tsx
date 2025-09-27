import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, ChevronDown } from "lucide-react";

interface Trade {
  id: number;
  symbol: string;
  side: 'BUY' | 'SELL';
  entry_price: number | null;
  current_price: number | null;
  quantity: number | null;
  pnl: number | null;
  created_at: string;
  exchange: string;
}

interface OpenTradesListProps {
  trades: Trade[];
  loading: boolean;
}

const OpenTradesList: React.FC<OpenTradesListProps> = ({ trades, loading }) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Açık İşlemler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Açık İşlemler</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket</TableHead>
              <TableHead>Sembol</TableHead>
              <TableHead>Yön</TableHead>
              <TableHead>Açılış Fiyatı</TableHead>
              <TableHead>Borsa</TableHead>
              <TableHead className="w-[32px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Açık işlem bulunmuyor
                </TableCell>
              </TableRow>
            ) : (
              trades.map((trade) => (
                <TableRow key={trade.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>{trade.id}</TableCell>
                  <TableCell className="font-medium">{trade.symbol}</TableCell>
                  <TableCell>
                    {trade.side === 'BUY' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-signal-success/10 text-signal-success">
                        LONG
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium !bg-[#EF4444] !text-white"
                        style={{ backgroundColor: '#EF4444', color: '#fff' }}
                      >
                        SHORT
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{trade.entry_price?.toFixed(4) || '-'}</TableCell>
                  <TableCell>{trade.exchange || '-'}</TableCell>
                  <TableCell>
                    <ChevronDown size={16} className="text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default OpenTradesList; 