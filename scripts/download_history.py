# scripts/download_history.py
# import mysql.connector
import pymysql # Değiştirildi
import os
from dotenv import load_dotenv
import ccxt
import time
from datetime import datetime, timedelta, timezone
import re # Regex için import
# import asyncio # Async için import - KALDIRILDI

# .env dosyasını yükle (script'in bir üst dizininde olduğunu varsayalım)
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path=dotenv_path)

# --- Ayarlar ---
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")
DB_PORT = int(os.getenv("DB_PORT", 3306)) # Port integer olmalı

TIMEFRAME = '5m'
MONTHS_AGO = 2
EXCHANGE_ID = 'binanceusdm' # Veya 'binance' (spot için)
CCXT_LIMIT = 1000 # ccxt fetchOHLCV limiti
API_RATE_LIMIT_DELAY = 0.2 # Saniye cinsinden API istekleri arası bekleme süresi
HISTORY_TABLE = "history"
SIGNALS_TABLE = "signals2"
TOP_N_SYMBOLS = 50 # En çok işlem gören kaç sembol çekilecek
# ---------------

def get_db_connection():
    """Veritabanı bağlantısı kurar (PyMySQL kullanarak)."""
    try:
        # PyMySQL bağlantı parametreleri
        cnx = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            passwd=DB_PASSWORD, # parametre adı değişti
            db=DB_NAME,         # parametre adı değişti
            port=DB_PORT,
            charset='utf8mb4',
            cursorclass=pymysql.cursors.Cursor # Standart cursor
            # autocommit=False varsayılan olarak PyMySQL'de False'tur,
            # cnx.commit() ve cnx.rollback() ile yönetiyoruz.
        )
        print("Veritabanı bağlantısı başarılı (PyMySQL).")
        return cnx
    except pymysql.Error as err:
        print(f"Veritabanı bağlantı hatası (PyMySQL): {err}")
        return None

def insert_history_data(cursor, symbol_db, data):
    """Geçmiş OHLCV verisini history tablosuna ekler."""
    if not data:
        return 0

    query = f"""
    INSERT IGNORE INTO {HISTORY_TABLE}
    (symbol, timeframe, time, open, high, low, close, volume)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """

    # ccxt'den gelen formatı veritabanı formatına çevir
    values = [
        (
            symbol_db,  # DB formatındaki sembol (örn: BTCUSDT)
            TIMEFRAME,
            # CCXT timestamp milisaniye cinsinden, MySQL DATETIME için saniyeye çevirip formatla
            datetime.fromtimestamp(candle[0] / 1000, tz=timezone.utc),
            float(candle[1]), # open
            float(candle[2]), # high
            float(candle[3]), # low
            float(candle[4]), # close
            float(candle[5])  # volume
        ) for candle in data
    ]

    try:
        # Toplu ekleme (daha verimli)
        cursor.executemany(query, values)
        # print(f"  -> DB ({symbol_db}): {cursor.rowcount} kayıt eklenmeye çalışıldı.")
        return cursor.rowcount # Etkilenen (eklenen/yok sayılan) satır sayısı
    except pymysql.Error as err:
        print(f"  -> DB Hatası ({symbol_db}): Veri eklenirken hata (PyMySQL): {err}")
        raise err # Hatayı yukarı taşıyıp rollback tetikleyelim

