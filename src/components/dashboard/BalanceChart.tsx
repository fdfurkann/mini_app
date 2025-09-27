import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid,
  Cell 
} from "recharts";

import { useLang } from '@/hooks/useLang';

interface BalanceChartProps {
  data: {
    date: string;
    value: number;
    profit: number;
  }[];
}

const BalanceChart: React.FC<BalanceChartProps> = ({ data }) => {
  const { lang } = useLang();
  const { t } = useLang();
  return (
    <Card className="dashboard-card">
      <CardHeader className="p-2 pb-0">
        <CardTitle className="text-sm">{t('balanceChart.title')}</CardTitle>
        <CardDescription className="text-xs">Portföyünüzün zaman içindeki değişimi</CardDescription>
      </CardHeader>
      <CardContent className="p-1 pt-1">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 15, right: 10, left: 10, bottom: 5 }}
              barGap={0}
              barCategoryGap={5}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickMargin={8}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                width={50}
                tickFormatter={(value) => `${(value/1000).toFixed(0)}k`}
                tickMargin={8}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  borderColor: 'hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                  color: 'hsl(var(--card-foreground))',
                  fontSize: '12px',
                  padding: '8px'
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'value') return [`${value.toLocaleString()} USDT`, 'Toplam Bakiye'];
                  if (name === 'profit') return [`${value >= 0 ? '+' : ''}${value.toLocaleString()} USDT`, 'Günlük K/Z'];
                  return [value, name];
                }}
                labelStyle={{ color: 'hsl(var(--card-foreground))', fontSize: '10px' }}
              />
              <Bar 
                dataKey="value" 
                name="Bakiye"
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
              />
              <Bar 
                dataKey="profit" 
                name="Kar/Zarar"
                fill="transparent"
                radius={[4, 4, 0, 0]}
                maxBarSize={6}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.profit >= 0 ? "hsl(var(--signal-success))" : "hsl(var(--signal-danger))"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default BalanceChart;
