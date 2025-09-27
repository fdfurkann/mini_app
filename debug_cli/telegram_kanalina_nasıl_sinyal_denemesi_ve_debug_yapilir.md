telegram kanalına sinyal denemesi yapıp çalışıp çalışmadığını anlamak için süreç şöyle işler. 

1- telegram_cli.php dosyasını kullanarak. tüm sohbetler listelenir. 
2- bulunan sohbetler arasından orca_v3_test_channel ( id: 2686562020 ) kanalı bulunur.
3- bu kanala aşağıdaki formatta sinyal atılır.

create_signal [parite_ismi] [trend] [sl_yuzde] [entry_aralik_yuzde] [tp_adet] [tp_ler_arasi_yuzde]

örneğin

create_signal DOGEUSDT BUY 1 1 5 1

gibi

4- sinyal attıktan sonra sinyalin telegram_cli.php kullanarak kanalda sinyal takibe alındığına dair mesaj atılmış mı o kontrol edilir. 

5- sinyal takibe alındıktan bir süre sonra üyenin telegram_cli.php üzerinden @OrcaTrade_Bot adlı botta işlemin açılıp açılmadığına dair
bildirim gelip gelmediğine bakılır. 

6- işlem açılmışsa binance_cli.php üzerinden üyenin açık işlemleri kontrol edilir. açılan işlemler doğru mu açılmış yanlış mı açılmış teyit edilir.

7- eğer bu süreçte işlem açılmamış veya sinyal açılmamışsa bunun için mysql_cli.php kullanılarak veritabanında bot_logs tablosuna bakılarak süreç 
içinde hata olup olmadığı kontrol edilir. 

8- üyeye açılan işlemlerin doğru ayarlarla çalışıp çalışmadığını anlamak için api_keys tablosuna bakılır 

api_keys tablosundaki sütunların anlamları

Temel Kimlik ve Bağlantı Alanları
id: API anahtarının benzersiz ID’si.
user_id: API anahtarının ait olduğu kullanıcının ID’si.
api_name: Kullanıcıya gösterilen API anahtarının adı (ör: "Binance Vadeli", "Bybit Spot").
api_key: Borsadan alınan API Key (kullanıcıdan alınır, gizli tutulur).
api_secret: Borsadan alınan API Secret (kullanıcıdan alınır, gizli tutulur).
api_type: API türü (1=Binance, 2=Bybit, 3=BingX gibi, frontend’de borsa seçimi olarak gösterilir).
bot_room: Bu API anahtarının bağlı olduğu Telegram bot odası/kanalı (frontend’de kanal seçimi olarak gösterilir).
enrolled_id: Kullanıcının abone olduğu paket/abonelik ID’si (paket ile API eşleştirmesi için).
Trade ve Risk Ayarları
lotsize: İşlem başına kullanılacak miktar (ör: 100 USDT, frontend’de “Pozisyon Büyüklüğü” veya “Lot” olarak gösterilir).
leverage: Kaldıraç oranı (ör: 10x, 20x, frontend’de “Kaldıraç” olarak gösterilir).
margin_type: Marjin tipi (ör: ISOLATED, CROSS; frontend’de “Marjin Tipi” olarak gösterilir).
max_orders: Aynı anda açılabilecek maksimum işlem sayısı (frontend’de “Maksimum Açık İşlem”).
auto_trade: Otomatik trade aktif/pasif (1=aktif, 0=pasif; frontend’de “Otomatik İşlem” anahtarı).
status: API anahtarının aktif/pasif durumu (kullanıcıya gösterilir).
Stop Loss ve Risk Yönetimi
stop_loss: Stop loss aktif mi (1=aktif, 0=pasif; frontend’de “Stop Loss” anahtarı).
stop_loss_settings: Stop loss tipi (ör: custom, signal, none; frontend’de “Stop Loss Tipi”).
percent_loss: Stop loss yüzdesi (ör: %10; frontend’de “Stop Loss Yüzdesi”).
stop_amount: Stop loss miktarı (sabit miktar girilebiliyorsa).
trail_stop: Takip eden stop aktif mi (1=aktif, 0=pasif; frontend’de “Takip Eden Stop”).
sl_tp_order: Stop ve TP emirleri birlikte mi açılacak (1=evet, 0=hayır).
break_even_level: Maliyetine çekme seviyesi (ör: “none”, “tp1”, “tp2”; frontend’de “Maliyetine Çek”).
break_even: Maliyetine çek aktif mi (1=aktif, 0=pasif).
Take Profit ve Kar Yönetimi
take_profit: Take profit tipi (ör: custom, signal, none; frontend’de “Kar Al Tipi”).
take_profit_trading_setting: Kar al ayar tipi (ör: percentage_profit_level, fixed_point).
signal_profit: Sinyal bazlı kar al aktif mi.
percent_profit: Kar al yüzdesi (ör: %20; frontend’de “Kar Al Yüzdesi”).
tp0 - tp10: Çoklu kar al seviyeleri (ör: %20, %40, %60 gibi; frontend’de “TP1”, “TP2” ... “TP10”).
is_profit_target_enabled: Kar hedefi aktif mi (1=aktif, 0=pasif).
profit_amount: Kar hedefi miktarı.
profit_target_amount: Kar hedefi için sabit miktar.
Diğer Ayarlar
withdraw_to_cost: Karı ana paraya çek (1=aktif, 0=pasif; frontend’de “Kârı Ana Paraya Aktar”).
created_at / updated_at: Kayıt ve güncelleme zamanları (kullanıcıya gösterilmez, log amaçlı).
start_date / end_date: API anahtarının geçerli olduğu tarih aralığı (abonelik/paket süresi için).