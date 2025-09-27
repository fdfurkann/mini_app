import requests 
import json
import pymysql
from datetime import datetime
import time

mysql_host = "localhost" 
mysql_user = "root"
mysql_pass = "Trade!bot2021Tr"
mysql_name = "rates_server"


try:



    def to_datetime(time):
        time=int(round(float(time),0))
        rakam = datetime.utcfromtimestamp(time).strftime("%Y-%m-%d %H:%M:%S")
        return rakam
        
    conn = pymysql.connect(db=mysql_name, user=mysql_user, passwd=mysql_pass,host=mysql_host,port=3306,autocommit=True)
   
    #conn = mysql.connector.connect(host=mysql_host,port=3306,user=mysql_user,password=mysql_pass,database=mysql_name)
    
    def new_cursor():
        cursor = conn.cursor()
       
        return cursor

    import requests
    import logging

    print("live ticker Server started")
    

    def my_query(sql):
        
        try:
            
            kes = sql.lower().split(" ")
            
            if kes[0]=="select" or kes[0]=="show":
                cursor = conn.cursor(pymysql.cursors.DictCursor)
                fetch = cursor.execute(sql)
                fetch = cursor.fetchall()
                cursor.close()
                return fetch
            elif kes[0] == "create":
                cursor = conn.cursor(pymysql.cursors.DictCursor)
                cursor.execute(sql)
             
                fetch = cursor.rowcount
                cursor.close()
                return fetch
            elif kes[0] == "insert":
                cursor = conn.cursor(pymysql.cursors.DictCursor)
                cursor.execute(sql)
             
                fetch = conn.insert_id()
                cursor.close()
                return fetch
            else:
                cursor = conn.cursor(pymysql.cursors.DictCursor)
                fetch = cursor.execute(sql)
              
                cursor.close()
                return fetch    
        except Exception as ee:
            print("mysql_query(err) = ",sql,"\nError:",ee)
            return ee
    
    my_query("truncate table rates;")
    
    
except Exception as ee:
    print("mysql err:",ee)
    
first_track=0
sym_info={}

try:
    
    exch = requests.get('https://fapi.binance.com/fapi/v1/exchangeInfo') 
      
    # check status code for response received 
    # success code - 200 
    #print(exch) 
      
    # print content of request 
    exchange = json.loads(exch.content)

    for sym in exchange['symbols']:
        #print("sym:",sym)
        sym_info[sym['symbol']] = {'digits':sym['pricePrecision'],'vdigits':sym['quantityPrecision']}

    print(sym_info)
except Exception as ee:
    print("digits error:",ee)
    
while True:
    
    try:
            
        # Making a GET request 
        r = requests.get('https://fapi.binance.com/fapi/v1/ticker/price') 
        
        # print content of request 
        rates = json.loads(r.content)

        for symbol in rates:

            check = my_query("select * from rates where symbol='"+symbol['symbol']+"'")
            
            if len(check)==0:
                    
                    query1 = "INSERT INTO `rates` (`id`, `symbol`, `price`, `dates`, `digits`, `vdigits`) VALUES (NULL, '"+symbol['symbol']+"', '"+str(symbol['price'])+"', '"+str(to_datetime(round(symbol['time']/1000)))+"','"+str(sym_info[symbol['symbol']]['digits'])+"','"+str(sym_info[symbol['symbol']]['vdigits'])+"');"
                    print(query1) 
                    my_query(query1)
                    
            else:
                query2 = "update `rates` set price='"+str(symbol['price'])+"', dates='"+str(to_datetime(round(symbol['time']/1000)))+"' where symbol='"+symbol['symbol']+"';"
                #print(query2) 
                my_query(query2)
    
    except Exception as ee:
        print("ticker error:",ee)
        
        
    first_track=1
    time.sleep(1)