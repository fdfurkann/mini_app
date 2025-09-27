#!/usr/bin/python

# This is a simple echo bot using the decorator mechanism.
# It echoes any incoming text messages.

import telebot
import pandas as pd
import numpy as np
import ccxt
import time 
import sqlite3
from datetime import datetime
from threading import Thread

from telebot import types
import sys
import pymysql
import json
import re
import config
import threading
import traceback
import time
import datetime as dtm

bot_adi = config.bot_adi
bot_url= config.bot_url
root_id=config.root_id
mysql_host = config.mysql_host
mysql_user = config.mysql_user
mysql_pass = config.mysql_pass
mysql_name = config.mysql_name


development_mode = config.development_mode

odeme_API_KEY = config.odeme_API_KEY
odeme_API_SECRET = config.odeme_API_SECRET
odeme_IPN_URL = config.odeme_IPN_URL

odeme_currency1 = config.odeme_currency1
odeme_currency2 = config.odeme_currency2
odeme_buyer_email = config.odeme_buyer_email

#API_TOKEN = '5215610634:AAFzDpCqp5rqJsRmNSSsuQY1kI6srfHkt0E'
#API_TOKEN = '5281722345:AAFmMkEQ3tgLQ0wYXCOZYY1VDm7ld3Ca1HE'
API_TOKEN = config.API_TOKEN

bildirim_gonder=config.bildirim_gonder
ch_bildirim_gonder=config.ch_bildirim_gonder


import asyncio
from telebot.async_telebot import AsyncTeleBot
import time 
import matplotlib
import matplotlib.pyplot as plt
import mplfinance as mpf

import base64
import sys
from binance.client import Client
from binance.enums import *
from binance.exceptions import BinanceAPIException, BinanceOrderException
from decimal import Decimal

import os 

if not os.path.exists("./kar_grafik"):
  os.makedirs("./kar_grafik")
  print("./kar_grafik directory is created!")

if not os.path.exists("./screenshots"):
  os.makedirs("./screenshots")
  print("./screenshots directory is created!")

client = Client()
 

# Tüm paritelerin `digits` ve `volume_digits` bilgilerini saklamak için bir sözlük
pair_info = {}

# Borsadaki tüm semboller ve işlem detaylarını almak için `exchange_info` endpoint'ini kullan
exchange_info = client.futures_exchange_info()


def calc_digits(rakam):
    hesap1 = int(round(1.0/float(rakam),8))
    hesap2 = len(str(hesap1))-1
    return hesap2

for key in exchange_info['symbols']:
    symbol = key['symbol']
  
    pair_info[symbol]={}
    
    for ft in key['filters']:
        if ft['filterType'] == "PRICE_FILTER":
            digits = calc_digits(round(float(ft['tickSize']),10))
            pair_info[symbol]['digits']=digits
        if ft['filterType'] == "LOT_SIZE":
            vdigits = calc_digits(round(float(ft['minQty']),10))
            pair_info[symbol]['vdigits']=vdigits
    
    print("pair_info[",symbol,"] digits:",digits," vdigits:",vdigits)



sql_tables = '''CREATE TABLE IF NOT EXISTS `apigruplari` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL,
  `api_id` bigint(20) NOT NULL,
  `grup_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `apikeys` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `exchange` varchar(100) NOT NULL,
  `api_key` varchar(300) NOT NULL,
  `api_secret` varchar(300) NOT NULL,
  `lotsize` varchar(100) NOT NULL,
  `leverage` int(11) NOT NULL,
  `durum` int(11) NOT NULL,
  `strateji` varchar(500) NOT NULL,
  `pos_type` varchar(500) NOT NULL,
  `max_emir` int(11) NOT NULL,
  `trail` double NOT NULL,
  `gstoploss` double NOT NULL,
  `maxmargin` double NOT NULL,
  `isleme_giris` int(1) NOT NULL,
  `sl_kapali` int(11) NOT NULL,
  `tp_direk_kapat` int(11) NOT NULL,
  `abonelik` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `api_signals` (
  `id` int(11) NOT NULL,
  `api_id` int(11) NOT NULL,
  `signalid` int(11) NOT NULL,
  `start` int(11) NOT NULL,
  `open` double NOT NULL,
  `sl` double NOT NULL,
  `close` double NOT NULL,
  `lot` double NOT NULL,
  `leverage` int(11) NOT NULL,
  `volume` double NOT NULL,
  `ticket` bigint(20) NOT NULL,
  `last_volume` double NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `bildirimler` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL,
  `msg` text NOT NULL,
  `gonderim` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `bildirimler_ch` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `post_id` int(11) NOT NULL,
  `symbol` varchar(50) NOT NULL,
  `trend` varchar(20) NOT NULL,
  `open` double NOT NULL,
  `opendate` varchar(50) NOT NULL,
  `sl` double NOT NULL,
  `last` double NOT NULL,
  `lastdate` varchar(50) NOT NULL,
  `cmd` varchar(50) NOT NULL,
  `profit` double NOT NULL,
  `msg` varchar(500) NOT NULL,
  `gonderim` int(11) NOT NULL,
  `result` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `channel_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `msg` text NOT NULL,
  `tarih` datetime NOT NULL,
  `durum` int(1) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `genel_ayarlar` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `acilis_mesaji` varchar(500) NOT NULL,
  `root` int(11) NOT NULL,
  `durum` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `komutlar` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL,
  `tur` varchar(100) NOT NULL,
  `msg_id` int(11) NOT NULL,
  `msg` varchar(300) NOT NULL,
  `date` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL,
  `tarih` varchar(30) NOT NULL,
  `api_id` int(11) NOT NULL,
  `signal_id` int(11) NOT NULL,
  `usignal_id` int(11) NOT NULL,
  `msg` varchar(500) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `odemeler` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL,
  `txn_id` varchar(200) NOT NULL,
  `tarih` datetime NOT NULL,
  `checkout_url` varchar(250) NOT NULL,
  `status_url` varchar(250) NOT NULL,
  `qrcode_url` varchar(250) NOT NULL,
  `address` varchar(500) NOT NULL,
  `sure` int(2) NOT NULL,
  `tutar` double NOT NULL,
  `status` int(1) NOT NULL,
  `json_result` varchar(500) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `odemeyontem` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sure` int(11) NOT NULL,
  `ucret` double NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `referral` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL,
  `ref_id` bigint(20) NOT NULL,
  `tarih` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `satislar` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uyeid` bigint(20) NOT NULL,
  `username` varchar(100) NOT NULL,
  `tarih` varchar(50) NOT NULL,
  `sure` int(11) NOT NULL,
  `adminid` bigint(20) NOT NULL,
  `adminname` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `sessions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL,
  `keys` varchar(200) NOT NULL,
  `values` varchar(500) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `signals` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `signalgrup` int(11) NOT NULL,
  `signalid` int(11) NOT NULL,
  `signal_data` text NOT NULL,
  `symbol` varchar(50) NOT NULL,
  `trend` varchar(50) NOT NULL,
  `entry1` double NOT NULL,
  `entry2` double NOT NULL,
  `sl` double NOT NULL,
  `tp1` double NOT NULL,
  `tp2` double NOT NULL,
  `tp3` double NOT NULL,
  `tp4` double NOT NULL,
  `tp5` double NOT NULL,
  `tarih` varchar(30) NOT NULL,
  `tickdate` bigint(25) NOT NULL,
  `bid` double NOT NULL,
  `ask` double NOT NULL,
  `open` double NOT NULL,
  `opendate` varchar(30) NOT NULL,
  `stoploss` double NOT NULL,
  `takeprofit` double NOT NULL,
  `close` double NOT NULL,
  `closedate` varchar(30) NOT NULL,
  `profit` double NOT NULL,
  `last_tp` int(11) NOT NULL,
  `last_sl` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `signals_raw` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` varchar(50) NOT NULL,
  `group_name` varchar(50) NOT NULL,
  `msg_id` varchar(50) NOT NULL,
  `msg_date` varchar(50) NOT NULL,
  `msg_text` text NOT NULL,
  `status` int(1) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `signal_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `signal_id` int(11) NOT NULL,
  `msg` varchar(300) NOT NULL,
  `date` varchar(30) NOT NULL,
  `status` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `sinyalgrup` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `isim` varchar(200) NOT NULL,
  `tur` varchar(50) NOT NULL,
  `durum` int(1) NOT NULL,
  `telegram_id` bigint(20) NOT NULL,
  `msgid` bigint(20) NOT NULL,
  `invite_link` varchar(150) NOT NULL,
  `deneme_suresi` int(11) NOT NULL,
  `ucretsiz_kanal` varchar(100) NOT NULL,
  `ucretsiz_kanal_id` bigint(20) NOT NULL,
  `kar_grafik_tp` int(11) NOT NULL,
  `referans_komisyon` double NOT NULL,
  `max_api_adet` int(11) NOT NULL,
  `max_api_ucret` double NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `sinyaller` (
  `ID` int(11) NOT NULL,
  `sinyalgrup` int(11) NOT NULL,
  `signalid` int(11) NOT NULL,
  `symbol` varchar(100) NOT NULL,
  `trend` varchar(100) NOT NULL,
  `entry1` double NOT NULL,
  `entry2` double NOT NULL,
  `sl` double NOT NULL,
  `tp1` double NOT NULL,
  `tp2` double NOT NULL,
  `tp3` double NOT NULL,
  `tp4` double NOT NULL,
  `tp5` double NOT NULL,
  `tarih` int(11) NOT NULL,
  `durum` int(11) NOT NULL,
  `sgn_open` double NOT NULL,
  `sgn_sl` double NOT NULL,
  `sgn_tp` double NOT NULL,
  `sgn_close` double NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `tradelog` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL,
  `api_signal_id` int(11) NOT NULL,
  `msg` text CHARACTER SET utf8mb4 NOT NULL,
  `tarih` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL,
  `username` varchar(500) NOT NULL,
  `first_name` varchar(500) NOT NULL,
  `last_name` varchar(500) NOT NULL,
  `tarih` double NOT NULL,
  `abonelik` double NOT NULL,
  `sonislem` double NOT NULL,
  `raw_data` varchar(500) NOT NULL,
  `durum` int(11) NOT NULL,
  `api_yok_bildirim` int(11) NOT NULL,
  `abone_degil_bildirim` int(11) NOT NULL,
  `api_onayi_bildirim` int(11) NOT NULL,
  `api_grup_bildirim` int(11) NOT NULL,
  `api_hakki` int(1) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `user_signals` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL,
  `api_id` int(11) NOT NULL,
  `signal_id` int(11) NOT NULL,
  `lotsize` double NOT NULL,
  `levelage` int(11) NOT NULL,
  `strateji` varchar(20) NOT NULL,
  `ticket` bigint(20) NOT NULL,
  `symbol` varchar(50) NOT NULL,
  `trend` varchar(30) NOT NULL,
  `open` double NOT NULL,
  `opentime` varchar(30) NOT NULL,
  `volume` double NOT NULL,
  `closed_volume` double NOT NULL,
  `sl` double NOT NULL,
  `close` double NOT NULL,
  `closetime` varchar(30) NOT NULL,
  `profit` double NOT NULL,
  `event` varchar(200) NOT NULL,
  `status` int(11) NOT NULL,
  `sticket` bigint(25) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;'''



try:

    conn = pymysql.connect(db=mysql_name, user=mysql_user, passwd=mysql_pass,host=mysql_host,port=3306,autocommit=True)
   
    #conn = mysql.connector.connect(host=mysql_host,port=3306,user=mysql_user,password=mysql_pass,database=mysql_name)
    
    def new_cursor():
        cursor = conn.cursor()
       
        return cursor

    tb = AsyncTeleBot(API_TOKEN)
 
    import requests
    import logging

    logger = telebot.logger
    telebot.logger.setLevel(logging.CRITICAL) # Outputs debug messages to console.    
    #telebot.logger.setLevel(logging.ERROR) # Outputs debug messages to console.    
    #telebot.logger.setLevel(logging.WARNING) # Outputs debug messages to console.    

    print(bot_adi," Server started")
    

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
    

    s_tables = sql_tables.split(";")

    for table in s_tables:
        
        table = table.strip()
        if len(table)>0:
        
            
            prg = re.findall("`(.*?)`", table)
            
            t_name = str(prg[0])
            
            try:
            
                cursor = conn.cursor(pymysql.cursors.DictCursor)
                fetch = cursor.execute("select * from `"+t_name+"` where 1")
                fetch = cursor.fetchall()
                cursor.close()
            
            except:
                
                mys = my_query(table)
                print("table:",t_name,"created")

    srg1 = my_query("select * from genel_ayarlar where id = '1'");
    if len(srg1)==0:
        my_query("INSERT INTO `genel_ayarlar` (`id`, `acilis_mesaji`, `root`, `durum`) VALUES (1, '"+str(config.bot_adi)+" Trading bota hoş geldiniz. Bu sayfadan api_key ve secret ekliyerek otomatik trading e başlıyabilirsiniz veya geçmiş raporlarınıza ulaşabilirsiniz', '"+str(config.root_id.split()[0])+"', 1);")
        print("Genel Ayarlar oluşturuldu")
    
    srg1 = my_query("select * from sinyalgrup where id = '1'");
    if len(srg1)==0:
        my_query("INSERT INTO `sinyalgrup` (`id`, `isim`, `tur`, `durum`, `telegram_id`, `msgid`, `invite_link`, `deneme_suresi`, `ucretsiz_kanal`, `ucretsiz_kanal_id`, `kar_grafik_tp`, `referans_komisyon`, `max_api_adet`, `max_api_ucret`) VALUES(1, '"+config.kanal_tam_adi+"', 'premium', 1, 0, 0, '"+config.kanal_url+"', 0, '"+config.ucretsiz_kanal_tam_adi+"', 0, 2, 20, 2, 20);")
        print("Sinyal Grubu Kanalı tanımlandı")
    
    srg1 = my_query("select * from odemeyontem where id = '1'");
    if len(srg1)==0:
        my_query("INSERT INTO `odemeyontem` (`id`, `sure`, `ucret`) VALUES (1, 1, 150),(2, 3, 375),(3, 6, 600),(4, 12, 900);")
        print("Ödeme Ücretleri eklendi")
     
    
    
    sys.stdout.flush()
    api_ekle_form={}
    api_duzenle_form={}
    api_grup_form={}

    cursor = new_cursor()
    cursor.execute("delete from sessions;");
    cursor.execute("delete from komutlar;");

    baslangic = pd.to_datetime(datetime.now()).timestamp()
  
    print("bot baslangic tarihi=",baslangic);    
    
    
    baslangic_tarih = time.time()

    def fetch_row(sql):
        
        cursor = new_cursor()
       
        cursor.execute( sql )
        
        rows=[]
        for row in cursor.fetchall():
            rows.append(row)
        
        cursor.close()
        return rows
        
    def num_rows(sql):
        
        cursor = new_cursor()
        cursor.execute(sql)
        rows=[]
        for row in cursor.fetchall():
            rows.append(row)
        
        cursor.close()
        return len(rows)

    def mysql_query(cursor,q):
        #print("mysql_query()=",q)
        return cursor.execute(q)
    
        
    def to_datetime(time):
        rakam = dtm.datetime.utcfromtimestamp(time).strftime("%Y-%m-%d %H:%M:%S").replace(tzinfo=dtm.timezone.utc)
        return rakam   

    
    def trade_log(user_id,a1,a2="",a3="",a4="",a5="",a6="",a7="",a8="",a9="",a10="",a11="",a12="",a13="",a14="",a15=""):
        

        strs=[]
        strs.append(str(a1))
        strs.append(str(a2))
        strs.append(str(a3))
        strs.append(str(a4))
        strs.append(str(a5))
        strs.append(str(a6))
        strs.append(str(a7))
        strs.append(str(a8))
        strs.append(str(a9))
        strs.append(str(a10))
        strs.append(str(a11))
        strs.append(str(a12))
        strs.append(str(a13))
        strs.append(str(a14))
        strs.append(str(a15))
        full_str=" ".join(strs).replace("\"","").replace("'","")
        
        dtime=pd.to_datetime(round(time.time()),unit="s")
        
        import inspect
        trc = inspect.stack()
        
        
        
        file_name = trc[1].filename
        line_no=trc[1].lineno
        sess_id=user_id
        query = "INSERT INTO `tradelog` (`id`, `stype`, `filename`, `line`, `uid`, `msg`, `tarih`) VALUES (NULL, '0', '"+str(file_name)+"', '"+str(line_no)+"', '"+str(sess_id)+"', '"+str(full_str)+"', '"+str(dtime)+"');"
        my_query(query)
        #print(query)
        


    def sinyal_ayikla(raw):
        
        signal={}
        signal['symbol']=""
        signal['trend']=""
        signal['entry1']=0
        signal['entry2']=0
        signal['tp1']=0
        signal['tp2']=0 
        signal['tp3']=0
        signal['tp4']=0
        signal['tp5']=0
        signal['tp6']=0
        signal['tp7']=0
        signal['tp8']=0
        signal['tp9']=0
        signal['tp10']=0
        signal['sl']=0
        
        
        
        
        signal_trend=""
        
        
        try:
            
            ks = raw.split("\n");
            for w in ks:
                
                w = w.lower();
                
                print("w:",w)
                
                if w == None or w.strip() == "":
                   continue
                
                if w.find("long")>-1:
                    signal['trend']="LONG"
                    signal_trend=signal['trend']
                elif w.find("short")>-1:
                    signal['trend']="SHORT"
                    signal_trend=signal['trend']
                if w.find("snyal")>-1:
                    key = w.split("snyal")[1].replace(":","").replace("/","").strip()
                    signal['symbol']=key.upper();
                elif w.find("pair")>-1:
                    key = w.split("pair")[1].replace(":","").replace("/","").strip()
                    signal['symbol']=key.upper();
                elif w.find("usdt")>-1:
                
                    
                
                    key = w.split(" ")[0].replace(":","").replace("/","").strip()
                    nsymbol=key.upper()
                    
                    if nsymbol=="":
                        
                        symn = ""
                        key = w.split(" ")
                        
                        for r in range(len(key)):
                            if key[r].find("usdt")>-1:
                                nsymbol=key[r]
                                break 
                    
                    signal['symbol']=nsymbol.upper();
                elif w.find("#")>-1:
                
                    
                
                    key = w.split(" ")[0].replace(":","").replace("#","").replace("/","").strip()
                    nsymbol=key.upper()
                    
                    if nsymbol=="":
                        
                        symn = ""
                        key = w.split(" ")
                        
                        for r in range(len(key)):
                            if key[r].find("usdt")>-1:
                                nsymbol=key[r]
                                break 
                    
                    signal['symbol']=nsymbol.upper()+"USDT";
                    
                if w.find("entry")>-1:
                    key = w.split("entry")[1].replace(":","").split("-")
                    
                    
                    for a in range(len(key)):
                        if key[a].strip()=="": continue
                       
                        if a == 0:
                            
                            ikey=key[a].strip()
                            if ikey.find(" ")>-1:
                                bkey=str(ikey).split(" ")
                             
                                signal['entry1']=float(bkey[0].strip())
                                signal['entry2']=float(bkey[1].strip())
                                
                            else:
                                signal['entry1']=float(key[a].strip())
                                
                        elif a == 1:
                            signal['entry2']=float(key[a].strip())
                    
                if w.find("gr")>-1 and False:
                    key = w.split("gr")[1].replace(":","").replace("$","").split("-")
                    
                    
                    for a in range(len(key)):
                        if key[a].strip()=="": continue
                       
                        if a == 0:
                            
                            ikey=key[a].strip()
                            if ikey.find(" ")>-1:
                                bkey=str(ikey).split(" ")
                             
                                signal['entry1']=float(bkey[0].strip())
                                signal['entry2']=float(bkey[1].strip())
                                
                            else:
                                signal['entry1']=float(key[a].strip())
                                
                        elif a == 1:
                            signal['entry2']=float(key[a].strip())
                    
                if w.find("target 1")>-1:
                    a=0
                    key = w.split("target 1")[1].replace("-","").replace(":","").split("-")
                    
                    
                    signal['tp1']=float(key[a].strip())
                    
                elif w.find("target 2")>-1:
                    a=0
                    key = w.split("target 2")[1].replace("-","").replace(":","").split("-")
                    signal['tp2']=float(key[a].strip())
                    
                elif w.find("target 3")>-1:
                    a=0
                    key = w.split("target 3")[1].replace("-","").replace(":","").split("-")
                    signal['tp3']=float(key[a].strip())
                    
                elif w.find("target 4")>-1:
                    a=0
                    key = w.split("target 4")[1].replace("-","").replace(":","").split("-")
                    signal['tp4']=float(key[a].strip())
                    
                elif w.find("target 5")>-1:
                    a=0
                    key = w.split("target 5")[1].replace("-","").replace(":","").split("-")
                    signal['tp5']=float(key[a].strip())
                    
                elif w.find("target 6")>-1:
                    a=0
                    key = w.split("target 6")[1].replace("-","").replace(":","").split("-")
                    signal['tp6']=float(key[a].strip())
                    
                elif w.find("target 7")>-1:
                    a=0
                    key = w.split("target 7")[1].replace("-","").replace(":","").split("-")
                    signal['tp7']=float(key[a].strip())
                    
                elif w.find("target 8")>-1:
                    a=0
                    key = w.split("target 8")[1].replace("-","").replace(":","").split("-")
                    signal['tp8']=float(key[a].strip())
                    
                elif w.find("target 9")>-1:
                    a=0
                    key = w.split("target 9")[1].replace("-","").replace(":","").split("-")
                    signal['tp9']=float(key[a].strip())
                    
                elif w.find("target 10")>-1:
                    a=0
                    key = w.split("target 10")[1].replace("-","").replace(":","").split("-")
                    signal['tp10']=float(key[a].strip())
                    
                elif w.find("1.tp")>-1:
                    a=0
                    key = w.split("1.tp")[1].replace(":","").replace("$","").split("-")
                    signal['tp1']=float(key[a].strip())
                    
                elif w.find("2.tp")>-1:
                    a=0
                    key = w.split("2.tp")[1].replace(":","").replace("$","").split("-")
                    signal['tp2']=float(key[a].strip())
                    
                elif w.find("3.tp")>-1:
                    a=0
                    key = w.split("3.tp")[1].replace(":","").replace("$","").split("-")
                    signal['tp3']=float(key[a].strip())
                    
                elif w.find("4.tp")>-1:
                    a=0
                    key = w.split("4.tp")[1].replace(":","").replace("$","").split("-")
                    signal['tp4']=float(key[a].strip())
                    
                elif w.find("5.tp")>-1:
                    a=0
                    key = w.split("5.tp")[1].replace(":","").replace("$","").split("-")
                    signal['tp5']=float(key[a].strip())
                    
                elif w.find("targets")>-1:
                
                    raw1 = raw.lower().replace("\r","").replace("\n","")
                    tgs = re.findall("targets(.*?)stop",raw1)
                    tgs1 = tgs[0].replace(":","").strip()
                    
                    tps=[]
                    key = tgs1.strip().split("-")
                    for a in range(len(key)):
                        if key[a].strip()=="": continue
                        snks = key[a].strip()
                        if len(snks.split(" "))>1:
                            smbg = snks.split(" ")
                            tps.append(float(smbg[0]))
                            tps.append(float(smbg[1]))
                        else:
                            tps.append(float(snks))
                        
                    
                    tps = sorted(tps)
                    
                    if signal_trend=="LONG":
                            
                        if len(tps)>0: signal['tp1']=tps[0]
                        if len(tps)>1: signal['tp2']=tps[1]
                        if len(tps)>2: signal['tp3']=tps[2]
                        if len(tps)>3: signal['tp4']=tps[3]
                        if len(tps)>4: signal['tp5']=tps[4]
                        if len(tps)>5: signal['tp6']=tps[5]
                        if len(tps)>6: signal['tp7']=tps[6]
                        if len(tps)>7: signal['tp8']=tps[7]
                        if len(tps)>8: signal['tp9']=tps[8]
                        if len(tps)>9: signal['tp10']=tps[9]
                    else:
                            
                        if len(tps)>0: signal['tp1']=tps[-1]
                        if len(tps)>1: signal['tp2']=tps[-2]
                        if len(tps)>2: signal['tp3']=tps[-3]
                        if len(tps)>3: signal['tp4']=tps[-4]
                        if len(tps)>4: signal['tp5']=tps[-5]
                        if len(tps)>5: signal['tp6']=tps[-6]
                        if len(tps)>6: signal['tp7']=tps[-7]
                        if len(tps)>7: signal['tp8']=tps[-8]
                        if len(tps)>8: signal['tp9']=tps[-9]
                        if len(tps)>9: signal['tp10']=tps[-10]
                   
                    
                elif w.find("target ")>-1:
                
                    raw1 = w.lower()
                    
                    tgs1 = raw1.replace("target ","").replace(":","").strip()
                    
                    tps=[]
                    key = tgs1.strip().split("-")
                    for a in range(len(key)):
                        if key[a].strip()=="": continue
                        snks = key[a].strip()
                        if len(snks.split(" "))>1:
                            smbg = snks.split(" ")
                            tps.append(float(smbg[0]))
                            tps.append(float(smbg[1]))
                        else:
                            tps.append(float(snks))
                        
                    
                    tps = sorted(tps)
                    
                    if signal_trend=="LONG":
                            
                        signal['tp1']=tps[0]
                        if len(tps)>1: signal['tp2']=tps[1]
                        if len(tps)>2: signal['tp3']=tps[2]
                        if len(tps)>3: signal['tp4']=tps[3]
                        if len(tps)>4: signal['tp5']=tps[4]
                        if len(tps)>5: signal['tp6']=tps[5]
                        if len(tps)>6: signal['tp7']=tps[6]
                        if len(tps)>7: signal['tp8']=tps[7]
                        if len(tps)>8: signal['tp9']=tps[8]
                        if len(tps)>9: signal['tp10']=tps[9]
                    else:
                            
                        signal['tp1']=tps[-1]
                        if len(tps)>1: signal['tp2']=tps[-2]
                        if len(tps)>2: signal['tp3']=tps[-3]
                        if len(tps)>3: signal['tp4']=tps[-4]
                        if len(tps)>4: signal['tp5']=tps[-5]
                        if len(tps)>5: signal['tp6']=tps[-6]
                        if len(tps)>6: signal['tp7']=tps[-7]
                        if len(tps)>7: signal['tp8']=tps[-8]
                        if len(tps)>8: signal['tp9']=tps[-9]
                        if len(tps)>9: signal['tp10']=tps[-10]
                   
                    
                if w.find("stop loss")>-1:
                    key = w.split("stop loss")[1].replace(":","").split("-")
                    for a in range(len(key)):
                        if key[a].strip()=="": continue
                        if a == 0:
                            signal['sl']=float(key[a].strip())
                
                elif w.find("stoploss")>-1:
                    key = w.split("stoploss")[1].replace(":","").split("-")
                    for a in range(len(key)):
                        if key[a].strip()=="": continue
                        if a == 0:
                            signal['sl']=float(key[a].strip())
                
                
                elif w.find("stop")>-1:
                    a=0
                    key = w.split("stop")[1].replace(":","").replace("$","").split("-")
                    signal['sl']=float(key[a].strip())
                    
                
            if signal['trend']=="LONG" and float(signal['entry1'])>float(signal['entry2']): 
                e1 = signal['entry2']
                e2 = signal['entry1']
                signal['entry1']=e1
                signal['entry2']=e2
            if signal['trend']=="SHORT" and float(signal['entry1'])<float(signal['entry2']): 
                e1 = signal['entry2']
                e2 = signal['entry1']
                signal['entry1']=e1
                signal['entry2']=e2
                
            print("signal:",signal)
                
        except Exception as ee:
            print("signal reader error:",ee);
       
            exc_type, exc_obj, exc_tb = sys.exc_info()
            fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
            print(exc_type, fname, exc_tb.tb_lineno)              
            sys.stdout.flush()
            
            
        if float(signal['entry1'])>0 and signal['trend'] != "" and signal['symbol'] != "" and float(signal['tp1'])>0:
            return signal 
        else:
            signal['symbol']=""
            signal['trend']=""
            signal['entry1']=0
            signal['entry2']=0
            signal['tp1']=0
            signal['tp2']=0
            signal['tp3']=0
            signal['tp4']=0
            signal['tp5']=0
            signal['sl']=0 
            return (signal)            
             

    def bildirim_ekle(user_id,msg):
        
        #if str(user_id) != "1030390960":
        #    return
        
        cursor = conn.cursor()
        bildirim_str = "insert into bildirimler values('','"+str(user_id)+"','"+str(msg)+"','0')"
        print(user_id,msg);
        mysql_query(cursor,bildirim_str)
        conn.commit()
        cursor.close()
        
    def fetch_channel():
        
        fchannels=[]
        rows = fetch_row("select * from sinyalgrup where durum='1'")
        
        for row in rows:
            fchannels.append(row)
        
        return fchannels
        '''
        channels = fetch_channel()
        
        baslangic = pd.to_datetime(datetime.now()).timestamp()
      
        print("bot baslangic tarihi=",baslangic);
        print("channels=",channels);    
        '''
    
    def check_name(rows,name):
        chd = (0,"","",0,0,0)
        for row in rows:
            if row[1]==name:
                chd=row 
                break 
        return chd 
        
    def check_id(rows,name):
        chd = (0,"","",0,0,0)
        for row in rows:
            if row[4]==name:
                chd=row 
                break 
        return chd 
                   
    def append_bars(dt,size):
        
        fark = dt.index[-1].timestamp()-dt.index[-2].timestamp()
        son = dt.index[-1].timestamp()
        
        df_t=[]
        df_o=[]
        df_h=[]
        df_l=[]
        df_c=[]
        df_v=[]
        
        for a in range(1,size+1):
            df_t.append(son+a*fark)
            df_o.append(np.nan)
            df_h.append(np.nan)
            df_l.append(np.nan)
            df_c.append(np.nan)
            df_v.append(np.nan)
        
        ndf = pd.DataFrame()
        ndf['Date'] = pd.to_datetime(df_t,unit="s")
        ndf['Date'] = ndf['Date'].astype("datetime64")
        ndf['Open'] = df_o
        ndf['High'] = df_h
        ndf['Low'] = df_l
        ndf['Close'] = df_c
        ndf['Volume'] = df_v
        ndf=ndf.set_index("Date")
        ndf2 = pd.concat([dt,ndf], ignore_index=False)
        
        return ndf2

    def gen_df(df,start_index,start_price,stop_index,stop_price):
        
        df_date=[]
        df_price=[]
        df_alt=[]
        df_ust=[]
        fark_count=round(stop_index-start_index)
        fark = abs(start_price-stop_price)/(fark_count-1)
        
        for s in range(len(df.index)):
            t1 = s
            
            if s>=start_index and s<stop_index:
                s2=s-start_index
                if start_price<stop_price:
                    p1 = start_price+(s2*fark)
                else:
                    p1 = start_price-(s2*fark)
                
                df_price.append(p1)
                df_alt.append(start_price)
                df_ust.append(stop_price)
            else:
                df_price.append(np.nan)
                df_alt.append(np.nan)
                df_ust.append(np.nan)
            
            
            df_date.append(df.index[t1])
            
        
        pc = pd.DataFrame()
        pc['Date'] = pd.to_datetime(df_date)
        pc['price'] = df_price
        pc['alt'] = df_alt
        pc['ust'] = df_ust
        pc=pc.set_index("Date")
        
        return pc
        
    def tf2int(tf):
        
        bolu=60
        
        if tf == "1m":
            bolu=60
        elif tf == "3m":
            bolu=60*3
        elif tf == "5m":
            bolu=60*5
        elif tf == "15m":
            bolu=60*15
        elif tf == "30m":
            bolu=60*30
        elif tf == "1h":
            bolu=60*60
        elif tf == "2h":
            bolu=60*60*2
        elif tf == "4h":
            bolu=60*60*4
        
        return bolu
        
    def tf2binance(tf):
        
        bolu=client.KLINE_INTERVAL_1MINUTES
        
        if tf == "1m":
            bolu=client.KLINE_INTERVAL_1MINUTES
        elif tf == "3m":
            bolu=client.KLINE_INTERVAL_3MINUTES
        elif tf == "5m":
            bolu=client.KLINE_INTERVAL_5MINUTES
        elif tf == "15m":
            bolu=client.KLINE_INTERVAL_15MINUTES
        elif tf == "30m":
            bolu=client.KLINE_INTERVAL_30MINUTES
        elif tf == "1h":
            bolu=client.KLINE_INTERVAL_1HOURS
        
        return bolu
      
    def which_bar(df,date):
        
        sdate = pd.to_datetime(date).timestamp()
        
        dbar=0
        lbar =0
        for a in range(len(df)):
            dfi = df.index[a]
            
            
            
            dft = pd.to_datetime(dfi).timestamp()
            
            if dft>sdate:
                dbar=lbar
                break
            lbar=a
        
        #print("which_bar date:",date," dbar:",dbar)
        
        return dbar
  
    def date_to_bar(date,tf):
        
        tfi = tf2int(tf)
        
        sdate = pd.to_datetime(round(time.time(),0),unit="s").timestamp()
       
        sdate = sdate - (sdate%tfi)
        
        udate = pd.to_datetime(date).timestamp()
      
        udate = udate - (udate%tfi)
        
        dbar = round((sdate-udate)/tfi)
        
        return dbar

    def get_history(symbol,start,stop):
        
        fnp = ["1m","3m","5m","15m","30m","1h","4h"]
        stf = "1m"
        dbf=0
        db1=0
        db2=0
        selected_tff=Client.KLINE_INTERVAL_1MINUTE
        
        for a in range(len(fnp)):
            
            tf = fnp[a]
            
            db2 = date_to_bar(stop,tf)
            db1 = date_to_bar(start,tf)
            
            print("-----  start:",start," db1:",db1," stop:",stop," db2:",db2," tf:",tf," fark:",abs(db1-db2))
                
            if abs(db1-db2)<100 or tf == "4h":
                
                dbf = abs(db1-db2)+10
                        
                if tf == "1m":
                    selected_tff=Client.KLINE_INTERVAL_1MINUTE
                elif tf == "3m":
                    selected_tff=Client.KLINE_INTERVAL_3MINUTE
                elif tf == "5m":
                    selected_tff=Client.KLINE_INTERVAL_5MINUTE
                elif tf == "15m":
                    selected_tff=Client.KLINE_INTERVAL_15MINUTE
                elif tf == "30m":
                    selected_tff=Client.KLINE_INTERVAL_30MINUTE
                elif tf == "1h":
                    selected_tff=Client.KLINE_INTERVAL_1HOUR
                elif tf == "4h":
                    selected_tff=Client.KLINE_INTERVAL_4HOUR
                
                
                stf = tf
                if dbf<40:
                    dbf=40
                
                break
        
        tfif = tf2int(stf)
        
        st_time = int(pd.to_datetime(str(start)).timestamp())-(int(tfif)*5)
        print("start:",start," ",stf," ",tfif," ",st_time)
        
        st_time = str(pd.to_datetime(str(st_time),unit="s"))
        
        klines = client.futures_historical_klines(symbol, tf, st_time)
        npk = np.array(klines)
        
        dtf=pd.DataFrame()
        dtf['Date']=pd.to_datetime(npk[:,0],unit="ms")
        dtf['Open']=npk[:,1]
        dtf['High']=npk[:,2]
        dtf['Low']=npk[:,3]
        dtf['Close']=npk[:,4]
        dtf['Volume']=npk[:,5]
        
        dtf['Date']=dtf['Date'].astype("datetime64")
        dtf['Open']=dtf['Open'].astype(float)
        dtf['High']=dtf['High'].astype(float)
        dtf['Low']=dtf['Low'].astype(float)
        dtf['Close']=dtf['Close'].astype(float)
        dtf['Volume']=dtf['Volume'].astype(float)
        
        #dtf['Date']=dtf['Date'].astype(str)
       

        print("get history start:",dtf['Date'].values[0]," stop:",dtf['Date'].values[-1]," db1:",db1," db2:",db2," dbf:",dbf," ",stf)
       
        
        #dtf=dtf.set_index("Date")
        
        return (dtf)
        
    def generate_chart_image(save_name,symbol,trend,open_date,open_price,last_date,last_price,cmd,profit,ch_isim,ch_link):
        
        try:
            
            data = get_history(symbol,open_date,last_date)
            
            sym_info = client.get_symbol_info(symbol)
            digits=sym_info['quotePrecision']
            

            data['Date'] = pd.to_datetime(data['Date']).astype("datetime64")
            data=data.set_index("Date")
            last = data['Close'].values[-1]
            last_bar=len(data.index)-1
            
            min_price = data['Low'].min()
            ortala = (data['High'].max()+data['Low'].min())/2

            data = append_bars(data,25)
            


            df = data[['Open', 'High', 'Low', 'Close','Volume']]   

            s_theme = "light"
            
            font_color = "ffffff"
            
            if s_theme == "dark":
                
                font_color = "white"
                
                s = {'base_mpl_style': 'fast',
                         'marketcolors'  : {'candle': {'up': '#29a677', 'down': '#e54959'},
                                            'edge'  : {'up': '#29a677', 'down': '#e54959'},
                                            'wick'  : {'up': '#29a677', 'down': '#e54959'},
                                            'ohlc'  : {'up': '#29a677', 'down': '#e54959'},
                                            'volume': {'up': '#29a677', 'down': '#e54959'},
                                            'vcedge': {'up': '#29a677', 'down': '#e54959'},
                         'vcdopcod'      : True,
                         'alpha'         : 0.9},
                         'mavcolors'     : None,
                         'facecolor'     : '#0c1d22',
                         'edgecolor'     : '#4c5c61',
                         'edgestyle'     : ':',
                         'figcolor'     : '#0c1d22',
                         'gridcolor'     : '#cfd1d2',
                         'gridstyle'     : ':',
                         'y_on_right'    : True,
                         'rc'            : {'axes.labelcolor': '#ffffff',
                                            'axes.edgecolor' : 'ffffff',
                                            'axes.grid.axis' : 'y',
                                            'grid.alpha' : 0.2,
                                            'ytick.color'    : '#ffffff',
                                            'xtick.color'    : '#ffffff',
                                            'figure.titlesize': 'x-large',
                                            'figure.titleweight':'semibold',
                                           }}
            else:
                
                font_color = "black"
                
                s = {'base_mpl_style': 'fast',
                         'marketcolors'  : {'candle': {'up': '#29a677', 'down': '#e54959'},
                                            'edge'  : {'up': '#29a677', 'down': '#e54959'},
                                            'wick'  : {'up': '#29a677', 'down': '#e54959'},
                                            'ohlc'  : {'up': '#29a677', 'down': '#e54959'},
                                            'volume': {'up': '#29a677', 'down': '#e54959'},
                                            'vcedge': {'up': '#29a677', 'down': '#e54959'},
                         'vcdopcod'      : True,
                         'alpha'         : 0.9},
                         'mavcolors'     : None,
                         'facecolor'     : '#ffffff',
                         'edgecolor'     : '#0c1d22',
                         'edgestyle'     : ':',
                         'figcolor'     : '#ffffff',
                         'gridcolor'     : '#000000',
                         'gridstyle'     : ':',
                         'y_on_right'    : True,
                         'rc'            : {'axes.labelcolor': '#000000',
                                            'axes.edgecolor' : '000000',
                                            'axes.grid.axis' : 'y',
                                            'grid.alpha' : 0.2,
                                            'ytick.color'    : '#000000',
                                            'xtick.color'    : '#000000',
                                            'figure.titlesize': 'x-large',
                                            'figure.titleweight':'semibold',
                                           }}
            
                             

            start_index=which_bar(df,open_date)
            stop_index=which_bar(df,last_date) 
            
            print("start_index:",start_index," stop_index:",stop_index)

            if abs(stop_index-start_index)<2:
                stop_index=stop_index+2
            if start_index<0:
                start_index=0
              
            print("2 - start_index:",start_index," stop_index:",stop_index)
  
            d1 = df.index[start_index]
            d2 = df.index[stop_index]
            p1 = open_price
            p2 = last_price
            
            print("d1:",d1," p1:",p1," d2:",d2," p2:",p2);

            apdf = gen_df(df,start_index,p1,stop_index,p2)


            tdates = [(d1,d2)]

            tline1 = [(d1,p1),(d2,p1)]
            tline2 = [(d1,p2),(d2,p2)]
            

            dates_df     = pd.DataFrame(df.index)
            buy_date     = pd.Timestamp(d1)
            sell_date    = pd.Timestamp(d2)
            where_values = pd.notnull(dates_df[ (dates_df>=buy_date) & (dates_df <= sell_date) ])['Date'].values

            if cmd == "SL":
                fill_area = dict(y1=p1,y2=p2,where=where_values,alpha=0.5,color='#e54959')
                apdict = mpf.make_addplot(apdf['price'],alpha=0.35,color="#e54959",markersize=500)
            else:
                fill_area = dict(y1=p1,y2=p2,where=where_values,alpha=0.5,color='#29a677')
                apdict = mpf.make_addplot(apdf['price'],alpha=0.35,color="#29a677",markersize=500)
            
            fig, ax = mpf.plot(df, figsize=(9,5), type='candle', panel_ratios=(6,), volume=False, style=s, figscale=1.4,
                   alines=dict(alines=[tline2, tline1], colors=['#29a677', 'b'], linewidths=[1, 1], linestyle='-.'),
                   fill_between=fill_area, returnfig=True, addplot=apdict)
                   

            ax[0].axhline(y = last, color = 'r', linestyle = '-',linewidth=0.5)

            x = last_bar
            y = ortala
            ax[0].text(x+5,y, symbol+'\n'+trend+'\n '+cmd+' HIT\n'+str(p2)+'\nProfit: %'+str(profit), verticalalignment="center", multialignment='center', fontsize=16, color=font_color, style='oblique', bbox={'facecolor': '#29a677', 'alpha': 0.3, 'pad': 10})

            #ax[0].text(0,p2, "Profit: %"+str(profit), fontsize=21, color="#ffffff",verticalalignment="bottom", horizontalalignment='left')
            ax[0].text(len(df)+5,last, str(last), fontsize=10, color="red",verticalalignment="center", horizontalalignment='left')
            ax[0].text(stop_index,p1, str(p1), fontsize=10, color=font_color,verticalalignment="center", horizontalalignment='left')
            ax[0].text(stop_index,p2, str(p2), fontsize=10, color=font_color,verticalalignment="center", horizontalalignment='left')
            
            
            ax[0].text(len(df),min_price, ch_isim+" "+ch_link, fontsize=12, color=font_color,verticalalignment="bottom", horizontalalignment='right')
            
            # add a new suptitle
            #fig.suptitle('Figure Title', y=1.05, fontsize=30, x=0.59)

            # add a title the the correct axes
            ax[0].set_title(symbol+' '+trend+' '+cmd+' Profit:%'+str(profit), fontsize=20, color=font_color, fontfamily='Verdana', loc='center')

            
            fig.savefig(save_name,bbox_inches='tight')
            plt.close()
            #mpf.show()
            
            
        except Exception as ee:
            print("generate_chart error:",ee)
    
    async def send_ch_notifications():
        
        block_it="___"
        
        #print("send_channel_notifications() -> select * from bildirimler where gonderim<0")
        rowsb = my_query("select * from bildirimler_ch where gonderim=0")
        for rowb in rowsb:
        
            #print("rowb:",rowb);
            
            if int(rowb['id'])<=0:
                continue
            
            try:   
                
                chm = my_query("select isim,invite_link from sinyalgrup where telegram_id='"+str(rowb['user_id'])+"'")
                
                #print("SELECT * FROM `sinyalgrup` where telegram_id='"+str(rowb[1])+"'")
                
                chf = my_query("SELECT * FROM `sinyalgrup` where telegram_id='"+str(rowb['user_id'])+"'")
                
                tp_oldu=""
                sgn={}
                sgn['trend']=rowb['trend']
                sgn['symbol']=rowb['symbol']
                sgn['entry1']=rowb['open']
                sgn['entry2']=rowb['open']
                sgn['tp1']=0
                sgn['tp2']=0
                sgn['tp3']=0
                sgn['tp4']=0
                sgn['tp5']=0
                sgn['tp6']=0
                sgn['tp7']=0
                sgn['tp8']=0
                sgn['tp9']=0
                sgn['tp10']=0
                sgn['sl']=0
                
                hedef1=""
                hedef2=""
                hedef3=""
                hedef4=""
                hedef5=""
                hedef6=""
                hedef7=""
                hedef8=""
                hedef9=""
                hedef10=""
                hedefsl=""
                
                cmd = rowb['cmd']
                
           
                sgn_sl=0
                sgn_tp=0
                chart_goster=False
                ucretsiz_id=0
                
                last_tp = 0
                
                last_sl = 0
                sgn_id = 0
                        
                if len(chf)>0:
                    
                    #print("chf:",chf)
                    
                    grp_id = chf[0]['id']
                    chart_tp = chf[0]['kar_grafik_tp']
                    chart_goster=False
                    ucretsiz_id = chf[0]['ucretsiz_kanal_id']
                    
                    print("SELECT * FROM `signals` where signalid='"+str(rowb['post_id'])+"'")
                    sgd = my_query("SELECT * FROM `signals` where signalid='"+str(rowb['post_id'])+"'")
                    
                    print("sgd")
                    print(sgd)
                    
                    if len(sgd)>0:
                    
                        sgda=sgd[0]
                        sgn_id = sgda['id']
                        
                        sgn_tp = sgda['last_tp']
                        
                        sgn_sl = sgda['last_sl']
                        
                        kac_tp = 0
                        if sgda['tp1']>0: kac_tp=1
                        if sgda['tp2']>0: kac_tp=2
                        if sgda['tp3']>0: kac_tp=3
                        if sgda['tp4']>0: kac_tp=4
                        if sgda['tp5']>0: kac_tp=5
                        if sgda['tp6']>0: kac_tp=6
                        if sgda['tp7']>0: kac_tp=7
                        if sgda['tp8']>0: kac_tp=8
                        if sgda['tp9']>0: kac_tp=9
                        if sgda['tp10']>0: kac_tp=10
                        
                        
                        if cmd == "TP1":
                            sgn_tp = 1
                        elif cmd == "TP2":
                            sgn_tp = 2
                        elif cmd == "TP3":
                            sgn_tp = 3
                        elif cmd == "TP4":
                            sgn_tp = 4
                        elif cmd == "TP5":
                            sgn_tp = 5
                        elif cmd == "TP6":
                            sgn_tp = 6
                        elif cmd == "TP7":
                            sgn_tp = 7
                        elif cmd == "TP8":
                            sgn_tp = 8
                        elif cmd == "TP9":
                            sgn_tp = 9
                        elif cmd == "TP10":
                            sgn_tp = 10
                        
                        elif cmd == "SL":
                            sgn_sl = 1
                       
                        
                        
                        if chart_tp<=sgn_tp:
                            chart_goster=True
                        
                        
                        sgn['entry1']=sgda['entry1']
                        sgn['entry2']=sgda['entry2']
                        sgn['tp1']=sgda['tp1']
                        sgn['tp2']=sgda['tp2']
                        sgn['tp3']=sgda['tp3']
                        sgn['tp4']=sgda['tp4']
                        sgn['tp5']=sgda['tp5']
                        sgn['tp6']=sgda['tp6']
                        sgn['tp7']=sgda['tp7']
                        sgn['tp8']=sgda['tp8']
                        sgn['tp9']=sgda['tp9']
                        sgn['tp10']=sgda['tp10']
                        sgn['sl']=sgda['sl']
                        
                        #print("sgn:",sgn)
                
                        if sgn_tp>0:
                            tp_oldu="TP1"
                            hedef1="✅"
                        if sgn_tp>1:
                            tp_oldu="TP2"
                            hedef2="✅"
                        if sgn_tp>2:
                            tp_oldu="TP3"
                            hedef3="✅"
                        if sgn_tp>3:
                            tp_oldu="TP4"
                            hedef4="✅"
                        if sgn_tp>4:
                            tp_oldu="TP5"
                            hedef5="✅"
                        if sgn_tp>5:
                            tp_oldu="TP6"
                            hedef6="✅"
                        if sgn_tp>6:
                            tp_oldu="TP7"
                            hedef7="✅"
                        if sgn_tp>7:
                            tp_oldu="TP8"
                            hedef8="✅"
                        if sgn_tp>8:
                            tp_oldu="TP9"
                            hedef9="✅"
                        if sgn_tp>9:
                            tp_oldu="TP10"
                            hedef10="✅"
                            
                        if sgn_sl>0:
                            hedefsl="⛔️"
                            
                        
                    
                
                kanal_isim = ""
                kanal_link = ""
                
                if len(chm)>0:
                    kanal_isim = chm[0]['isim']
                    kanal_link = chm[0]['invite_link']
            
                gid = str("-100"+str(rowb['user_id']))
              
                channel_id = int(gid)
                channel_msg = rowb['post_id']
                channel_cmd = rowb['cmd']
                channel_text = rowb['msg']
                
                
                cb1 = types.InlineKeyboardMarkup()
                
                #ankey = types.InlineKeyboardButton(text="Forx_trading_bot", url='tg://user?id=5281722345')
                ankey = types.InlineKeyboardButton(text="Orca Trade Bot", url=bot_url+"?start=chref-"+str(channel_id))
                ankey2 = types.InlineKeyboardButton(text="Yardım Al", url="https://t.me/OrcaTradeBot_Destek")
                cb1.add(ankey,ankey2)
                       

                
                try:
                
                 
                    reply_id=None
                    if abs(channel_msg)>0:
                        reply_id=abs(int(channel_msg))
                    
                    reply_text = channel_text+" 📈 "
                    
                    print("cmd:",cmd," sgn_tp:",sgn_tp," kac_tp:",kac_tp)
                    
                    no_send=0
                    if cmd == "SL" and sgn_tp>0:
                        reply_text+="\n"+"Bu Sinyal TP"+str(sgn_tp)+" ulaştıktan sonra tekrar giriş seviyesine geldiği için işlem kapanmıştır. ⛔️"
                        no_send=1
                    elif cmd == "SL":
                        reply_text+="\n"+" Stoploss ⛔️"
                        no_send=1
                    if sgn_tp == kac_tp:
                        reply_text+="\n"+"✅ Tüm Hedefler Geldi ✅ "
                        
                    
                    kosul1 = reply_text.find("✅")>-1 and reply_text.find("sinyali açıldı")>-1
                    kosul2 = reply_text.find("✅")>-1 and reply_text.find("Profit: %")>-1
                    kosul3 = reply_text.find("⛔️")>-1
                    if kosul1 or kosul2 or kosul3:
                        
                        try:
                            if kosul2 or kosul3:
                                if sgn['trend']=="SHORT":
                                    new_message = "🟥 "+str(sgn['trend'])+"\n"
                                else:
                                    new_message = "🟩 "+str(sgn['trend'])+"\n"
                                    
                                new_message+= "❇️ "+str(sgn['symbol'])+"\n"
                                new_message+= "☣ Giriş : "+str(sgn['entry1'])+" - "+str(sgn['entry2'])+"\n"
                                new_message+= "☪ Target 1 - "+str(sgn['tp1'])+" "+str(hedef1)+"\n"
                                if sgn['tp2']>0: new_message+= "☪ Target 2 - "+str(sgn['tp2'])+" "+str(hedef2)+"\n"
                                if sgn['tp3']>0: new_message+= "☪ Target 3 - "+str(sgn['tp3'])+" "+str(hedef3)+"\n"
                                if sgn['tp4']>0: new_message+= "☪ Target 4 - "+str(sgn['tp4'])+" "+str(hedef4)+"\n"
                                if sgn['tp5']>0: new_message+= "☪ Target 5 - "+str(sgn['tp5'])+" "+str(hedef5)+"\n"
                                if sgn['tp6']>0: new_message+= "☪ Target 6 - "+str(sgn['tp6'])+" "+str(hedef6)+"\n"
                                if sgn['tp7']>0: new_message+= "☪ Target 7 - "+str(sgn['tp7'])+" "+str(hedef7)+"\n"
                                if sgn['tp8']>0: new_message+= "☪ Target 8 - "+str(sgn['tp8'])+" "+str(hedef8)+"\n"
                                if sgn['tp9']>0: new_message+= "☪ Target 9 - "+str(sgn['tp9'])+" "+str(hedef9)+"\n"
                                if sgn['tp10']>0: new_message+= "☪ Target 10 - "+str(sgn['tp10'])+" "+str(hedef10)+"\n"
                                
                                new_message+= "⛔️ Stop Loss : "+str(sgn['sl'])+" "+str(hedefsl)+"\n"
                                #new_message+= "▶️ Leverage: CROSS 5x-20X arası";
                                new_message+= "\nThis is not investment advice";
                                #reply_text = new_message
                                 
                                await tb.edit_message_text(text=new_message,chat_id=channel_id,message_id=reply_id)
                        except Exception as ee:
                             
                            print("edit_message_text error ",ee)
                        
                        save_name="screenshots/"+rowb['symbol']+"_"+str(rowb['user_id'])+"_"+str(rowb['post_id'])+"_"+str(rowb['id'])+".png"
                        
                        if (kosul2) and chart_goster:
                             
                            
                            print("save_name:",save_name)
                            generate_chart_image(save_name,rowb['symbol'],rowb['trend'],rowb['opendate'],rowb['open'],rowb['lastdate'],rowb['last'],rowb['cmd'],rowb['profit'],kanal_isim,kanal_link)
                            if ch_bildirim_gonder==1:
                                await tb.send_photo(channel_id,photo=open(save_name, 'rb'), reply_to_message_id=reply_id,caption=reply_text)
                                #await asyncio.sleep(0.5)
                                #pass
                            
                            print("ucretsiz_id:",ucretsiz_id)
                            
                            try:
                         
                                if ucretsiz_id>0 and sgn_tp==5:
                                    cgid = str("-100"+str(ucretsiz_id))
                                    await tb.send_photo(cgid,photo=open(save_name, 'rb'),caption=reply_text)
                                    
                                    #await asyncio.sleep(0.5)
                            except Exception as edc:
                            
                                print("ucretsiz kanal send image error:",edc)
                                                                       
                                
                        else:
                            if ch_bildirim_gonder==1 and no_send==0:
                                tb_send_message(channel_id, reply_to_message_id=reply_id,text=reply_text)
                                
                                #pass 
                        #pass
                        
             
                        
                    else:
                        if ch_bildirim_gonder==1:
                            tb_send_message(channel_id, reply_to_message_id=reply_id,text=reply_text,reply_markup=cb1)
                            
                        #pass
                    
                    
                    
                    
                    
                except Exception as ee:
                    print("gruba bildirim not reply line363 ",ee)
                
                print("bildirim(channel) ",channel_id," msg_id:",abs(channel_msg)," text=",channel_msg," ",pd.to_datetime(datetime.now()))
            
                
                suan = int(pd.to_datetime(datetime.now()).timestamp())
                cursor = conn.cursor();
                mysql_query(cursor,"update bildirimler_ch set gonderim = '"+str(suan)+"',result='ok' where id = '"+str(rowb['id'])+"'")
              
                cursor.close();
            except Exception as ee:
                print("bildirim error ",ee);
                
                
                block_it=block_it+","+str(rowb['id'])
                err_str=str(ee).replace("\"","").replace("\'","")
                suan = int(pd.to_datetime(datetime.now()).timestamp())
                cursor = conn.cursor();
                mysql_query(cursor,"update bildirimler_ch set gonderim = '"+str(suan)+"',result='"+str(err_str)+"' where id = '"+str(rowb['id'])+"'")
                #mysql_query(cursor,"update signals set last_tp='"+str(sgn_tp)+"',last_sl='"+str(sgn_sl)+"' where id = '"+str(sgn_id)+"'")
               
                cursor.close();     
        
            await asyncio.sleep(1)
        
    async def listen_raw_signals():
         
        try:
            rsignals = fetch_row("select * from signals_raw where status = '0' order by id asc")
            
            for rs in rsignals:
                fetch_row("update signals_raw set status='1' where id = '"+str(rs[0])+"'")
                
                mycc = fetch_row("select * from sinyalgrup where id = '1'")
                print(mycc)
                if len(mycc)>0:
                    myc = mycc[0]
                    print("listen_raw_signals:",rs)
                    await read_group_msg(baslangic,tb,1,str(myc[4]),str(myc[1]),str(rs[3]),str(rs[4]),str(rs[5]))
                    
        
        except Exception as ee:
        
            print("listen_raw_signals(err):",ee)
            
 
    async def save_signal_raw(my_db,my_user,my_pass,gid,gname,msg_id,msg_date,message):
        try:
            conn2 = pymysql.connect(db=my_db, user=my_user, passwd=my_pass,host="127.0.0.1",port=3306,autocommit=True)
            cursor2 = conn2.cursor()
            signal_str = "INSERT INTO `signals_raw` (`id`, `group_id`, `group_name`, `msg_id`, `msg_date`, `msg_text`, `status`) VALUES (NULL, '"+str(gid)+"', '"+str(gname)+"', '"+str(msg_id)+"', '"+str(msg_date)+"', '"+str(message)+"', '0');"
            cursor2.execute(signal_str);        
            cursor2.close()
            conn2.close()
        except Exception as ee:
            print("save_signal_raw(err) : ",ee)
   
    async def thread_send_message(chat_id, text, reply_markup,reply_to_message_id):
        try:
            if reply_markup != None:
                await tb.send_message(chat_id=chat_id,text=text,reply_markup=reply_markup)
            elif reply_to_message_id != None:
                await tb.send_message(chat_id,text,reply_to_message_id=reply_to_message_id)
            else:
                await tb.send_message(user_id,text)
        except Exception as ee:
            print("tb_send_message(error):",ee)
            
    def tb_send_message(chat_id, text, reply_markup = None, reply_to_message_id=None):
        asyncio.create_task(thread_send_message(chat_id, text,reply_markup,reply_to_message_id))
        #Thread(target=thread_send_message, args=(chat_id, text,reply_markup,reply_to_message_id,)).start()
   
    async def send_user_notifications():
        
        await listen_raw_signals();
        await send_ch_notifications();
        
        block_it="___"
        
        rowsb = fetch_row("select * from bildirimler_ch where gonderim=0")
        
        if len(rowsb) == 0:
            
            #print("send_channel_notifications() -> select * from bildirimler where gonderim<0")
            rowsb = fetch_row("select * from bildirimler where gonderim=0")
            for rowb in rowsb:
            
                print("rowb:",rowb);
                
                if int(rowb[0])<=0:
                    continue
                 
                try:   
                
                
                    gid = str("-100"+str(rowb[1]))
                  
                    channel_id = int(gid)
                    channel_msg = rowb[2]
                    
                    cb1 = types.InlineKeyboardMarkup()
                    
                    #ankey = types.InlineKeyboardButton(text="Forx_trading_bot", url='tg://user?id=5281722345')
                    ankey = types.InlineKeyboardButton(text="Ana Menu", callback_data='anamenu')
                    ankey2 = types.InlineKeyboardButton(text="Hesap Geçmişi", callback_data='gecmis_islemler')
                    cb1.add(ankey,ankey2)
                          
                    
                    try:
                        user_id = int(rowb[1])
                        if bildirim_gonder==1:
                            #task = asyncio.create_task(tb.send_message(user_id,rowb[2],reply_markup=cb1))
                            tb_send_message(user_id,rowb[2],reply_markup=cb1)
                            await asyncio.sleep(0.5)
                        #pass

                        print("bildirim(user) ",user_id," msg_id:",abs(rowb[3])," text=",rowb[2]," ",pd.to_datetime(datetime.now()))
                    except:
                        print("uyeye bildirim not send line382")
                
                    suan = int(pd.to_datetime(datetime.now()).timestamp())
                    cursor = conn.cursor();
                    mysql_query(cursor,"update bildirimler set gonderim = '"+str(suan)+"' where id = '"+str(rowb[0])+"'")
                  
                    cursor.close();
                except Exception as ee:
                    print("user_bildirim error ",ee);
                    
                    
                    block_it=block_it+","+str(rowb[0])
                    
                    suan = int(pd.to_datetime(datetime.now()).timestamp())
                    cursor = conn.cursor();
                    mysql_query(cursor,"update bildirimler set gonderim = '"+str(suan)+"' where id = '"+str(rowb[0])+"'")
                   
                    cursor.close();   

                await asyncio.sleep(1)

    async def send_signal_raw(my_uri,gid,gname,msg_id,msg_date,message):
        try:

            url = my_uri
            myobj = {"group_id": gid,"group_name":gname,"msg_id":msg_id,"msg_date":msg_date,"message":message};

            x = requests.post(my_uri, data = myobj)
            
            print("request.send : ",my_uri," -> ",x.text)

        except Exception as ee:
            print("send_signal_raw(err) : ",ee)
             
    async def read_group(message):
        global channels, baslangic
        
        group_id = str(message.chat.id)[4:]
        group_name = str(message.chat.title)
        msg_id = message.id
        msg_date = message.date
        
        
        # create_signal ETHUSDT BUY 1 0.2 5 0.4
        # create_signal JASMYUSDT BUY 0.5 0.03 10 0.03
        # create_signal GMTUSDT BUY 0.5 0.03 10 0.03
        # create_signal GALAUSDT BUY 0.5 0.03 10 0.03
        # create_signal AVAXUSDT BUY 0.5 0.03 10 0.03
        # create_signal MATICUSDT BUY 0.5 0.03 10 0.03
        # create_signal ETHUSDT SELL 0.5 0.02 10 0.02

        
        partlar = message.text.split(" ")
        
        #if config.root_id.find("")
        
        new_msg = message.text
        
        if partlar[0] == "create_signal":
            
            cs_symbol = partlar[1]
            cs_trend = partlar[2]
            cs_sl_yuzde = float(partlar[3])
            cs_aralik_yuzde = float(partlar[4])
            cs_tp_adet = int(partlar[5])
            cs_tp_yuzde = float(partlar[6])
            
            client2 = Client()
            prices = client2.futures_order_book(symbol=partlar[1])
            
            bid = float(prices['bids'][0][0])
            ask = float(prices['asks'][0][0])
            
            
            digit = pair_info[cs_symbol]['digits']
            
            if cs_trend=="BUY":
            
                entry1 = round(ask*(1+((cs_aralik_yuzde/100)/2)),digit)
                entry2 = round(ask*(1-((cs_aralik_yuzde/100)/2)),digit)
                stopl = round(ask*(1-(cs_sl_yuzde/100)),digit) 
                
                stpler = []
                
                for at in range(1,cs_tp_adet+1):
                    stpler.append(str(round(entry1*(1+((cs_tp_yuzde*at)/100)),digit)))
                
                stopl = round(ask*(1-(cs_sl_yuzde/100)),digit) 
                stopl = str(stopl)
                entry1 = str(entry1)
                entry2 = str(entry2)
                bid = str(bid)
                ask = str(ask)
                
                tpler = " - ".join(stpler)
            

                new_msg = "LONG\nBinance Futures - binance\nPair: "+cs_symbol+"\nBid: "+bid+" Ask:"+ask+"\nEntry: "+entry1+" - "+entry2+"\nTargets: "+tpler+"\nStopLoss:"+stopl+"\nLeverage Cross 50x\n";
            
            elif cs_trend=="SELL":
            
                entry1 = round(bid*(1-((cs_aralik_yuzde/100)/2)),digit)
                entry2 = round(bid*(1+((cs_aralik_yuzde/100)/2)),digit)
                
                
                stpler = []
                
                for at in range(1,cs_tp_adet+1):
                    stpler.append(str(round(entry1*(1-((cs_tp_yuzde*at)/100)),digit)))
                
                stopl = str(round(bid*(1+(cs_sl_yuzde/100)),digit))
                stopl = str(stopl)
                entry1 = str(entry1)
                entry2 = str(entry2)
                bid = str(bid)
                ask = str(ask)
                
                
                tpler = " - ".join(stpler)
            

                new_msg = "SHORT\nBinance Futures - binance\nPair: "+cs_symbol+"\nBid: "+bid+" Ask:"+ask+"\nEntry: "+entry1+" - "+entry2+"\nTargets : "+tpler+"\nStop Loss: "+stopl+"\nLeverage Cross 50x\n";
            
            
            print("prices:",bid," asks:",ask)
            print("gmessage:",message)
                
        
        
        if message.reply_to_message != None:
            return
        
        cnl = my_query("select * from sinyalgrup where id = '1'")
        
        if len(cnl)>0:
            kanal = cnl[0]
            
            # print(" ",str(kanal['isim']).strip()," == ",str(group_name).strip())
            
            if kanal['isim'].strip() == group_name.strip() and str(kanal['telegram_id']) != str(group_id):
                print(group_name," telegram id #",group_id," updated")
                my_query("update sinyalgrup set telegram_id = '"+str(group_id)+"' where id = '1'")
                
            if kanal['ucretsiz_kanal'].strip() == group_name.strip() and str(kanal['ucretsiz_kanal_id']) != str(group_id):
                print(group_name," telegram id #",group_id," updated")
                my_query("update sinyalgrup set ucretsiz_kanal_id = '"+str(group_id)+"' where id = '1'")
                
            if kanal['isim'].strip() == group_name.strip() or str(kanal['telegram_id']) == str(group_id):
            
                if msg_id>kanal['msgid'] and kanal['id']>0:
                    my_query("update sinyalgrup set msgid = '"+str(msg_id)+"' where id='1'")
                    asyncio.create_task(read_group_msg(baslangic,tb,msg_id,group_id,group_name,msg_id,msg_date,new_msg))
                   

                    import re
                    message_text = message.text.encode('utf8')
                    message_text=re.sub(rb'[^\x00-\x7f]',rb'',message_text) 
                    message_text=str(message_text).replace("\\n","\n").replace("b'","").replace("'","")                    
                    
    async def read_group_msg(baslangic,client,mid,gid,username,msg_id,msg_date,message):
        
        print("---------------------------------------------------------------------")
        print("read_group_msg() mid=",mid,"gid=",gid,"username=",username);
        

        trade_log(0,"read_group_msg() mid=",mid,"gid=",gid,"username=",username);
        
        try:
        
            user_id = gid
            guser_id = int("-100"+gid)
            user_name = username
            grup_id = mid
            gmessage = message
            last_msg_id = 0
            
            suan = pd.to_datetime(datetime.now())
            
            suan = msg_date
        
            #print("user_id:",user_id," grup_id:",grup_id," msg_id:",last_msg_id[user_id])
            
            '''
            rowsb = fetch_row("select * from bildirimler where user_id='"+str(user_id)+"' and gonderim='-1'")
            for rowb in rowsb:
                try:
                    asyncio.create_task(client.send_message(rowb[1],rowb[2]))
                    suan = int(pd.to_datetime(datetime.now()).timestamp())
                    cursor = conn.cursor();
                    mysql_query(cursor,"update bildirimler set gonderim = '"+str(suan)+"' where id = '"+str(rowb[0])+"'")
                    conn.commit()
                    cursor.close();
                except Exception as ee:
                    print("bildirim error ",ee);
                    
                    suan = int(pd.to_datetime(datetime.now()).timestamp())
                    cursor = conn.cursor();
                    mysql_query(cursor,"update bildirimler set gonderim = '"+str(suan)+"' where id = '"+str(rowb[0])+"'")
                    conn.commit()
                    cursor.close();                            
            '''
            
            suan = pd.to_datetime(datetime.now())
            import re
            m = message.encode('utf8')
            wnsg=re.sub(rb'[^\x00-\x7f]',rb'',m) 
            wnsg=str(wnsg).replace("\\n","\n").replace("b'","").replace("'","")
            message=wnsg
        
            suan = msg_date
            mtmsp = pd.to_datetime(round(int(msg_date)),unit="s")
            vtime = mtmsp.timestamp()            
            
            
            print(user_name,"[",user_id,"] >> ",suan," msg:",wnsg)
            
            
            if message != None:
                
                new_msg = message
            
          
                
                sgn = sinyal_ayikla(message)
                
                if sgn['symbol'] != "":
                    if (sgn['trend'] == "LONG" and float(sgn['sl'])>float(sgn['tp1'])) or (sgn['trend'] == "SHORT" and float(sgn['sl'])<float(sgn['tp1'])):
                        sgn['entry1']=0
                 
                print("read_signal signal_ayikla:",sgn);
                                   
                message = str(gid)+"_"+str(sgn)
                message_bytes = message.encode('ascii')
                base64_bytes = base64.b64encode(message_bytes)
                base64_message = base64_bytes.decode('ascii')

                print("signal_hash:",base64_message)      
                sys.stdout.flush()

                signal_varmi = num_rows("select * from signals where signal_data = '"+str(base64_message)+"'");
                    
                if sgn['symbol']!="" and signal_varmi==0 and sgn['entry1']>0 and sgn['tp1']>0 and sgn['sl']>0:
                           
                    old_msg_id = msg_id
                           
                    try:
                        cb1 = types.InlineKeyboardMarkup()
                        
                        #ankey = types.InlineKeyboardButton(text="Forx_trading_bot", url='tg://user?id=5281722345')
                        ankey = types.InlineKeyboardButton(text="Orca Trade Bot", url=bot_url+"?start=chref-"+str(guser_id))
                        ankey2 = types.InlineKeyboardButton(text="Yardım Al", url="https://t.me/OrcaTradeBot_Destek")
                        cb1.add(ankey,ankey2)

                        if sgn['trend']=="SHORT":
                            new_message = "🛑 "+str(sgn['trend'])+"\n"
                        else:
                            new_message = "🟢 "+str(sgn['trend'])+"\n"
                            
                        new_message+= "❇️ "+str(sgn['symbol'])+"\n"
                        new_message+= "☣ Giriş : "+str(sgn['entry1'])+" - "+str(sgn['entry2'])+"\n"
                        new_message+= "☪ Target 1 - "+str(sgn['tp1'])+"\n"
                        if(sgn['tp2']>0): new_message+= "☪ Target 2 - "+str(sgn['tp2'])+"\n"
                        if(sgn['tp3']>0): new_message+= "☪ Target 3 - "+str(sgn['tp3'])+"\n"
                        if(sgn['tp4']>0): new_message+= "☪ Target 4 - "+str(sgn['tp4'])+"\n"
                        if(sgn['tp5']>0): new_message+= "☪ Target 5 - "+str(sgn['tp5'])+"\n"
                        if(sgn['tp6']>0): new_message+= "☪ Target 6 - "+str(sgn['tp6'])+"\n"
                        if(sgn['tp7']>0): new_message+= "☪ Target 7 - "+str(sgn['tp7'])+"\n"
                        if(sgn['tp8']>0): new_message+= "☪ Target 8 - "+str(sgn['tp8'])+"\n"
                        if(sgn['tp9']>0): new_message+= "☪ Target 9 - "+str(sgn['tp9'])+"\n"
                        if(sgn['tp10']>0): new_message+= "☪ Target 10 - "+str(sgn['tp10'])+"\n"
                        new_message+= "⛔️ Stop Loss : "+str(sgn['sl'])+"\n"
                        #new_message+= "▶️ Leverage: CROSS 5x-20X arası";
                        
                        if str(gid) == "1611566359":
                            new_message+= "\nBy: @CRiYPTOJACK";
                        elif str(gid) == "1526400476":
                            new_message+= "\nBy: @CoinBey1";
                        new_message+= "\nThis is not investment advice";
                        #signal_new = await tb.send_message(guser_id, new_message,reply_markup=cb1)
                        signal_new = await tb.send_message(guser_id, new_message,reply_markup=cb1)
                        msg_id = signal_new.id 
                    except Exception as ee:
                        print("send new signal error :",ee)
                        # msg_id = signal_new.id 
                        pass
                    
                          
                    print("signal_new_id:",msg_id)
                                      
                
                    chk = num_rows("select id from signals where signalid = '"+str(msg_id)+"'");
                    
                    if chk==0:
                        
                        c_symbol = sgn['symbol']
                        c_trend = sgn['trend']
                        c_entry1 = str(sgn['entry1'])
                        c_entry2 = str(sgn['entry2'])
                        c_tp1 = str(sgn['tp1'])
                        c_tp2 = str(sgn['tp2'])
                        c_tp3 = str(sgn['tp3'])
                        c_tp4 = str(sgn['tp4'])
                        c_tp5 = str(sgn['tp5'])
                        c_tp6 = str(sgn['tp6'])
                        c_tp7 = str(sgn['tp7'])
                        c_tp8 = str(sgn['tp8'])
                        c_tp9 = str(sgn['tp9'])
                        c_tp10 = str(sgn['tp10'])
                        
                        c_sl = str(sgn['sl'])
                        c_tarih =  str(mtmsp)
                        
                        mc_tarih = str(mtmsp)
                        
                        c_durum = str(1);
                        
                        cursor = conn.cursor()
                        #curs = mysql_query(cursor,"INSERT INTO `sinyaller` (`id` ,`sinyalgrup` ,`signalid` ,`symbol` ,`trend` ,`entry1` ,`entry2` ,`sl` ,`tp1` ,`tp2` ,`tp3`,`tp4`,`tp5`,`tarih`,`durum`) VALUES (NULL , '"+str(gid)+"' , '"+str(msg.id)+"' , '"+c_symbol+"', '"+c_trend+"', '"+c_entry1+"', '"+c_entry2+"', '"+c_sl+"', '"+c_tp1+"', '"+c_tp2+"', '"+c_tp3+"', '"+c_tp4+"', '"+c_tp5+"', '"+c_tarih+"', '"+c_durum+"');");
                        myt_sql = "INSERT INTO `signals` (`id` ,`signalgrup` ,`signalid` ,`signal_data` ,`symbol` ,`trend` ,`entry1` ,`entry2` ,`sl` ,`tp1` ,`tp2` ,`tp3`,`tp4`,`tp5`,`tp6`,`tp7`,`tp8`,`tp9`,`tp10`,`tarih`) VALUES (NULL , '"+str(grup_id)+"' , '"+str(msg_id)+"' , '"+str(base64_message)+"' , '"+c_symbol+"', '"+c_trend+"', '"+c_entry1+"', '"+c_entry2+"', '"+c_sl+"', '"+c_tp1+"', '"+c_tp2+"', '"+c_tp3+"', '"+c_tp4+"', '"+c_tp5+"', '"+c_tp6+"', '"+c_tp7+"', '"+c_tp8+"', '"+c_tp9+"', '"+c_tp10+"', '"+mc_tarih+"');"
                        print("myt_sql:",myt_sql)
                        curs = mysql_query(cursor,myt_sql);
                        #conn.commit()
                        
                        last_id = cursor.lastrowid
                        conn.commit()
                        cursor.close()
                        
                    try:
                        asyncio.create_task(tb.delete_message(guser_id,old_msg_id))
                        print("message deleted ",old_msg_id);
                    except Exception as ee:
                        print("message delete error:",ee)
                        pass
                                                       

            #await client.delete_message(int(user_id),int(msg_id))
      
            sys.stdout.flush()
      
            
        except Exception as error:
            
            print("signal add error:",error)
          
            sys.stdout.flush()
           
            return "user_id:"+str(user_id)+" grup_id:"+str(grup_id);

    @tb.channel_post_handler(func=lambda message: True)
    async def send_channel_message(message):
      
        jsond = str(message).replace("'","\\'").replace("\"","\\\"")
        #print("json:",jsond)
        suan = str(pd.to_datetime(datetime.now()))
        
        cursor = new_cursor()
        cursor.execute("INSERT INTO `channel_events` (`id`, `msg`, `tarih`, `durum`) VALUES (NULL, '"+jsond+"', '"+suan+"', '0');");
        cursor.close()
        
        asyncio.create_task(read_group(message))

    def check_api_grups():

        ftcr = fetch_row("SELECT id,(select first_name from users where user_id = a.user_id) as username,(select name from apikeys where id = a.api_id) as api_name,(select isim from sinyalgrup where id = a.grup_id) as grup_name FROM `apigruplari` as a ORDER BY `grup_id` DESC;")
        
        for rw in ftcr:
            
            if rw[1] == None or rw[2] == None or rw[3] == None:
                fetch_row("delete from apigruplari where id = '"+str(rw[0])+"'")
                print("#",rw[0]," username:",rw[1]," api_name:",rw[2]," grup_name:",rw[3])

    def exchange_name(ename):
        
        enm = ""
        
        if ename == "binance":
            enm = "Binance"
        elif ename == "bingx":
            enm = "Bingx"
        elif ename == "bybit":
            enm = "Bybit"
        
        return enm    
        
    def generate_user_dict(user_id):
        
        user_id=str(user_id)
        
        
        try:
            if api_ekle_form[user_id]==None:
                api_ekle_form[user_id] = []
        except Exception as ee:
            print("api_ekle_form(error):",ee)
            api_ekle_form[user_id]={}
            
        try:
            if api_duzenle_form[user_id]==None:
                api_duzenle_form[user_id] = []
        except Exception as ee:
            print("api_duzenle_form(error):",ee)
            api_duzenle_form[user_id]={}

        try:
            if api_grup_form[user_id]==None:
                api_grup_form[user_id] = []
        except Exception as ee:
            print("api_grup_form(error):",ee)
            api_grup_form[user_id]={}

    def add_msg_id(user_id,tur,msg_id,msg):
        
        tarih = pd.to_datetime(datetime.now())
        cursor = new_cursor()
        
       
        cursor.execute("INSERT INTO `komutlar` (`id` ,`user_id` ,`tur` ,`msg_id` ,`msg` ,`date`) VALUES (NULL , '"+str(user_id)+"', '"+str(tur)+"', '"+str(msg_id)+"', '"+str(msg)+"', '"+str(tarih)+"');");
        
        cursor.close()
        
    def delete_rows(sql):
        cursor = new_cursor()
    
        cursor.execute(sql);
        
        cursor.close();
        
    async def delete_all_msg_id(user_id):
        
        
            lmi = fetch_row("select * from komutlar where user_id = '"+str(user_id)+"' and msg != '/start'")
            keyz=[]
            keyi=[]
            for e in range(len(lmi)):
            
                try:
                    tfy = lmi[e]
                    print("delete from komutlar where id = '"+str(tfy[0])+"' - ",str(tfy[3]))
                    delete_rows("delete from komutlar where id = '"+str(tfy[0])+"'")
                    await tb.delete_message(user_id,int(tfy[3]))            
                        
                except Exception as err:
                    #print("exc:",err)
                    pass
          
    def delete_last_msg_id(user_id):
        
        try:
            lmi = fetch_row("select * from komutlar where user_id = '"+str(user_id)+"' and msg != '/start' order by id desc LIMIT 1")
            keyz=[]
            keyi=[]
            for e in range(len(lmi)-1,-1,-1):
                tfy = lmi[e]
                keyz.append(tfy[3])
                keyi.append(tfy[0])
            
            if len(keyz)>0:
                delete_rows("delete from komutlar where id = '"+str(keyi[0])+"'")
                tb.delete_message(user_id,int(keyz[0]))
        except:
            pass
        
    def last_msg_id(user_id):

        lmi = fetch_row("select * from komutlar where user_id = '"+str(user_id)+"' and msg != '/start' order by id desc LIMIT 5")
        keyz=[]
        for e in range(len(lmi)-1,-1,-1):
            tfy = lmi[e]
            keyz.append(tfy[3])
        
        return keyz

    def session_value(sess,key):
        
        skeys = list(sess.keys())
        
        rval = ""
        
        for sce in range(len(skeys)):
            s_key = skeys[sce]
            
            if key == s_key:
                rval = sess[s_key]
                break
            else:
                rval = ""
        
        
        return rval
            
    def session_free(user_id):
        user_id = str(user_id)
        cursor = new_cursor()
        cursor.execute("delete from `sessions` where `user_id` = '"+user_id+"'");
        
        cursor.close()
        cursor = new_cursor()
        cursor.execute("delete from `komutlar` where `user_id` = '"+user_id+"'");
        
        cursor.close()
            
    def session_read(user_id,key=""):
        
        user_id = str(user_id)
        keys = str(key)
        
        cols = {}
        
        if keys != "":
            rows = fetch_row("select * from sessions where `user_id` = '"+user_id+"' and `keys` = '"+key+"'")
        else:
            rows = fetch_row("select * from sessions where `user_id` = '"+user_id+"'")
        
        for row in rows:
            cols[row[2]] = row[3]
        
        return cols

    def session_write(user_id,key,value):
        
        user_id = str(user_id)
        keys = str(key)
        values = str(value)
        
        print("select * from sessions where `user_id` = '"+user_id+"' and `keys` = '"+key+"'")
        varmi = num_rows("select * from sessions where `user_id` = '"+user_id+"' and `keys` = '"+key+"'")
        
        cursor = new_cursor()
        if varmi<1:
            print("INSERT INTO `sessions` (`id` ,`user_id` ,`keys` ,`values`) VALUES (NULL , '"+user_id+"', '"+keys+"', '"+values+"');")
            cursor.execute("INSERT INTO `sessions` (`id` ,`user_id` ,`keys` ,`values`) VALUES (NULL , '"+user_id+"', '"+keys+"', '"+values+"');");
            #         
        else:
            print("update `sessions` set `values` = '"+values+"' where `user_id` = '"+user_id+"' and `keys` = '"+keys+"'")
            cursor.execute("update `sessions` set `values` = '"+values+"' where `user_id` = '"+user_id+"' and `keys` = '"+keys+"'");
        
        cursor.close()
        
    def bildirim_ekle(user_id,msg):
        
        cursor = new_cursor()
        #print("INSERT INTO `bildirimler` (`id` ,`user_id` ,`msg` ,`gonderim`) VALUES (NULL , '"+str(user_id)+"' , '"+str(msg)+"', '0');");
        cursor.execute("INSERT INTO `bildirimler` (`id` ,`user_id` ,`msg` ,`gonderim`) VALUES (NULL , '"+str(user_id)+"' , '"+str(msg)+"', '0');");
        
        cursor.close()
        
    async def api_ekle_start(user_id):
        
        api_ekle_form[user_id]={}
        api_ekle_form[user_id]['start'] = 1
        api_ekle_form[user_id]['name'] = None
        api_ekle_form[user_id]['borsa'] = None
        api_ekle_form[user_id]['key'] = None
        api_ekle_form[user_id]['secret'] = None
        api_ekle_form[user_id]['lotsize'] = None
        api_ekle_form[user_id]['leverage'] = None
        api_ekle_form[user_id]['strateji'] = None
        api_ekle_form[user_id]['pos_type'] = None
        api_ekle_form[user_id]['max_emir'] = None

        abone_uye = fetch_row("select * from users where user_id = '"+user_id+"'")
        
        abone_time = 0;
        
        for e in range(len(abone_uye)):
            
            abu = abone_uye[e]
            
            abone_time = abu[6]
            
            print("abu:",abu)

            break 
            
        
        if abone_time==None:
            abone_time=0
        
        
        
        if abone_time == 0 and False:
            
            asyncio.create_task(odeme_formu(user_id))
        
        else:
        
            asyncio.create_task(api_ekle_1(user_id))

    async def api_ekle_1(user_id):

        (tb_send_message(user_id,'Buradan hesap eklemek istediğiniz Crypto borsasını seçiniz',borsalar("api_ekle_borsa")))

    async def hesaplarim(user_id):

        (tb_send_message(user_id,'Hangi Borsaya ait api anahtarlarınız olduğunu seçiniz',borsalar("hesaplar_borsa")))

    async def sinyal_grup(user_id):
        session_free(user_id)
        (tb_send_message(user_id,'Hangi Borsaya ait api anahtarlarınızın sinya gruplarını seçmek istiyorsanz seçiiz',borsalar("sinyal_grup_borsa")))

    async def emir_ayar(user_id):

        api_duzenle_form[user_id]={}
        api_duzenle_form[user_id]['start'] = 1
        api_duzenle_form[user_id]['eid'] = None
        api_duzenle_form[user_id]['name'] = None
        api_duzenle_form[user_id]['borsa'] = None
        api_duzenle_form[user_id]['lotsize'] = None
        api_duzenle_form[user_id]['leverage'] = None
        api_duzenle_form[user_id]['strateji'] = None
        api_duzenle_form[user_id]['pos_type'] = None
        api_duzenle_form[user_id]['max_emir'] = None

        (tb_send_message(user_id,'Hangi Borsaya ait api anahtarınızda emir lot büyüklüğü ve kaldıraç ayarı yapmak istiyorsanız seçiniz',borsalar("emir_ayarlama")))

    async def sinyal_grup_borsa(user_id,borsa):

        cb1 = types.InlineKeyboardMarkup()
        
        anahtarlar = fetch_row("select * from apikeys where user_id = '"+user_id+"' and exchange='"+borsa+"'")
        
        for e in range(len(anahtarlar)):
            
            anaht = anahtarlar[e]
            
            hid = str(anaht[0])
            hkey = str(anaht[2])+" "+str(anaht[6])+" USD 1/"+str(anaht[7])+" "+str(anaht[9])+" "+str(anaht[10])+" "+str(anaht[11])+" adet"
            
            ankey = types.InlineKeyboardButton(text=hkey, callback_data='sinyal_grup_duzen_'+borsa+'_'+hid)
            cb1.add(ankey)
            
        buton1 = types.InlineKeyboardButton(text='ANA MENU', callback_data='anamenu')
        buton2 = types.InlineKeyboardButton(text='GERİ', callback_data='sinyal_grup')
      
        cb1.add(buton1,buton2)
        
        (tb_send_message(user_id,'Bu sayfada Api anahtarlarınızı dahil olduğu sinyal gruplarını seçebilirsiniz. Bu sayede hangi stratejilerden sinyal alıp almayacağnı seçebilirsiniz.',cb1))
      
    async def emir_ayarlama(user_id,borsa):
        
        cb1 = types.InlineKeyboardMarkup()
        
        anahtarlar = fetch_row("select * from apikeys where user_id = '"+user_id+"' and exchange='"+borsa+"'")
        
        for e in range(len(anahtarlar)):
            
            anaht = anahtarlar[e]
            
            hid = str(anaht[0])
            

            strj = str(anaht[9])

            if strj == "strateji_a":
                strj="Tek Kademeli Stop"
            if strj == "strateji_b":
                strj="Çift Kademeli Stop"
            if strj == "strateji_c":
                strj="Eşit Bölünmüş Kâr Al"
            if strj == "strateji_d":
                strj="İzleyen Stoploss"
            
            hkey = str(anaht[2])+" "+str(anaht[14])+" USD 1/"+str(anaht[7])+" "+str(strj)+" "+str(anaht[10])+" "+str(anaht[11])+" adet"
            
            ankey = types.InlineKeyboardButton(text=hkey, callback_data='emir_duzen_'+borsa+'_'+hid)
            cb1.add(ankey)
            
        buton1 = types.InlineKeyboardButton(text='ANA MENU', callback_data='anamenu')
        buton2 = types.InlineKeyboardButton(text='GERİ', callback_data='emir_ayarlari')
      
        cb1.add(buton1,buton2)
        
        (tb_send_message(user_id,'Bu sayfada Api anahtarlarınızı kaldıraç ve lot işlem büyüklüğünü değiştirebilirsiniz. Değiştimek istediğiniz api anahtarının üstüne tıklatın',cb1))
      
    async def sinyal_ekle_grup(user_id,eid,gid,islem):
        
        user_id = str(user_id)
        gid = str(gid)
        eid = str(eid)
        
        apig = num_rows("select * from apigruplari where user_id = '"+(user_id)+"' and api_id = '"+(eid)+"' and grup_id = '"+(gid)+"'")
        
        cursor = new_cursor()
        if apig == 0 and islem == "AKTIF":
            cursor.execute("INSERT INTO `apigruplari` (`id` ,`user_id` ,`api_id` ,`grup_id`) VALUES (NULL , '"+str(user_id)+"' , '"+str(eid)+"', '"+str(gid)+"');");
            
        elif apig>0 and islem == "PASIF":
            cursor.execute("delete from `apigruplari` where user_id = '"+str(user_id)+"' and api_id = '"+str(eid)+"' and grup_id= '"+str(gid)+"';");
        
        cursor.close()
            
        asyncio.create_task(sinyal_grup_duzen(user_id,eid))
        
    async def sinyal_grup_duzen(user_id,eid):
        
        cb1 = types.InlineKeyboardMarkup()
        
        eid = str(eid)
        
        print("select * from apikeys where id = '"+eid+"'");
        apikey = fetch_row("select * from apikeys where id = '"+eid+"'");
        apik = apikey[0]
        borsa = apik[3]
        anahtarlar = fetch_row("select * from sinyalgrup where durum='1'")
        
        for e in range(len(anahtarlar)):
            
            anaht = anahtarlar[e]
            gid = str(anaht[0])
            
            apig = num_rows("select * from apigruplari where api_id = '"+(eid)+"' and grup_id = '"+(gid)+"'")
            
            g_status = "AKTIF";
            if apig==1:
                g_status="PASIF";
            
            hid = str(anaht[0])
            hkey = str(anaht[1])+" Durum:"+g_status
            
            ankey = types.InlineKeyboardButton(text=hkey, callback_data='sinyal_ekle_grup_'+eid+'_'+gid+"_"+g_status)
            cb1.add(ankey)
            
        buton1 = types.InlineKeyboardButton(text='ANA MENU', callback_data='anamenu')
        buton2 = types.InlineKeyboardButton(text='GERİ', callback_data='sinyal_grup_borsa_'+borsa)
      
        cb1.add(buton1,buton2)
        
        (tb_send_message(user_id,'Bu sayfada '+str(apik[2])+' '+str(apik[3])+' borsasındaki api anahtarının hangi sinyal gruplarından sinyal alıcağını seçiniz.',cb1))
      
    async def sgrup_listele_admin(user_id):

        cb1 = types.InlineKeyboardMarkup()
        
        anahtarlar = fetch_row("select * from sinyalgrup where 1")
        
        for e in range(len(anahtarlar)):
            
            anaht = anahtarlar[e]
            
            hid = str(anaht[1])
            hkey = str(anaht[1])+" "+str(anaht[2])
            
            ankey = types.InlineKeyboardButton(text=hkey, callback_data='sinyal_grup_sil_'+hid)
            cb1.add(ankey)
            
        buton1 = types.InlineKeyboardButton(text='ANA MENU', callback_data='anamenu')
        buton2 = types.InlineKeyboardButton(text='GERİ', callback_data='grup_yonet')
      
        cb1.add(buton1,buton2)
        
        (tb_send_message(user_id,'Bu sayfada sinyal gruplarını ekleyebilirsiniz böylece farklı stratejilere dayalı sinyaller eklenebilir ve işlem açılabilir',cb1))

    async def sgrup_aktif_pasif(user_id):

        cb1 = types.InlineKeyboardMarkup()
        
        anahtarlar = fetch_row("select * from sinyalgrup where 1")
        
        for e in range(len(anahtarlar)):
            
            anaht = anahtarlar[e]
            
            hid = str(anaht[0])
            
            sdurum = "AKTIF";
            if anaht[3] == 0:
                sdurum = "PASIF"
            else:
                sdurum = "AKTIF"
            
            
            hkey = str(anaht[1])+" "+str(anaht[2])+" "+sdurum
            
            ankey = types.InlineKeyboardButton(text=hkey, callback_data='sinyala_grup_aktif_'+hid)
            cb1.add(ankey)
            
        buton1 = types.InlineKeyboardButton(text='ANA MENU', callback_data='anamenu')
        buton2 = types.InlineKeyboardButton(text='GERİ', callback_data='grup_yonet')
      
        cb1.add(buton1,buton2)
        
        (tb_send_message(user_id,'Bu sayfada sinyal gruplarını aktif veya pasif duruma getirebilirsiniz.',cb1))

    async def sinyal_grup_sil(user_id,hid):

        hesap_no = str(hid)

        cb1 = types.InlineKeyboardMarkup()
        
        ankey = types.InlineKeyboardButton(text="EVET", callback_data='grupz_sil_yes_'+hesap_no)
        cb1.add(ankey)
        ankey = types.InlineKeyboardButton(text="HAYIR", callback_data='grup_yonet')
        cb1.add(ankey)
            
        (tb_send_message(user_id,hesap_no+' nolu sinyal grubunu silmek istediğinize emin misiniz ?', cb1))

    async def grup_yonet(user_id):

        api_grup_form[user_id] = {}
        api_grup_form[user_id]['isim'] = None
        api_grup_form[user_id]['tur'] = None

        cb1 = types.InlineKeyboardMarkup()
        
        buton1 = types.InlineKeyboardButton(text='Sinyal Gruplarını Listele', callback_data='sgrup_listele_admin')
        buton2 = types.InlineKeyboardButton(text='Sinyal Gruplarını Aktif Pasif Yap', callback_data='sgrup_aktif_pasif')
        buton3 = types.InlineKeyboardButton(text='Sinyal Grubu Ekle', callback_data='sgrup_ekle')
        buton4 = types.InlineKeyboardButton(text='GERİ', callback_data='anamenu')
      
        cb1.add(buton1)
        cb1.add(buton2)
        cb1.add(buton3)
        cb1.add(buton4)
        
        (tb_send_message(user_id,'Bu sayfada Api anahtarlarınızı kaldıraç ve lot işlem büyüklüğünü değiştirebilirsiniz. Değiştimek istediğiniz api anahtarının üstüne tıklatın',cb1))

    async def grupz_sil_yes(user_id,hid):

        hesap_no = str(hid)
        
        cursor = new_cursor()
        cursor.execute("delete from sinyalgrup where isim = '"+hesap_no+"'")
        
        cursor.close()
        
        cb1 = types.InlineKeyboardMarkup()
        
        ankey = types.InlineKeyboardButton(text="Tüm Sinya Gruplarını Listele", callback_data='sgrup_listele_admin')
        cb1.add(ankey)
        
        ankey = types.InlineKeyboardButton(text="Ana Menüye dön", callback_data='anamenu')
        cb1.add(ankey)
            
        (tb_send_message(user_id,hesap_no+' isimli sinyal grubu silinmiştir.', cb1))
     
    async def sinyala_grup_aktif(user_id,hid):

        hesap_no = str(hid)


        hesap_no = str(hid)
        
        ans = fetch_row("select * from sinyalgrup where id = '"+hesap_no+"'")
        aas = ans[0];
        newd = "PASIF";
        
        cursor = new_cursor()
        
        if str(aas[3]) =="1":
            print("update sinyalgrup set durum='0' where id = '"+hesap_no+"'");
            cursor.execute("update sinyalgrup set durum='0' where id = '"+hesap_no+"'")
            newd = "PASIF";
        else:
            print("update sinyalgrup set durum='1' where id = '"+hesap_no+"'");
            cursor.execute("update sinyalgrup set durum='1' where id = '"+hesap_no+"'")
            newd = "AKTIF";
        
        
        cursor.close()
        
        cb1 = types.InlineKeyboardMarkup()
        
        ankey = types.InlineKeyboardButton(text="Tüm Sinyal Gruplarını Listele", callback_data='sgrup_aktif_pasif')
        cb1.add(ankey)
        
        ankey = types.InlineKeyboardButton(text="Ana Menüye dön", callback_data='anamenu')
        cb1.add(ankey)
            
        (tb_send_message(user_id,aas[1]+' isimli sinyal grubunun durumu '+newd+' olarak değiştirilmiştir.', cb1))
     
    async def sgrup_ekle(user_id,msg=None):
        
        aef = api_grup_form[user_id]
        
        sessions = session_read(user_id)
        s_ekle_api = session_value(sessions,"grup_form")
       
        print("sgrup_ekle("+user_id+") = ",msg,"  ",s_ekle_api)
        
        cursor = new_cursor()
        
        if s_ekle_api == "":
        
            await delete_all_msg_id(user_id)
            (tb_send_message(user_id,"Lütfen sinyal grubu için ismi giriniz"))
            session_write(user_id,"grup_form",1)
          
        elif aef['isim'] == None:
            await delete_all_msg_id(user_id)
            aef['isim']=msg

            cb1 = types.InlineKeyboardMarkup()
            str_1 = types.InlineKeyboardButton(text='Ücretsiz', callback_data='ucretsiz')
            str_2 = types.InlineKeyboardButton(text='Premium', callback_data='premium')
            cb1.add(str_1,str_2)
                  
            (tb_send_message(user_id,"Lütfen grup türünü seçiniz",cb1))
        elif aef['tur'] == None:

            await delete_all_msg_id(user_id)
            aef['tur']=msg
            

            api_dogru=0
            
            
            s_name = aef['isim']
            s_tur = aef['tur']
                
                    
            cursor.execute("INSERT INTO `sinyalgrup` (`id` ,`isim` ,`tur` ,`durum`) VALUES (NULL , '"+str(s_name)+"', '"+str(s_tur)+"','1');");
            #   ()
            
            cursor.close()
        
            cb1 = types.InlineKeyboardMarkup()
            
            ankey = types.InlineKeyboardButton(text="Yeni bir sinyal grubu ekle", callback_data='sgrup_ekle')
            cb1.add(ankey)
            ankey2 = types.InlineKeyboardButton(text="Sinyal Gruplar", callback_data='grup_yonet')
            cb1.add(ankey2)
            ankey3 = types.InlineKeyboardButton(text="Ana Menüye dön", callback_data='anamenu')
            cb1.add(ankey3) 

            (tb_send_message(user_id,""+str(s_name)+" isimli sinyal grubu başarı ile eklenmiştir..",cb1))
            session_free(user_id)
            
            
            print("------------------")
            print(aef)
            print("------------------")
            
            aef = {}
        
        api_duzenle_form[user_id] = aef
        
    async def hesaplar_listele(user_id,borsa):

        cb1 = types.InlineKeyboardMarkup()
        
        anahtarlar = fetch_row("select * from apikeys where user_id = '"+user_id+"' and exchange='"+borsa+"'")
        
        for e in range(len(anahtarlar)):
            
            anaht = anahtarlar[e]
            
            hid = str(anaht[0])
            hkey = str(anaht[2])+" "+str(anaht[6])+" USD 1/"+str(anaht[7])+" "+str(anaht[9])+" "+str(anaht[10])+" "+str(anaht[11])+" adet"
            
            ankey = types.InlineKeyboardButton(text=hkey, callback_data='hesap_'+borsa+'_'+hid)
            cb1.add(ankey)
            
        buton1 = types.InlineKeyboardButton(text='ANA MENU', callback_data='anamenu')
        buton2 = types.InlineKeyboardButton(text='GERİ', callback_data='hesaplar')
      
        cb1.add(buton1,buton2)
        
        (tb_send_message(user_id,'Bu sayfada '+borsa+' Api anahtarlarınızı görebilirsiniz. Api Anahtarınızın üstüne tıklayıp o anahtarınızı silebilirsiniz.',cb1))

    def borsalar(onek):
        cb1 = types.InlineKeyboardMarkup()
        buton1 = types.InlineKeyboardButton(text='BİNANCE', callback_data=onek+'_binance')
        buton2 = types.InlineKeyboardButton(text='BINGX', callback_data=onek+'_bingx')
        buton3 = types.InlineKeyboardButton(text='BYBIT', callback_data=onek+'_bybit')
        buton4 = types.InlineKeyboardButton(text='ANA MENÜ', callback_data='anamenu')
      
        cb1.add(buton1)
        cb1.add(buton2)
        cb1.add(buton3)
        cb1.add(buton4)
        
        return cb1


    async def api_ekle_borsa(user_id,borsa,msg=None):
        
        aef = api_ekle_form[user_id]
        
        sessions = session_read(user_id)
        
        s_ekle_api = session_value(sessions,borsa+"_api")
        
        print("api_ekle_borsa("+user_id+","+borsa+") = ",msg,"  ",s_ekle_api)
        
        borsa_name = exchange_name(borsa)
        
        cursor = new_cursor()
        
        mvapi = num_rows("select id from apikeys where user_id = '"+str(user_id)+"' and abonelik = 0")
        
        mgk = fetch_row("select max_api_adet from sinyalgrup where id = '1'")
        
        umk = fetch_row("select api_hakki from users where user_id = '"+str(user_id)+"'")
            
        print("umk:",umk)    
            
        max_api_adet = int(mgk[0][0])
        api_hakki = int(umk[0][0])
        
        if max_api_adet>0 and mvapi>=max_api_adet and api_hakki==0:
                
            cb1 = types.InlineKeyboardMarkup()
                    
            buton1 = types.InlineKeyboardButton(text='Ekstra Api hakkı satın al', callback_data='api_satin_al')
            buton2 = types.InlineKeyboardButton(text='ANA MENU', callback_data='anamenu')
          
            cb1.add(buton1)            
            cb1.add(buton2)            
            (tb_send_message(user_id,"Abonelik dahilindeki maksimum "+str(max_api_adet)+" maksimum api adedi limitini doldurmuş bulunuyorsunuz daha fazla api eklemek için api hakkı satın almanız gerekmektedir.",cb1))
            
        else:
        


            cb1 = types.InlineKeyboardMarkup()
                    
            buton1 = types.InlineKeyboardButton(text='ANA MENU', callback_data='anamenu')
          
            cb1.add(buton1)            
            
            if s_ekle_api == "":
                await delete_all_msg_id(user_id)
                
                (tb_send_message(user_id,"Lütfen "+borsa_name+" borsası için anahtar ismi giriniz",cb1))
                session_write(user_id,borsa+"_api",1)
                aef['borsa']=borsa
            elif aef['name'] == None:
                await delete_all_msg_id(user_id)
                aef['name']=msg
                (tb_send_message(user_id,"Lütfen "+borsa_name+" borsası için api_key giriniz",cb1))
            elif aef['key'] == None:
                await delete_all_msg_id(user_id)
                aef['key']=msg
                (tb_send_message(user_id,"Lütfen "+borsa_name+" borsası için api_secret key giriniz",cb1))
                
            elif aef['secret'] == None and aef['borsa'] == "kucoin":
                await delete_all_msg_id(user_id)
                aef['secret']=msg
                (tb_send_message(user_id,"Lütfen "+borsa_name+" borsası için password giriniz",cb1))
              
            elif (aef['secret'] == None and aef['borsa'] != "kucoin") or (aef['password'] == None and aef['borsa'] == "kucoin"):
                await delete_all_msg_id(user_id)
                
                if aef['borsa'] != "kucoin":
                    aef['secret']=msg
                else:
                    aef['password']=msg
                
              

                api_dogru=0
                
                '''
                
                bingx api key : mx0LSAGWqfcs6QulDj
                bingx api secret : 70e891db1dea4d739f63191f405d2570
                
                bybit api key : kWlilSMRgvXftBwrNf
                bybit api secret : z9kebmxlMYKQ5dKlaSZWntOjnFCMtsROG74x
                
                
                
                
                '''
                
                s_borsa = aef['borsa']
                s_api_name = aef['name']
                s_api_key = aef['key']
                s_api_secret = aef['secret']
                if aef['borsa'] != "kucoin":
                    s_api_password = ""
                else:
                    s_api_password = aef['password']
                
                
                s_lot_size = "6"
                s_leverage = "20"
                s_position_mode = "0"
                
                try:
                
                    print("s_borsa:",s_borsa," s_api_name:",s_api_name," s_api_key:",s_api_key," s_api_secret:",s_api_secret)
                    trade_log(user_id,"s_borsa:",s_borsa," s_api_name:",s_api_name," s_api_key:",s_api_key," s_api_secret:",s_api_secret)
                
                    if s_borsa=="binance_spot":
                        exchange_id = 'binance'
                    if s_borsa=="binance":
                        exchange_id = 'binanceusdm'
                    elif s_borsa=="bingx":
                        exchange_id = 'bingx'
                    elif s_borsa=="bybit":
                        exchange_id = 'bybit'
                    elif s_borsa=="kucoin":
                        exchange_id = 'kucoinfutures'
                    
                    if exchange_id == "kucoinfutures":
                        exchange_class = getattr(ccxt, exchange_id)
                        exchange = exchange_class({
                            'apiKey': s_api_key,
                            'secret': s_api_secret,
                            'password':s_api_password
                        })        
                    else:
                        exchange_class = getattr(ccxt, exchange_id)
                        exchange = exchange_class({
                            'apiKey': s_api_key,
                            'secret': s_api_secret,
                        })        
                    
                    #print("----------------------");
                    #print(exchange.fetch_balance());
                    trade_log(user_id,exchange.fetch_balance());
                    #print("----------------------");
                    
                    api_dogru=1
                    
                except Exception as ee:
                    print("exchange err:",ee)
                
                
                
                if api_dogru==1:
                
                    
                    if max_api_adet>0 and mvapi>=max_api_adet and api_hakki>0:
                    
                        apiabonelik = round(time.time())+(60*60*24*30)
                    
                        cursor=new_cursor();
                        cursor.execute("""INSERT INTO `apikeys` (`id` ,`user_id` ,`exchange` ,`name` ,`api_key` ,`api_secret` ,`api_password` ,`lot` ,`leverage`,`margin`,`order_type`,`tp1`,`tp2`,`tp3`,`tp4`,`tp5`,`tp6`,`tp7`,`tp8`,`tp9`,`tp10`,`stoploss`,`takeprofit`,`trailstop`,`trailstep`,`sltpemir`,`maliyetinecek`,`maxemir`,`abonelik`,`durum`) 
                                                         VALUES (NULL , '"""+user_id+"""', '"""+s_borsa+"""', '"""+s_api_name+"""', '"""+s_api_key+"""', '"""+s_api_secret+"""', '"""+s_api_password+"""', '"""+s_lot_size+"""', '"""+s_leverage+"""', '"""+s_position_mode+"""','LIMIT','20','20','20','20','20','0','0','0','0','0', '0', '0', '0','0','1','0','10','0','1');""");
                        cursor.close()
                        
                        fetch_row("update users set api_hakki = (api_hakki-1) where user_id = '"+str(user_id)+"'")
                        
                    else:
                    
                        cursor=new_cursor();
                        cursor.execute("""INSERT INTO `apikeys` (`id` ,`user_id` ,`exchange` ,`name` ,`api_key` ,`api_secret` ,`api_password` ,`lot` ,`leverage`,`margin`,`order_type`,`tp1`,`tp2`,`tp3`,`tp4`,`tp5`,`tp6`,`tp7`,`tp8`,`tp9`,`tp10`,`stoploss`,`takeprofit`,`trailstop`,`trailstep`,`sltpemir`,`maliyetinecek`,`maxemir`,`abonelik`,`durum`) 
                                                         VALUES (NULL , '"""+user_id+"""', '"""+s_borsa+"""', '"""+s_api_name+"""', '"""+s_api_key+"""', '"""+s_api_secret+"""', '"""+s_api_password+"""', '"""+s_lot_size+"""', '"""+s_leverage+"""', '"""+s_position_mode+"""','LIMIT','20','20','20','20','20','0','0','0','0','0', '0', '0', '0','0','1','0','10','0','1');""");
                        cursor.close()
                        
                    cb1 = types.InlineKeyboardMarkup()
                    
                    ankey = types.InlineKeyboardButton(text="Yeni bir api anahtarı ekle", callback_data='api_ekle')
                    cb1.add(ankey)
                    ankey2 = types.InlineKeyboardButton(text="Api Anahtar ayarlarını yap", callback_data='emir_ayarlama_'+s_borsa)
                    cb1.add(ankey2)
                    ankey3 = types.InlineKeyboardButton(text="Ana Menüye dön", callback_data='anamenu')
                    cb1.add(ankey3) 

                    (tb_send_message(user_id,"Lütfen "+borsa_name+" borsası api anahtarınız başarı ile oluşturulmuştur. Şimdi eklediğiniz api anahtarı için ayarlarınızı yapınız.",cb1))
                    session_free(user_id)
                    
                else:
                
                    
                    cb1 = types.InlineKeyboardMarkup()
                    
                    ankey = types.InlineKeyboardButton(text="Yeni bir api anahtarı ekle", callback_data='api_ekle')
                    cb1.add(ankey)
                    ankey2 = types.InlineKeyboardButton(text="Api Anahtarlarım", callback_data='hesaplar')
                    cb1.add(ankey2)
                    ankey3 = types.InlineKeyboardButton(text="Ana Menüye dön", callback_data='anamenu')
                    cb1.add(ankey3) 

                    (tb_send_message(user_id,"Lütfen "+borsa_name+" borsası api anahtarınız doğrulanmadı lütfen tekrar ve doğru bir anahtar eklemeyi deneyin",cb1))
                    session_free(user_id)
                
                
                print("------------------")
                print(aef)
                print("------------------")
                    
                aef = {}
            
            api_ekle_form[user_id] = aef
        

    async def emir_duzenle_old(user_id,borsa,eid,msg=None):
        
        aef = api_duzenle_form[user_id]
        
        sessions = session_read(user_id)
        
        s_ekle_api = session_value(sessions,borsa+"_update_api")
        s_ekle_eid = session_value(sessions,borsa+"_update_eid")
        
        print("api_duzenle_form("+user_id+","+borsa+","+eid+") = ",msg,"  ",s_ekle_api)
        
        borsa_name = exchange_name(borsa)
        
        if s_ekle_api == "":
            await delete_all_msg_id(user_id)
            
            (tb_send_message(user_id,"Lütfen "+borsa_name+" borsası için hesabınızın yüzde kaçı ile işlem açmak istersiniz"))
            session_write(user_id,borsa+"_update_api",1)
            session_write(user_id,borsa+"_update_eid",eid)
            
            aef['eid']=eid
            aef['borsa']=borsa
        elif aef['lotsize'] == None:
            await delete_all_msg_id(user_id)
            aef['lotsize']=msg
            (tb_send_message(user_id,"Lütfen "+borsa_name+" borsası için emir açılmasını istediğiniz kaldıraç değerini giriniz"))
        elif aef['leverage'] == None:
            await delete_all_msg_id(user_id)
            aef['leverage']=msg

            cb1 = types.InlineKeyboardMarkup()
            str_1 = types.InlineKeyboardButton(text='Strateji A', callback_data='strateji_a')
            str_2 = types.InlineKeyboardButton(text='Strateji B', callback_data='strateji_b')
            cb1.add(str_1,str_2)
                  
            (tb_send_message(user_id,"Lütfen "+borsa_name+" borsası için stratejinizi seçiniz",cb1))
        elif aef['strateji'] == None:
            await delete_all_msg_id(user_id)
            aef['strateji']=msg
            
            cb1 = types.InlineKeyboardMarkup()
            str_1 = types.InlineKeyboardButton(text='CROSS', callback_data='cross')
            str_2 = types.InlineKeyboardButton(text='ISOLATED', callback_data='isolated')
            cb1.add(str_1,str_2)
            
            (tb_send_message(user_id,"Lütfen "+borsa_name+" borsası için pozisyon açma türünüzü seçiniz",cb1))
        elif aef['pos_type'] == None:
            await delete_all_msg_id(user_id)
            aef['pos_type']=msg
            
            (tb_send_message(user_id,"Lütfen "+borsa_name+" borsası maks aynı anda açılacak emir miktarınızı belirtiniz"))
        elif aef['max_emir'] == None:
            await delete_all_msg_id(user_id)
            aef['max_emir']=msg
            

            api_dogru=0
            
            
            s_eid = aef['eid']
            #s_api_name = aef['name']
            s_lot_size = aef['lotsize']
            s_leverage = aef['leverage']
            s_strateji = aef['strateji']
            s_position_mode = aef['pos_type']
            s_max_emir = aef['max_emir']
                
            cursor = new_cursor()        
            print("update `apikeys` set lotsize='"+s_lot_size+"', leverage='"+s_leverage+"', strateji='"+s_strateji+"', pos_type='"+s_position_mode+"', max_emir='"+s_max_emir+"' where id = '"+s_eid+"'");
            cursor.execute("update `apikeys` set lotsize='"+s_lot_size+"', leverage='"+s_leverage+"', strateji='"+s_strateji+"', pos_type='"+s_position_mode+"', max_emir='"+s_max_emir+"' where id = '"+s_eid+"'");
            #   ()
            
            cursor.close()
        
            cb1 = types.InlineKeyboardMarkup()
            
            ankey = types.InlineKeyboardButton(text="Yeni bir api anahtarı ekle", callback_data='api_ekle')
            cb1.add(ankey)
            ankey2 = types.InlineKeyboardButton(text="Api Anahtarlarım", callback_data='hesaplar')
            cb1.add(ankey2)
            ankey3 = types.InlineKeyboardButton(text="Ana Menüye dön", callback_data='anamenu')
            cb1.add(ankey3) 

            (tb_send_message(user_id,"#"+str(s_eid)+" nolu "+borsa_name+" Api anahtarınızın işlem açma ayarları başarı ile güncellenmiştir.",cb1))
            session_free(user_id)
            
            
            print("------------------")
            print(aef)
            print("------------------")
            
            aef = {}
        
        api_duzenle_form[user_id] = aef
       
    async def kanal_ayarlama(user_id,msg=None):
        
        
        sgn = fetch_row("select * from sinyalgrup where id = '1'")
        
        a_deneme_suresi=""
        a_kar_grafik_goster=""
        a_ucretsiz_kanal=""
        a_ucretsiz_kanal_id=""
        a_ref_comission=""
        a_max_api=""
        a_max_api_ucret=""
        
        if len(sgn)>0:
            gr = sgn[0]
            
            a_deneme_suresi=str(gr[7])+" gün"
            if gr[10]==0:
                a_kar_grafik_goster="Hepsinde Göster"
            else:
                a_kar_grafik_goster="TP"+str(gr[10])+" den itibaren goster"
            
            a_ucretsiz_kanal=str(gr[8])
            a_ucretsiz_kanal_id=str(gr[9])
            if a_ucretsiz_kanal_id != "":
                a_ucretsiz_kanal=a_ucretsiz_kanal+" ["+a_ucretsiz_kanal_id+"]"
            
            a_ref_comission=str(gr[11])
            
            a_max_api=str(gr[12])
            a_max_api_ucret=str(gr[13])
            
        
        
         
        cb1 = types.InlineKeyboardMarkup()
        
        ankey2 = types.InlineKeyboardButton(text="Kar Grafiği Gösterim Bildirimi:"+a_kar_grafik_goster, callback_data='admin_kar_grafik_goster')
        cb1.add(ankey2)
        ankey2 = types.InlineKeyboardButton(text="Ücretsiz Kanal Bildirimi:"+a_ucretsiz_kanal, callback_data='admin_ucretsiz_kanal')
        cb1.add(ankey2)
        
        if str(root_id).find(str(user_id))>-1:
            ankey = types.InlineKeyboardButton(text="Deneme Süresi : "+a_deneme_suresi, callback_data='admin_deneme_suresi')
            cb1.add(ankey)
            ankey2 = types.InlineKeyboardButton(text="Referans Komisyonu: %"+a_ref_comission, callback_data='admin_referans_komisyon')
            cb1.add(ankey2)
            ankey2 = types.InlineKeyboardButton(text="Referans Ödemeleri", callback_data='admin_referans_odemeleri')
            cb1.add(ankey2)
            ankey2 = types.InlineKeyboardButton(text="Kaç Apiden sonra ücret talep edilsin:"+a_max_api, callback_data='admin_max_api')
            cb1.add(ankey2)
            ankey2 = types.InlineKeyboardButton(text="Ek Api anahtarı ücreti: "+a_max_api_ucret, callback_data='admin_max_api_ucret')
            cb1.add(ankey2)
        
        ankey6 = types.InlineKeyboardButton(text="Anasayfa", callback_data='anamenu')
        cb1.add(ankey6) 
        

        (tb_send_message(user_id,"Bu bölümden kanalınızla ilgili gerekli ince ayarları yapabilirsiniz.",cb1))
        session_free(user_id)

    async def admin_deneme_suresi(user_id,deger=""):
        
        if deger=="":
            print("admin_deneme_suresi("+user_id+")")
            await delete_all_msg_id(user_id)
            session_free(user_id);
            
            eand = fetch_row("select * from sinyalgrup where id='1'")
            
            ean = eand[0]
                
            eski_deger = str(ean[7])+" gün"
            
            cb1 = types.InlineKeyboardMarkup()

            c_anamenu1 = types.InlineKeyboardButton(text="Kanal Ayarları", callback_data='kanal_ayarlama')
            cb1.add(c_anamenu1)

            c_anamenu2 = types.InlineKeyboardButton(text="Ana Menü", callback_data='anamenu')
            cb1.add(c_anamenu2)
                    
            (tb_send_message(user_id,"Lütfen kanalınıza üye olan kişiler kaç gün süre ile ücretsiz api kullanımı yapabileceklerdir. Eski Değer : "+eski_deger,cb1))
            session_write(user_id,"admin_deneme_suresi",user_id);
        
        else:

            print("admin_deneme_suresi_update("+user_id+")")
            #await delete_all_msg_id(user_id)
                
            cursor = new_cursor()
            cursor.execute("update `sinyalgrup` set deneme_suresi='"+deger+"' where id = '1'");
            
            cursor.close()            
            
            eand = fetch_row("select * from sinyalgrup where id='1'")
            
            ean = eand[0]
                
            yeni_deger = str(ean[7])+" gün"
            
            session_free(user_id);
            

            cb1 = types.InlineKeyboardMarkup()

            c_anamenu1 = types.InlineKeyboardButton(text="Kanal Ayarları", callback_data='kanal_ayarlama')
            cb1.add(c_anamenu1)

            c_anamenu2 = types.InlineKeyboardButton(text="Ana Menü", callback_data='anamenu')
            cb1.add(c_anamenu2)
                    
            
            (tb_send_message(user_id,"Kanalınızın ücretsiz deneme süresi "+yeni_deger+" olarak güncellenmiştir.",cb1))

    async def admin_kar_grafik_goster(user_id,deger=""):
        
        if deger=="":
            print("admin_kar_grafik_goster("+user_id+")")
            await delete_all_msg_id(user_id)
            session_free(user_id);
            
            eand = fetch_row("select * from sinyalgrup where id='1'")
            
            ean = eand[0]
                
            if ean[10]==0:
                eski_deger="Hepsinde Göster"
            else:
                eski_deger="TP"+str(ean[10])+" den itibaren goster"
                        
            
            cb1 = types.InlineKeyboardMarkup()

            c_anamenu1 = types.InlineKeyboardButton(text="Kanal Ayarları", callback_data='kanal_ayarlama')
            cb1.add(c_anamenu1)

            c_anamenu2 = types.InlineKeyboardButton(text="Ana Menü", callback_data='anamenu')
            cb1.add(c_anamenu2)
                    
            (tb_send_message(user_id,"Lütfen kanalınızda kar grafiği hangi bildirimlerde yapılacak onu seçiniz. Hepsi için 0 TP1 den sonra için 1, TP2 den sonra için 2, TP3 den sonra için 3, TP4 den sonra için TP4, TP5 den sonra için 5 yazınız. Eski Değer : "+eski_deger,cb1))
            session_write(user_id,"admin_kar_grafik_goster",user_id);
        
        else:

            print("admin_kar_grafik_goster_update("+user_id+")")
            #await delete_all_msg_id(user_id)
                
            cursor = new_cursor()
            cursor.execute("update `sinyalgrup` set kar_grafik_tp='"+deger+"' where id = '1'");
            
            cursor.close()            
            
            eand = fetch_row("select * from sinyalgrup where id='1'")
            
            ean = eand[0]
                
            if ean[10]==0:
                yeni_deger="Hepsinde Gösterilicek"
            else:
                yeni_deger="TP"+str(ean[10])+" den itibaren gosterilicek"
                  
            session_free(user_id);
            

            cb1 = types.InlineKeyboardMarkup()

            c_anamenu1 = types.InlineKeyboardButton(text="Kanal Ayarları", callback_data='kanal_ayarlama')
            cb1.add(c_anamenu1)

            c_anamenu2 = types.InlineKeyboardButton(text="Ana Menü", callback_data='anamenu')
            cb1.add(c_anamenu2)
                    
            (tb_send_message(user_id,"Kanalınızda bundan sonra kar grafikleri "+yeni_deger,cb1))

    async def admin_ucretsiz_kanal(user_id,deger=""):
        
        if deger=="":
            print("admin_ucretsiz_kanal("+user_id+")")
            await delete_all_msg_id(user_id)
            session_free(user_id);
            
            eand = fetch_row("select * from sinyalgrup where id='1'")
            
            ean = eand[0]
                
            if ean[8]=="":
                eski_deger="Tanımlı Değil"
            else:
                eski_deger=str(ean[8])
                        
            
            cb1 = types.InlineKeyboardMarkup()

            c_anamenu1 = types.InlineKeyboardButton(text="Kanal Ayarları", callback_data='kanal_ayarlama')
            cb1.add(c_anamenu1)

            c_anamenu2 = types.InlineKeyboardButton(text="Ana Menü", callback_data='anamenu')
            cb1.add(c_anamenu2)
                    
            (tb_send_message(user_id,"Bu bölümden TP5 e ulaşmış bildirimleri tanıtım amacı ile ücretsiz kanalda yayınlanmasını sağlıyabilirsiniz. Buraya kanalın ismini büyük küçük harf birebir aynı olmak şeklinde yazınız. Ardından Botu kanalda yönetici olarak ekleyiniz. Bot kanaldan gelen ilk mesaj ile birlikte kanalın id sini otomatik tanıyacak bu andan itibaren TP5 ulaşan sinyalleri ücretsiz kanalda tanıtım amaçlı olarak yolluyacaktır. - tire işareti koyarsanız mevcut olanı silecektir. Eski Değer : "+eski_deger,cb1))
            session_write(user_id,"admin_ucretsiz_kanal",user_id);
        
        else: 

            print("admin_ucretsiz_kanal_update("+user_id+")")
            #await delete_all_msg_id(user_id)
                
            cursor = new_cursor()
            
            if deger == "-":
                cursor.execute("update `sinyalgrup` set ucretsiz_kanal='',ucretsiz_kanal_id='' where id = '1'");
            else:
                cursor.execute("update `sinyalgrup` set ucretsiz_kanal='"+deger+"',ucretsiz_kanal_id='' where id = '1'");
            
            
            cursor.close()            
            
            eand = fetch_row("select * from sinyalgrup where id='1'")
            
            ean = eand[0]
                
            if ean[8]==0:
                yeni_deger="Tanımlı Değil"
            else:
                yeni_deger=str(ean[8])
                  
            session_free(user_id);
            

            cb1 = types.InlineKeyboardMarkup()

            c_anamenu1 = types.InlineKeyboardButton(text="Kanal Ayarları", callback_data='kanal_ayarlama')
            cb1.add(c_anamenu1)

            c_anamenu2 = types.InlineKeyboardButton(text="Ana Menü", callback_data='anamenu')
            cb1.add(c_anamenu2)
                    
            (tb_send_message(user_id,"Ücretsiz Tanıtım yapılacak kanalınızın adı "+yeni_deger+" olarak belirlenmiştir. Şimdi botu kanalda yönetici olarak atayınız.",cb1))
          
    async def admin_referans_komisyon(user_id,deger=""):
        
        if deger=="":
            print("admin_referans_komisyon("+user_id+")")
            await delete_all_msg_id(user_id)
            session_free(user_id);
            
            eand = fetch_row("select * from sinyalgrup where id='1'")
            ean = eand[0]
            eski_deger=str(ean[11])
                        
            
            cb1 = types.InlineKeyboardMarkup()

            c_anamenu1 = types.InlineKeyboardButton(text="Kanal Ayarları", callback_data='kanal_ayarlama')
            cb1.add(c_anamenu1)

            c_anamenu2 = types.InlineKeyboardButton(text="Ana Menü", callback_data='anamenu')
            cb1.add(c_anamenu2)
                    
            (tb_send_message(user_id,"Buradan satış yapan üyelerinizin yaptıkları satış başına ne kadar komisyon alacağını belirliyebilirsiniz. Eski Değer : %"+eski_deger,cb1))
            session_write(user_id,"admin_referans_komisyon",user_id);
        
        else: 

            print("admin_referans_komisyon_update("+user_id+")")
            #await delete_all_msg_id(user_id)
                
            cursor = new_cursor()
            
            cursor.execute("update `sinyalgrup` set referans_komisyon='"+deger+"' where id = '1'");
            
            
            cursor.close()            
            
            eand = fetch_row("select * from sinyalgrup where id='1'")
            
            ean = eand[0]
            yeni_deger=str(ean[11])
                  
            session_free(user_id);
            

            cb1 = types.InlineKeyboardMarkup()

            c_anamenu1 = types.InlineKeyboardButton(text="Kanal Ayarları", callback_data='kanal_ayarlama')
            cb1.add(c_anamenu1)

            c_anamenu2 = types.InlineKeyboardButton(text="Ana Menü", callback_data='anamenu')
            cb1.add(c_anamenu2)
                    
            (tb_send_message(user_id,"Kanalınızın tanıtımını yapacak üyelere vereceğiniz komisyon %"+yeni_deger+" olarak belirlenmiştir. ",cb1))
            
    async def admin_max_api(user_id,deger=""):
        
        if deger=="":
            print("admin_max_api("+user_id+")")
            await delete_all_msg_id(user_id)
            session_free(user_id);
            
            eand = fetch_row("select * from sinyalgrup where id='1'")
            ean = eand[0]
            eski_deger=str(ean[12])
            if eski_deger=="0":
                eski_deger="Sınırsız"
                        
            
            cb1 = types.InlineKeyboardMarkup()

            c_anamenu1 = types.InlineKeyboardButton(text="Kanal Ayarları", callback_data='kanal_ayarlama')
            cb1.add(c_anamenu1)

            c_anamenu2 = types.InlineKeyboardButton(text="Ana Menü", callback_data='anamenu')
            cb1.add(c_anamenu2)
                    
            (tb_send_message(user_id,"Üyenin kaç api anahtarına kadar abonelik ücreti ile kullanabileceğini belirtir. 0 demek sınırsız demektir. Eski Değer : "+eski_deger,cb1))
            session_write(user_id,"admin_max_api",user_id);
        
        else: 

            print("admin_max_api_update("+user_id+")")
            #await delete_all_msg_id(user_id)
                
            cursor = new_cursor()
            
            cursor.execute("update `sinyalgrup` set max_api_adet='"+deger+"' where id = '1'");
            
            
            cursor.close()            
            
            eand = fetch_row("select * from sinyalgrup where id='1'")
            
            ean = eand[0]
            yeni_deger=str(ean[12])
            if yeni_deger=="0":
                yeni_deger="Sınırsız"
                  
            session_free(user_id);
            

            cb1 = types.InlineKeyboardMarkup()

            c_anamenu1 = types.InlineKeyboardButton(text="Kanal Ayarları", callback_data='kanal_ayarlama')
            cb1.add(c_anamenu1)

            c_anamenu2 = types.InlineKeyboardButton(text="Ana Menü", callback_data='anamenu')
            cb1.add(c_anamenu2)
                    
            (tb_send_message(user_id,"Kanalınızın abonelik ile maksimum kullanabileceği api adedi "+yeni_deger+" olarak belirlenmiştir. ",cb1))
            
    async def admin_max_api_ucret(user_id,deger=""):
        
        if deger=="":
            print("admin_max_api_ucret("+user_id+")")
            await delete_all_msg_id(user_id)
            session_free(user_id);
            
            eand = fetch_row("select * from sinyalgrup where id='1'")
            ean = eand[0]
            eski_deger=str(ean[13])
          
                        
            
            cb1 = types.InlineKeyboardMarkup()

            c_anamenu1 = types.InlineKeyboardButton(text="Kanal Ayarları", callback_data='kanal_ayarlama')
            cb1.add(c_anamenu1)

            c_anamenu2 = types.InlineKeyboardButton(text="Ana Menü", callback_data='anamenu')
            cb1.add(c_anamenu2)
                    
            (tb_send_message(user_id,"Eğer Maksimum api adedi kısıtlaması belirtmişseniz üye api adedi başına ne kadar ücret ödeyecektir. Eski Değer : "+eski_deger,cb1))
            session_write(user_id,"admin_max_api_ucret",user_id);
        
        else: 

            print("admin_max_api_ucret_update("+user_id+")")
            #await delete_all_msg_id(user_id)
                
            cursor = new_cursor()
            
            cursor.execute("update `sinyalgrup` set max_api_ucret='"+deger+"' where id = '1'");
            
            
            cursor.close()            
            
            eand = fetch_row("select * from sinyalgrup where id='1'")
            
            ean = eand[0]
            yeni_deger=str(ean[13])
         
                  
            session_free(user_id);
            

            cb1 = types.InlineKeyboardMarkup()

            c_anamenu1 = types.InlineKeyboardButton(text="Kanal Ayarları", callback_data='kanal_ayarlama')
            cb1.add(c_anamenu1)

            c_anamenu2 = types.InlineKeyboardButton(text="Ana Menü", callback_data='anamenu')
            cb1.add(c_anamenu2)
                    
            (tb_send_message(user_id,"Üye maksimum api adedini geçtikten sonra api başına "+yeni_deger+" USDT ücret ödüyecektir. ",cb1))
        
        
        
        
        
        


   
    async def emir_duzenle(user_id,borsa,eid,msg=None):
         

        session_free(user_id);
        eand = my_query("select * from apikeys where user_id = '"+user_id+"' and id='"+eid+"'")
        
        if len(eand)>0:
            
            ean = eand[0]
            
            if ean['maliyetinecek'] == 0:
                ean['maliyetinecek']="Hayır"
            elif ean['maliyetinecek']==1:
                ean['maliyetinecek']="TP1"
            elif ean['maliyetinecek']==2:
                ean['maliyetinecek']="TP2"
            elif ean['maliyetinecek']==3:
                ean['maliyetinecek']="TP3"
            elif ean['maliyetinecek']==4:
                ean['maliyetinecek']="TP4"
            elif ean['maliyetinecek']==5:
                ean['maliyetinecek']="TP5"
            
            if ean['margin']==0:
                ean['margin']="ISOLATED"
            elif ean['margin']==1:
                ean['margin']="CROSSED"
                
            if ean['stoploss']==0:
                ean['stoploss']="SINYAL_SL"
            elif ean['stoploss']==-1:
                ean['stoploss']="STOPLOSS_YOK"
            else:
                ean['stoploss']="%"+str(round(ean['stoploss'],2))
            
            if ean['takeprofit']==0:
                ean['takeprofit']="SINYAL_TP"
            elif ean['takeprofit']==-1:
                ean['takeprofit']="TP1"
            elif ean['takeprofit']==-2:
                ean['takeprofit']="TP2"
            elif ean['takeprofit']==-3:
                ean['takeprofit']="TP3"
            elif ean['takeprofit']==-4:
                ean['takeprofit']="TP4"
            elif ean['takeprofit']==-5:
                ean['takeprofit']="TP5"
            else:
                ean['takeprofit']="%"+str(round(ean['takeprofit'],2))
            
            ozel_tsl=0
            if ean['trailstop']==0:
                ean['trailstop']="KAPALI"
            elif ean['trailstop']==-1:
                ean['trailstop']="1 TP MESAFESI"
            elif ean['trailstop']==-2:
                ean['trailstop']="2 TP MESAFESI"
            elif ean['trailstop']==-3:
                ean['trailstop']="3 TP MESAFESI"
            elif ean['trailstop']==-4:
                ean['trailstop']="4 TP MESAFESI"
            else:
                ean['trailstop']="%"+str(round(ean['trailstop'],2))
                ozel_tsl=1
            
            if ean['durum']==0:
                ean['durum']="PASIF"
            elif ean['durum']==1:
                ean['durum']="AKTIF"
                
            if ean['sltpemir']==1:
                ean['sltpemir']="KULLAN"
            else:
                ean['sltpemir']="KULLANMA"
            
            
            cb1 = types.InlineKeyboardMarkup()
            s_lot = types.InlineKeyboardButton(text="Lot: "+str(ean['lot'])+" USDT", callback_data='emri_duzen_api_lot_'+borsa+'_'+eid)
         
            s_kaldirac = types.InlineKeyboardButton(text="Kaldıraç:1/"+str(ean['leverage']), callback_data='emri_duzen_api_kaldirac_'+borsa+'_'+eid)
        
            s_margin = types.InlineKeyboardButton(text="Margin: "+str(ean['margin']), callback_data='emri_duzen_api_margin_'+borsa+'_'+eid)
            cb1.add(s_lot, s_kaldirac, s_margin) 
            
            s_parcalar = types.InlineKeyboardButton(text="Çıkış Yüzdeleri:", callback_data='cikis_yuzde'+borsa+'_'+eid)
            s_tp1 = types.InlineKeyboardButton(text="TP1:%"+str(round(ean['tp1'],2)), callback_data='emri_duzen_api_tp1_'+borsa+'_'+eid)
            s_tp2 = types.InlineKeyboardButton(text="TP2:%"+str(round(ean['tp2'],2)), callback_data='emri_duzen_api_tp2_'+borsa+'_'+eid)
            s_tp3 = types.InlineKeyboardButton(text="TP3:%"+str(round(ean['tp3'],2)), callback_data='emri_duzen_api_tp3_'+borsa+'_'+eid)
            s_tp4 = types.InlineKeyboardButton(text="TP4:%"+str(round(ean['tp4'],2)), callback_data='emri_duzen_api_tp4_'+borsa+'_'+eid)
            s_tp5 = types.InlineKeyboardButton(text="TP5:%"+str(round(ean['tp5'],2)), callback_data='emri_duzen_api_tp5_'+borsa+'_'+eid)
            cb1.add(s_parcalar,s_tp1,s_tp2,s_tp3,s_tp4,s_tp5)    
            
            s_tp6 = types.InlineKeyboardButton(text="TP6:%"+str(round(ean['tp6'],2)), callback_data='emri_duzen_api_tp6_'+borsa+'_'+eid)
            s_tp7 = types.InlineKeyboardButton(text="TP7:%"+str(round(ean['tp7'],2)), callback_data='emri_duzen_api_tp7_'+borsa+'_'+eid)
            s_tp8 = types.InlineKeyboardButton(text="TP8:%"+str(round(ean['tp8'],2)), callback_data='emri_duzen_api_tp8_'+borsa+'_'+eid)
            s_tp9 = types.InlineKeyboardButton(text="TP9:%"+str(round(ean['tp9'],2)), callback_data='emri_duzen_api_tp9_'+borsa+'_'+eid)
            s_tp10 = types.InlineKeyboardButton(text="TP10:%"+str(round(ean['tp10'],2)), callback_data='emri_duzen_api_tp10_'+borsa+'_'+eid)
            cb1.add(s_tp6,s_tp7,s_tp8)    
            cb1.add(s_tp9,s_tp10)    
            
            
            s_sl = types.InlineKeyboardButton(text="StopLoss: "+str(ean['stoploss']), callback_data='emri_duzen_api_stoploss_'+borsa+'_'+eid)
            s_tp = types.InlineKeyboardButton(text="TakeProfit: "+str(ean['takeprofit']), callback_data='emri_duzen_api_takeprofit_'+borsa+'_'+eid)
            cb1.add(s_sl,s_tp)
            
            s_tsl = types.InlineKeyboardButton(text="TrailStop: "+str(ean['trailstop']), callback_data='emri_duzen_api_trailstop_'+borsa+'_'+eid)
            
            if ozel_tsl==1:
                s_tsp = types.InlineKeyboardButton(text="TrailStep: %"+str(ean['trailstep']), callback_data='emri_duzen_api_trailstep_'+borsa+'_'+eid)
                cb1.add(s_tsl,s_tsp)
            else:
                cb1.add(s_tsl)
             
            s_sltp = types.InlineKeyboardButton(text="SL-TP Emirleri: "+str(ean['sltpemir']), callback_data='emri_duzen_api_sltpemir_'+borsa+'_'+eid)
            s_maliyet = types.InlineKeyboardButton(text="Maliyetine Çek: "+str(ean['maliyetinecek']), callback_data='emri_duzen_api_maliyetinecek_'+borsa+'_'+eid)
            cb1.add(s_sltp,s_maliyet) 
            
            s_maxemir = types.InlineKeyboardButton(text="Maks Emir : "+str(ean['maxemir'])+" adet", callback_data='emri_duzen_api_maxemir_'+borsa+'_'+eid)
            s_durum = types.InlineKeyboardButton(text="Oto Trade: "+str(ean['durum']), callback_data='emri_duzen_api_durum_'+borsa+'_'+eid)
            cb1.add(s_maxemir,s_durum) 

            ankey6 = types.InlineKeyboardButton(text="Geri", callback_data='emir_ayarlama_'+borsa)
            cb1.add(ankey6) 

            (tb_send_message(user_id,str(ean['name'])+" isimli api anahtarınızın ayarlarını bu bölümden değiştirebilirsiniz.",cb1))
            session_free(user_id)
        
        else:
        
        
            cb1 = types.InlineKeyboardMarkup()
            ankey5 = types.InlineKeyboardButton(text="Api Anahtarı Ekle", callback_data='api_ekle')
            cb1.add(ankey5) 
            ankey6 = types.InlineKeyboardButton(text="AnaMenu", callback_data='anamenu')
            cb1.add(ankey6) 
        
            (tb_send_message(user_id,"Düzenlenecek bir api anahtarınız bulunmuyor api anahtarı eklemek için tıklayın.",cb1))
            session_free(user_id)
        
        
        aef = {}
        
        api_duzenle_form[user_id] = aef
     
    async def emri_duzen_api_lot(user_id,borsa,eid):
        
        print("emri_duzen_api_lot("+user_id+","+borsa+","+eid+")")
        await delete_all_msg_id(user_id)
        session_free(user_id);
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
            
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
                
        
        (tb_send_message(user_id,"Lütfen "+borsa+" borsası için işlem açmak isterdiğiniz lot miktarını yazınız. Eski Değer : "+str(ean['lot'])+" USD",cb1))
        session_write(user_id,"emri_duzen_api_lot",eid);

    async def emri_duzen_api_lot_update(user_id,eid,msg):
        
        print("emri_duzen_api_lot_update("+user_id+","+eid+","+msg+")")
        #await delete_all_msg_id(user_id)
            
        cursor = new_cursor()
        cursor.execute("update `apikeys` set lot='"+msg+"' where id = '"+eid+"'");
        
        cursor.close()            
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
        
        
        session_free(user_id);
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        (tb_send_message(user_id,""+ean['name']+" api anahtarının lot miktarı "+msg+" USDT olarak güncellenmiştir.",cb1))

    async def emri_duzen_api_kaldirac(user_id,borsa,eid):
        
        print("emri_duzen_api_kaldirac("+user_id+","+borsa+","+eid+")")
        await delete_all_msg_id(user_id)
        session_free(user_id);
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
            
        
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        (tb_send_message(user_id,"Lütfen "+borsa+" borsası için hesabınızın kaldıraçınızı kaç yapmak istersiniz. Eski Değer : 1/"+str(ean['leverage']),cb1))
        session_write(user_id,"emri_duzen_api_kaldirac",eid);

    async def emri_duzen_api_kaldirac_update(user_id,eid,msg):
        
        print("emri_duzen_api_lot_kaldirac("+user_id+","+eid+","+msg+")")
        #await delete_all_msg_id(user_id)
        
        cursor = new_cursor()    
        cursor.execute("update `apikeys` set leverage='"+msg+"' where id = '"+eid+"'");
        
        cursor.close()            
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
        
        
        session_free(user_id);
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        (tb_send_message(user_id,""+ean['name']+" api anahtarının kaldıracı 1/"+msg+" olarak güncellenmiştir.",cb1))
        
    async def emri_duzen_api_maxemir(user_id,borsa,eid):
        
        print("emri_duzen_api_maxemir("+user_id+","+borsa+","+eid+")")
        await delete_all_msg_id(user_id)
        session_free(user_id);
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
            
        
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        (tb_send_message(user_id,"Lütfen "+borsa+" borsası için hesabınızda açılmasını istediğiniz maksimum emir adedi. Eski Değer : "+str(ean['maxemir'])+" adet",cb1))
        session_write(user_id,"emri_duzen_api_maxemir",eid);

    async def emri_duzen_api_maxemir_update(user_id,eid,msg):
        
        print("emri_duzen_api_lot_maxemir("+user_id+","+eid+","+msg+")")
        #await delete_all_msg_id(user_id)
        
        cursor = new_cursor()    
        cursor.execute("update `apikeys` set maxemir='"+msg+"' where id = '"+eid+"'");
        
        cursor.close()            
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
        
        
        session_free(user_id);
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        (tb_send_message(user_id,""+ean['name']+" api anahtarının maksimum emir adedi "+msg+" adet olarak güncellenmiştir.",cb1))

    async def emri_duzen_api_margin(user_id,borsa,eid):
        
        print("emri_duzen_api_margin("+user_id+","+borsa+","+eid+")")
        await delete_all_msg_id(user_id)
        session_free(user_id);
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]

        cb1 = types.InlineKeyboardMarkup()
        str_1 = types.InlineKeyboardButton(text='CROSS', callback_data='CROSS')
        str_2 = types.InlineKeyboardButton(text='ISOLATED', callback_data='ISOLATED')
        cb1.add(str_1,str_2)
                      
        if ean['margin']==0:
            ean["margin"]="ISOLATED"
        elif ean["margin"]==1:
            ean["margin"]="CROSSED"
        
        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)                  
        
        (tb_send_message(user_id,"Lütfen "+borsa+" borsası için hesabınızın stratejisini ne yapmak istersiniz. Eski Değer : "+str(ean["margin"]),cb1))
        session_write(user_id,"emri_duzen_api_margin",eid);
 
    async def emri_duzen_api_margin_update(user_id,eid,msg):
        
        print("emri_duzen_api_lot_pozisyon("+user_id+","+eid+","+msg+")")
        await delete_all_msg_id(user_id)
        
        msg1="ISOLATED"
        if msg=="CROSS":
            msg=1
            msg1="CROSSED"
        elif msg == "ISOLATED": 
            msg=0
            msg1="ISOLATED"
        
        cursor = new_cursor()
        cursor.execute("update `apikeys` set margin='"+str(msg)+"' where id = '"+eid+"'");
        
        cursor.close()
        eand = my_query("select * from apikeys where id='"+eid+"'")
        ean = eand[0]
        
        
        session_free(user_id);
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        (tb_send_message(user_id,ean['name']+" api anahtarının pozisyon türü "+msg1+" olarak güncellenmiştir.",cb1))

    async def emri_duzen_api_tp1(user_id,borsa,eid):
        
        print("emri_duzen_api_tp1("+user_id+","+borsa+","+eid+")")
        await delete_all_msg_id(user_id)
        session_free(user_id);
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
            
        
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        (tb_send_message(user_id,"Lütfen "+borsa+" borsası için açılan pozisyonun % kaçının TP1 de kapatılmasını istediğinizi yazınız. Eğer yazdığınız yüzde değeri bir sonraki tpye ulaşamadan tüm pozisyon kapanmış olursa diğer yüzdeler pas geçilir. Eski Değer : "+str(ean['tp1']),cb1))
        session_write(user_id,"emri_duzen_api_tp1",eid);

    async def emri_duzen_api_tp1_update(user_id,eid,msg):
        
        print("emri_duzen_api_lot_tp1("+user_id+","+eid+","+msg+")")
        #await delete_all_msg_id(user_id)
        
        cursor = new_cursor()    
        cursor.execute("update `apikeys` set tp1='"+msg+"' where id = '"+eid+"'");
        
        cursor.close()            
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
        
        
        session_free(user_id);
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        (tb_send_message(user_id,""+ean['name']+" api anahtarının açılan pozisyonun TP1 de kapatılacak yüzdesi, %"+str(msg)+" olarak güncellenmiştir.",cb1))
    
    async def emri_duzen_api_tp2(user_id,borsa,eid):
        
        print("emri_duzen_api_tp2("+user_id+","+borsa+","+eid+")")
        await delete_all_msg_id(user_id)
        session_free(user_id);
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
            
        
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        (tb_send_message(user_id,"Lütfen "+borsa+" borsası için açılan pozisyonun % kaçının TP2 de kapatılmasını istediğinizi yazınız. Eğer yazdığınız yüzde değeri bir sonraki tpye ulaşamadan tüm pozisyon kapanmış olursa diğer yüzdeler pas geçilir. Eski Değer : "+str(ean['tp2']),cb1))
        session_write(user_id,"emri_duzen_api_tp2",eid);

    async def emri_duzen_api_tp2_update(user_id,eid,msg):
        
        print("emri_duzen_api_lot_tp2("+user_id+","+eid+","+msg+")")
        #await delete_all_msg_id(user_id)
        
        cursor = new_cursor()    
        cursor.execute("update `apikeys` set tp2='"+msg+"' where id = '"+eid+"'");
        
        cursor.close()            
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
        
        
        session_free(user_id);
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        (tb_send_message(user_id,""+ean['name']+" api anahtarının açılan pozisyonun TP2 de kapatılacak yüzdesi, %"+str(msg)+" olarak güncellenmiştir.",cb1))
    
    async def emri_duzen_api_tp3(user_id,borsa,eid):
        
        print("emri_duzen_api_tp3("+user_id+","+borsa+","+eid+")")
        await delete_all_msg_id(user_id)
        session_free(user_id);
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
            
        
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        (tb_send_message(user_id,"Lütfen "+borsa+" borsası için açılan pozisyonun % kaçının TP3 de kapatılmasını istediğinizi yazınız. Eğer yazdığınız yüzde değeri bir sonraki tpye ulaşamadan tüm pozisyon kapanmış olursa diğer yüzdeler pas geçilir. Eski Değer : "+str(ean['tp3']),cb1))
        session_write(user_id,"emri_duzen_api_tp3",eid);

    async def emri_duzen_api_tp3_update(user_id,eid,msg):
        
        print("emri_duzen_api_lot_tp3("+user_id+","+eid+","+msg+")")
        #await delete_all_msg_id(user_id)
        
        cursor = new_cursor()    
        cursor.execute("update `apikeys` set tp3='"+msg+"' where id = '"+eid+"'");
        
        cursor.close()            
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
        
        
        session_free(user_id);
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        (tb_send_message(user_id,""+ean['name']+" api anahtarının açılan pozisyonun TP3 de kapatılacak yüzdesi, %"+str(msg)+" olarak güncellenmiştir.",cb1))
    
    async def emri_duzen_api_tp4(user_id,borsa,eid):
        
        print("emri_duzen_api_tp4("+user_id+","+borsa+","+eid+")")
        await delete_all_msg_id(user_id)
        session_free(user_id);
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
            
        
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        (tb_send_message(user_id,"Lütfen "+borsa+" borsası için açılan pozisyonun % kaçının TP4 de kapatılmasını istediğinizi yazınız. Eğer yazdığınız yüzde değeri bir sonraki tpye ulaşamadan tüm pozisyon kapanmış olursa diğer yüzdeler pas geçilir. Eski Değer : "+str(ean['tp4']),cb1))
        session_write(user_id,"emri_duzen_api_tp4",eid);

    async def emri_duzen_api_tp4_update(user_id,eid,msg):
        
        print("emri_duzen_api_lot_tp4("+user_id+","+eid+","+msg+")")
        #await delete_all_msg_id(user_id)
        
        cursor = new_cursor()    
        cursor.execute("update `apikeys` set tp4='"+msg+"' where id = '"+eid+"'");
        
        cursor.close()            
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
        
        
        session_free(user_id);
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        (tb_send_message(user_id,""+ean['name']+" api anahtarının açılan pozisyonun TP4 de kapatılacak yüzdesi, %"+str(msg)+" olarak güncellenmiştir.",cb1))
    
    async def emri_duzen_api_tp5(user_id,borsa,eid):
        
        print("emri_duzen_api_tp5("+user_id+","+borsa+","+eid+")")
        await delete_all_msg_id(user_id)
        session_free(user_id);
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
            
        
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        (tb_send_message(user_id,"Lütfen "+borsa+" borsası için açılan pozisyonun % kaçının TP5 de kapatılmasını istediğinizi yazınız. Eğer yazdığınız yüzde değeri bir sonraki tpye ulaşamadan tüm pozisyon kapanmış olursa diğer yüzdeler pas geçilir. Eski Değer : "+str(ean['tp5']),cb1))
        session_write(user_id,"emri_duzen_api_tp5",eid);

    async def emri_duzen_api_tp5_update(user_id,eid,msg):
        
        print("emri_duzen_api_lot_tp5("+user_id+","+eid+","+msg+")")
        #await delete_all_msg_id(user_id)
        
        cursor = new_cursor()    
        cursor.execute("update `apikeys` set tp5='"+msg+"' where id = '"+eid+"'");
        
        cursor.close()            
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
        
        
        session_free(user_id);
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        (tb_send_message(user_id,""+ean['name']+" api anahtarının açılan pozisyonun TP5 de kapatılacak yüzdesi, %"+str(msg)+" olarak güncellenmiştir.",cb1))
          
          
          
          
    async def emri_duzen_api_tp6(user_id,borsa,eid):
        
        print("emri_duzen_api_tp6("+user_id+","+borsa+","+eid+")")
        await delete_all_msg_id(user_id)
        session_free(user_id);
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
            
        
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        (tb_send_message(user_id,"Lütfen "+borsa+" borsası için açılan pozisyonun % kaçının TP6 de kapatılmasını istediğinizi yazınız. Eğer yazdığınız yüzde değeri bir sonraki tpye ulaşamadan tüm pozisyon kapanmış olursa diğer yüzdeler pas geçilir. Eski Değer : "+str(ean['tp6']),cb1))
        session_write(user_id,"emri_duzen_api_tp6",eid);

    async def emri_duzen_api_tp6_update(user_id,eid,msg):
        
        print("emri_duzen_api_lot_tp6("+user_id+","+eid+","+msg+")")
        #await delete_all_msg_id(user_id)
        
        cursor = new_cursor()    
        cursor.execute("update `apikeys` set tp6='"+msg+"' where id = '"+eid+"'");
        
        cursor.close()            
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
        
        
        session_free(user_id);
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        (tb_send_message(user_id,""+ean['name']+" api anahtarının açılan pozisyonun TP6 de kapatılacak yüzdesi, %"+str(msg)+" olarak güncellenmiştir.",cb1))
          
    async def emri_duzen_api_tp7(user_id,borsa,eid):
        
        print("emri_duzen_api_tp7("+user_id+","+borsa+","+eid+")")
        await delete_all_msg_id(user_id)
        session_free(user_id);
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
            
        
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        (tb_send_message(user_id,"Lütfen "+borsa+" borsası için açılan pozisyonun % kaçının TP7 de kapatılmasını istediğinizi yazınız. Eğer yazdığınız yüzde değeri bir sonraki tpye ulaşamadan tüm pozisyon kapanmış olursa diğer yüzdeler pas geçilir. Eski Değer : "+str(ean['tp7']),cb1))
        session_write(user_id,"emri_duzen_api_tp7",eid);

    async def emri_duzen_api_tp7_update(user_id,eid,msg):
        
        print("emri_duzen_api_lot_tp7("+user_id+","+eid+","+msg+")")
        #await delete_all_msg_id(user_id)
        
        cursor = new_cursor()    
        cursor.execute("update `apikeys` set tp7='"+msg+"' where id = '"+eid+"'");
        
        cursor.close()            
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
        
        
        session_free(user_id);
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        (tb_send_message(user_id,""+ean['name']+" api anahtarının açılan pozisyonun TP7 de kapatılacak yüzdesi, %"+str(msg)+" olarak güncellenmiştir.",cb1))
          
    async def emri_duzen_api_tp8(user_id,borsa,eid):
        
        print("emri_duzen_api_tp8("+user_id+","+borsa+","+eid+")")
        await delete_all_msg_id(user_id)
        session_free(user_id);
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
            
        
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        (tb_send_message(user_id,"Lütfen "+borsa+" borsası için açılan pozisyonun % kaçının TP8 de kapatılmasını istediğinizi yazınız. Eğer yazdığınız yüzde değeri bir sonraki tpye ulaşamadan tüm pozisyon kapanmış olursa diğer yüzdeler pas geçilir. Eski Değer : "+str(ean['tp8']),cb1))
        session_write(user_id,"emri_duzen_api_tp8",eid);

    async def emri_duzen_api_tp8_update(user_id,eid,msg):
        
        print("emri_duzen_api_lot_tp8("+user_id+","+eid+","+msg+")")
        #await delete_all_msg_id(user_id)
        
        cursor = new_cursor()    
        cursor.execute("update `apikeys` set tp8='"+msg+"' where id = '"+eid+"'");
        
        cursor.close()            
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
        
        
        session_free(user_id);
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        (tb_send_message(user_id,""+ean['name']+" api anahtarının açılan pozisyonun TP8 de kapatılacak yüzdesi, %"+str(msg)+" olarak güncellenmiştir.",cb1))
          
    async def emri_duzen_api_tp9(user_id,borsa,eid):
        
        print("emri_duzen_api_tp9("+user_id+","+borsa+","+eid+")")
        await delete_all_msg_id(user_id)
        session_free(user_id);
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
            
        
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        (tb_send_message(user_id,"Lütfen "+borsa+" borsası için açılan pozisyonun % kaçının TP9 de kapatılmasını istediğinizi yazınız. Eğer yazdığınız yüzde değeri bir sonraki tpye ulaşamadan tüm pozisyon kapanmış olursa diğer yüzdeler pas geçilir. Eski Değer : "+str(ean['tp9']),cb1))
        session_write(user_id,"emri_duzen_api_tp9",eid);

    async def emri_duzen_api_tp9_update(user_id,eid,msg):
        
        print("emri_duzen_api_lot_tp9("+user_id+","+eid+","+msg+")")
        #await delete_all_msg_id(user_id)
        
        cursor = new_cursor()    
        cursor.execute("update `apikeys` set tp9='"+msg+"' where id = '"+eid+"'");
        
        cursor.close()            
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
        
        
        session_free(user_id);
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        (tb_send_message(user_id,""+ean['name']+" api anahtarının açılan pozisyonun TP9 de kapatılacak yüzdesi, %"+str(msg)+" olarak güncellenmiştir.",cb1))
          
    async def emri_duzen_api_tp10(user_id,borsa,eid):
        
        print("emri_duzen_api_tp10("+user_id+","+borsa+","+eid+")")
        await delete_all_msg_id(user_id)
        session_free(user_id);
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
            
        
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        (tb_send_message(user_id,"Lütfen "+borsa+" borsası için açılan pozisyonun % kaçının TP10 de kapatılmasını istediğinizi yazınız. Eğer yazdığınız yüzde değeri bir sonraki tpye ulaşamadan tüm pozisyon kapanmış olursa diğer yüzdeler pas geçilir. Eski Değer : "+str(ean['tp10']),cb1))
        session_write(user_id,"emri_duzen_api_tp10",eid);

    async def emri_duzen_api_tp10_update(user_id,eid,msg):
        
        print("emri_duzen_api_lot_tp10("+user_id+","+eid+","+msg+")")
        #await delete_all_msg_id(user_id)
        
        cursor = new_cursor()    
        cursor.execute("update `apikeys` set tp10='"+msg+"' where id = '"+eid+"'");
        
        cursor.close()            
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
        
        
        session_free(user_id);
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        (tb_send_message(user_id,""+ean['name']+" api anahtarının açılan pozisyonun TP10 de kapatılacak yüzdesi, %"+str(msg)+" olarak güncellenmiştir.",cb1))
          
          
          
          
          
    async def emri_duzen_api_stoploss(user_id,borsa,eid):
        
        print("emri_duzen_api_stoploss("+user_id+","+borsa+","+eid+")")
        await delete_all_msg_id(user_id)
        session_free(user_id);
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
           
        sl_deger="SINYAL_SL"
        if int(ean['stoploss']) == 0:
            sl_deger="SINYAL_SL"
        elif  int(ean['stoploss']) == -1:
            sl_deger="STOPLOSS_YOK"
        else:
            sl_deger="%"+str(round(ean['stoploss'],2))
        
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        
        (tb_send_message(user_id,"Lütfen "+borsa+" borsası için açılan pozisyonun stoploss değerini ne kullanmak istediğinizi seçiniz\n\n"+"0 = Sinyalin belirlediği stoploss değerini kullan\n-1 = Stoploss kullanma\n Sıfırdan büyük bir değer yazarsanız sizin belirlediğiniz emirin açılış fiyatının % mesafesi kadar gerisine sizin belirlediğini stoploss değerini yazar. Eski Değer : "+str(sl_deger),cb1))
        session_write(user_id,"emri_duzen_api_stoploss",eid);

    async def emri_duzen_api_stoploss_update(user_id,eid,msg):
        
        print("emri_duzen_api_lot_stoploss("+user_id+","+eid+","+msg+")")
        #await delete_all_msg_id(user_id)
        
        cursor = new_cursor()    
        cursor.execute("update `apikeys` set stoploss='"+msg+"' where id = '"+eid+"'");
        
        cursor.close()            
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
        
        
        session_free(user_id);
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
 
        if msg == "0":
            msg1="SINYAL_SL"
        elif  msg == "-1":
            msg1="STOPLOSS_YOK"
        else:
            msg1="%"+str(round(float(msg),2))
        
        
        (tb_send_message(user_id,""+ean['name']+" api anahtarının açılan pozisyonun stoploss değeri; "+str(msg1)+" olarak güncellenmiştir.",cb1))
             
    async def emri_duzen_api_takeprofit(user_id,borsa,eid):
        
        print("emri_duzen_api_takeprofit("+user_id+","+borsa+","+eid+")")
        await delete_all_msg_id(user_id)
        session_free(user_id);
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
        
        tp_deger="SINYAL_TP"
        if ean['takeprofit']==0:
            tp_deger="SINYAL_TP"
        elif ean['takeprofit']==-1:
            tp_deger="TP1"
        elif ean['takeprofit']==-2:
            tp_deger="TP2"
        elif ean['takeprofit']==-3:
            tp_deger="TP3"
        elif ean['takeprofit']==-4:
            tp_deger="TP4"
        elif ean['takeprofit']==-5:
            tp_deger="TP5"
        else:
            tp_deger="%"+str(round(ean['takeprofit'],2))
        
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        
        (tb_send_message(user_id,"Lütfen "+borsa+" borsası için açılan pozisyonun takeprofit değerini ne kullanmak istediğinizi seçiniz\n\n"+"0 = Sinyalin belirlediği stoploss değerini kullan\n-1 = TP1 e ulaştığında direk çık\n-2 = TP2 e ulaştığında direk çık\n-3 = TP3 e ulaştığında direk çık\n-4 = TP4 e ulaştığında direk çık\n-5 = TP5 e ulaştığında direk çık\n Sıfırdan büyük bir değer yazarsanız sizin belirlediğiniz emirin açılış fiyatının % mesafesi kadar ilerisine sizin belirlediğini takeprofit değerini yazar. Eski Değer : "+str(tp_deger),cb1))
        session_write(user_id,"emri_duzen_api_takeprofit",eid);

    async def emri_duzen_api_takeprofit_update(user_id,eid,msg):
        
        print("emri_duzen_api_lot_takeprofit("+user_id+","+eid+","+msg+")")
        #await delete_all_msg_id(user_id)
        
        ozel_tp=0
        msg1="SINYAL_TP"
        if int(msg)==0:
            msg1="SINYAL_TP"
        elif int(msg)==-1:
            msg1="TP1"
        elif int(msg)==-2:
            msg1="TP2"
        elif int(msg)==-3:
            msg1="TP3"
        elif int(msg)==-4:
            msg1="TP4"
        elif int(msg)==-5:
            msg1="TP5"
        else:
            msg1="%"+str(round(float(msg),2)) 
            ozel_tp=1
        
        cursor = new_cursor()    
        if ozel_tp==0:
            cursor.execute("update `apikeys` set takeprofit='"+msg+"' where id = '"+eid+"'");
        else:
            cursor.execute("update `apikeys` set tp1=0,tp2=0,tp3=0,tp4=0,tp5=100,takeprofit='"+msg+"' where id = '"+eid+"'");
        
        
        cursor.close()            
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
        
        
        session_free(user_id);
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        

        
        
        (tb_send_message(user_id,""+ean['name']+" api anahtarının açılan pozisyonun takeprofit değeri; "+str(msg1)+" olarak güncellenmiştir.",cb1))
             
    async def emri_duzen_api_trailstop(user_id,borsa,eid):
        
        print("emri_duzen_api_trailstop("+user_id+","+borsa+","+eid+")")
        await delete_all_msg_id(user_id)
        session_free(user_id);
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
        
        tp_deger="KAPALI"
        if ean['trailstop']==0:
            tp_deger="KAPALI"
        elif ean['trailstop']==-1:
            tp_deger="1 TP MESAFESI"
        elif ean['trailstop']==-2:
            tp_deger="2 TP MESAFESI"
        elif ean['trailstop']==-3:
            tp_deger="3 TP MESAFESI"
        elif ean['trailstop']==-4:
            tp_deger="4 TP MESAFESI"
        else:
            tp_deger="%"+str(round(ean['trailstop'],2))
        
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        
        (tb_send_message(user_id,"Lütfen "+borsa+" borsası için açılan pozisyonun trailstop değerini ne kullanmak istediğinizi seçiniz\n\n"+"0 = Trailstop Özelliği kapalı olur\n-1 = Açılan pozisyon ile stoploss arasında 1 takeprofit mesafesi geriden stoploss pozisyonunu taşıyarak trailstop yapar. Örneğin emir açılıp TP1 ulaştığında stoplossu açılış fiyatına çeker. emir TP2 ye ulaştığında stoploss u TP1 e taşır, Emir Tp3 e ulaştığında stoploss u TP2 ye taşır. böyle taşıyabildiği maksimum yere kadar götürür\n-2 = Açılan pozisyon ile stoploss arasında 2 takeprofit mesafesi geriden stoploss pozisyonunu taşıyarak trailstop yapar. Örneğin emir açılıp TP2 ulaştığında stoplossu açılış fiyatına çeker. emir TP3 ye ulaştığında stoploss u TP1 e taşır, Emir Tp4 e ulaştığında stoploss u TP2 ye taşır. böyle taşıyabildiği maksimum yere kadar götürür\n-3 = Açılan pozisyon ile stoploss arasında 3 takeprofit mesafesi geriden stoploss pozisyonunu taşıyarak trailstop yapar. Örneğin emir açılıp TP3 ulaştığında stoplossu açılış fiyatına çeker. emir TP4 ye ulaştığında stoploss u TP1 e taşır. böyle taşıyabildiği maksimum yere kadar götürür\n-4 = Açılan pozisyon ile stoploss arasında 4 takeprofit mesafesi geriden stoploss pozisyonunu taşıyarak trailstop yapar. Örneğin emir açılıp TP4 ulaştığında stoplossu açılış fiyatına çeker. böyle taşıyabildiği maksimum yere kadar götürür\n Sıfırdan büyük bir değer yazarsanız sizin belirlediğiniz emirin açılış fiyatının % mesafesi kadar ilerisine sizin belirlediğiniz trailstop emrini taşır. Eski Değer : "+str(tp_deger),cb1))
        session_write(user_id,"emri_duzen_api_trailstop",eid);

    async def emri_duzen_api_trailstop_update(user_id,eid,msg):
        
        print("emri_duzen_api_lot_trailstop("+user_id+","+eid+","+msg+")")
        #await delete_all_msg_id(user_id)
        
        cursor = new_cursor()    
        cursor.execute("update `apikeys` set trailstop='"+msg+"' where id = '"+eid+"'");
        
        cursor.close()            
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
        
        
        session_free(user_id);
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        

        msg1="KAPALI"
        if float(msg)==0:
            msg1="KAPALI"
        elif float(msg)==-1:
            msg1="1 TP MESAFESI"
        elif float(msg)==-2:
            msg1="2 TP MESAFESI"
        elif float(msg)==-3:
            msg1="3 TP MESAFESI"
        elif float(msg)==-4:
            msg1="4 TP MESAFESI"
        elif float(msg)==-5:
            msg1="5 TP MESAFESI"
        else:
            msg1="%"+str(round(float(msg),2))
        
        
        (tb_send_message(user_id,""+ean['name']+" api anahtarının açılan pozisyonun trailstop değeri; "+str(msg1)+" olarak güncellenmiştir.",cb1))
                
    async def emri_duzen_api_trailstep(user_id,borsa,eid):
        
        print("emri_duzen_api_trailstep("+user_id+","+borsa+","+eid+")")
        await delete_all_msg_id(user_id)
        session_free(user_id);
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
        
        if float(ean['trailstep'])==0:
            ean['trailstep']=ean['trailstop']
        
        tp_deger="%"+str(round(ean['trailstep'],2))
        
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        
        (tb_send_message(user_id,"Lütfen "+borsa+" borsası için açılan pozisyonun trailstep değerini ne kullanmak istediğinizi seçiniz\n"+"Trailstep değerinin görevi , Emir Trailstop + Trailstep kadar kara ulaştığında yeni stoploss emrini o anki piyasa fiyatının trailstop kadar gerisine koyar. olası bir geri dönme durumunda fiyat piyasa fiyatı-trailstop fiyatına değdiğinde pozisyonu kapatır. Eski Değer : "+str(tp_deger),cb1))
        session_write(user_id,"emri_duzen_api_trailstep",eid);

    async def emri_duzen_api_trailstep_update(user_id,eid,msg):
        
        print("emri_duzen_api_lot_trailstep("+user_id+","+eid+","+msg+")")
        #await delete_all_msg_id(user_id)
        
        cursor = new_cursor()    
        cursor.execute("update `apikeys` set trailstep='"+msg+"' where id = '"+eid+"'");
        
        cursor.close()            
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
        
        
        session_free(user_id);
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        

        msg1="%"+str(round(float(msg),2))
        
        
        (tb_send_message(user_id,""+ean['name']+" api anahtarının açılan pozisyonun trailstep değeri; "+str(msg1)+" olarak güncellenmiştir.",cb1))
            
    async def emri_duzen_api_maliyetinecek(user_id,borsa,eid):
        
        print("emri_duzen_api_maliyetinecek("+user_id+","+borsa+","+eid+")")
        await delete_all_msg_id(user_id)
        session_free(user_id);
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
        
        tp_deger="KAPALI"
        if ean['maliyetinecek']==0:
            tp_deger="KAPALI"
        elif ean['maliyetinecek']==1:
            tp_deger="TP1"
        elif ean['maliyetinecek']==2:
            tp_deger="TP2"
        elif ean['maliyetinecek']==3:
            tp_deger="TP3"
        elif ean['maliyetinecek']==4:
            tp_deger="TP4"
       
        
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        
        (tb_send_message(user_id,"Lütfen "+borsa+" borsası için açılan pozisyonun fiyat belirli bir seviyeye ulaştıktan sonra bir kereye mahsus olmak üzere stoploss u emirin açılış fiyatına çeker. böylece fiyatın geriye gelmesi durumunda ne kar ne de zarar olarak pozisyonu kapatarak çıkabilir\n\n"+"0 = Maliyetine Çek Özelliği kapalı olur\n1 = TP1 e ulaştığında emir stoploss değerini maliyetine çeker\n2 = TP2 e ulaştığında emir stoploss değerini maliyetine çeker\n3 = TP3 e ulaştığında emir stoploss değerini maliyetine çeker\n4 = TP4 e ulaştığında emir stoploss değerini maliyetine çeker\n. Eski Değer : "+str(tp_deger),cb1))
        session_write(user_id,"emri_duzen_api_maliyetinecek",eid);

    async def emri_duzen_api_maliyetinecek_update(user_id,eid,msg):
        
        print("emri_duzen_api_lot_maliyetinecek("+user_id+","+eid+","+msg+")")
        #await delete_all_msg_id(user_id)
        
        cursor = new_cursor()    
        cursor.execute("update `apikeys` set maliyetinecek='"+msg+"' where id = '"+eid+"'");
        
        cursor.close()            
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
        
        
        session_free(user_id);
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        


        msg1="KAPALI"
        if float(msg)==0:
            msg1="KAPALI"
        elif float(msg)==1:
            msg1="TP1" 
        elif float(msg)==2:
            msg1="TP2"
        elif float(msg)==3: 
            msg1="TP3"
        elif float(msg)==4:
            msg1="TP4"
        
        
        (tb_send_message(user_id,""+ean['name']+" api anahtarının açılan pozisyonun maliyetine çekilme değeri; "+str(msg1)+" olarak güncellenmiştir.",cb1))
        
    async def emri_duzen_api_sltpemir(user_id,borsa,eid):
        
        print("emri_duzen_api_sltpemir("+user_id+","+borsa+","+eid+")")
        await delete_all_msg_id(user_id)
        session_free(user_id);
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
        
        adurum = "";
        if ean['sltpemir'] == 0:
            adurum="KULLANMA"
        else:
            adurum="KULLAN"
        

        cb1 = types.InlineKeyboardMarkup()
        if adurum=="KULLAN":
            str_1 = types.InlineKeyboardButton(text='KULLANMA', callback_data='0')
        else:
            str_1 = types.InlineKeyboardButton(text='KULLAN', callback_data='1')
        
        str_2 = types.InlineKeyboardButton(text='GERI DÖN', callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(str_1)
        cb1.add(str_2)
                      
        
        (tb_send_message(user_id,"Lütfen "+borsa+" borsası için hesabınızda açılan pozisyonların STOPLOSS ve TAKEPROFIT emirlerinin gerçek emir olarak açılmasını isterseniz KULLAN demelisiniz. Eğer robotun emir olarak açmayıp hafızasından fiyatları takip edip belirtilen değere ulaştığında market fiyatından direk kapatmasını isterseniz KULLANMA deyiniz. Eski Değer : "+str(adurum),cb1))
        session_write(user_id,"emri_duzen_api_sltpemir",eid);
 
    async def emri_duzen_api_sltpemir_update(user_id,eid,msg):
        
        print("emri_duzen_api_sltpemir_update("+user_id+","+eid+","+msg+")")
        await delete_all_msg_id(user_id)
        
        cursor = new_cursor()
        cursor.execute("update `apikeys` set sltpemir='"+msg+"' where id = '"+eid+"'");
        
        cursor.close()
        eand = my_query("select * from apikeys where id='"+eid+"'")
        ean = eand[0]
        
        adurum = ""
        if msg == "0":
            adurum = "KULLANMA"
        else:
            adurum = "KULLAN"    
        
        session_free(user_id);
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        (tb_send_message(user_id,ean['name']+" api anahtarının SL-TP Emir türü "+adurum+" olarak güncellenmiştir.",cb1))

    async def emri_duzen_api_durum(user_id,borsa,eid):
        
        print("emri_duzen_api_durum("+user_id+","+borsa+","+eid+")")
        await delete_all_msg_id(user_id)
        session_free(user_id);
        
        eand = my_query("select * from apikeys where id='"+eid+"'")
        
        ean = eand[0]
        
        adurum = "";
        if ean['durum'] == 0:
            adurum="PASIF"
        else:
            adurum="AKTIF"
        

        cb1 = types.InlineKeyboardMarkup()
        if adurum=="AKTIF":
            str_1 = types.InlineKeyboardButton(text='PASIF ET', callback_data='0')
        else:
            str_1 = types.InlineKeyboardButton(text='AKTIF ET', callback_data='1')
        
        str_2 = types.InlineKeyboardButton(text='GERI DÖN', callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(str_1)
        cb1.add(str_2)
                      
        
        (tb_send_message(user_id,"Lütfen "+borsa+" borsası için hesabınızın sinyallerde işleme girmesini istiyorsanız AKTIF ET deyiniz. İşlemlere girmesini gecici süre durdurmak istiyorsanız PASIF ET deyiniz. Eski Değer : "+str(adurum),cb1))
        session_write(user_id,"emri_duzen_api_durum",eid);

    async def emri_duzen_api_durum_update(user_id,eid,msg):
        
        print("emri_duzen_api_lot_durum("+user_id+","+eid+","+msg+")")
        await delete_all_msg_id(user_id)
        
        cursor = new_cursor()
        cursor.execute("update `apikeys` set durum='"+msg+"' where id = '"+eid+"'");
        
        cursor.close()
        eand = my_query("select * from apikeys where id='"+eid+"'")
        ean = eand[0]
        
        adurum = ""
        if msg == "0":
            adurum = "PASIF"
        else:
            adurum = "AKTIF"    
        
        session_free(user_id);
        
        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='emir_duzen_'+ean['exchange']+'_'+str(ean['id']))
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="Api Ayarlarına Dön", callback_data='emir_ayarlama_'+ean['exchange'])
        cb1.add(c_anamenu2)
        
        (tb_send_message(user_id,ean['name']+" api anahtarının durumu "+adurum+" olarak güncellenmiştir.",cb1))







    async def odeme_yonetimi(user_id):

        cb1 = types.InlineKeyboardMarkup()
        
        buton1 = types.InlineKeyboardButton(text='Abonelik Paketletini Listele', callback_data='abone_paket_listele')
        buton2 = types.InlineKeyboardButton(text='Abonelik Paketi Ekle', callback_data='abone_paket_ekle')
        buton3 = types.InlineKeyboardButton(text='AnaMenu', callback_data='anamenu')
      
        cb1.add(buton1)
        cb1.add(buton2)
        cb1.add(buton3)
        
        (tb_send_message(user_id,'Bu bölümde, Ücretlendirmeler ile ilgili paketleri ekleyebilir ve silebilirsiniz.',cb1))

    async def abone_paket_listele(user_id):

        cb1 = types.InlineKeyboardMarkup()
        
        anahtarlar = fetch_row("select * from odemeyontem where 1 order by sure asc")
        
        for e in range(len(anahtarlar)):
            
            anaht = anahtarlar[e]
            
            hid = str(anaht[0])
            hkey = str(anaht[1])+" ay "+str(anaht[2])+" USD"
            
            ankey = types.InlineKeyboardButton(text=hkey, callback_data='abone_sil_paket_'+hid)
            cb1.add(ankey)
            
        buton1 = types.InlineKeyboardButton(text='ANA MENU', callback_data='anamenu')
        buton2 = types.InlineKeyboardButton(text='GERİ', callback_data='odeme_yonetimi')
      
        cb1.add(buton1,buton2)
        
        (tb_send_message(user_id,'Yukarıdaki Paketlerin üstüne tıklayıp abonelik ücretlendirme paketini silebilirsiniz.',cb1))

    async def abone_sil_paket(user_id,hid):

        hesap_no = str(hid)
        
        cursor = new_cursor()
        cursor.execute("delete from odemeyontem where id = '"+hesap_no+"'")
        
        cursor.close()
        
        cb1 = types.InlineKeyboardMarkup()
        
        ankey = types.InlineKeyboardButton(text="Abonelik Paketlerini Listele", callback_data='odeme_yonetimi')
        cb1.add(ankey)
        
        ankey = types.InlineKeyboardButton(text="Ana Menüye dön", callback_data='anamenu')
        cb1.add(ankey)
            
        (tb_send_message(user_id,hesap_no+' nolu abonelik paketi silinmiştir.', cb1))

    async def abone_paket_ekle(user_id):
        
        await delete_all_msg_id(user_id)
        session_free(user_id);
        
        

        cb1 = types.InlineKeyboardMarkup()

        c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='odeme_yonetimi')
        cb1.add(c_anamenu1)

        c_anamenu2 = types.InlineKeyboardButton(text="AnaMenu", callback_data='anamenu')
        cb1.add(c_anamenu2)
            
        
        (tb_send_message(user_id,"Abonelik ödemesi için paket eklemek için bu bölümü kullanınız. Eklemek istediğiniz paketi ay-ücret şeklinde yapınız. örneğin 1 aylık 20 $ eklemek için 1-20 yazınız.",cb1))
        session_write(user_id,"abone_odeme_paket",1);

    async def abone_paket_add_ekle(user_id,msg):
        
        try: 
            
            vk = msg.split("-")
            
            cursor = new_cursor()    
            cursor.execute("INSERT INTO `odemeyontem` (`id`, `sure`, `ucret`) VALUES (NULL, '"+vk[0]+"', '"+vk[1]+"');");
            
            cursor.close()            
            
            
            session_free(user_id);
            
            cb1 = types.InlineKeyboardMarkup()

            c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='odeme_yonetimi')
            cb1.add(c_anamenu1)

            c_anamenu2 = types.InlineKeyboardButton(text="AnaMenu", callback_data='anamenu')
            cb1.add(c_anamenu2)
            
            (tb_send_message(user_id,""+vk[0]+" aylık "+vk[1]+" USD adlı abonelik paketiniz başarı ile eklenmiştir.",cb1))

        except:
        
            
            cb1 = types.InlineKeyboardMarkup()

            c_anamenu1 = types.InlineKeyboardButton(text="Geri", callback_data='odeme_yonetimi')
            cb1.add(c_anamenu1)

            c_anamenu2 = types.InlineKeyboardButton(text="AnaMenu", callback_data='anamenu')
            cb1.add(c_anamenu2)
            
            (tb_send_message(user_id,"Paket eklemesinde hata oluştu lütfen geri dönüp tekrar eklemeyi deneyin.",cb1))
       
    async def odeme_formu(user_id):

        cb1 = types.InlineKeyboardMarkup()
        
        
        ode_yontem = fetch_row("select * from odemeyontem where 1 order by sure asc")
        
        for oo in ode_yontem:
            
            s_ay = str(oo[1])
            s_tutar = str(oo[2])
            
            ode_1 = types.InlineKeyboardButton(text=s_ay+' aylık '+s_tutar+' USD', callback_data='odeme_formu_'+s_ay+'_'+s_tutar)
            cb1.add(ode_1)
            
        
        '''
        ode_1 = types.InlineKeyboardButton(text='1 aylık 30 USD', callback_data='odeme_formu_1_30')
        ode_2 = types.InlineKeyboardButton(text='3 aylık 75 USD', callback_data='odeme_formu_3_75')
      
        cb1.add(ode_1,ode_2)
        ode_3 = types.InlineKeyboardButton(text='6 aylık 120 USD', callback_data='odeme_formu_6_120')
        ode_4 = types.InlineKeyboardButton(text='12 aylık 180 USD', callback_data='odeme_formu_12_180')
        cb1.add(ode_3,ode_4)

        '''
        ode_5 = types.InlineKeyboardButton(text='Gerçekleşmiş Ödemeleri Kontrol Et', callback_data='odeme_yapilmismi')
        cb1.add(ode_5)
        ode_5 = types.InlineKeyboardButton(text='ANAMENU', callback_data='anamenu')
        cb1.add(ode_5)
        
        (tb_send_message(user_id, 'Lütfen Sinyalleri otomatik olarak crypto borsa hesaplarınıza gelen sinyalleri otomatik açmanıza yarar. yukarıdaki abonelik paketlerinden birini seçiniz. ardından ödeme sayfasına yönlendirileceksiniz. Ödeme sonrası aboneliğiniz otomatik yükseltilicek.', cb1))

    import urllib.request, urllib.parse, urllib.error
    import urllib.request, urllib.error, urllib.parse
    import hmac
    import hashlib
    import json
    import collections

    class CryptoPayments():
        

        def __init__(self, publicKey, privateKey, ipn_url):
            self.publicKey = publicKey
            self.privateKey = privateKey
            self.ipn_url = ipn_url
            self.format = 'json'
            self.version = 1
            self.url = 'https://www.coinpayments.net/api.php'

        def createHmac(self, **params):
            """ Generate an HMAC based upon the url arguments/parameters
                
                We generate the encoded url here and return it to Request because
                the hmac on both sides depends upon the order of the parameters, any
                change in the order and the hmacs wouldn't match
            """
            encoded = urllib.parse.urlencode(params).encode('utf-8')
            return encoded, hmac.new(bytearray(self.privateKey, 'utf-8'), encoded, hashlib.sha512).hexdigest()

        def Request(self, request_method, **params):
            """ The basic request that all API calls use
                the parameters are joined in the actual api methods so the parameter
                strings can be passed and merged inside those methods instead of the 
                request method. The final encoded URL and HMAC are generated here
            """
            encoded, sig = self.createHmac(**params)

            headers = {'hmac': sig}

            if request_method == 'get':
                req = urllib.request.Request(self.url, headers=headers)
            elif request_method == 'post':
                headers['Content-Type'] = 'application/x-www-form-urlencoded'
                req = urllib.request.Request(self.url, data=encoded, headers=headers)

            try:
                response      = urllib.request.urlopen(req)
                status_code   = response.getcode()
                response_body = response.read()

                response_body_decoded = json.loads(response_body) #decode Json to dictionary

                response_body_decoded.update(response_body_decoded['result']) #clean up dictionary, flatten "result" key:value pairs to parent dictionary
                response_body_decoded.pop('result', None) #remove the flattened dictionary
                
            except urllib.error.HTTPError as e:
                status_code   = e.getcode()
                response_body = e.read()

            return response_body_decoded



        def createTransaction(self, params=None):
            """ Creates a transaction to give to the purchaser
                https://www.coinpayments.net/apidoc-create-transaction
            """
            params.update({'cmd':'create_transaction',
                           'ipn_url':self.ipn_url,
                           'key':self.publicKey,
                           'version': self.version,
                           'format': self.format}) 
            return self.Request('post', **params)


        
        def getBasicInfo(self, params=None):
            """Gets merchant info based on API key (callee)
               https://www.coinpayments.net/apidoc-get-basic-info
            """
            params.update({'cmd':'get_basic_info',
                           'key':self.publicKey,
                           'version': self.version,
                           'format': self.format})
            return self.Request('post', **params)


        
        
        def getTransactionInfo(self, params=None):
            """Get transaction info
                           https://www.coinpayments.net/apidoc-get-tx-info
            """
           
            params.update({'cmd':'get_tx_info',
                           'key':self.publicKey,
                           'version': self.version,
                           'format': self.format})
            return self.Request('post', **params)
        
        
        
        
        

        def rates(self, params=None):
            """Gets current rates for currencies
               https://www.coinpayments.net/apidoc-rates 
            """
            params.update({'cmd':'rates',
                           'key':self.publicKey,
                           'version': self.version,
                           'format': self.format})
            return self.Request('post', **params)



        def balances(self, params=None):
            """Get current wallet balances
                https://www.coinpayments.net/apidoc-balances
            """
            params.update({'cmd':'balances',
                           'key':self.publicKey,
                           'version': self.version,
                           'format': self.format})
            return self.Request('post', **params)


        def getDepositAddress(self, params=None):
            """Get address for personal deposit use
               https://www.coinpayments.net/apidoc-get-deposit-address
            """
            params.update({'cmd':'get_deposit_address',
                           'key':self.publicKey,
                           'version': self.version,
                           'format': self.format})
            return self.Request('post', **params)


        def getCallbackAddress(self, params=None):
            """Get a callback address to recieve info about address status
               https://www.coinpayments.net/apidoc-get-callback-address 
            """
            params.update({'cmd':'get_callback_address',
                           'ipn_url':self.ipn_url,
                           'key':self.publicKey,
                           'version': self.version,
                           'format': self.format})
            return self.Request('post', **params)

        def createTransfer(self, params=None):
            """Not really sure why this function exists to be honest, it transfers
                coins from your addresses to another account on coinpayments using
                merchant ID
               https://www.coinpayments.net/apidoc-create-transfer
            """
            params.update({'cmd':'create_transfer',
                           'key':self.publicKey,
                           'version': self.version,
                           'format': self.format})
            return self.Request('post', **params)

        def createWithdrawal(self, params=None):
            """Withdraw or masswithdraw(NOT RECOMMENDED) coins to a specified address,
            optionally set a IPN when complete.
                https://www.coinpayments.net/apidoc-create-withdrawal
            """
            params.update({'cmd':'create_withdrawal',
                            'key':self.publicKey,
                            'version': self.version,
                            'format': self.format})
            return self.Request('post', **params)


        
        def convertCoins(self, params=None):
            """Convert your balances from one currency to another
                https://www.coinpayments.net/apidoc-convert 
            """
            params.update({'cmd':'convert',
                            'key':self.publicKey,
                            'version': self.version,
                            'format': self.format})
            return self.Request('post', **params)

        def getWithdrawalHistory(self, params=None):
            """Get list of recent withdrawals (1-100max)
                https://www.coinpayments.net/apidoc-get-withdrawal-history 
            """
            params.update({'cmd':'get_withdrawal_history',
                            'key':self.publicKey,
                            'version': self.version,
                            'format': self.format})
            return self.Request('post', **params)

        def getWithdrawalInfo(self, params=None):
            """Get information about a specific withdrawal based on withdrawal ID
                https://www.coinpayments.net/apidoc-get-withdrawal-info
            """
            params.update({'cmd':'get_withdrawal_info',
                            'key':self.publicKey,
                            'version': self.version,
                            'format': self.format})
            return self.Request('post', **params)


        def getConversionInfo(self, params=None):
            """Get information about a specific withdrawal based on withdrawal ID
                https://www.coinpayments.net/apidoc-get-conversion-info
            """
            params.update({'cmd':'get_conversion_info',
                            'key':self.publicKey,
                            'version': self.version,
                            'format': self.format})
            return self.Request('post', **params)


    async def odeme_yapilmismi(user_id):

            client = CryptoPayments(odeme_API_KEY, odeme_API_SECRET, odeme_IPN_URL)
            
            ode_yontem = fetch_row("select * from odemeler where status = '0'")
            #ode_yontem = fetch_row("select * from odemeler where 1")
            
            bekleyen_odeme = 0
            
            for oo in ode_yontem:        
                
                try:
                    
                    u_id = str(oo[1])
                    uu2 = fetch_row("select * from users where user_id='"+u_id+"'")
                    uu = uu2[0]
                    u_name = uu[2]
                    eski_abonelik = int(uu[6])

                    suan = int(pd.to_datetime(datetime.now()).timestamp())
                    
                    print("----------------------------------");
                    print("uu:",uu);
                    print("oo:",oo);
                    
                    #Use previous tx Id returned from the previous createTransaction method to test the getTransactionInfo call
                    post_params1 = {
                        'txid' : str(oo[2]),    
                    }


                    ti = client.getTransactionInfo(post_params1) #call coinpayments API using instance

                    print(ti);

                    odeme_durum = 0
                    
                    json_str = str(ti).replace("\"","\\\"").replace("\'","\\\'");

                    if ti['amount']<=ti['received']:
                        odeme_durum = 1

                        if eski_abonelik>suan:
                            yeni_abonelik = int(eski_abonelik)+int(86400*int(oo[8]))
                        else:
                            yeni_abonelik = int(suan)+int(86400*int(oo[8]))
                        
                        if str(user_id)==str(u_id):
                            bekleyen_odeme=bekleyen_odeme+1
                        
                        cb1 = types.InlineKeyboardMarkup()

                        user_ode_msg = "Sayın "+u_name+", Ödemeniz başarı ie elimize ulaştı ve aboneliğiniz "+str(oo[8])+" ay süre ile uzatıldı. abonelik bitiş tarihiniz : "+str(pd.to_datetime(yeni_abonelik,unit="s"));
                        
                        cursor = new_cursor()
                        cursor.execute("update users set abonelik = '"+str(yeni_abonelik)+"' where user_id = '"+u_id+"'")
                        
                        cursor.close()
                        
                        cursor = new_cursor()
                        cursor.execute("update odemeler set status = '1',json_result='"+json_str+"' where id = '"+str(oo[0])+"'")
                        
                        cursor.close()

                        ode_5 = types.InlineKeyboardButton(text='Gerçekleşmiş Ödemeleri Kontrol Et', callback_data='odeme_yapilmismi')
                        cb1.add(ode_5)
                        ode_5 = types.InlineKeyboardButton(text='ANAMENU', callback_data='anamenu')
                        cb1.add(ode_5)
                        
                        print("user_ode_msg:",user_ode_msg);
                        
                        (tb_send_message(u_id, user_ode_msg, cb1))
                        
                        odeme_bildirim = "Yeni Ödeme Bildirimi:\nÜye:"+u_name+"\nTarih:"+str(pd.to_datetime(suan,unit="s"))+\
                        "\nAbonelik Bitiş:"+str(pd.to_datetime(yeni_abonelik,unit="s"))+"\n"+\
                        "\nSüre:"+str(oo[8])+"\n"+\
                        "\nTutar:"+str(oo[8])+" USD / "+ti['amountf']+"\n"+\
                        "\nÖdenen:"+ti['receivedf']+"\n";
                        
                        admins = str(root_id).split(",")
                        for ads in admins:
                            (tb_send_message(ads,odeme_bildirim))


                    elif ti['amount']>ti['received'] and ti['received']>0:
                        odeme_durum = 1
                        
                        if str(user_id)==str(u_id):
                            bekleyen_odeme=bekleyen_odeme+1
                        
                        
                        kac_ay = int(oo[8])*(ti['received']/ti['amount'])
                        
                        kac_gun = int(kac_ay*30)

                        if eski_abonelik>suan:
                            yeni_abonelik = int(eski_abonelik)+int(86400*kac_ay)
                        else:
                            yeni_abonelik = int(suan)+int(86400*kac_ay)
                        

                        cb1 = types.InlineKeyboardMarkup()
                        
                        
                        user_ode_msg = "Sayın "+u_name+", Ödemeniz başarı ie elimize ulaştı. Tam tutarda ödeme yapmadınız için ve aboneliğiniz "+str(kac_gun)+" gun süre ile uzatıldı. abonelik bitiş tarihiniz : "+str(pd.to_datetime(yeni_abonelik,unit="s"));
                        
                        cursor = new_cursor()
                        cursor.execute("update users set abonelik = '"+str(yeni_abonelik)+"' where user_id = '"+u_id+"'")
                        
                        cursor.close()
                        
                        cursor = new_cursor()
                        cursor.execute("update odemeler set status = '1',json_result='"+json_str+"' where id = '"+str(oo[0])+"'")
                        
                        cursor.close()

                        ode_5 = types.InlineKeyboardButton(text='Gerçekleşmiş Ödemeleri Kontrol Et', callback_data='odeme_yapilmismi')
                        cb1.add(ode_5)
                        ode_5 = types.InlineKeyboardButton(text='ANAMENU', callback_data='anamenu')
                        cb1.add(ode_5)
                        
                        print("user_ode_msg:",user_ode_msg);
                        
                        (tb_send_message(u_id, user_ode_msg, cb1))
                        

                        odeme_bildirim = "Yeni Ödeme Bildirimi:\nÜye:"+u_name+"\nTarih:"+str(pd.to_datetime(suan,unit="s"))+\
                        "\nAbonelik Bitiş:"+str(pd.to_datetime(yeni_abonelik,unit="s"))+"\n"+\
                        "\nSüre:"+str(oo[8])+" ay\n"+\
                        "\nTutar:"+str(oo[8])+" USD / "+ti['amountf']+"\n"+\
                        "\nAbone Süresi:"+str(kac_gun)+" gün\n"+\
                        "\nÖdenen:"+ti['receivedf']+"\n";
                        
                        admins = str(root_id).split(",")
                        for ads in admins:
                            (tb_send_message(ads,odeme_bildirim))
                    
                    elif ti['status_text'].find("Waiting for buyer")>-1:
                        
                        if str(user_id)==str(u_id):
                            bekleyen_odeme=bekleyen_odeme+1
                        
                        
                        if str(user_id) == str(u_id):
                            
                            user_ode_msg = "Bu faturanız henüz ödemesi tamamlanmamış gözüküyor. Tamamlamak için ödeme formuna gidin. eğer ödeme yaptıysanız transferin tamamlanması için bekleyin. Şayet enaz 10 adet blochain de onaylandıktan sonra tarafımıza ulaşıcaktır.";
                            
                            sure = str(oo[8])
                            tutar = str(oo[9])
                            
                            
                            cb1 = types.InlineKeyboardMarkup()

                            
                            ode_1 = types.InlineKeyboardButton(text='Ödeme Formuna Git - '+str(sure)+" ay "+str(tutar)+" USD", url=oo[4])
                            cb1.add(ode_1)
                            ode_2 = types.InlineKeyboardButton(text='Ödeme Durumu Kontrolü Et', url=oo[5])
                            cb1.add(ode_2)
                            ode_3 = types.InlineKeyboardButton(text='QR Kodu Görüntüle', url=oo[6])
                            cb1.add(ode_3)
                            ode_5 = types.InlineKeyboardButton(text='Gerçekleşmiş Ödemeleri Kontrol Et', callback_data='odeme_yapilmismi')
                            cb1.add(ode_5)
                            ode_5 = types.InlineKeyboardButton(text='ANAMENU', callback_data='anamenu')
                            cb1.add(ode_5)
                            
                            print("user_ode_msg:",user_ode_msg);
                            
                            (tb_send_message(u_id, user_ode_msg, cb1))
                            

                    elif ti['status_text'].find("Cancelled")>-1:
                        
                        print("canceled : ",json_str);
                        
                        cursor = new_cursor()
                        cursor.execute("update odemeler set status = '2',json_result='"+json_str+"' where id = '"+str(oo[0])+"'")
                        
                        cursor.close()
                
                        
                except Exception as ee:
                    print("odeme check error:",ee)

            if bekleyen_odeme==0:
        
                cb1 = types.InlineKeyboardMarkup()

                ode_5 = types.InlineKeyboardButton(text='Abonelik Ödemesi Yap', callback_data='odeme_kontrolu')
                cb1.add(ode_5)
                ode_5 = types.InlineKeyboardButton(text='ANAMENU', callback_data='anamenu')
                cb1.add(ode_5)
                
                user_ode_msg = "Gerçekleşmiş veya onay bekleyen ödeme bulunmuyor Ödeme yapmak için ödeme Sayfasına geri dönün.";
                
                print("user_ode_msg:",user_ode_msg);
                
                (tb_send_message(user_id, user_ode_msg, cb1))

    async def odeme_formu_2(user_id,data):

            ksr = data.split("_")
            tutar = float(ksr[3])
            sure = int(ksr[2])
            
            tarih = pd.to_datetime(datetime.now())

            create_transaction_params = {
                'amount' : tutar,
                'currency1' : odeme_currency1,
                'currency2' : odeme_currency2,
                'buyer_email' : odeme_buyer_email
            }

            #Client instance
            client = CryptoPayments(odeme_API_KEY, odeme_API_SECRET, odeme_IPN_URL)

            #make the call to createTransaction crypto payments API
            transaction = client.createTransaction(create_transaction_params)
            
            print("transaction:",transaction);

            if transaction['error'] == 'ok':  #check error status 'ok' means the API returned with desired result
                
                cursor = new_cursor()
                cursor.execute("INSERT INTO `odemeler` (`id` ,`user_id` ,`txn_id` ,`tarih` ,`checkout_url` ,`status_url` ,`qrcode_url` ,`address`,`sure`,`tutar`,`status`) VALUES (NULL , '"+user_id+"', '"+str(transaction['txn_id'])+"', '"+str(tarih)+"', '"+str(transaction['checkout_url'])+"', '"+str(transaction['status_url'])+"', '"+str(transaction['qrcode_url'])+"', '"+str(transaction['address'])+"', '"+str(sure)+"', '"+str(tutar)+"', '0');");
                
                cursor.close()
                
                #   ()
            
                cb1 = types.InlineKeyboardMarkup()
                ode_1 = types.InlineKeyboardButton(text='Ödeme Formuna Git - '+str(sure)+" ay "+str(tutar)+" USD", url=transaction['checkout_url'])
                ode_2 = types.InlineKeyboardButton(text='Ödeme Durumu Kontrolü Et', url=transaction['status_url'])
                ode_3 = types.InlineKeyboardButton(text='QR Kodu Görüntüle', url=transaction['qrcode_url'])
                ode_4 = types.InlineKeyboardButton(text='Geri', callback_data="odeme_kontrolu")
              
                cb1.add(ode_1)
                cb1.add(ode_2)
                cb1.add(ode_3)
                cb1.add(ode_4)
                
                    
                (tb_send_message(user_id,'Yukarıdaki ödeme yap butonuna basıp ödeme yapınız. Ödemeyi tamamladıktan sonra aboneliğiniz otomatik olarak yükseltilicektir.',cb1))

            
                print (transaction['amount']) #print some values from the result
                print (transaction['address'])
            else:
                print (transaction['error'])

                cb1 = types.InlineKeyboardMarkup()
                buton1 = types.InlineKeyboardButton(text='ANA MENU', callback_data='anamenu')
                buton2 = types.InlineKeyboardButton(text='GERİ', callback_data='anamenu')
              
                cb1.add(buton1,buton2)
           
                (tb_send_message(user_id,'Ödeme Sisteminde Hata : '+transaction['error'],cb1))
                    
            
            
            
            '''
            #Use previous tx Id returned from the previous createTransaction method to test the getTransactionInfo call
            post_params1 = {
                'txid' : transaction['txn_id'],    
            }


            transactionInfo = client.getTransactionInfo(post_params1) #call coinpayments API using instance

            if transactionInfo['error'] == 'ok': #check error status 'ok' means the API returned with desired result
                print (transactionInfo['amountf']) 
                print (transactionInfo['payment_address'])
            else:
                print (transactionInfo['error'])       
            '''

    async def odeme_kontrolu(user_id):

        cb1 = types.InlineKeyboardMarkup()
        
        anahtarlar = fetch_row("select * from odemeler where user_id = '"+user_id+"'")
        
        if len(anahtarlar)==0 or 1:
        
            await odeme_formu(user_id);
        
        
        else:
            
            for e in range(len(anahtarlar)):
                
                anaht = list(anahtarlar[e])
                
                hid = str(anaht[0])
                
                
                sinyal_str = "#"+str(anaht[2])+"\n"+str(anaht[3]).split(".")[0]+" "+str(anaht[8])+" ay "+str(anaht[9])+" USD durum:"+str(anaht[10])
                
                ankey = types.InlineKeyboardButton(text=sinyal_str
                #, callback_data='odeme_check_'+hid
                , url=str(anaht[5])
                )
                cb1.add(ankey)
                
                if anaht[10]==0:
                    ankey2 = types.InlineKeyboardButton(text="#"+str(anaht[2])+" Ödemesini Tamamla"
                    #, callback_data='odeme_check_'+hid
                    , url=str(anaht[4])
                    )
                    
                    cb1.add(ankey2)
                
        
            c_anamenu = types.InlineKeyboardButton(text="ANA MENU", callback_data='anamenu')
            cb1.add(c_anamenu)
                
            (tb_send_message(user_id,'Bu sayfada yaptığınz geçmiş ödemeleri görebilir ve durumlarını kontrol edebilirsiniz. Şayet ödeme yapmışsanız ve aboneliğiniz yüksetilmemişse bu sayfayı ziyaretinizden sonra otomatik yüklseltilicektir.',cb1))
      
    async def bakiye_sorgula(user_id):

        (tb_send_message(user_id,'Buradan bakiye sorgulamak istediğiniz Crypto borsasını seçiniz', borsalar("bakiyeler")))

    async def gecmis_islemler(user_id):

        (tb_send_message(user_id,'Buradan geçmiş işlemlerini görmek istediğini Crypto borsasını seçiniz.', borsalar("gecmisler")))

    async def gecmisler(user_id,borsa):

        cb1 = types.InlineKeyboardMarkup()
        
        anahtarlar = fetch_row("select * from apikeys where user_id = '"+user_id+"' and exchange='"+borsa+"'")
        
        for e in range(len(anahtarlar)):
            
            anaht = anahtarlar[e]
            
            hid = str(anaht[0])
            hkey = str(anaht[2])
            
            ankey = types.InlineKeyboardButton(text=hkey, callback_data='gecmis_trades_'+borsa+'_'+hid)
            cb1.add(ankey)
            
        
        buton1 = types.InlineKeyboardButton(text='ANA MENU', callback_data='anamenu')
        buton2 = types.InlineKeyboardButton(text='GERİ', callback_data='gecmis_islemler')
      
        cb1.add(buton1,buton2)
            
        (tb_send_message(user_id,'Bu sayfadan geçmiş işlemlerini görmek istediğiniz api anahtarını seçiniz', cb1))

    async def gecmis_trades_old(user_id,borsa,api_id):

        print("select * from api_signals where api_id = '"+api_id+"' order by id asc")


        u_data = fetch_row("select first_name,durum,abonelik from users where user_id = '"+str(user_id)+"'")
        
        uye_durumu="Üye Durumu: Normal Üye"
        suan = float(pd.to_datetime(datetime.now()).timestamp())
        abone_mi=0
        if len(u_data)>0:
            uu = u_data[0]
            first_name = uu[0]
            is_admin = uu[1]
            abonetrh = float(uu[2])
            
            if abonetrh>suan:
                uye_durumu="Üye Durumu: Premium Üye\nAbonelik Bitiş:"+str(pd.to_datetime(uu[2],unit="s"))
                abone_mi=1
        else:
            
            first_name = "Ziyaretci"
            is_admin = 1
            
        if abone_mi==0:

            c_anamenu = types.InlineKeyboardButton(text="ANA MENU", callback_data='anamenu')
            cb1.add(c_anamenu)
                
            tb_send_message(user_id,'Bu sayfadaki içeriği görüntülüyebilmek için abone olmanız gerekmektedir. abone olmak için yetkili bir kişi ile görüşünüz.',cb1)
            return 
            

        anahtarlar = fetch_row("select * from user_signals where api_id = '"+api_id+"' order by id asc")
        
        sign_detail = ""
        
        for e in range(len(anahtarlar)):
            
            anaht = anahtarlar[e]
            
            hid = str(anaht[0])
            signal_id = str(anaht[2])
            s_start = str(anaht[3])
            
            
            sdd = fetch_row("select * from user_signals where api_id = '"+signal_id+"'")
            
            ss = sdd[0]
            
            sn_symbol = str(ss[3])
            sn_trend = str(ss[4])
            sn_entry1 = str(ss[5])
            sn_entry2 = str(ss[6])
            sn_sl = str(ss[7])
            sn_tp1 = str(ss[8])
            sn_tp2 = str(ss[9])
            sn_tp3 = str(ss[10])
            sn_tp4 = str(ss[11])
            sn_tp5 = str(ss[12])
            sn_tarih = str(pd.to_datetime(ss[13],unit="s"))
            s_volume = str(anaht[9])
               
            s_open = str(anaht[4])
            s_sl = str(anaht[5])
            s_close = str(anaht[6])
            
            s_profit = "0.0"
            
            if float(s_start) == 0:
                s_start = "Bekliyor"
            elif float(s_close)>0:
                s_start = "Kapandı"
                
                if sn_trend == "LONG":
                    s_profit=(float(s_close)-float(s_open))*float(s_volume)
                
                elif sn_trend == "SHORT":
                    s_profit=(float(s_open)-float(s_close))*float(s_volume)
                
                s_profit = str(round(s_profit,5))
                
            else:
                s_start = "Açıldı"
                  
             
            if s_open == "0":
                s_open = "----"
            if s_sl == "0":
                s_sl = "----"
            if s_close == "0":
                s_close = "----"
                s_profit = "----"
            
            s_lot = str(anaht[7])
            s_leverage = str(anaht[8])
            
            sign_detail = "Order ID: "+hid+"\n"
            sign_detail+= "Signal ID: "+signal_id+"\n"
            sign_detail+= "------- SİNYAL DETAYLARI --------\n"
            sign_detail+= "Parite: "+sn_symbol+" "
            sign_detail+= "Trend: "+sn_trend+" "
            sign_detail+= "Entry1: "+sn_entry1+"\n"
            sign_detail+= "Entry2: "+sn_entry2+" "
            sign_detail+= "SL: "+sn_sl+" "
            sign_detail+= "TP1: "+sn_tp1+"\n"
            sign_detail+= "TP2: "+sn_tp2+" "
            sign_detail+= "TP3: "+sn_tp3+"\n"
            sign_detail+= "TP4: "+sn_tp4+" "
            sign_detail+= "TP5: "+sn_tp5+"\n"
            sign_detail+= "Tarih: "+sn_tarih+"\n"
            sign_detail+= "------- POZISYON DETAYLARI --------\n"
            sign_detail+= "Durum: "+s_start+"\n"
            sign_detail+= "Açılış: "+s_open+"\n"
            sign_detail+= "Stoploss: "+s_sl+"\n"
            sign_detail+= "Kapanış: "+s_close+"\n"
            sign_detail+= "Margin: "+s_lot+"\n"
            sign_detail+= "Lot: "+s_volume+"\n"
            sign_detail+= "Kaldıraç: "+s_leverage+"\n"
            sign_detail+= "Kar: "+s_profit
            tb_send_message(user_id,sign_detail)
        cb1 = types.InlineKeyboardMarkup()
        buton1 = types.InlineKeyboardButton(text='ANA MENU', callback_data='anamenu')
        buton2 = types.InlineKeyboardButton(text='GERİ', callback_data='gecmisler_binance')
      
        cb1.add(buton1,buton2)
        tb_send_message(user_id,'Tüm açılan işlemlerinizle alakalı rapor sunulmuştur.',reply_markup=cb1)
    #send_message(user_id,sign_detail+'\nTüm açılan işlemlerinizle alakalı rapor sunulmuştur.',cb1)
      

        cb1 = types.InlineKeyboardMarkup()
        
        sayfa_adet=6
        
        adet = num_rows("select id from signals where 1")
        kac_sayfa = round(adet/sayfa_adet);
        
        #print("select * from signals where 1 order by tarih desc LIMIT "+str(sayfa*sayfa_adet)+","+str(sayfa_adet)+"")
        anahtarlar = fetch_row("select * from signals where 1 order by tarih desc LIMIT "+str(sayfa*sayfa_adet)+","+str(sayfa_adet)+"")
        
        for e in range(len(anahtarlar)):
            
            anaht = list(anahtarlar[e])
            
            hid = str(anaht[0])
            
            if anaht[13]==None:
                anaht[13]="0"
            
            sinyal_str = "#"+str(anaht[0])+" "+str(anaht[4])+" "+str(anaht[5])+" e1:"+str(anaht[6])+" "+str(anaht[14])
            
            ankey = types.InlineKeyboardButton(text=sinyal_str, callback_data='sinyaller_detay_'+hid+'_'+str(sayfa))
            cb1.add(ankey)
        
        geri_sayfa = sayfa-1
        if geri_sayfa<0:
            geri_sayfa=0
            
        ileri_sayfa = sayfa+1
        if ileri_sayfa>kac_sayfa-1:
            ileri_sayfa=kac_sayfa-1

        sf_key_geri = types.InlineKeyboardButton(text="<< İLERİ", callback_data='sinyaller_listele_'+str(geri_sayfa))
        sf_key_ileri = types.InlineKeyboardButton(text=" GERİ >>", callback_data='sinyaller_listele_'+str(ileri_sayfa))
        
        if sayfa == 0:
            cb1.add(sf_key_ileri)
        elif sayfa==kac_sayfa-1:
            cb1.add(sf_key_geri)
        else:
            cb1.add(sf_key_geri,sf_key_ileri)
        
        cb1 = types.InlineKeyboardMarkup()
        c_anamenu = types.InlineKeyboardButton(text="ANA MENU", callback_data='anamenu')
        cb1.add(c_anamenu)
            
        (tb_send_message(user_id,'Bu sayfada Paylaşılmış sinyalleri görebilirsiniz. Sinyalin üstüne tıklayıp bu sinyali silebilirsiniz.',cb1))
  
    async def gecmis_trades(user_id,borsa,api_id,sayfa=0):



        u_data = fetch_row("select first_name,durum,abonelik from users where user_id = '"+str(user_id)+"'")
        
        uye_durumu="Üye Durumu: Normal Üye"
        suan = float(pd.to_datetime(datetime.now()).timestamp())
        abone_mi=0
        if len(u_data)>0:
            uu = u_data[0]
            first_name = uu[0]
            is_admin = uu[1]
            abonetrh = float(uu[2])
            
            if abonetrh>suan:
                uye_durumu="Üye Durumu: Premium Üye\nAbonelik Bitiş:"+str(pd.to_datetime(uu[2],unit="s"))
                abone_mi=1
        else:
            
            first_name = "Ziyaretci"
            is_admin = 1
            
        if abone_mi==0:
            cb1 = types.InlineKeyboardMarkup()
            c_anamenu = types.InlineKeyboardButton(text="ANA MENU", callback_data='anamenu')
            cb1.add(c_anamenu)
                
            tb_send_message(user_id,'Bu sayfadaki içeriği görüntülüyebilmek için abone olmanız gerekmektedir. abone olmak için yetkili bir kişi ile görüşünüz.',cb1)
            return 
            
        cb1 = types.InlineKeyboardMarkup()
        
        sayfa=int(sayfa)
        if sayfa<0:
            sayfa=0
        
        sayfa_adet=6
        
        adet = num_rows("select id from user_signals where user_id = '"+str(user_id)+"' and api_id='"+str(api_id)+"'")
        
        print("adet:",adet)
        kac_sayfa = round(adet/sayfa_adet);
        
        #print("select * from signals where 1 order by tarih desc LIMIT "+str(sayfa*sayfa_adet)+","+str(sayfa_adet)+"")
        anahtarlar = fetch_row("select * from user_signals where user_id = '"+str(user_id)+"' and api_id='"+str(api_id)+"' order by id desc LIMIT "+str(sayfa*sayfa_adet)+","+str(sayfa_adet)+"")
        
        for e in range(len(anahtarlar)):
            
            anaht = list(anahtarlar[e])
            
            hid = str(anaht[0])
            
            if anaht[13]==None:
                anaht[13]="0"
            
            sinyal_str = "#"+str(anaht[0])+" "+str(anaht[8])+" "+str(anaht[9])+" o:"+str(anaht[10])+" "+str(anaht[11])
            
            ankey = types.InlineKeyboardButton(text=sinyal_str, callback_data='gecmis_detay_'+str(hid)+'_'+str(api_id)+'_'+str(sayfa))
            cb1.add(ankey)
        
        geri_sayfa = sayfa-1
        if geri_sayfa<0:
            geri_sayfa=0
            
        ileri_sayfa = sayfa+1
        if ileri_sayfa>kac_sayfa-1:
            ileri_sayfa=kac_sayfa-1

        sf_key_geri = types.InlineKeyboardButton(text="<< İLERİ", callback_data='gecmis_trades_'+borsa+'_'+str(api_id)+'_'+str(geri_sayfa))
        sf_key_ileri = types.InlineKeyboardButton(text=" GERİ >>", callback_data='gecmis_trades_'+borsa+'_'+str(api_id)+'_'+str(ileri_sayfa))
        
        if sayfa == 0:
            cb1.add(sf_key_ileri)
        elif sayfa==kac_sayfa-1:
            cb1.add(sf_key_geri)
        else:
            cb1.add(sf_key_geri,sf_key_ileri)
        

        c_kar_grafik = types.InlineKeyboardButton(text="KAR GRAFIGI", callback_data='kar_grafik_user_'+str(api_id)+'_'+str(sayfa))
        cb1.add(c_kar_grafik)
        c_anamenu = types.InlineKeyboardButton(text="ANA MENU", callback_data='anamenu')
        cb1.add(c_anamenu)
        

        api_name = ""
        
        apk = fetch_row("select name from apikeys where id = '"+str(api_id)+"'")
        if len(apk)>0:
            api_name=apk[0][0]
                
            
        (tb_send_message(user_id,'Bu sayfadan '+api_name+' api anahtarınızda açılmış sinyalleri görebilirsiniz.',cb1))
             
    async def gecmis_detay(user_id,sinyal_id,api_id,sayfa):

        u_data = fetch_row("select first_name,durum,abonelik from users where user_id = '"+str(user_id)+"'")
        
        uye_durumu="Üye Durumu: Normal Üye"
        suan = float(pd.to_datetime(datetime.now()).timestamp())
        abone_mi=0
        if len(u_data)>0:
            uu = u_data[0]
            first_name = uu[0]
            is_admin = uu[1]
            abonetrh = float(uu[2])
            
            if abonetrh>suan:
                uye_durumu="Üye Durumu: Premium Üye\nAbonelik Bitiş:"+str(pd.to_datetime(uu[2],unit="s"))
                abone_mi=1
        else:
            
            first_name = "Ziyaretci"
            is_admin = 1
            
        if abone_mi==0:
            cb1 = types.InlineKeyboardMarkup()
            c_anamenu = types.InlineKeyboardButton(text="ANA MENU", callback_data='anamenu')
            cb1.add(c_anamenu)
                
            tb_send_message(user_id,'Bu sayfadaki içeriği görüntülüyebilmek için abone olmanız gerekmektedir. abone olmak için yetkili bir kişi ile görüşünüz.',cb1)
            return 
            
        cb1 = types.InlineKeyboardMarkup()
        
        sn = fetch_row("select * from user_signals where id = '"+str(sinyal_id)+"'")
        
        
        if len(sn)>0:

            sny = sn[0]

            if str(sny[9])=="SHORT":
                new_message = "🛑 "+str(sny[9])+"\n"
            else:
                new_message = "🟢 "+str(sny[9])+"\n"
                
            new_message+= "❇️ "+str(sny[8])+"\n"
            new_message+= "ID : #"+str(sny[0])+"\n"
            new_message+= "Ticket : #"+str(sny[7])+"\n"
            new_message+= "Açılış Tarih : "+str(pd.to_datetime(sny[11]))+"\n"
            new_message+= "Açılış : "+str(sny[10])+"\n"
            new_message+= "Lot : "+str(sny[12])+"\n"
            
            c_date = str(pd.to_datetime(sny[16]))
            ckes = c_date.split("+")
            if len(ckes)>1:
                c_date = ckes[0]
            
            new_message+= "Kapanış Tarih : "+str(c_date)+"\n"            
            new_message+= "Kapanış Fiyat : "+str(sny[15])+"\n"            
            new_message+= "Kar : "+str(sny[17])+" USDT\n"            
            new_message+= "Mesaj : "+str(sny[18])+"\n"            
            

            c_geri = types.InlineKeyboardButton(text="Geri Dön", callback_data='gecmis_trades_borsa_'+str(api_id)+'_'+str(sayfa))
            cb1.add(c_geri)
            c_anamenu = types.InlineKeyboardButton(text="ANA MENU", callback_data='anamenu')
            cb1.add(c_anamenu)
                
            (tb_send_message(user_id,new_message,cb1))
   
    async def kar_grafik_user(user_id,api_id,sayfa):

        u_data = fetch_row("select first_name,durum,abonelik from users where user_id = '"+str(user_id)+"'")
        
        uye_durumu="Üye Durumu: Normal Üye"
        suan = float(pd.to_datetime(datetime.now()).timestamp())
        abone_mi=0
        if len(u_data)>0:
            uu = u_data[0]
            first_name = uu[0]
            is_admin = uu[1]
            abonetrh = float(uu[2])
            
            if abonetrh>suan:
                uye_durumu="Üye Durumu: Premium Üye\nAbonelik Bitiş:"+str(pd.to_datetime(uu[2],unit="s"))
                abone_mi=1
        else:
            
            first_name = "Ziyaretci"
            is_admin = 1
            
        if abone_mi==0:
            cb1 = types.InlineKeyboardMarkup()
            c_anamenu = types.InlineKeyboardButton(text="ANA MENU", callback_data='anamenu')
            cb1.add(c_anamenu)
                
            tb_send_message(user_id,'Bu sayfadaki içeriği görüntülüyebilmek için abone olmanız gerekmektedir. abone olmak için yetkili bir kişi ile görüşünüz.',cb1)
            return 
            
        sn = fetch_row("select * from user_signals where user_id='"+str(user_id)+"' and api_id='"+str(api_id)+"' and close>0")
        
        api_name = ""
        
        apk = fetch_row("select name from apikeys where id = '"+str(api_id)+"'")
        if len(apk)>0:
            api_name=apk[0][0]
        
        if len(sn)>0:

            sny = sn[0]
            
            sgn_tarih=[]
            sgn_profit=[]
            
            sum_prft=0
            
            for s in range(len(sn)):
                
                se = sn[s]
                
                kar = float(se[17])
                sum_prft=sum_prft+kar 
                
                sgn_tarih.append(se[16])
                sgn_profit.append(sum_prft)
                
            
            s_from = str(sgn_tarih[0])
            s_to = str(sgn_tarih[-1])
            totali = str(round(sgn_profit[-1],3))+" USDT"
            
            plt.figure(figsize=(9,4))
            plt.title(api_name+" api anahtarı Kar Grafiği "+s_from+" "+s_to+" "+totali)
            plt.plot(sgn_profit,label="Kar Grafiği")
            plt.legend()
            
            grafikname="kar_grafik/user_grafik_"+str(user_id)+"_"+str(api_id)+".png"
            
            plt.savefig(grafikname)
            plt.close()
            
                
            new_message="Bu "+api_name+" isimli api anahtarınızın kar grafiğidir."
            
            await tb.send_photo(user_id,photo=open(grafikname, 'rb'))
            
            await asyncio.sleep(1)
               
            cb1a = types.InlineKeyboardMarkup()
        
            c_geri1 = types.InlineKeyboardButton(text="Geri Dön", callback_data='sinyaller_listele_'+str(sayfa))
            c_anamenu1 = types.InlineKeyboardButton(text="ANA MENU", callback_data='anamenu')
            cb1a.add(c_geri1,c_anamenu1)

            tb_send_message(user_id,new_message,reply_markup=cb1a)
  
    async def sinyaller_listele(user_id,sayfa=0):

        u_data = fetch_row("select first_name,durum,abonelik from users where user_id = '"+str(user_id)+"'")
        
        uye_durumu="Üye Durumu: Normal Üye"
        suan = float(pd.to_datetime(datetime.now()).timestamp())
        abone_mi=0
        if len(u_data)>0:
            uu = u_data[0]
            first_name = uu[0]
            is_admin = uu[1]
            abonetrh = float(uu[2])
            
            if abonetrh>suan:
                uye_durumu="Üye Durumu: Premium Üye\nAbonelik Bitiş:"+str(pd.to_datetime(uu[2],unit="s"))
                abone_mi=1
        else:
            
            first_name = "Ziyaretci"
            is_admin = 1
            
        if abone_mi==0:
            cb1 = types.InlineKeyboardMarkup()
            c_anamenu = types.InlineKeyboardButton(text="ANA MENU", callback_data='anamenu')
            cb1.add(c_anamenu)
                
            tb_send_message(user_id,'Bu sayfadaki içeriği görüntülüyebilmek için abone olmanız gerekmektedir. abone olmak için yetkili bir kişi ile görüşünüz.',cb1)
            return 
            
        cb1 = types.InlineKeyboardMarkup()
        
        sayfa_adet=6
        
        sayfa = int(sayfa)
        
        print("sinyaller_listele ",user_id)
        
        adet = num_rows("select id from signals where 1")
        kac_sayfa = round(adet/sayfa_adet);
        
        print("select * from signals where 1 order by tarih desc LIMIT "+str(sayfa*sayfa_adet)+","+str(sayfa_adet)+"")
      
      
        my_query("update signals set last_sl = 0, last_tp = 0, profit=0")
        
        sg = my_query("SELECT * FROM `bildirimler_ch` ORDER BY `gonderim` DESC LIMIT 50")
        
        for sgc in sg:
            
            bild = sgc
         
            o_poz = my_query("select * from signals where signalid = '"+str(bild['post_id'])+"'")
            
            if len(o_poz)>0:
                
                eski_tp = o_poz[0]['last_tp']
                eski_sl = o_poz[0]['last_sl']
                
                new_prft = bild['profit']
                if eski_tp>0:
                    new_prft = o_poz[0]['profit']
                last_sl = 0
                last_tp = 0
                
                
                if bild['cmd'] == "SL":
                    last_sl = 1
                elif bild['cmd'] == "TP1": 
                    last_tp = 1
                elif bild['cmd'] == "TP2": 
                    last_tp = 2
                elif bild['cmd'] == "TP3": 
                    last_tp = 3
                elif bild['cmd'] == "TP4": 
                    last_tp = 4
                elif bild['cmd'] == "TP5": 
                    last_tp = 5
                
                if last_sl == 0:
                    last_sl = eski_sl
                
                if last_tp == 0:
                    last_tp = eski_tp
                
                if last_sl>0 and eski_sl==0 and eski_tp==0:
                    if bild['trend'] == "LONG":
                        new_prft = (o_poz[0]['sl']/o_poz[0]['entry1'])-1
                    elif bild['trend'] == "SHORT": 
                        new_prft = (o_poz[0]['entry1']/o_poz[0]['sl'])-1
                
                if (last_tp>eski_tp and last_tp>0) or (eski_sl==0 and last_sl==1):  
                    if bild['trend'] == "LONG":
                            
                        if last_tp == 1:
                            new_prft = (o_poz[0]['tp1']/o_poz[0]['entry1'])-1
                        elif last_tp == 2:
                            new_prft = (o_poz[0]['tp2']/o_poz[0]['entry1'] )-1
                        elif last_tp == 3:
                            new_prft = (o_poz[0]['tp3']/o_poz[0]['entry1'])-1 
                        elif last_tp == 4:
                            new_prft = (o_poz[0]['tp4']/o_poz[0]['entry1'])-1 
                        elif last_tp == 5:
                            new_prft = (o_poz[0]['tp5']/o_poz[0]['entry1'])-1 
                    
                            
                    elif bild['trend'] == "SHORT":
                            
                        if last_tp == 1:
                            new_prft = (o_poz[0]['entry1']/o_poz[0]['tp1'])-1
                        elif last_tp == 2:
                            new_prft = (o_poz[0]['entry1']/o_poz[0]['tp2'])-1
                        elif last_tp == 3:
                            new_prft = (o_poz[0]['entry1']/o_poz[0]['tp3'])-1
                        elif last_tp == 4:
                            new_prft = (o_poz[0]['entry1']/o_poz[0]['tp4'])-1
                        elif last_tp == 5:
                            new_prft = (o_poz[0]['entry1']/o_poz[0]['tp5'])-1
                    
                    
                    my_query("update `signals` set profit = '"+str(new_prft)+"', last_tp='"+str(last_tp)+"', last_sl='"+str(last_sl)+"' where  signalid = '"+str(bild['post_id'])+"'")
                    print("update `signals` set profit = '"+str(new_prft)+"', last_tp='"+str(last_tp)+"', last_sl='"+str(last_sl)+"' where  signalid = '"+str(bild['post_id'])+"'")
                
        
        
        
        anahtarlar = fetch_row("select * from signals where 1 order by tarih desc LIMIT "+str(sayfa*sayfa_adet)+","+str(sayfa_adet)+"")
        
        for e in range(len(anahtarlar)):
            
            anaht = list(anahtarlar[e])
            
            hid = str(anaht[0])
            
            if anaht[13]==None:
                anaht[13]="0"
            
            sinyal_str = "#"+str(anaht[0])+" "+str(anaht[4])+" "+str(anaht[5])+" e1:"+str(anaht[6])+" "+str(anaht[14])
            
            print(sinyal_str)
            
            ankey = types.InlineKeyboardButton(text=sinyal_str, callback_data='sinyaller_detay_'+hid+'_'+str(sayfa))
            cb1.add(ankey)
        
        geri_sayfa = sayfa-1
        if geri_sayfa<0:
            geri_sayfa=0
            
        ileri_sayfa = sayfa+1
        if ileri_sayfa>kac_sayfa-1:
            ileri_sayfa=kac_sayfa-1
            
        print("geri_sayfa:",geri_sayfa," ileri_sayfa:",ileri_sayfa)

        sf_key_geri = types.InlineKeyboardButton(text="<< İLERİ", callback_data='sinyaller_listele_'+str(geri_sayfa))
        sf_key_ileri = types.InlineKeyboardButton(text=" GERİ >>", callback_data='sinyaller_listele_'+str(ileri_sayfa))
        
        if sayfa == 0:
            cb1.add(sf_key_ileri)
        elif sayfa==kac_sayfa-1:
            cb1.add(sf_key_geri)
        else:
            cb1.add(sf_key_geri,sf_key_ileri)
        
        print("sayfa:",sayfa," user_id:",user_id)

        c_kar_grafik = types.InlineKeyboardButton(text="KAR GRAFIGI", callback_data='kar_grafik_kanal_'+str(sayfa))
        cb1.add(c_kar_grafik)
        
        c_anamenu = types.InlineKeyboardButton(text="ANA MENU", callback_data='anamenu')
        cb1.add(c_anamenu)
            
        (tb_send_message(user_id,'Bu sayfada Paylaşılmış sinyalleri görebilirsiniz. Sinyalin üstüne tıklayıp bu sinyali silebilirsiniz.',cb1))
        
    async def sinyaller_detay(user_id,sinyal_id,sayfa):

        u_data = fetch_row("select first_name,durum,abonelik from users where user_id = '"+str(user_id)+"'")
        
        uye_durumu="Üye Durumu: Normal Üye"
        suan = float(pd.to_datetime(datetime.now()).timestamp())
        abone_mi=0
        if len(u_data)>0:
            uu = u_data[0]
            first_name = uu[0]
            is_admin = uu[1]
            abonetrh = float(uu[2])
            
            if abonetrh>suan:
                uye_durumu="Üye Durumu: Premium Üye\nAbonelik Bitiş:"+str(pd.to_datetime(uu[2],unit="s"))
                abone_mi=1
        else:
            
            first_name = "Ziyaretci"
            is_admin = 1
            
        if abone_mi==0:
            cb1 = types.InlineKeyboardMarkup()
            c_anamenu = types.InlineKeyboardButton(text="ANA MENU", callback_data='anamenu')
            cb1.add(c_anamenu)
                
            tb_send_message(user_id,'Bu sayfadaki içeriği görüntülüyebilmek için abone olmanız gerekmektedir. abone olmak için yetkili bir kişi ile görüşünüz.',cb1)
            return 
            
        cb1 = types.InlineKeyboardMarkup()
        
        sn = fetch_row("select * from signals where id = '"+str(sinyal_id)+"'")
        
        
        if len(sn)>0:

            sny = sn[0]

            if str(sny[5])=="SHORT":
                new_message = "🛑 "+str(sny[5])+"\n"
            else:
                new_message = "🟢 "+str(sny[5])+"\n"
                
            new_message+= "❇️ "+str(sny[4])+"\n"
            new_message+= "✅ Entry : "+str(sny[6])+" - "+str(sny[7])+"\n"
            new_message+= "🔥 Target 1 - "+str(sny[9])+"\n"
            new_message+= "🔥 Target 2 - "+str(sny[8])+"\n"
            new_message+= "🔥 Target 3 - "+str(sny[10])+"\n"
            new_message+= "🔥 Target 4 - "+str(sny[11])+"\n"
            new_message+= "🔥 Target 5 - "+str(sny[12])+"\n"
            new_message+= "⛔️ Stop Loss : "+str(sny[8])+"\n\n"            
            new_message+= "Açılış Tarih : "+str(sny[19])+"\n"            
            new_message+= "Açılış Fiyat : "+str(sny[18])+"\n"            
            new_message+= "Kapanış Tarih : "+str(sny[23])+"\n"            
            new_message+= "Kapanış Fiyat : "+str(sny[22])+"\n"            
            new_message+= "Kar : "+str(sny[24])+" USDT\n"            
            

            c_geri = types.InlineKeyboardButton(text="Geri Dön", callback_data='sinyaller_listele_'+str(sayfa))
            cb1.add(c_geri)
            c_anamenu = types.InlineKeyboardButton(text="ANA MENU", callback_data='anamenu')
            cb1.add(c_anamenu)
                
            (tb_send_message(user_id,new_message,cb1))
                 
    async def kar_grafik_kanal(user_id,sayfa):

        u_data = fetch_row("select first_name,durum,abonelik from users where user_id = '"+str(user_id)+"'")
        
        uye_durumu="Üye Durumu: Normal Üye"
        suan = float(pd.to_datetime(datetime.now()).timestamp())
        abone_mi=0
        if len(u_data)>0:
            uu = u_data[0]
            first_name = uu[0]
            is_admin = uu[1]
            abonetrh = float(uu[2])
            
            if abonetrh>suan:
                uye_durumu="Üye Durumu: Premium Üye\nAbonelik Bitiş:"+str(pd.to_datetime(uu[2],unit="s"))
                abone_mi=1
        else:
            
            first_name = "Ziyaretci"
            is_admin = 1
            
        if abone_mi==0:
            cb1 = types.InlineKeyboardMarkup()
            c_anamenu = types.InlineKeyboardButton(text="ANA MENU", callback_data='anamenu')
            cb1.add(c_anamenu)
                
            tb_send_message(user_id,'Bu sayfadaki içeriği görüntülüyebilmek için abone olmanız gerekmektedir. abone olmak için yetkili bir kişi ile görüşünüz.',cb1)
            return 
            
        sn = fetch_row("select * from signals where close>0")
        
        if len(sn)>0:

            sny = sn[0]
            
            sgn_tarih=[]
            sgn_profit=[]
            
            sum_prft=0
            
            for s in range(len(sn)):
                
                se = sn[s]
                
                kar = float(se[24])
                sum_prft=sum_prft+kar 
                
                sgn_tarih.append(se[23])
                sgn_profit.append(sum_prft)
                
            
            s_from = str(sgn_tarih[0])
            s_to = str(sgn_tarih[-1])
            totali = str(round(sgn_profit[-1],3))+" USDT"
            
            plt.figure(figsize=(9,4))
            plt.title("Kanal Sinyal Kar Grafiği "+s_from+" "+s_to+" "+totali)
            plt.plot(sgn_profit,label="Kar Grafiği")
            plt.legend()
            
            grafikname="kar_grafik/kar_grafik_"+str(user_id)+"_"+str(time.time())+".png"
            
            plt.savefig(grafikname)
            plt.close()
                
            new_message="Bu bölümden Kanal üzerinden açılan pozisyonların karlarını görebilirsiniz."
            
            await tb.send_photo(user_id,photo=open(grafikname, 'rb'))
            
            await asyncio.sleep(1)
               
            cb1a = types.InlineKeyboardMarkup()
        
            c_geri1 = types.InlineKeyboardButton(text="Geri Dön", callback_data='sinyaller_listele_'+str(sayfa))
            c_anamenu1 = types.InlineKeyboardButton(text="ANA MENU", callback_data='anamenu')
            cb1a.add(c_geri1,c_anamenu1)

            tb_send_message(user_id,new_message,reply_markup=cb1a)
              
    async def bakiyeler (user_id,borsa):

        cb1 = types.InlineKeyboardMarkup()

        anahtarlar = fetch_row("select * from apikeys where user_id = '"+user_id+"' and exchange='"+borsa+"'")

        for e in range(len(anahtarlar)):
            
            anaht = anahtarlar[e]
            
            hid = str(anaht[0])
            hkey = str(anaht[2])
            
            ankey = types.InlineKeyboardButton(text=hkey, callback_data='bakiye_'+borsa+'_'+hid)
            cb1.add(ankey)


        c_anamenu = types.InlineKeyboardButton(text="ANA MENU", callback_data='anamenu')
        c_geri = types.InlineKeyboardButton(text="GERI", callback_data='bakiye_sorgula')
        cb1.add(c_anamenu,c_geri)

        (tb_send_message(user_id,'Bu sayfadan kasa durumunu görmek istediğiniz api anahtarını seçiniz',cb1))
          
    async def abonez_sil_yes(user_id,hid):

        hesap_no = str(hid)
        
        cursor = new_cursor()
        cursor.execute("update users set abonelik = '0' where username = '"+hesap_no+"'")
        
        cursor.close()
        #   ()
        
        cb1 = types.InlineKeyboardMarkup()
        
        ankey = types.InlineKeyboardButton(text="Tüm Aboneleri Listele", callback_data='aboneler_listele')
        cb1.add(ankey)
        ankey = types.InlineKeyboardButton(text="Ana Menüye dön", callback_data='anamenu')
        cb1.add(ankey)
            
        (tb_send_message(user_id,hesap_no+' isimli kullanıcının aboneliği iptal edilmiştir.', cb1))
           
    async def send_message(user_id,msg,reply_markup=None):

        msg_type = "send"
        
       
        u_msg_id = last_msg_id(user_id)
        if len(u_msg_id)>0:
            msg_type="edit"
        
        if msg_type=="send" or len(u_msg_id)==0:
            
            sonmsg = await (tb.send_message(user_id,msg,reply_markup=reply_markup))
            #print("sonmsg:",sonmsg)
            add_msg_id(user_id,"send",sonmsg.id,msg)
        else:
            
            msg_id = u_msg_id[-1]
            
            if msg_id>0:
                try:
                    sonmsg = await (tb.edit_message_text(chat_id=user_id,message_id=msg_id,text=msg,reply_markup=reply_markup))
                    #print("sonmsg:",sonmsg)
                    add_msg_id(user_id,"send",sonmsg.id,msg)
                except:
                    
                    
                    sonmsg = await (tb.send_message(chat_id=user_id,text=msg,reply_markup=types.ReplyKeyboardRemove()))
                    #print("sonmsg:",sonmsg)
                    add_msg_id(user_id,"send",sonmsg.id,msg)
                  
                    
            else:
                sonmsg = await (tb.send_message(chat_id=user_id,text=msg,reply_markup=reply_markup))
                #print("sonmsg:",sonmsg)
                add_msg_id(user_id,"send",sonmsg.id,msg)
        
    async def start_message(message):

        sql_msg = str(message).replace("'","").replace('"','')

        user_id = str(message.from_user.id)

        generate_user_dict(user_id)

        username = str(message.from_user.username)
        first_name = str(message.from_user.first_name)
        last_name = str(message.from_user.last_name)
        tarih = str(message.date)
        durum = str(1)
        
        ucretsiz_sure = 0
        ucretsiz_gun=0

        checkid = num_rows("SELECT * FROM users where user_id = '"+user_id+"'")
        if checkid<1:
        
            
            try:
            
                mgk = fetch_row("select deneme_suresi from sinyalgrup where id = '1'")
                
                if len(mgk)>0:
                    ucretsiz_gun = int(mgk[0][0])
                    ucretsiz_sure = (int(mgk[0][0])*24*60*60)+round(time.time())
            except Exception as exc:
                pass
        
        
            cursor = new_cursor()
            if ucretsiz_sure>0:
                cursor.execute("INSERT INTO `users` (`id` ,`user_id` ,`username` ,`first_name` ,`last_name` ,`tarih` ,`raw_data` ,`durum` ,`abonelik`) VALUES (NULL , '"+user_id+"', '"+username+"', '"+first_name+"', '"+last_name+"', '"+tarih+"', '"+sql_msg+"', '"+durum+"', '"+str(ucretsiz_sure)+"');");
            else:
                cursor.execute("INSERT INTO `users` (`id` ,`user_id` ,`username` ,`first_name` ,`last_name` ,`tarih` ,`raw_data` ,`durum`) VALUES (NULL , '"+user_id+"', '"+username+"', '"+first_name+"', '"+last_name+"', '"+tarih+"', '"+sql_msg+"', '"+durum+"');");
            
            cursor.close()
            #   ()

        user_id = message.chat.id
        
        
        if ucretsiz_sure>0:
            await show_main_menu(user_id)
            if ucretsiz_gun>0:
                await send_message(user_id,"Merhaba sistemimize ilk defa katıldığınız için size "+str(ucretsiz_gun)+" gün kadar deneme süresi hediye edilmiştir. Bu süre boyunca API anahtarı ekliyerek ücretsiz bir şekilde VIP Grubundan gelen sinyalleri borsa hesabınızda açtırabilirsiniz. Premium üyelik süreniz "+str(pd.to_datetime(ucretsiz_sure,unit="s"))+" tarihine kadar devam edicektir. bu süreden sonra aylık abonelik ücreti ödeyerek kullanmaya devam edebilirsiniz.")
        else:
            asyncio.create_task(show_main_menu(user_id)    )

    def key_check(cmd,key):
        
        kac_key = len(key)
        
        if cmd[:kac_key] == key:
            return True 
        else:
            return False

    def key_after(cmd,key):
        kac_key = len(key)    
        return cmd[kac_key:]

    def get_username(uid):
        
        abn = fetch_row("select user_id,username,first_name,last_name from users where id = '"+str(uid)+"' or user_id = '"+str(uid)+"'")
        abn=abn[0]
        
        telegram_id = abn[0]
        telegram_name = ""
        if abn[1] != "None":
            telegram_name = abn[1]
        else:
            telegram_name = abn[2]
            if abn[3] != "None":
                telegram_name = telegram_name+" "+abn[3]   
                
        return telegram_name

    async def bakiye_bingx(user_id,hid):

        api_id = str(hid)

        cb1 = types.InlineKeyboardMarkup()
        
        apikeyz = fetch_row("select * from apikeys where id = '"+str(api_id)+"'")
        
        apz = apikeyz[0]
        
        app_key = apz[4]
        app_secret = apz[5]
        
        sign_detail = "------- Hesap Kasa Durumu --------\n"
        sign_detail+= "API_KEY : "+str(app_key)+"\n\n"
        
        try:
        

            exchange_id = 'bingx'
            exchange_class = getattr(ccxt, exchange_id)
            exchange = exchange_class({
                'apiKey': app_key,
                'secret': app_secret,
                'option': { 'defaultType': 'swap' }
                
            })        
        
            blnc = exchange.fetch_balance(params={'type': 'futures'})
            
            bln = blnc['total']
            
            
            for coin in bln:
                ty = blnc[coin]
                print("ty:",ty)
                sign_detail+= coin+" free:"+str(ty['free'])+" used:"+str(ty['used'])+"\n"
        
             
            api_dogru=1
            
        except Exception as ee:
            print("bingx exchange balance err:",ee)        
        
        sign_detail+="\n"
        
        cb1 = types.InlineKeyboardMarkup()
        buton1 = types.InlineKeyboardButton(text='ANA MENU', callback_data='anamenu')
        buton2 = types.InlineKeyboardButton(text='GERİ', callback_data='bakiyeler_bingx')
      
        cb1.add(buton1,buton2)
            
            
        (tb_send_message(user_id,sign_detail+'BINGX Api anahtarınızla ilgili güncel bakiye durumu sunulmuştur.',cb1))
        
    async def bakiye_bybit(user_id,hid):

        api_id = str(hid)

        cb1 = types.InlineKeyboardMarkup()
        
        apikeyz = fetch_row("select * from apikeys where id = '"+str(api_id)+"'")
        
        apz = apikeyz[0]
        
        app_key = apz[4]
        app_secret = apz[5]
        
        sign_detail = "------- Hesap Kasa Durumu --------\n"
        sign_detail+= "API_KEY : "+str(app_key)+"\n"
        
        try:
        

            exchange_id = 'bybit'
            exchange_class = getattr(ccxt, exchange_id)
            exchange = exchange_class({
                'apiKey': app_key,
                'secret': app_secret,
            })        
        
            blnc = exchange.fetch_balance()
            
            #print("bybit")
            #print(blnc)
            
            bln = blnc['info']['result']
        
            
            
            for sym in bln:
                
                ty = bln[sym]
                
                if float(ty['available_balance'])>0 or float(ty['used_margin'])>0 or 1:
                    sign_detail+= sym+" bekleyen:"+str(ty['available_balance'])+" işlemde:"+str(ty['used_margin'])+"\n"
            
            
            api_dogru=1
            
        except Exception as ee:
            print("bybit exchange balance err:",ee)        
        
        sign_detail+="\n"
        
        cb1 = types.InlineKeyboardMarkup()
        buton1 = types.InlineKeyboardButton(text='ANA MENU', callback_data='anamenu')
        buton2 = types.InlineKeyboardButton(text='GERİ', callback_data='bakiyeler_bingx')
      
        cb1.add(buton1,buton2)
            
            
        (tb_send_message(user_id,sign_detail+'ByBit Api anahtarınızla ilgili güncel bakiye durumu sunulmuştur.',cb1))
        
    async def bakiye_binance(user_id,hid):

        api_id = str(hid)

        cb1 = types.InlineKeyboardMarkup()
        
        apikeyz = fetch_row("select * from apikeys where id = '"+str(api_id)+"'")
        
        apz = apikeyz[0]
        
        app_key = apz[4]
        app_secret = apz[5]
        
        sign_detail = "------- Hesap Kasa Durumu --------\n"
        sign_detail+= "API_KEY : "+str(app_key)+"\n\n"
        
        try:
        

            exchange_id = 'binanceusdm'
            exchange_class = getattr(ccxt, exchange_id)
            exchange = exchange_class({
                'apiKey': app_key,
                'secret': app_secret,
            })        
        
            blnc = exchange.fetch_balance()
            
            
            '''
            
            
            {'feeTier': '0', 'canTrade': True, 'canDeposit': True, 'canWithdraw': True, 'updateTime': '0', 
            'totalInitialMargin': '0.00525424', 'totalMaintMargin': '0.00105084', 'totalWalletBalance': '0.68887647', 
            'totalUnrealizedProfit': '-0.20271447', 'totalMarginBalance': '0.48616200', 
            'totalPositionInitialMargin': '0.00525424', 'totalOpenOrderInitialMargin': '0.00000000', 
            'totalCrossWalletBalance': '0.68887647', 'totalCrossUnPnl': '-0.20271447', 'availableBalance': '0.48085277', 
            'maxWithdrawAmount': '0.48090776'
            
            '''
            
            blm = blnc['info']
            
            sign_detail+= "InitialMargin : "+str(blm['totalInitialMargin'])+"\n"
            sign_detail+= "MaintMargin : "+str(blm['totalMaintMargin'])+"\n"
            sign_detail+= "WalletBalance : "+str(blm['totalWalletBalance'])+"\n"
            sign_detail+= "UnrealizedProfit : "+str(blm['totalUnrealizedProfit'])+"\n"
            sign_detail+= "MarginBalance : "+str(blm['totalMarginBalance'])+"\n"
            sign_detail+= "PositionInitialMargin : "+str(blm['totalPositionInitialMargin'])+"\n"
            sign_detail+= "CrossWalletBalance : "+str(blm['totalCrossWalletBalance'])+"\n"
            sign_detail+= "PositionInitialMargin : "+str(blm['totalPositionInitialMargin'])+"\n"
            sign_detail+= "CrossUnPnl : "+str(blm['totalCrossUnPnl'])+"\n"
            sign_detail+= "availableBalance : "+str(blm['availableBalance'])+"\n"
            sign_detail+= "maxWithdrawAmount : "+str(blm['maxWithdrawAmount'])+"\n"
            sign_detail+= "\n"
            sign_detail+= "\n"
            
            bln = blnc['info']['assets']
        
            
            
            for ty in bln:
                
                if float(ty['walletBalance'])>0 or float(ty['unrealizedProfit'])>0 or float(ty['maintMargin'])>0:
                    sign_detail+= ty['asset']+" balance:"+str(ty['walletBalance'])+" profit:"+str(ty['unrealizedProfit'])+" margin:"+str(ty['maintMargin'])+"\n"
            
            
            api_dogru=1
            
        except Exception as ee:
            print("binance exchange balance err:",ee)        
        
        
        cb1 = types.InlineKeyboardMarkup()
        buton1 = types.InlineKeyboardButton(text='ANA MENU', callback_data='anamenu')
        buton2 = types.InlineKeyboardButton(text='GERİ', callback_data='bakiyeler_binance')
      
        cb1.add(buton1,buton2)
            
        (tb_send_message(user_id,sign_detail+'Binance Api anahtarınızla ilgili güncel bakiye durumu sunulmuştur.',cb1))
             
    async def mod_ekle(user_id):

        session_free(user_id)
        session_write(user_id,"moderator_ekle",1)
        


        cb1 = types.InlineKeyboardMarkup()
                
        buton1 = types.InlineKeyboardButton(text='ANA MENU', callback_data='anamenu')
      
        cb1.add(buton1)            
        
        (tb_send_message(user_id,"Lütfen eklemek istediğiniz moderatörün kullanıcı adını yazınız",cb1))

    async def apilerim_sil(user_id,borsa,hid):

        hesap_no = str(hid)

        cb1 = types.InlineKeyboardMarkup()
        
        ankey = types.InlineKeyboardButton(text="EVET", callback_data='api_sil_yes_'+borsa+'_'+hesap_no)
        cb1.add(ankey)
        ankey = types.InlineKeyboardButton(text="HAYIR", callback_data='hesaplar_borsa_'+borsa)
        cb1.add(ankey)
            
        (tb_send_message(user_id,hesap_no+' nolu '+borsa+' api hesabınızı silmek istediğinize emin misiniz ?', cb1))

    async def api_sil_yes(user_id,borsa,hid):

        hesap_no = str(hid)
        
        cursor = new_cursor()
        cursor.execute("delete from apikeys where id = '"+hesap_no+"'")
        
        cursor.close()
        #   ()
        
        cb1 = types.InlineKeyboardMarkup()
        
        ankey = types.InlineKeyboardButton(text="Api Anahtarlarım sayfasına geri dön", callback_data='hesaplar_borsa_'+borsa)
        cb1.add(ankey)
        ankey = types.InlineKeyboardButton(text="Ana Menüye dön", callback_data='anamenu')
        cb1.add(ankey)
            
        (tb_send_message(user_id,hesap_no+' nolu '+borsa+' borsa hesabı api anahtarınız silinmiştir.',cb1))
       
    async def mod_yonet(user_id,hid):

        hesap_no = str(hid)

        cb1 = types.InlineKeyboardMarkup()
        
        ankey = types.InlineKeyboardButton(text="EVET", callback_data='mod_sil_yes_'+hesap_no)
        cb1.add(ankey)
        ankey = types.InlineKeyboardButton(text="HAYIR", callback_data='moderatorleri_listele')
        cb1.add(ankey)
            
        (tb_send_message(user_id,hesap_no+' isimli moderatörün yetkisini almak istediğinize emin misiniz ?', cb1))

    async def mod_sil_yes(user_id,hid):

        hesap_no = str(hid)
        
        cursor = new_cursor()
        cursor.execute("update users set durum = '1' where username = '"+hesap_no+"'")
        
        cursor.close()
        #   ()
        
        cb1 = types.InlineKeyboardMarkup()
        
        ankey = types.InlineKeyboardButton(text="Moderatörler sayfasına geri dön", callback_data='moderatorleri_listele')
        cb1.add(ankey)
        ankey = types.InlineKeyboardButton(text="Ana Menüye dön", callback_data='anamenu')
        cb1.add(ankey)
            
        (tb_send_message(user_id,hesap_no+' isimli kullanıcının moderatörlük yetkileri alınmıştır.',cb1))
             
    async def moderatorleri_listele(user_id):

        cb1 = types.InlineKeyboardMarkup()
        
        anahtarlar = fetch_row("select * from users where durum='3'")
        
        for e in range(len(anahtarlar)):
            
            anaht = anahtarlar[e]
            
            hid = str(anaht[0])
            hkey = str(anaht[2])
            
            ankey = types.InlineKeyboardButton(text=hkey, callback_data='moderator_'+hkey)
            cb1.add(ankey)
            
        buton1 = types.InlineKeyboardButton(text='ANA MENU', callback_data='anamenu')
      
        cb1.add(buton1)
        
        (tb_send_message(user_id,'Bu bölümde kayıtlı moderatörleri görüntülüyebilirsiniz. Kullanıcı adının üstüne tıklayıp kullanıcıyı moderatörlük yetkisini alabilirsiniz.',cb1))
        
    async def abone_ekle(user_id):

        session_free(user_id)
        session_write(user_id,"abone_ekle",1)
        

        cb1 = types.InlineKeyboardMarkup()
                
        buton1 = types.InlineKeyboardButton(text='ANA MENU', callback_data='anamenu')
      
        cb1.add(buton1)
        
        
        (tb_send_message(user_id,"Lütfen üyeliğini yükseltmek istediğiniz abonenin kullanıcı adını giriniz.",cb1))

    async def sabone_ekle(user_id,msg):

        sessions = session_read(user_id)
        s_abone_ekle = session_value(sessions,"abone_ekle")
        s_abone_isim = session_value(sessions,"abone_isim")
        s_abone_sure = session_value(sessions,"abone_sure")
        


        acb1 = types.InlineKeyboardMarkup()
        buton1 = types.InlineKeyboardButton(text='ANA MENU', callback_data='anamenu')
        acb1.add(buton1)  


        checkid = num_rows("SELECT * FROM users where user_id = '"+msg+"' or username = '"+msg+"'")
        
        if s_abone_ekle=="1" and checkid==0 and s_abone_isim == "":

            olagan_uyeler="\n\n";
            
            hng = fetch_row("select user_id,username,first_name,last_name from users where first_name like '%"+msg+"%' or username like '%"+msg+"%'")
            
            for hh in hng:
                olagan_uyeler=olagan_uyeler+" TelegramID:"+str(hh[0])+" KullanıcıAdı:"+str(hh[1])+" İsim:"+str(hh[2])+" "+str(hh[3])+" \n";
            
            print("olagan_uyeler:",olagan_uyeler)
            
            (tb_send_message(user_id,"Aradığınız isimde bir abone bulunmamaktadır aradığınız abone olma ihtimali olan kişiler aşağıda listelenmiştir. Aradığınız abone bunlardan birisi ise o kişinin bilgilerini yazınız. Eğer kişinin kullanıcı adı yoksa telegram id sini yazınız."+olagan_uyeler,acb1))
        elif s_abone_ekle=="1" and s_abone_isim == "":
            session_write(user_id,"abone_isim",msg)
            (tb_send_message(user_id,"Lütfen aboneliğini yükseltmek istediğiniz süreyi ay olarak girin.",acb1))
        elif s_abone_ekle=="1" and s_abone_isim!="":
            session_write(user_id,"abone_sure",msg)
                
            sessions = session_read(user_id)
            s_abone_ekle = session_value(sessions,"abone_ekle")
            s_abone_isim = session_value(sessions,"abone_isim")
            s_abone_sure = session_value(sessions,"abone_sure")
            
            s_abone_isim = s_abone_isim.replace("@","")
            
            suan = int(pd.to_datetime(datetime.now()).timestamp())
            
            print("SELECT * FROM users where user_id = '"+s_abone_isim+"' or username = '"+s_abone_isim+"'");
            checkid = num_rows("SELECT * FROM users where user_id = '"+s_abone_isim+"' or username = '"+s_abone_isim+"'")
            if checkid>0:
                print("datetime.now():",suan," ",s_abone_ekle," ",s_abone_isim," ",s_abone_sure);
                abonelik = int(suan)+int(86400*int(s_abone_sure))
                cursor = new_cursor()
                cursor.execute("update users set abonelik = '"+str(abonelik)+"' where user_id = '"+s_abone_isim+"' or username = '"+s_abone_isim+"'");
                
                cursor.close()
                
                        
                acb1 = types.InlineKeyboardMarkup()
                buton1 = types.InlineKeyboardButton(text='ANA MENU', callback_data='anamenu')
                acb1.add(buton1)        

                (tb_send_message(user_id,str(s_abone_isim)+" kullanıcı adının "+str(pd.to_datetime(abonelik,unit="s"))+" tarihine kadar yükseltilmiştir",acb1))
                
                
                abn = fetch_row("select user_id,username,first_name,last_name from users where user_id = '"+s_abone_isim+"' or username = '"+s_abone_isim+"'")
                abn=abn[0]
                
                telegram_id = str(abn[0])
                telegram_name = get_username(abn[0])
                
                    
                bitis_tarih = str(pd.to_datetime(abonelik,unit="s"))
                suan_tarih = str(pd.to_datetime(suan,unit="s"))
                admin_name = get_username(user_id)
                
                   
                ccb1 = types.InlineKeyboardMarkup()
                buton1 = types.InlineKeyboardButton(text='Api Ekle', callback_data='api_ekle')
                buton2 = types.InlineKeyboardButton(text='ANA MENU', callback_data='anamenu')
                ccb1.add(buton2,buton1)        

                (tb_send_message(telegram_id,"Sayın "+telegram_name+" aboneliğiniz aktifleştirilmiştir. Aboneliğiniz "+bitis_tarih+" tarihine kadar devam edicektir. Şuandan itibaren sinyalleri almaya başlıyacaksınız. Eğer hala api anahtarı eklemediyseniz lütfen sinyalleri almak için api anahtarı ekleyiniz.",ccb1))
                
                cursor = new_cursor()
                cursor.execute("INSERT INTO `satislar` (`id`, `uyeid`, `username`, `tarih`, `sure`, `adminid`, `adminname`) VALUES (NULL, '"+telegram_id+"', '"+telegram_name+"', '"+str(suan_tarih)+"', '"+str(s_abone_sure)+"', '"+str(user_id)+"', '"+str(admin_name)+"');");
                cursor.close()
   
                dcb1 = types.InlineKeyboardMarkup()
                buton1 = types.InlineKeyboardButton(text='ANA MENU', callback_data='anamenu')
                dcb1.add(buton1)        
                
                
                admins = str(root_id).split(",")
                for ads in admins:
                    (tb_send_message(ads,""+str(admin_name)+" 1 yeni abone ekledi. Üye adı:"+telegram_name+" Üye id:"+telegram_id+" Abone Süre:"+str(s_abone_sure)+" abonelik bitiş:"+bitis_tarih+" ",dcb1))
                    
                
                
            else:
                (tb_send_message(user_id,"Böyle bir kullanıcı adı bulunmamaktadır. Lütfen tekrar deneyin"))
   
    async def uye_rapor(user_id):

        session_free(user_id)
        session_write(user_id,"uye_rapor",1)
        

        cb1 = types.InlineKeyboardMarkup()
                
        buton1 = types.InlineKeyboardButton(text='ANA MENU', callback_data='anamenu')
      
        cb1.add(buton1)
        
        
        (tb_send_message(user_id,"Rapor bilgisi almak istediğiniz üyenin adını yazın.",cb1))

    async def suye_rapor(user_id,msg):

        sessions = session_read(user_id)
        s_uye_rapor = session_value(sessions,"uye_rapor")
     

        acb1 = types.InlineKeyboardMarkup()
        buton1 = types.InlineKeyboardButton(text='ANA MENU', callback_data='anamenu')
        acb1.add(buton1)  


        checkid = num_rows("SELECT * FROM users where user_id = '"+msg+"' or username = '"+msg+"'")
        
        if s_uye_rapor=="1" and checkid==0:

            olagan_uyeler="\n\n";
            
            hng = fetch_row("select user_id,username,first_name,last_name from users where first_name like '%"+msg+"%' or username like '%"+msg+"%'")
            
            for hh in hng:
                olagan_uyeler=olagan_uyeler+" TelegramID:"+str(hh[0])+" KullanıcıAdı:"+str(hh[1])+" İsim:"+str(hh[2])+" "+str(hh[3])+" \n";
            
            print("olagan_uyeler:",olagan_uyeler)
            
            (tb_send_message(user_id,"Aradığınız isimde bir abone bulunmamaktadır aradığınız abone olma ihtimali olan kişiler aşağıda listelenmiştir. Aradığınız abone bunlardan birisi ise o kişinin bilgilerini yazınız. Eğer kişinin kullanıcı adı yoksa telegram id sini yazınız."+olagan_uyeler,acb1))
        
        elif s_uye_rapor=="1" and checkid>0:
           
            
            s_abone_isim = msg.replace("@","")
            
            suan = int(pd.to_datetime(datetime.now()).timestamp())
            
            print("SELECT * FROM users where user_id = '"+s_abone_isim+"' or username = '"+s_abone_isim+"'");
            checkid = fetch_row("SELECT * FROM users where user_id = '"+s_abone_isim+"' or username = '"+s_abone_isim+"'")
            if len(checkid)>0:
                
                u_id = checkid[0][1]
                
                print("üye api anahtarları:",suan," u_id:",u_id);
                
                apis = fetch_row("select * from apikeys where user_id = '"+str(u_id)+"'")
                
                apiler = ""
                
                for g in range(len(apis)):
                    
                    apz=apis[g]
                    
                    apiler = " ------ API ANAHTARI --------\n"
                    apiler+= "ID: "+str(apz[0])+" "
                    apiler+= "User ID: "+str(apz[1])+" "
                    apiler+= "Api Adı: "+str(apz[2])+"\n"
                    apiler+= "Borsa: "+str(apz[3])+" "
                    apiler+= "Lot Size: "+str(apz[6])+"\n"
                    apiler+= "Kaldıraç: "+str(apz[7])+" "
                    apiler+= "Durum: "+str(apz[8])+"\n"
                    apiler+= "Strateji: "+str(apz[9])+" "
                    apiler+= "Pozisyon Türü: "+str(apz[10])+"\n"
                    apiler+= "Max Emir: "+str(apz[11])+" "
                    apiler+= "Trail: "+str(apz[12])+"\n"
                    apiler+= "Global Stoploss: "+str(apz[13])+" "
                    apiler+= "Max Margin: "+str(apz[14])+"\n"
                    if str(apz[15])=="1":
                        apiler+= "İşleme Giriş Türü: SABIT TP "
                    else:
                        apiler+= "İşleme Giriş Türü: Kasa Yüzdesi "
                    apiler+= "sl kapali: "+str(apz[16])+"\n"
                    apiler+= "tp_direk_kapat: TP"+str(apz[17])+" "
                    if str(apz[18])=="0":
                        apiler+= "abonelik: standart\n"
                    else:
                        apiler+= "abonelik: "+str(pd.to_datetime(apz[18],unit="s"))+"\n"
                    tb_send_message(user_id,apiler)
                
                usignal = fetch_row("select * from user_signals where user_id = '"+str(u_id)+"' order by id desc LIMIT 5")
                
                siid=0
                for m in range(len(usignal)):
                    
                    ums = usignal[m]
                    siid=siid+1
                    nws = "------ Son İşlem "+str(siid)+" --------\n"
                    nws+= "#"+str(ums[0])+" "
                    nws+= "user_id:"+str(ums[1])+" "
                    nws+= "api_id:"+str(ums[2])+"\n"
                    nws+= "signal_id:"+str(ums[3])+" "
                    nws+= "ticket:"+str(ums[7])+" "
                    nws+= "symbol:"+str(ums[8])+" "
                    nws+= "trend:"+str(ums[9])+"\n"
                    nws+= "open:"+str(ums[10])+" "
                    nws+= "opentime:"+str(ums[11])+" "
                    nws+= "volume:"+str(ums[12])+"\n"
                    nws+= "sl:"+str(ums[14])+" "
                    nws+= "close:"+str(ums[15])+" "
                    nws+= "closetime:"+str(pd.to_datetime(ums[16]))+"\n"
                    nws+= "profit:"+str(ums[17])+" "
                    nws+= "event:"+str(ums[18])+"\n"
                    
                    tb_send_message(user_id,nws)
                    
                
            else:
                (tb_send_message(user_id,"Böyle bir kullanıcı adı bulunmamaktadır. Lütfen tekrar deneyin"))

    async def aboneler_listele(user_id):

        cb1 = types.InlineKeyboardMarkup()
        
        abone_date = time.time()
        
        abone_sql = "select * from users where abonelik>"+str(abone_date)+""
        
        print("abone_sql:",abone_sql)
        
        anahtarlar = fetch_row(abone_sql)
        
        for e in range(len(anahtarlar)):
            
            anaht = anahtarlar[e]
            
            a2 = anaht[2]
            a3 = anaht[3]
            a4 = anaht[4]
            a6 = anaht[6]
            
            if a2 == "None": a2 = ""
            if a3 == "None": a3 = ""
            if a4 == "None": a4 = ""
            if a6 == "None": a6 = ""
                
            
            hid = str(a2)
            hkey = str(a2)+" "+str(a3)+" "+str(a4)+" Bitiş:"+str(pd.to_datetime(int(a6),unit="s"))
            
            ankey = types.InlineKeyboardButton(text=hkey, callback_data='abones_'+hid)
            cb1.add(ankey)
            
        buton1 = types.InlineKeyboardButton(text='ANA MENU', callback_data='anamenu')
      
        cb1.add(buton1)
        
        (tb_send_message(user_id,'Bu bölümde kayıtlı aboneleri görüntülüyebilirsiniz. Kullanıcı adının üstüne tıklayıp kullanıcıyı aboneliğini alabilirsiniz.', cb1))
        
    async def abones(user_id,hid):

        hesap_no = str(hid)

        cb1 = types.InlineKeyboardMarkup()
        
        ankey = types.InlineKeyboardButton(text="EVET", callback_data='abonez_sil_yes_'+hesap_no)
        cb1.add(ankey)
        ankey = types.InlineKeyboardButton(text="HAYIR", callback_data='aboneler_listele')
        cb1.add(ankey)
            
        (tb_send_message(user_id,hesap_no+' isimli kullanıcının aboneliğini iptal etmek istediğinize emin misiniz ?', cb1))

    async def sinyal_ekle(user_id,gid,message):
        
        try:
            
            ks = message.text.split(" ")
            
            c_symbol = ks[1]
            c_trend = ks[2]
            c_entry1 = ks[3]
            c_entry2 = ks[4]
            c_sl = ks[5]
            c_tp1 = ks[6]
            c_tp2 = ks[7]
            c_tp3 = ks[8]
            c_tp4 = ks[9]
            c_tp5 = ks[10]
            c_tarih = str(message.date)
            c_durum = "1"
            
            cursor = new_cursor()
            curs = cursor.execute("INSERT INTO `sinyaller` (`id` ,`sinyalgrup` ,`symbol` ,`trend` ,`entry1` ,`entry2` ,`sl` ,`tp1` ,`tp2` ,`tp3`,`tp4`,`tp5`,`tarih`,`durum`) VALUES (NULL , '"+str(gid)+"' , '"+c_symbol+"', '"+c_trend+"', '"+c_entry1+"', '"+c_entry2+"', '"+c_sl+"', '"+c_tp1+"', '"+c_tp2+"', '"+c_tp3+"', '"+c_tp4+"', '"+c_tp5+"', '"+c_tarih+"', '"+c_durum+"');");
            
            cursor.close()
            #   ()
            
            
            last_id = curs.lastrowid
            
            rows = fetch_row("select id,lotsize,leverage from apikeys where 1")
           
            for row in rows:
            
                print("row:",row)
                
                s_api_id = str(row[0])
                s_signalid = str(last_id)
                s_lot = str(row[1])
                s_leverage = str(row[2])
                cursor = new_cursor();
                query = "INSERT INTO `api_signals` (`id` ,`api_id` ,`signalid` ,`start` ,`open` ,`sl` ,`close` ,`lot` ,`leverage`) VALUES (NULL , '"+s_api_id+"', '"+s_signalid+"', '0', '0', '0', '0', '"+s_lot+"', '"+s_leverage+"');"
                
                curs = cursor.execute(query);
                
                cursor.close()  
                
                #   ()
              

            cb1 = types.InlineKeyboardMarkup()
            buton1 = types.InlineKeyboardButton(text='Sinyal Ekle', callback_data='sinyal_ekle')
            buton2 = types.InlineKeyboardButton(text='Tüm Sinyaller', callback_data='sinyaller_listele')
          
            cb1.add(buton1)
            cb1.add(buton2)
                
            (tb_send_message(user_id, 'Sinyal başarı ile eklendi. Yeni bir sinyal eklemek için tıklayın', reply_markup=cb1))
            
        except:
            sinyal_ekle_form(user_id)
           
    async def tum_uyelerim(user_id):

        cb1 = types.InlineKeyboardMarkup()
        
        abone_date = time.time()
        
        abone_sql = "select * from users where 1"
        
        print("abone_sql:",abone_sql)
        
        anahtarlar = fetch_row(abone_sql)
        
        for e in range(len(anahtarlar)):
            
            anaht = anahtarlar[e]
            
            
            a1 = anaht[1]
            a2 = anaht[2]
            a3 = anaht[3]
            a4 = anaht[4]
            
            if a2 == "None" : a2 = ""
            if a3 == "None" : a3 = ""
            if a4 == "None" : a4 = ""
            
            uyedurum=""
            if anaht[9] == 1:
                uye_durum="Uye"
            elif anaht[9] == 2:
                uye_durum="Abone"
            elif anaht[9] == 3:
                uye_durum="Moderator"
            elif anaht[9] == 9:
                uye_durum="Admin"
            
            hid = str(a2)
            hkey = "#"+str(a1)+" "+str(a2)+" "+str(a3)+" "+str(a4)+" Durum:"+uye_durum
            
            ankey = types.InlineKeyboardButton(text=hkey, callback_data='abones_'+hid)
            cb1.add(ankey)
            
        buton1 = types.InlineKeyboardButton(text='ANA MENU', callback_data='anamenu')
      
        cb1.add(buton1)
        
        (tb_send_message(user_id,'Bu bölümde kayıtlı aboneleri görüntülüyebilirsiniz. Kullanıcı adının üstüne tıklayıp kullanıcıyı aboneliğini alabilirsiniz.',cb1))

    async def sinyal_ekle_form(user_id):
        #tb.answer_callback_query(call.id, "hesap_ekle")

        #tb.send_message(call.from_user.id, 'Sinyal eklemek için\n\n/sinyal_ekle PARITE TREND ENTRY1 ENTRY2 SL TP1 TP2 TP3 TP4 TP5\n\nşeklinde ekleme yapınız.')

        cb1 = types.InlineKeyboardMarkup()
        buton1 = types.InlineKeyboardButton(text='ANA MENU', callback_data='anamenu')
        buton2 = types.InlineKeyboardButton(text='GERİ', callback_data='anamenu')
      
        cb1.add(buton1,buton2)
        

        rows = fetch_row("select * from sinyalgrup where 1")
        
        s_msg = ""
        
        for row in rows:    
            
            s_msg+=row[1]+" sinyal grubuna sinya eklemek için\n/sinyal_ekle"+str(row[0])+" PARITE TREND ENTRY1 ENTRY2 SL TP1 TP2 TP3 TP4 TP5\n\n";
        
        
                
        (tb_send_message(user_id,s_msg+'\n\nşeklinde ekleme yapınız.',cb1))

    async def statistiks(user_id):
        #tb.answer_callback_query(call.id, "hesap_ekle")

        #tb.send_message(call.from_user.id, 'Sinyal eklemek için\n\n/sinyal_ekle PARITE TREND ENTRY1 ENTRY2 SL TP1 TP2 TP3 TP4 TP5\n\nşeklinde ekleme yapınız.')
        
        cb1 = types.InlineKeyboardMarkup()
        buton1 = types.InlineKeyboardButton(text='ANA MENU', callback_data='anamenu')
        buton2 = types.InlineKeyboardButton(text='GERİ', callback_data='anamenu')
      
        cb1.add(buton1,buton2)
        
        suan =int(str(time.time()).split(".")[0])
        bugun = suan - (suan % 86400)
        son7 = bugun - (86400*7)
        son30 = bugun - (86400*30)
        
        
        
        tum_uyeler = num_rows("select id from users where 1")
        tum_aboneler = num_rows("select id from users where abonelik>'"+str(suan)+"'")
        bugun_ziyaretci = num_rows("select id from users where sonislem>'"+str(bugun)+"'")
        son7_ziyaretci = num_rows("select id from users where sonislem>'"+str(son7)+"'")
        son30_ziyaretci = num_rows("select id from users where sonislem>'"+str(son30)+"'")
        
        sinyaller = num_rows("select id from sinyaller where 1")
        apikeys = num_rows("select id from apikeys where 1")
        api_signals = num_rows("select id from api_signals where 1")
        api_signals_acik = num_rows("select id from api_signals where open>0 and close=0")
        api_signals_kapanmis = num_rows("select id from api_signals where open>0 and close>0")
                  
        stats = "Tüm üyeler: "+str(tum_uyeler)+"\n";
        stats+= "Tüm Aboneler: "+str(tum_aboneler)+"\n";
        stats+= "Bugunki Ziyaretci: "+str(bugun_ziyaretci)+"\n";
        stats+= "Son 7 gün içindeki Ziyaretci: "+str(son7_ziyaretci)+"\n";
        stats+= "Son 30 gün içindeki Ziyaretci: "+str(son30_ziyaretci)+"\n";
        stats+= "Tüm Sinyaller: "+str(sinyaller)+"\n";
        stats+= "Kayıtlı API anahtarları: "+str(apikeys)+"\n";
        stats+= "Açık Sinyaller: "+str(api_signals_acik)+"\n";
        stats+= "Kapanmış Sinyaller: "+str(api_signals_kapanmis)+"\n";
                
        (tb_send_message(user_id,'Bu bölümde Bot ile ilgili tüm istatislik bilgilerine. erişebilirsiniz:\n'+stats,cb1))

    async def arkadas_davet(user_id):
        #tb.answer_callback_query(call.id, "hesap_ekle")

        #tb.send_message(call.from_user.id, 'Sinyal eklemek için\n\n/sinyal_ekle PARITE TREND ENTRY1 ENTRY2 SL TP1 TP2 TP3 TP4 TP5\n\nşeklinde ekleme yapınız.')
        
        cb1 = types.InlineKeyboardMarkup()
        buton1 = types.InlineKeyboardButton(text='ANA MENU', callback_data='anamenu')
        buton2 = types.InlineKeyboardButton(text='GERİ', callback_data='anamenu')
      
        cb1.add(buton1,buton2)
        
        send_msg = "\n";
        send_msg+= bot_url+"?start=ref-"+str(user_id)+"\n";
        send_msg+= "\n";
        send_msg+= "Yukarıdaki linkten arkadaşlarınızı bota davet edebilirsiniz.\n";
        
        
        mgk = fetch_row("select referans_komisyon from sinyalgrup where id = '1'")
        ref_komisyon = int(mgk[0][0])
        
        if (ref_komisyon>0):
            send_msg+= "Kanala davet ettiğiniz üyeler eğer kanaldan abonelik satın almaları durumunda size %"+str(ref_komisyon)+" ödemesi yapılacaktır.\n";
        
        
        refs = fetch_row("select * from referral where 1 order by tarih desc")
        
        
        
        a_send_msg =" ---- Abone olan üyeler ---- \n"
        
        abonesay=0
        say=0
        for d in range(len(refs)):
            
            rr = refs[d]
            
            ui = fetch_row("select * from users where user_id = '"+str(rr[1])+"' and abonelik>0")
            if len(ui)>0:
                a_send_msg+= "   "+uname_sql(ui[0])+"                    Tarih:"+str(pd.to_datetime(rr[3], unit="s"))+"\n"
                say=say+1
                abonesay=abonesay+1
            
            if say>50:
                              
                tb_send_message(user_id,send_msg)
                say=0
                a_send_msg =" ---- Davet Edilen Üyeler ---- \n"
                
        
        say=0
        uye_adet = len(refs)
        suan_kazanc=round((abonesay*20)*ref_komisyon/100,2)
        send_msg+="\n Şuana Kadar Getirdiğiniz Üye Sayısı : "+str(uye_adet)+"\n"
        send_msg+="Mevcut Kazancınız : "+str(suan_kazanc)+" USDT\n\n"
        
                
        tb_send_message(user_id,send_msg)
        tb_send_message(user_id,a_send_msg)
        
        send_msg =" ---- Davet Edilen Üyeler ---- \n"
        
        say=0
        for d in range(len(refs)):
            
            rr = refs[d]
            
            ui = fetch_row("select * from users where user_id = '"+str(rr[1])+"'")
            if len(ui)>0:
                send_msg+= "   "+uname_sql(ui[0])+"                    Tarih:"+str(pd.to_datetime(rr[3], unit="s"))+"\n"
                say=say+1
            
            if say>50:
                              
                tb_send_message(user_id,send_msg)
                say=0
                send_msg =" ---- Davet Edilen Üyeler ---- \n"
                
        
        
                
        tb_send_message(user_id,send_msg,reply_markup=cb1)

 
    async def uyeler_listesi_xls(user_id,abonelik=0):
    
    
        sgr = my_query("select * from sinyalgrup where 1")
        
        if len(sgr)>0:
            
            usr = my_query("select * from users where 1")
            
            tumuye=[]
            

            _user = []
            
            _user.append("Üye ID")
            _user.append("Telegram ID")
            _user.append("UserName")
            _user.append("First Name")
            _user.append("Last Name")
            _user.append("Üyelik Tarihi")
            _user.append("Abonelik Bitiş")
            _user.append("Son Giriş")
            _user.append("Durum")
            
            tumuye.append(";".join(_user))            
            
            for ui in usr:
                
                _user = []
                
                _user.append(str(ui["id"]))
                _user.append(str(ui["user_id"]))
                _user.append(str(ui["username"]))
                _user.append(str(ui["first_name"]))
                _user.append(str(ui["last_name"]))
                _user.append(str(pd.to_datetime(ui["tarih"],unit="s")))
                _user.append(str(pd.to_datetime(ui["abonelik"],unit="s")))
                _user.append(str(pd.to_datetime(ui["sonislem"],unit="s")))
                _user.append(str(ui["durum"]))
                
                tumuye.append(";".join(_user))

        cb1 = types.InlineKeyboardMarkup()
        
        uye_listesi_csv="\n".join(tumuye)
        
        
        fn_name = "files/uye_listesi_"+str(sgr[0]['telegram_id'])+"_"+str(user_id)+"_"+str(pd.to_datetime(round(time.time()),unit="s"))+".csv"
        fn_name=fn_name.replace(" ","_").replace(":","_")
        
        with open(fn_name, 'w') as f:
            f.write(uye_listesi_csv)        
        
        print("uye_listesi_csv",uye_listesi_csv)

        ankey = types.InlineKeyboardButton(text="Ana Menüye dön", callback_data='anamenu')
        cb1.add(ankey)
        await tb.send_document(chat_id=user_id,document=open(fn_name, 'rb'))
        await tb.send_message(chat_id=user_id,text="Üye listesi dosya olarak yukarıda sunulmuştur.",reply_markup=cb1)

    def str1(veri):
        veri = str(veri).replace(".",",")
        return veri
           
    async def sinyal_listesi_xls(user_id,abonelik=0):
    
    
        sgr = my_query("select * from sinyalgrup where 1")
        
        if len(sgr)>0:
            
            usr = my_query("select * from signals where 1")
            
            tumuye=[]
            

            _user = []
            
            _user.append("ID")
            #_user.append("Signal ID")
            _user.append("Symbol")
            _user.append("Trend")
            _user.append("OpenDate")
            _user.append("Open")
            _user.append("CloseDate")
            _user.append("Close")
            #_user.append("Entry1")
            #_user.append("Entry2")
            _user.append("Tp1")
            _user.append("Tp2")
            _user.append("Tp3")
            _user.append("Tp4")
            _user.append("Tp5")
            _user.append("Tp6")
            _user.append("Tp7")
            _user.append("Tp8")
            _user.append("Tp9")
            _user.append("Tp10")
            _user.append("sl")
            #_user.append("Tarih")
            #_user.append("TickDate")
            #_user.append("Bid")
            #_user.append("Ask")
            #_user.append("Stoploss")
            #_user.append("TakeProfit")
            _user.append("Profit")
            #_user.append("LastTP")
            #_user.append("LastSL")
            
            tumuye.append(";".join(_user))            
            
            for ui in usr:
                
                _user = []
                
                _user.append(str(ui["id"]))
                #_user.append(str(ui["signalid"]))
                _user.append(str(ui["symbol"]))
                _user.append(str(ui["trend"]))
                _user.append(str1(ui["opendate"]))
                _user.append(str1(ui["open"]))
                _user.append(str(ui["closedate"]))
                _user.append(str1(ui["close"]))
                #_user.append(str1(ui["entry1"]))
                #_user.append(str1(ui["entry2"]))
                #_user.append(str1(ui["sl"]))
                
                
                profit_yuzde = 0
                
                try:
                    if ui["trend"] == "LONG":
                        profit_yuzde = ((ui["close"]/ui["open"])-1)*100
                    else:
                        profit_yuzde = ((ui["open"]/ui["close"])-1)*100
                except:
                    profit_yuzde=0
                
                if ui["trend"] == "LONG":
                    
                    if ui["last_tp"]>=1:
                        _user.append("x")
                    else:
                        _user.append("")
                    if ui["last_tp"]>=2:
                        _user.append("x")
                    else:
                        _user.append("")
                    if ui["last_tp"]>=3:
                        _user.append("x")
                    else:
                        _user.append("")
                    if ui["last_tp"]>=4:
                        _user.append("x")
                    else:
                        _user.append("")
                    if ui["last_tp"]>=5:
                        _user.append("x")
                    else:
                        _user.append("")
                    if ui["last_tp"]>=6:
                        _user.append("x")
                    else:
                        _user.append("")
                    if ui["last_tp"]>=7:
                        _user.append("x")
                    else:
                        _user.append("")
                    if ui["last_tp"]>=8:
                        _user.append("x")
                    else:
                        _user.append("")
                    if ui["last_tp"]>=9:
                        _user.append("x")
                    else:
                        _user.append("")
                    if ui["last_tp"]>=10:
                        _user.append("x")
                    else:
                        _user.append("")
                    if ui["last_sl"]>=1:
                        _user.append("x")
                    else:
                        _user.append("")

                elif ui["trend"] == "SHORT":
                    
                    if ui["last_tp"]>=1:
                        _user.append("x")
                    else:
                        _user.append("")
                    if ui["last_tp"]>=2:
                        _user.append("x")
                    else:
                        _user.append("")
                    if ui["last_tp"]>=3:
                        _user.append("x")
                    else:
                        _user.append("")
                    if ui["last_tp"]>=4:
                        _user.append("x")
                    else:
                        _user.append("")
                    if ui["last_tp"]>=5:
                        _user.append("x")
                    else:
                        _user.append("")
                    if ui["last_tp"]>=6:
                        _user.append("x")
                    else:
                        _user.append("")
                    if ui["last_tp"]>=7:
                        _user.append("x")
                    else:
                        _user.append("")
                    if ui["last_tp"]>=8:
                        _user.append("x")
                    else:
                        _user.append("")
                    if ui["last_tp"]>=9:
                        _user.append("x")
                    else:
                        _user.append("")
                    if ui["last_tp"]>=10:
                        _user.append("x")
                    else:
                        _user.append("")
                    if ui["last_sl"]>=1:
                        _user.append("x")
                    else:
                        _user.append("")


                
                #_user.append(str(ui["tarih"]))
                #_user.append(str(pd.to_datetime(round(ui["tickdate"]/1000),unit="s")))
                #_user.append(str1(ui["bid"]))
                #_user.append(str1(ui["ask"]))
                #_user.append(str1(ui["stoploss"]))
                #_user.append(str1(ui["takeprofit"]))
                _user.append(str1(round(profit_yuzde,3)))
                #_user.append(str1(ui["last_tp"]))
                #_user.append(str1(ui["last_sl"]))
                
                tumuye.append(";".join(_user))

        cb1 = types.InlineKeyboardMarkup()
        
        uye_listesi_csv="\n".join(tumuye)
        
        
        fn_name = "files/sinyal_listesi_"+str(sgr[0]['telegram_id'])+"_"+str(user_id)+"_"+str(pd.to_datetime(round(time.time()),unit="s"))+".csv"
        fn_name=fn_name.replace(" ","_").replace(":","_")
        
        fn_name_xls = "files/sinyal_listesi_"+str(sgr[0]['telegram_id'])+"_"+str(user_id)+"_"+str(pd.to_datetime(round(time.time()),unit="s"))+".xlsx"
        fn_name_xls=fn_name_xls.replace(" ","_").replace(":","_")
        
        with open(fn_name, 'w') as f:
            f.write(uye_listesi_csv)        
            
        ankey = types.InlineKeyboardButton(text="Ana Menüye dön", callback_data='anamenu')
        cb1.add(ankey)
        await tb.send_document(chat_id=user_id,document=open(fn_name, 'rb'))
        await tb.send_message(chat_id=user_id,text="Sinyal listesi dosya olarak yukarıda sunulmuştur.",reply_markup=cb1)
          

    async def toplu_mesaj(user_id):
        #tb.answer_callback_query(call.id, "hesap_ekle")

        #tb.send_message(call.from_user.id, 'Sinyal eklemek için\n\n/sinyal_ekle PARITE TREND ENTRY1 ENTRY2 SL TP1 TP2 TP3 TP4 TP5\n\nşeklinde ekleme yapınız.')
         
        await delete_all_msg_id(user_id)

        session_free(user_id)
        session_write(user_id,"toplu_msj",1)

        cb1 = types.InlineKeyboardMarkup()
        buton1 = types.InlineKeyboardButton(text='ANA MENU', callback_data='anamenu')
        buton2 = types.InlineKeyboardButton(text='GERİ', callback_data='anamenu')
      
        cb1.add(buton1,buton2)
                  
                
        (tb_send_message(user_id,'Bu bölümde bottaki tüm üyelere toplu mesaj gönderebilirsiniz. Mesajı yazınız ardında ikinci sayfada onay formunu da onayladıktan sonra yazdnız mesaj tüm üyelere iletilecektir.',cb1))
       
    async def toplu_msj_yeni(user_id,msj):
        #tb.answer_callback_query(call.id, "hesap_ekle")

        #tb.send_message(call.from_user.id, 'Sinyal eklemek için\n\n/sinyal_ekle PARITE TREND ENTRY1 ENTRY2 SL TP1 TP2 TP3 TP4 TP5\n\nşeklinde ekleme yapınız.')
        await delete_all_msg_id(user_id)
        
        msj=msj.replace("'","\'").replace("\"","\\\"")

        cb1 = types.InlineKeyboardMarkup()
        buton1 = types.InlineKeyboardButton(text='ONAYLA', callback_data='toplu_msj_onayla')
        buton2 = types.InlineKeyboardButton(text='GERİ', callback_data='anamenu')
      
        cb1.add(buton1,buton2)
      
        sendd_msg = 'Aşağıda yazdığınız mesaj tüm üyelere iletilecektir Onaylıyor musunuz ?\n\nYeni Giriş Mesajı:'+msj
        
        (tb_send_message(user_id,sendd_msg,cb1))
        
        
        
        session_write(user_id,"yeni_toplu_msj",msj)
       
    async def toplu_msj_onayla(user_id):
        #tb.answer_callback_query(call.id, "hesap_ekle")

        #tb.send_message(call.from_user.id, 'Sinyal eklemek için\n\n/sinyal_ekle PARITE TREND ENTRY1 ENTRY2 SL TP1 TP2 TP3 TP4 TP5\n\nşeklinde ekleme yapınız.')
        
        await delete_all_msg_id(user_id)
        
        sessions = session_read(user_id)
        s_toplu_msj = session_value(sessions,"yeni_toplu_msj")

        uswrs=""
 
        lmi = my_query("select * from users where 1")
            
        for usw in lmi:
        
            us_id = usw['user_id']
            
            bu_usr="mesaj gönderildi #"+str(usw['id'])+" UID:"+str(usw['user_id'])+" "+str(usw['username'])+" "+str(usw['first_name'])+" "+str(usw['last_name'])
       
            my_query("INSERT INTO `bildirimler` (`id`, `user_id`, `msg`, `gonderim`) VALUES ('', '"+str(us_id)+"', '"+str(s_toplu_msj)+"', 0);")
            tb_send_message(user_id, bu_usr)
             
            bu_usr=bu_usr+" OK\n"
            
            print("send_msg:",bu_usr)
            uswrs+=bu_usr
             
            # time.sleep(0.5)


        cb1 = types.InlineKeyboardMarkup()
        
        buton2 = types.InlineKeyboardButton(text='AnaMenü', callback_data='anamenu')
      
        cb1.add(buton2)
            
              
                
        (tb_send_message(user_id,'Yazdğınız mesajlar aşağıda üyelere gönderilmiştir.\n Gönderilen Üyeler:\n'+uswrs,cb1))
       
        session_free(user_id)


    async def giris_mesaji_duzen(user_id):
        #tb.answer_callback_query(call.id, "hesap_ekle")

        #tb.send_message(call.from_user.id, 'Sinyal eklemek için\n\n/sinyal_ekle PARITE TREND ENTRY1 ENTRY2 SL TP1 TP2 TP3 TP4 TP5\n\nşeklinde ekleme yapınız.')
        
        await delete_all_msg_id(user_id)

        session_free(user_id)
        session_write(user_id,"giris_msj_ekle",1)

        cb1 = types.InlineKeyboardMarkup()
        buton1 = types.InlineKeyboardButton(text='ANA MENU', callback_data='anamenu')
        buton2 = types.InlineKeyboardButton(text='GERİ', callback_data='anamenu')
      
        cb1.add(buton1,buton2)
            

        ga = fetch_row("select * from genel_ayarlar where 1")
        aroot_id = ga[0][2]
        giris_msg = ga[0][1]        
                
        (tb_send_message(user_id,'Bu bölümde botun başladığında açılış sayfasındaki mesaj güncelliyebilirsiniz. Yeni giriş mesajı yazınız ardından onay sayfasına yönlendirileceksiniz.\n\nÖnceki Giriş Mesajı:\n'+giris_msg,cb1))
       
    async def giris_mesaji_yeni(user_id,msj):
        #tb.answer_callback_query(call.id, "hesap_ekle")

        #tb.send_message(call.from_user.id, 'Sinyal eklemek için\n\n/sinyal_ekle PARITE TREND ENTRY1 ENTRY2 SL TP1 TP2 TP3 TP4 TP5\n\nşeklinde ekleme yapınız.')
        await delete_all_msg_id(user_id)
        

        cb1 = types.InlineKeyboardMarkup()
        buton1 = types.InlineKeyboardButton(text='ONAYLA', callback_data='giris_msj_onayla')
        buton2 = types.InlineKeyboardButton(text='GERİ', callback_data='anamenu')
      
        cb1.add(buton1,buton2)
            
        ga = fetch_row("select * from genel_ayarlar where 1")
        aroot_id = ga[0][2]
        giris_msg = str(ga[0][1])
        msj = str(msj).strip()
                
        sendd_msg = 'Yeni yazdığınız giriş mesajını onaylıyor musunuz.\n\nYeni Giriş Mesajı:'+msj+'\n\nÖnceki Giriş Mesajı: '+giris_msg
        
        (tb_send_message(user_id,sendd_msg,cb1))
        
        session_write(user_id,"yeni_giris_msj",msj)
       
    async def giris_msj_onayla(user_id):
        #tb.answer_callback_query(call.id, "hesap_ekle")

        #tb.send_message(call.from_user.id, 'Sinyal eklemek için\n\n/sinyal_ekle PARITE TREND ENTRY1 ENTRY2 SL TP1 TP2 TP3 TP4 TP5\n\nşeklinde ekleme yapınız.')
        
        await delete_all_msg_id(user_id)
        
        sessions = session_read(user_id)
        s_giris_msj = session_value(sessions,"yeni_giris_msj")

        cb1 = types.InlineKeyboardMarkup()
        
        buton2 = types.InlineKeyboardButton(text='GERİ', callback_data='anamenu')
      
        cb1.add(buton2)
        
        cursor = new_cursor()
        cursor.execute("update genel_ayarlar set acilis_mesaji = '"+s_giris_msj+"' where id = '1'");
        
        cursor.close()
        
        #   ()
              
                
        (tb_send_message(user_id,'Yeni yazdığınız giriş mesajını onaylanmıştır.',cb1))
       
        session_free(user_id)
       
    async def show_main_menu(user_id,go_menu=0):
        
        session_free(user_id)
        generate_user_dict(user_id)
        
        
        u_data = fetch_row("select first_name,durum,abonelik from users where user_id = '"+str(user_id)+"'")
        
        uye_durumu="Üye Durumu: Normal Üye"
        suan = float(pd.to_datetime(datetime.now()).timestamp())
        abone_mi=0
        if len(u_data)>0:
            uu = u_data[0]
            first_name = uu[0]
            is_admin = uu[1]
            abonetrh = float(uu[2])
            
            if abonetrh>suan:
                uye_durumu="Üye Durumu: Premium Üye\nAbonelik Bitiş:"+str(pd.to_datetime(uu[2],unit="s"))
                abone_mi=1
        else:
            
            first_name = "Ziyaretci"
            is_admin = 1
        
        start_keyboard = types.InlineKeyboardMarkup()
        #start_keyboard = types.ReplyKeyboardRemove()
        
        is_mod = num_rows("select id from users where user_id = '"+str(user_id)+"' and durum = '3'")
        buton1 = types.InlineKeyboardButton(text='API Ekle', callback_data='api_ekle')
        buton1a = types.InlineKeyboardButton(text='API hesaplarım', callback_data='hesaplar')
        emir_acma = types.InlineKeyboardButton(text='Api İşlem Ayarları', callback_data='emir_ayarlari')
        
        start_keyboard.add(buton1,buton1a)
        start_keyboard.add(emir_acma)
        

        
        buton2 = types.InlineKeyboardButton(text='Bakiye Sorgulama', callback_data='bakiye_sorgula')
        buton3 = types.InlineKeyboardButton(text='Geçmiş İşlemler', callback_data='gecmis_islemler')
        
        start_keyboard.add(buton2,buton3)        
        
        '''
        if is_admin>8:
            
            sbuton1 = types.InlineKeyboardButton(text='Sinyal Grupları', callback_data='sinyal_grup')
            sbuton1a = types.InlineKeyboardButton(text='Sinyal Gruplarını Yönet', callback_data='grup_yonet')
            start_keyboard.add(sbuton1,sbuton1a)
        
        else:
            
            buton1 = types.InlineKeyboardButton(text='Sinyal Grupları', callback_data='sinyal_grup')
            start_keyboard.add(buton1)
        '''
        
        
        if is_admin>8:
        
        
            kanal_ayar = types.InlineKeyboardButton(text='Kanal Ayarları', callback_data='kanal_ayarlama')
            
            start_keyboard.add(kanal_ayar)
        '''
            odeme1 = types.InlineKeyboardButton(text='Ödemelerim', callback_data='odeme_kontrolu')
            odeme2 = types.InlineKeyboardButton(text='Ücretlendirmeleri Yönet', callback_data='odeme_yonetimi')
            start_keyboard.add(odeme1,odeme2)        
        else:
            odeme1 = types.InlineKeyboardButton(text='Ödemelerim', callback_data='odeme_kontrolu')
            start_keyboard.add(odeme1)
        '''   
        
        
        if is_admin>8:
            mods1 = types.InlineKeyboardButton(text='Moderator Ekle', callback_data='mod_ekle')
            mods2 = types.InlineKeyboardButton(text='Moderatorler', callback_data='moderatorleri_listele')
            start_keyboard.add(mods1,mods2)
            
            
        if is_admin>8 or is_admin>2:
            mods1 = types.InlineKeyboardButton(text='Abone Ekle', callback_data='abone_ekle')
            mods2 = types.InlineKeyboardButton(text='Aboneler', callback_data='aboneler_listele')
            hata_ayikla = types.InlineKeyboardButton(text='Üye Hata Ayıklama', callback_data='uye_rapor')
            start_keyboard.add(mods1,mods2,hata_ayikla)
            
        if is_admin>8 or is_admin>2:
            sinyal1 = types.InlineKeyboardButton(text='Sinyal Ekle', callback_data='sinyal_ekle')
            sinyal2 = types.InlineKeyboardButton(text='Sinyaller', callback_data='sinyaller_listele')
            start_keyboard.add(sinyal1,sinyal2)
        elif abone_mi>0:
            sinyal2 = types.InlineKeyboardButton(text='Sinyaller', callback_data='sinyaller_listele')
            start_keyboard.add(sinyal2)


        ga = fetch_row("select * from genel_ayarlar where 1")
        
        genel_ayarlar = ga[0][1]
        
        if str(root_id).find(str(user_id))>-1:   
            tumuyeler = types.InlineKeyboardButton(text='Tüm Üyeler', callback_data='tum_uyeler_listele')
            start_keyboard.add(tumuyeler)

            vip_kanal = types.InlineKeyboardButton(text='VIP Kanalda Olmayan Üyeler', callback_data='vip_kanal')
            start_keyboard.add(vip_kanal)
        
            uyeler_listesixls = types.InlineKeyboardButton(text='Üye Listesi indir', callback_data='uyeler_listesi_xls')
            sinyal_listesixls = types.InlineKeyboardButton(text='Sinyal Listesi indir', callback_data='sinyal_listesi_xls')
            start_keyboard.add(uyeler_listesixls,sinyal_listesixls)
        

        
        if str(root_id).find(str(user_id))>-1:   
            tumuyeler = types.InlineKeyboardButton(text='Giriş Mesajı Düzenle', callback_data='giris_mesaji_duzen')
            start_keyboard.add(tumuyeler)

        if str(root_id).find(str(user_id))>-1:   
            tumuyeler = types.InlineKeyboardButton(text='Toplu Mesaj', callback_data='toplu_mesaj')
            start_keyboard.add(tumuyeler)

        if str(root_id).find(str(user_id))>-1:   
            tumuyeler = types.InlineKeyboardButton(text='İstatislikler', callback_data='statistiks')
            start_keyboard.add(tumuyeler)

        davet_et = types.InlineKeyboardButton(text='Arkadaşını Davet Et', callback_data='arkadas_davet')
        start_keyboard.add(davet_et)
            
        sonislem=str(time.time()).split(".")[0]
        
        cursor = new_cursor()
        cursor.execute("update users set sonislem = '"+sonislem+"' where user_id = '"+str(user_id)+"'");
        
        cursor.close()
        
        genel_ayarlar = genel_ayarlar+"\n"+uye_durumu
        
        if go_menu==1:
            
            (tb_send_message(user_id, 'Merhaba '+first_name+', '+genel_ayarlar,start_keyboard))
            await asyncio.sleep(1)
            await api_ekle_1(user_id)
        else:
            (tb_send_message(user_id, 'Merhaba '+first_name+', '+genel_ayarlar,start_keyboard))
            
    

    @tb.callback_query_handler(func=lambda call: True)
    async def callback_query(call):
        
        
        
        user_id = str(call.from_user.id)
        msg_id = call.message.message_id
        msg_date = call.message.date
        msg = call.message.text
        command = call.data
        generate_user_dict(user_id)

        if development_mode == 1:
            if user_id != "5118957445":
                (tb_send_message(user_id,"Lütfen Bekleyin güncelleme yapılıyor."))
                print(user_id," - invalid access - ",command);
                return;


        add_msg_id(user_id,"cmd",msg_id,command)
        u_msg_id = last_msg_id(user_id)
        #print("last_msg_id:",u_msg_id);
        print("callback_query("+user_id+"): #",msg_id," ",msg_date," ",command)
        #print("callback_query("+user_id+"):",call,"\n")
        
        trade_log(0,"callback_query(",user_id,"): #",msg_id," ",msg_date," ",command);
        
        sessions = session_read(user_id)
        s_ekle_binance = session_value(sessions,"binance_api")
        s_ekle_bingx = session_value(sessions,"bingx_api")
        s_ekle_bybit = session_value(sessions,"bybit_api")
        
        s_update_binance = session_value(sessions,"binance_update_api")
        s_update_bingx = session_value(sessions,"bingx_update_api")
        s_update_bybit = session_value(sessions,"bybit_update_api")
        
        s_eid_binance = session_value(sessions,"binance_update_eid")
        s_eid_bingx = session_value(sessions,"bingx_update_eid")
        s_eid_bybit = session_value(sessions,"bybit_update_eid")
        
        s_grup_form = session_value(sessions,"grup_form")
        
        s_abone_ekle = session_value(sessions,"abone_ekle")
        

        s_emri_duzen_api_tp1 = session_value(sessions,"emri_duzen_api_tp1")
        s_emri_duzen_api_tp2 = session_value(sessions,"emri_duzen_api_tp2")
        s_emri_duzen_api_tp3 = session_value(sessions,"emri_duzen_api_tp3")
        s_emri_duzen_api_tp4 = session_value(sessions,"emri_duzen_api_tp4")
        s_emri_duzen_api_tp5 = session_value(sessions,"emri_duzen_api_tp5")
        s_emri_duzen_api_tp6 = session_value(sessions,"emri_duzen_api_tp6")
        s_emri_duzen_api_tp7 = session_value(sessions,"emri_duzen_api_tp7")
        s_emri_duzen_api_tp8 = session_value(sessions,"emri_duzen_api_tp8")
        s_emri_duzen_api_tp9 = session_value(sessions,"emri_duzen_api_tp9")
        s_emri_duzen_api_tp10 = session_value(sessions,"emri_duzen_api_tp10")
        
        s_emri_duzen_api_maxemir = session_value(sessions,"emri_duzen_api_maxemir")
        s_emri_duzen_api_stoploss = session_value(sessions,"emri_duzen_api_stoploss")
        s_emri_duzen_api_takeprofit = session_value(sessions,"emri_duzen_api_takeprofit")
        s_emri_duzen_api_trailstop = session_value(sessions,"emri_duzen_api_trailstop")
        s_emri_duzen_api_trailstep = session_value(sessions,"emri_duzen_api_trailstep")
        s_emri_duzen_api_maliyetinecek = session_value(sessions,"emri_duzen_api_maliyetinecek")
        
        
        s_emri_duzen_api_sltpemir = session_value(sessions,"emri_duzen_api_sltpemir")
        s_emri_duzen_api_strateji = session_value(sessions,"emri_duzen_api_strateji")
        s_emri_duzen_api_margin = session_value(sessions,"emri_duzen_api_margin")
        s_emri_duzen_api_durum = session_value(sessions,"emri_duzen_api_durum")
        s_emri_duzen_api_isleme_giris = session_value(sessions,"emri_duzen_api_isleme_giris")
                
        
        if command == "giris_msj_onayla":
            giris_msj_onayla(user_id)
        elif command == "anamenu":
            asyncio.create_task(show_main_menu(user_id))
        elif command == "arkadas_davet":
            asyncio.create_task(arkadas_davet(user_id))
        elif command == "abone_ekle":
            asyncio.create_task(abone_ekle(user_id))
        elif command == "hesaplar":
            asyncio.create_task(hesaplarim(user_id))
        elif command == "statistiks":
            asyncio.create_task(statistiks(user_id))
        elif command == "toplu_mesaj":
            asyncio.create_task(toplu_mesaj(user_id))
        elif command == "uye_rapor":
            asyncio.create_task(uye_rapor(user_id))
        elif command == "grup_yonet":
            asyncio.create_task(grup_yonet(user_id))
        elif command == "sinyal_grup":
            asyncio.create_task(sinyal_grup(user_id))
        elif key_check(command,"sinyal_grup_borsa_"):
            asyncio.create_task(sinyal_grup_borsa(user_id,key_after(command,"sinyal_grup_borsa_")))
        elif command == "sgrup_ekle":
            asyncio.create_task(sgrup_ekle(user_id,command))
        elif s_grup_form=="1":
            asyncio.create_task(sgrup_ekle(user_id,command)         )
        elif command == "sgrup_listele_admin":
            asyncio.create_task(sgrup_listele_admin(user_id))
        elif command == "sgrup_aktif_pasif":
            asyncio.create_task(sgrup_aktif_pasif(user_id))
        elif key_check(command,"sinyala_grup_aktif_"):
            asyncio.create_task(sinyala_grup_aktif(user_id,key_after(command,"sinyala_grup_aktif_")))
        elif key_check(command,"emir_duzen_"):
            mcr = key_after(command,"emir_duzen_").split("_")
            asyncio.create_task(emir_duzenle(user_id,mcr[0],mcr[1])        )
        
        
        elif command == "admin_deneme_suresi":
            asyncio.create_task(admin_deneme_suresi(user_id))
        
        elif command == "admin_kar_grafik_goster":
            asyncio.create_task(admin_kar_grafik_goster(user_id))
        
        elif command == "admin_ucretsiz_kanal":
            asyncio.create_task(admin_ucretsiz_kanal(user_id))
        
        elif command == "admin_referans_komisyon":
            asyncio.create_task(admin_referans_komisyon(user_id))
        
        elif command == "admin_max_api_ucret":
            asyncio.create_task(admin_max_api_ucret(user_id))
        
        elif command == "admin_max_api":
            asyncio.create_task(admin_max_api(user_id))
        
        
        elif key_check(command,"emri_duzen_api_lot_"):
            mcr = key_after(command,"emri_duzen_api_lot_").split("_")
            asyncio.create_task(emri_duzen_api_lot(user_id,mcr[0],mcr[1]))
        elif key_check(command,"emri_duzen_api_kaldirac_"):
            mcr = key_after(command,"emri_duzen_api_kaldirac_").split("_")
            asyncio.create_task(emri_duzen_api_kaldirac(user_id,mcr[0],mcr[1]))
        elif key_check(command,"emri_duzen_api_tp2"):
            mcr = key_after(command,"emri_duzen_api_tp2_").split("_")
            asyncio.create_task(emri_duzen_api_tp2(user_id,mcr[0],mcr[1]))
        elif key_check(command,"emri_duzen_api_tp3"):
            mcr = key_after(command,"emri_duzen_api_tp3_").split("_")
            asyncio.create_task(emri_duzen_api_tp3(user_id,mcr[0],mcr[1]))
        elif key_check(command,"emri_duzen_api_tp4"):
            mcr = key_after(command,"emri_duzen_api_tp4_").split("_")
            asyncio.create_task(emri_duzen_api_tp4(user_id,mcr[0],mcr[1]))
        
        elif key_check(command,"emri_duzen_api_tp5"):
            mcr = key_after(command,"emri_duzen_api_tp5_").split("_")
            asyncio.create_task(emri_duzen_api_tp5(user_id,mcr[0],mcr[1]))
        elif key_check(command,"emri_duzen_api_tp6"):
            mcr = key_after(command,"emri_duzen_api_tp6_").split("_")
            asyncio.create_task(emri_duzen_api_tp6(user_id,mcr[0],mcr[1]))
        elif key_check(command,"emri_duzen_api_tp7"):
            mcr = key_after(command,"emri_duzen_api_tp7_").split("_")
            asyncio.create_task(emri_duzen_api_tp7(user_id,mcr[0],mcr[1]))
        elif key_check(command,"emri_duzen_api_tp8"):
            mcr = key_after(command,"emri_duzen_api_tp8_").split("_")
            asyncio.create_task(emri_duzen_api_tp8(user_id,mcr[0],mcr[1]))
        elif key_check(command,"emri_duzen_api_tp9"):
            mcr = key_after(command,"emri_duzen_api_tp9_").split("_")
            asyncio.create_task(emri_duzen_api_tp9(user_id,mcr[0],mcr[1]))
        elif key_check(command,"emri_duzen_api_tp10"):
            mcr = key_after(command,"emri_duzen_api_tp10_").split("_")
            asyncio.create_task(emri_duzen_api_tp10(user_id,mcr[0],mcr[1]))
        elif key_check(command,"emri_duzen_api_tp1"):
            mcr = key_after(command,"emri_duzen_api_tp1_").split("_")
            asyncio.create_task(emri_duzen_api_tp1(user_id,mcr[0],mcr[1]))
        elif key_check(command,"emri_duzen_api_stoploss"):
            mcr = key_after(command,"emri_duzen_api_stoploss_").split("_")
            asyncio.create_task(emri_duzen_api_stoploss(user_id,mcr[0],mcr[1]))
        elif key_check(command,"emri_duzen_api_takeprofit"):
            mcr = key_after(command,"emri_duzen_api_takeprofit_").split("_")
            asyncio.create_task(emri_duzen_api_takeprofit(user_id,mcr[0],mcr[1]))
        elif key_check(command,"emri_duzen_api_trailstop"):
            mcr = key_after(command,"emri_duzen_api_trailstop_").split("_")
            asyncio.create_task(emri_duzen_api_trailstop(user_id,mcr[0],mcr[1]))
        elif key_check(command,"emri_duzen_api_trailstep"):
            mcr = key_after(command,"emri_duzen_api_trailstep_").split("_")
            asyncio.create_task(emri_duzen_api_trailstep(user_id,mcr[0],mcr[1]))
        elif key_check(command,"emri_duzen_api_maliyetinecek"):
            mcr = key_after(command,"emri_duzen_api_maliyetinecek_").split("_")
            asyncio.create_task(emri_duzen_api_maliyetinecek(user_id,mcr[0],mcr[1]))
        elif key_check(command,"emri_duzen_api_maxemir"):
            mcr = key_after(command,"emri_duzen_api_maxemir_").split("_")
            asyncio.create_task(emri_duzen_api_maxemir(user_id,mcr[0],mcr[1]))

        elif key_check(command,"emri_duzen_api_maxmargin_"):
            mcr = key_after(command,"emri_duzen_api_maxmargin_").split("_")
            asyncio.create_task(emri_duzen_api_maxmargin(user_id,mcr[0],mcr[1]))
        elif key_check(command,"emri_duzen_api_gstoploss_"):
            mcr = key_after(command,"emri_duzen_api_gstoploss_").split("_")
            asyncio.create_task(emri_duzen_api_gstoploss(user_id,mcr[0],mcr[1]))
        elif key_check(command,"emri_duzen_api_margin_"):
            mcr = key_after(command,"emri_duzen_api_margin_").split("_")
            asyncio.create_task(emri_duzen_api_margin(user_id,mcr[0],mcr[1]))
        elif key_check(command,"emri_duzen_api_sltpemir_"):
            mcr = key_after(command,"emri_duzen_api_sltpemir_").split("_")
            asyncio.create_task(emri_duzen_api_sltpemir(user_id,mcr[0],mcr[1]))
        elif key_check(command,"emri_duzen_api_sabit_tp"):
            mcr = key_after(command,"emri_duzen_api_sabit_tp_").split("_")
            asyncio.create_task(emri_duzen_api_sabit_tp(user_id,mcr[0],mcr[1]))
        elif key_check(command,"emri_duzen_api_maxemir_"):
            mcr = key_after(command,"emri_duzen_api_maxemir_").split("_")
            asyncio.create_task(emri_duzen_api_maxemir(user_id,mcr[0],mcr[1]))
        elif key_check(command,"emri_duzen_api_trail_"):
            mcr = key_after(command,"emri_duzen_api_trail_").split("_")
            asyncio.create_task(emri_duzen_api_trail(user_id,mcr[0],mcr[1]))
        elif key_check(command,"emri_duzen_api_margin_"):
            mcr = key_after(command,"emri_duzen_api_margin_").split("_")
            asyncio.create_task(emri_duzen_api_margin(user_id,mcr[0],mcr[1]))
        elif key_check(command,"emri_duzen_api_durum_"):
            mcr = key_after(command,"emri_duzen_api_durum_").split("_")
            asyncio.create_task(emri_duzen_api_durum(user_id,mcr[0],mcr[1]))
        elif key_check(command,"emri_duzen_api_isleme_giris_"):
            mcr = key_after(command,"emri_duzen_api_isleme_giris_").split("_")
            asyncio.create_task(emri_duzen_api_isleme_giris(user_id,mcr[0],mcr[1]))
        elif s_emri_duzen_api_strateji != "":
            asyncio.create_task(emri_duzen_api_strateji_update(user_id,s_emri_duzen_api_strateji,command)  )
        elif s_emri_duzen_api_margin != "":
            asyncio.create_task(emri_duzen_api_margin_update(user_id,s_emri_duzen_api_margin,command)  )
        elif s_emri_duzen_api_durum != "":
            asyncio.create_task(emri_duzen_api_durum_update(user_id,s_emri_duzen_api_durum,command)  )
        elif s_emri_duzen_api_sltpemir != "":
            asyncio.create_task(emri_duzen_api_sltpemir_update(user_id,s_emri_duzen_api_sltpemir,command)  )
        elif s_emri_duzen_api_isleme_giris != "":
            asyncio.create_task(emri_duzen_api_isleme_giris_update(user_id,s_emri_duzen_api_isleme_giris,command)  )
            
            
            
            
        elif key_check(command,"sinyal_grup_sil_"):
            asyncio.create_task(sinyal_grup_sil(user_id,key_after(command,"sinyal_grup_sil_")))
        elif key_check(command,"sinyal_grup_duzen_"):
            mcr = key_after(command,"sinyal_grup_duzen_").split("_")
            asyncio.create_task(sinyal_grup_duzen(user_id,mcr[1]))
        elif key_check(command,"api_grup_guncelle_"):
            asyncio.create_task(api_grup_guncelle(user_id,key_after(command,"api_grup_guncelle_")))
        elif command == "aboneler_listele":
            asyncio.create_task(aboneler_listele(user_id))
        elif command == "vip_kanal":
            asyncio.create_task(vip_kanal(user_id))
        elif command == "uyeler_listesi_xls":
            asyncio.create_task(uyeler_listesi_xls(user_id))   
        elif command == "sinyal_listesi_xls":
            asyncio.create_task(sinyal_listesi_xls(user_id))

        elif command == "emir_ayarlari":
            asyncio.create_task(emir_ayar(user_id))
        elif command == "kanal_ayarlama":
            asyncio.create_task(kanal_ayarlama(user_id))
        elif command == "odeme_kontrolu":
            asyncio.create_task(odeme_kontrolu(user_id))
        elif command == "odeme_yonetimi":
            asyncio.create_task(odeme_yonetimi(user_id))
        elif command == "abone_paket_ekle":
            asyncio.create_task(abone_paket_ekle(user_id))
        elif key_check(command,"abone_sil_paket_"):
            asyncio.create_task(abone_sil_paket(user_id,key_after(command,"abone_sil_paket_"))        )
        elif command == "abone_paket_listele":
            asyncio.create_task(abone_paket_listele(user_id))
        elif command == "bakiye_sorgula":
            asyncio.create_task(bakiye_sorgula(user_id))
        elif key_check(command,"bakiyeler_"):
            asyncio.create_task(bakiyeler(user_id,key_after(command,"bakiyeler_"))        )
        elif key_check(command,"abones_"):
            asyncio.create_task(abones(user_id,key_after(command,"abones_"))        )
        elif key_check(command,"abonez_sil_yes_"):
            asyncio.create_task(abonez_sil_yes(user_id,key_after(command,"abonez_sil_yes_"))        )
        elif key_check(command,"bakiye_"):
            mcr = key_after(command,"bakiye_").split("_")
            if mcr[0] == "binance":
                asyncio.create_task(bakiye_binance(user_id,mcr[1]))
            elif mcr[0] == "bingx":
                asyncio.create_task(bakiye_bingx(user_id,mcr[1]))
            elif mcr[0] == "bybit":
                asyncio.create_task(bakiye_bybit(user_id,mcr[1]))
        elif command == "gecmis_islemler":
            asyncio.create_task(gecmis_islemler(user_id))
        elif command == "sinyal_ekle":
            asyncio.create_task(sinyal_ekle_form(user_id))
        elif key_check(command,"kar_grafik_kanal_"):
            mcr = key_after(command,"kar_grafik_kanal_").split("_")
            asyncio.create_task(kar_grafik_kanal(user_id,mcr[0]))
        elif key_check(command,"kar_grafik_user_"):
            mcr = key_after(command,"kar_grafik_user_").split("_")
            asyncio.create_task(kar_grafik_user(user_id,mcr[0],mcr[1]))
        elif key_check(command,"sinyaller_detay_"):
            mcr = key_after(command,"sinyaller_detay_").split("_")
            asyncio.create_task(sinyaller_detay(user_id,mcr[0],mcr[1]))
            
        elif key_check(command,"sinyaller_listele_"):
            print("sinyaller_listele_pages")
            asyncio.create_task(sinyaller_listele(user_id,int(key_after(command,"sinyaller_listele_"))))
            
        elif command == "sinyaller_listele":
            print("sinyaller_listele")
            asyncio.create_task(sinyaller_listele(user_id))
        elif command == "tum_uyeler_listele":
            asyncio.create_task(tum_uyelerim(user_id))
        elif command == "odeme_yapilmismi":
            asyncio.create_task(odeme_yapilmismi(user_id))
        elif command == "giris_mesaji_duzen":
            asyncio.create_task(giris_mesaji_duzen(user_id))
        elif command == "toplu_msg":
            asyncio.create_task(toplu_msg(user_id))
        elif command == "toplu_msj_onayla":
            asyncio.create_task(toplu_msj_onayla(user_id))
        elif command == "mod_ekle":
            asyncio.create_task(mod_ekle(user_id))
        elif key_check(command,"moderator_"):
            asyncio.create_task(mod_yonet(user_id,key_after(command,"moderator_")))
        elif key_check(command,"mod_sil_yes_"):
            asyncio.create_task(mod_sil_yes(user_id,key_after(command,"mod_sil_yes_")))
        elif command == "moderatorleri_listele":
            asyncio.create_task(moderatorleri_listele(user_id))
        elif key_check(command,"gecmisler_"):
            asyncio.create_task(gecmisler(user_id,key_after(command,"gecmisler_")))
        elif key_check(command,"gecmis_trades_"):
            mcr = key_after(command,"gecmis_trades_").split("_")
            print("gecmis_trades:",mcr)
            if len(mcr)==2:
                asyncio.create_task(gecmis_trades(user_id,mcr[0],mcr[1]))
            elif len(mcr)==3:
                asyncio.create_task(gecmis_trades(user_id,mcr[0],mcr[1],mcr[2]))
        elif key_check(command,"gecmis_detay_"):
            mcr = key_after(command,"gecmis_detay_").split("_")
            if len(mcr)==2:
                asyncio.create_task(gecmis_detay(user_id,mcr[0],mcr[1]))
            elif len(mcr)==3:
                asyncio.create_task(gecmis_detay(user_id,mcr[0],mcr[1],mcr[2]))
            
        elif key_check(command,"sinyal_ekle_grup_"):
            mcr = key_after(command,"sinyal_ekle_grup_").split("_")
            asyncio.create_task(sinyal_ekle_grup(user_id,mcr[0],mcr[1],mcr[2]))
        elif key_check(command,"emir_ayarlama_"):
            asyncio.create_task(emir_ayarlama(user_id,key_after(command,"emir_ayarlama_")))
        elif key_check(command,"hesaplar_borsa_"):
            asyncio.create_task(hesaplar_listele(user_id,key_after(command,"hesaplar_borsa_")))
        elif key_check(command,"hesap_"):
            mcr = key_after(command,"hesap_").split("_")
            asyncio.create_task(apilerim_sil(user_id,mcr[0],mcr[1]))
        elif key_check(command,"api_sil_yes_"):
            mcr = key_after(command,"api_sil_yes_").split("_")
            asyncio.create_task(api_sil_yes(user_id,mcr[0],mcr[1]))
        elif key_check(command,"grupz_sil_yes_"):
            asyncio.create_task(grupz_sil_yes(user_id,key_after(command,"grupz_sil_yes_")))
        elif key_check(command,"emir_ayarlama_"):
            asyncio.create_task(emir_ayarlama(user_id,key_after(command,"emir_ayarlama_")))
        elif s_ekle_binance == "1":
            asyncio.create_task(api_ekle_borsa(user_id,"binance",command))
        elif s_ekle_bingx == "1":
            asyncio.create_task(api_ekle_borsa(user_id,"bingx",command)    )
        elif s_ekle_bybit == "1":
            asyncio.create_task(api_ekle_borsa(user_id,"bybit",command)    )
        elif s_update_binance == "1":
            asyncio.create_task(emir_duzenle(user_id,"binance",s_eid_binance,command))
        elif s_update_bingx == "1":
            asyncio.create_task(emir_duzenle(user_id,"bingx",s_eid_bingx,command))
        elif s_update_bybit == "1":
            asyncio.create_task(emir_duzenle(user_id,"bybit",s_eid_bybit,command))
        elif key_check(command,"api_ekle_borsa_"):
            asyncio.create_task(api_ekle_borsa(user_id,key_after(command,"api_ekle_borsa_"),command))
        elif key_check(command,"api_ekle"):
            asyncio.create_task(api_ekle_start(user_id))
        elif key_check(command,"odeme_formu_"):
            asyncio.create_task(odeme_formu_2(user_id,command))
        sys.stdout.flush()
    
    def uname(sender):
        
        print("sender:",sender)
        
        u_name = "";
        if sender.username != None:
            u_name = sender.username
        else:
            if sender.first_name != None:
                u_name = sender.first_name
            
            if sender.last_name != None:
                u_name = u_name+" "+sender.last_name
            
        return u_name    
            
    def uname_sql(sender):
        
        
        u_name = "";
        if sender[2] != None:
            u_name = sender[2]
        else:
            if sender[3] != None:
                u_name = sender[3]
            
            if sender[4] != None:
                u_name = u_name+" "+sender[4]
            
        return u_name    
            

        
    async def signal_score(user_id,smsg,sgnl):
    
        try:
            
            mysignal = my_query("select * from signals where 1")
            
            a_signalid=[]
            a_symbol=[]
            a_trend=[]
            a_entry1=[]
            a_entry2=[]
            a_sl=[]
            a_tp1=[]
            a_tp2=[]
            a_tp3=[]
            a_tp4=[]
            a_tp5=[]
            a_tickdate=[]
            a_open=[]
            a_close=[]
            a_label=[]
            
            for sg in mysignal:
                
                a_signalid.append(sg['id'])
                a_symbol.append(sg['symbol'])
                a_trend.append(sg['trend'])
                a_entry1.append(sg['entry1'])
                a_entry2.append(sg['entry2'])
                a_sl.append(sg['sl'])
                a_tp1.append(sg['tp1'])
                a_tp2.append(sg['tp2'])
                a_tp3.append(sg['tp3'])
                a_tp4.append(sg['tp4'])
                a_tp5.append(sg['tp5'])
                a_tickdate.append(sg['tickdate'])
                a_open.append(sg['open'])
                a_close.append(sg['close'])
             
            
            data = pd.DataFrame()
            data['signalid'] = a_signalid
            data['symbol'] = a_symbol
            data['trend'] = a_trend
            data['entry1'] = a_entry1
            data['entry2'] = a_entry2
            data['sl'] = a_sl
            data['tp1'] = a_tp1
            data['tp2'] = a_tp2
            data['tp3'] = a_tp3
            data['tp4'] = a_tp4
            data['tp5'] = a_tp5
            data['tickdate'] = a_tickdate
            data['open'] = a_open
            data['close'] = a_close
            
            
            
            for v in range(len(data)):
                last_c=0
                if data['trend'].values[v]=="LONG":
                    if data['close'].values[v] == 0:
                        last_c=0
                    else:
                        if data['close'].values[v] >= data['tp5'].values[v]:
                            last_c=5
                        elif data['close'].values[v] >= data['tp4'].values[v]:
                            last_c=4
                        elif data['close'].values[v] >= data['tp3'].values[v]:
                            last_c=3
                        elif data['close'].values[v] >= data['tp2'].values[v]:
                            last_c=2
                        elif data['close'].values[v] >= data['tp1'].values[v]:
                            last_c=1
                        elif data['close'].values[v] <= data['open'].values[v]:
                            last_c=0
                else:
                    if data['close'].values[v] == 0:
                        last_c=0
                    else:
                        if data['close'].values[v] <= data['tp5'].values[v]:
                            last_c=5
                        elif data['close'].values[v] <= data['tp4'].values[v]:
                            last_c=4
                        elif data['close'].values[v] <= data['tp3'].values[v]:
                            last_c=3
                        elif data['close'].values[v] <= data['tp2'].values[v]:
                            last_c=2
                        elif data['close'].values[v] <= data['tp1'].values[v]:
                            last_c=1
                        elif data['close'].values[v] >= data['open'].values[v]:
                            last_c=0   
                
                a_label.append(last_c)            
            data['label'] = a_label
            
            
            pred_symbol=[]
            pred_trend=[]
            pred_entry1=[]
            pred_entry2=[]
            pred_tickdate=[]
            
            pred_symbol.append(sgnl['symbol'])
            pred_trend.append(sgnl['trend'])
            pred_entry1.append(sgnl['entry1'])
            pred_entry2.append(sgnl['entry2'])
            pred_tickdate.append(round(time.time()*1000))
            
            pred_df = pd.DataFrame()
            pred_df['symbol'] = pred_symbol
            pred_df['trend'] = pred_trend
            pred_df['entry1'] = pred_entry1
            pred_df['entry2'] = pred_entry2
            pred_df['tickdate'] = pred_tickdate

            from sklearn import preprocessing
            le1 = preprocessing.LabelEncoder()
            le2 = preprocessing.LabelEncoder()

            data['symbol'] = le1.fit_transform(data['symbol'].values)
            data['trend'] = le2.fit_transform(data['trend'].values)
            #data['label'] = le.fit_transform(data['label'].values)
            data=data[data['tickdate']>0]
           

            pred_df2 = pred_df.copy()
            pred_df2['symbol'] = le1.transform(pred_df['symbol'].values)
            pred_df2['trend'] = le2.transform(pred_df['trend'].values)

            X = data[['symbol','trend','entry1','entry2','tickdate']].values 
            #X = preprocessing.minmax_scale(X)
            y = data['label'].values 
                    
            from xgboost import XGBClassifier, plot_tree
            from sklearn.ensemble import RandomForestClassifier
            from sklearn.model_selection import train_test_split       

            kac_tahmin = 0
            
            
            nS = a_symbol
            nX = X
            ny = y
            
            X = X
            y = y

            X_train1, X_test1, y_train1, y_test1 = train_test_split(X, y, test_size=0.3, random_state=32)
            from sklearn.metrics import classification_report
            
            print(X_train1.shape, X_test1.shape)
            
            
            
            XGBC = XGBClassifier(max_depth = 15, verbosity=1)
            #XGBC = RandomForestClassifier()
            XGBC.fit(X_train1, y_train1)
            print("train_score:",XGBC.score(X_train1, y_train1))
            print("test_score:",XGBC.score(X_test1, y_test1))
            from sklearn.metrics import confusion_matrix
            res_XGBC = pd.DataFrame(confusion_matrix(y_test1, XGBC.predict(X_test1)), 
                         columns=["sl", "tp1","tp2","tp3","tp4","tp5"], 
                         index=["sl", "tp1","tp2","tp3","tp4","tp5"])
            
            '''
            son_tahmin = XGBC.predict(nX)
            print(son_tahmin)
            
            tahmin_str = "train_score:"+str(XGBC.score(X_train1, y_train1))+" test_score:"+str(XGBC.score(X_test1, y_test1))+"\n"
            tahmin_str+= str(son_tahmin)+"\n"
            
            for yt in range(len(son_tahmin)):
                tahmin_str+=str(nS[yt])+" tahmin:"+str(son_tahmin[yt])+"\n"
            
            '''
            
            pX = pred_df2[['symbol','trend','entry1','entry2','tickdate']].values 
            son_tahmin = XGBC.predict(pX)
            #print(son_tahmin)
            
            tahmin_str = "train_score:"+str(XGBC.score(X_train1, y_train1))+" test_score:"+str(XGBC.score(X_test1, y_test1))+"\n"
            
            tahmin_str+= "\nCONFUSION MATRIX\n"
            tahmin_str+= str(res_XGBC)+"\n\n"
            tahmin_str+= "\nSEND STR\n"
            tahmin_str+= str(smsg)+"\n\n"
            tahmin_str+= "\nSIGNAL DATA\n"
            tahmin_str+= str(sgnl)+"\n\n"
            tahmin_str+= "tahmin:"+str(son_tahmin)+"\n"
            
            await tb.send_message(user_id,tahmin_str)
        
            
        except Exception as ee:
        
            print("signal forecast error:",ee)
            tahmin_str = "signal forecast error:"+str(ee)
            await tb.send_message(user_id,tahmin_str)
            pass                        
            
            
    @tb.message_handler(func=lambda message: True)
    async def message_query(message):
    
    
        ctype = message.chat.type 
        
        if ctype != "private":
                
            jsond = str(message).replace("'","\\'").replace("\"","\\\"")
            # print("json:",jsond)
            suan = str(pd.to_datetime(datetime.now()))
            
            
            print("-------------------------------------------------")
            print("[",ctype,"] #",str(message.chat.id)[4:]," ",message.chat.title," ",pd.to_datetime(message.date,unit="s")," message=",message.text)
            print("-------------------------------------------------")
            
            cursor = new_cursor()
            cursor.execute("INSERT INTO `channel_events` (`id`, `msg`, `tarih`, `durum`) VALUES (NULL, '"+jsond+"', '"+suan+"', '0');");
            cursor.close() 

            
            return
          
        
        
        user_id = str(message.from_user.id)
        
        msg_keys = message.text.split(" ")
        
        print(msg_keys)
        
        if msg_keys[0] == "/user_id":
            (tb_send_message(msg_keys[1],'Test invite message'))
            print(msg_keys[1]," - invite message send")
        
        
        if development_mode == 1:
            if user_id != "5118957445":
                (tb_send_message(user_id,"Lütfen Bekleyin güncelleme yapılıyor."))
                print(user_id," - invalid access - ",message);
                return;
        
        
        generate_user_dict(user_id)
        if message.text == "/start":
            session_free(user_id)
        
        msg_id = message.id
        msg_date = pd.to_datetime(message.date,unit="s")
        msg = message.text
        msg_name = uname(message.from_user)
        
        add_msg_id(user_id,"msg",msg_id,msg)
        u_msg_id = last_msg_id(user_id)
        #print("last_msg_id:",u_msg_id);
        
        print("message_query("+user_id+"): #",msg_id," ",msg_date," ",msg_name," ",msg)
        #print("message_query("+user_id+"):",message,"\n")
        
        trade_log(0,"message_query(",user_id,"): #",msg_id," ",msg_date," ",msg_name," ",msg);

                
        
        sessions = session_read(user_id)
        s_binance_api = session_value(sessions,"binance_api")
        s_bingx_api = session_value(sessions,"bingx_api")
        s_bybit_api = session_value(sessions,"bybit_api")
        
        s_update_binance = session_value(sessions,"binance_update_api")
        s_update_bingx = session_value(sessions,"bingx_update_api")
        s_update_bybit = session_value(sessions,"bybit_update_api")
        
        s_eid_binance = session_value(sessions,"binance_update_eid")
        s_eid_bingx = session_value(sessions,"bingx_update_eid")
        s_eid_bybit = session_value(sessions,"bybit_update_eid")
        
        s_grup_form = session_value(sessions,"grup_form")
        
        s_moderator_ekle = session_value(sessions,"moderator_ekle")
        s_abone_ekle = session_value(sessions,"abone_ekle")
        s_giris_mesaji_ekle = session_value(sessions,"giris_msj_ekle")
        s_toplu_msj = session_value(sessions,"toplu_msj")
        
        
        s_emri_duzen_api_lot = session_value(sessions,"emri_duzen_api_lot")
        s_emri_duzen_api_kaldirac = session_value(sessions,"emri_duzen_api_kaldirac")
        s_emri_duzen_api_max_emir = session_value(sessions,"emri_duzen_api_max_emir")
        
        s_emri_duzen_api_trail = session_value(sessions,"emri_duzen_api_trail")
        s_emri_duzen_api_maxmargin = session_value(sessions,"emri_duzen_api_maxmargin")
        s_emri_duzen_api_gstoploss = session_value(sessions,"emri_duzen_api_gstoploss")
        

        s_emri_duzen_api_lot = session_value(sessions,"emri_duzen_api_lot")
        s_emri_duzen_api_kaldirac = session_value(sessions,"emri_duzen_api_kaldirac")
        s_emri_duzen_api_maxemir = session_value(sessions,"emri_duzen_api_maxemir")
        s_emri_duzen_api_tp1 = session_value(sessions,"emri_duzen_api_tp1")
        s_emri_duzen_api_tp2 = session_value(sessions,"emri_duzen_api_tp2")
        s_emri_duzen_api_tp3 = session_value(sessions,"emri_duzen_api_tp3")
        s_emri_duzen_api_tp4 = session_value(sessions,"emri_duzen_api_tp4")
        s_emri_duzen_api_tp5 = session_value(sessions,"emri_duzen_api_tp5")
        s_emri_duzen_api_tp6 = session_value(sessions,"emri_duzen_api_tp6")
        s_emri_duzen_api_tp7 = session_value(sessions,"emri_duzen_api_tp7")
        s_emri_duzen_api_tp8 = session_value(sessions,"emri_duzen_api_tp8")
        s_emri_duzen_api_tp9 = session_value(sessions,"emri_duzen_api_tp9")
        s_emri_duzen_api_tp10 = session_value(sessions,"emri_duzen_api_tp10")
        
        s_emri_duzen_api_stoploss = session_value(sessions,"emri_duzen_api_stoploss")
        s_emri_duzen_api_takeprofit = session_value(sessions,"emri_duzen_api_takeprofit")
        s_emri_duzen_api_trailstop = session_value(sessions,"emri_duzen_api_trailstop")
        s_emri_duzen_api_trailstep = session_value(sessions,"emri_duzen_api_trailstep")
        s_emri_duzen_api_maliyetinecek = session_value(sessions,"emri_duzen_api_maliyetinecek")
        
        
        
        s_emri_duzen_api_trail = session_value(sessions,"emri_duzen_api_trail")
        s_emri_duzen_api_maxmargin = session_value(sessions,"emri_duzen_api_maxmargin")
        s_emri_duzen_api_gstoploss = session_value(sessions,"emri_duzen_api_gstoploss")
                
        
        s_abone_odeme_paket = session_value(sessions,"abone_odeme_paket")
        s_uye_rapor = session_value(sessions,"uye_rapor")
        
        
        a_admin_deneme_suresi = session_value(sessions,"admin_deneme_suresi")
        a_admin_kar_grafik_goster = session_value(sessions,"admin_kar_grafik_goster")
        a_admin_ucretsiz_kanal = session_value(sessions,"admin_ucretsiz_kanal")
        a_admin_referans_komisyon = session_value(sessions,"admin_referans_komisyon")
        a_admin_max_api = session_value(sessions,"admin_max_api")
        a_admin_max_api_ucret = session_value(sessions,"admin_max_api_ucret")
            

        smsg = message.text;
        import re
        m = smsg.encode('utf8')
        wnsg=re.sub(rb'[^\x00-\x7f]',rb'',m) 
        wnsg=str(wnsg).replace("\\n","\n").replace("b'","").replace("'","")
        smsg=wnsg        

        find_signal = sinyal_ayikla(smsg)
        
        if find_signal['symbol']!="" and float(find_signal['entry1'])>0 and float(find_signal['entry2'])>0 and float(find_signal['tp1'])>0 and float(find_signal['sl'])>0:
            asyncio.create_task(signal_score(user_id,smsg,find_signal))
       
                        
        
        if s_moderator_ekle == "1":
            
            uye_adi = str(message.text)
            
            uye_kontrol = num_rows("select id from users where username = '"+str(uye_adi)+"' or user_id = '"+str(uye_adi)+"'")
            cursor = new_cursor()
            if uye_kontrol>0:
                cursor.execute("update `users` set durum = '3' where username = '"+str(uye_adi)+"' or user_id = '"+str(uye_adi)+"'");
                
                cursor.close()
                #   ()
                (tb_send_message(user_id, "Üye başarı ile moderatörlüğe yükseltildi"))
                session_free(user_id)
            else:
                (tb_send_message(user_id, "Böyle bir üye bulunamamaktadır lütfen kullanıcı adını doğru yazınız"))
         
        elif message.text == "/start":
            asyncio.create_task(start_message(message))
        
        
        elif msg.find("/sinyal_ekle")!=-1:
        
            rows = fetch_row("select * from sinyalgrup where 1")
            
            s_msg = ""
            for row in rows:    
                gid = str(row[0])
                if key_check(msg,"/sinyal_ekle"+gid):
                    sinyal_ekle(user_id,gid,message)

        elif s_abone_odeme_paket != "":
            asyncio.create_task(abone_paket_add_ekle(user_id,msg))  
        
        

        elif s_emri_duzen_api_lot != "":
            asyncio.create_task(emri_duzen_api_lot_update(user_id,s_emri_duzen_api_lot,msg) ) 

        elif s_emri_duzen_api_tp1 != "":
            asyncio.create_task(emri_duzen_api_tp1_update(user_id,s_emri_duzen_api_tp1,msg) ) 
            
        elif s_emri_duzen_api_tp2 != "":
            asyncio.create_task(emri_duzen_api_tp2_update(user_id,s_emri_duzen_api_tp2,msg) ) 
            
        elif s_emri_duzen_api_tp3 != "":
            asyncio.create_task(emri_duzen_api_tp3_update(user_id,s_emri_duzen_api_tp3,msg) ) 
            
        elif s_emri_duzen_api_tp4 != "":
            asyncio.create_task(emri_duzen_api_tp4_update(user_id,s_emri_duzen_api_tp4,msg) ) 
            
        elif s_emri_duzen_api_tp5 != "":
            asyncio.create_task(emri_duzen_api_tp5_update(user_id,s_emri_duzen_api_tp5,msg) ) 
            
        elif s_emri_duzen_api_tp6 != "":
            asyncio.create_task(emri_duzen_api_tp6_update(user_id,s_emri_duzen_api_tp6,msg) ) 
            
        elif s_emri_duzen_api_tp7 != "":
            asyncio.create_task(emri_duzen_api_tp7_update(user_id,s_emri_duzen_api_tp7,msg) ) 
            
        elif s_emri_duzen_api_tp8 != "":
            asyncio.create_task(emri_duzen_api_tp8_update(user_id,s_emri_duzen_api_tp8,msg) ) 
            
        elif s_emri_duzen_api_tp9 != "":
            asyncio.create_task(emri_duzen_api_tp9_update(user_id,s_emri_duzen_api_tp9,msg) ) 
            
        elif s_emri_duzen_api_tp10 != "":
            asyncio.create_task(emri_duzen_api_tp10_update(user_id,s_emri_duzen_api_tp10,msg) ) 
            
        elif s_emri_duzen_api_stoploss != "":
            asyncio.create_task(emri_duzen_api_stoploss_update(user_id,s_emri_duzen_api_stoploss,msg) ) 
            
        elif s_emri_duzen_api_takeprofit != "":
            asyncio.create_task(emri_duzen_api_takeprofit_update(user_id,s_emri_duzen_api_takeprofit,msg) ) 
            
        elif s_emri_duzen_api_trailstop != "":
            asyncio.create_task(emri_duzen_api_trailstop_update(user_id,s_emri_duzen_api_trailstop,msg) ) 
            
        elif s_emri_duzen_api_trailstep != "":
            asyncio.create_task(emri_duzen_api_trailstep_update(user_id,s_emri_duzen_api_trailstep,msg) ) 
            
        elif s_emri_duzen_api_maliyetinecek != "":
            asyncio.create_task(emri_duzen_api_maliyetinecek_update(user_id,s_emri_duzen_api_maliyetinecek,msg) ) 
            
        elif s_emri_duzen_api_maxemir != "":
            asyncio.create_task(emri_duzen_api_maxemir_update(user_id,s_emri_duzen_api_maxemir,msg) ) 
            
            
            
        elif s_emri_duzen_api_kaldirac != "":
            asyncio.create_task(emri_duzen_api_kaldirac_update(user_id,s_emri_duzen_api_kaldirac,msg) ) 
        elif s_emri_duzen_api_maxemir != "":
            asyncio.create_task(emri_duzen_api_maxemir_update(user_id,s_emri_duzen_api_maxemir,msg) ) 
        elif s_emri_duzen_api_trail != "":
            asyncio.create_task(emri_duzen_api_trail_update(user_id,s_emri_duzen_api_trail,msg) ) 
        elif s_emri_duzen_api_gstoploss != "":
            asyncio.create_task(emri_duzen_api_gstoploss_update(user_id,s_emri_duzen_api_gstoploss,msg))  
        elif s_emri_duzen_api_maxmargin != "":
            asyncio.create_task(emri_duzen_api_maxmargin_update(user_id,s_emri_duzen_api_maxmargin,msg)  )
                
        
        elif s_uye_rapor != "":
            asyncio.create_task(suye_rapor(user_id,msg)  )
            
        elif a_admin_deneme_suresi != "":
            asyncio.create_task(admin_deneme_suresi(user_id,msg)  )
            
        elif a_admin_kar_grafik_goster != "":
            asyncio.create_task(admin_kar_grafik_goster(user_id,msg)  )
            
        elif a_admin_ucretsiz_kanal != "":
            asyncio.create_task(admin_ucretsiz_kanal(user_id,msg)  )
            
        elif a_admin_referans_komisyon != "":
            asyncio.create_task(admin_referans_komisyon(user_id,msg)  )
            
        elif a_admin_max_api != "":
            asyncio.create_task(admin_max_api(user_id,msg)  )
            
        elif a_admin_max_api_ucret != "":
            asyncio.create_task(admin_max_api_ucret(user_id,msg)  )
            
        elif s_abone_ekle == "1":
            asyncio.create_task(sabone_ekle(user_id,msg) )   
        elif s_grup_form=="1":
            asyncio.create_task(sgrup_ekle(user_id,msg) )   
        
        elif s_binance_api == "1":
            asyncio.create_task(api_ekle_borsa(user_id,"binance",msg))
        elif s_update_binance == "1":
            asyncio.create_task(emir_duzenle(user_id,"binance",s_eid_binance,msg))
        
        elif s_update_bingx == "1":
            asyncio.create_task(emir_duzenle(user_id,"bingx",s_eid_bingx,msg))
        elif s_bingx_api == "1":   
            asyncio.create_task(api_ekle_borsa(user_id,"bingx",msg))
        
        elif s_update_bybit == "1":
            asyncio.create_task(emir_duzenle(user_id,"bybit",s_eid_bybit,msg))
        elif s_bybit_api == "1":   
            asyncio.create_task(api_ekle_borsa(user_id,"bybit",msg))
        
        elif s_giris_mesaji_ekle == "1":   
            asyncio.create_task(giris_mesaji_yeni(user_id,msg))
        elif s_toplu_msj == "1":   
            asyncio.create_task(toplu_msj_yeni(user_id,msg))
        elif len(msg_keys)>0:
            invite_msg = str(msg_keys[1])
            
            print("invite message : ",invite_msg)
            
            if len(invite_msg.split("ref-"))>1 or len(invite_msg.split("chref-"))>1 or len(invite_msg.split("apiekle-"))>1:
                
                inviter = invite_msg.replace("chref-","").replace("apiekle-","").replace("ref-","")
                print("invited_user : ",inviter)
                ref_mi = fetch_row("select id from referral where user_id = '"+str(user_id)+"'")
                user_mi = fetch_row("select id from users where user_id = '"+str(user_id)+"'")
                
                username = str(message.from_user.username)
                first_name = str(message.from_user.first_name)
                last_name = str(message.from_user.last_name)
                tarih = str(message.date)  
                
                if len(ref_mi)==0:
                    cursor = new_cursor()
                    cursor.execute("INSERT INTO `referral` (`id` ,`user_id` ,`ref_id` ,`tarih`) VALUES (NULL , '"+str(user_id)+"', '"+str(inviter)+"', '"+str(tarih)+"');");
                    cursor.close()

                    cb1 = types.InlineKeyboardMarkup()

                    buton1 = types.InlineKeyboardButton(text='ANA MENU', callback_data='anamenu')
                  
                    cb1.add(buton1)            
                  
                    
                    if int(inviter)>0:
                        (tb_send_message(inviter,'Davet Ettiğiniz Arkadaşınız '+first_name+' '+last_name+' bota katılmıştır',cb1))
                
                if len(invite_msg.split("apiekle-"))>1 and False:
                    session_free(user_id)
                    asyncio.create_task(api_ekle_1(user_id))
                    print("api_ekle")
                    return
                                     
        else:
            session_free(user_id)
            asyncio.create_task(show_main_menu(user_id))
        
       
        
        sys.stdout.flush()


    async def telegram_pool():
        print("telegram_pool basladı");
        
        asyncio.create_task(channel_updates())
        await tb.polling(non_stop=True)
    
   
    async def channel_updates():
        
        print("channel_updates basladi")
        
        last_time=0
        
        #get_history("BTCUSDT","2022-05-09 04:00:00","2022-05-09 09:30:00")
        
        #generate_chart_image("btchakan.png","BTCUSDT","SHORT","2022-05-01 04:17:00",38200,"2022-05-09 09:24:00",33600,"TP1",350,"hkn","t.me/hkn")
        #generate_chart_image("btchakan.png","BTCUSDT","SHORT","2022-05-08 07:17:00",34800,"2022-05-09 09:24:00",33600,"TP1",350,"hkn","t.me/hkn")
        
        
        while True:
            suan = int(time.time()) 
            
            if last_time<suan:
                #print("Time:",time.time())
                await send_user_notifications()
                last_time=suan
            await asyncio.sleep(1)
        
    
    
    asyncio.run(telegram_pool())
 
    
except Exception as err:
    
    print("TELEGRAM BOT ERROR:",err)
    
     
    
