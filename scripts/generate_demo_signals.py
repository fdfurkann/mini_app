import pymysql
import random
from datetime import datetime, timedelta, timezone
import time
import os
from dotenv import load_dotenv

# .env dosyasını yükle
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path=dotenv_path)

# DB Ayarları .env'den okunacak
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")
DB_PORT = int(os.getenv("DB_PORT", 3306))

# Sembol listesi (İsterseniz history tablosundaki mevcut sembolleri çekebiliriz)
symbols = ['BTCUSDT', 'ETHUSDT', 'ETCUSDT', 'BCHUSDT', 'ADAUSDT', 'GMTUSDT', 'MANAUSDT', 'XRPUSDT'] # Örnek olarak güncellendi

# Kanal bilgileri
channels = [
    {"room_id": "-1002186543981", "signalgrup": "2186543981", "room_name": "Orca Trade Bot Deneme"},
    # Diğer kanalları ekleyebilirsiniz
]

HISTORY_TIMEFRAME = '5m' # History tablosundaki zaman aralığı

def get_db_connection():
    """Veritabanı bağlantısı kurar (PyMySQL kullanarak)."""
    try:
        cnx = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            passwd=DB_PASSWORD,
            db=DB_NAME,
            port=DB_PORT,
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor # DictCursor kullanılıyor
        )
        # print("Veritabanı bağlantısı başarılı (PyMySQL).")
        return cnx
    except pymysql.Error as err:
        print(f"Veritabanı bağlantı hatası (PyMySQL): {err}")
        return None

