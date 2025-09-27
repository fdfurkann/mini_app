import React, { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

import { useLang } from '@/hooks/useLang';

interface StatCardProps {
  title: string;
  value: string | number;
  label: string;
  icon: ReactNode;
  valueClassName?: string;
  onClick?: () => void;
  clickable?: boolean;
  rightIcon?: ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  label,
  icon,
  valueClassName = "",
  onClick,
  clickable = false,
  rightIcon
}) => {
  const { lang } = useLang();
  const { t } = useLang();
  return (
    <Card className={`dashboard-card${clickable ? ' cursor-pointer hover:bg-secondary/30 active:bg-secondary/50 border-primary/40' : ''}`} onClick={clickable ? onClick : undefined} tabIndex={clickable ? 0 : undefined}>
      <CardHeader className="p-2 pb-1">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-1">{t(title)}{icon}</span>
          {rightIcon && <span>{rightIcon}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 pt-0">
        <div className={`stat-value ${valueClassName}`}>{value}</div>
        <div className="stat-label">{t(label)}</div>
      </CardContent>
    </Card>
  );
};

export default StatCard;
