import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { useApiKeySettingsState } from './ApiKeySettingsState';
import ApiKeySettingsForm from './ApiKeySettingsForm';
import { useLang } from '@/hooks/useLang';

const Settings = () => {
  const { lang } = useLang();
  const { t } = useLang();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const apiId = searchParams.get('id');
  const [apiData, setApiData] = React.useState<any>(null);
  const state = useApiKeySettingsState(apiId, t, apiData, setApiData, navigate);
  const {
    autoTrade, setAutoTrade, leverage, setLeverage, entryAmount, setEntryAmount, apiKeyName, tradeType, setTradeType, entryType, setEntryType, singleTpValue, setSingleTpValue, stopLossType, setStopLossType, customStopLoss, setCustomStopLoss, breakEvenLevel, setBreakEvenLevel, trailStopLevel, setTrailStopLevel, maxOrders, setMaxOrders, stopLossActionType, setStopLossActionType, specificLossPercentage, setSpecificLossPercentage, multipleTpValues, setMultipleTpValues, isLoading, handleSave
  } = state;

  return (
    <div className="w-full max-w-none">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{t('settings.title')} {apiKeyName}</h1>
      </div>

      <Card>
        <ApiKeySettingsForm
          t={t}
          autoTrade={autoTrade}
          setAutoTrade={setAutoTrade}
          leverage={leverage}
          setLeverage={setLeverage}
          entryAmount={entryAmount}
          setEntryAmount={setEntryAmount}
          tradeType={tradeType}
          setTradeType={setTradeType}
          entryType={entryType}
          setEntryType={setEntryType}
          singleTpValue={singleTpValue}
          setSingleTpValue={setSingleTpValue}
          stopLossType={stopLossType}
          setStopLossType={setStopLossType}
          customStopLoss={customStopLoss}
          setCustomStopLoss={setCustomStopLoss}
          breakEvenLevel={breakEvenLevel}
          setBreakEvenLevel={setBreakEvenLevel}
          trailStopLevel={trailStopLevel}
          setTrailStopLevel={setTrailStopLevel}
          maxOrders={maxOrders}
          setMaxOrders={setMaxOrders}
          stopLossActionType={stopLossActionType}
          setStopLossActionType={setStopLossActionType}
          specificLossPercentage={specificLossPercentage}
          setSpecificLossPercentage={setSpecificLossPercentage}
          multipleTpValues={multipleTpValues}
          setMultipleTpValues={setMultipleTpValues}
          isLoading={isLoading}
          handleSave={handleSave}
        />
      </Card>
    </div>
  );
};

export default Settings;