def get_history_price(cursor, symbol, target_datetime):
    """Belirtilen sembol ve zamana en yakın 5dk'lık mumun kapanış fiyatını alır."""
    # Hedef zamanı UTC'ye çevirelim (eğer değilse)
    if target_datetime.tzinfo is None:
        target_datetime = target_datetime.replace(tzinfo=timezone.utc)
    else:
        target_datetime = target_datetime.astimezone(timezone.utc)

    # 5 dakikanın başlangıcına yuvarla
    minute_floor = (target_datetime.minute // 5) * 5
    rounded_datetime = target_datetime.replace(minute=minute_floor, second=0, microsecond=0)
    rounded_datetime_str = rounded_datetime.strftime('%Y-%m-%d %H:%M:%S')

    query = f"""
    SELECT close
    FROM history
    WHERE symbol = %s
      AND timeframe = %s
      AND time = %s
    LIMIT 1
    """
    try:
        cursor.execute(query, (symbol, HISTORY_TIMEFRAME, rounded_datetime_str))
        result = cursor.fetchone()
        if result:
            return float(result['close'])
        else:
            # print(f" Uyarı: {symbol} için {rounded_datetime_str} zamanında fiyat bulunamadı.")
            # Eğer tam eşleşme yoksa, önceki veya sonraki mumu arayabiliriz, şimdilik None dönelim.
            return None
    except pymysql.Error as err:
        print(f" DB Hatası (get_history_price): {err}")
        return None
    except Exception as e:
        print(f" Genel Hata (get_history_price): {e}")
        return None

def calculate_entry_prices(base_price, trend):
    """Entry fiyatlarını hesapla (Bu fonksiyonu koruyabiliriz veya direkt open_price'ı entry1 yapabiliriz)"""
    entry1 = base_price # İlk giriş gerçek fiyat olsun
    if trend == 'LONG':
        # entry2 = round(entry1 * 1.001, 8) # Çok küçük bir fark olabilir veya kaldırılabilir
        entry2 = entry1 # Şimdilik aynı yapalım
    else:
        # entry2 = round(entry1 * 0.999, 8)
        entry2 = entry1 # Şimdilik aynı yapalım
    return entry1, entry2

def calculate_tp_levels(entry_price, trend, num_tps):
    """Take profit seviyelerini gerçek giriş fiyatına göre hesapla"""
    tp_levels = []
    for i in range(num_tps):
        percentage_increase = (i + 1) * 0.005 # Her seviye %0.5 artış/azalış (daha gerçekçi)
        if trend == 'LONG':
            tp = round(entry_price * (1 + percentage_increase), 8)
        else:
            tp = round(entry_price * (1 - percentage_increase), 8)
        tp_levels.append(tp)
    return tp_levels

def simulate_signal(cursor, symbol, opendate_dt, open_price, trend, tp_levels, sl_price):
    """Sinyalin açılışından sonra TP veya SL'ye ulaşıp ulaşmadığını simüle eder."""
    max_simulation_duration = timedelta(days=3) # Maksimum ne kadar süre takip edilecek
    end_simulation_dt = opendate_dt + max_simulation_duration

    # Açılış sonrası mumları çek
    query = f"""
    SELECT time, open, high, low, close
    FROM history
    WHERE symbol = %s
      AND timeframe = %s
      AND time > %s
      AND time <= %s
    ORDER BY time ASC
    """
    try:
        start_time_str = opendate_dt.strftime('%Y-%m-%d %H:%M:%S')
        end_time_str = end_simulation_dt.strftime('%Y-%m-%d %H:%M:%S')
        cursor.execute(query, (symbol, HISTORY_TIMEFRAME, start_time_str, end_time_str))
        candles = cursor.fetchall()

        if not candles:
            # print(f" Uyarı: {symbol} için {start_time_str} sonrası simülasyon verisi bulunamadı.")
            return None, None, "NoData" # Kapanış simüle edilemedi

        active_sl = sl_price
        active_tp_levels = sorted(tp_levels) # Küçükten büyüğe sırala

        for candle in candles:
            candle_time = candle['time']
            candle_high = float(candle['high'])
            candle_low = float(candle['low'])

            # SL Kontrolü
            if active_sl is not None:
                if (trend == 'LONG' and candle_low <= active_sl) or \
                   (trend == 'SHORT' and candle_high >= active_sl):
                    return active_sl, candle_time, "SL Hit"

            # TP Kontrolü (En düşük TP'den başlayarak)
            for tp_price in (active_tp_levels if trend == 'LONG' else reversed(active_tp_levels)):
                 if (trend == 'LONG' and candle_high >= tp_price) or \
                    (trend == 'SHORT' and candle_low <= tp_price):
                     # İlk ulaşılan TP seviyesinde kapat
                     return tp_price, candle_time, f"TP{tp_levels.index(tp_price) + 1} Hit"

        # Döngü bitti ama TP/SL olmadıysa, son mumun kapanışıyla kapat
        last_candle = candles[-1]
        # print(f" Uyarı: {symbol} için TP/SL'ye ulaşılamadı ({max_simulation_duration} içinde). Son mumla kapatılıyor.")
        return float(last_candle['close']), last_candle['time'], "Timeout"

    except pymysql.Error as err:
        print(f" DB Hatası (simulate_signal): {err}")
        return None, None, "DBError"
    except Exception as e:
        print(f" Genel Hata (simulate_signal): {e}")
        return None, None, "SimError"

def generate_signal(cursor):
    """Tek bir sinyal oluşturur ve sonucunu simüle eder."""
    symbol = random.choice(symbols)
    trend = random.choice(['LONG', 'SHORT'])

    # Rastgele bir başlangıç tarihi (son 60 gün içinde)
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=random.randint(1, 60), hours=random.randint(0, 23), minutes=random.randint(0, 59))

    # Bu tarih için geçmiş fiyatı al
    open_price = get_history_price(cursor, symbol, start_date)

    if open_price is None or open_price <= 0:
        return None

    entry1 = open_price
    entry2 = open_price

    # TP/SL seviyelerini hesapla
    num_tps = random.randint(5, 10)
    tp_levels = calculate_tp_levels(entry1, trend, num_tps)
    sl_percentage = 0.01
    if trend == 'LONG':
        sl_price = round(entry1 * (1 - sl_percentage), 8)
    else:
        sl_price = round(entry1 * (1 + sl_percentage), 8)
    stoploss = sl_price

    # Opendate'i 5dk'ya yuvarla
    minute_floor_open = (start_date.minute // 5) * 5
    opendate_dt = start_date.replace(minute=minute_floor_open, second=0, microsecond=0)
    opendate = opendate_dt.strftime('%Y-%m-%d %H:%M:%S')

    # Sinyali simüle et
    simulated_close_price, simulated_closedate_dt, close_reason = simulate_signal(
        cursor, symbol, opendate_dt, open_price, trend, tp_levels, sl_price
    )

    close_price = 0
    closedate = ''
    profit = 0
    status = 'open' # Varsayılan olarak açık

    if simulated_close_price is not None and simulated_closedate_dt is not None:
        close_price = simulated_close_price
        # closedate'i de 5dk'ya yuvarlayabiliriz veya direkt kullanabiliriz
        closedate = simulated_closedate_dt.strftime('%Y-%m-%d %H:%M:%S')
        status = 'closed' # Simülasyon sonucu kapanış varsa

        # Kar/Zarar Hesapla
        if trend == 'LONG':
            profit = ((close_price - entry1) / entry1) * 100
        else:
            profit = ((entry1 - close_price) / entry1) * 100
    else:
        # Simülasyon başarısız olduysa veya veri yoksa, sinyali 'açık' bırakabiliriz
        # veya belirli bir varsayılanla kapatabiliriz.
        # Şimdilik açık bırakalım
        # print(f" Simülasyon başarısız ({close_reason}). Sinyal açık kalacak: {symbol} @ {opendate}")
        pass # status zaten 'open'

    # Take profit hedefi (son TP seviyesi)
    takeprofit = tp_levels[-1]
    channel = random.choice(channels)

    signal_data = {
        'signalgrup': channel['signalgrup'],
        'signalid': f"signal_{int(time.time())}_{random.randint(1000, 9999)}_{generated_count}", # Benzersizlik için sayacı ekle
        'signal_data': f"{trend} {entry1}",
        'symbol': symbol,
        'trend': trend,
        'entry1': entry1,
        'entry2': entry2,
        'sl': sl_price, # sl_price değişkenini kullanalım
        'tp1': tp_levels[0] if len(tp_levels) > 0 else 0,
        'tp2': tp_levels[1] if len(tp_levels) > 1 else 0,
        'tp3': tp_levels[2] if len(tp_levels) > 2 else 0,
        'tp4': tp_levels[3] if len(tp_levels) > 3 else 0,
        'tp5': tp_levels[4] if len(tp_levels) > 4 else 0,
        'tp6': tp_levels[5] if len(tp_levels) > 5 else 0,
        'tp7': tp_levels[6] if len(tp_levels) > 6 else 0,
        'tp8': tp_levels[7] if len(tp_levels) > 7 else 0,
        'tp9': tp_levels[8] if len(tp_levels) > 8 else 0,
        'tp10': tp_levels[9] if len(tp_levels) > 9 else 0,
        'tarih': opendate,
        'tickdate': opendate,
        'bid': entry1,
        'ask': entry1,
        'open': entry1,
        'opendate': opendate,
        'stoploss': stoploss, # stoploss değişkenini kullanalım
        'takeprofit': takeprofit,
        'close': close_price,
        'closedate': closedate,
        'profit': profit,
        'last_tp': tp_levels[0] if len(tp_levels) > 0 else 0,
        'last_sl': sl_price
    }
    return signal_data

# Global sayaç eklendi
generated_count = 0

def main():
    global generated_count # Global sayacı kullan
    conn = None
    cursor = None
    try:
        # Veritabanına bağlan
        conn = get_db_connection()
        if not conn:
            return
        cursor = conn.cursor()

        # Mevcut sinyalleri temizle
        cursor.execute("TRUNCATE TABLE signals2")
        print("Mevcut sinyaller temizlendi.")

        # Sinyal oluştur ve ekle
        generated_count = 0 # Sayacı sıfırla
        target_count = 1500
        max_attempts = target_count * 10 # Deneme limitini artıralım, simülasyon/veri eksikliği olabilir
        attempts = 0

        while generated_count < target_count and attempts < max_attempts:
            attempts += 1
            signal = generate_signal(cursor) # cursor'ı fonksiyona gönder

            if signal is None:
                continue # Geçerli sinyal üretilemediyse atla

            # SQL sorgusu
            columns = ', '.join([f'`{k}`' for k in signal.keys()])
            placeholders = ', '.join(['%s'] * len(signal))
            sql = f"INSERT INTO signals2 ({columns}) VALUES ({placeholders})"

            # Değerleri hazırla
            values = tuple(signal.values())

            try:
                # Sorguyu çalıştır
                cursor.execute(sql, values)
                generated_count += 1
                conn.commit()

                # Her 100 sinyalde bir ilerleme göster
                if generated_count % 100 == 0 or True:
                    print(f" {generated_count}/{target_count} sinyal oluşturuldu...")
            except pymysql.Error as insert_err:
                print(f"\nDB Insert Hatası: {insert_err}")
                print(f"   SQL: {sql}")
                print(f"   Values: {values}")
                # Hatalı durumda döngüden çıkabilir veya devam edebiliriz.
                # break

        # Değişiklikleri kaydet (Her insert sonrası commit yerine sonda tek commit)
        conn.commit()
        print(f"\nToplam {generated_count} adet demo sinyal başarıyla oluşturuldu ({attempts} deneme yapıldı).")

    except pymysql.Error as err:
        print(f"Genel DB Hatası: {err}")
    except Exception as e:
        print(f"Beklenmedik Hata: {e}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
            # print("Veritabanı bağlantısı kapatıldı.")

if __name__ == "__main__":
    main() 