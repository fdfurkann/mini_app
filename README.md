# Mini Trading App - Kapsamlı Teknik Dokümantasyon

## Proje Tanımı ve Amaç
Mini Trading App, Telegram üzerinden gelen trading sinyallerini işleyip, kullanıcıların bu sinyallere göre otomatik veya manuel işlem yapmasını sağlayan, Node.js tabanlı backend ve React tabanlı modern frontend içeren, çoklu borsa ve çoklu dil destekli, modüler ve ölçeklenebilir bir trading otomasyon platformudur.

---

## MİMARİ GENEL BAKIŞ
- **Backend:** Node.js (Express), MySQL, ccxt, Telegram Bot API, modüler servisler
- **Frontend:** React, TypeScript, Vite, TailwindCSS, shadcn-ui, React Query, çoklu dil desteği
- **Veritabanı:** MySQL, trading ve kullanıcı yönetimi için optimize edilmiş tablolar

---

## BACKEND (server/) - TEKNİK DETAYLAR

### 1. Ana Sunucu (index.js)
- Express.js ile HTTP sunucusu, tüm API endpoint'leri burada tanımlı.
- CORS, body-parser, hata yönetimi, debug loglama, in-memory cache (Map) ile performans artırımı.
- Kimlik Doğrulama: Tüm endpoint'ler için `X-Telegram-ID` ve `X-Login-Hash` header'ları zorunlu. Admin endpoint'lerinde ek yetki kontrolü (`app_admin` tablosu).
- MySQL connection pool ile yüksek performanslı bağlantı. Tüm sorgular async/await ile çalışır, hata yönetimi detaylıdır.
- Sık kullanılan endpoint'lerde (kullanıcı, dashboard, sinyal) 5 dakika süreyle cache kullanılır.
- API Endpoint'leri: Kullanıcı, API key, trade, sinyal, admin işlemleri, bağlantı testi.
- Debug modunda tüm istek ve yanıtlar renkli olarak loglanır.

### 2. Bot ve Arka Plan Servisleri (bot.js)
- .env'den ayarları okur, MySQL pool ve Telegram botunu polling modunda başlatır.
- Global yardımcı fonksiyonlar: `dbQuery(sql, params)`, `formatPrice(value, precision)`.
- Modül başlatıcılar: `startPriceFetcher`, `startTelegramListener`, `startNotificationSender`, `startSignalProcessor`.

### 3. Fiyat Güncelleyici (PriceFetcher.js)
- Binance Futures API'den USDT perpetual semboller alınır.
- Her 1 saatte bir sembol hassasiyeti, her 1 saniyede bir fiyatlar güncellenir.
- `rates` tablosu otomatik oluşturulur/güncellenir. Her sembol için fiyat, hassasiyet ve zaman damgası tutulur.

### 4. Telegram Dinleyici (TelegramListener.js)
- Telegram'dan gelen mesaj ve kanal postlarını dinler.
- `create_signal` komutlarını ayrıştırır, doğrular ve veritabanına kaydeder.
- Sinyal parametreleri (parite, trend, SL%, giriş aralığı, TP adedi, TP%) ayrıştırılır.
- Sinyal için güncel fiyat ve hassasiyet `rates` tablosundan alınır.
- Sinyal mesajı düzenlenir veya yeni mesaj olarak gönderilir.
- Her mesaj ve sinyal girişi `channel_events` tablosuna loglanır.
- Hatalı komutlarda kullanıcıya anında bildirim gönderilir.
- Kanal onayı ve aktiflik kontrolü yapılır, gerekirse kullanıcıya uyarı gönderilir.

### 5. Bildirim Gönderici (NotificationSender.js)
- `bildirimler` ve `bildirimler_ch` tablolarında gonderim=0 olan kayıtları bulur.
- Bildirimleri ilgili Telegram kullanıcı veya kanallarına gönderir.
- Başarılı gönderimde gonderim alanı güncellenir, hata olursa error_message kaydedilir.
- Kanal bildirimlerinde inline butonlar (Orcatradebot, Destek al) eklenir.
- Her 1 saniyede bir periyodik kontrol ve gönderim yapılır.

### 6. Sinyal İşleyici (SignalProcessor.js)
- Yeni sinyal geldiğinde, o sinyale abone ve aktif API anahtarı olan tüm kullanıcılar bulunur.
- Her kullanıcı için `user_signals` tablosuna kayıt açılır.
- Her kullanıcı için asenkron olarak trade açma işlemi başlatılır (`run_user`).
- Sinyal açılış, TP, SL gibi durumlarda kanal bildirimleri hazırlanır ve `bildirimler_ch` tablosuna eklenir.
- Borsa entegrasyonları (Binance, Bybit, BingX) ile gerçek emir açma/kapama işlemleri yapılır.
- Sinyal ve kullanıcı işlemleri, durum değişiklikleri ve loglar detaylı olarak yönetilir.

