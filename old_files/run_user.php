<?php
include("mysql.php");
if(php_sapi_name()==="cli") {
	$cli_ok=1; 
	$sid = $argv[1];
	$channel = $argv[2];
}else if($_GET['anahtar']=="2023") { 
	$admin_ok=1; 
	$sid = $_GET['run'];
	$is_test = $_GET['test'];
	$channel = $p_name;
	echo "<pre>";

}else { 
  die("Not Running from CLI");
}
#print_r($argv);

$sl_tp_wait_seconds=15;
$signal_cancel_seconds=(60*30); 

$bir_kere_ac=0;
$signal_id = $sid;
$bildirim_gonder=1;
$pid = getmypid();

# php run_user.php 1 0 hknvip3

// $my->query("update `user_signals` set `open`='',`opentime`='',`close`='',`closetime`='',`ticket`='' where `id` = '$sid';");


function print_rr($arr,$alt=0) {
	
	$str = array();
	if(!is_array($arr)) {
		$arr=array($arr);
	}
	
	foreach($arr as $a => $b) {
		if (is_array($b) or is_object($b)) {
			$str[]="$a=[".print_rr($b,1)."] ";
		} else {
			$str[]="$a=$b ";
		}
	}
	if ($alt==1) {
		return implode(", ",$str)."\n";
	} else {
		echo implode(", ",$str)."\n";
	}
}



if($admin_ok==1 && $is_test==0) {
	echo "sinyal sifirlandi\n";
	$my->query("update user_signals set ticket='',open='',opentime='',closed_volume='',close='',closetime='',profit='',event='',status='',sticket='',tticket='' where id ='$sid';");
}

if($admin_ok==1 && $is_test==1) {
	echo "sinyal sifirlandi\n";
	$my->query("update user_signals set ticket='',open='',opentime='',closed_volume='',close='',closetime='',profit='',event='',status='',sticket='',tticket='' where id ='$sid';");
}
if($admin_ok==1 && $is_test==2) {
	echo "SL / TP sifirlandi\n";
	$my->query("update user_signals set sticket='',tticket='',status=1,closed_volume='',close=0,event='',closetime='' where id ='$sid';");
	
}
//echo "SELECT * FROM `user_signals` WHERE id='$sid'\n";
$rsi = $my->query("SELECT * FROM `user_signals` WHERE id='$sid'");
$us=$rsi->fetch_assoc();

//echo "user_signal detail:\n";
//echo implode("\t",$us)."\n";


$rsi1 = $my->query("SELECT * FROM `signals` WHERE id='$us[signal_id]'");
$sg=$rsi1->fetch_assoc();



#echo "signal detail:\n";
#echo implode("\t",$sg)."\n";


$api1 = $my->query("SELECT * FROM `apikeys` WHERE id='$us[api_id]'");
$api=$api1->fetch_assoc();
$api['order_type']="LIMIT";

$user_id = $api['user_id'];
$s_id = $sg['id'];
$us_id = $us['id'];
$signal_id = $us_id;
$sess_id = $user_id;



$sm1 = $my->query("select * from rates_server.rates where symbol='$us[symbol]'");
$sym = $sm1->fetch_assoc();

$symbol = $us["symbol"];

//echo "api detail:\n";
//echo implode("\t",$api)."\n";

//die;


$api_key=$api['api_key'];
$api_secret=$api['api_secret'];

$api_exchange=$exchange=$api['exchange'];


if($exchange=="binance") {
	$binance = new rbinance($api_key, $api_secret);
} else if($exchange=="bingx") {
	$binance = new rbingx($api_key, $api_secret);
} else {
	$binance = new rbybit($api_key, $api_secret);
}


$json=json_decode(file_get_contents("https://api.telegram.org/bot".$server_api_key."/getChatMember?chat_id=-100".$channel_id."&user_id=".$user_id));
print_r($json);

if($json->result->status=="member" || $json->result->status=="creator"|| $json->result->status=="administrator") {
	echo "kanal üyesi\n";
} else{
	echo "kanal üyesi olmadığı için bot durduruldu. status:";
	print_r($json);
	die; 
}


$exchanges = $binance->get_exchange();

if($exchange=="bingx") {
	$leverages = $binance->get_leverage($symbol);
} else {
	$leverages = $binance->get_leverage();
}

//trade_log("exchanges:",print_r($exchanges,1));
//trade_log("leverages:",print_r($leverages,1));

$sym_leverage = array();
$user_leverage = $api['leverage'];

$prev_not = 0;


if($exchange=="binance") {

	foreach($leverages as $a1 => $b1) {
		
		if(@$b1['symbol'] == $symbol) {
			$sym_leverage = $b1['brackets'];
			
			foreach($sym_leverage as $a2 => $b2) {
				if($b2['notionalCap']>$api['lot'] && $prev_not<=$api['lot'] && $user_leverage>$b2['initialLeverage']) {
					$user_leverage = $b2['initialLeverage'];
				}
				$prev_not = $b2['notionalCap'];
			}
			
		}
		
	}

} else if($exchange=="bingx") {
	
	$sym_leverage = $leverages->data;
	
	if($sg['trend']=="LONG") {
		if($user_leverage>$sym_leverage->maxLongLeverage) {
			$user_leverage = $sym_leverage->maxLongLeverage;
		}
	} else if($sg['trend']=="SHORT") {
		if($user_leverage>$sym_leverage->maxShortLeverage) {
			$user_leverage = $sym_leverage->maxShortLeverage;
		}
	}
	
} else {
	
	foreach($leverages as $a1 => $b1) {
		
		if($b1['symbol'] == $symbol) {
			$sym_leverage = $b1["leverageFilter"]["maxLeverage"];
		
			if($user_leverage>$sym_leverage) {
				$user_leverage = $sym_leverage;
		
			}
			
		}
		
	}
	
	
}


$bysym=array();
$max_lots=array();

$max_lots[$symbol] = 0;

if($exchange=="binance") {

foreach($exchanges['symbols'] as $s1 => $s2) {
	
	foreach($s2['filters'] as $f1 => $f2) {
		
		if($f2['filterType']=="MARKET_LOT_SIZE") {
			$max_lot = $f2['maxQty'];
			$max_lots[$s2['symbol']] = $max_lot;
		}
		
	}
 	
}

} else if ($exchange=="bingx") {
	
	foreach($exchanges->data as $a1 => $b1) {
		
		
		$exc_symbol = str_replace("-","",$b1->symbol);
		
		if(trim($symbol)==trim($exc_symbol)) {
			
			$bysym['vdigits'] = $b1->quantityPrecision;
			$bysym['digits'] = $b1->pricePrecision;
			$max_lots[$symbol] = 10000000;
			
			trade_log("symbol details ".$symbol.":",$bysym['digits']," vdigits:",$bysym['vdigits']);
		}		
		
		
	}
	

} else {
	
	foreach($exchanges as $s1 => $s2) {
		
		if(trim($symbol)==trim($s2['symbol'])) {
			
			echo "s2:\n";
			print_r($s2);
			
			$min_lot = $s2['lotSizeFilter']['minTradingQty'];
			if($min_lot=="") {
				$min_lot=$s2['lotSizeFilter']['minOrderQty'];
			}
			$min_lot = explode(".",$min_lot);
			$bysym['vdigits'] = strlen($min_lot[1]);
			$min_price = $s2['priceFilter']['minPrice'];
			$min_price = explode(".",$min_price);
			$bysym['digits'] = strlen($min_price[1]);


			echo "bysym:\n";
			print_r($bysym);
			$max_lots[$symbol] = $s2['lotSizeFilter']['maxOrderQty'];
		}
		
	}

}


$loop_signal=true;

if(strtotime($sg['tarih'])>0 && $cli_ok==1 && strtotime($sg['tarih'])+$signal_cancel_seconds<time() and $sg['open']>0 and $us['open']==0) {


	$my->query("update `user_signals` set `event`='sinyalin süresi dolduğu için pas gecildi.',status=2,ticket='-1', `close`='$sg[entry1]',`closetime`='".date("Y-m-d H:i:s")."' where `id` ='".$us['id']."'");
	
	echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] sinyalin süresi dolduğu için pas gecildi.\n";
	trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] sinyalin süresi dolduğu için pas gecildi.\n");
	$loop_signal=false;
	die();
}


/* 
$find_run_user = shell_exec("ps aux | grep 'run_user.php'");

$lines = explode("\n",$find_run_user);
foreach($lines as $a1 => $a2) {
	
	$prc = explode(" ",$a2);
	$find_pid = intval(trim($prc[6]));
	
	if(stristr($a2,"run_user.php $signal_id $channel") and $find_pid != $pid && $find_pid>0) {
		echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] kill old pid #$find_pid run_user.php $sid $channel\n";
		trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] kill old pid #$find_pid run_user.php $sid $channel\n");
		$kill_exec = shell_exec("kill -9 $find_pid");
		#print_rr($kill_exec);
	}
	
}
*/

echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] pid:$pid php run_user.php $sid $channel\n";
trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] pid:$pid php run_user.php $sid $channel\n");

try {
	
	if($exchange=="binance") {
			
		if($api['margin']==0) {
			$margin_sonuc = $binance->api_set_margin_type($symbol,"ISOLATED");
		} else {
			$margin_sonuc = $binance->api_set_margin_type($symbol,"CROSSED");
		}
		
	} else {
			
		if($api['margin']==0) {
			$margin_sonuc = $binance->api_set_margin_type($symbol,"ISOLATED",10);
		} else {
			$margin_sonuc = $binance->api_set_margin_type($symbol,"CROSSED",10);
		}
		
	}
		
	echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] margin_mode:";
	print_r($margin_sonuc);
	trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] margin_mode:".print_r($margin_sonuc,1));
	

} catch(Exception $apikeyr) {
		
		echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] margin_mode error:\n";
		print_rr($apikeyr);
		
		$error_code = $apikeyr['code'];
		$error_msg = $apikeyr['msg'];
		$error_msg = str_replace("'","",$error_msg);
		$error_msg = str_replace("\"","",$error_msg);
		
		trade_log($signal_str);
		$new_sql = "update user_signals set open='".$price."',close='".$price."',opentime='".date("Y-m-d H:i:s")."',closetime='".date("Y-m-d H:i:s")."',status=2,ticket='-1',event='".$error_code."|".$error_msg."' where id = '".$api_signal['id']."'";
		#echo($new_sql."\n");
		$my->query($new_sql) or die($my->error);	
		$signal_str = $api_exchange." Emir açılamadı. OPEN ".$api_signal['symbol']." ".$api_signal['trend']." ERROR price:".$price." code:".$error_code." msg:".$error_msg;
		bildirim_ekle($user_id,$signal_str,0);
			
} 

 

