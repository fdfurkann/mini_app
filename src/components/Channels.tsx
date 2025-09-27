import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Check, Plus, Search, X } from "lucide-react";
import { Input } from "./ui/input";

import { useLang } from '@/hooks/useLang';

interface Channel {
  id: string;
  name: string;
  description: string;
  subscribers: number;
  successRate: number;
  monthlySignals: number;
  isSubscribed: boolean;
  price: number;
  currency: string;
}

const Channels: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [channels, setChannels] = useState<Channel[]>([
    {
      id: "1",
      name: "Crypto Signals Pro",
      description: "Profesyonel kripto sinyal kanalı. Yüksek başarı oranı ve detaylı analizler.",
      subscribers: 12500,
      successRate: 92,
      monthlySignals: 45,
      isSubscribed: true,
      price: 99,
      currency: "USDT"
    },
    {
      id: "2",
      name: "Bitcoin Masters",
      description: "Bitcoin ve altcoin sinyalleri. Günlük market analizleri.",
      subscribers: 8500,
      successRate: 88,
      monthlySignals: 30,
      isSubscribed: false,
      price: 79,
      currency: "USDT"
    },
    {
      id: "3",
      name: "Altcoin Hunters",
      description: "Altcoin odaklı sinyal kanalı. Erken giriş fırsatları.",
      subscribers: 6500,
      successRate: 85,
      monthlySignals: 25,
      isSubscribed: false,
      price: 69,
      currency: "USDT"
    }
  ]);

  const { lang } = useLang();
  const { t } = useLang();

  const handleSubscribe = (channelId: string) => {
    setChannels(channels.map(channel => 
      channel.id === channelId ? { ...channel, isSubscribed: true } : channel
    ));
  };

  const handleUnsubscribe = (channelId: string) => {
    setChannels(channels.map(channel => 
      channel.id === channelId ? { ...channel, isSubscribed: false } : channel
    ));
  };

  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    channel.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('channels')}</h1>
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('search_placeholder')}
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredChannels.map((channel) => (
          <Card key={channel.id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{channel.name}</CardTitle>
                <Badge variant={channel.isSubscribed ? "default" : "secondary"}>
                  {channel.isSubscribed ? t('subscribed') : t('not_subscribed')}
                </Badge>
              </div>
              <CardDescription>{channel.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t('subscribers')}</p>
                    <p className="font-medium">{channel.subscribers.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('success_rate')}</p>
                    <p className="font-medium">{channel.successRate}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('monthly_signals')}</p>
                    <p className="font-medium">{channel.monthlySignals}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('price')}</p>
                    <p className="font-medium">{channel.price} {channel.currency}</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  {channel.isSubscribed ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnsubscribe(channel.id)}
                    >
                      <X className="mr-2 h-4 w-4" />
                      {t('unsubscribe')}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleSubscribe(channel.id)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {t('subscribe')}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Channels; 