### 7. Borsa Entegrasyonları (exchanges/)
- Her borsa için ayrı modül, ccxt veya doğrudan API ile emir açma/kapama, bakiye ve pozisyon yönetimi.
- Hata yönetimi ve loglama.

### 8. Veritabanı Yapısı - Teknik Detaylar
- **users:** Telegram kimliği, kullanıcı adı, login hash, oluşturulma tarihi.
- **api_keys:** Her kullanıcı için birden fazla API anahtarı, borsa ve trading parametreleri (lot, kaldıraç, margin tipi, otomatik trade, SL/TP ayarları, vs).
- **user_signals:** Her kullanıcı ve sinyal için işlem geçmişi, açılış/kapanış fiyatı, zaman, kar/zarar, durum.
- **signals:** Tüm sinyallerin ana kaydı, kanal, sembol, trend, giriş/çıkış, TP/SL, hash, zaman damgaları.
- **enrolled_users:** Kullanıcıların abone oldukları paketler, başlangıç/bitiş tarihleri.
- **bildirimler, bildirimler_ch:** Kullanıcı ve kanal bildirimleri, mesaj, gönderim zamanı, hata mesajı.
- **app_admin:** Admin kullanıcıları ve şifreleri.
- **bot_rooms, bot_settings:** Botun bağlı olduğu Telegram kanalları ve ayarları.
- **faq, faq_items:** Sıkça sorulan sorular ve içerikleri.
- **history, tradelog, logs:** Tüm işlem ve sistem logları.
- **odemeler, odemeyontem, packages, rates, referral, satislar, channel_events, channel_notifications, genel_ayarlar, symboldata, telegram_msg:** Diğer yardımcı ve yönetimsel tablolar.

---

## FRONTEND (src/) - TEKNİK DETAYLAR

### 1. Ana Giriş ve Router
- `main.tsx`/`main.ts`: React uygulamasının giriş noktasıdır. `App.tsx` bileşenini render eder.
- `App.tsx`: Tüm uygulama context'lerini (`LangProvider`, `QueryClientProvider`, `TooltipProvider`) ve router'ı (`BrowserRouter`) sarmalar. Route'lar lazy-load ile yüklenir, performans için `Suspense` kullanılır. Giriş yapılmamışsa Telegram login ekranı (`SplashScreen`) gösterilir. Giriş yapılmışsa ana layout ve içerik yüklenir.

### 2. Sayfalar (pages/)
- Dashboard, API Key yönetimi, Sinyaller, Kanallar, Abonelik, Backtest, SSS, Login, NotFound gibi ana sayfalar. `admin/` altında admin paneli sayfaları, `dashboard/` altında dashboard'a özel alt sayfalar.
- Her sayfa, ilgili backend endpoint'leriyle haberleşir, veri çeker, formlar ve validasyon içerir.

### 3. Bileşenler (components/)
- Layout, Sidebar, SettingsPanel, SubscriptionManager, TradeHistory, ApiKeyManager, AdminDataTable, AdminRoute gibi ortak ve tekrar kullanılabilir UI bileşenleri.
- `ui/` altında atomik UI parçaları (buton, tablo, form, dialog, toast, tooltip, menü, sekme, kart, badge, avatar, vs.).
- `dashboard/` altında dashboard'a özel görsel ve fonksiyonel bileşenler.

### 4. Servisler (services/)
- `api.ts`: Tüm backend API endpoint'lerine erişim fonksiyonları. Her fonksiyon fetch/axios ile çalışır, hata yönetimi ve veri dönüştürme içerir.
- `userService.ts`, `database.ts`: Kullanıcı ve veri yönetimi için yardımcı fonksiyonlar.

### 5. Özel Hook'lar (hooks/)
- `useAuth`: Kullanıcı kimlik doğrulama durumunu yönetir.
- `useLang.tsx`: Dil seçimini ve çeviri fonksiyonunu yönetir.
- `use-debounce.ts`: Input değerleri için debounce (gecikme) sağlar.
- `use-mobile.tsx`: Mobil görünümü kontrol eder.

### 6. Yardımcılar ve Tipler (utils/)
- `locales.ts`: Çoklu dil desteği için çeviri anahtarları, `useT()` fonksiyonu.
- `helpers.ts`: Genel yardımcı fonksiyonlar.
- `types.ts`: Proje genelinde kullanılan TypeScript arayüzleri ve tipleri.

