import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Signal, TrendingUp, Users, Percent, Loader2 } from "lucide-react";
import { getChannels, Channel as ApiChannel } from "@/services/api";

import { useLang } from '@/hooks/useLang';

export default function Channels() {
  const { lang } = useLang();
  const { t } = useLang();
  const [channels, setChannels] = useState<ApiChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    // Önbellekten veri kontrolü
    const cacheKey = 'channels_cache';
    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData);
      const now = new Date().getTime();
      if (now - timestamp < 300000) {
        setChannels(data);
        setLoading(false);
        setError(null);
        // Yine de arka planda güncelleme yapılabilir istenirse
        return;
      }
    }
    setLoading(true);
    setError(null);
    try {
      const channelsResponse = await getChannels();
      if (!Array.isArray(channelsResponse)) {
        throw new Error('Kanal verileri beklenen formatta değil');
      }
      setChannels(channelsResponse);
    } catch (err) {
      console.error('Veriler yüklenirken hata:', err);
      setError('Veriler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={fetchData} size="sm">{t('retry')}</Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">{t('signal_channels')}</h1>
        <Link to="/partnership">
          <Button 
            className="ml-8 mt-2 px-6 py-2 bg-primary text-white hover:bg-primary/90 transition"
            style={{ border: 'none', boxShadow: '0 1px 4px 0 #0001' }}
          >
            {t('addYourChannel')}
          </Button>
        </Link>
      </div>

      {/* Sadece onaylı (active == 1) kanalları göster */}
      {channels.filter(channel => channel.active === 1).length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">{t('no_channels_found')}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {channels.filter(channel => channel.active === 1).map((channel) => (
            <Link to={`/channels/${channel.id}`} key={channel.id}>
              <Card className="hover:bg-gray-50 transition-colors border hover:border-primary">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    {channel.room_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 px-3">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-1 text-sm">
                      <Signal className="w-4 h-4 text-muted-foreground" />
                      <span>{channel.signalCount || 0} {t('signals')}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span>{channel.successRate || 0}% {t('success')}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <Percent className="w-4 h-4 text-yellow-500" />
                      <span>{(channel.totalProfit || 0).toFixed(2)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}