import React from 'react';
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon } from "lucide-react";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface BackTestFormProps {
  t: any;
  channels: any[];
  selectedChannel: string;
  setSelectedChannel: (v: string) => void;
  loadingChannels: boolean;
  dateRange: any;
  setDateRange: (v: any) => void;
  autoTrade: boolean;
  setAutoTrade: (v: boolean) => void;
  leverage: number[];
  setLeverage: (v: number[]) => void;
  entryAmount: string;
  setEntryAmount: (v: string) => void;
  tradeType: string;
  setTradeType: (v: string) => void;
  entryType: string;
  setEntryType: (v: string) => void;
  singleTpValue: string;
  setSingleTpValue: (v: string) => void;
  stopLossType: string;
  setStopLossType: (v: string) => void;
  customStopLoss: string;
  setCustomStopLoss: (v: string) => void;
  breakEvenLevel: string;
  setBreakEvenLevel: (v: string) => void;
  trailStopLevel: string;
  setTrailStopLevel: (v: string) => void;
  maxOrders: string;
  setMaxOrders: (v: string) => void;
  stopLossActionType: string;
  setStopLossActionType: (v: string) => void;
  specificLossPercentage: string;
  setSpecificLossPercentage: (v: string) => void;
  multipleTpValues: any;
  setMultipleTpValues: (v: any) => void;
  isLoadingBacktest: boolean;
  handleBacktestStart: () => void;
  cn: any;
}

