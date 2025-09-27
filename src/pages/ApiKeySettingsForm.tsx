import React from 'react';
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface ApiKeySettingsFormProps {
  t: any;
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
  isLoading: boolean;
  handleSave: () => void;
}

const ApiKeySettingsForm: React.FC<ApiKeySettingsFormProps> = ({
  t, autoTrade, setAutoTrade, leverage, setLeverage, entryAmount, setEntryAmount, tradeType, setTradeType, entryType, setEntryType, singleTpValue, setSingleTpValue, stopLossType, setStopLossType, customStopLoss, setCustomStopLoss, breakEvenLevel, setBreakEvenLevel, trailStopLevel, setTrailStopLevel, maxOrders, setMaxOrders, stopLossActionType, setStopLossActionType, specificLossPercentage, setSpecificLossPercentage, multipleTpValues, setMultipleTpValues, isLoading, handleSave
}) => {
  // TP slider mantığı: Toplam 100'ü geçmesin, birini arttırınca diğerlerinden azalt
  const handleTpSliderChange = (tpKey: string, newValue: number) => {
    let newTpValues = { ...multipleTpValues, [tpKey]: newValue };
    let total = Object.values(newTpValues).reduce((sum, v) => sum + Number(v), 0);
    if (total <= 100) {
      setMultipleTpValues(newTpValues);
      return;
    }
    // Fazla olanı diğerlerinden (en büyükten başlayarak, değiştirilen hariç) azalt
    let over = total - 100;
    // Sıralı anahtarlar (değiştirilen hariç, büyükten küçüğe)
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
    // Son kontrol: eksiye düşen varsa sıfırla
    for (let k of Object.keys(newTpValues)) {
      if (newTpValues[k] < 0) newTpValues[k] = 0;
    }
    setMultipleTpValues({ ...newTpValues });
  };
  return (
    <CardContent className="space-y-6 pt-6">
      {/* Otomatik Trading Switch */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-0.5 flex-1">
          <Label>{t('settings.autoTrade')}</Label>
          <p className="text-sm text-muted-foreground">{t('settings.autoTradeDescription')}</p>
        </div>
        <div className="flex justify-end flex-1">
          <Switch checked={autoTrade} onCheckedChange={setAutoTrade} />
        </div>
      </div>
      {/* İşleme Giriş Miktarı */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-0.5 flex-1">
          <Label>{t('settings.entryAmount')}</Label>
          <p className="text-sm text-muted-foreground">{t('settings.entryAmountDescription')}</p>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={entryAmount}
              onChange={(e) => setEntryAmount(e.target.value)}
              placeholder={t('settings.entryAmountPlaceholder')}
              className="flex-grow"
              min="0"
            />
            <span className="text-sm font-medium text-muted-foreground">{t('settings.usdt')}</span>
          </div>
          {/* Info Text Accordion */}
          <Accordion type="single" collapsible className="w-full mt-2">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-xs font-semibold text-muted-foreground hover:no-underline py-1">
                {t('settings.entryAmountQuestion')}
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground space-y-1 pt-1">
                <p>{t('settings.entryAmountExplanation1')}</p>
                <p>{t('settings.entryAmountExplanation2')}</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
      {/* Kaldıraç Slider */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-0.5 flex-1">
          <Label>{t('settings.leverage')}</Label>
          <p className="text-sm text-muted-foreground">{t('settings.leverageDescription')}</p>
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
            <span className="text-sm text-muted-foreground">{t('settings.safe')}</span>
            <span className="text-sm font-medium">{leverage[0]}x</span>
            <span className="text-sm text-muted-foreground">{t('settings.risky')}</span>
          </div>
        </div>
      </div>
      {/* İşlem Türü */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-0.5 flex-1">
          <Label>{t('settings.tradeType')}</Label>
          
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={tradeType === "ISOLATED" ? "default" : "outline"}
              onClick={() => setTradeType("ISOLATED")}
              className="w-full"
            >
              {t('settings.isolated')}
            </Button>
            <Button
              variant={tradeType === "CROSS" ? "default" : "outline"}
              onClick={() => setTradeType("CROSS")}
              className="w-full"
            >
              {t('settings.cross')}
            </Button>
          </div>
          <Accordion type="single" collapsible className="w-full mt-2">
            <AccordionItem value="trade-type-desc">
              <AccordionTrigger className="text-xs font-semibold text-muted-foreground hover:no-underline py-1">
                Marjin Türü Açıklaması
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground space-y-1 pt-1">
                {t('settings.tradeTypeDescription').split('\n').map((line, idx) => line.trim() === '⸻' ? <hr key={idx} className="my-2" /> : <p key={idx}>{line}</p>)}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
      {/* Kar Al İşlem Ayarları */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-0.5 flex-1">
          <Label>{t('settings.profitTradeSettings')}</Label>
        </div>
        <div className="flex-1 space-y-4">
          <Select value={entryType} onValueChange={setEntryType}>
            <SelectTrigger>
              <SelectValue placeholder={t('settings.selectEntryType')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('settings.closed')}</SelectItem>
              <SelectItem value="percentage">{t('settings.percentage')}</SelectItem>
              <SelectItem value="fixed">{t('settings.fixedAmount')}</SelectItem>
            </SelectContent>
          </Select>
          <Accordion type="single" collapsible className="w-full mt-2">
            <AccordionItem value="profit-desc">
              <AccordionTrigger className="text-xs font-semibold text-muted-foreground hover:no-underline py-1">
                Kar Al Açıklaması
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground space-y-1 pt-1">
                {t('settings.profitTradeSettingsDescription').split('\n').map((line, idx) => line.trim() === '⸻' ? <hr key={idx} className="my-2" /> : <p key={idx}>{line}</p>)}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          {entryType === 'percentage' && (
            <div className="space-y-4 mt-4">
              {Array.from({length: 10}, (_, i) => (
                <div key={`tp${i+1}`} className="flex items-center justify-between gap-2">
                  <Label className="w-20">{t(`settings.tp${i+1}`)}</Label>
                  <div className="flex-1">
                    <Slider
                      value={[multipleTpValues[`tp${i+1}`]]}
                      onValueChange={(newValue) => handleTpSliderChange(`tp${i+1}`, newValue[0])}
                      max={100}
                      min={0}
                      step={1}
                    />
                  </div>
                  <span className="w-12 text-right text-sm font-medium">{multipleTpValues[`tp${i+1}`]}{t('settings.percentSymbol')}</span>
                </div>
              ))}
            </div>
          )}
          {entryType === 'fixed' && (
            <div className="flex items-center justify-between gap-2 mt-4">
              <Label>{t('settings.tpLevel')}</Label>
              <div className="relative flex-1">
                <span className="absolute left-2 top-1/2 transform -translate-y-1/2">{t('settings.percentSymbol')}</span>
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
          )}
          </div>
      </div>
      {/* Stoploss İşlem Ayarları (Eski Zarar Durdur) */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-0.5 flex-1">
          <Label>{t('settings.stoplossTradeSettings')}</Label>
        </div>
        <div className="flex-1 space-y-4">
          <Select value={stopLossType} onValueChange={setStopLossType}>
            <SelectTrigger>
              <SelectValue placeholder={t('settings.selectStopLossStrategy')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('settings.closed')}</SelectItem>
              <SelectItem value="signal">{t('settings.useSignalSL')}</SelectItem>
              <SelectItem value="custom">{t('settings.customStopLoss')}</SelectItem>
            </SelectContent>
          </Select>
          {stopLossType === 'custom' && (
            <div className="mt-2">
              <Label>{t('settings.specificLossPercentage')}</Label>
              <Input
                type="number"
                value={specificLossPercentage}
                onChange={e => setSpecificLossPercentage(e.target.value)}
                min="0"
                max="100"
                step="0.01"
                placeholder="%"
              />
            </div>
          )}
          <Accordion type="single" collapsible className="w-full mt-2">
            <AccordionItem value="sl-desc">
              <AccordionTrigger className="text-xs font-semibold text-muted-foreground hover:no-underline py-1">
                Zarar Durdur Açıklaması
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground space-y-1 pt-1">
                {t('settings.stoplossTradeSettingsDescription').split('\n').map((line, idx) => line.trim() === '⸻' ? <hr key={idx} className="my-2" /> : <p key={idx}>{line}</p>)}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          
        </div>
      </div>
      {/* Zarar Durdur İşlem Ayarları (Yeni Dropdown) */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-0.5 flex-1">
          <Label>{t('settings.stopLossActionSettings')}</Label>
          
        </div>
        <div className="flex-1 space-y-4">
          <Select value={stopLossActionType} onValueChange={setStopLossActionType}>
            <SelectTrigger>
              <SelectValue placeholder={t('settings.selectAction')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('settings.closed')}</SelectItem>
              <SelectItem value="trailStop">{t('settings.trailStopAction')}</SelectItem>
              <SelectItem value="maliyetineCek">{t('settings.costWithdrawAction')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
      </div>
      {/* Maliyetine Çek (Koşullu) */}
      {stopLossActionType === 'maliyetineCek' && (
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-0.5 flex-1">
            <Label>{t('settings.costWithdraw')}</Label>
          </div>
          <div className="flex-1">
            <Select value={breakEvenLevel === 'none' ? 'none' : String(breakEvenLevel)} onValueChange={(val) => { setBreakEvenLevel(val); }}>
              <SelectTrigger>
                <SelectValue placeholder={t('settings.selectLevel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('settings.none')}</SelectItem>
                <SelectItem value="1">{t('settings.tp1')}</SelectItem>
                <SelectItem value="2">{t('settings.tp2')}</SelectItem>
                <SelectItem value="3">{t('settings.tp3')}</SelectItem>
                <SelectItem value="4">{t('settings.tp4')}</SelectItem>
                <SelectItem value="5">{t('settings.tp5')}</SelectItem>
              </SelectContent>
            </Select>
            <Accordion type="single" collapsible className="w-full mt-2">
              <AccordionItem value="cost-desc">
                <AccordionTrigger className="text-xs font-semibold text-muted-foreground hover:no-underline py-1">
                  Maliyetine Çek Açıklaması
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground space-y-1 pt-1">
                  {t('settings.costWithdrawDescription').split('\n').map((line, idx) => line.trim() === '⸻' ? <hr key={idx} className="my-2" /> : <p key={idx}>{line}</p>)}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      )}
      {/* TrailStop (Koşullu) */}
      {stopLossActionType === 'trailStop' && (
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-0.5 flex-1">
            <Label>{t('settings.trailStop')}</Label>
          </div>
          <div className="flex-1">
            <Select value={trailStopLevel === 'none' ? 'none' : String(trailStopLevel)} onValueChange={(val) => setTrailStopLevel(val === 'none' ? 'none' : parseInt(val))}>
              <SelectTrigger>
                <SelectValue placeholder={t('settings.selectLevel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('settings.none')}</SelectItem>
                <SelectItem value="1">{t('settings.tp1')}</SelectItem>
                <SelectItem value="2">{t('settings.tp2')}</SelectItem>
                <SelectItem value="3">{t('settings.tp3')}</SelectItem>
                <SelectItem value="4">{t('settings.tp4')}</SelectItem>
                <SelectItem value="5">{t('settings.tp5')}</SelectItem>
              </SelectContent>
            </Select>
            <Accordion type="single" collapsible className="w-full mt-2">
              <AccordionItem value="trail-desc">
                <AccordionTrigger className="text-xs font-semibold text-muted-foreground hover:no-underline py-1">
                  Trail Stop Açıklaması
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground space-y-1 pt-1">
                  {t('settings.trailStopDescription').split('\n').map((line, idx) => line.trim() === '⸻' ? <hr key={idx} className="my-2" /> : <p key={idx}>{line}</p>)}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      )}
      {/* Maks Emir Miktarı */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-0.5 flex-1">
          <Label>{t('settings.maxOrders')}</Label>
          <p className="text-sm text-muted-foreground">{t('settings.maxOrdersDescription')}</p>
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
      {/* Kaydet Butonu */}
      <div className="flex justify-end mt-6">
        <Button 
          onClick={handleSave} 
          disabled={isLoading}
          className="w-full md:w-auto"
        >
          {isLoading ? t('settings.saving') : t('settings.save')}
        </Button>
      </div>
    </CardContent>
  );
};

export default ApiKeySettingsForm; 