import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LangProvider, useLang } from '@/hooks/useLang';

// Layout
import Layout from "@/components/Layout";
import { Positions, OpenOrders, PositionHistory, OrderHistory } from './pages/admin/Positions';

// Lazy loaded pages
const Index = lazy(() => import("./pages/Index"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ApiKeys = lazy(() => import("./pages/ApiKeys"));
const ApiKeyNew = lazy(() => import("./pages/ApiKeyNew"));
const ApiKeyEdit = lazy(() => import("./pages/ApiKeyEdit"));
const ApiKeySettings = lazy(() => import("./pages/ApiKeySettings"));
const Trades = lazy(() => import("./pages/Trades"));
const Signals = lazy(() => import("./pages/Signals"));
const Subscription = lazy(() => import("./pages/Subscription"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Channels = lazy(() => import('./pages/Channels'));
const ChannelDetail = lazy(() => import('./pages/ChannelDetail'));
const Login = lazy(() => import('./pages/Login'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const ChannelOwner = lazy(() => import('./pages/ChannelOwner'));
const BackTest = lazy(() => import('./pages/BackTest'));
const BackTestResults = lazy(() => import('./pages/BackTestResults'));
const Faq = lazy(() => import('./pages/Faq'));
const SignalAdd = lazy(() => import('./pages/SignalAdd'));
const AddUserSignal = lazy(() => import('./pages/AddUserSignal'));

// Admin sayfaları
const AdminMembers = lazy(() => import('./pages/admin/Members'));
const AdminMemberNotifications = lazy(() => import('./pages/admin/MemberNotifications'));
const AdminChannelNotifications = lazy(() => import('./pages/admin/ChannelNotifications'));
const AdminSubscriptions = lazy(() => import('./pages/admin/Subscriptions'));
const AdminSignals = lazy(() => import('./pages/admin/Signals'));
const AdminMemberOperations = lazy(() => import('./pages/admin/MemberOperations'));
const AdminApiKeys = lazy(() => import('./pages/admin/ApiKeys'));
const BotChannels = lazy(() => import('./pages/admin/BotChannels'));
const BotSettings = lazy(() => import('./pages/admin/BotSettings'));
const SubscriptionPackages = lazy(() => import('./pages/admin/SubscriptionPackages'));
const AdminApiSettings = lazy(() => import('./pages/admin/ApiKeys'));
const AdminSubscriptionPackages = lazy(() => import('./pages/admin/SubscriptionPackages'));
const ManageMember = lazy(() => import('./pages/admin/ManageMember'));
const AdminFaq = lazy(() => import('./pages/admin/FaqAdmin'));
const FaqNew = lazy(() => import('./pages/admin/FaqNew'));
const BotChannelForm = lazy(() => import('./pages/admin/BotChannelForm'));
const SubscriptionsNew = lazy(() => import('./pages/admin/SubscriptionsNew'));
const SupportBot = lazy(() => import('./pages/admin/SupportBot'));
const SystemPromptAdmin = lazy(() => import('./pages/admin/SystemPromptAdmin'));
const SystemPromptNew = lazy(() => import('./pages/admin/SystemPromptNew'));
const SubscriptionEdit = lazy(() => import('./pages/admin/SubscriptionEdit'));
const AdminUserSignals = lazy(() => import('./pages/admin/UserSignals'));
const AdminBotLogs = lazy(() => import('./pages/admin/BotLogs'));
const ApiKeySettingsList = lazy(() => import('./pages/ApiKeySettingsList'));
const AdminRates = lazy(() => import('./pages/admin/Rates'));
// LogViewer
const LogViewer = lazy(() => import('./views/LogViewer'));

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const { t } = useLang();
  if (isAuthenticated === null) {
    return <div className="flex items-center justify-center h-screen">{t('loading')}</div>;
  }
  if (!isAuthenticated) {
    return null; // useAuth zaten yönlendirmeyi yapıyor
  }
  return <>{children}</>;
};

const SplashScreen = () => {
  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-2xl font-bold mb-4">Telegram Girişi Gerekli</h2>
          <p className="mb-6">Bu uygulamayı kullanmak için Telegram üzerinden giriş yapmanız gerekmektedir.</p>
          <button
            onClick={() => window.location.href = 'https://t.me/your_bot_username'}
            className="bg-[#3390ec] text-white px-6 py-2 rounded-lg hover:bg-[#2a7fd9] transition-colors"
          >
            Telegram'a Git
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AppContent = () => {
  const { isReady, t } = useLang();

  if (!isReady) {
    return <div className="flex items-center justify-center h-screen">{t('loading')}</div>;
  }
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Router>
          <AnimatePresence mode="wait">
            <Suspense fallback={<div className="flex items-center justify-center h-screen">{t('loading')}</div>}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/adminlogin" element={<AdminLogin />} />
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Dashboard />} />
                  <Route path="api-keys" element={<ApiKeys />} />
                  <Route path="api-keys/new" element={<ApiKeyNew />} />
                  <Route path="api-keys/edit" element={<ApiKeyEdit />} />
                  <Route path="api-keys/settings" element={<ApiKeySettings />} />
                  <Route path="trades" element={<Trades />} />
                  <Route path="signals" element={<Signals />} />
                  <Route path="signals/add" element={<SignalAdd />} />
                  <Route path="subscription" element={<Subscription />} />
                  <Route path="channels" element={<Channels />} />
                  <Route path="channels/:id" element={<ChannelDetail />} />
                  <Route path="partnership" element={<ChannelOwner />} />
                  <Route path="backtest" element={<BackTest />} />
                  <Route path="backtest/results" element={<BackTestResults />} />
                  <Route path="faq" element={<Faq />} />
                  <Route path="supportbot" element={<SupportBot />} />
                  {/* Eski URL'yi yeni URL'ye yönlendir */}
                  <Route path="api-settings" element={<ApiKeySettingsList />} />
                  {/* Admin sayfaları */}
                  <Route path="admin/members" element={<AdminMembers />} />
                  <Route path="admin/member-notifications" element={<AdminMemberNotifications />} />
                  <Route path="admin/channel-notifications" element={<AdminChannelNotifications />} />
                  <Route path="admin/bot-channels" element={<BotChannels />} />
                  <Route path="admin/bot-channels/new" element={<BotChannelForm />} />
                  <Route path="admin/bot-channels/edit/:id" element={<BotChannelForm />} />
                  <Route path="admin/subscriptions" element={<AdminSubscriptions />} />
                  <Route path="admin/subscriptions/new" element={<SubscriptionsNew />} />
                  <Route path="admin/subscriptions/edit/:id" element={<SubscriptionEdit />} />
                  <Route path="admin/signals" element={<AdminSignals />} />
                  <Route path="admin/api-keys" element={<AdminApiKeys />} />
                  <Route path="admin/bot-settings" element={<BotSettings />} />
                  <Route path="admin/subscription-packages" element={<SubscriptionPackages />} />
                  <Route path="admin/subscription-packages/edit/:id" element={<SubscriptionEdit />} />
                  <Route path="admin/api-settings" element={<AdminApiSettings />} />
                  <Route path="admin/members/:id/manage" element={<ManageMember />} />
                  <Route path="admin/faq" element={<AdminFaq />} />
                  <Route path="admin/faq/new" element={<FaqNew />} />
                  <Route path="admin/system-prompt" element={<SystemPromptAdmin />} />
                  <Route path="admin/system-prompt/new" element={<SystemPromptNew />} />
                  <Route path="admin/supportbot" element={<SupportBot />} />
                  <Route path="admin/positions/:apiKeyId" element={<Positions />} />
                  <Route path="/admin/positions/:apiKeyId" element={<Positions />} />
                  <Route path="admin/orders/:apiKeyId" element={<OpenOrders />} />
                  <Route path="/admin/orders/:apiKeyId" element={<OpenOrders />} />
                  <Route path="admin/position-history/:apiKeyId" element={<PositionHistory />} />
                  <Route path="/admin/position-history/:apiKeyId" element={<PositionHistory />} />
                  <Route path="admin/order-history/:apiKeyId" element={<OrderHistory />} />
                  <Route path="/admin/order-history/:apiKeyId" element={<OrderHistory />} />
                  <Route path="/log_viewer/:filename" element={<LogViewer />} />
                  <Route path="/admin/user-signals" element={<ProtectedRoute><AdminUserSignals /></ProtectedRoute>} />
                  <Route path="/admin/bot-logs" element={<ProtectedRoute><AdminBotLogs /></ProtectedRoute>} />
                  <Route path="add-user-signal" element={<AddUserSignal />} />
                  <Route path="admin/rates" element={<ProtectedRoute><AdminRates /></ProtectedRoute>} />
                </Route>
                <Route path="/welcome" element={<Index />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AnimatePresence>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  )
}

const App = () => {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Yükleniyor...</div>;
  }

  if (!isAuthenticated) {
    return <SplashScreen />;
  }

  return (
    <LangProvider>
      <AppContent />
    </LangProvider>
  );
};

export default App;