try {

	$level_status = $binance->api_set_leverage($symbol,$user_leverage);
	echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] leverage status:";
	print_r($level_status);
	trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] leverage status:".print_r($level_status,1));
	#$max_lots[$symbol] = $level_status['maxNotionalValue'];

} catch(Exception $leverage_err) {
		
		echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] leverage error:";
		print_rr($leverage_err);
		trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] leverage error:".print_r($leverage_err,1));
	
} 


function bildirim_ekle($user_id,$msg,$durum=0) {
	global $bildirim_gonder, $my,$user_id,$s_id,$us_id;
	//return
	
	if($msg=="") return;
	$msg = stripslashes($msg);
	$msg1 = str_replace("\n"," ",$msg);
	echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] bildirim = ".$msg1."\n";
	if($bildirim_gonder==1) $my->query("insert into bildirimler values('','".$user_id."','".$msg."','".$durum."')");
	
}

function create_order($sid) {
	global $my,$bysym,$binance,$api_exchange,$max_lots,$user_id,$s_id,$us_id,$admin_ok,$is_test;
	
	$rsi = $my->query("SELECT * FROM `user_signals` WHERE id='$sid'");
	$us=$rsi->fetch_assoc();
	
	if(($us['close']>0 || $us['open']>0) && $admin_ok==1) return;

	$rsi1 = $my->query("SELECT * FROM `signals` WHERE id='$us[signal_id]'");
	$sg=$rsi1->fetch_assoc();

	$api1 = $my->query("SELECT * FROM `apikeys` WHERE id='$us[api_id]'");
	$api=$api1->fetch_assoc();
	$user_id = $api['user_id'];



	$sm1 = $my->query("select * from rates_server.rates where symbol='$us[symbol]'");
	$sym = $sm1->fetch_assoc();
	
	
	$ask = $sym['price'];
	$bid = $sym['price'];	
	if($api_exchange=="bybit") {
		$sym['digits'] = $bysym['digits'];
		$sym['vdigits'] = $bysym['vdigits'];
	}
	$symbol = $us["symbol"];
	
	echo "vlot:".$api['lot']." vdigits:".$sym['vdigits']."\n";

	
	$price = 0;
	if($admin_ok==1 && $is_test==1) {
		$volume=number_format(10,$sym['vdigits'],".","");
	} else {
		$volume=number_format($api['lot'],$sym['vdigits'],".","");
	}
	$sprice=number_format($sg['sl'],$sym['digits'],".","");
	
	$tprice = 0;
	$signal_max_tp=0;
	
	for($i=1;$i<=10;$i++) {
		if($sg['tp'.$i]>0) {
			$tprice=number_format($sg['tp'.$i],$sym['digits'],".","");
			$signal_max_tp=$i;
		}
	}
	
	$user_max_tp = 5;
	
	for($i=1;$i<=10;$i++) {
		if($api['tp'.$i]>0) {
			$user_max_tp=$i;
		}
	}
	
	$p_risk = $binance->position_risk();
	 
	$emir_adet = 0;
	
	foreach($p_risk as $a => $b) {
		if($b!=0) {
			$emir_adet++;
		}
	}
	
	$price = $sym['price'];
	
	
	if($p_risk[$symbol]!=0) {
		
		$orders=array();
		$orders['code'] = -101;
		$orders['code'] = "zaten elinizde açık $symbol pozisyonu olduğu için pozisyon açılamadı.";
		
	} else if($emir_adet>=$api['maxemir']) {
		
		$orders=array();
		$orders['code'] = -102;
		$orders['code'] = "maksimum $api[maxemir] adet emir açmaya izin verdiğiniz için bu emir açılamadı. Şuan açık emir sayınız $emir_adet";
		
	} else {
		
		$max_lot = $max_lots[$symbol];
		
		$b_orders=array();
		
		
		
		if($api_exchange=="bingx") {
			
			
			
			
			if($sg['trend']=="LONG") {
				$price = $sym['price'];
				$volume=number_format($api['lot']/$price,$sym['vdigits'],".","");
				echo "volume: $volume vdigits:$sym[vdigits] api:$api[lot] price:$price\n";
				
				if($max_lot>0 && $volume>$max_lot) $volume = number_format($max_lot,$sym['vdigits'],".","");
				$b_orders[]=$binance->prepare_order($symbol,"BUY","MARKET",$volume,$price);
				if($api['stoploss'] == 0 && $api['sltpemir']==1) {
					$b_orders[]=$binance->prepare_order($symbol,"BUY","SL",$volume,$sprice);
				} else if($api['stoploss']>0 && $api['sltpemir']==1) {
					$sprice = number_format($sym['price']*((100-$api['stoploss'])/100),$sym['digits'],".","");
					$b_orders[]=$binance->prepare_order($symbol,"BUY","SL",$volume,$sprice);
				} else {
					$b_orders[]=$binance->prepare_order($symbol,"BUY","NSL",$volume,$sprice);
				}	
				
				if($api['takeprofit'] == 0 && $api['sltpemir']==1) {
					
					$b_orders[]=$binance->prepare_order($symbol,"BUY","TP",$volume,$tprice);
				} else if($api['takeprofit'] == -1 && $api['sltpemir']==1) {
					$tprice = $sg['tp1'];
					$b_orders[]=$binance->prepare_order($symbol,"BUY","TP",$volume,$tprice);
				} else if($api['takeprofit'] == -2 && $api['sltpemir']==1) {
					$tprice = $sg['tp2'];
					$b_orders[]=$binance->prepare_order($symbol,"BUY","TP",$volume,$tprice);
				} else if($api['takeprofit'] == -3 && $api['sltpemir']==1) {
					$tprice = $sg['tp3'];
					$b_orders[]=$binance->prepare_order($symbol,"BUY","TP",$volume,$tprice);
				} else if($api['takeprofit'] == -4 && $api['sltpemir']==1) {
					$tprice = $sg['tp4'];
					$b_orders[]=$binance->prepare_order($symbol,"BUY","TP",$volume,$tprice);
				} else if($api['takeprofit'] == -5 && $api['sltpemir']==1) {
					$tprice = $sg['tp5'];
					$b_orders[]=$binance->prepare_order($symbol,"BUY","TP",$volume,$tprice);
				} else if($api['takeprofit']>0 && $api['sltpemir']==1) {
					$tprice = number_format($sym['price']*((100+$api['takeprofit'])/100),$sym['digits'],".","");
					$b_orders[]=$binance->prepare_order($symbol,"BUY","TP",$volume,$tprice);
				} else if ($api['sltpemir']==1) {
					$tprice = $sg['tp5'];
					$b_orders[]=$binance->prepare_order($symbol,"BUY","TP",$volume,$tprice);
				}
				
				
			} else if($us['trend']=="SHORT") {
				$price = $sym['price'];
				$volume=number_format($api['lot']/$price,$sym['vdigits'],".","");
				if($max_lot>0 && $volume>$max_lot) $volume = number_format($max_lot,$sym['vdigits'],".","");
				$b_orders[]=$binance->prepare_order($symbol,"SELL","MARKET",$volume,$sym['price']);
				if($api['stoploss'] == 0 && $api['sltpemir']==1) {
					$b_orders[]=$binance->prepare_order($symbol,"SELL","SL",$volume,$sprice);
				} else if($api['stoploss']>0 && $api['sltpemir']==1) {
					$sprice = number_format($sym['price']*((100+$api['stoploss'])/100),$sym['digits'],".","");
					$b_orders[]=$binance->prepare_order($symbol,"SELL","SL",$volume,$sprice);
				} else {
					$b_orders[]=$binance->prepare_order($symbol,"SELL","NSL",$volume,$sprice);
				}	
				
				if($api['takeprofit'] == 0 && $api['sltpemir']==1) {
				
					$b_orders[]=$binance->prepare_order($symbol,"SELL","TP",$volume,$tprice);
				} else if($api['takeprofit'] == -1) {
					$tprice = $sg['tp1'];
					$b_orders[]=$binance->prepare_order($symbol,"SELL","TP",$volume,$tprice);
				} else if($api['takeprofit'] == -2) {
					$tprice = $sg['tp2'];
					$b_orders[]=$binance->prepare_order($symbol,"SELL","TP",$volume,$tprice);
				} else if($api['takeprofit'] == -3) {
					$tprice = $sg['tp3'];
					$b_orders[]=$binance->prepare_order($symbol,"SELL","TP",$volume,$tprice);
				} else if($api['takeprofit'] == -4) {
					$tprice = $sg['tp4'];
					$b_orders[]=$binance->prepare_order($symbol,"SELL","TP",$volume,$tprice);
				} else if($api['takeprofit'] == -5) {
					$tprice = $sg['tp5'];
					$b_orders[]=$binance->prepare_order($symbol,"SELL","TP",$volume,$tprice);
				} else if($api['takeprofit']>0) {
					$tprice = number_format($sym['price']*((100-$api['takeprofit'])/100),$sym['digits'],".","");
					$b_orders[]=$binance->prepare_order($symbol,"SELL","TP",$volume,$tprice);
				}
			
			}	
			
			
			
			
			
		} else {
			
			if($sg['trend']=="LONG") {
				$price = $sym['price'];
				$volume=number_format($api['lot']/$price,$sym['vdigits'],".","");
				echo "volume: $volume vdigits:$sym[vdigits] api:$api[lot] price:$price\n";
				
				if($max_lot>0 && $volume>$max_lot) $volume = number_format($max_lot,$sym['vdigits'],".","");
				$b_orders[]=$binance->prepare_order($symbol,"BUY","MARKET",$volume,$price);
				if($api['stoploss'] == 0 && $api['sltpemir']==1) {
					$b_orders[]=$binance->prepare_order($symbol,"SELL","SL",0,$sprice);
				} else if($api['stoploss']>0 && $api['sltpemir']==1) {
					$sprice = number_format($sym['price']*((100-$api['stoploss'])/100),$sym['digits'],".","");
					$b_orders[]=$binance->prepare_order($symbol,"SELL","SL",0,$sprice);
				} else {
					$b_orders[]=$binance->prepare_order($symbol,"SELL","NSL",0,$sprice);
				}	
				
				if($api['takeprofit'] == 0 && $api['sltpemir']==1) {
					
					$b_orders[]=$binance->prepare_order($symbol,"SELL","TP",0,$tprice);
				} else if($api['takeprofit'] == -1 && $api['sltpemir']==1) {
					$tprice = $sg['tp1'];
					$b_orders[]=$binance->prepare_order($symbol,"SELL","TP",0,$tprice);
				} else if($api['takeprofit'] == -2 && $api['sltpemir']==1) {
					$tprice = $sg['tp2'];
					$b_orders[]=$binance->prepare_order($symbol,"SELL","TP",0,$tprice);
				} else if($api['takeprofit'] == -3 && $api['sltpemir']==1) {
					$tprice = $sg['tp3'];
					$b_orders[]=$binance->prepare_order($symbol,"SELL","TP",0,$tprice);
				} else if($api['takeprofit'] == -4 && $api['sltpemir']==1) {
					$tprice = $sg['tp4'];
					$b_orders[]=$binance->prepare_order($symbol,"SELL","TP",0,$tprice);
				} else if($api['takeprofit'] == -5 && $api['sltpemir']==1) {
					$tprice = $sg['tp5'];
					$b_orders[]=$binance->prepare_order($symbol,"SELL","TP",0,$tprice);
				} else if($api['takeprofit']>0 && $api['sltpemir']==1) {
					$tprice = number_format($sym['price']*((100+$api['takeprofit'])/100),$sym['digits'],".","");
					$b_orders[]=$binance->prepare_order($symbol,"SELL","TP",0,$tprice);
				} else if ($api['sltpemir']==1) {
					$tprice = $sg['tp5'];
					$b_orders[]=$binance->prepare_order($symbol,"SELL","TP",0,$tprice);
				}
				
				
			} else if($us['trend']=="SHORT") {
				$price = $sym['price'];
				$volume=number_format($api['lot']/$price,$sym['vdigits'],".","");
				if($max_lot>0 && $volume>$max_lot) $volume = number_format($max_lot,$sym['vdigits'],".","");
				$b_orders[]=$binance->prepare_order($symbol,"SELL","MARKET",$volume,$sym['price']);
				if($api['stoploss'] == 0 && $api['sltpemir']==1) {
					$b_orders[]=$binance->prepare_order($symbol,"BUY","SL",0,$sprice);
				} else if($api['stoploss']>0 && $api['sltpemir']==1) {
					$sprice = number_format($sym['price']*((100+$api['stoploss'])/100),$sym['digits'],".","");
					$b_orders[]=$binance->prepare_order($symbol,"BUY","SL",0,$sprice);
				} else {
					$b_orders[]=$binance->prepare_order($symbol,"BUY","NSL",0,$sprice);
				}	
				
				if($api['takeprofit'] == 0 && $api['sltpemir']==1) {
				
					$b_orders[]=$binance->prepare_order($symbol,"BUY","TP",0,$tprice);
				} else if($api['takeprofit'] == -1) {
					$tprice = $sg['tp1'];
					$b_orders[]=$binance->prepare_order($symbol,"BUY","TP",0,$tprice);
				} else if($api['takeprofit'] == -2) {
					$tprice = $sg['tp2'];
					$b_orders[]=$binance->prepare_order($symbol,"BUY","TP",0,$tprice);
				} else if($api['takeprofit'] == -3) {
					$tprice = $sg['tp3'];
					$b_orders[]=$binance->prepare_order($symbol,"BUY","TP",0,$tprice);
				} else if($api['takeprofit'] == -4) {
					$tprice = $sg['tp4'];
					$b_orders[]=$binance->prepare_order($symbol,"BUY","TP",0,$tprice);
				} else if($api['takeprofit'] == -5) {
					$tprice = $sg['tp5'];
					$b_orders[]=$binance->prepare_order($symbol,"BUY","TP",0,$tprice);
				} else if($api['takeprofit']>0) {
					$tprice = number_format($sym['price']*((100-$api['takeprofit'])/100),$sym['digits'],".","");
					$b_orders[]=$binance->prepare_order($symbol,"BUY","TP",0,$tprice);
				}
			
			}	
			
		}
		
		
		
		print_r($b_orders);
		
		trade_log("b_order:".print_r($b_orders,1));
			
		$orders = $binance->bulk_order_send($b_orders);
		trade_log("orders:".print_r($orders,1));
		
		#echo "order_send_return:\n";
		#print_r($orders);
		
	}
	
	$order_ticket = $orders[0]['orderId'];
	$order_status = $orders[0]['status'];
	$sl_ticket = $orders[1]['orderId'];
	$tp_ticket = $orders[2]['orderId'];
	
	
	if(count($orders)>0 && $order_ticket!="") {
		
		$results = "#".$order_ticket." ".$symbol." ".$volume." ".$us['trend']." ".$price." #".$order_ticket." ".$price." ".date("Y-m-d H:i:s")." ".$order_status;
		#echo($api['exchange']."[u".$user_id."] [s".$us['signal_id']."] [".$api['id']."] ->".$symbol."->".$us['trend']." results : ".$results."\n");
		
		$signal_str = $api_exchange." OPEN #".$order_ticket."  ".$us['symbol']." ".$us['trend']." price:".$price." sl:".$sprice." volume:".$volume;
		trade_log($signal_str);
		
		$my->query("update user_signals set open='".$price."',ticket='".$order_ticket."',sl='".$sprice."',sticket='".$sl_ticket."',tticket='".$tp_ticket."',opentime='".date("Y-m-d H:i:s")."',volume='".$volume."',status=1 where id ='".$us['id']."'") or die($my->error);
		echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $results\n";
		trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $results\n");
		bildirim_ekle($user_id,$signal_str,0);
		
		if($sl_ticket>0) {
			
			trade_log(" sl ticket - $sl_ticket");
			
		} else {

			$sl_error_msg = stripslashes($orders[1]['msg']);
			$sl_error_msg = str_replace("'","",$sl_error_msg);
			$sl_error_msg = str_replace("\"","",$sl_error_msg);	
			if(stristr($sl_error_msg,"direction is existing")) {
				$sl_ticket=-1;
			}
			
			trade_log(" sl ticket error - $sl_ticket - ".$sl_error_msg);
			
		}
		if($tp_ticket>0) {
			
			trade_log(" tp ticket - $tp_ticket");
			
		} else {

			$tp_error_msg = stripslashes($orders[2]['msg']);
			$tp_error_msg = str_replace("'","",$tp_error_msg);
			$tp_error_msg = str_replace("\"","",$tp_error_msg);	
			
			if(stristr($tp_error_msg,"direction is existing")) {
				$tp_ticket=-1;
			}
			
			trade_log(" tp ticket error - $tp_ticket - ".$tp_error_msg);
			
		}
		
		

		
		if(True) {
			
			echo "u_id:$user_id|us:$us_id user_max_tp: $user_max_tp  signal_max_tp:$signal_max_tp\n";
			trade_log("u_id:$user_id|us:$us_id user_max_tp: $user_max_tp  signal_max_tp:$signal_max_tp\n");
			
			if($signal_max_tp>0 && $signal_max_tp<$user_max_tp) {
				$user_max_tp=$signal_max_tp;
			}
			
			echo "u_id:$user_id|us:$us_id 2. user_max_tp: $user_max_tp  signal_max_tp:$signal_max_tp\n";
			trade_log("u_id:$user_id|us:$us_id 2. user_max_tp: $user_max_tp  signal_max_tp:$signal_max_tp\n");
			$total_tp = 0;
			
			for($tg=1;$tg<=$user_max_tp;$tg++) {
				
				
				$new_lot_yuzde = $api['tp'.$tg];
				
				$total_gecti=0;
				if ($total_tp + $new_lot_yuzde>100) {
					$new_lot_yuzde = 100-$total_tp;
					$total_gecti=1;
				}
				
				$new_lot = number_format($volume*($new_lot_yuzde/100),$sym['vdigits'],".","");
				// if(new_lot<sym.min_lot) new_lot=sym.min_lot;
				
				if($tg == $user_max_tp) {
					$new_lot_yuzde = 100-$total_tp;
					$new_lot = number_format($volume*($new_lot_yuzde/100),$sym['vdigits'],".","");
					
				}
				
				$total_tp = $total_tp + $new_lot_yuzde;
				echo ($tg." u_id:$user_id|us:$us_id  ticket:$order_ticket - volume:$volume digits:$sym[vdigits] new_lot_yuzde:".$new_lot_yuzde." total_tp:".$total_tp." new_lot:".$new_lot." total_gecti:".$total_gecti."\n");
				trade_log($tg." u_id:$user_id|us:$us_id  ticket:$order_ticket - volume:$volume digits:$sym[vdigits]  new_lot_yuzde:".$new_lot_yuzde." total_tp:".$total_tp." new_lot:".$new_lot." total_gecti:".$total_gecti."\n");
				
				$new_price = $sg['tp'.$tg];
				 
				if($new_lot>0) {
					
					if($api_exchange == "bingx") {
					
							
						if($us['trend']=="LONG") {
							$nt = $binance->order_send($symbol,"SELL","LIMIT",$new_lot,$new_price,1);
						} else {
							$nt = $binance->order_send($symbol,"BUY","LIMIT",$new_lot,$new_price,1);
						}
					
						
					} else {
							
						if($us['trend']=="LONG") {
							$nt = $binance->order_send($symbol,"SELL","LIMIT",$new_lot,$new_price,1);
						} else {
							$nt = $binance->order_send($symbol,"BUY","LIMIT",$new_lot,$new_price,1);
						}
					}
					
					echo "---- limit tp order u_id:$user_id|us:$us_id  #$order_ticket -> #$nt[orderId] $nt[side] $nt[type] $nt[price] $nt[origQty] new_lot:$new_lot, new_price:$new_price\n";
					trade_log("---- limit tp order u_id:$user_id|us:$us_id  #$order_ticket -> #$nt[orderId] $nt[side] $nt[type] $nt[price] $nt[origQty] new_lot:$new_lot, new_price:$new_price\n");
					trade_log("orders:".print_r($nt,1));
				}	

				if($total_gecti==1) break;
				
			}
			
			
			
		}
	

	} else if($orders['code']!="" or $orders[0]['code']!="") {
		
		if ($orders[0]['code']!="") {
		
			$error_code = $orders[0]['code'];
			$error_msg = stripslashes($orders[0]['msg']);
			
		} else {
			
			$error_code = $orders['code'];
			$error_msg = stripslashes($orders['msg']);
		}  
		
		if($error_code == "-4061" or stristr($error_msg,"the PositionSide field")) {
			$error_msg = "Hesabınız hedge modunda olduğu için işlem açılamamıştır. Hesabınız one-way moduna aldığınızda işlemleriniz açılacaktır.";
		} else if($error_code == "-2019") {
			$error_msg = "Hesap bakiyeniz bu işlemi açabilmek için yetersiz.";
		} else if(stristr($error_msg,"symbol not exist, please verify it in api")) {
			$error_msg = "BINGX borsasında böyle bir parite bulunmamaktadır o yüzden işlem açılamamıştır.";
		} else if($error_code == "-4164") {
			$error_msg = "Kapatmak istediğiniz lot miktarı 6 USDT den küçük olamaz. 6 USDT den daha küçük bir pozisyon kapatmaya çalışıyorsunuz. ";
		} else if($error_code == "-2015") {
			$error_msg = "API key anahtarınız yanlıştır. Eğer doğru olduğunu düşünüyorsanız. Futures cüzdanı olup olmadığına, Api key için futures izni verip vermediğinize emin olun. ";
		} else if(stristr($error_msg,"position idx not match")) {
			$error_msg = "Hesabınız işlem açılmaya çalıştığınız paritede hedge modunda olduğu için işlem açılamamaktadır. İşlem açmak için mevcut pariteyi one-way moduna alınız.";
		} else if(stristr($error_msg,"CannotAffordOrderCost")) {
			$error_msg = "Futures Hesabınızda işlem açmak için yeterli bakiye yoktur. İşlemlere girmek için Spot hesabınızdaki parayı Futures Cüzdanınıza aktarınız.";
		} else if(stristr($error_msg,"symbol is not whitelisted")) {
			$error_msg = "Bu paritede işlem açmak için pariteyi whitelist e eklemiş olmanız gerekiyor. Api ayarlarına girip tüm pariteleri whitelist e ekleyiniz.";
		}
		
		$error_msg = str_replace("'","",$error_msg);
		$error_msg = str_replace("\"","",$error_msg);
	
		$signal_str = $api_exchange." Emir açılamadı. OPEN ".$us['symbol']." ".$us['trend']." ERROR price:".$price." volume:".$volume." code:".$error_code." msg:".$error_msg;
		$new_sql = "update user_signals set open='".$price."',close='".$price."',opentime='".date("Y-m-d H:i:s")."',closetime='".date("Y-m-d H:i:s")."',status=2,ticket='-1',event='".$error_code."|".$error_msg."' where id = '".$us['id']."'";
		
		echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $signal_str\n";
		trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $signal_str\n");
		$my->query($new_sql) or die($my->error);	
		bildirim_ekle($user_id,$signal_str,0);
			
			
	}					
	
	
}

