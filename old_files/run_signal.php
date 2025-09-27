<?php
include("mysql.php");
if(php_sapi_name()==="cli")
  $cli_ok=1; 
else 
  die("Not Running from CLI");

$sid = $argv[1];


echo date("Y-m-d H:i:s")." - [s:$sid] php run_signal.php argv: $sid\n";
trade_log(date("Y-m-d H:i:s")." - [s:$sid] php run_signal.php argv: $sid\n");

$kanal_bildirim_gonder = 1;

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

function ch_bildirim_ekle($user_id,$post_id,$symbol,$trend,$open,$opendate,$sl,$last,$lastdate,$cmd,$profit,$msg) {
	global $my, $kanal_bildirim_gonder, $sid;
	if($msg=="") return;
	if($user_id==0) return;
	
	$msg = str_replace("'","",$msg);
	$msg = str_replace("\"","",$msg);
	$msg1 = str_replace("\n","",$msg);
	
	
	echo date("Y-m-d H:i:s")." - [s:$sid] bildirim_ch = ".$msg1."\n";
	$bild_sql = "INSERT INTO `bildirimler_ch` (`id`, `user_id`, `post_id`, `symbol`, `trend`, `open`, `opendate`, `sl`, `last`, `lastdate`, `cmd`, `profit`, `msg`, `gonderim`)". "VALUES (NULL, '".$user_id."', '".$post_id."', '".$symbol."', '".$trend."', '".$open."', '".$opendate."', '".$sl."', '".$last."', '".$lastdate."', '".$cmd."', '".$profit."', '".$msg."', '');";
	#echo ($bild_sql."\n");
	if($kanal_bildirim_gonder==1) { 
		$my->query($bild_sql); 
		
	}
	trade_log(date("Y-m-d H:i:s")." - [s:$sid] bildirim_ch = ".$msg1."\n");
	
}

function run_exec($cmd) {
	global $p_name, $sid;
	
    if (substr(php_uname(), 0, 7) == "Windows"){
        pclose(popen("start ". $cmd, "w")); 
    }
    else {
		echo date("Y-m-d H:i:s")." - [s:$sid] exec(".$cmd.")\n";
        exec("nohup ".$cmd . " >> trade_bot_{$p_name}.txt 2>&1 &");  
		trade_log("start ".$cmd . "");
    }
}

