import React, { useEffect, useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Trash2, Edit, Copy, Plus, Eye, EyeOff, Settings } from "lucide-react";
import { getUserByTelegramId, getApiKeys, deleteApiKey, ApiKey, User } from '@/services/api';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLang } from '@/hooks/useLang';

const API_KEYS_CACHE_KEY = 'api-keys';
const USER_CACHE_KEY = 'user';

const obfuscateKey = (key: string, visibleChars: number = 4): string => {
  if (!key || key.length <= visibleChars * 2) return key;
  const displayKey = key.length > 40 ? key.substring(0, 40) + '...' : key;
  return `${displayKey.substring(0, visibleChars)}\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022${displayKey.substring(displayKey.length - visibleChars)}`;
};

const getApiTypeLabel = (type?: number) => {
  if (type === 1) return 'Binance';
  if (type === 2) return 'Bybit';
  if (type === 3) return 'BingX';
  return '';
};

export default function ApiKeySettingsList() {
  const [showKeysMap, setShowKeysMap] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { lang } = useLang();
  const { t } = useLang();

  const { data: user } = useQuery<User | null>({
    queryKey: [USER_CACHE_KEY],
    queryFn: async () => {
      const telegramId = sessionStorage.getItem('telegramId');
      if (!telegramId) throw new Error(t('sessionNotFound'));
      return getUserByTelegramId(telegramId);
    },
    staleTime: 0,
    gcTime: 0
  });

  const { data: apiKeys = [], isLoading, error } = useQuery<ApiKey[]>({
    queryKey: [API_KEYS_CACHE_KEY, user?.id],
    queryFn: () => user?.id ? getApiKeys(user.id) : Promise.resolve([]),
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 0
  });

  const handleDelete = async (apiId: number) => {
    if (!window.confirm(t('deleteApiKeyConfirm'))) return;
    if (!user?.id) return;
    try {
      await deleteApiKey(user.id, apiId);
      queryClient.invalidateQueries({ queryKey: [API_KEYS_CACHE_KEY, user.id] });
      toast({ title: t('success'), description: t('apiKeyDeleted') });
    } catch (err: any) {
      console.error('Error deleting API key:', err);
      toast({ title: t('error'), description: err.message || t('apiKeyDeleteError'), variant: "destructive" });
    }
  };

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast({ title: t('copied'), description: t('copiedToClipboard', { field: fieldName }) }))
      .catch(() => toast({ title: t('error'), description: t('copyError'), variant: "destructive" }));
  };

  const toggleVisibility = (apiKeyId: number, field: 'key' | 'secret') => {
    const mapKey = `${field}_${apiKeyId}`;
    setShowKeysMap(prev => ({ ...prev, [mapKey]: !prev[mapKey] }));
  };

  if (isLoading) return <div className="p-2">{t('loading')}...</div>;
  if (error) return <div className="p-2 text-red-500">{t('error')}: {(error as Error).message}</div>;

  return (
    <div className="py-2 space-y-4">
      <div className="flex justify-between items-center px-2">
        <h1 className="text-xl font-semibold">API Ayarları</h1>
      </div>
      {apiKeys.length === 0 ? (
         <Card>
            <CardContent className="pt-4 text-center text-muted-foreground text-sm">
              {t('noApiKey')}
            </CardContent>
         </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {apiKeys.map((api) => (
            <Card key={api.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-base font-medium truncate" title={api.api_name}>
                  {api.api_name}
                  {getApiTypeLabel(api.api_type) && (
                    <span className="text-xs text-muted-foreground font-normal"> ({getApiTypeLabel(api.api_type)})</span>
                  )}
                </CardTitle>
                <div className="flex items-center space-x-1">
                   <Button variant="outline" size="sm" onClick={() => navigate(`/api-keys/settings?id=${api.id}`)}>
                      Ayarla
                    </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="space-y-1">
                   <Label className="text-xs text-muted-foreground">API Key</Label>
                   <div className="flex items-center gap-2">
                      <div className="font-mono text-xs overflow-x-auto w-full whitespace-nowrap scrollbar-none"
                           style={{overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none'}}
                           title={api.api_key}>
                        {showKeysMap[`key_${api.id}`] ?
                          (api.api_key.length > 40 ? api.api_key.substring(0, 40) + '...' : api.api_key)
                          : obfuscateKey(api.api_key)}
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => toggleVisibility(api.id, 'key')}>
                        {showKeysMap[`key_${api.id}`] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => handleCopy(api.api_key, 'API Key')}>
                        <Copy size={14} />
                      </Button>
                    </div>
                 </div>
                 <div className="space-y-1">
                   <Label className="text-xs text-muted-foreground">API Secret</Label>
                   <div className="flex items-center gap-2">
                     <div className="font-mono text-xs overflow-x-auto w-full whitespace-nowrap scrollbar-none"
                          style={{overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none'}}
                          title={api.api_secret}>
                        {showKeysMap[`secret_${api.id}`] ?
                          (api.api_secret.length > 40 ? api.api_secret.substring(0, 40) + '...' : api.api_secret)
                          : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                     </div>
                     <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => toggleVisibility(api.id, 'secret')}>
                        {showKeysMap[`secret_${api.id}`] ? <EyeOff size={14} /> : <Eye size={14} />}
                     </Button>
                     <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => handleCopy(api.api_secret, 'API Secret')}>
                        <Copy size={14} />
                      </Button>
                   </div>
                 </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 