<?php
include("mysql.php");

$cli_ok = 0;
$admin_ok = 0;
$is_test = 0;

if(php_sapi_name()==="cli") {
	if ($argc < 3) {
		die("Kullanım: php run_user.php <signal_id> <channel_name>\n");
	}
	$cli_ok=1; 
	$sid = $argv[1];
	$channel = $argv[2];
}else if(isset($_GET['anahtar']) && $_GET['anahtar']=="2023") { 
	$admin_ok=1; 
	$sid = $_GET['run'];
	$is_test = $_GET['test'] ?? 0;
	$channel = $p_name;
	echo "<pre>";

}else { 
  die("Not Running from CLI or invalid key");
}
#print_r($argv);

$sl_tp_wait_seconds=15;
$signal_cancel_seconds=(60*30); 

$bir_kere_ac=0;
$signal_id = $sid;
$bildirim_gonder=1;
$pid = getmypid();

# php run_user.php 1 0 hknvip3

$my->query("update `user_signals` set `open`='',`opentime`='',`close`='',`closetime`='',`ticket`='' where `id` = '$sid';");


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


$api1 = $my->query("SELECT * FROM `api_keys` WHERE id='$us[api_id]'");
$api=$api1->fetch_assoc();
$api['order_type']="LIMIT";

$user_id = $api['user_id'];
$s_id = $sg['id'];
$us_id = $us['id'];
$signal_id = $us_id;
$sess_id = $user_id;



$sm1 = $my->query("select * from rates where symbol='$us[symbol]'");
$sym = $sm1->fetch_assoc();

$symbol = $us["symbol"];

//echo "api detail:\n";
//echo implode("\t",$api)."\n";

//die;


$api_key=$api['api_key'];
$api_secret=$api['api_secret'];

if ($api['api_type'] == 1) {
    $exchange = 'binance';
    $binance = new rbinance($api_key, $api_secret);
} elseif ($api['api_type'] == 2) {
    $exchange = 'bybit';
    $binance = new rbybit($api_key, $api_secret);
} elseif ($api['api_type'] == 3) {
    $exchange = 'bingx';
    $binance = new rbingx($api_key, $api_secret);
} else {
    die("Geçersiz api_type değeri: " . $api['api_type']);
}
$api_exchange = $exchange;


if (empty($api['bot_room'])) {
	echo "API Anahtarı için işlem yapılacak kanal (bot_room) ayarlanmamış. İşlem durduruldu.\n";
	die;
}


$telegram_url = "https://api.telegram.org/bot".$server_api_key."/getChatMember?chat_id=-100".$api['bot_room']."&user_id=".$user_id;
$telegram_response = @file_get_contents($telegram_url);

if ($telegram_response === false) {
    echo "Telegram API'sine ulaşılamadı. Lütfen .env dosyasındaki TELEGRAM_BOT_TOKEN ayarını ve bot'un internet erişimini kontrol edin.\n";
    die;
}

$json = json_decode($telegram_response);
print_r($json);

if(isset($json->result->status) && ($json->result->status=="member" || $json->result->status=="creator"|| $json->result->status=="administrator")) {
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
				if($b2['notionalCap']>$api['lotsize'] && $prev_not<=$api['lotsize'] && $user_leverage>$b2['initialLeverage']) {
					$user_leverage = $b2['initialLeverage'];
				}
				$prev_not = $b2['notionalCap'];
			}
			
		}
		
	}

} else if($exchange=="bingx") {
	
	$sym_leverage = $leverages->data;
	
	if($sg['direction']=="LONG") {
		if($user_leverage>$sym_leverage->maxLongLeverage) {
			$user_leverage = $sym_leverage->maxLongLeverage;
		}
	} else if($sg['direction']=="SHORT") {
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
			
			$min_lot = $s2['lotSizeFilter']['minTradingQty'] ?? $s2['lotSizeFilter']['minOrderQty'];
			if($min_lot=="") {
				$min_lot=$s2['lotSizeFilter']['minOrderQty'];
			}
			$min_lot_parts = explode(".",(string)$min_lot);
			$bysym['vdigits'] = isset($min_lot_parts[1]) ? strlen($min_lot_parts[1]) : 0;
			
			$min_price = $s2['priceFilter']['minPrice'];
			$min_price_parts = explode(".",(string)$min_price);
			$bysym['digits'] = isset($min_price_parts[1]) ? strlen($min_price_parts[1]) : 0;


			echo "bysym:\n";
			print_r($bysym);
			$max_lots[$symbol] = $s2['lotSizeFilter']['maxOrderQty'];
		}
		
	}

}


$loop_signal=true;

