import { useEffect, useState } from 'react';
import { getApiKeyById, updateApiKeySettings } from "@/services/api";
import { toast } from "sonner";

export function useApiKeySettingsState(apiId: string | null, t: any, apiData: any, setApiData: (data: any) => void, navigate: any) {
  const [autoTrade, setAutoTrade] = useState(false);
  const [leverage, setLeverage] = useState([20]);
  const [entryAmount, setEntryAmount] = useState<string>("100");
  const [apiKeyName, setApiKeyName] = useState(t('settings.title'));
  const [tradeType, setTradeType] = useState("ISOLATED");
  const [entryType, setEntryType] = useState("percentage");
  const [singleTpValue, setSingleTpValue] = useState("50");
  const [stopLossType, setStopLossType] = useState("signal");
  const [customStopLoss, setCustomStopLoss] = useState("10");
  const [breakEvenLevel, setBreakEvenLevel] = useState("none");
  const [trailStopLevel, setTrailStopLevel] = useState("none");
  const [maxOrders, setMaxOrders] = useState("10");
  const [stopLossActionType, setStopLossActionType] = useState("none");
  const [specificLossPercentage, setSpecificLossPercentage] = useState("10");
  const [multipleTpValues, setMultipleTpValues] = useState({
    tp1: 20, tp2: 20, tp3: 20, tp4: 20, tp5: 20, tp6: 20, tp7: 20, tp8: 20, tp9: 20, tp10: 20
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadApiDetails = async () => {
      if (!apiId) {
        setApiKeyName(t('settings.missingApiId'));
        return;
      }
      try {
        const parsedApiId = parseInt(apiId, 10);
        if (isNaN(parsedApiId)) {
          setApiKeyName(t('settings.invalidId'));
          return;
        }
        const apiKey = await getApiKeyById(parsedApiId);
        if (apiKey) {
          setApiData(apiKey);
          setApiKeyName(apiKey.api_name || `API ID: ${apiKey.id}`);
          setAutoTrade(apiKey.auto_trade === 1);
          setLeverage([typeof apiKey.leverage === 'string' ? parseInt(apiKey.leverage) : apiKey.leverage || 20]);
          setEntryAmount(apiKey.lotsize || "100");
          setTradeType(apiKey.margin_type || "ISOLATED");
          setMaxOrders(apiKey.max_orders ? apiKey.max_orders.toString() : "10");
          if (apiKey.take_profit === 'custom') {
            setEntryType('fixed');
            setSingleTpValue(apiKey.percent_profit ? apiKey.percent_profit.toString() : "50");
          } else if (apiKey.take_profit === 'signal') {
            setEntryType('percentage');
          } else if (apiKey.take_profit === 'none') {
            setEntryType('none');
          } else {
            let hasTP = false;
            for (let i = 1; i <= 10; i++) {
              const tpValue = apiKey[`tp${i}`];
              if (tpValue && parseFloat(tpValue) > 0) {
                hasTP = true;
                break;
              }
            }
            setEntryType(hasTP ? 'percentage' : 'none');
          }
          if (apiKey.stop_loss_settings) {
            setStopLossType(apiKey.stop_loss_settings);
          } else {
            setStopLossType(apiKey.stop_loss === 1 ? "custom" : "none");
          }
          setCustomStopLoss(apiKey.percent_loss ? apiKey.percent_loss.toString() : "10");
          setSpecificLossPercentage(apiKey.percent_loss ? apiKey.percent_loss.toString() : "10");
          // TrailStop ve BreakEven state'lerini doğru ata
          setTrailStopLevel(apiKey.trail_stop !== undefined && apiKey.trail_stop !== null ? String(apiKey.trail_stop) : 'none');
          setBreakEvenLevel(apiKey.break_even_level || 'none');
          // Zarar Durdur Aksiyon Ayarları mantığı (öncelik: trail_stop > 0, sonra break_even_level > 0)
          if (apiKey.trail_stop && Number(apiKey.trail_stop) > 0) {
            setStopLossActionType("trailStop");
          } else if (apiKey.break_even_level && Number(apiKey.break_even_level) > 0) {
            setStopLossActionType("maliyetineCek");
          } else {
            setStopLossActionType("none");
          }
          setMultipleTpValues({
            tp1: typeof apiKey.tp1 === 'string' ? parseInt(apiKey.tp1) : apiKey.tp1 || 20,
            tp2: typeof apiKey.tp2 === 'string' ? parseInt(apiKey.tp2) : apiKey.tp2 || 20,
            tp3: typeof apiKey.tp3 === 'string' ? parseInt(apiKey.tp3) : apiKey.tp3 || 20,
            tp4: typeof apiKey.tp4 === 'string' ? parseInt(apiKey.tp4) : apiKey.tp4 || 20,
            tp5: typeof apiKey.tp5 === 'string' ? parseInt(apiKey.tp5) : apiKey.tp5 || 20,
            tp6: typeof apiKey.tp6 === 'string' ? parseInt(apiKey.tp6) : apiKey.tp6 || 20,
            tp7: typeof apiKey.tp7 === 'string' ? parseInt(apiKey.tp7) : apiKey.tp7 || 20,
            tp8: typeof apiKey.tp8 === 'string' ? parseInt(apiKey.tp8) : apiKey.tp8 || 20,
            tp9: typeof apiKey.tp9 === 'string' ? parseInt(apiKey.tp9) : apiKey.tp9 || 20,
            tp10: typeof apiKey.tp10 === 'string' ? parseInt(apiKey.tp10) : apiKey.tp10 || 20
          });
        } else {
          setApiKeyName(t('settings.apiNotFound'));
        }
      } catch (error) {
        setApiKeyName(t('settings.loadingError'));
      }
    };
    loadApiDetails();
  }, [apiId]);

  const handleSave = async () => {
    if (!apiId) {
      toast("Hata: API anahtarı ID bulunamadı.");
      return;
    }
    setIsLoading(true);
    try {
      const parsedApiId = parseInt(apiId, 10);
      const settingsToUpdate: Record<string, any> = {
        auto_trade: autoTrade ? 1 : 0,
        lotsize: entryAmount,
        leverage: leverage[0],
        margin_type: tradeType === 'CROSS' ? 'CROSSED' : tradeType,
        max_orders: Number(maxOrders),
        take_profit: entryType === 'none' ? 'none' : entryType === 'fixed' ? 'custom' : 'signal',
        tp1: multipleTpValues.tp1,
        tp2: multipleTpValues.tp2,
        tp3: multipleTpValues.tp3,
        tp4: multipleTpValues.tp4,
        tp5: multipleTpValues.tp5,
        tp6: multipleTpValues.tp6,
        tp7: multipleTpValues.tp7,
        tp8: multipleTpValues.tp8,
        tp9: multipleTpValues.tp9,
        tp10: multipleTpValues.tp10,
        stop_loss: stopLossType === 'custom' ? 1 : 0,
        stop_loss_settings: stopLossType === 'custom' ? 'custom' : stopLossType === 'signal' ? 'signal' : 'none',
        sl_tp_order: stopLossActionType === 'sl_tp' ? 1 : 0,
        break_even: stopLossActionType === 'maliyetineCek' ? 1 : 0,
        bot_room: apiData?.bot_room || 0
      };
      if (stopLossType === 'custom') {
        // The form input is bound to specificLossPercentage; persist that value.
        settingsToUpdate.percent_loss = specificLossPercentage;
      } else {
        settingsToUpdate.percent_loss = null;
      }
      if (entryType === 'fixed') {
        settingsToUpdate.percent_profit = singleTpValue;
      } else {
        settingsToUpdate.percent_profit = null;
      }
      // Zarar Durdur Aksiyon Ayarları mantığı
      if (stopLossActionType === 'none') {
        settingsToUpdate.trail_stop = 0;
        settingsToUpdate.break_even_level = 0;
      } else if (stopLossActionType === 'trailStop') {
        settingsToUpdate.trail_stop = trailStopLevel === 'none' ? 0 : trailStopLevel;
        settingsToUpdate.break_even_level = 0;
      } else if (stopLossActionType === 'maliyetineCek') {
        settingsToUpdate.trail_stop = 0;
        console.log('handleSave breakEvenLevel:', breakEvenLevel);
        settingsToUpdate.break_even_level = breakEvenLevel === 'none' ? 0 : parseInt(breakEvenLevel);
      }
      // break_even alanını gönderme
      if (settingsToUpdate.break_even !== undefined) delete settingsToUpdate.break_even;
      await updateApiKeySettings(parsedApiId, settingsToUpdate);
      toast("Ayarlar başarıyla kaydedildi.", { position: 'top-center' });
    } catch (error: any) {
      console.error("Ayarlar kaydedilirken hata:", error);
      toast("Ayarlar kaydedilirken hata: " + (error.message || error), { position: 'top-center' });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    autoTrade, setAutoTrade, leverage, setLeverage, entryAmount, setEntryAmount, apiKeyName, setApiKeyName, tradeType, setTradeType, entryType, setEntryType, singleTpValue, setSingleTpValue, stopLossType, setStopLossType, customStopLoss, setCustomStopLoss, breakEvenLevel, setBreakEvenLevel, trailStopLevel, setTrailStopLevel, maxOrders, setMaxOrders, stopLossActionType, setStopLossActionType, specificLossPercentage, setSpecificLossPercentage, multipleTpValues, setMultipleTpValues, isLoading, setIsLoading, handleSave
  };
}