function create_limit_tp($sid) {
	global $my,$bysym,$binance,$api_exchange,$max_lots,$user_id,$s_id,$us_id,$admin_ok,$is_test;
	
	$rsi = $my->query("SELECT * FROM `user_signals` WHERE id='$sid'");
	$us=$rsi->fetch_assoc();
	
	if($is_test!=2) return;

	$rsi1 = $my->query("SELECT * FROM `signals` WHERE id='$us[signal_id]'");
	$sg=$rsi1->fetch_assoc();

	$api1 = $my->query("SELECT * FROM `apikeys` WHERE id='$us[api_id]'");
	$api=$api1->fetch_assoc();
	$user_id = $api['user_id'];



	$sm1 = $my->query("select * from rates_server.rates where symbol='$us[symbol]'");
	$sym = $sm1->fetch_assoc();
	
	if($api_exchange=="bybit") {
		$sym['digits'] = $bysym['digits'];
		$sym['vdigits'] = $bysym['vdigits'];
	}
	$symbol = $us["symbol"];
	
	$price = 0;
	if($admin_ok==1 && $is_test==1) {
		$volume=number_format(10,$sym['vdigits'],".","");
	} else {
		$volume=number_format($api['lot'],$sym['vdigits'],".","");
	}
	$sprice=number_format($sg['sl'],$sym['digits'],".","");
	
	$tprice = 0;
	$signal_max_tp=0;
	
	for($i=1;$i<=10;$i++) {
		if($sg['tp'.$i]>0) {
			$tprice=number_format($sg['tp'.$i],$sym['digits'],".","");
			$signal_max_tp=$i;
		}
	}
	
	$user_max_tp = 5;
	
	for($i=1;$i<=10;$i++) {
		if($api['tp'.$i]>0) {
			$user_max_tp=$i;
		}
	}
	
	$p_risk = $binance->position_risk();
	 
	$emir_adet = 0;
	
	foreach($p_risk as $a => $b) {
		if($b!=0) {
			$emir_adet++;
		}
	}
	
	$price = $sym['price'];
	
	
	if(True) {
		
		echo "u_id:$user_id|us:$us_id user_max_tp: $user_max_tp  signal_max_tp:$signal_max_tp\n";
		trade_log("u_id:$user_id|us:$us_id user_max_tp: $user_max_tp  signal_max_tp:$signal_max_tp\n");
		
		if($signal_max_tp>0 && $signal_max_tp<$user_max_tp) {
			$user_max_tp=$signal_max_tp;
		}
		
		echo "u_id:$user_id|us:$us_id 2. user_max_tp: $user_max_tp  signal_max_tp:$signal_max_tp\n";
		trade_log("u_id:$user_id|us:$us_id 2. user_max_tp: $user_max_tp  signal_max_tp:$signal_max_tp\n");
		$total_tp = 0;
		
		for($tg=1;$tg<=$user_max_tp;$tg++) {
			
			
			$new_lot_yuzde = $api['tp'.$tg];
			
			$total_gecti=0;
			if ($total_tp + $new_lot_yuzde>100) {
				$new_lot_yuzde = 100-$total_tp;
				$total_gecti=1;
			}
			
			$new_lot = number_format($volume*($new_lot_yuzde/100),$sym['vdigits'],".","");
			// if(new_lot<sym.min_lot) new_lot=sym.min_lot;
			
			if($tg == $user_max_tp) {
				$new_lot_yuzde = 100-$total_tp;
				$new_lot = number_format($volume*($new_lot_yuzde/100),$sym['vdigits'],".","");
				
			}
			
			$total_tp = $total_tp + $new_lot_yuzde;
			echo ($tg." u_id:$user_id|us:$us_id  ticket:$order_ticket - volume:$volume digits:$sym[vdigits] new_lot_yuzde:".$new_lot_yuzde." total_tp:".$total_tp." new_lot:".$new_lot." total_gecti:".$total_gecti."\n");
			trade_log($tg." u_id:$user_id|us:$us_id  ticket:$order_ticket - volume:$volume digits:$sym[vdigits]  new_lot_yuzde:".$new_lot_yuzde." total_tp:".$total_tp." new_lot:".$new_lot." total_gecti:".$total_gecti."\n");
			
			$new_price = $sg['tp'.$tg];
			 
			if($new_lot>0) {
				
				if($api_exchange == "bingx") {
				
						
					if($us['trend']=="LONG") {
						$nt = $binance->order_send($symbol,"SELL","LIMIT",$new_lot,$new_price,1);
					} else {
						$nt = $binance->order_send($symbol,"BUY","LIMIT",$new_lot,$new_price,1);
					}
				
					
				} else {
						
					if($us['trend']=="LONG") {
						$nt = $binance->order_send($symbol,"SELL","LIMIT",$new_lot,$new_price,1);
					} else {
						$nt = $binance->order_send($symbol,"BUY","LIMIT",$new_lot,$new_price,1);
					}
				}
				
				echo "---- limit tp order u_id:$user_id|us:$us_id  #$order_ticket -> #$nt[orderId] $nt[side] $nt[type] $nt[price] $nt[origQty] new_lot:$new_lot, new_price:$new_price\n";
				trade_log("---- limit tp order u_id:$user_id|us:$us_id  #$order_ticket -> #$nt[orderId] $nt[side] $nt[type] $nt[price] $nt[origQty] new_lot:$new_lot, new_price:$new_price\n");
				trade_log("orders:".print_r($nt,1));
			}	

			if($total_gecti==1) break;
			
		}
		
		
		
	}
				
		
	
}

