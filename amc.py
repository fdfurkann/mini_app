import sys
import pandas as pd
import pymysql

# Kullanım: python amc.py "SELECT ..."
if len(sys.argv) < 2:
    print("Kullanım: python amc.py 'SQL sorgusu'")
    sys.exit(1)

query = sys.argv[1]

# MySQL bağlantı bilgileri
config = {
    'user': 'root',           # Gerekirse değiştirin
    'password': 'MySql!bot2021Tr',   # Gerekirse değiştirin
    'host': 'localhost',      # Gerekirse değiştirin
    'database': 'orcatradebot',   # Gerekirse değiştirin
    'charset': 'utf8mb4'
}

try:
    conn = pymysql.connect(**config)
    df = pd.read_sql(query, conn)
    pd.set_option('display.max_rows', None)
    pd.set_option('display.max_columns', None)
    pd.set_option('display.width', None)
    pd.set_option('display.max_colwidth', None)
    print(df)
    conn.close()
except Exception as e:
    print(f'Hata: {e}') 