def fetch_all_symbol_history(symbol_ccxt, start_dt):
    """Belirtilen sembol için tüm geçmiş veriyi çeker (Senkron)."""
    # ccxt.pro yerine ccxt kullanıldı
    try:
        exchange = getattr(ccxt, EXCHANGE_ID)()
    except AttributeError:
        print(f"Hata: Belirtilen exchange ID '{EXCHANGE_ID}' ccxt kütüphanesinde bulunamadı.")
        return None
    except Exception as e:
        print(f"Hata: Exchange objesi oluşturulurken hata: {e}")
        return None

    print(f"\n[{symbol_ccxt}] Geçmiş veri çekiliyor ({TIMEFRAME})... Başlangıç: {start_dt.strftime('%Y-%m-%d %H:%M:%S')} UTC")
    all_ohlcv = []
    since = int(start_dt.timestamp() * 1000) # Milisaniye cinsinden timestamp
    now = int(datetime.now(timezone.utc).timestamp() * 1000)
    total_fetched = 0

    while since < now:
        try:
            # print(f"  -> Fetching {TIMEFRAME} since {datetime.fromtimestamp(since / 1000, tz=timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC...")
            ohlcv = exchange.fetch_ohlcv(symbol_ccxt, TIMEFRAME, since, CCXT_LIMIT)

            if not ohlcv:
                # print(f"  -> {symbol_ccxt} için {datetime.fromtimestamp(since / 1000, tz=timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC sonrası veri bulunamadı.")
                break # Daha fazla veri yok

            total_fetched += len(ohlcv)
            all_ohlcv.extend(ohlcv)

            # Bir sonraki 'since' timestamp'ini ayarla
            since = ohlcv[-1][0] + exchange.parse_timeframe(TIMEFRAME) * 1000

            print(f"\r  -> Fetched: {total_fetched} bars...", end="") # İlerlemeyi göster

            # API limitlerini aşmamak için bekleme
            time.sleep(API_RATE_LIMIT_DELAY)

        except ccxt.RateLimitExceeded as e:
            print(f"\n  -> Rate limit aşıldı ({symbol_ccxt}). 60 saniye bekleniyor... Hata: {e}")
            time.sleep(60)
        except ccxt.NetworkError as e:
            print(f"\n  -> Ağ Hatası ({symbol_ccxt}). 10 saniye bekleniyor... Hata: {e}")
            time.sleep(10)
        except ccxt.ExchangeError as e:
            # Belirli hataları tolere et (örn: 'Market does not exist')
            if 'exist' in str(e).lower():
                 print(f"\n  -> Borsa Hatası ({symbol_ccxt}): Market bulunamadı. Atlanıyor.")
            else:
                print(f"\n  -> Borsa Hatası ({symbol_ccxt}): {e}. Bu sembol atlanıyor.")
            return None # Hatalı sembol için None döndür
        except Exception as e:
            print(f"\n  -> Genel Hata ({symbol_ccxt}): {e}. Bu sembol atlanıyor.")
            return None # Hatalı sembol için None döndür

    print(f"\r  -> Fetched: {total_fetched} bars. Tamamlandı.               ")
    return all_ohlcv

def get_base_quote(symbol_db):
    """DB sembol formatını (örn: BTCUSDT) base ve quote'a ayırır."""
    for quote in ['USDT', 'BUSD', 'USDC', 'TUSD', 'DAI']:
        if symbol_db.endswith(quote):
            base = symbol_db[:-len(quote)]
            return base, quote
    return None, None