if(false && strtotime($sg['created_at'])>0 && $cli_ok==1 && strtotime($sg['created_at'])+$signal_cancel_seconds<time() and $sg['open_price']>0 and $us['open']==0) {


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
			
		if($api['margin_type']==0) {
			$margin_sonuc = $binance->api_set_margin_type($symbol,"ISOLATED");
		} else {
			$margin_sonuc = $binance->api_set_margin_type($symbol,"CROSSED");
		}
		
	} else {
			
		if($api['margin_type']==0) {
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
		$signal_str = $api_exchange." Emir açılamadı. OPEN ".$api_signal['symbol']." ".$api_signal['direction']." ERROR price:".$price." code:".$error_code." msg:".$error_msg;
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
	if($bildirim_gonder==1) {
		$stmt = $my->prepare("INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, ?)");
		$stmt->bind_param("isi", $user_id, $msg, $durum);
		$stmt->execute();
		$stmt->close();
	}
	
}


function create_order($sid) {
	global $my,$bysym,$binance,$api_exchange,$max_lots,$user_id,$s_id,$us_id,$admin_ok,$is_test;
	
	$rsi = $my->query("SELECT * FROM `user_signals` WHERE id='$sid'");
	$us=$rsi->fetch_assoc();
	
	if(($us['close']>0 || $us['open']>0) && $admin_ok==1) return;

	$rsi1 = $my->query("SELECT * FROM `signals` WHERE id='$us[signal_id]'");
	$sg=$rsi1->fetch_assoc();

	$api1 = $my->query("SELECT * FROM `api_keys` WHERE id='$us[api_id]'");
	$api=$api1->fetch_assoc();
	$user_id = $api['user_id'];



	$sm1 = $my->query("select * from rates where symbol='$us[symbol]'");
	$sym = $sm1->fetch_assoc();
	
	
	$ask = $sym['price'];
	$bid = $sym['price'];	
	if($api_exchange=="bybit") {
		$sym['digits'] = $bysym['digits'];
		$sym['vdigits'] = $bysym['vdigits'];
	}
	$symbol = $us["symbol"];
	
	echo "vlot:".$api['lotsize']." vdigits:".$sym['vdigits']."\n";

	
	$price = 0;
	if($admin_ok==1 && $is_test==1) {
		$volume=number_format(10,$sym['vdigits'],".","");
	} else {
		$volume=number_format($api['lotsize'],$sym['vdigits'],".","");
	}
	$sprice=number_format($sg['stop_loss'],$sym['digits'],".","");
	
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
	
	
	if(isset($p_risk[$symbol]) && $p_risk[$symbol]!=0) {
		
		$orders=array();
		$orders['code'] = -101;
		$orders['msg'] = "🚫 ***{$symbol} OPEN POSITION EXISTS***\n\n" .
            "📊 **Trade Details:**\n" .
            "📡 **API Name:** {$api['api_name']}\n" .
            "🏦 **Exchange:** {$api_exchange}\n\n" .
            "A new trade could not be opened as you already have an open position in this pair.";
		
	} else if($emir_adet>=$api['max_orders']) {
		
		$orders=array();
		$orders['code'] = -102;
		$orders['msg'] = "⚠️ ***Order Failed*** ⚠️\n\n" .
            "**Signal:** {$symbol} " . ($sg['direction'] ?? '') . "\n" .
            "**API Name:** {$api['api_name']}\n" .
            "**Exchange:** {$api_exchange}\n\n" .
            "**Error:** You have allowed a maximum of {$api['max_orders']} orders to be opened, and this order could not be opened. You currently have {$emir_adet} open orders.";
		
	} else {
		
		$max_lot = $max_lots[$symbol] ?? 0;
		
		$b_orders=array();

        $price = $sym['price'];
        $volume=number_format($api['lotsize']/$price,$sym['vdigits'],".","");
        echo "volume: $volume vdigits:$sym[vdigits] api:$api[lotsize] price:$price\n";
        if($max_lot>0 && $volume>$max_lot) $volume = number_format($max_lot,$sym['vdigits'],".","");

        // New SL/TP logic
        $sprice = 0;
        if (isset($api['stop_loss_settings'])) {
            if ($api['stop_loss_settings'] == 'signal') {
                if (isset($sg['stop_loss']) && $sg['stop_loss'] > 0) {
                    $sprice = number_format($sg['stop_loss'], $sym['digits'], ".", "");
                }
            } elseif ($api['stop_loss_settings'] == 'custom' && isset($api['percent_loss']) && $api['percent_loss'] > 0) {
                if (isset($sg['direction']) && $sg['direction'] == "LONG") {
                    $sprice = number_format($price * (1 - ($api['percent_loss'] / 100)), $sym['digits'], ".", "");
                } else { // SHORT
                    $sprice = number_format($price * (1 + ($api['percent_loss'] / 100)), $sym['digits'], ".", "");
                }
            }
        }

        $tprice = 0;
        if (isset($api['take_profit'])) {
            if ($api['take_profit'] == 'signal') {
                $signal_tprice = 0;
                for ($i = 10; $i >= 1; $i--) {
                    if (isset($sg['tp'.$i]) && $sg['tp'.$i] > 0) {
                        $signal_tprice = $sg['tp'.$i];
                        break;
                    }
                }
                if ($signal_tprice > 0) {
                    $tprice = number_format($signal_tprice, $sym['digits'], ".", "");
                }
            } elseif ($api['take_profit'] == 'custom' && isset($api['percent_profit']) && $api['percent_profit'] > 0) {
                if (isset($sg['direction']) && $sg['direction'] == "LONG") {
                    $tprice = number_format($price * (1 + ($api['percent_profit'] / 100)), $sym['digits'], ".", "");
                } else { // SHORT
                    $tprice = number_format($price * (1 - ($api['percent_profit'] / 100)), $sym['digits'], ".", "");
                }
            }
        }

        // Prepare orders
        if(isset($sg['direction']) && $sg['direction']=="LONG") {
            $b_orders[]=$binance->prepare_order($symbol,"BUY","MARKET",$volume,$price);
            if ($sprice > 0) {
                $sl_side = ($api_exchange == 'bingx') ? "BUY" : "SELL";
                $sl_volume = ($api_exchange == 'bingx') ? $volume : 0;
                $b_orders[] = $binance->prepare_order($symbol, $sl_side, "SL", $sl_volume, $sprice);
            }
            if ($tprice > 0) {
                $tp_side = ($api_exchange == 'bingx') ? "BUY" : "SELL";
                $tp_volume = ($api_exchange == 'bingx') ? $volume : 0;
                $b_orders[] = $binance->prepare_order($symbol, $tp_side, "TP", $tp_volume, $tprice);
            }
        } else if (isset($sg['direction']) && $sg['direction']=="SHORT") { // SHORT
            $b_orders[]=$binance->prepare_order($symbol,"SELL","MARKET",$volume,$price);
            if ($sprice > 0) {
                $sl_side = ($api_exchange == 'bingx') ? "SELL" : "BUY";
                $sl_volume = ($api_exchange == 'bingx') ? $volume : 0;
                $b_orders[] = $binance->prepare_order($symbol, $sl_side, "SL", $sl_volume, $sprice);
            }
            if ($tprice > 0) {
                $tp_side = ($api_exchange == 'bingx') ? "SELL" : "BUY";
                $tp_volume = ($api_exchange == 'bingx') ? $volume : 0;
                $b_orders[] = $binance->prepare_order($symbol, $tp_side, "TP", $tp_volume, $tprice);
            }
        }
		
		print_r($b_orders);
		
		trade_log("b_order:".print_r($b_orders,1));
			
		$orders = $binance->bulk_order_send($b_orders);
		echo "API Response:\n";
		print_r($orders);
		trade_log("orders:".print_r($orders,1));
		
	}
	
	if(isset($orders[0]['orderId']) && $orders[0]['orderId']!="") {
		
		$order_ticket = $orders[0]['orderId'];
		$order_status = $orders[0]['status'];

		$sl_ticket = null;
		$sl_error_msg = '';
		$tp_ticket = null;
		$tp_error_msg = '';
		
		$current_order_index = 1;
		if ($sprice > 0) {
			if (isset($orders[$current_order_index]) && !empty($orders[$current_order_index]['orderId'])) {
				$sl_ticket = $orders[$current_order_index]['orderId'];
			} else if (isset($orders[$current_order_index])) {
				$sl_error_msg = stripslashes($orders[$current_order_index]['msg'] ?? '');
			}
			$current_order_index++;
		}
		if ($tprice > 0) {
			if (isset($orders[$current_order_index]) && !empty($orders[$current_order_index]['orderId'])) {
				$tp_ticket = $orders[$current_order_index]['orderId'];
			} else if (isset($orders[$current_order_index])) {
				$tp_error_msg = stripslashes($orders[$current_order_index]['msg'] ?? '');
			}
		}
		
		if(count($orders)>0 && $order_ticket!="") {
			
			$results = "#".$order_ticket." ".$symbol." ".$volume." ".(isset($sg['direction']) ? $sg['direction'] : "")." ".$price." #".$order_ticket." ".$price." ".date("Y-m-d H:i:s")." ".$order_status;
			#echo($api['api_type']."[u".$user_id."] [s".$us['signal_id']."] [".$api['id']."] ->".$symbol."->".$us['direction']." results : ".$results."\n");
			
			global $user_leverage;
			$opentime = date('d-m-Y H:i:s');
			$signal_str = "✅ ***{$symbol} {$sg['direction']} POSITION OPENED***\n\n" .
				"📊 **Order Details:**\n" .
				"📡 **API Name:** {$api['api_name']}\n" .
				"🏦 **Exchange:** {$api_exchange}\n" .
				"💰 **Entry Price:** {$price}\n" .
				"📦 **Volume:** {$volume}\n" .
				"⚙️ **Leverage:** {$user_leverage}x\n" .
				"⏰ **Open Time:** {$opentime}\n\n" .
				"✨ *Good luck! Your position is being tracked.*";
			trade_log($signal_str);
			
			$my->query("update user_signals set open='".$price."',ticket='".$order_ticket."',sl='".$sprice."',sticket='".$sl_ticket."',tticket='".$tp_ticket."',opentime='".date("Y-m-d H:i:s")."',volume='".$volume."',status=1 where id ='".$us['id']."'") or die($my->error);
			echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $results\n";
			trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $results\n");
			bildirim_ekle($user_id,$signal_str,0);
			
			if($sl_ticket) {
				trade_log(" sl ticket - $sl_ticket");
			} else if ($sprice > 0) { // SL was intended but failed
				$sl_error_msg = str_replace("'","",$sl_error_msg);
				$sl_error_msg = str_replace("\"","",$sl_error_msg);	
				if(stristr($sl_error_msg,"direction is existing")) {
					$sl_ticket=-1;
				}
				trade_log(" sl ticket error - $sl_ticket - ".$sl_error_msg);
			}
			
			if($tp_ticket) {
				trade_log(" tp ticket - $tp_ticket");
			} else if ($tprice > 0) { // TP was intended but failed
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
						
								
							if(isset($sg['direction']) && $sg['direction']=="LONG") {
								$nt = $binance->order_send($symbol,"SELL","LIMIT",$new_lot,$new_price,1);
							} else {
								$nt = $binance->order_send($symbol,"BUY","LIMIT",$new_lot,$new_price,1);
							}
						
							
						} else {
								
							if(isset($sg['direction']) && $sg['direction']=="LONG") {
								$nt = $binance->order_send($symbol,"SELL","LIMIT",$new_lot,$new_price,1);
							} else {
								$nt = $binance->order_send($symbol,"BUY","LIMIT",$new_lot,$new_price,1);
							}
						}
						
						echo "---- limit tp order u_id:$user_id|us:$us_id  #$order_ticket -> #".($nt['orderId'] ?? '')." ".($nt['side'] ?? '')." ".($nt['type'] ?? '')." ".($nt['price'] ?? '')." ".($nt['origQty'] ?? '')." new_lot:$new_lot, new_price:$new_price\n";
						trade_log("---- limit tp order u_id:$user_id|us:$us_id  #$order_ticket -> #".($nt['orderId'] ?? '')." ".($nt['side'] ?? '')." ".($nt['type'] ?? '')." ".($nt['price'] ?? '')." ".($nt['origQty'] ?? '')." new_lot:$new_lot, new_price:$new_price\n");
						trade_log("orders:".print_r($nt,1));
					}	
	
					if($total_gecti==1) break;
					
				}
				
				
				
			}
		
	
		}
	} else {
		
		$error_code = -1;
		$error_msg = "Bilinmeyen hata";

		if (isset($orders[0]['code']) && $orders[0]['code']!="") {
		
			$error_code = $orders[0]['code'];
			$error_msg = stripslashes($orders[0]['msg']);
			
		} else if(isset($orders['code']) && $orders['code']!="") {
			
			$error_code = $orders['code'];
			$error_msg = stripslashes($orders['msg']);
		}  
		
		if($error_code == "-4061" or stristr($error_msg,"the PositionSide field")) {
			$error_msg = "Your account is in hedge mode, so the transaction could not be opened. Your transactions will be opened when you switch your account to one-way mode.";
		} else if($error_code == "-2019") {
			$error_msg = "Your account balance is insufficient to open this transaction.";
		} else if(stristr($error_msg,"symbol not exist, please verify it in api")) {
			$error_msg = "This pair does not exist on the BINGX exchange, so the transaction could not be opened.";
		} else if($error_code == "-4164") {
			$error_msg = "The lot amount you want to close cannot be less than 6 USDT. You are trying to close a position smaller than 6 USDT.";
		} else if($error_code == "-2015") {
			$error_msg = "Your API key is incorrect. If you think it is correct, make sure you have a Futures wallet and have given futures permission for the Api key.";
		} else if(stristr($error_msg,"position idx not match")) {
			$error_msg = "Your account is in hedge mode for the pair you are trying to open a position on, so the transaction cannot be opened. To open a transaction, please switch the current pair to one-way mode.";
		} else if(stristr($error_msg,"CannotAffordOrderCost")) {
			$error_msg = "There is not enough balance in your Futures Account to open a transaction. To enter transactions, please transfer the money from your Spot account to your Futures Wallet.";
		} else if(stristr($error_msg,"symbol is not whitelisted")) {
			$error_msg = "To open a position in this pair, you need to add the pair to the whitelist. Go to the API settings and add all pairs to the whitelist.";
		}
		
		$error_msg = str_replace("'","",$error_msg);
		$error_msg = str_replace("\"","",$error_msg);
	
		$signal_str = "⚠️ ***Order Failed*** ⚠️\n\n" .
            "**Signal:** {$us['symbol']} " . ($sg['direction'] ?? '') . "\n" .
            "**API Name:** {$api['api_name']}\n" .
            "**Exchange:** {$api_exchange}\n\n" .
            "**Exchange Error:** {$error_msg} (code: {$error_code})\n\n" .
            "Please check your exchange account and API settings. The position for this signal **COULD NOT BE OPENED**.";
		$new_sql = "update user_signals set open='".$price."',close='".$price."',opentime='".date("Y-m-d H:i:s")."',closetime='".date("Y-m-d H:i:s")."',status=3,ticket='-1',event='".$error_code."|".$error_msg."' where id = '".$us['id']."'";
		
		echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $signal_str\n";
		trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $signal_str\n");
		$my->query($new_sql) or die($my->error);	
		bildirim_ekle($user_id,$signal_str,0);
			
			
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


	$api1 = $my->query("SELECT * FROM `api_keys` WHERE id='$us[api_id]'");
	$api=$api1->fetch_assoc();
	$api['order_type']="LIMIT";
	$user_id = $api['user_id'];



	$sm1 = $my->query("select * from rates where symbol='$us[symbol]'");
	$sym = $sm1->fetch_assoc();
	
	$symbol = $us["symbol"];
	
	$price = 0;
	$volume=$api['lotsize'];
	$sprice=$sg['stop_loss'];

	
	$b_orders=array();
	$tamamen_kapandi=0;
	
	$p_risk = $binance->position_risk();	
	$acik_poz = $p_risk[$symbol];
	
	if($acik_poz == 0) {

		$close_price = $us['sl'];
		
		$kapat_volume = $us['volume']-$us['closed_volume'];
		$profit = 0;
        $profitPercent = 0;
		
		#echo "kapat_volume:$kapat_volume  us_volume:$us[volume] us_closed:$us[closed_volume]\n";

		if($sg['direction']=="LONG") {
			
			$profit = ($us['sl']-$us['open'])*$us['volume'];
            if ($us['open'] > 0) {
                $profitPercent = (($us['sl'] - $us['open']) / $us['open']) * 100 * $api['leverage'];
            }
		
		} else if($us['direction']=="SHORT") {
			
			$profit = ($us['open']-$us['sl'])*$us['volume'];
            if ($us['open'] > 0) {
                $profitPercent = (($us['open'] - $us['sl']) / $us['open']) * 100 * $api['leverage'];
            }

		}			

		echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] Pozisyon bulunamadı, kapatılıyor.\n";
		trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] Pozisyon bulunamadı, kapatılıyor.\n");
		$my->query("update user_signals set close='".$close_price."',closed_volume=(closed_volume+".$kapat_volume."),closetime='".date("Y-m-d H:i:s")."' where id ='".$us['id']."'") or die($my->error);
        $profitSign = $profit >= 0 ? '+' : '';
        $profitText = $profitPercent != 0 ? "\n**Profit/Loss:** {$profitSign}" . number_format($profit, 2) . " USDT ({$profitSign}" . number_format($profitPercent, 2) . "%)" : '';

        $signal_str = "📈 **POSITION CLOSED**\n\n" .
            "**Symbol:** {$symbol}\n" .
            "**API Name:** {$api['api_name']}\n" .
            "**Exchange:** {$api_exchange}\n" .
            "**Close Price:** {$close_price}\n" .
            "**Close Time:** " . date('d-m-Y H:i:s') . "{$profitText}\n\n" .
            "Position was closed automatically (not found in market).";
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
			if($sg['direction']=="LONG") {
				
				$price = $sym['price'];
				if($api['order_type']!="LIMIT") {
					$kapat_ticket = $binance->order_send($symbol,"SELL","MARKET",$kapat_volume,$price,1);
				} else {
					$kapat_ticket=array("orderId"=>$us['tticket'],"status"=>"TP_FILLED");
				}
					
				$profit = ($us['sl']-$us['open'])*$api['lotsize'];
				$profit = number_format($profit,5,".","");
				
			} else if($us['direction']=="SHORT") {
				
				$price = $sym['price'];
				if($api['order_type']!="LIMIT") {
					$kapat_ticket = $binance->order_send($symbol,"BUY","MARKET",$kapat_volume,$price,1);
				} else {
					$kapat_ticket=array("orderId"=>$us['tticket'],"status"=>"TP_FILLED");
				}
					
				$profit = ($us['open']-$us['sl'])*$api['lotsize'];
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
			
			$results = "#".$order_ticket." ".$symbol." ".$kapat_volume." ".$us['direction']." ".$price." #".$order_ticket." ".$profit." ".date("Y-m-d H:i:s")." ".$order_status;
			#echo($api['exchange']."[u".$user_id."] [s".$us['signal_id']."] [".$api['id']."] ->".$symbol."->".$us['direction']." results : ".$results."\n");
			
			trade_log($results);
			
            $profitPercent = 0;
            if ($us['open'] > 0) {
                if ($us['direction'] == 'LONG') {
                    $profitPercent = (($price - $us['open']) / $us['open']) * 100 * $api['leverage'];
                } else {
                    $profitPercent = (($us['open'] - $price) / $us['open']) * 100 * $api['leverage'];
                }
            }
            $profitSign = $profit >= 0 ? '+' : '';

			if($tamamen_kapandi==0) {

                $signal_str = "🎯 **{$symbol} {$us['direction']} {$close_point} HIT**\n\n" .
                    "📊 **Trade Details:**\n" .
                    "📡 **API Name:** {$api['api_name']}\n" .
                    "🏦 **Exchange:** {$api_exchange}\n" .
                    "💰 Entry Price: " . number_format($us['open'], 5) . "\n" .
                    "🎯 {$close_point} Price: " . number_format($price, 5) . "\n" .
                    "📊 Closed Amount: {$kapat_volume}\n" .
                    "💚 Profit: {$profitSign}" . number_format($profit, 2) . " USDT ({$profitSign}" . number_format($profitPercent, 2) . "%)\n" .
                    "⏰ Close Time: " . date('d-m-Y H:i:s') . "\n\n" .
                    "🎉 Congratulations! Your target has been reached.";
				
				echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $signal_str\n";
				trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $signal_str\n");
				$my->query("update user_signals set tp='".$close_price."',closed_volume=(closed_volume+".$kapat_volume.") where id ='".$us['id']."'") or die($my->error);
				bildirim_ekle($user_id,$signal_str,0);
			} else {
 
                if ($close_point == "SL") {
                    $signal_str = "❌ **{$symbol} {$us['direction']} STOP LOSS**\n\n" .
                        "📊 **Trade Details:**\n" .
                        "📡 **API Name:** {$api['api_name']}\n" .
                        "🏦 **Exchange:** {$api_exchange}\n" .
                        "💰 Entry Price: " . number_format($us['open'], 5) . "\n" .
                        "❌ Exit Price: " . number_format($price, 5) . "\n" .
                        "📊 Closed Amount: {$kapat_volume}\n" .
                        "💔 Profit/Loss: {$profitSign}" . number_format($profit, 2) . " USDT ({$profitSign}" . number_format($profitPercent, 2) . "%)\n" .
                        "⏰ Close Time: " . date('d-m-Y H:i:s');
                } else { // TP
                    $signal_str = "🎯 **{$symbol} {$us['direction']} {$close_point} HIT**\n\n" .
                        "📊 **Trade Details:**\n" .
                        "📡 **API Name:** {$api['api_name']}\n" .
                        "🏦 **Exchange:** {$api_exchange}\n" .
                        "💰 Entry Price: " . number_format($us['open'], 5) . "\n" .
                        "🎯 {$close_point} Price: " . number_format($price, 5) . "\n" .
                        "📊 Closed Amount: {$kapat_volume}\n" .
                        "💚 Profit: {$profitSign}" . number_format($profit, 2) . " USDT ({$profitSign}" . number_format($profitPercent, 2) . "%)\n" .
                        "⏰ Close Time: " . date('d-m-Y H:i:s') . "\n\n" .
                        "🎉 Congratulations! Your target has been reached.";
                }
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
				
				$kapat_volume = $api['lotsize'];
				
				if($us['direction']=="LONG") {
										
					$profit = ($us['sl']-$us['open'])*$api['lotsize'];
					$profit = number_format($profit,5,".","");

				} else {
											
					$profit = ($us['open']-$us['sl'])*$api['lotsize'];
					$profit = number_format($profit,5,".","");

				}
				
				$signal_str = $api_exchange." CLOSED ".$us['symbol']." ".$us['direction']." open:".$us['open']." close:".$price." lot:".$kapat_volume." profit:".$profit;
				$new_sql = "update user_signals set close='".$price."',closetime='".date("Y-m-d H:i:s")."',status=1 where id = '".$us['id']."'";
				echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $signal_str\n";
				trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $signal_str\n");
				$my->query($new_sql) or die($my->error);	
				bildirim_ekle($user_id,$signal_str,0);
				
				
				
			} else {
				
				if($price==0)$price=$us['sl'];
				if($price==0)$price=$sg['entry1'];
				#$signal_str = $api_exchange." Emir kapatılamadı. CLOSE ".$us['symbol']." ".$us['direction']." ERROR price:".$price." code:".$error_code." msg:".$error_msg;
				#bildirim_ekle($user_id,$signal_str,0);
				$new_sql = "update user_signals set close='".$price."',closetime='".date("Y-m-d H:i:s")."',status=2,event='".$error_code."|".$error_msg."' where id = '".$us['id']."'";
				echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $signal_str\n";
				trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] $signal_str\n");
				$my->query($new_sql);	
				
			}
			
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
	
	
	$api1 = $my->query("SELECT * FROM `api_keys` WHERE id='$us[api_id]'");
	$api=$api1->fetch_assoc();
	$api['order_type']="LIMIT";
	$user_id = $api['user_id'];
	
	
	
	$sm1 = $my->query("select * from rates where symbol='$us[symbol]'");
	$sym = $sm1->fetch_assoc();
	
	$symbol = $us["symbol"];
	
	 
	$sprice=number_format($sprice,$sym['digits'],".","");	
	
	if ( ($us['direction']=="LONG" && ($us['sl']==0 or $us['sl']<$sprice)) or  ($us['direction']=="SHORT" && ($us['sl']==0 or $us['sl']>$sprice)) ) {
		
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
				
				$sl_ticket = $binance->order_send($symbol,($us['direction']=="LONG" ? "BUY" : "SELL"),"SL",$volume,$sprice,1);
			
	
	
				*/
	
	
		} else {
		
			$sl_ticket = $binance->order_send($symbol,($us['direction']=="LONG" ? "SELL" : "BUY"),"SL",$volume,$sprice);
		
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
			if($us['direction']=="LONG") {
				
				$profit = ($us['sl']-$us['open'])*$api['lotsize'];
				$profit = number_format($profit,5,".","");
				
			} else if($us['direction']=="SHORT") {
				
				
				$profit = ($us['open']-$us['sl'])*$api['lotsize'];
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
	

	function create_limit_tp($sid) {
		global $my,$bysym,$binance,$api_exchange,$max_lots,$user_id,$s_id,$us_id,$admin_ok,$is_test;
		
		$rsi = $my->query("SELECT * FROM `user_signals` WHERE id='$sid'");
		$us=$rsi->fetch_assoc();
		
		if($is_test!=2) return;
	
		$rsi1 = $my->query("SELECT * FROM `signals` WHERE id='$us[signal_id]'");
		$sg=$rsi1->fetch_assoc();
	
		$api1 = $my->query("SELECT * FROM `api_keys` WHERE id='$us[api_id]'");
		$api=$api1->fetch_assoc();
		$user_id = $api['user_id'];
	
	
	
		$sm1 = $my->query("select * from rates where symbol='$us[symbol]'");
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
			$volume=number_format($api['lotsize'],$sym['vdigits'],".","");
		}
		$sprice=number_format($sg['stop_loss'],$sym['digits'],".","");
		
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
					
							
						if(isset($sg['direction']) && $sg['direction']=="LONG") {
							$nt = $binance->order_send($symbol,"SELL","LIMIT",$new_lot,$new_price,1);
						} else {
							$nt = $binance->order_send($symbol,"BUY","LIMIT",$new_lot,$new_price,1);
						}
					
						
					} else {
							
						if(isset($sg['direction']) && $sg['direction']=="LONG") {
							$nt = $binance->order_send($symbol,"SELL","LIMIT",$new_lot,$new_price,1);
						} else {
							$nt = $binance->order_send($symbol,"BUY","LIMIT",$new_lot,$new_price,1);
						}
					}
					
					echo "---- limit tp order u_id:$user_id|us:$us_id  #$order_ticket -> #".($nt['orderId'] ?? '')." ".($nt['side'] ?? '')." ".($nt['type'] ?? '')." ".($nt['price'] ?? '')." ".($nt['origQty'] ?? '')." new_lot:$new_lot, new_price:$new_price\n";
					trade_log("---- limit tp order u_id:$user_id|us:$us_id  #$order_ticket -> #".($nt['orderId'] ?? '')." ".($nt['side'] ?? '')." ".($nt['type'] ?? '')." ".($nt['price'] ?? '')." ".($nt['origQty'] ?? '')." new_lot:$new_lot, new_price:$new_price\n");
					trade_log("orders:".print_r($nt,1));
				}	
	
				if($total_gecti==1) break;
				
			}
			
			
			
		}
					
			
		
	}

