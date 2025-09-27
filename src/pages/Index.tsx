import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight, Zap, ShieldCheck, Globe, BarChart3 } from "lucide-react";
import { useLang } from '@/hooks/useLang';

const Index = () => {
  const { t } = useLang();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Hero Section */}
      <header className="bg-background border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Zap className="h-6 w-6 text-primary mr-2" />
            <span className="text-xl font-bold">{t('cryptoSignals')}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost">{t('dashboard')}</Button>
            </Link>
            <Link to="/subscription">
              <Button>{t('subscribeNow')}</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-20 px-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/20 to-transparent" />
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_120%,hsl(var(--primary)/30)_0%,transparent_50%)]" />
          </div>
          
          <div className="container mx-auto max-w-7xl relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6 text-center lg:text-left">
                <div className="inline-block bg-primary/10 text-primary rounded-full px-3 py-1 text-sm font-medium mb-2 animate-fade-in">
                  {t('anasayfa')}
                </div>
                <h1 className="text-4xl md:text-5xl font-bold leading-tight animate-fade-up">
                  {t('anasayfa')}
                </h1>
                <p className="text-xl text-muted-foreground animate-fade-up" style={{ animationDelay: "0.1s" }}>
                  {t('heroDescription')}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-up" style={{ animationDelay: "0.2s" }}>
                  <Link to="/subscription">
                    <Button size="lg" className="w-full sm:w-auto">
                      {t('subscribeNow')}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/dashboard">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto">
                      {t('openDashboard')}
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="hidden lg:block">
                <Card className="dashboard-card relative overflow-hidden animate-fade-in">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
                  <CardContent className="p-2">
                    <img 
                      src="https://app.requestly.io/assets-prod/mock-images/crypto-dashboard.png" 
                      alt="Trading Dashboard Preview" 
                      className="rounded-md shadow-lg w-full h-auto"
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 bg-secondary/20">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">{t('whyChoose')}</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                {t('whyChooseDesc')}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="dashboard-card">
                <CardContent className="pt-6 px-6 pb-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{t('premiumSignals')}</h3>
                  <p className="text-muted-foreground">
                    {t('premiumSignalsDesc')}
                  </p>
                </CardContent>
              </Card>
              
              <Card className="dashboard-card">
                <CardContent className="pt-6 px-6 pb-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{t('secureApiIntegration')}</h3>
                  <p className="text-muted-foreground">
                    {t('secureApiIntegrationDesc')}
                  </p>
                </CardContent>
              </Card>
              
              <Card className="dashboard-card">
                <CardContent className="pt-6 px-6 pb-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{t('performanceAnalytics')}</h3>
                  <p className="text-muted-foreground">
                    {t('performanceAnalyticsDesc')}
                  </p>
                </CardContent>
              </Card>
              
              <Card className="dashboard-card">
                <CardContent className="pt-6 px-6 pb-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Globe className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{t('multiExchangeSupport')}</h3>
                  <p className="text-muted-foreground">
                    {t('multiExchangeSupportDesc')}
                  </p>
                </CardContent>
              </Card>
              
              <Card className="dashboard-card">
                <CardContent className="pt-6 px-6 pb-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary">
                      <path d="M15 14c.2-1 .7-1.7 1.5-2"></path>
                      <path d="M9 14c-.2-1-.7-1.7-1.5-2"></path>
                      <path d="M5 9h14M9.1 9 10 13"></path>
                      <path d="m14.9 9-1 4"></path>
                      <path d="M17.8 14.5a4 4 0 0 1-1.8 2.5 21.1 21.1 0 0 1-8 0 4 4 0 0 1-1.8-2.5 4 4 0 0 1 .9-4.2c.2-.3.6-.8 1.2-1.5a22 22 0 0 1 1.9-1.8c.9-.6 1.9-1 2.8-1s1.9.4 2.8 1a22 22 0 0 1 1.9 1.8c.6.7 1 1.2 1.2 1.5a4 4 0 0 1 .9 4.2Z"></path>
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{t('telegramIntegration')}</h3>
                  <p className="text-muted-foreground">
                    {t('telegramIntegrationDesc')}
                  </p>
                </CardContent>
              </Card>
              
              <Card className="dashboard-card">
                <CardContent className="pt-6 px-6 pb-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary">
                      <path d="M12 8V7"></path>
                      <path d="M12 16v-5"></path>
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M12 17h.01"></path>
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{t('support247')}</h3>
                  <p className="text-muted-foreground">
                    {t('support247Desc')}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50" />
          <div className="container mx-auto max-w-7xl relative z-10">
            <div className="glass-card p-12 text-center">
              <h2 className="text-3xl font-bold mb-4">{t('readyToStart')}</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                {t('readyToStartDesc')}
              </p>
              <Link to="/subscription">
                <Button size="lg" className="px-8">
                  {t('getStartedNow')}
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-background border-t border-border/50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <Zap className="h-5 w-5 text-primary mr-2" />
              <span className="font-bold">{t('cryptoSignals')}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} {t('cryptoSignals')}. {t('allRightsReserved')}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