const BackTestForm: React.FC<BackTestFormProps> = ({
  t, channels, selectedChannel, setSelectedChannel, loadingChannels, dateRange, setDateRange, autoTrade, setAutoTrade, leverage, setLeverage, entryAmount, setEntryAmount, tradeType, setTradeType, entryType, setEntryType, singleTpValue, setSingleTpValue, stopLossType, setStopLossType, customStopLoss, setCustomStopLoss, breakEvenLevel, setBreakEvenLevel, trailStopLevel, setTrailStopLevel, maxOrders, setMaxOrders, stopLossActionType, setStopLossActionType, specificLossPercentage, setSpecificLossPercentage, multipleTpValues, setMultipleTpValues, isLoadingBacktest, handleBacktestStart, cn
}) => {
  // TP slider mantığı: Toplam 100'ü geçmesin, birini arttırınca diğerlerinden azalt
  const handleTpSliderChange = (tpKey: string, newValue: number) => {
    setMultipleTpValues(prev => {
      let newTpValues = { ...prev, [tpKey]: newValue };
      let total = Object.values(newTpValues).reduce((sum, v) => sum + Number(v), 0);
      if (total <= 100) {
        return newTpValues;
      }
      // Fazla olanı diğerlerinden (en büyükten başlayarak, değiştirilen hariç) azalt
      let over = total - 100;
      let sortedKeys = Object.keys(newTpValues)
        .filter(k => k !== tpKey)
        .sort((a, b) => Number(newTpValues[b]) - Number(newTpValues[a]));
      for (let k of sortedKeys) {
        if (over <= 0) break;
        let val = Number(newTpValues[k]);
        if (val > 0) {
          let diff = Math.min(val, over);
          newTpValues[k] = val - diff;
          over -= diff;
        }
      }
      for (let k of Object.keys(newTpValues)) {
        if (newTpValues[k] < 0) newTpValues[k] = 0;
      }
      return { ...newTpValues };
    });
  };
  return (
    <CardContent className="space-y-6 pt-6">
      {/* Kanal Seçimi */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-0.5 flex-1">
          <Label htmlFor="channelSelect">{t('backtest.channelSelect')}</Label>
          <p className="text-sm text-muted-foreground">{t('backtest.channelSelectDescription')}</p>
        </div>
        <div className="flex-1">
          <Select 
            value={selectedChannel}
            onValueChange={setSelectedChannel}
            disabled={loadingChannels}
          >
            <SelectTrigger id="channelSelect">
              <SelectValue placeholder={loadingChannels ? t('loading') : t('backtest.selectChannel')} />
            </SelectTrigger>
            <SelectContent>
              {channels.map((channel: any) => (
                <SelectItem key={channel.id} value={channel.room_id}>
                  {channel.room_name || `ID: ${channel.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Tarih Aralığı Seçimi */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-0.5 flex-1">
          <Label htmlFor="dateRangePicker">{t('backtest.dateRange')}</Label>
          <p className="text-sm text-muted-foreground">{t('backtest.dateRangeDescription')}</p>
        </div>
        <div className="flex-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="dateRangePicker"
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
                    </>
                  ) : (
                    dateRange.from.toLocaleDateString()
                  )
                ) : (
                  <span>{t('backtest.selectDateRange')}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      {/* İşleme Giriş Miktarı */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-0.5 flex-1">
          <Label>{t('backtest.entryAmount')}</Label>
          <p className="text-sm text-muted-foreground">{t('backtest.entryAmountDescription')}</p>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={entryAmount}
              onChange={(e) => setEntryAmount(e.target.value)}
              placeholder={t('backtest.enterAmount')}
              className="flex-grow"
              min="0"
            />
            <span className="text-sm font-medium text-muted-foreground">{t('backtest.usdt')}</span>
          </div>
          <Accordion type="single" collapsible className="w-full mt-2">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-xs font-semibold text-muted-foreground hover:no-underline py-1">
                {t('backtest.howMuchToEnter')}
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground space-y-1 pt-1">
                <p>{t('backtest.enterAmountInfo1')}</p>
                <p>{t('backtest.enterAmountInfo2')}</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
      {/* Kaldıraç Slider */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-0.5 flex-1">
          <Label>{t('backtest.leverage')}</Label>
          <p className="text-sm text-muted-foreground">{t('backtest.leverageDescription')}</p>
        </div>
        <div className="flex-1">
          <Slider
            value={leverage}
            onValueChange={setLeverage}
            max={25}
            min={1}
            step={1}
          />
          <div className="flex justify-between mt-1">
            <span className="text-sm text-muted-foreground">{t('backtest.safe')}</span>
            <span className="text-sm font-medium">{leverage}x</span>
            <span className="text-sm text-muted-foreground">{t('backtest.risky')}</span>
          </div>
        </div>
      </div>
      {/* İşlem Türü */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-0.5 flex-1">
          <Label>{t('backtest.tradeType')}</Label>
          <p className="text-sm text-muted-foreground">{t('backtest.tradeTypeDescription')}</p>
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={tradeType === "ISOLATED" ? "default" : "outline"}
              onClick={() => setTradeType("ISOLATED")}
              className="w-full"
            >
              {t('backtest.isolated')}
            </Button>
            <Button
              variant={tradeType === "CROSS" ? "default" : "outline"}
              onClick={() => setTradeType("CROSS")}
              className="w-full"
            >
              {t('backtest.cross')}
            </Button>
          </div>
        </div>
      </div>
      {/* Kar Al İşlem Ayarları */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-0.5 flex-1">
          <Label>{t('backtest.profitTradeSettings')}</Label>
          <p className="text-sm text-muted-foreground">{t('backtest.profitTradeSettingsDescription')}</p>
        </div>
        <div className="flex-1 space-y-4">
          <Select value={entryType} onValueChange={setEntryType}>
            <SelectTrigger>
              <SelectValue placeholder={t('backtest.profitTradeSelect')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('backtest.closed')}</SelectItem>
              <SelectItem value="percentage">{t('backtest.percentage')}</SelectItem>
              <SelectItem value="fixed">{t('backtest.fixedAmount')}</SelectItem>
            </SelectContent>
          </Select>
          {entryType !== 'none' && (
            entryType === "percentage" ? (
              <div className="space-y-4">
                {Array.from({length: 10}, (_, i) => (
                  <div key={`tp${i+1}`} className="flex items-center justify-between gap-2">
                    <Label className="w-20">{t('backtest.tp')}{i+1}</Label>
                    <div className="flex-1">
                      <Slider
                        value={[multipleTpValues[`tp${i+1}`]]}
                        onValueChange={(newValue) => handleTpSliderChange(`tp${i+1}`, newValue[0])}
                        max={100}
                        min={0}
                        step={1}
                      />
                    </div>
                    <span className="w-12 text-right text-sm font-medium">{multipleTpValues[`tp${i+1}`]}%</span>
                  </div>
                ))}
                <div className="text-right text-xs text-muted-foreground mt-1">
                  Toplam: {Object.values(multipleTpValues).reduce((a, b) => Number(a) + Number(b), 0)}%
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <Label>{t('backtest.tpLevel')}</Label>
                <div className="relative flex-1">
                  <span className="absolute left-2 top-1/2 transform -translate-y-1/2">%</span>
                  <Input
                    type="number"
                    value={singleTpValue}
                    onChange={(e) => setSingleTpValue(e.target.value)}
                    className="pl-6"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Zarar Durdur Ayarları */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-0.5 flex-1">
          <Label>{t('backtest.stopLossSettings')}</Label>
          <p className="text-sm text-muted-foreground">{t('backtest.stopLossSettingsDescription')}</p>
        </div>
        <div className="flex-1 space-y-4">
          <Select value={stopLossType} onValueChange={setStopLossType}>
            <SelectTrigger>
              <SelectValue placeholder={t('backtest.selectStopLossStrategy')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('backtest.noStopLoss')}</SelectItem>
              <SelectItem value="signal">{t('backtest.signalSL')}</SelectItem>
              <SelectItem value="custom">{t('backtest.fixedSL')}</SelectItem>
            </SelectContent>
          </Select>

          {stopLossType === 'custom' && (
            <div className="flex items-center justify-between gap-2 mt-2">
              <Label>{t('backtest.customStopLossPercentage')}</Label>
              <div className="relative flex-1">
                <Input
                  type="number"
                  value={customStopLoss}
                  onChange={(e) => setCustomStopLoss(e.target.value)}
                  className="pr-8"
                  min="0"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
            </div>
          )}
          
          <Accordion type="single" collapsible className="w-full mt-2">
            <AccordionItem value="sl-desc">
              <AccordionTrigger className="text-xs font-semibold text-muted-foreground hover:no-underline py-1">
                Zarar Durdur Açıklaması
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground space-y-1 pt-1">
                {t('settings.stoplossTradeSettingsDescription').split('\n').map((line: string, idx: number) => line.trim() === '⸻' ? <hr key={idx} className="my-2" /> : <p key={idx}>{line}</p>)}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* Maks Emir Miktarı - Bu bölümü tutmak isteyebilirsiniz veya kaldırabilirsiniz. Şimdilik yorum satırı yapıyorum. */}
      {/* 
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-0.5 flex-1">
          <Label>{t('backtest.maxOrders')}</Label>
          <p className="text-sm text-muted-foreground">{t('backtest.maxOrdersDescription')}</p>
        </div>
        <div className="flex-1">
          <Input
            type="number"
            value={maxOrders}
            onChange={(e) => setMaxOrders(e.target.value)}
            min="1"
            max="100"
          />
        </div>
      </div> 
      */}
    </CardContent>
  );
};

export default BackTestForm; 