<?php 
include("mysql.php");

$PHP_SELF = $_SERVER['PHP_SELF'];
$ps_aux = shell_exec("ps aux | grep $PHP_SELF");
if(stristr($ps_aux,"php $PHP_SELF")) {
//	die("$PHP_SELF dosyası açık olduğu için bu dosya başlatılamaz\n");
}

$bn = new rbinance();

$my->query("DROP TABLE IF EXISTS `symboldata`;");
$my->query("CREATE TABLE `symboldata` (
  `id` int(11) NOT NULL,
  `symbol` varchar(100) NOT NULL,
  `base` varchar(100) NOT NULL,
  `quote` varchar(100) NOT NULL,
  `digits` int(11) NOT NULL,
  `vdigits` int(11) NOT NULL,
  `ws` int(1) NOT NULL,
  `ticktime` bigint(20) NOT NULL,
  `bid` double NOT NULL,
  `ask` double NOT NULL
) ENGINE=MEMORY DEFAULT CHARSET=utf8;");
$my->query("ALTER TABLE `symboldata` ADD PRIMARY KEY (`id`);");
$my->query("ALTER TABLE `symboldata` ADD INDEX(`symbol`);");
$my->query("ALTER TABLE `symboldata` ADD INDEX(`ws`);");
$my->query("ALTER TABLE `symboldata` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;");



$exchange = $bn->get_exchange();


foreach($exchange['symbols'] as $s1 => $s2) {
	
	$my->query("INSERT INTO `symboldata` (`id`, `symbol`, `base`, `quote`, `digits`, `vdigits`, `ws`, `ticktime`, 
	`bid`, `ask`) VALUES (NULL, '$s2[symbol]', '$s2[baseAsset]', '$s2[quoteAsset]', '$s2[pricePrecision]', '$s2[quantityPrecision]', '0', '0', '0', '0');");
	
}

function run_exec($cmd) {
	global $p_name;
	
    if (stristr($cmd,"node")){
        exec("nohup ".$cmd . " >> trade_bot_{$p_name}.txt 2>&1 &");  
		echo "nohup ".$cmd . " >> trade_bot_{$p_name}.txt 2>&1 &\n";
		
    }
    elseif (substr(php_uname(), 0, 7) == "Windows"){
        pclose(popen("start /b ". $cmd,"w")); 
    }
    else {
        exec("nohup ".$cmd . " >> trade_bot_{$p_name}.txt 2>&1 &");  
		echo "nohup ".$cmd . " >> trade_bot_{$p_name}.txt 2>&1 &\n";
    }
}


//$po =  run_exec("node ws.js $p_name");
//echo $p_name." - "."websocket started\n";


$start_ed=array();

/*
$my->query("truncate table signals");
$my->query("truncate table user_signals");
$my->query("truncate table bildirimler");
$my->query("truncate table bildirimler_ch");
*/

//$my->query("update signals set close = tp5 where close = 0;");
//$my->query("update `user_signals` set close=open where open>0 and close=0;");

while(true) {
	
	
	$signals = $my->query("SELECT * FROM signals where close=0;");
	
	while($sg = $signals->fetch_assoc()) {
		
		$id = $sg['id'];
		$symbol = $sg['symbol'];
		
		if(stristr($sg['symbol'],"1000")) {
			continue;
		}
		
		if($start_ed[$id]!=true) { 
			
			$my->query("update symboldata set `ws`=1 where `ws` != 2 and symbol='$symbol'");
			//$my->query("update signals set close = tp3,closedate=from_unixtime(tickdate/1000) where id = '$id' and tp4=0 and tp5=0 and takeprofit=tp3;");
			//$my->query("update signals set close = tp4,closedate=from_unixtime(tickdate/1000) where id = '$id' and tp5=0 and takeprofit=tp4;");
									
			run_exec("php run_signal.php $id $p_name");
			echo "exec_signal -> php run_signal.php $id $p_name\n";
			trade_log("exec_signal -> php run_signal.php $id $p_name\n");
			$start_ed[$id]=true;
		}
		
	}
	
	// echo date("Y-m-d H:i:s")."<br>\n";
	ob_flush();
	flush();
	
	sleep(1);
}

$my->close();

?>