$fba=0;

while ($loop_signal) {
	

	$aa1 = $my->query("SELECT * FROM user_signals where id = '".$signal_id."';");
	$aa = $aa1->fetch_assoc();


	if($aa['id']>0) { } else { 
		echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] ".$api['api_name']." ".$signal['symbol']." ".$signal['direction']." -> user_signals bulunamadı signal_id:".$signal_id."\n"; 
		trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] ".$api['api_name']." ".$signal['symbol']." ".$signal['direction']." -> user_signals bulunamadı signal_id:".$signal_id."\n");
		break; 
	}
	


	$rsi1 = $my->query("SELECT * FROM `signals` WHERE id='$us[signal_id]'");
	$signal=$rsi1->fetch_assoc();


	$sm1 = $my->query("select * from rates where symbol='$us[symbol]'");
	$sym = $sm1->fetch_assoc();
	

	$ask = doubleval($sym['price']);
	$bid = doubleval($sym['price']);

	if($ask>0 && $bid>0) {
		
	} else {
		break;
	}	
	
	//print_r($signal);
	//print_r($aa);

	if ((($signal['status'] == 'closed') || $aa['ticket']==-1) && $is_test!=2) {  
		echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] ".$api['api_name']." ".$signal['symbol']." ".$signal['direction']." ->  #".$aa['ticket']." sinyal kapandı close:".$aa['close']."\n"; 
		trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] ".$api['api_name']." ".$signal['symbol']." ".$signal['direction']." ->  #".$aa['ticket']." sinyal kapandı close:".$aa['close']."\n");
		break; 
	}
	
	$symbol = $signal['symbol'];
	
	if($binance->digits==0) $binance->digits=$sym['digits'];
	if($binance->vdigits==0) $binance->vdigits=$sym['vdigits'];
	
	$bid = $sym['price'];
	$ask = $sym['price'];
	
	if ($ask == "" || $bid == "") continue;
	
	if($fba==0 || $admin_ok==1) {
		echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] ".$api['user_id']." ".$api['api_name']." ".$signal['symbol']." ".$signal['direction']." ".$signal['created_at']." b:".$bid." a:".$ask." #".$aa['ticket']." o:".$aa['open']." ".$aa['opentime']." c:".$aa['close']." ".$aa['closetime']."\n";
		trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] ".$api['user_id']." ".$api['api_name']." ".$signal['symbol']." ".$signal['direction']." ".$signal['created_at']." b:".$bid." a:".$ask." #".$aa['ticket']." o:".$aa['open']." ".$aa['opentime']." c:".$aa['close']." ".$aa['closetime']."\n");
		$fba=1;
	}
	
	$last_bid = $bid;
	$last_ask = $ask;
		
		if ( $signal['direction'] == "LONG" ) {
			
			if($aa['close']>0 && $aa['volume']<=$aa['closed_volume']) {
				#echo("cmd_user_signal(".$signal_id.") ".$api['user_id']." ".$api['api_name']." ".$signal['symbol']." ".$signal['direction']." -> sinyal kapandığı için durduruldu $aa[close]:".$aa['close'].". 2041\n");					
				echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id]  ".$signal['symbol']." ".$signal['direction']." -> sinyal kapandığı için durduruldu close:".$aa['close']." \n";
				trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id]  ".$signal['symbol']." ".$signal['direction']." -> sinyal kapandığı için durduruldu close:".$aa['close']." \n");
				//trade_log(user_id,signal_id+" "+$signal['symbol']+" "+$signal['direction']+" pozisyonu takibi tamamlandı. volume:"+$aa['volume']+" closed_volume:"+$aa['closed_volume'])
				break;
			} else if ((($admin_ok==1) || ($aa['open'] == 0 && strtotime($signal['created_at'])>0 && strtotime($signal['created_at'])+$signal_cancel_seconds>time())) && $is_test!=2 && $bir_kere_ac==0 /* && aralikta(signal.entry1,signal.entry2,$sym['price'])*/ ) {
				create_order($sid);
				$bir_kere_ac=1;
			} else if ($aa['open']>0 && $aa['close']==0) {	
				
				
				$new_sl = 0;
				$new_tp = 0;
				
				if($aa['sticket']=="" && isset($api['stop_loss_settings']) && $api['stop_loss_settings'] != 'none' && $aa['sl_wait']+$sl_tp_wait_seconds<time()) {
					
					if($aa['sl']>0) {
						$new_sl = $aa['sl'];
					} else if($api['stop_loss_settings']=='signal') {
						$new_sl = $signal['stop_loss'];
					} else if($api['stop_loss_settings']=='custom') {
						$new_sl = number_format($sym['price']*((100-$api['percent_loss'])/100),$sym['digits'],".","");
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

								if($aa['direction']=="LONG") {
									
									$profit = ($aa['sl']-$aa['open'])*$api['lotsize'];
									$profit = number_format($profit,5,".","");
									
									
								} else if($aa['direction']=="SHORT") {
									
									$profit = ($aa['open']-$aa['sl'])*$api['lotsize'];
									$profit = number_format($profit,5,".","");

								}			

								$signal_str = $api_exchange." N-CLOSED ".$aa['symbol']." ".$aa['direction']." open:".$aa['open']." close:".$close_price." lot:".$kapat_volume." profit:".$profit;
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
				
				if($aa['tticket']=="" && isset($api['take_profit']) && $api['take_profit'] != 'none') {
					
									
					$tprice = 0;
				
					if($api['take_profit']=='signal') {
					for($i=1;$i<=10;$i++) {
							if(isset($signal['tp'.$i]) && $signal['tp'.$i]>0) {
							$tprice=number_format($signal['tp'.$i],$sym['digits'],".","");
						}
					}
						$new_tp = $tprice;
					} else if($api['take_profit']=='custom') {
						$new_tp = ($sym['price']*((100+$api['percent_profit'])/100));
					}
					
					if($new_tp>0 && $aa['tp_wait']+$sl_tp_wait_seconds<time()) {
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

								if($aa['direction']=="LONG") {
									
									$profit = ($aa['sl']-$aa['open'])*$api['lotsize'];
									$profit = number_format($profit,5,".","");
									
									
								} else if($aa['direction']=="SHORT") {
									
									$profit = ($aa['open']-$aa['sl'])*$api['lotsize'];
									$profit = number_format($profit,5,".","");
									

								}			

								$signal_str = $api_exchange." N-CLOSED ".$aa['symbol']." ".$aa['direction']." open:".$aa['open']." close:".$close_price." lot:".$kapat_volume." profit:".$profit;
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
				
                // START: NEW TRAIL STOP & BREAK EVEN LOGIC
                if ($aa['open'] > 0 && $aa['close'] == 0 && empty($aa['closetime'])) {
                    $current_tp_level = isset($signal['tp_hit']) ? (int)$signal['tp_hit'] : 0;
                    $user_tp_hit = isset($aa['tp_hit']) ? (int)$aa['tp_hit'] : 0;
            
                    if ($current_tp_level > $user_tp_hit) {
                        $new_sl_details = null;
            
                        // Trail Stop Logic
                        if (isset($api['trail_stop']) && $api['trail_stop'] > 0) {
                            $trail_idx = (int)$api['trail_stop'];
                            $new_sl_candidate = null;
                            $tp_level_for_notification = null;
            
                            if (($current_tp_level - $trail_idx) === 0) {
                                $new_sl_candidate = $aa['open'];
                                $tp_level_for_notification = 0;
                            } elseif (($current_tp_level - $trail_idx) > 0) {
                                $tp_level_for_notification = $current_tp_level - $trail_idx;
                                if (isset($signal['tp' . $tp_level_for_notification])) {
                                    $new_sl_candidate = $signal['tp' . $tp_level_for_notification];
                                }
                            }
                            
                            if ($new_sl_candidate) {
                                $new_sl_details = [
                                    'new_sl' => (float)$new_sl_candidate, 'reason' => 'TRAIL STOP',
                                    'hedef' => (float)($signal['tp'.$current_tp_level] ?? 0), 'tp_level' => (int)$tp_level_for_notification
                                ];
                            }
                        }
            
                        // Break Even Logic (can overwrite Trail Stop if its condition is met)
                        if (isset($api['break_even_level']) && $api['break_even_level'] > 0) {
                            $break_even_idx = (int)$api['break_even_level'];
                            if ($current_tp_level >= $break_even_idx) {
                                $new_sl_details = [
                                    'new_sl' => (float)$aa['open'], 'reason' => 'BREAK EVEN',
                                    'hedef' => (float)($signal['tp'.$break_even_idx] ?? 0), 'tp_level' => (int)$break_even_idx
                                ];
                            }
                        }
                        
                        if ($new_sl_details) {
                            $should_update_sl = false;
                            $current_sl = (float)$aa['sl'];
                            $new_sl = $new_sl_details['new_sl'];
            
                            if ($new_sl > 0) {
                                if ($signal['direction'] == 'LONG') {
                                    if ($current_sl == 0 || $new_sl > $current_sl) $should_update_sl = true;
                                } elseif ($signal['direction'] == 'SHORT') {
                                    if ($current_sl == 0 || $new_sl < $current_sl) $should_update_sl = true;
                                }
                            }
            
                            if ($should_update_sl) {
                                if (!empty($aa['sticket']) && $aa['sticket'] > 0) {
                                    try {
                                        $binance->order_delete($symbol, $aa['sticket']);
                                        trade_log("Old SL order deleted: " . $aa['sticket']);
                                    } catch (Exception $e) { trade_log("Error deleting old SL order: " . $e->getMessage()); }
                                }
            
                                $new_sl_price = number_format($new_sl, $sym['digits'], ".", "");
                                $sl_side = ($signal['direction'] == 'LONG') ? 'SELL' : 'BUY';
                                $order_id_for_db = null; $success = false;
            
                                for ($attempt = 1; $attempt <= 3; $attempt++) {
                                    trade_log("{$new_sl_details['reason']} SL placement attempt {$attempt}/3");
                                    try {
                                        $new_stop_order = $binance->order_send($symbol, $sl_side, 'SL', $aa['volume'], $new_sl_price);
                                        if (!empty($new_stop_order['orderId'])) {
                                            $order_id_for_db = $new_stop_order['orderId']; $success = true; break;
                                        }
                                    } catch (Exception $e) { $new_stop_order = ['msg' => $e->getMessage()]; }
                                    if (!$success && $attempt < 3) { usleep(500000); }
                                }
                                
                                $notification_str = '';
                                if ($success) {
                                    if ($new_sl_details['reason'] == 'TRAIL STOP') {
                                        $tpLabel = $new_sl_details['tp_level'] == 0 ? 'Entry Price' : "TrailStop TP" . $new_sl_details['tp_level'] . " Level";
                                        $tpValue = $new_sl_details['tp_level'] == 0 ? $aa['open'] : $signal['tp' . $new_sl_details['tp_level']];
                                        $notification_str = "🔄 **{$symbol} {$signal['direction']} TRAIL STOP**\n\n" .
                                            "📊 **Trade Details:**\n" . "📡 **API Name:** {$api['api_name']}\n" . "🏦 **Exchange:** {$api_exchange}\n" .
                                            "💰 Entry Price: {$aa['open']}\n" . "🔔 {$tpLabel}: {$tpValue}\n" . "🛡️ New Stop Loss: {$new_sl_price}\n" .
                                            "⏰ Time: " . date('d-m-Y H:i:s') . "\n\n" . "🚦 Stop Loss updated automatically.";
                                    } else { // BREAK EVEN
                                        $notification_str = "⚖️ **{$symbol} {$signal['direction']} BREAK EVEN**\n\n" .
                                            "📊 **Trade Details:**\n" . "📡 **API Name:** {$api['api_name']}\n" . "🏦 **Exchange:** {$api_exchange}\n" .
                                            "💰 Entry Price: {$aa['open']}\n" . "🔔 BreakEven TP{$new_sl_details['tp_level']} Level: {$new_sl_details['hedef']}\n" .
                                            "🛡️ New Stop Loss: {$new_sl_price}\n" . "⏰ Time: " . date('d-m-Y H:i:s') . "\n\n" . "🚦 Stop Loss moved to break even automatically.";
                                    }
                                } else {
                                    $error_msg = $new_stop_order['msg'] ?? 'Unknown error';
                                    $notification_str = "❌ **STOP LOSS ORDER FAILED ({$new_sl_details['reason']})**\n\n" .
                                        "**Symbol:** {$symbol}\n" . "**API Name:** {$api['api_name']}\n" . "**Exchange:** {$api_exchange}\n" .
                                        "**Exchange Response:** {$error_msg}\n\n" . "Stop Loss order could not be placed after 3 attempts.\n\n" .
                                        "🤖 But don't worry, Orca is tracking the signal for you.";
                                }
                                bildirim_ekle($user_id, $notification_str, 0);
                                $my->query("UPDATE user_signals SET sl='{$new_sl_price}', sticket='{$order_id_for_db}' WHERE id='{$signal_id}'");
                                $aa['sl'] = $new_sl_price; $aa['sticket'] = $order_id_for_db;
                            }
                        }
                        $my->query("UPDATE user_signals SET tp_hit = '{$current_tp_level}' WHERE id = '{$signal_id}'");
                        $aa['tp_hit'] = $current_tp_level;
                    }
                }
                // END: NEW TRAIL STOP & BREAK EVEN LOGIC
				
				for($i=0;$i<=10;$i++) {
					
					if($aa['closetime']!="") break;
					
					if($i==0) {
					
						if ($aa['sl']>0 && isset($api['stop_loss_settings']) && $api['stop_loss_settings'] != 'none' && $sym['price']<=$aa['sl']) {
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
			
		

		} else if ( $signal['direction'] == "SHORT" ) {
			
			if($aa['close']>0 && $aa['volume']<=$aa['closed_volume']) {
				#echo("cmd_user_signal(".$signal_id.") ".$api['user_id']." ".$api['api_name']." ".$signal['symbol']." ".$signal['direction']." -> sinyal kapandığı için durduruldu $aa[close]:".$aa['close'].". 2041");					
				echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id]  ".$signal['symbol']." ".$signal['direction']." -> sinyal kapandığı için durduruldu close:".$aa['close']." \n";
				trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id]  ".$signal['symbol']." ".$signal['direction']." -> sinyal kapandığı için durduruldu close:".$aa['close']." \n");

				break;
			} else if ((($admin_ok==1) || ($aa['open'] == 0 && strtotime($signal['created_at'])>0 && strtotime($signal['created_at'])+$signal_cancel_seconds>time())) && $is_test!=2  && $bir_kere_ac==0 /* && aralikta(signal.entry1,signal.entry2,$sym['price'])*/ ) {
				create_order($sid);
				$bir_kere_ac=1;
			} else if ($aa['open']>0 && $aa['close']==0) {	
				

				$new_sl = 0;
				$new_tp = 0;
				
				if($aa['sticket']<1 && isset($api['stop_loss_settings']) && $api['stop_loss_settings'] != 'none' && $aa['sl_wait']+$sl_tp_wait_seconds<time()) {
					
					if($aa['sl']>0) {
						$new_sl = ($aa['sl']);
					} else if($api['stop_loss_settings']=='signal') {
						$new_sl = ($signal['stop_loss']);
					} else if($api['stop_loss_settings']=='custom') {
						$new_sl = ($sym['price']*((100+$api['percent_loss'])/100));
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

								if($aa['direction']=="LONG") {
									
									
									$profit = ($aa['sl']-$aa['open'])*$api['lotsize'];
									$profit = number_format($profit,5,".","");
									
									
								} else if($aa['direction']=="SHORT") {
									
									
									$profit = ($aa['open']-$aa['sl'])*$api['lotsize'];
									$profit = number_format($profit,5,".","");
									

								}			

								$signal_str = $api_exchange." N-CLOSED ".$aa['symbol']." ".$aa['direction']." open:".$aa['open']." close:".$close_price." lot:".$kapat_volume." profit:".$profit;
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
			
				if($aa['tticket']<1 && isset($api['take_profit']) && $api['take_profit'] != 'none') {
						
									
					$tprice = 0;
				
					if($api['take_profit']=='signal') {
					for($i=1;$i<=10;$i++) {
							if(isset($signal['tp'.$i]) && $signal['tp'.$i]>0) {
							$tprice=number_format($signal['tp'.$i],$sym['digits'],".","");
						}
					}
						$new_tp = $tprice;
					} else if($api['take_profit']=='custom') {
						$new_tp = ($sym['price']*((100-$api['percent_profit'])/100));
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

								if($aa['direction']=="LONG") {
									
									$profit = ($aa['sl']-$aa['open'])*$api['lotsize'];
									$profit = number_format($profit,5,".","");
																		
									
								} else if($aa['direction']=="SHORT") {
									
									$profit = ($aa['open']-$aa['sl'])*$api['lotsize'];
									$profit = number_format($profit,5,".","");
									

								}			

								$signal_str = $api_exchange." N-CLOSED ".$aa['symbol']." ".$aa['direction']." open:".$aa['open']." close:".$close_price." lot:".$kapat_volume." profit:".$profit;
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
								#echo "fix tp error code:$error_code  err:$error_msg \n";
								echo date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] fix tp error code:$error_code  err:$error_msg\n";
								trade_log(date("Y-m-d H:i:s")." - [s:$s_id|u:$user_id|us:$us_id] fix tp error code:$error_code  err:$error_msg\n");
															
							}
							
						}
						#echo("fix_tp_order[".$signal_id."] ");
						#print_rr(($tp_ticket));
		
					}
				
				}
				
				// START: NEW TRAIL STOP & BREAK EVEN LOGIC
                if ($aa['open'] > 0 && $aa['close'] == 0 && empty($aa['closetime'])) {
                    $current_tp_level = isset($signal['tp_hit']) ? (int)$signal['tp_hit'] : 0;
                    $user_tp_hit = isset($aa['tp_hit']) ? (int)$aa['tp_hit'] : 0;
            
                    if ($current_tp_level > $user_tp_hit) {
                        $new_sl_details = null;
            
                        // Trail Stop Logic
                        if (isset($api['trail_stop']) && $api['trail_stop'] > 0) {
                            $trail_idx = (int)$api['trail_stop'];
                            $new_sl_candidate = null;
                            $tp_level_for_notification = null;
            
                            if (($current_tp_level - $trail_idx) === 0) {
                                $new_sl_candidate = $aa['open'];
                                $tp_level_for_notification = 0;
                            } elseif (($current_tp_level - $trail_idx) > 0) {
                                $tp_level_for_notification = $current_tp_level - $trail_idx;
                                if (isset($signal['tp' . $tp_level_for_notification])) {
                                    $new_sl_candidate = $signal['tp' . $tp_level_for_notification];
                                }
                            }
                            
                            if ($new_sl_candidate) {
                                $new_sl_details = [
                                    'new_sl' => (float)$new_sl_candidate, 'reason' => 'TRAIL STOP',
                                    'hedef' => (float)($signal['tp'.$current_tp_level] ?? 0), 'tp_level' => (int)$tp_level_for_notification
                                ];
                            }
                        }
            
                        // Break Even Logic (can overwrite Trail Stop if its condition is met)
                        if (isset($api['break_even_level']) && $api['break_even_level'] > 0) {
                            $break_even_idx = (int)$api['break_even_level'];
                            if ($current_tp_level >= $break_even_idx) {
                                $new_sl_details = [
                                    'new_sl' => (float)$aa['open'], 'reason' => 'BREAK EVEN',
                                    'hedef' => (float)($signal['tp'.$break_even_idx] ?? 0), 'tp_level' => (int)$break_even_idx
                                ];
                            }
                        }
                        
                        if ($new_sl_details) {
                            $should_update_sl = false;
                            $current_sl = (float)$aa['sl'];
                            $new_sl = $new_sl_details['new_sl'];
            
                            if ($new_sl > 0) {
                                if ($signal['direction'] == 'LONG') {
                                    if ($current_sl == 0 || $new_sl > $current_sl) $should_update_sl = true;
                                } elseif ($signal['direction'] == 'SHORT') {
                                    if ($current_sl == 0 || $new_sl < $current_sl) $should_update_sl = true;
                                }
                            }
            
                            if ($should_update_sl) {
                                if (!empty($aa['sticket']) && $aa['sticket'] > 0) {
                                    try {
                                        $binance->order_delete($symbol, $aa['sticket']);
                                        trade_log("Old SL order deleted: " . $aa['sticket']);
                                    } catch (Exception $e) { trade_log("Error deleting old SL order: " . $e->getMessage()); }
                                }
            
                                $new_sl_price = number_format($new_sl, $sym['digits'], ".", "");
                                $sl_side = ($signal['direction'] == 'LONG') ? 'SELL' : 'BUY';
                                $order_id_for_db = null; $success = false;
            
                                for ($attempt = 1; $attempt <= 3; $attempt++) {
                                    trade_log("{$new_sl_details['reason']} SL placement attempt {$attempt}/3");
                                    try {
                                        $new_stop_order = $binance->order_send($symbol, $sl_side, 'SL', $aa['volume'], $new_sl_price);
                                        if (!empty($new_stop_order['orderId'])) {
                                            $order_id_for_db = $new_stop_order['orderId']; $success = true; break;
                                        }
                                    } catch (Exception $e) { $new_stop_order = ['msg' => $e->getMessage()]; }
                                    if (!$success && $attempt < 3) { usleep(500000); }
                                }
                                
                                $notification_str = '';
                                if ($success) {
                                    if ($new_sl_details['reason'] == 'TRAIL STOP') {
                                        $tpLabel = $new_sl_details['tp_level'] == 0 ? 'Entry Price' : "TrailStop TP" . $new_sl_details['tp_level'] . " Level";
                                        $tpValue = $new_sl_details['tp_level'] == 0 ? $aa['open'] : $signal['tp' . $new_sl_details['tp_level']];
                                        $notification_str = "🔄 **{$symbol} {$signal['direction']} TRAIL STOP**\n\n" .
                                            "📊 **Trade Details:**\n" . "📡 **API Name:** {$api['api_name']}\n" . "🏦 **Exchange:** {$api_exchange}\n" .
                                            "💰 Entry Price: {$aa['open']}\n" . "🔔 {$tpLabel}: {$tpValue}\n" . "🛡️ New Stop Loss: {$new_sl_price}\n" .
                                            "⏰ Time: " . date('d-m-Y H:i:s') . "\n\n" . "🚦 Stop Loss updated automatically.";
                                    } else { // BREAK EVEN
                                        $notification_str = "⚖️ **{$symbol} {$signal['direction']} BREAK EVEN**\n\n" .
                                            "📊 **Trade Details:**\n" . "📡 **API Name:** {$api['api_name']}\n" . "🏦 **Exchange:** {$api_exchange}\n" .
                                            "💰 Entry Price: {$aa['open']}\n" . "🔔 BreakEven TP{$new_sl_details['tp_level']} Level: {$new_sl_details['hedef']}\n" .
                                            "🛡️ New Stop Loss: {$new_sl_price}\n" . "⏰ Time: " . date('d-m-Y H:i:s') . "\n\n" . "🚦 Stop Loss moved to break even automatically.";
                                    }
                                } else {
                                    $error_msg = $new_stop_order['msg'] ?? 'Unknown error';
                                    $notification_str = "❌ **STOP LOSS ORDER FAILED ({$new_sl_details['reason']})**\n\n" .
                                        "**Symbol:** {$symbol}\n" . "**API Name:** {$api['api_name']}\n" . "**Exchange:** {$api_exchange}\n" .
                                        "**Exchange Response:** {$error_msg}\n\n" . "Stop Loss order could not be placed after 3 attempts.\n\n" .
                                        "🤖 But don't worry, Orca is tracking the signal for you.";
                                }
                                bildirim_ekle($user_id, $notification_str, 0);
                                $my->query("UPDATE user_signals SET sl='{$new_sl_price}', sticket='{$order_id_for_db}' WHERE id='{$signal_id}'");
                                $aa['sl'] = $new_sl_price; $aa['sticket'] = $order_id_for_db;
                            }
                        }
                        $my->query("UPDATE user_signals SET tp_hit = '{$current_tp_level}' WHERE id = '{$signal_id}'");
                        $aa['tp_hit'] = $current_tp_level;
                    }
                }
                // END: NEW TRAIL STOP & BREAK EVEN LOGIC
				
				for($i=0;$i<=10;$i++) {
					if($aa['closetime']!="") break;
					if($i==0) {
					
						if ($aa['sl']>0 && isset($api['stop_loss_settings']) && $api['stop_loss_settings'] != 'none' && $sym['price']>=$aa['sl']) {
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
			
		}		
		
	
	
	
	
	
	
	flush();
	ob_flush();
	
	sleep(1);
}

$my->close();



?>