function run_user_signals($sid,$rmd=0) {
	global $my, $p_name;
	
	echo date("Y-m-d H:i:s")." - [s:$sid] run_user_signals();\n";
	trade_log(date("Y-m-d H:i:s")." - [s:$sid] run_user_signals();\n");
	
	$e_signal = $my->query("select * from signals where id = '".$sid."'");
	$es = $e_signal->fetch_assoc();
	
	#print_rr($es);
	
	$last_id = $es['id'];
	$c_symbol = $es['symbol'];
	$c_tarih = $es['tarih'];
	$c_trend = $es['trend'];
	$c_entry1 = $es['entry1'];
	$c_entry2 = $es['entry2'];
	$c_sl = $es['sl'];
	$c_tp1 = $es['tp1'];
	
	
	if($last_id>0) {
		
		$e_user = $my->query("select id,user_id,username,abonelik,api_yok_bildirim,abone_degil_bildirim,api_grup_bildirim from users where 1");
		
		while($eu = $e_user->fetch_assoc()) {
			
			$abonelik=0;
			
			// print_rr($eu);
			
			if($eu['abonelik']==0) {
				$abonelik=0;
			} else {
				$abonelik=$eu['abonelik'];
			}
			
			$apv=$my->query("select id from apikeys where user_id='$eu[user_id]'");
			$api_varmi = $apv->num_rows;
			
			$agv=$my->query("select id from apigruplari where user_id='$eu[user_id]'");
			$api_grup_varmi = $agv->num_rows;
			
			$suan = time();
			
			if ($api_varmi==0) {
				if ($eu['api_yok_bildirim']<$suan) {
					$my->query("update users set api_yok_bildirim='$suan' where id = '$eu[id]'");
				}
			} else if ($abonelik==0) {
				if ($eu['abone_degil_bildirim']<$suan) {
					$my->query("update users set abone_degil_bildirim='$suan' where id = '$eu[id]'");
				}
			}
			
			
		}
		
		$e_user2 = $my->query("select id,lot,leverage,user_id,name,durum,maxemir from apikeys where 1;");
		
		while($eu2 = $e_user2->fetch_assoc()) {
		
			// print_rr($eu2);
			// var apiler = aa2[a2];

			//console.log("select * from users where user_id = '"+apiler.user_id+"'")
			$uye1 = $my->query("select * from users where user_id = '$eu2[user_id]'");
			$uye1u=$uye1->fetch_assoc();
			$uye1s=$uye1->num_rows;
			
			if($uye1s==0) {
				continue;
			}
			
			$uye = $uye1u;
			
			
			$abonelik=0;

			if($uye['abonelik']==0) {
				$abonelik=0;
			}else{
				$abonelik=$uye['abonelik'];
			}
			
			$suser_id=$eu2['user_id'];
			$uye_sinyali_var=false;
			$suan = time();
			

			//console.log("select * from user_signals where user_id = '"+apiler.user_id+"' and open>0 and close = 0")
			$kac_acik1 = $my->query("select * from user_signals where user_id = '$eu2[user_id]' and open>0 and close = 0");
			$kac_acik = $kac_acik1->num_rows;
			
			//console.log("select * from user_signals where user_id = '"+apiler.user_id+"' and symbol = '"+apiler.id+"' and trend = '"+c_trend+"' and close = 0")
			$sgnv1 = $my->query("select * from user_signals where user_id = '$eu2[user_id]' and symbol = '$c_symbol' and trend = '$c_trend' and close = 0");
			$sgnv = $sgnv1->fetch_assoc();
			
			
			if ($sgnv['id']>0) {
				$sgn2a = $my->query("select symbol,trend,entry1,entry2,sl,tp1 from signals where id = '".($sgnv['signal_id'])."'");
				$sgn2 = $sgn2a->fetch_assoc();
				
				if($sgn2['id']>0) {
					$sgn3 = $sgn2;
					
					if($sgn2['symbol'] == $c_symbol && $sgn2['trend'] == $c_trend && $sgn2['entry1'] == $c_entry1 && $sgn2['entry2'] == $c_entry2 && $sgn2['sl'] == $c_sl && $sgn2['tp1'] == $c_tp1) {
						$uye_sinyali_var=true;
					}
				}
				  
			}			
				
			/*
			echo ($uye1u['user_id']." ".$uye1u['username']." abonelik:".$abonelik.">suan:".$suan." && apiler.durum:".$eu2['durum']."==1 && uye_sinyali_var:".$uye_sinyali_var."==false\n");
			*/
			
			if ($abonelik>$suan && $eu2['durum']==1 && $uye_sinyali_var==false) {
					
				$s_user_id = $eu2['user_id'];
				$s_api_id = $eu2['id'];
				$s_signalid = $sid;
				$u_signal_id = $sgnv['id'];
				$s_lot = $eu2['lot'];
				$s_leverage = $eu2['leverage'];
				$s_strateji = "";
				
				

				$sgv=$my->query("select id from user_signals where user_id='$s_user_id' and signal_id='$s_signalid'");
				$signal_varmi = $sgv->fetch_assoc();
				
				if($signal_varmi['id']<1) {
					
					$query = "INSERT INTO `user_signals` (`id`, `user_id`, `api_id`, `signal_id`, `lotsize`, `levelage`, `strateji`, `ticket`, `symbol`, `trend`, `open`, `opentime`, `volume`, `sl`, `close`, `closetime`, `profit`, `event`, `status`) VALUES ('', '".($s_user_id)."', '".($s_api_id)."', '".($last_id)."', '".($s_lot)."', '".($s_leverage)."','".($s_strateji)."', '', '".($c_symbol)."', '".($c_trend)."', '', '', '', '', '', '', '', '', '');";

					$sonucu = $my->query($query);
					$iid = $my->insert_id;

					$unew_msg = "[s:$s_signalid] u:$s_user_id|us:$iid START ".$c_symbol." ".$c_trend." ".$c_tarih." entry1:".$c_entry1." sl:".$c_sl." tp:".$c_tp1." api:".$eu2['name'];      
					echo (date("Y-m-d H:i:s")." - ".$unew_msg."\n");
					trade_log(date("Y-m-d H:i:s")." - ".$unew_msg."\n");					
					
				} else {
					
					$iid = $signal_varmi['id'];
					
					$unew_msg = "[s:$s_signalid] u:$s_user_id|us:$iid RUN ".$c_symbol." ".$c_trend." ".$c_tarih." entry1:".$c_entry1." sl:".$c_sl." tp:".$c_tp1." api:".$eu2['name'];      
					echo (date("Y-m-d H:i:s")." - ".$unew_msg."\n");
					trade_log(date("Y-m-d H:i:s")." - ".$unew_msg."\n");						
					
				}
				
				
				#echo("run_user_signal->cmd_signal(".$iid.",".$s_user_id.")\n");
				#cmd_user_signal($iid);				
				run_exec("php run_user.php $iid $p_name");
				trade_log("run_exec() php run_user.php $iid $p_name");	
				usleep(100000);
			
			}
							
					
			
		
		}
		
		
	} else {
		
		echo "#$sid nolu sinyal yok\n";
		
	}
	
}