function trail_stop($sid,$name,$hedef,$sprice,$volume) {

	global $my,$binance,$api_exchange,$signal_id,$s_id,$us_id;

	$rsi = $my->query("SELECT * FROM `user_signals` WHERE id='$sid'");
	$us=$rsi->fetch_assoc();
	
	if($us['close']>0) return;

	$rsi1 = $my->query("SELECT * FROM `signals` WHERE id='$us[signal_id]'");
	$sg=$rsi1->fetch_assoc();


	$api1 = $my->query("SELECT * FROM `apikeys` WHERE id='$us[api_id]'");
	$api=$api1->fetch_assoc();
	$api['order_type']="LIMIT";
	$user_id = $api['user_id'];



	$sm1 = $my->query("select * from rates_server.rates where symbol='$us[symbol]'");
	$sym = $sm1->fetch_assoc();
	
	$symbol = $us["symbol"];
	
	 
	$sprice=number_format($sprice,$sym['digits'],".","");	

	if ( ($us['trend']=="LONG" && ($us['sl']==0 or $us['sl']<$sprice)) or  ($us['trend']=="SHORT" && ($us['sl']==0 or $us['sl']>$sprice)) ) {
		
		if($api_exchange=="bingx") {
			
			$o_pos = $binance->open_positions($symbol);


			$positions=array();

			foreach($o_pos->data as $a_o => $a_b) {
				
				$b_b=(array) $a_b;
				
				$positions[]=$b_b;
				
				echo implode(" ",$b_b)."\n";
				
				$price = $b_b['avgPrice'];
				$digits = explode(".",$price);
				$digits = strlen($digits[1]);
				
				$b_b['symbol']=str_replace("-","",$b_b['symbol']);
				$sl_ticket = $binance->order_send($b_b['symbol'],($b_b['positionSide']=="LONG" ? "BUY" : "SELL"),"SL",$b_b['positionAmt'],$sprice,1);
				echo "code:".$sl_ticket['code']."\n";
				
				if(stristr($sl_ticket['msg'],"The order size must be less than the available")) {
					
					
					echo "sl oluşturamadı\n";
					

					$o_ord = $binance->open_orders("");

					$orders=array();

					foreach($o_ord->data->orders as $ea_o => $ea_b) {
						
						
						$ea_b=(array) $ea_b;
						if (str_replace("-","",$ea_b['symbol'])==$b_b['symbol'] && $ea_b['type']=="STOP_MARKET") {
						
						
					
						$sl_sil=$binance->order_delete($b_b['symbol'],$ea_b['orderId']);
						echo "delete order:\n";
						print_r($sl_sil);			
						
						$eb_b['takeProfit']=null;
						$eb_b['stopLoss']=null;
						
						echo "stop emri -> ".implode(" ",$eb_b)."\n";
						
						$sl_ticket = $binance->order_send($b_b['symbol'],($b_b['positionSide']=="LONG" ? "BUY" : "SELL"),"SL",$b_b['positionAmt'],$sprice,1);
						
						
						
						}
						
						}
						
					}		
					
				print_r($sl_ticket);
				
				ob_flush();
				flush();
				
				}
				
				
				
				/*
				
				
				$o_ord = $binance->open_orders("");
				
				echo "bingx open_orders:\n";
				print_r($o_ord);
				echo "\n";
				
				foreach($o_ord->data->orders as $a => $b) {
				$b=(array) $b;
				if(str_replace("-","",$b['symbol'])==$symbol and $b['type']=="STOP_MARKET") {
					$sl_sil=$binance->order_delete($symbol,$b['orderId']);
					echo "delete order:\n";
					print_r($sl_sil);
					sleep(1);
				}
				
				}
				
				$sl_ticket = $binance->order_send($symbol,($us['trend']=="LONG" ? "BUY" : "SELL"),"SL",$volume,$sprice,1);
			


				*/


		} else {
		
			$sl_ticket = $binance->order_send($symbol,($us['trend']=="LONG" ? "SELL" : "BUY"),"SL",$volume,$sprice);
		
		}
		
		echo "new_sl_ticket exch:$api_exchange, signal:$signal_id, s_id:$s_id, us_id:$us_id:\n";
		print_rr($sl_ticket);
		
		if($sl_ticket['orderId']>0) {
			

			if($us['sticket']!="" && $api_exchange != "bybit") {
				
				$ord_delete = $binance->order_delete($symbol,$us['sticket']);
				#echo "order_delete:";
				#print_rr($ord_delete);
				trade_log("delete ticket:".print_r($ord_delete,1));
				$my->query("update user_signals set sticket='' where id ='".$us['id']."'");
				
			}		
			
			$sticket=$sl_ticket['orderId'];
			$signal_str = $api_exchange." #$sticket UPDATE $name ".$us['symbol']." yeni_hedef:".$hedef." yeni_sl:".$sprice;
			bildirim_ekle($user_id,$signal_str,0);
			$my->query("update user_signals set sticket='".$sticket."',sl='".$sprice."' where id ='".$us['id']."'") or die($my->error);
			echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $signal_str\n";
			trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $signal_str\n");
		} else {
			
			/*
			$profit=0;
			if($us['trend']=="LONG") {
				
				$profit = ($us['sl']-$us['open'])*$api['lot'];
				$profit = number_format($profit,5,".","");
				
			} else if($us['trend']=="SHORT") {
				
				
				$profit = ($us['open']-$us['sl'])*$api['lot'];
				$profit = number_format($profit,5,".","");
				
			}
			
			$signal_str = $api_exchange." #$us[ticket] CLOSED $name ".$us['symbol']." open:".$us['open']." close:".$us['sl']." profit:".$profit;
			bildirim_ekle($user_id,$signal_str,0);
			echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $signal_str\n";
			$my->query("update user_signals set closed_volume=volume,close=sl,closetime='".date("Y-m-d H:i:s")."',profit='$profit' where id ='".$us['id']."'");
			*/
			sleep(3);
			
		}
		
	}
	
}	

