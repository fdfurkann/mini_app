debug_cli klasöründeki PHP dosyalarının işlevleri:
telegram_cli.php
Telegram API’si ile CLI (komut satırı) üzerinden sohbetleri listeleme, bir sohbetin mesaj geçmişini görüntüleme ve mesaj gönderme işlemlerini yapar.
MadelineProto kütüphanesini kullanır.
Komutlar:
php telegram_cli.php chats → Sohbetleri listeler
php telegram_cli.php chat <id|username> → Belirli bir sohbetin son 20 mesajını gösterir
php telegram_cli.php send <id|username> "mesaj" → Mesaj gönderir
API kimlik bilgileri dosya başında sabit olarak tanımlı.
binance_cli.php
Binance API’si ile CLI üzerinden emir, pozisyon, trade geçmişi gibi işlemleri yapar.
API anahtarı ve secret dosya başında sabit olarak tanımlı.
Komutlar:
php binance_cli.php open_orders → Açık emirleri listeler
php binance_cli.php positions → Açık pozisyonları listeler
php binance_cli.php order <symbol> <BUY|SELL> <MARKET|LIMIT> <usdt_miktar> [fiyat] → Emir gönderir
php binance_cli.php close <symbol> → Pozisyon kapatır
php binance_cli.php trade_history [symbol] [limit] → Trade geçmişini listeler
php binance_cli.php delete <symbol> <orderId> → Emir siler
Binance REST API’si için harici bir dosya (binance.rest.php) kullanır.
mysql_cli.php
Komut satırından verilen SQL sorgusunu çalıştırıp sonucu ekrana yazdırır.
Kullanım: php mysql_cli.php "SELECT * FROM tablo LIMIT 1"
Bağlantı bilgileri dosya içinde sabit.
Sonuçları JSON olarak satır satır ekrana basar.
Hataları yakalar ve ekrana yazar.

