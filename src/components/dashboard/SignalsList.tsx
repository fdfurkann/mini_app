import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

import { useLang } from '@/hooks/useLang';

interface Trade {
  id: string | number;
  symbol: string;
  side: string;
  entryPrice?: number;
  timestamp: string | Date;
  exchange?: string;
  pnl?: number;
  status?: string;
}

interface SignalsListProps {
  trades: Trade[];
}

const SignalsList: React.FC<SignalsListProps> = ({ trades }) => {
  const { lang } = useLang();
  const { t } = useLang();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('signals')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {trades.map(trade => (
            <div key={trade.id} className="flex items-center">
              <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none">
                  {trade.symbol} - {t(trade.side.toLowerCase())}
                </p>
                <p className="text-sm text-muted-foreground">
                  {typeof trade.timestamp === 'string' ? trade.timestamp : trade.timestamp.toLocaleString(lang === 'en' ? 'en-US' : 'tr-TR')}
                </p>
              </div>
              <div className="ml-auto font-medium">
                {trade.entryPrice ? `$${trade.entryPrice}` : '-'}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SignalsList;
