
import React, { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  label: string;
  icon: ReactNode;
  valueClassName?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  label,
  icon,
  valueClassName = ""
}) => {
  return (
    <Card className="dashboard-card">
      <CardHeader className="p-2 pb-1">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          {title}
          {icon}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 pt-0">
        <div className={`stat-value ${valueClassName}`}>{value}</div>
        <div className="stat-label">{label}</div>
      </CardContent>
    </Card>
  );
};

export default StatCard;