$rsi = $my->query("SELECT * FROM `signals` WHERE id='$sid'");
$signal=$rsi->fetch_assoc();

$symbol=$signal['symbol'];

$tgh = $my->query("SELECT * FROM sinyalgrup where id = '1';");
$tgh1=$tgh->fetch_assoc();
$telegram_id = $tgh1['telegram_id'];


$signal_finished=0;
$signal_runned=0;

while(true) {
	
	try {
			
	
		$sm1 = $my->query("select * from rates_server.rates where symbol='$symbol'");
		$sym = $sm1->fetch_assoc();
		
		
		$ask = doubleval($sym['price']);
		$bid = doubleval($sym['price']);

		$sdate = $sym['dates'];
		
		//echo "$symbol >> $sdate ask:$ask bid:$bid\n";
		
		if($ask>0 && $bid>0) {
		
		} else {
			
			//echo "$symbol >> $sdate ask:$ask bid:$bid data bekleniyor ...\n";
			
			sleep(1);
			continue;
		}
		
		$rsi = $my->query("SELECT * FROM `signals` WHERE id='$sid'");
		$signal=$rsi->fetch_assoc();
		
		if(strtotime($signal['tarih'])+86400<time() && $signal['open']==0) {
			
			echo "Sinyal #$sid 24 saat içinde başlamadığı için iptal edildi\n";
			trade_log("Sinyal #$sid 24 saat içinde başlamadığı için iptal edildi\n");	
			$my->query("update `signals` set open=entry1,close=entry1,opendate=tarih,closedate=tarih WHERE id='$sid'");
			break;
			
		}
		
		if($signal['id']>0) {
			
		} else {

			echo "Sinyal #$sid bulunamadı\n";
			trade_log("Sinyal #$sid bulunamadı\n");	
			
			break;
			
		}
		
		if($signal['close']>0) {
			
			echo "Sinyal #$sid başarı ile tamamlandı\n";
			trade_log("Sinyal #$sid başarı ile tamamlandı\n");	
			
			break;
		}

		if($signal['trend'] == "LONG") {
			
			if($signal['open']==0) {
				
				$kucuk = min($signal['entry1'],$signal['entry2']);
				$buyuk = max($signal['entry1'],$signal['entry2']);
				
				if($kucuk<=$ask && $buyuk>=$ask) {
					
					$signal_str = "#".$signal['symbol']." ".$signal['trend']." sinyal takibe alındı. ✅\nEntry1 : ".$signal['entry1']."\nEntry2: ".$signal['entry2']."  Ask:".$sym['price'];
					ch_bildirim_ekle($telegram_id,$signal['signalid'],$signal['symbol'],$signal['trend'],$sym['ask'],$sdate,$signal['sl'],0,0,"OPEN",0,$signal_str);
					$my->query("update signals set open='$ask', opendate='$sdate' where id ='$sid'");
					run_user_signals($sid);
					$signal_runned=1;
				}
				
			} else {
				
				for($t=0;$t<=10;$t++) {
					
					if($t==0) {

						if($signal['stoploss'] == 0 && $signal['sl']>=$bid) {
							$profit = number_format( (((($bid/$signal['open'])*100)-100)*20),3, ".","");
							$signal_str = "#".$signal['symbol']." ".$signal['trend']." ";
							// bildirim_ekle(telegram_id,signal_str,-1*ss.signalid);
							ch_bildirim_ekle($telegram_id,$signal['signalid'],$signal['symbol'],$signal['trend'],$signal['open'],$signal['opendate'],$signal['sl'],$bid,$sdate,"SL",$profit,$signal_str);
							echo "update signals set stoploss='".$bid."',last_sl=1,profit='".$profit."', close='".$bid."', closedate='".$sdate."' where id ='".$sid."'\n";
							$my->query("update signals set stoploss='".$bid."',last_sl=1,profit='".$profit."', close='".$bid."', closedate='".$sdate."' where id ='".$sid."'");
							$new_upd=1;				
						
						}
					
					} else {
						
						if(($signal['takeprofit'] == 0 || $signal['takeprofit']<$signal['tp'.$t]) && $signal['last_tp']<$t && $signal['tp'.$t]>0 && $signal['tp'.$t]<=$bid) {
							
							$profit = number_format( (((($bid/$signal['open'])*100)-100)*20),3, ".","");
							// var signal_str = ss.symbol+" "+ss.trend+" sinyali TP1 e ulaştı. Open:"+ss.open+" TP1:"+ss.tp1+" Bid:"+sym.bid+" profit: %"+profit;
							$signal_str = "#".$signal['symbol']." ".$signal['trend']." Take-Profit ".$t." ✅\nProfit: %".$profit." ";
							//bildirim_ekle(telegram_id,signal_str,-1*ss.signalid);
							if($signal['tp'.($t+1)]>0) {
								ch_bildirim_ekle($telegram_id,$signal['signalid'],$signal['symbol'],$signal['trend'],$signal['open'],$signal['opendate'],$signal['sl'],$bid,$sdate,"TP".$t,$profit,$signal_str);
								$my->query("update signals set last_tp=$t,takeprofit='".$signal['tp'.$t]."',profit='".$profit."' where id ='".$signal['id']."'");
							} else {
								ch_bildirim_ekle($telegram_id,$signal['signalid'],$signal['symbol'],$signal['trend'],$signal['open'],$signal['opendate'],$signal['sl'],$bid,$sdate,"TP".$t,$profit,$signal_str);
								$my->query("update signals set last_tp=$t,takeprofit='".$signal['tp'.$t]."',close='$bid',closedate='$sdate',profit='".$profit."' where id ='".$signal['id']."'");
								$signal_finished=1;
							}
							
							$new_upd=1;				
							break;
						}
						
					}
					
				}

				if($signal_runned==0 && $signal['open']>0 && $signal['close']==0) {
					run_user_signals($sid);
					$signal_runned=1;
				}
									
					
			}
			
		} else if ($signal['trend'] == "SHORT") {
			

			if($signal['open']==0) {
				
				$kucuk = min($signal['entry1'],$signal['entry2']);
				$buyuk = max($signal['entry1'],$signal['entry2']);
				
				if($buyuk>=$bid && $kucuk<=$bid) {
					
					$signal_str = "#".$signal['symbol']." ".$signal['trend']." sinyal takibe alındı. ✅\nEntry1 : ".$signal['entry1']."\nEntry2: ".$signal['entry2']."  Bid:".$sym['price'];
					ch_bildirim_ekle($telegram_id,$signal['signalid'],$signal['symbol'],$signal['trend'],$sym['ask'],$sdate,$signal['sl'],0,0,"OPEN",0,$signal_str);
					$my->query("update signals set open='$ask', opendate='$sdate' where id ='$sid'");
					run_user_signals($sid);
					$signal_runned=1;
				}
				
			} else {
				
				for($t=0;$t<=10;$t++) {
					
					if($t==0) {

						if($signal['stoploss'] == 0 && $signal['sl']<=$ask) {
							$profit = number_format( (((($signal['open']/$ask)*100)-100)*20),3, ".","");
							$signal_str = "#".$signal['symbol']." ".$signal['trend']." ";
							// bildirim_ekle(telegram_id,signal_str,-1*ss.signalid);
							ch_bildirim_ekle($telegram_id,$signal['signalid'],$signal['symbol'],$signal['trend'],$signal['open'],$signal['opendate'],$signal['sl'],$bid,$sdate,"SL",$profit,$signal_str);
							echo "update signals set stoploss='".$bid."',last_sl=1,profit='".$profit."', close='".$bid."', closedate='".$sdate."' where id ='".$sid."'\n";
							$my->query("update signals set stoploss='".$bid."',last_sl=1,profit='".$profit."', close='".$bid."', closedate='".$sdate."' where id ='".$sid."'");
							$new_upd=1;				
						
						}
					
					} else {
						
						if(($signal['takeprofit'] == 0 || $signal['takeprofit']>$signal['tp'.$t]) && $signal['last_tp']<$t && $signal['tp'.$t]>0 && $signal['tp'.$t]>=$ask) {
							
							$profit = number_format( (((($signal['open']/$ask)*100)-100)*20),3, ".","");
							$signal_str = "#".$signal['symbol']." ".$signal['trend']." Take-Profit ".$t." ✅\nProfit: %".$profit." ";

							#ch_bildirim_ekle($telegram_id,$signal['signalid'],$signal['symbol'],$signal['trend'],$signal['open'],$signal['opendate'],$signal['sl'],$ask,$sdate,"TP".$t,$profit,$signal_str);
							#$my->query("update signals set last_tp=$t,takeprofit='".$signal['tp'.$t]."',profit='".$profit."' where id ='".$signal['id']."'");

							if($signal['tp'.($t+1)]>0) {
								ch_bildirim_ekle($telegram_id,$signal['signalid'],$signal['symbol'],$signal['trend'],$signal['open'],$signal['opendate'],$signal['sl'],$bid,$sdate,"TP".$t,$profit,$signal_str);
								$my->query("update signals set last_tp=$t,takeprofit='".$signal['tp'.$t]."',profit='".$profit."' where id ='".$signal['id']."'");
							} else {
								ch_bildirim_ekle($telegram_id,$signal['signalid'],$signal['symbol'],$signal['trend'],$signal['open'],$signal['opendate'],$signal['sl'],$bid,$sdate,"TP".$t,$profit,$signal_str);
								$my->query("update signals set last_tp=$t,takeprofit='".$signal['tp'.$t]."',close='$ask',closedate='$sdate',profit='".$profit."' where id ='".$signal['id']."'");
								$signal_finished=1;
							}
							
							$new_upd=1;				
							break;
						}
						
					}
					
				}
				

				if($signal_runned==0 && $signal['open']>0 && $signal['close']==0) {
					run_user_signals($sid);
					$signal_runned=1;
				}
									
					
			}
						
			
			
			
			
		}

		#echo "signal detail:".implode("\t",$signal)."\n";
		
		$my->query("update signals set tickdate='$sym[ticktime]',bid='$sym[bid]',ask='$sym[ask]' where id = '$sid';");
		
		
	} catch(Exception $err) {
		
		print_rr($err);
		
	}

	ob_flush();
	flush();
	sleep(1);
	
}

$my->close();

?>