import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { getUserByTelegramId, getApiKeys, updateApiKey, ApiKey, getApiKeyById, getChannels } from '@/services/api';
import { useToast } from "@/components/ui/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Copy } from "lucide-react";
import { useQueryClient } from '@tanstack/react-query';
import { useLang } from '@/hooks/useLang';

export default function ApiKeyEdit() {
  const { t } = useLang();
  const [formData, setFormData] = useState({
    api_type: 1,
    api_name: '',
    api_key: '',
    api_secret: '',
    bot_room: '',
    enrolled_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const queryClient = useQueryClient();
  const [channelOptions, setChannelOptions] = useState<any[]>([]);
  const [channelLoading, setChannelLoading] = useState(false);
  const [enrolledOptions, setEnrolledOptions] = useState<any[]>([]);
  const [enrolledLoading, setEnrolledLoading] = useState(false);
  
  // Load API key data
  useEffect(() => {
    const fetchApiKeyData = async () => {
      setInitialLoading(true);
      setError(null);
      try {
        if (!id) throw new Error(t('apiKeyIdNotFound'));
        const apiKey = await getApiKeyById(Number(id));
        if (!apiKey) {
          throw new Error(t('apiKeyNotFound'));
        }
        setFormData({
          api_type: apiKey.api_type || 1,
          api_name: apiKey.api_name,
          api_key: apiKey.api_key,
          api_secret: apiKey.api_secret,
          bot_room: String(apiKey.bot_room || ''),
          enrolled_id: (apiKey as any).enrolled_id || '',
        });
      } catch (err: any) {
        console.error(t('apiKeyLoadError'), err);
        setError(err.message || t('apiKeyLoadErrorText'));
        toast({ title: t('error'), description: err.message || t('apiKeyLoadErrorText'), variant: "destructive" });
      } finally {
        setInitialLoading(false);
      }
    };
    fetchApiKeyData();
  }, [id, toast, t]);

  useEffect(() => {
    // Tüm kanalları component mount'ta çek
    setChannelLoading(true);
    getChannels().then((channels) => {
      setChannelOptions(channels);
    }).finally(() => setChannelLoading(false));
  }, []);

  useEffect(() => {
    // Kullanıcıya ait uygun abonelikleri getir (başka API'ye atanmış olmayanlar)
    const telegramId = sessionStorage.getItem('telegramId');
    if (!telegramId) return;
    setEnrolledLoading(true);
    getUserByTelegramId(telegramId).then(user => {
      if (!user) return;
      fetch(`/api/enrolled-users/${user.id}`)
        .then(r => r.json())
        .then((enrolleds) => {
          // Sadece başka API'ye atanmış olmayanları göster
          Promise.all(enrolleds.map(async (e: any) => {
            const res = await fetch(`/api/keys/enrollment/${e.id}`);
            const apis = await res.json();
            return apis.length === 0 || e.id === formData.enrolled_id ? e : null;
          })).then(results => {
            setEnrolledOptions(results.filter(Boolean));
          });
        })
        .finally(() => setEnrolledLoading(false));
    });
  }, [formData.enrolled_id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'api_type' ? Number(value) : value }));
  };

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text)
      .then(() => toast({ title: t('copied'), description: t('copiedToClipboard', { field: fieldName }) }))
      .catch(() => toast({ title: t('error'), description: t('copyError'), variant: "destructive" }));
  };

  const handleSave = async () => {
    // Validation
    if (!formData.api_name.trim() || !formData.api_key.trim() || !formData.api_secret.trim()) {
      toast({ title: t('error'), description: t('fillAllFields'), variant: "destructive" });
      return;
    }
    if (!formData.enrolled_id) {
      toast({ title: t('error'), description: 'Lütfen bir abonelik paketi seçiniz.', variant: "destructive" });
      return;
    }
    if (formData.bot_room) {
      const telegramId = sessionStorage.getItem('telegramId');
      if (!telegramId) {
        toast({ title: t('error'), description: t('sessionNotFound'), variant: "destructive" });
        return;
      }
      try {
        const resp = await fetch('/api/channels/check-member', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegramUserId: telegramId, channelId: formData.bot_room })
        });
        const data = await resp.json();
        if (!data.ok) {
          if (data.error && data.error.includes('Kullanıcı abone değil veya erişim yok.')) {
            toast({ title: t('error'), description: 'Bu kanal için üyelik kontrolü yapılamıyor. Lütfen botun kanalda yönetici olduğundan ve kanalın herkese açık olduğundan emin olun.', variant: "destructive" });
            return;
          }
          toast({ title: t('error'), description: 'Bu kanalın abonesi değilsiniz, bu kanala API ekleyemezsiniz.', variant: "destructive" });
          return;
        }
      } catch (err) {
        toast({ title: t('error'), description: 'Kanal üyeliği kontrolü sırasında hata oluştu.', variant: "destructive" });
        return;
      }
    }

    setLoading(true);
    try {
      const telegramId = sessionStorage.getItem('telegramId');
      if (!telegramId) {
        throw new Error(t('sessionNotFound'));
      }
      const user = await getUserByTelegramId(telegramId);
      if (!user) {
        throw new Error(t('userNotFound'));
      }
      // Update API key (yeni alanlarla)
      await updateApiKey(Number(id), user.id, formData.api_name, formData.api_key, formData.api_secret, formData.api_type, formData.bot_room, formData.enrolled_id);
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast({ title: t('success'), description: t('apiKeyUpdated', { name: formData.api_name }) });
      navigate('/api-keys');
    } catch (err: any) {
      console.error(t('apiKeyUpdateError'), err);
      toast({ title: t('error'), description: err.message || t('apiKeyUpdateErrorText'), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="py-2 max-w-full">
        <div className="flex justify-center items-center h-[50vh]">
          {t('loading')}...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-2 max-w-full">
        <div className="mb-4 px-2">
          <Button 
            variant="outline" 
            size="sm"
            className="gap-1 h-8 text-xs" 
            onClick={() => navigate('/api-keys')}
          >
            <ArrowLeft size={14} /> {t('goBack')}
          </Button>
        </div>
        <Card className="mx-0 border-x-0 rounded-none">
          <CardContent className="p-3 text-center text-red-500">
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-2 max-w-full">
      <div className="mb-4 px-2">
        <Button 
          variant="outline" 
          size="sm"
          className="gap-1 h-8 text-xs" 
          onClick={() => navigate('/api-keys')}
        >
          <ArrowLeft size={14} /> {t('goBack')}
        </Button>
      </div>

      <Card className="mx-0 border-x-0 rounded-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t('editApiKey')}</CardTitle>
          <CardDescription className="text-xs">
            {t('editApiKeyDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-3 pb-2">
          <div className="space-y-2">
            <Label htmlFor="api_type" className="text-xs">{t('exchangeType')} <span className="text-destructive">*</span></Label>
            <select
              id="api_type"
              name="api_type"
              value={formData.api_type}
              onChange={handleInputChange}
              className="text-xs h-8 w-full border rounded px-2 focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value={1}>Binance</option>
              <option value={2}>Bybit</option>
              <option value={3}>BingX</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="api_name" className="text-xs">{t('name')} <span className="text-destructive">*</span></Label>
            <Input 
              id="api_name" 
              name="api_name" 
              placeholder={t('apiKeyNamePlaceholder')} 
              value={formData.api_name} 
              onChange={handleInputChange}
              className="text-xs h-8"
              required
            />
            <p className="text-xs text-muted-foreground">{t('apiKeyNameDesc')}</p>
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="api_key" className="text-xs text-muted-foreground">API Key <span className="text-destructive">*</span></Label>
           
              <Input 
                id="api_key" 
                name="api_key" 
                value={formData.api_key} 
                onChange={handleInputChange}
                className="text-xs h-8"
                placeholder={t('apiKeyPlaceholder')}
                required
              />
          
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="api_secret" className="text-xs text-muted-foreground">API Secret <span className="text-destructive">*</span></Label>
           
              <Input 
                id="api_secret" 
                name="api_secret" 
                type="password"
                value={formData.api_secret} 
                onChange={handleInputChange}
                className="text-xs h-8"
                placeholder={t('apiSecretPlaceholder')}
                required
              />
           
            <p className="text-xs text-muted-foreground">{t('apiSecretDesc')}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">{t('signalChannel')}</Label>
            <select
              className="text-xs h-8 w-full border rounded px-2"
              value={formData.bot_room}
              onChange={e => setFormData(prev => ({ ...prev, bot_room: e.target.value }))}
              disabled={channelLoading}
            >
              <option value="">{channelLoading ? t('loading') : t('select')}</option>
              {channelOptions.map((c: any) => (
                <option key={c.room_id} value={c.room_id}>
                  {c.room_name} ({c.room_id})
                </option>
              ))}
            </select>
            {formData.bot_room && (
              <div className="mt-1 text-xs text-green-700">{t('selectedChannel')}: {channelOptions.find((c: any) => String(c.room_id) === String(formData.bot_room))?.room_name} ({formData.bot_room})</div>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-xs">{t('subscriptionPackage')}</Label>
            <select
              className="text-xs h-8 w-full border rounded px-2"
              value={formData.enrolled_id}
              onChange={e => setFormData(prev => ({ ...prev, enrolled_id: e.target.value }))}
            >
              <option value="">{t('select')}</option>
              {enrolledLoading && <option>{t('loading')}...</option>}
              {enrolledOptions.map((e: any) => (
                <option key={e.id} value={e.id}>
                  {e.package_name} ({new Date(e.start_date).toLocaleDateString('tr-TR')} - {new Date(e.end_date).toLocaleDateString('tr-TR')})
                </option>
              ))}
            </select>
            <div className="text-xs text-yellow-700 mt-1">
              Abonelik satın almadan api eklenmemektedir. Lütfen önce abonelik işleminizi tamamlayın. Yardım veya destek için: <a href="https://t.me/OrcaTradeBot_Destek" target="_blank" rel="noopener noreferrer" className="underline">@OrcaTradeBot_Destek</a>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 p-2">
          <Button variant="ghost" className="text-xs h-8" onClick={() => navigate('/api-keys')}>{t('cancel')}</Button>
          <Button className="text-xs h-8" onClick={handleSave} disabled={loading || enrolledOptions.length === 0}>
            {loading ? t('saving') : t('save')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 