import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

import { cn } from '@/lib/utils';
import { useLang } from '@/hooks/useLang';

interface EnrollmentWithApi {
  id: number;
  plan_name: string;
  start_date: string;
  end_date: string;
  status: string;
  description?: string;
  price?: number;
  package_api_rights?: number;
  apiKeys?: Array<{
    id: number;
    api_name: string;
    api_key: string;
  }>;
}

const SubscriptionManager: React.FC = () => {
  const [enrolledUsers, setEnrolledUsers] = useState<EnrollmentWithApi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { lang } = useLang();
  const { t } = useLang();
  const [packages, setPackages] = useState<any[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const telegramId = sessionStorage.getItem("telegramId");
        console.log('Checking admin status with telegramId:', telegramId);
        
        if (!telegramId) {
          console.log('No telegram ID found in session');
          return;
        }

        const response = await fetch(`/api/check-admin?id=${telegramId}`);
        console.log('Admin check response:', response);
        
        if (!response.ok) {
          throw new Error('Admin kontrolü başarısız');
        }
        
        const data = await response.json();
        console.log('Admin check data:', data);
        
        setShowAdminLogin(data.isAdmin);
        console.log('showAdminLogin set to:', data.isAdmin);
      } catch (error) {
        console.error('Admin kontrolü hatası:', error);
      }
    };

    checkAdminStatus();
  }, []);

  const handleAdminLogin = async () => {
    try {
      const telegramId = sessionStorage.getItem("telegramId");
      const response = await fetch('/api/admin-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: telegramId,
          password: adminPassword
        }),
      });

      if (!response.ok) throw new Error('Giriş başarısız');
      
      const data = await response.json();
      if (data.success) {
        setIsAdmin(true);
        setShowPasswordInput(false);
        sessionStorage.setItem("isAdmin", "true");
        toast({
          title: "Başarılı",
          description: "Admin girişi başarılı",
        });
      } else {
        toast({
          title: "Hata",
          description: "Şifre yanlış",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: "Giriş yapılamadı",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    const fetchUserSubscriptions = async () => {
      try {
        setIsLoading(true);
        const telegramId = sessionStorage.getItem("telegramId");
        
        if (!telegramId) {
          console.error('Telegram ID not found in session');
          return;
        }

        const userResponse = await fetch(`/api/users/${telegramId}`);
        if (!userResponse.ok) {
          throw new Error('Kullanıcı bilgisi alınamadı');
        }
        const userData = await userResponse.json();

        const enrolledResponse = await fetch(`/api/enrolled-users/${userData.id}`);
        if (!enrolledResponse.ok) {
          throw new Error('Abonelik bilgileri alınamadı');
        }
        const enrolledData = await enrolledResponse.json();
        
        const enrichedData = await Promise.all(
          enrolledData.map(async (enrollment: EnrollmentWithApi) => {
            const apiResponse = await fetch(`/api/keys/enrollment/${enrollment.id}`);
            if (apiResponse.ok) {
              const apiKeys = await apiResponse.json();
              return { ...enrollment, apiKeys };
            }
            return enrollment;
          })
        );

        setEnrolledUsers(enrichedData);
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
        toast({
          title: "Hata",
          description: "Abonelik bilgileri yüklenirken bir hata oluştu.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserSubscriptions();
  }, [toast]);

  useEffect(() => {
    const fetchPackages = async () => {
      setLoadingPackages(true);
      try {
        const res = await fetch('/api/subscription-packages');
        const data = await res.json();
        setPackages(data.packages || []);
      } catch (e) {
        setPackages([]);
      } finally {
        setLoadingPackages(false);
      }
    };
    fetchPackages();
  }, []);

  const isSubscriptionActive = (endDate: string) => {
    return new Date(endDate) > new Date();
  };

  // Premium paketlere scroll fonksiyonu
  const scrollToPremium = () => {
    const premiumCard = document.querySelector('.bg-yellow-50');
    if (premiumCard) {
      premiumCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleUpgradeSubscription = () => {
    const url = getTelegramSupportUrl({ name: 'Premium paket', period: 'Premium paket satın almak istiyorum' });
    window.open(url, '_blank');
  };

  // Telegram destek linki oluşturucu
  const getTelegramSupportUrl = (plan: { name: string, period: string }) => {
    // Süreyi daha okunur hale getir
    let periodText = plan.period;
    if (periodText === t('month')) periodText = '1 ay';
    else if (periodText === t('threeMonths')) periodText = '3 ay';
    else if (periodText === t('sixMonths')) periodText = '6 ay';
    else if (periodText === t('year')) periodText = '12 ay';
    const message = encodeURIComponent(`Merhaba, ben ${plan.name} (${periodText}) satın almak istiyorum.`);
    return `https://t.me/OrcaTradeBot_Destek?start&text=${message}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enrolled Users List */}
      <Card className="border border-primary/30">
        <CardHeader>
          <CardTitle>{t('subscriptionHistory')}</CardTitle>
          <CardDescription>{t('allActiveAndPastSubscriptions')}</CardDescription>
        </CardHeader>
        <CardContent>
          {enrolledUsers.length > 0 ? (
            <div className="space-y-4">
              {enrolledUsers.map((enrollment) => {
                const isActive = isSubscriptionActive(enrollment.end_date);
                const hasApi = enrollment.apiKeys && enrollment.apiKeys.length > 0;
                return (
                  <div key={enrollment.id} className="flex flex-col p-4 bg-secondary/20 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1">
                            <div className="text-lg font-medium">
                              {hasApi
                                ? <>
                                    {enrollment.apiKeys[0]?.api_name}
                                    {enrollment.package_api_rights === 1 && (
                                      <span className="text-xs text-primary ml-2">(premium)</span>
                                    )}
                                  </>
                                : <span className="text-destructive">Tanımlı API yok</span>}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {enrollment.plan_name}
                            </div>
                          </div>
                          <Badge variant={isActive ? 'default' : 'secondary'}>
                            {isActive ? t('active') : t('ended')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {t('start')}: {new Date(enrollment.start_date).toLocaleDateString('tr-TR')}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {t('end')}: {new Date(enrollment.end_date).toLocaleDateString('tr-TR')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t('noSubscriptionFound')}</p>
              <Button onClick={handleUpgradeSubscription} className="mt-4">
                {t('upgradeToPremium')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {loadingPackages ? (
          <div className="col-span-4 text-center">Yükleniyor...</div>
        ) : (
          packages.flatMap((pkg, idx) => [
            // Normal paket kartı
            <Card key={pkg.id + '-normal'} className="border border-border hover:border-primary/30 transition-all">
              <CardHeader>
                <CardTitle>{pkg.package_name}</CardTitle>
                <CardDescription>{pkg.package_description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold">{pkg.package_price}<span className="text-sm font-normal text-muted-foreground"> USDT</span></div>
                <Separator />
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center"><ChevronRight className="h-4 h-4 mr-2 text-primary" />Tüm sinyallere erişim</li>
                  <li className="flex items-center"><ChevronRight className="h-4 h-4 mr-2 text-primary" />Manuel trade</li>
                  <li className="flex items-center"><ChevronRight className="h-4 h-4 mr-2 text-primary" />Standart destek</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => window.open(getTelegramSupportUrl({ name: pkg.package_name, period: pkg.package_date + ' gün' }), '_blank')}>
                  {t('selectPlan')}
                </Button>
              </CardFooter>
            </Card>,
            // Premium paket kartı
            <Card key={pkg.id + '-premium'} className="border border-primary/60 shadow-lg bg-yellow-50">
              <CardHeader>
                <CardTitle>{pkg.package_name} Premium</CardTitle>
                <CardDescription>{pkg.package_description} (Premium)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold text-yellow-700">{pkg.premium_price || 0}<span className="text-sm font-normal text-muted-foreground"> USDT</span></div>
                <Separator />
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center"><ChevronRight className="h-4 h-4 mr-2 text-primary" />Tüm sinyallere erişim</li>
                  <li className="flex items-center"><ChevronRight className="h-4 h-4 mr-2 text-primary" />Manuel trade</li>
                  <li className="flex items-center"><ChevronRight className="h-4 h-4 mr-2 text-primary" />Standart destek</li>
                  <li className="flex items-center"><ChevronRight className="h-4 h-4 mr-2 text-primary" />Backtest yapabilme</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold shadow-md border-2 border-yellow-400"
                  style={{ boxShadow: '0 2px 8px 0 rgba(251, 191, 36, 0.25)' }}
                  onClick={() => window.open(getTelegramSupportUrl({ name: pkg.package_name + ' Premium', period: pkg.package_date + ' gün' }), '_blank')}
                >
                  {t('selectPlan')}
                </Button>
              </CardFooter>
            </Card>
          ])
        )}
      </div>
    </div>
  );
};

export default SubscriptionManager;