### 7. Dil Desteği
- `useLang` ve `LangProvider`: Seçili dil context ile yönetilir, localStorage'da saklanır.
- `locales.ts`: Tüm diller için anahtar-değer çeviri sistemi.
- `useT()`: Bileşenlerde kolayca çeviri almak için kullanılır.
- Yeni dil eklemek: Sadece `translations` objesine yeni bir dil ve metinler eklenir.
- Otomatik güncelleme: Dil değiştiğinde context güncellenir, tüm bileşenler yeni dile geçer.

### 8. Modern UI/UX
- TailwindCSS, shadcn-ui, framer-motion, React Query, Toaster/Sonner ile modern ve erişilebilir arayüz, animasyonlar, anlık bildirimler.

### 9. Kullanıcı ve Admin Paneli Ayrımı
- Kullanıcı Paneli: API anahtarı yönetimi, sinyal takibi, işlem geçmişi, abonelik, backtest, kanal yönetimi, SSS.
- Admin Paneli: Üye yönetimi, bildirimler, bot kanalları, abonelik paketleri, API ayarları, sinyal ve bildirim yönetimi, SSS yönetimi.
- Yetki kontrolü: Admin route'ları için özel koruma ve yönlendirme.

### 10. Veri Akışı ve Senkronizasyon
- API ile haberleşme: Tüm veri işlemleri servisler üzerinden backend'e gider.
- React Query ile cache: Sık kullanılan veriler cache'de tutulur, otomatik güncellenir.
- Formlar ve validasyon: Tüm formlar validasyon ve hata yönetimi içerir, başarılı işlemlerde toast ile bildirim gösterilir.

### 11. Geliştirici Deneyimi
- Modüler yapı, kolay genişletilebilirlik, tip güvenliği, katkı rehberi.

---

## KURULUM, ÇALIŞTIRMA VE GELİŞTİRME

### 1. Ortam Değişkenleri ve .env
- Proje köküne `.env` dosyası eklenmeli:
  ```
  DB_HOST=localhost
  DB_USER=root
  DB_PASSWORD=
  DB_NAME=trading_db
  DB_PORT=3306
  BOT_TOKEN=your_telegram_bot_token
  ```

### 2. Bağımlılıkların Kurulumu
- Proje kökünde:
  ```
  npm install
  ```

### 3. Backend'in Başlatılması
- Sunucuyu başlatmak için:
  ```
  node server/index.js
  ```

### 4. Frontend'in Başlatılması
- Geliştirme modunda başlatmak için:
  ```
  npm run dev
  ```

### 5. Veritabanı Kurulumu
- `orcatradebot.sql` dosyasındaki tüm tabloları ve örnek verileri MySQL'e import edin.
- Tüm tablo ilişkileri, index'ler ve örnek admin/kullanıcı verileri hazırdır.

### 6. Geliştirme ve Katkı
- Kodlar modüler ve okunabilir şekilde yazılmıştır.
- Yeni bir özellik eklemek için backend'de ilgili modüle veya yeni bir dosyaya, frontend'de yeni bir sayfa, bileşen veya servis ekleyin.
- Dil desteği için sadece `locales.ts` dosyasına yeni bir dil objesi ekleyin.
- Katkı yapmak için fork'layın, değişiklikleri yapın, PR gönderin.

### 7. Test ve Debug
- Backend'de `debug = 1` ile tüm istek ve yanıtlar renkli olarak loglanır.
- Frontend'de React Query devtools, network ve state debug için kullanılabilir.

### 8. Güvenlik ve Yetkilendirme
- Tüm API endpoint'leri için kimlik doğrulama zorunludur.
- Admin endpoint'lerinde ek yetki kontrolü yapılır.
- Kullanıcı ve admin oturumları güvenli şekilde yönetilir.

### 9. Dağıtım ve Yayınlama
- Proje, Vercel, Netlify, DigitalOcean, AWS gibi ortamlara kolayca deploy edilebilir.
- Frontend için `npm run build` ile production build alınır.
- Backend için Node.js sunucusunda çalıştırılır.
- .env dosyasındaki ayarlar production ortamına göre güncellenmelidir.

### 10. Ekstra Notlar ve İpuçları
- Çoklu dil desteği ile yeni dil eklemek ve mevcut çevirileri güncellemek çok kolaydır.
- Tüm önemli iş akışları (sinyal işleme, trade açma, bildirim, abonelik, admin yönetimi) modüler ve genişletilebilir yapıdadır.
- Kodda herhangi bir değişiklik yaptığınızda, ilgili modülün testlerini ve veri akışını kontrol edin.
- Proje, hem bireysel kullanıcılar hem de büyük ekipler için ölçeklenebilir şekilde tasarlanmıştır.

---

Her türlü soru, öneri ve katkı için proje sahibiyle iletişime geçebilirsiniz.
# mini_app
