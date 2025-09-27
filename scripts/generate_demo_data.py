import mysql.connector
import random
import json
from datetime import datetime, timedelta

# Sabit değerler
SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'MATICUSDT']
TRENDS = ['LONG', 'SHORT']
SIGNAL_GROUPS = [123456789, 987654321, 456789123]  # bot_rooms tablosundaki room_id'ler ile eşleşmeli

def random_float(min_val, max_val, decimals=8):
    """Belirtilen aralıkta rastgele ondalıklı sayı üretir"""
    val = random.uniform(min_val, max_val)
    return round(val, decimals)

def random_date(start, end):
    """İki tarih arasında rastgele bir tarih üretir"""
    time_between = end - start
    days_between = time_between.days
    random_days = random.randrange(days_between)
    random_seconds = random.randrange(86400)  # 24 saat = 86400 saniye
    return start + timedelta(days=random_days, seconds=random_seconds)

def generate_signal(index):
    """Tek bir sinyal verisi oluşturur"""
    now = datetime.now()
    thirty_days_ago = now - timedelta(days=30)
    
    open_date = random_date(thirty_days_ago, now)
    is_closed = random.random() > 0.2  # %80 ihtimalle kapanmış pozisyon
    close_date = random_date(open_date, now) if is_closed else None
    
    symbol = random.choice(SYMBOLS)
    trend = random.choice(TRENDS)
    signalgrup = random.choice(SIGNAL_GROUPS)
    
    open_price = random_float(0.1, 100000)
    close_price = random_float(0.1, 100000) if is_closed else 0
    
    # Kâr hesaplama
    profit = 0
    if close_price > 0:
        if trend == 'LONG':
            profit = ((close_price - open_price) / open_price) * 100
        else:
            profit = ((open_price - close_price) / open_price) * 100
    
    return {
        'signalgrup': signalgrup,
        'signalid': index + 1,
        'signal_data': json.dumps({
            'message_id': random.randint(1, 1000000),
            'chat_id': signalgrup
        }),
        'symbol': symbol,
        'trend': trend,
        'entry1': random_float(0.1, 100000),
        'entry2': random_float(0.1, 100000),
        'sl': random_float(0.1, 100000),
        'tp1': random_float(0.1, 100000),
        'tp2': random_float(0.1, 100000),
        'tp3': random_float(0.1, 100000),
        'tp4': random_float(0.1, 100000),
        'tp5': random_float(0.1, 100000),
        'tp6': random_float(0.1, 100000),
        'tp7': random_float(0.1, 100000),
        'tp8': random_float(0.1, 100000),
        'tp9': random_float(0.1, 100000),
        'tp10': random_float(0.1, 100000),
        'tarih': datetime.now().isoformat(),
        'tickdate': int(datetime.now().timestamp()),
        'bid': random_float(0.1, 100000),
        'ask': random_float(0.1, 100000),
        'open': open_price,
        'opendate': open_date.isoformat(),
        'stoploss': random_float(0.1, 100000),
        'takeprofit': random_float(0.1, 100000),
        'close': close_price,
        'closedate': close_date.isoformat() if close_date else None,
        'profit': profit,
        'last_tp': random_float(0.1, 100000),
        'last_sl': random_float(0.1, 100000)
    }

def main():
    # Veritabanı bağlantı bilgileri
    db_config = {
        'host': 'localhost',
        'user': 'root',
        'password': '',  # Veritabanı şifrenizi buraya girin
        'database': 'orcatradebot'
    }
    
    try:
        # Veritabanına bağlan
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        # 100 adet sinyal oluştur
        signals = [generate_signal(i) for i in range(100)]
        
        # Sinyalleri 10'lu gruplar halinde ekle
        batch_size = 10
        for i in range(0, len(signals), batch_size):
            batch = signals[i:i + batch_size]
            
            # Her bir sinyal için INSERT sorgusu oluştur
            for signal in batch:
                placeholders = ', '.join(['%s'] * len(signal))
                columns = ', '.join(signal.keys())
                sql = f"INSERT INTO signals2 ({columns}) VALUES ({placeholders})"
                values = tuple(signal.values())
                
                cursor.execute(sql, values)
            
            conn.commit()
            print(f"Sinyaller {i + 1} - {min(i + batch_size, len(signals))} eklendi")
        
        print("Demo veriler başarıyla oluşturuldu!")
        
    except mysql.connector.Error as err:
        print(f"Hata oluştu: {err}")
    
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()
            print("Veritabanı bağlantısı kapatıldı")

if __name__ == "__main__":
    main() 