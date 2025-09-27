import React, { useState, useEffect, useMemo } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, KeyRound, BarChart3, Bell, Settings, CreditCard, Users, LogOut, Key, Activity, Radio, LogIn, MessageSquare, Shield, UserPlus, AlertTriangle, Bell as BellIcon, UserCog, Package, Handshake, BarChart, Globe, MessageCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import CountryFlag from 'react-country-flag';
import { useLang } from '@/hooks/useLang';
import SupportPng from '@/components/ui/support.png';

// Import from lucide-react
import { ChevronLeft, ChevronRight, Moon, Sun } from "lucide-react";

const languages = [
  { code: 'en', label: 'English', flag: 'GB' },
  { code: 'tr', label: 'Türkçe', flag: 'TR' },
  { code: 'es', label: 'Español', flag: 'ES' },
  { code: 'de', label: 'Deutsch', flag: 'DE' },
  { code: 'fr', label: 'Français', flag: 'FR' },
  { code: 'ru', label: 'Русский', flag: 'RU' },
  { code: 'it', label: 'Italiano', flag: 'IT' },
  { code: 'ja', label: '日本語', flag: 'JP' },
  { code: 'ar', label: 'العربية', flag: 'SA' }
];

function LanguageSelectorFlag() {
  const [open, setOpen] = useState(false);
  const { lang, setLang } = useLang();
  const current = languages.find(l => l.code === lang) || languages[0];

  const handleLanguageChange = (newLang: string) => {
    setLang(newLang);
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative', marginLeft: 8 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
        title={current.label}
      >
        <div style={{ width: '3.5rem', height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CountryFlag countryCode={current.flag} svg style={{ width: '3.5rem', height: 'auto', display: 'block' }} />
        </div>
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 40, background: '#fff', border: '1px solid #eee', borderRadius: 6, zIndex: 100, minWidth: 50 }}>
          {languages.map(l => (
            <div
              key={l.code}
              onClick={() => handleLanguageChange(l.code)}
              style={{ padding: 4, cursor: 'pointer', background: lang === l.code ? '#f0f0f0' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 34 }}
            >
              <CountryFlag countryCode={l.flag} svg style={{ width: '3.5rem', height: 'auto', display: 'block' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const Layout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { t } = useLang();

  const pageVariants = {
    initial: { opacity: 0, y: 10 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -10 }
  };

  const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.3
  };

  // Normal menü öğeleri
  const menuItems = useMemo(() => [
    { name: t("anasayfa"), path: "/", icon: Home },
    { name: t('SupportBot'), path: "/supportbot", icon: MessageCircle, label: "SupportBot" },
    { name: t("apiKeys"), path: "/api-keys", icon: Key },
    { name: "API Ayarları", path: "/api-settings", icon: Settings },
    { name: t("trades"), path: "/trades", icon: Activity },
    { name: t("backtest.title"), path: "/backtest", icon: BarChart },
    { name: t("channels"), path: "/channels", icon: MessageSquare },
    { name: t("partnership"), path: "/partnership", icon: Handshake },
    { name: t("faq.title"), path: "/faq", icon: AlertTriangle },
    { name: t("subscription"), path: "/subscription", icon: CreditCard },
  ], [t]);



  // Admin menü öğeleri - sadece admin girişi yapıldığında görünür
  const adminNavItems = useMemo(() => [
    { to: "/admin/supportbot", icon: () => <span className="w-5 h-5 min-w-5" role="img" aria-label="SupportBot">🤖</span>, label: "SupportBot" },
    { to: "/admin/members", icon: Users, label: t("members") },
    { to: "/admin/rates", icon: Radio, label: "Rates" },
    { to: "/admin/member-notifications", icon: Bell, label: t("memberNotifications") },
    { to: "/admin/channel-notifications", icon: AlertTriangle, label: t("channelNotifications") },
    { to: "/admin/bot-channels", icon: Radio, label: t("botChannels.title") },
    { to: "/admin/subscriptions", icon: CreditCard, label: t("subscriptions") },
    { to: "/admin/signals", icon: Activity, label: t("signals") },
    { to: "/admin/user-signals", icon: Users, label: "Üye Sinyalleri" },
    { to: "/admin/api-keys", icon: Key, label: t("apiKeys") },
    { to: "/admin/subscription-packages", icon: Package, label: t("subscriptionPackages") },
    { to: "/admin/faq", icon: AlertTriangle, label: "S.S.S Yönetimi" },
    { to: "/admin/system-prompt", icon: AlertTriangle, label: "System Prompt" },
    { to: "/admin/bot-logs", icon: FileText, label: "Bot Logları" },
    { to: "/log_viewer/orca.log", icon: FileText, label: "Log Viewer" },
  ], [t]);

  useEffect(() => {
    // Wait for component to hydrate
    setIsMounted(true);
    
    // Set default theme to light
    setTheme("light");
    
    // Check if it's mobile view and collapse sidebar if needed
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false); // Ensure sidebar is expanded on desktop
      }
    };

    // Check if user is admin
    const checkAdminStatus = () => {
      const adminStatus = sessionStorage.getItem("isAdmin");
      setIsAdmin(adminStatus === "true");
    };

    // Admin erişimini kontrol et
    const checkAdminAccess = async () => {
      const telegramId = sessionStorage.getItem("telegramId");
      if (telegramId) {
        try {
          // Önce admin_users verisini al
          const baseUrl = import.meta.env.VITE_API_URL.endsWith('/api') 
            ? import.meta.env.VITE_API_URL.slice(0, -4) 
            : import.meta.env.VITE_API_URL;
          const response = await fetch(`${baseUrl}/api/admin-users`);
          if (response.ok) {
            const data = await response.json();
            const adminUsers = String(data.admin_users || ""); // String'e çevir
            const userTelegramId = String(telegramId); // Kullanıcı ID'sini string'e çevir
            
            // admin_users string'i içinde telegram ID'yi ara
            setShowAdminLogin(adminUsers.includes(userTelegramId));
          }
        } catch (error) {
          console.error("Admin erişim kontrolü hatası:", error);
          setShowAdminLogin(false);
        }
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();
    checkAdminStatus();
    checkAdminAccess();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Sidebar toggle for mobile
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Theme toggle
  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const handleLogout = () => {
    sessionStorage.removeItem("telegramId");
    sessionStorage.removeItem("isAdmin");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Mobile header with toggle */}
      <div className="md:hidden fixed top-0 left-0 right-0 flex items-center justify-between h-14 px-4 border-b border-border/50 bg-background z-50">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md hover:bg-secondary"
        >
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
        <div className="flex items-center justify-between w-full">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-base font-semibold">
              <span className="text-primary">Orca</span>TradeBot
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <LanguageSelectorFlag />
          <button onClick={toggleTheme} className="p-2 rounded-md hover:bg-secondary">
            {isMounted && theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen overflow-y-auto flex flex-col bg-background border-r border-border/50 transition-all duration-300 z-40 ${
          sidebarCollapsed ? "w-20 -translate-x-full md:translate-x-0" : "w-72"
        } ${sidebarCollapsed ? "md:w-[3.5rem]" : "md:w-72"}`}
        style={{ height: "100vh" }}
      >
        {/* Desktop header */}
        <div className="hidden md:flex items-center justify-between h-14 px-4 border-b border-border/50 sticky top-0 bg-background z-10">
          <div className={`flex items-center${!sidebarCollapsed ? ' w-full' : ''}`}>
            {!sidebarCollapsed && (
              <Link to="/" className="flex items-center gap-2">
                <span className="text-base font-semibold">
                  <span className="text-primary">Orca</span>TradeBot
                </span>
              </Link>
            )}
            <div className="flex-1 flex justify-end">
              {!sidebarCollapsed && <LanguageSelectorFlag />}
            </div>
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 rounded-md hover:bg-secondary"
            style={{ margin: 'auto' }}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            {/* Normal menü */}
            <nav className="space-y-2 mt-14 md:mt-0">
              {[
                ...menuItems,
                ...(showAdminLogin ? [{ name: t("adminLogin"), path: "/adminlogin", icon: Shield }] : [])
              ].map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path && item.name !== t("adminLogin");
                return (
                  <Link key={item.name} to={item.path}>
                    <Button
                      variant="ghost"
                      className={cn(
                        sidebarCollapsed
                          ? "w-12 h-12 flex items-center justify-center p-0"
                          : "w-full justify-start gap-2 overflow-hidden px-3 py-2",
                        isActive && "bg-primary/10 text-primary"
                      )}
                    >
                      <Icon className="w-5 h-5 min-w-5" />
                      {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
                    </Button>
                  </Link>
                );
              })}
            </nav>

            {/* Admin menüsü - sadece admin girişi yapıldığında görünür */}
            {isAdmin && (
              <>
                <div className={cn("my-4", sidebarCollapsed ? "mx-auto w-8" : "mx-2")}>
                  <div className="h-px bg-border/50"></div>
                  {!sidebarCollapsed && <p className="text-xs text-muted-foreground mt-2 font-semibold">{t("adminMenu")}</p>}
                </div>
                <nav className="space-y-2">
                  {adminNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.to;
                    return (
                      <Link key={item.to} to={item.to}>
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-start gap-2 overflow-hidden",
                            isActive && "bg-primary/10 text-primary"
                          )}
                        >
                          <Icon className="w-5 h-5 min-w-5" />
                          {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                        </Button>
                      </Link>
                    );
                  })}
                  {/* Yeni Pencere Butonu */}
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 overflow-hidden"
                    onClick={() => window.open(window.location.href, '_blank')}
                  >
                    <span className="w-5 h-5 min-w-5" role="img" aria-label="Yeni Pencere">🗔</span>
                    {!sidebarCollapsed && <span className="truncate">Yeni Pencere</span>}
                  </Button>
                </nav>
              </>
            )}
          </div>
        </div>
        
        {/* Desktop theme toggle */}
        <div className="hidden md:flex items-center justify-center py-3 border-t border-border/50 px-4 sticky bottom-0 bg-background">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md hover:bg-secondary"
            title={isMounted && theme === "dark" ? t("switchToLightMode") : t("switchToDarkMode")}
          >
            {isMounted && theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <div className="flex flex-col items-center gap-2 mt-auto mb-2">
        </div>
      </aside>

      {/* Mobile sidebar backdrop */}
      {!sidebarCollapsed && window.innerWidth < 768 && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden" 
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* Main content */}
      <main className={`flex-1 flex flex-col transition-all duration-300`}>
        <div className="flex-1 p-4 md:p-6 overflow-y-auto" style={{ paddingTop: '4rem' }}>
          <motion.div
            key={location.pathname}
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            <Outlet />
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Layout;