function close_order($sid,$close_price=0,$close_point="",$close_volume=0) {
	global $my,$binance,$api_exchange,$user_id,$s_id,$us_id;
	
	$rsi = $my->query("SELECT * FROM `user_signals` WHERE id='$sid'");
	$us=$rsi->fetch_assoc();
	
	if($us['close']>0) return;

	#echo "user_signal detail:\n";
	#echo implode("\t",$us)."\n";

	$rsi1 = $my->query("SELECT * FROM `signals` WHERE id='$us[signal_id]'");
	$sg=$rsi1->fetch_assoc();

	#echo "signal detail:\n";
	#echo implode("\t",$sg)."\n";


	$api1 = $my->query("SELECT * FROM `apikeys` WHERE id='$us[api_id]'");
	$api=$api1->fetch_assoc();
	$api['order_type']="LIMIT";
	$user_id = $api['user_id'];



	$sm1 = $my->query("select * from rates_server.rates where symbol='$us[symbol]'");
	$sym = $sm1->fetch_assoc();
	
	$symbol = $us["symbol"];
	
	$price = 0;
	$volume=$api['lot'];
	$sprice=$sg['sl'];

	
	$b_orders=array();
	$tamamen_kapandi=0;
	
	$p_risk = $binance->position_risk();	
	$acik_poz = $p_risk[$symbol];
	
	if($acik_poz == 0) {

		$close_price = $us['sl'];
		
		$kapat_volume = $us['volume']-$us['closed_volume'];
		
		#echo "kapat_volume:$kapat_volume  us_volume:$us[volume] us_closed:$us[closed_volume]\n";

		if($sg['trend']=="LONG") {
			
			$profit = ($us['sl']-$us['open'])*$api['lot'];
			$profit = number_format($profit,5,".","");
		
		} else if($us['trend']=="SHORT") {
			
			$profit = ($us['open']-$us['sl'])*$api['lot'];
			$profit = number_format($profit,5,".","");

		}			

		echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $signal_str\n";
		trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $signal_str\n");
		$my->query("update user_signals set close='".$close_price."',closed_volume=(closed_volume+".$kapat_volume."),closetime='".date("Y-m-d H:i:s")."' where id ='".$us['id']."'") or die($my->error);
		$signal_str = $api_exchange." ACIK POZ Bulunamadı ".$us['symbol']." ".$us['trend']." open:".$us['open']." close:".$close_price." lot:".$kapat_volume." profit:".$profit;
		bildirim_ekle($user_id,$signal_str,0);
	
	} else if($us['volume']>$us['closed_volume']) {
		
		$kapat_volume = number_format($us['volume']*($close_volume/100),$sym['vdigits'],".","");
		
		#echo "kapat_poz:\n";
		#echo "kapat_volume: $kapat_volume $us[volume] close_volume:$close_volume  $sym[vdigits]\n";
		
		$min_lot = pow(10,-$sym['vdigits']);
		
		if($kapat_volume<$min_lot) $kapat_volume=$min_lot;
		
		#echo "kapat_volume:$kapat_volume   volume:$us[volume]  close_volume:$close_volume   vdigits:$sym[vdigits]\n";
		
		#echo "closed_volume:$us[closed_volume]+kapat_volume:$kapat_volume>=us_volume:$us[volume]\n";
		
		if($us['closed_volume']+$kapat_volume>=$us['volume']) {
			$kapat_volume = number_format($us['volume']-$us['closed_volume'],$sym['vdigits'],".","");
			$tamamen_kapandi=1;
		}
		
		#echo "closed_volume:$us[closed_volume]+kapat_volume:$kapat_volume>=us_volume:$us[volume] $kapat_volume\n";
		
		$profit = 0;
		$price = 0;
		
		if($api['sltpemir']==1 and $api['stoploss']!=-1) {
			if($sg['trend']=="LONG") {
				
				$price = $sym['price'];
				if($api['order_type']!="LIMIT") {
					$kapat_ticket = $binance->order_send($symbol,"SELL","MARKET",$kapat_volume,$price,1);
				} else {
					$kapat_ticket=array("orderId"=>$us['tticket'],"status"=>"TP_FILLED");
				}
					
				$profit = ($us['sl']-$us['open'])*$api['lot'];
				$profit = number_format($profit,5,".","");
				
			} else if($us['trend']=="SHORT") {
				
				$price = $sym['price'];
				if($api['order_type']!="LIMIT") {
					$kapat_ticket = $binance->order_send($symbol,"BUY","MARKET",$kapat_volume,$price,1);
				} else {
					$kapat_ticket=array("orderId"=>$us['tticket'],"status"=>"TP_FILLED");
				}
					
				$profit = ($us['open']-$us['sl'])*$api['lot'];
				$profit = number_format($profit,5,".","");


			}	
		}
		
		#echo "kapat_ticket:\n";
		#print_rr($kapat_ticket);
		#print_r("kapat_ticket\n");
		#print_r($kapat_ticket);
		
		$order_ticket = $kapat_ticket['orderId'];
		$order_status = $kapat_ticket['status'];


		if($order_ticket>0) {
			
			$results = "#".$order_ticket." ".$symbol." ".$kapat_volume." ".$us['trend']." ".$price." #".$order_ticket." ".$profit." ".date("Y-m-d H:i:s")." ".$order_status;
			#echo($api['exchange']."[u".$user_id."] [s".$us['signal_id']."] [".$api['id']."] ->".$symbol."->".$us['trend']." results : ".$results."\n");
			
			trade_log($results);
			
			if($tamamen_kapandi==0) {

				$signal_str = $api_exchange." PARTIAL CLOSED ".$us['symbol']." ".$us['trend']." open:".$us['open']." close:".$price." lot:".$kapat_volume." profit:".$profit;
				
				echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $signal_str\n";
				trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $signal_str\n");
				$my->query("update user_signals set tp='".$close_price."',closed_volume=(closed_volume+".$kapat_volume.") where id ='".$us['id']."'") or die($my->error);
				bildirim_ekle($user_id,$signal_str,0);
			} else {
 
				$signal_str = $api_exchange." CLOSED ".$us['symbol']." ".$us['trend']." open:".$us['open']." close:".$price." lot:".$kapat_volume." profit:".$profit;
				echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $signal_str\n";
				trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $signal_str\n");
				$my->query("update user_signals set close='".$close_price."',closed_volume=(closed_volume+".$kapat_volume."),closetime='".date("Y-m-d H:i:s")."' where id ='".$us['id']."'") or die($my->error);
				bildirim_ekle($user_id,$signal_str,0);
			}
				
		} else {

			$error_code = $kapat_ticket['code'];
			$error_msg = stripslashes($kapat_ticket['msg']);
			$error_msg = str_replace("'","",$error_msg);
			$error_msg = str_replace("\"","",$error_msg);
			
			if ($error_code == "-100") {
				
				$kapat_volume = $api['lot'];
				
				if($us['trend']=="LONG") {
										
					$profit = ($us['sl']-$us['open'])*$api['lot'];
					$profit = number_format($profit,5,".","");

				} else {
											
					$profit = ($us['open']-$us['sl'])*$api['lot'];
					$profit = number_format($profit,5,".","");

				}
				
				$signal_str = $api_exchange." CLOSED ".$us['symbol']." ".$us['trend']." open:".$us['open']." close:".$price." lot:".$kapat_volume." profit:".$profit;
				$new_sql = "update user_signals set close='".$price."',closetime='".date("Y-m-d H:i:s")."',status=1 where id = '".$us['id']."'";
				echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $signal_str\n";
				trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $signal_str\n");
				$my->query($new_sql) or die($my->error);	
				bildirim_ekle($user_id,$signal_str,0);
				
				
				
			} else {
				
				if($price==0)$price=$us['sl'];
				if($price==0)$price=$sg['entry1'];
				#$signal_str = $api_exchange." Emir kapatılamadı. CLOSE ".$us['symbol']." ".$us['trend']." ERROR price:".$price." code:".$error_code." msg:".$error_msg;
				#bildirim_ekle($user_id,$signal_str,0);
				$new_sql = "update user_signals set close='".$price."',closetime='".date("Y-m-d H:i:s")."',status=2,event='".$error_code."|".$error_msg."' where id = '".$us['id']."'";
				echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $signal_str\n";
				trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $signal_str\n");
				$my->query($new_sql);	
				
			}
			
		}	

	}
	
	
}	

