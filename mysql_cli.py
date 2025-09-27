import sys
import pandas as pd
import pymysql
import json

# MySQL bağlantı bilgileri
host = 'localhost'
db = 'orcatradebot'
user = 'root'
password = 'MySql!bot2021Tr'
charset = 'utf8mb4'

if len(sys.argv) < 2:
    print('Kullanım: python mysql_cli.py "SQL_SORGUSU"')
    sys.exit(1)

sql = sys.argv[1]

try:
    conn = pymysql.connect(
        host=host,
        user=user,
        password=password,
        database=db,
        charset=charset,
        cursorclass=pymysql.cursors.DictCursor
    )
    with conn.cursor() as cursor:
        cursor.execute(sql)
        rows = cursor.fetchall()
        if not rows:
            print('(Boş sonuç)')
        else:
            for row in rows:
                print(json.dumps(row, ensure_ascii=False))
    conn.close()
except Exception as e:
    print(f'Hata: {e}')
    sys.exit(2)