def run_script():
    """Ana script fonksiyonu."""
    cnx = None
    cursor = None
    total_inserted_rows = 0
    processed_symbols = 0

    try:
        cnx = get_db_connection()
        if not cnx:
            return

        cursor = cnx.cursor()

        # 1. History tablosunu temizle
        print(f"\n'{HISTORY_TABLE}' tablosu temizleniyor (TRUNCATE)...")
        cursor.execute(f'TRUNCATE TABLE {HISTORY_TABLE}')
        cnx.commit() # TRUNCATE sonrası commit gerekli olabilir
        print(f"'{HISTORY_TABLE}' tablosu başarıyla temizlendi.")

        # 2. Belirtilen sembol listesini tanımla
        symbols_to_fetch_config = [
            'BTCUSDT',
            'ETHUSDT',
            'SOLUSDT',
            'DOGEUSDT',
            'XRPUSDT',
            'BNBUSDT',
            'ADAUSDT',
            'AVAXUSDT',
            'LTCUSDT',
            'DOTUSDT',
            'SHIBUSDT',
            'MATICUSDT',
            'LINKUSDT',
            'UNIUSDT',
            'TRXUSDT',
            'NEARUSDT',
            'FTMUSDT',
            'SUIUSDT',
            'ORDIUSDT',
            'SEIUSDT',
            'WIFUSDT',
            'FETUSDT',
            'AAVEUSDT',
            'TONUSDT',
            'TIAUSDT',
            'RUNEUSDT',
            'ARBUSDT',
            'TAOUSDT',
            'PEPEUSDT',
            'DOGSUSDT'
        ]

        symbols_to_fetch = []
        for symbol_db in symbols_to_fetch_config:
            # Binance Futures (USDM) için CCXT formatını oluştur (Genellikle BASE/QUOTE:QUOTE)
            # Önce base ve quote ayır
            base, quote = get_base_quote(symbol_db)
            if base and quote:
                symbol_ccxt = f"{base}/{quote}:{quote}" # veya sadece f"{base}/{quote}" olabilir, exchange'e göre değişir.
                                                        # Binance USDM için :QUOTE kısmı genelde eklenir.
                symbols_to_fetch.append({'db': symbol_db, 'ccxt': symbol_ccxt})
            else:
                print(f"Uyarı: '{symbol_db}' sembolü bilinen bir quote para birimi ile bitmiyor, atlanıyor.")


        if not symbols_to_fetch:
            print("İşlenecek geçerli sembol bulunamadı, script sonlandırılıyor.")
            return

        # 3. Sembol listesini yazdır (Dosyaya yazma kaldırıldı)
        print(f"\nİndirilecek {len(symbols_to_fetch)} sembol:")
        for i, s in enumerate(symbols_to_fetch):
            print(f" {i+1}. {s['ccxt']} (DB: {s['db']})")

        # 4. Her sembol için geçmiş veriyi çek ve kaydet
        for symbol_info in symbols_to_fetch:
            symbol_db = symbol_info['db']
            symbol_ccxt = symbol_info['ccxt']

            start_fetch_dt = datetime.now(timezone.utc) - timedelta(days=MONTHS_AGO * 30) # Veri çekme başlangıcı

            ohlcv_data = fetch_all_symbol_history(symbol_ccxt, start_fetch_dt)

            if ohlcv_data:
                try:
                    # Veriyi DB'ye yaz (sync fonksiyon içinde)
                    print(f"  -> DB: {symbol_db} için {len(ohlcv_data)} bar kaydediliyor...")
                    inserted_count = insert_history_data(cursor, symbol_db, ohlcv_data)
                    cnx.commit() # Her sembol sonrası commit
                    print(f"  -> DB: {symbol_db} için {inserted_count} kayıt işlemi tamamlandı (eklendi/yoksayıldı).")
                    total_inserted_rows += inserted_count # Gerçek eklenen değil, execute sonucu
                except pymysql.Error as db_err:
                    print(f"  -> DB Yazma Hatası ({symbol_db}): {db_err}. İşlem geri alınıyor.")
                    cnx.rollback() # Hata durumunda bu sembol için yapılanları geri al
                except Exception as e:
                     print(f"  -> DB Yazma sırasında beklenmedik hata ({symbol_db}): {e}. İşlem geri alınıyor.")
                     cnx.rollback()
            processed_symbols += 1

        print(f"\nTüm işlemler tamamlandı. {processed_symbols}/{len(symbols_to_fetch)} sembol işlendi.")
        # Not: total_inserted_rows tam olarak eklenen yeni satır sayısını vermez, executemany'nin döndürdüğü değeri toplar.

    except pymysql.Error as err:
        print(f"\nScript sırasında veritabanı hatası (PyMySQL): {err}")
        if cnx:
            try:
                cnx.rollback()
            except Exception as rb_err:
                print(f"Rollback sırasında hata: {rb_err}")
    except Exception as e:
        print(f"\nScript sırasında genel bir hata oluştu: {e}")
        if cnx:
            try:
                cnx.rollback()
            except Exception as rb_err:
                print(f"Rollback sırasında hata: {rb_err}")
    finally:
        if cursor:
            cursor.close()
        if cnx:
            cnx.close()
            print("Veritabanı bağlantısı kapatıldı.")

if __name__ == "__main__":
    run_script() # Ana fonksiyonu çalıştır 