$fba=0;

while ($loop_signal) {
	

	$aa1 = $my->query("SELECT * FROM user_signals where id = '".$signal_id."';");
	$aa = $aa1->fetch_assoc();


	if($aa['id']>0) { } else { 
		echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] ".$api['name']." ".$signal['symbol']." ".$signal['trend']." -> user_signals bulunamadı signal_id:".$signal_id."\n"; 
		trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] ".$api['name']." ".$signal['symbol']." ".$signal['trend']." -> user_signals bulunamadı signal_id:".$signal_id."\n");
		break; 
	}
	


	$rsi1 = $my->query("SELECT * FROM `signals` WHERE id='$us[signal_id]'");
	$signal=$rsi1->fetch_assoc();


	$sm1 = $my->query("select * from rates_server.rates where symbol='$us[symbol]'");
	$sym = $sm1->fetch_assoc();
	

	$ask = doubleval($sym['price']);
	$bid = doubleval($sym['price']);

	if($ask>0 && $bid>0) {
		
	} else {
		break;
	}	
	
	//print_r($signal);
	//print_r($aa);

	if ((($signal['close']>0) || $aa['ticket']==-1) && $is_test!=2) {  
		echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] ".$api['name']." ".$signal['symbol']." ".$signal['trend']." ->  #".$aa['ticket']." sinyal kapandı close:".$aa['close']."\n"; 
		trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] ".$api['name']." ".$signal['symbol']." ".$signal['trend']." ->  #".$aa['ticket']." sinyal kapandı close:".$aa['close']."\n");
		break; 
	}
	
	$symbol = $signal['symbol'];
	
	if($binance->digits==0) $binance->digits=$sym['digits'];
	if($binance->vdigits==0) $binance->vdigits=$sym['vdigits'];
	
	$bid = $sym['price'];
	$ask = $sym['price'];
	
	if ($ask == "" || $bid == "") continue;
	
	if($fba==0 || $admin_ok==1) {
		echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] ".$api['user_id']." ".$api['name']." ".$signal['symbol']." ".$signal['trend']." ".$signal['opendate']." b:".$bid." a:".$ask." #".$aa['ticket']." o:".$aa['open']." ".$aa['opentime']." c:".$aa['close']." ".$aa['closetime']."\n";
		trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] ".$api['user_id']." ".$api['name']." ".$signal['symbol']." ".$signal['trend']." ".$signal['opendate']." b:".$bid." a:".$ask." #".$aa['ticket']." o:".$aa['open']." ".$aa['opentime']." c:".$aa['close']." ".$aa['closetime']."\n");
		$fba=1;
	}
	
	$last_bid = $bid;
	$last_ask = $ask;
		

		if ( $signal['trend'] == "LONG" ) {
			
			if($aa['close']>0 && $aa['volume']<=$aa['closed_volume']) {
				#echo("cmd_user_signal(".$signal_id.") ".$api['user_id']." ".$api['name']." ".$signal['symbol']." ".$signal['trend']." -> sinyal kapandığı için durduruldu $aa[close]:".$aa['close'].". 2041\n");					
				echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id]  ".$signal['symbol']." ".$signal['trend']." -> sinyal kapandığı için durduruldu close:".$aa['close']." \n";
				trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id]  ".$signal['symbol']." ".$signal['trend']." -> sinyal kapandığı için durduruldu close:".$aa['close']." \n");
				//trade_log(user_id,signal_id+" "+$signal['symbol']+" "+$signal['trend']+" pozisyonu takibi tamamlandı. volume:"+$aa['volume']+" closed_volume:"+$aa['closed_volume'])
				break;
			} else if ((($admin_ok==1) || ($aa['open'] == 0 && strtotime($signal['tarih'])>0 && strtotime($signal['tarih'])+$signal_cancel_seconds>time())) && $is_test!=2 && $bir_kere_ac==0 /* && aralikta(signal.entry1,signal.entry2,$sym['price'])*/ ) {
				create_order($sid);
				$bir_kere_ac=1;
			} else if ($aa['open']>0 && $aa['close']==0) {	
				
				
				$new_sl = 0;
				$new_tp = 0;
				
				if($aa['sticket']=="" && $api['sltpemir']==1 && $aa['sl_wait']+$sl_tp_wait_seconds<time() && $api['stoploss'] != -1) {
					
					if($aa['sl']>0) {
						$new_sl = $aa['sl'];
					} else if($api['stoploss']==0) {
						$new_sl = $signal['sl'];
					} else if($api['stoploss']>0) {
						$new_sl = number_format($sym['price']*((100-$api['stoploss'])/100),$sym['digits'],".","");
					}
					
					if($new_sl>0) {
						// $send_json = {"symbol":$signal['symbol'],"side":"SELL","type":"STOP_MARKET","closePosition":"true","stopPrice":new_sl};	
						$sl_ticket = $binance->order_send($signal['symbol'],"SELL","SL",$aa['volume'],$new_sl);
						echo "fix sl:\n";
						print_r($sl_ticket);						
						$sl_order_id=0;
						if($sl_ticket['orderId']!="") {
							$my->query("update user_signals set sl='".$new_sl."',sl_wait='".time()."',sticket='".$sl_ticket['orderId']."' where id ='".$aa['id']."'");		
							echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] fix broken sl #$sl_ticket[orderId] new_sl:$new_sl\n";
							trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] fix broken sl #$sl_ticket[orderId] new_sl:$new_sl\n");
							$aa['sl'] = $new_sl;
							$sl_order_id=$sl_ticket['orderId'];
						} else {
							
							$error_code = $sl_ticket['code'];
							$error_msg = stripslashes($sl_ticket['msg']);
							$error_msg = str_replace("'","",$error_msg);
							$error_msg = str_replace("\"","",$error_msg);
							
							$p_risk = $binance->position_risk();	
							$acik_poz = $p_risk[$signal['symbol']];
							
							if($acik_poz==0) {

								$close_price = $aa['sl'];
								
								$kapat_volume = $aa['volume']-$aa['closed_volume'];

								if($aa['trend']=="LONG") {
									
									$profit = ($aa['sl']-$aa['open'])*$api['lot'];
									$profit = number_format($profit,5,".","");
									
									
								} else if($aa['trend']=="SHORT") {
									
									$profit = ($aa['open']-$aa['sl'])*$api['lot'];
									$profit = number_format($profit,5,".","");

								}			

								$signal_str = $api_exchange." N-CLOSED ".$aa['symbol']." ".$aa['trend']." open:".$aa['open']." close:".$close_price." lot:".$kapat_volume." profit:".$profit;
								echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $signal_str\n";
								trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $signal_str\n");
								$my->query("update user_signals set close='".$close_price."',closed_volume=(closed_volume+".$kapat_volume."),closetime='".date("Y-m-d H:i:s")."' where id ='".$aa['id']."'") or die($my->error);
								bildirim_ekle($user_id,$signal_str,0);
														
							
							} else if($error_code == "-4130") {
								
								$open_orders = $binance->open_orders($symbol);
								
								foreach($open_orders as $op1 => $op2) {
									if($op2['symbol'] == $symbol and $op2['type'] == "STOP_MARKET") {
										$cancel_stop = $binance->order_delete($symbol,$op2['orderId']);
										echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] cancel_order(".$op2['orderId'].")  symbol:".$op2['symbol']."\n";
										trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] cancel_order(".$op2['orderId'].")  symbol:".$op2['symbol']."\n");
										#print_rr($cancel_stop);
									}
								}
								
								$my->query("update user_signals set sticket='' where id ='".$aa['id']."'");		
								
							} else {
								
								$sticket = -1;
								
								if(stristr($error_msg,"orders or positions are available")) {
									$sticket=$us_id;
								}
							
								$my->query("update user_signals set sticket='$sticket',sl_wait='".time()."',event='".$error_code."|".$error_msg."' where id ='".$aa['id']."'");		
								#echo "fix sl error code:$error_code  err:$error_msg \n";
								echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] fix sl error code:$error_code  err:$error_msg\n";
								trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] fix sl error code:$error_code  err:$error_msg\n");
							}
							
						}
					
						#echo ("fix_sl_order[".$signal_id."]\n");
						#print_rr($sl_ticket);
						
					}
				
				}
				
				if($aa['tticket']=="" && $api['sltpemir']==1) {
					
									
					$tprice = 0;
				
					for($i=1;$i<=10;$i++) {
						if($signal['tp'.$i]>0) {
							$tprice=number_format($signal['tp'.$i],$sym['digits'],".","");
						}
					}
					
					if($api['takeprofit']==0) {
						$new_tp = $tprice;
					} else if($api['takeprofit']==-1) {
						$new_tp = ($signal['tp1']);
					} else if($api['takeprofit']==-2) {
						$new_tp = ($signal['tp2']);
					} else if($api['takeprofit']==-3) {
						$new_tp = ($signal['tp3']);
					} else if($api['takeprofit']==-4) {
						$new_tp = ($signal['tp4']);
					} else if($api['takeprofit']==-5) {
						$new_tp = ($signal['tp5']);
					} else if($api['takeprofit']==-6) {
						$new_tp = ($signal['tp6']);
					} else if($api['takeprofit']==-7) {
						$new_tp = ($signal['tp7']);
					} else if($api['takeprofit']==-8) {
						$new_tp = ($signal['tp8']);
					} else if($api['takeprofit']==-9) {
						$new_tp = ($signal['tp9']);
					} else if($api['takeprofit']==-10) {
						$new_tp = ($signal['tp10']);
					} else if($api['takeprofit']>0) {
						$new_tp = ($sym['price']*((100+$api['takeprofit'])/100));
					}
					
					if($new_tp>0 && $aa['tp_wait']+$sl_tp_wait_seconds<time() && $api['sltpemir']==1) {
						#$send_json = {symbol:$signal['symbol'],side:"SELL",type:"TAKE_PROFIT_MARKET","closePosition":"true","stopPrice":new_tp};	
						$tp_ticket = $binance->order_send($signal['symbol'],"SELL","TP",$aa['volume'],$new_tp);
						echo "fix tp:\n";
						print_r($tp_ticket);
						
						$tp_order_id=0;
						
						if($tp_ticket['orderId']!="") {
							
							$my->query("update user_signals set tticket='".$tp_ticket['orderId']."',tp_wait='".time()."' where id ='".$aa['id']."'");		
							$tp_order_id=$tp_ticket['orderId'];
							echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] fix broken tp #$tp_ticket[orderId] new_tp:$new_tp\n";
							trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] fix broken tp #$tp_ticket[orderId] new_tp:$new_tp\n");
						} else {
							

							$error_code = $tp_ticket['code'];
							$error_msg = stripslashes($tp_ticket['msg']);
							$error_msg = str_replace("'","",$error_msg);
							$error_msg = str_replace("\"","",$error_msg);

							
							$p_risk = $binance->position_risk();	
							$acik_poz = $p_risk[$signal['symbol']];
							
							if($acik_poz==0) {

								$close_price = $aa['sl'];
								
								$kapat_volume = $aa['volume']-$aa['closed_volume'];

								if($aa['trend']=="LONG") {
									
									$profit = ($aa['sl']-$aa['open'])*$api['lot'];
									$profit = number_format($profit,5,".","");
									
									
								} else if($aa['trend']=="SHORT") {
									
									$profit = ($aa['open']-$aa['sl'])*$api['lot'];
									$profit = number_format($profit,5,".","");
									

								}			

								$signal_str = $api_exchange." N-CLOSED ".$aa['symbol']." ".$aa['trend']." open:".$aa['open']." close:".$close_price." lot:".$kapat_volume." profit:".$profit;
								echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $signal_str\n";
								trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $signal_str\n");
								$my->query("update user_signals set close='".$close_price."',closed_volume=(closed_volume+".$kapat_volume."),closetime='".date("Y-m-d H:i:s")."' where id ='".$aa['id']."'") or die($my->error);
								bildirim_ekle($user_id,$signal_str,0);
														
							
							} else if($error_code == "-4130") {
								
								$open_orders = $binance->open_orders($symbol);
								
								foreach($open_orders as $op1 => $op2) {
									if($op2['symbol'] == $symbol and $op2['type'] == "TAKE_PROFIT_MARKET") {
										$cancel_stop = $binance->order_delete($symbol,$op2['orderId']);
										echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] cancel_order(".$op2['orderId'].") TAKE_PROFIT_MARKET symbol:".$op2['symbol']."\n";
										#print_rr($cancel_stop);
										trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] cancel_order(".$op2['orderId'].") TAKE_PROFIT_MARKET symbol:".$op2['symbol']."\n");
									}
								}
								
								$my->query("update user_signals set tticket='' where id ='".$aa['id']."'");		
								
							} else {
															
								
								$tticket = -1;
								
								if(stristr($error_msg,"orders or positions are available")) {
									$tticket=$us_id;
								}
								
								$my->query("update user_signals set tticket='$tticket',tp_wait='".time()."',event='".$error_code."|".$error_msg."' where id ='".$aa['id']."'");		
								echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] fix tp error code:$error_code  err:$error_msg\n";
								trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] fix tp error code:$error_code  err:$error_msg\n");
								
							}
							
						}
						#echo ("fix_tp_order[".$signal_id."] ");
						#print_rr($tp_ticket);
		
					}
					
					create_limit_tp($sid);
				
				}
				
				if($api['trailstop']<0) {
						
					for($y=abs($api['trailstop']);$y<10;$y++) {
						
						
						$a_sl_price = 0;
						$a_sl_id = $y-abs($api['trailstop']);
						if($a_sl_id==0) {
							$new_sl=$aa['open'];
						} else {
							$new_sl=$signal['tp'.$a_sl_id];
						}
						
						if($signal['tp'.$y]<=$sym['price'] && $signal['tp'.$y]>0 && ($aa['sl']<$new_sl || $aa['sl']==0)) {

							echo "trail_stop $y api_tsl:".$api['trailstop']." a_sl_id:".$a_sl_id." new_sl:$new_sl signal_tp_y:".$signal['tp'.$y]." bid:".$sym['price']." aa_sl:".$aa['sl']."\n";
							trade_log("trail_stop $y api_tsl:".$api['trailstop']." a_sl_id:".$a_sl_id." new_sl:$new_sl signal_tp_y:".$signal['tp'.$y]." bid:".$sym['price']." aa_sl:".$aa['sl']."\n");							
							trail_stop($sid,"TRAILSTOP ".($a_sl_id+1),$signal['tp'.$y],$new_sl,$aa['volume']);
							$aa['sl']=$new_sl;
						}
					}
					
				} else if($api['trailstop']>0) {
					
					$tsl = ($aa['open']*((100+$api['trailstop'])/100));
					$tsp = ($aa['open']*((100+$api['trailstep'])/100));
					
					$tsl_fark = $tsl-$aa['open'];
					$tsp_fark = $tsp-$aa['open'];
					$min_val = pow(10,$sym['digits']*-1);
					if($tsl_fark<$min_val) $tsl_fark=$min_val;
					if($tsp_fark<$min_val) $tsp_fark=$min_val;
					
					$new_tsl_open = ($aa['open'])+($tsl_fark)+($tsp_fark);
					$new_tsl_sl = ($aa['sl'])+($tsl_fark)+($tsp_fark);
					$new_tsl = ($sym['price'])-($tsl_fark);
					
					$new_tsl_open = ($new_tsl_open);
					$new_tsl_sl = ($new_tsl_sl);
					$new_tsl = ($new_tsl);
					
					if( ($aa['sl'] == 0 || $aa['sl']<$aa['open']) && $new_tsl_open<=$sym['price'] ) {
						trail_stop($sid,"NEW TSL",$new_tsl_open,$new_tsl,$aa['volume']);
					} else if ($aa['sl']>$aa['open'] && $new_tsl_sl<=$sym['price']) {
						trail_stop($sid,"NEW TSL 2",$new_tsl_sl,$new_tsl,$aa['volume']);
					}
					
				} 
				
				if($api['maliyetinecek']>0) {
					
					for($i=1;$i<10;$i++) {
						if ($sym['price']>=$signal['tp'.$i] && $signal['tp'.$i]>0 && $api['maliyetinecek']==$i && ($aa['sl']<$aa['open'] || $aa['sl']==0)) {
							trail_stop($sid,"MALIYETINE CEK ".$i,$signal['tp'.$i],$aa['open'],$aa['volume']);
						}	
					}
				}
				
				for($i=0;$i<=10;$i++) {
					
					if($aa['closetime']!="") break;
					
					if($i==0) {
					
						if ($aa['sl']>0 && $api['stoploss'] != -1 && $sym['price']<=$aa['sl']) {
							close_order($sid,$aa['sl'],"SL",100);
							break;					
						}
						
					} else {
						
						if ($sym['price']>=$signal['tp'.$i] && ($aa['tp']==0 || $aa['tp']<$signal['tp'.$i]) && $signal['tp'.$i]>0 && $api['tp'.$i]>0) {
							close_order($sid,$signal['tp'.$i],"TP ".$i,$api['tp'.$i]);
							break;
						}				
							
					}	
						
				}
				

			}
			
		

		} else if ( $signal['trend'] == "SHORT" ) {
			
			if($aa['close']>0 && $aa['volume']<=$aa['closed_volume']) {
				#echo("cmd_user_signal(".$signal_id.") ".$api['user_id']." ".$api['name']." ".$signal['symbol']." ".$signal['trend']." -> sinyal kapandığı için durduruldu $aa[close]:".$aa['close'].". 2041");					
				echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id]  ".$signal['symbol']." ".$signal['trend']." -> sinyal kapandığı için durduruldu close:".$aa['close']." \n";
				trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id]  ".$signal['symbol']." ".$signal['trend']." -> sinyal kapandığı için durduruldu close:".$aa['close']." \n");

				break;
			} else if ((($admin_ok==1) || ($aa['open'] == 0 && strtotime($signal['tarih'])>0 && strtotime($signal['tarih'])+$signal_cancel_seconds>time())) && $is_test!=2  && $bir_kere_ac==0 /* && aralikta(signal.entry1,signal.entry2,$sym['price'])*/ ) {
				create_order($sid);
				$bir_kere_ac=1;
			} else if ($aa['open']>0 && $aa['close']==0) {	
				

				$new_sl = 0;
				$new_tp = 0;
				
				if($aa['sticket']<1 && $aa['sl_wait']+$sl_tp_wait_seconds<time() && $api['stoploss'] != -1) {
					
					if($aa['sl']>0) {
						$new_sl = ($aa['sl']);
					} else if($api['stoploss']==0) {
						$new_sl = ($signal['sl']);
					} else if($api['stoploss']>0) {
						$new_sl = ($sym['price']*((100+$api['stoploss'])/100));
					}
					
					if($new_sl>0) {
						$sl_ticket = $binance->order_send($signal['symbol'],"BUY","SL",$aa['volume'],$new_sl);
						if($sl_ticket['orderId']>0) {
							$my->query("update user_signals set sl='".$new_sl."',sl_wait='".time()."',sticket='".$sl_ticket['orderId']."' where id ='".$aa['id']."'");		
							$aa['sl'] = ($new_sl);
							echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] fix broken sl #$sl_ticket[orderId] new_sl:$new_sl\n";
						} else {
							

							$error_code = $sl_ticket['code'];
							$error_msg = stripslashes($sl_ticket['msg']);
							$error_msg = str_replace("'","",$error_msg);
							$error_msg = str_replace("\"","",$error_msg);
							

							
							$p_risk = $binance->position_risk();	
							$acik_poz = $p_risk[$signal['symbol']];
							
							if($acik_poz==0) {

								$close_price = $aa['sl'];
								
								$kapat_volume = $aa['volume']-$aa['closed_volume'];

								if($aa['trend']=="LONG") {
									
									
									$profit = ($aa['sl']-$aa['open'])*$api['lot'];
									$profit = number_format($profit,5,".","");
									
									
								} else if($aa['trend']=="SHORT") {
									
									
									$profit = ($aa['open']-$aa['sl'])*$api['lot'];
									$profit = number_format($profit,5,".","");
									

								}			

								$signal_str = $api_exchange." N-CLOSED ".$aa['symbol']." ".$aa['trend']." open:".$aa['open']." close:".$close_price." lot:".$kapat_volume." profit:".$profit;
								echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $signal_str\n";
								trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $signal_str\n");
								$my->query("update user_signals set close='".$close_price."',closed_volume=(closed_volume+".$kapat_volume."),closetime='".date("Y-m-d H:i:s")."' where id ='".$aa['id']."'") or die($my->error);
								bildirim_ekle($user_id,$signal_str,0);
														
							
							} else if($error_code == "-4130") {
								
								$open_orders = $binance->open_orders($symbol);
								
								foreach($open_orders as $op1 => $op2) {
									if($op2['symbol'] == $symbol and $op2['type'] == "STOP_MARKET") {
										$cancel_stop = $binance->order_delete($symbol,$op2['orderId']);
										echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] cancel_order(".$op2['orderId'].")  symbol:".$op2['symbol']."\n";
										trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] cancel_order(".$op2['orderId'].")  symbol:".$op2['symbol']."\n");
										#print_rr($cancel_stop);
									}
								}
								
								$my->query("update user_signals set sticket='' where id ='".$aa['id']."'");		
								
							} else {
								
								
								$sticket = -1;
								
								if(stristr($error_msg,"orders or positions are available")) {
									$sticket=$us_id;
								}
								
								$my->query("update user_signals set sticket='$sticket',sl_wait='".time()."',event='".$error_code."|".$error_msg."' where id ='".$aa['id']."'");		
								echo "fix sl error code:$error_code  err:$error_msg \n";
								trade_log("fix sl error code:$error_code  err:$error_msg \n");
								echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] fix sl error code:$error_code  err:$error_msg\n";
								trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] fix sl error code:$error_code  err:$error_msg\n");
							
							}
							
							
						}
						#echo("fix_sl_order[".$signal_id."] ");
						#print_rr($sl_ticket);
					}
				
				}
			
				if($aa['tticket']<1 && $api['sltpemir']==1) {
						
									
					$tprice = 0;
				
					for($i=1;$i<=10;$i++) {
						if($signal['tp'.$i]>0) {
							$tprice=number_format($signal['tp'.$i],$sym['digits'],".","");
						}
					}
					if($api['takeprofit']==0) {
						$new_tp = $tprice;
					} else if($api['takeprofit']==-1) {
						$new_tp = ($signal['tp1']);
					} else if($api['takeprofit']==-2) {
						$new_tp = ($signal['tp2']);
					} else if($api['takeprofit']==-3) {
						$new_tp = ($signal['tp3']);
					} else if($api['takeprofit']==-4) {
						$new_tp = ($signal['tp4']);
					} else if($api['takeprofit']==-5) {
						$new_tp = ($signal['tp5']);
					} else if($api['takeprofit']==-5) {
						$new_tp = ($signal['tp5']);
					} else if($api['takeprofit']==-6) {
						$new_tp = ($signal['tp6']);
					} else if($api['takeprofit']==-7) {
						$new_tp = ($signal['tp7']);
					} else if($api['takeprofit']==-8) {
						$new_tp = ($signal['tp8']);
					} else if($api['takeprofit']==-9) {
						$new_tp = ($signal['tp9']);
					} else if($api['takeprofit']==-10) {
						$new_tp = ($signal['tp1']);
						
					} else if($api['takeprofit']>0) {
						$new_tp = ($sym['price']*((100-$api['takeprofit'])/100));
					}
					
					if($new_tp>0 && $aa['tp_wait']+$sl_tp_wait_seconds<time()) {
						$tp_ticket = $binance->order_send($signal['symbol'],"BUY","TP",$aa['volume'],$new_tp);
						if($tp_ticket['orderId']>0) {
							$my->query("update user_signals set tticket='".$tp_ticket['orderId']."',tp_wait='".time()."' where id ='".$aa['id']."'");		
							echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] fix broken tp #$tp_ticket[orderId] new_tp:$new_tp\n";
							trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] fix broken tp #$tp_ticket[orderId] new_tp:$new_tp\n");
							
						} else {
							


							$error_code = $tp_ticket['code'];
							$error_msg = stripslashes($sl_ticket['msg']); 
							$error_msg = str_replace("'","",$error_msg);
							$error_msg = str_replace("\"","",$error_msg);
							
							
							
							$p_risk = $binance->position_risk();	
							$acik_poz = $p_risk[$signal['symbol']];
							
							if($acik_poz==0) {

								$close_price = $aa['sl'];
								
								$kapat_volume = $aa['volume']-$aa['closed_volume'];

								if($aa['trend']=="LONG") {
									
									$profit = ($aa['sl']-$aa['open'])*$api['lot'];
									$profit = number_format($profit,5,".","");
																		
									
								} else if($aa['trend']=="SHORT") {
									
									$profit = ($aa['open']-$aa['sl'])*$api['lot'];
									$profit = number_format($profit,5,".","");
									

								}			

								$signal_str = $api_exchange." N-CLOSED ".$aa['symbol']." ".$aa['trend']." open:".$aa['open']." close:".$close_price." lot:".$kapat_volume." profit:".$profit;
								echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $signal_str\n";
								trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $signal_str\n");
								$my->query("update user_signals set close='".$close_price."',closed_volume=(closed_volume+".$kapat_volume."),closetime='".date("Y-m-d H:i:s")."' where id ='".$aa['id']."'") or die($my->error);
								bildirim_ekle($user_id,$signal_str,0);
														
							
							} else if($error_code == "-4130") {
								
								$open_orders = $binance->open_orders($symbol);
								
								foreach($open_orders as $op1 => $op2) {
									if($op2['symbol'] == $symbol and $op2['type'] == "TAKE_PROFIT_MARKET") {
										$cancel_stop = $binance->order_delete($symbol,$op2['orderId']);
										echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] cancel_order(".$op2['orderId'].") TAKE_PROFIT_MARKET symbol:".$op2['symbol']."\n";
										trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] cancel_order(".$op2['orderId'].") TAKE_PROFIT_MARKET symbol:".$op2['symbol']."\n");
										#print_rr($cancel_stop);
									}
								}
								
								$my->query("update user_signals set tticket='' where id ='".$aa['id']."'");		
								
							} else {
										
								$tticket = -1;
								
								if(stristr($error_msg,"orders or positions are available")) {
									$tticket=$us_id;
								}
								
								$my->query("update user_signals set tticket='$tticket',tp_wait='".time()."',event='".$error_code."|".$error_msg."' where id ='".$aa['id']."'");		
								#echo "fix tp error code:$error_code  err:$error_msg \n";
								echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] fix tp error code:$error_code  err:$error_msg\n";
								trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] fix tp error code:$error_code  err:$error_msg\n");
															
							}
							
						}
						#echo("fix_tp_order[".$signal_id."] ");
						#print_rr(($tp_ticket));
		
					}
				
				}
				
				if($api['trailstop']<0) {
		
					for($y=abs($api['trailstop']);$y<10;$y++) {
						
						$a_sl_price = 0;
						$a_sl_id = $y-abs($api['trailstop']);
						if($a_sl_id==0) {
							$new_sl=$aa['open'];
						} else {
							$new_sl=$signal['tp'.$a_sl_id];
						}
						
						if($signal['tp'.$y]>=$sym['price'] && $signal['tp'.$y]>0 && ($aa['sl']>$new_sl || $aa['sl']==0)) {
							trail_stop($sid,"TRAILSTOP ".($a_sl_id+1),$signal['tp'.$y],$new_sl,$aa['volume']);
							$aa['sl']=$new_sl;
						}
						
					}
										
				} else if($api['trailstop']>0) {
					
					$tsl = ($aa['open']*((100-$api['trailstop'])/100));
					$tsp = ($aa['open']*((100-$api['trailstep'])/100));
					
					$tsl_fark = (($aa['open']-$tsl));
					$tsp_fark = (($aa['open']-$tsp));
					$min_val = pow(10,$sym['digits']*-1);
					if($tsl_fark<$min_val) $tsl_fark=$min_val;
					if($tsp_fark<$min_val) $tsp_fark=$min_val;
					
					$new_tsl_open = ($aa['open'])-($tsl_fark)-($tsp_fark);
					$new_tsl_sl = ($aa['sl'])-($tsl_fark)-($tsp_fark);
					$new_tsl = ($sym['price'])+($tsl_fark);
					
					if( ($aa['sl'] == 0 || $aa['sl']>$aa['open']) && $new_tsl_open>=$sym['price'] ) {
						trail_stop($sid,"NEW TSL",$new_tsl_open,$new_tsl,$aa['volume']);
					} else if ($aa['sl']<$aa['open'] && $new_tsl_sl>=$sym['price']) {
						trail_stop($sid,"NEW TSL 2",$new_tsl_sl,$new_tsl,$aa['volume']);
					}
					
				} 
					
				if($api['maliyetinecek']>0) {
					
					for($i=1;$i<10;$i++) {
						if ($sym['price']<=$signal['tp'.$i] && $signal['tp'.$i]>0 && $api['maliyetinecek']==$i && ($aa['sl']>$aa['open'] || $aa['sl']==0)) {
							trail_stop($sid,"MALIYETINE CEK ".$i,$signal['tp'.$i],$aa['open'],$aa['volume']);
						}	
					}
				}
				
				for($i=0;$i<=10;$i++) {
					if($aa['closetime']!="") break;
					if($i==0) {
					
						if ($aa['sl']>0 && $api['stoploss'] != -1 && $api['sltpemir']==1 && $sym['price']>=$aa['sl']) {
							close_order($sid,$aa['sl'],"SL",100);
							break;					
						}
						
					} else {
						
						if ($sym['price']<=$signal['tp'.$i] && ($aa['tp']==0 || $aa['tp']<$signal['tp'.$i]) && $signal['tp'.$i]>0 && $api['tp'.$i]>0) {
							close_order($sid,$signal['tp'.$i],"TP ".$i,$api['tp'.$i]);
							break;
						}				
							
					}	
						
				}
				



			}
			
		}		
		
	
	
	
	
	
	
	flush();
	ob_flush();
	
	sleep(1);
}

$my->close();



?>