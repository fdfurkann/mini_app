<?php 

class rbybit {
	public $auth = [];
	public $debug=true;
	public $digits=0;
	public $vdigits=0;
	public $base="";
	
	public function __construct($key="", $secret="") {
	$this->auth['key'] = $key;
	$this->auth['secret'] = $secret;
	}
	private function request($url, $params = [], $method = "GET") {
		$opt = [
			"http" => [
				"method" => $method,
				"header" => "User-Agent: Mozilla/4.0 (compatible; PHP ByBIT API)\r\n"
			]
		];
		$context = stream_context_create($opt);
		$query = http_build_query($params, '', '&');
		return json_decode(file_get_contents($this->base.$url.'?'.$query, false, $context), true);
	}
	private function signedRequest($url, $params = [], $method = "GET") {
		
		
		
		$timestamp = number_format(microtime(true)*1000,0,'.','');

		  if(stristr($method,"batchOrder")) {
			$query = "batchOrders=".$params['batchOrders'];  
		  } else {
			if($method=="GET") {
				$query = http_build_query($params, '', '&');
			} else {
				$query = json_encode($params);
			}
		  }
		  
		
		$signature = hash_hmac('sha256', $timestamp.$this->auth['key']."5000".$query, $this->auth['secret']);
		if($method=="POST") {
			$opt = [
				"http" => [
					"method" => $method,
					"ignore_errors" => true,
					"header" => "X-BAPI-SIGN: {$signature}\r\n".
					"X-BAPI-API-KEY: {$this->auth['key']}\r\n".
					"X-BAPI-TIMESTAMP: {$timestamp}\r\n".
					"X-BAPI-RECV-WINDOW: 5000\r\n".
					"Content-type: application/json\r\n"
				]
			];
			
		} else {
				
			$opt = [
				"http" => [
					"method" => $method,
					"ignore_errors" => true,
					"header" => "User-Agent: Mozilla/4.0 (compatible; PHP ByBIT API)\r\n".
					"X-BAPI-SIGN: {$signature}\r\n".
					"X-BAPI-API-KEY: {$this->auth['key']}\r\n".
					"X-BAPI-TIMESTAMP: {$timestamp}\r\n".
					"X-BAPI-RECV-WINDOW: 5000\r\n".
					"Content-type: application/x-www-form-urlencoded\r\n"
				]
			];			
			
		}
		if ( $method == 'GET' ) {
			// parameters encoded as query string in URL
			$endpoint = "{$this->base}{$url}?{$query}";
		} else {
			// parameters encoded as POST data (in $context)
			$endpoint = "{$this->base}{$url}";
			$postdata = "{$query}";
			$opt['http']['content'] = $postdata;
		}
		
		
		$context = stream_context_create($opt);
		return json_decode(file_get_contents($endpoint, false, $context), true);
	}
	function call($method, $private=0, $params = [], $http_method = 'GET') {

	$sonuc = "";
	
	
	/*
	


	if ($private==1 ) {
	  $params['timestamp'] = number_format(microtime(true) * 1000, 0, '.', '');
	  
	  if(stristr($method,"batchOrder")) {
		$query = "batchOrders=".$params['batchOrders']."&timestamp=".$params['timestamp'];  
	  } else {
		$query = http_build_query($params, '', '&');
	  }
	  
	  $sign = hash_hmac('sha256', $query, $this->auth['secret']);
	  $url .= '?' . $query . '&signature=' . $sign;
	}
	else if ( $params ) {
	  $query = http_build_query($params, '', '&');
	  $url .= '?' . $query;
	}

	
	
	*/
	
	
	$url = 'https://api.bybit.com' . $method;
	
	if($private==1) {
		$sonuc = $this->signedRequest($url, $params, $http_method);
	} else {
		$sonuc = $this->request($url, $params, $http_method);
	}

	
	echo "url: $url\n";
	echo "params: ".http_build_query($params)."\n";


	return $sonuc;
	}
	function signed($method) {
	return !(
	  (strpos($method, 'ticker/price')  !== false) ||
	  (strpos($method, '/exchangeInfo') !== false) ||
	  (strpos($method, '/depth')        !== false)
	);
	}   
	function obj2arr($arr) {
		
		/*
		$new_arr=array();
		foreach($arr as $a => $b) {
			if(is_object($b) or is_array($b)) {
				$new_arr[$a] = $this->obj2arr($b);
			} else {
				$new_arr[$a] = $b;
			}
		}
		*/
		
		return $arr;
	}
	function call_http($url, $options = []) {
	$c = curl_init( $url );
	curl_setopt_array($c, $options);

	if ( $error = curl_error($c) ) {
	  return $error;
	}

	$respone = json_decode(curl_exec($c),true);

	return $respone;
	}

	function get_exchange_2() {
		$form = $this->call('/derivatives/v3/public/instruments-info',1,array(),"GET");
		$form = $this->obj2arr($form);
		return $form['result']['list'];
	  
	}
	


	function get_exchange() {
		//$form = $this->call('/derivatives/v3/public/instruments-info',1,array(),"GET");
		$form = $this->call('/v5/market/instruments-info',1,array("category"=>"linear","limit"=>1000),"GET");
		$form = $this->obj2arr($form);
		return $form['result']['list'];
	  
	}	

	function get_leverage_2() {
		$form = $this->call('/derivatives/v3/public/instruments-info',1,array(),"GET");
		$form = $this->obj2arr($form);
		return $form['result']['list'];
	}
	
	

	function get_leverage() {
		//$form = $this->call('/derivatives/v3/public/instruments-info',1,array(),"GET");
		$form = $this->call('/v5/market/instruments-info',1,array("category"=>"linear"),"GET");
		$form = $this->obj2arr($form);
		return $form['result']['list'];
	  
	}	
	
	function api_set_leverage_2($symbol,$leverage) {
		$form = $this->call('/contract/v3/private/position/set-leverage',1,array("symbol"=>$symbol,"buyLeverage"=>$leverage,"sellLeverage"=>$leverage),"POST");
		$form = $this->obj2arr($form);
		$form1 = array();
		$form1['code'] = $form['retCode'];
		$form1['msg'] = $form['retMsg'];
		return $form1;
	}
	
	function api_set_leverage($symbol,$leverage) {
		$form = $this->call('/v5/position/set-leverage',1,array("category"=>"linear","symbol"=>$symbol,"buyLeverage"=>"".$leverage,"sellLeverage"=>"".$leverage),"POST");
		$form = $this->obj2arr($form);
		$form1 = array();
		$form1['code'] = $form['retCode'];
		$form1['msg'] = $form['retMsg'];
		return $form1;
	}
	function api_upgrade_unified() {
		$form = $this->call('/v5/account/upgrade-to-uta',1,array(),"POST");
		$form = $this->obj2arr($form);
		$form1 = array();
		$form1['code'] = $form['retCode'];
		$form1['msg'] = $form['retMsg'];
		return $form1;
	}

	function api_switch_mode($symbol,$trading_mode) { // margintype =  	ISOLATED, CROSSED
		if ($marginType == "ISOLATED") $marginType = 1;
		if ($marginType == "CROSSED") $marginType = 0;
		
		$form = $this->call('/v5/position/switch-mode',1,array("category"=>"linear","symbol"=>$symbol,"coin"=>null,"mode"=>$trading_mode),"POST");
		$form = $this->obj2arr($form);
		$form1 = array();
		$form1['code'] = $form['retCode'];
		$form1['msg'] = $form['retMsg'];		
		return $form1;
	}

	function api_set_margin_mode($marginType) { // margintype =  	ISOLATED, CROSSED
		
		// $marginType = ISOLATED_MARGIN, REGULAR_MARGIN, PORTFOLIO_MARGIN
		
		$form = $this->call('/v5/account/set-margin-mode',1,array("setMarginMode"=>$marginType),"POST");
		$form = $this->obj2arr($form);
		$form1 = array();
		$form1['code'] = $form['retCode'];
		$form1['msg'] = $form['retMsg'];		
		return $form1;
	}

	function api_set_margin_type($symbol,$marginType,$leverage="20") { // margintype =  	ISOLATED, CROSSED
		if ($marginType == "ISOLATED") $marginType = 1;
		if ($marginType == "CROSSED") $marginType = 0;
		
		$form = $this->call('/v5/position/switch-isolated',1,array("category"=>"linear","symbol"=>$symbol,"buyLeverage"=>"".$leverage,"sellLeverage"=>"".$leverage,"tradeMode"=>$marginType),"POST");
		$form = $this->obj2arr($form);
		$form1 = array();
		$form1['code'] = $form['retCode'];
		$form1['msg'] = $form['retMsg'];		
		return $form1;
	}

	function api_permissions() { // margintype =  	ISOLATED, CROSSED
		$form = $this->call('/sapi/v1/account/apiRestrictions',1,array(),"GET");
		$form = $this->obj2arr($form);
		return $form;
	}

	function position_risk() {
		$form = $this->open_positions();
		$form = $form;
		
		$pozlar = array();
		
		foreach(@$form as $a => $b) {
			if(strlen($b['symbol'])>0) {
				$pozlar[$b['symbol']] = ($b['side']=="Buy" ? $b['size'] : $b['size']*-1);
			
			}
		}
		
		return $pozlar;
	}

	function api_set_position_mode($dualSidePosition) { // true = hedge mode , false = one way mode
		$form = $this->call('/fapi/v1/positionSide/dual',1,array("dualSidePosition"=>$dualSidePosition),"POST");
		$form = $this->obj2arr($form);
		return $form;
	} 

	function api_set_multi_asset_mode($multiAssetsMargin) { // true = multi asset mode , false = single asset mode
		$form = $this->call('/fapi/v1/multiAssetsMargin',1,array("multiAssetsMargin"=>$multiAssetsMargin),"POST");
		$form = $this->obj2arr($form);
		return $form;
	}
	
	function open_orders($symbol="") { // true = multi asset mode , false = single asset mode
		$form = $this->call('/v5/order/realtime',1,array("category"=>"linear","settleCoin"=>"USDT"),"GET");
		$form = $this->obj2arr($form);
		return $form['result']['list'];
	}
	function fapi_historicalTrades() { // true = multi asset mode , false = single asset mode
		$form = $this->call('/v5/position/closed-pnl',1,array("category"=>"linear","settleCoin"=>"USDT"),"GET");
		$form = $this->obj2arr($form);
		return $form['result']['list'];
	}

	function open_positions($symbol="") { // true = multi asset mode , false = single asset mode
		$form = $this->call('/v5/position/list',1,array("category"=>"linear","settleCoin"=>"USDT"),"GET");
		$form = $this->obj2arr($form);
		return $form['result']['list'];
	}
	
	function get_account_info($symbol="") { // true = multi asset mode , false = single asset mode
		$form = $this->call('/v5/account/info',1,array(),"GET");
		$form = $this->obj2arr($form);
		return $form;
	}

	function order_delete($symbol,$orderid) {
		
		$o_keys = array("category"=>"linear","symbol"=>$symbol,"orderId"=>$orderid); // ,"workingType"=>"CONTRACT_PRICE"
		
		$digits = $this->digits;
		$points = pow(10,$digits*-1);
		$points=0;
		$rtype = $type;
		
		 
		$order = $this->call('/v5/order/cancel',1,$o_keys,"POST");
		
		
		if($order->code<0) {
			echo "order_delete(error): ".$order->code." ".$order->msg."\n";
			return $order;
		}
		
		$order = $this->obj2arr($order);
		return $order;
	}

	function order_send($symbol,$side,$type,$amount,$price,$cls=0) {
		
		print_r("order_send(symbol:$symbol,side:$side,type:$type,amount:$amount,price:$price,cls:$cls)");
		
		$o_keys = array("category"=>"linear","symbol"=>$symbol,"side"=>$side,"orderType"=>$type); // ,"workingType"=>"CONTRACT_PRICE"
		
		$debug=$this->debug;
		$digits = $this->digits;
		$points = pow(10,$digits*-1);
		$points=0;
		$rtype = $type;
		

		$emri_kapat = 1;
		
		if($cls == 1) {
			
			$p_risk = $this->position_risk($symbol);
			
			$kac_lot = $p_risk[$symbol];
			
			if ($side == "SELL" && $kac_lot>0) {
				if($amount>abs($kac_lot)) {
					$amount = abs($kac_lot);
				}
			} else if ($side == "BUY" && $kac_lot<0) {
				if($amount>abs($kac_lot)) {
					$amount = abs($kac_lot);
				}
			} else {
				$emri_kapat = 0;
			}
			
			
		}	

		print_r("emri_kapat : $emri_kapat");
		
		if($type == "MARKET") {
			$o_keys['category'] = "linear";
			$o_keys['qty'] = $amount."";
			if ($o_keys['side']=="BUY") { $o_keys['side']="Buy";	}
			if ($o_keys['side']=="SELL") { $o_keys['side']="Sell";	}
			$o_keys['orderType']="Market";

		} else if($type == "LIMIT") {
			$o_keys['category'] = "linear";
			$o_keys['qty'] = $amount."";
			$o_keys['price'] = $price."";
			if ($o_keys['side']=="BUY") { $o_keys['side']="Buy";	}
			if ($o_keys['side']=="SELL") { $o_keys['side']="Sell";	}
			$o_keys['orderType']="Limit";
			$o_keys['timeInForce'] = "GTC";
		} else if($type == "STOP") {
			
			if($side=="BUY") {
				$price1=$price-$points; 
			}else{
				$price1=$price+$points;
			}
			$o_keys['category'] = "linear";
			$o_keys['timeInForce'] = "GTC";
			$o_keys['type'] = "STOP_MARKET";
			$o_keys['qty'] = $amount."";
			//$o_keys['price'] = $price;
			$o_keys['stopPrice'] = $price1."";
		} else if($type == "SL") {
			$o_keys=array();
			$o_keys['category'] = "linear";
			$o_keys['symbol'] = $symbol;
			$o_keys['stopLoss'] = $price."";
			$o_keys['tpslMode'] = "Full";			
			$o_keys['positionIdx'] = "0";			
			
		} else if($type == "TP") {
			$o_keys=array();
			$o_keys['category'] = "linear";
			$o_keys['symbol'] = $symbol;
			$o_keys['takeProfit'] = $price."";
			$o_keys['tpslMode'] = "Full";	
			$o_keys['positionIdx'] = "0";					
		}
	
		if($cls==1) {
			$o_keys['reduceOnly'] = "true";
		}
				
		//$o_keys['positionIdx'] = 0;		
		$sure_baslangici = microtime(true);
		
		
		print_r("o_keys:".print_r($o_keys,1));
		print_r($o_keys);
		
		if ($emri_kapat == 1) {
			 
			if($type == "TP" or $type == "SL") {
				print_r("call url:/v5/position/trading-stop");
				$order = $this->call('/v5/position/trading-stop',1,$o_keys,"POST");	
			} else {
				print_r("call url:/v5/order/create");
				$order = $this->call('/v5/order/create',1,$o_keys,"POST");
			}
			
			print_r(" order result:".print_r($order,1));
			
			$sure_bitimi = microtime(true);
			$sure = $sure_bitimi - $sure_baslangici;
			// echo "gecen sure: $sure suan:$sure_bitimi\n";
			
			if($this->debug) print_r($order,1);
			$order = $this->obj2arr($order);
			
			$n_order = array();
			if(($type == "TP" or $type == "SL") && $order['retMsg']=="OK") {
				
				$ords = $this->open_orders($symbol);
				
				foreach($ords as $a1 => $b1) {
					
					if($b1['stopOrderType']=="TakeProfit" and $type == "TP") {
						$n_order['orderId'] = $b1['orderId'];
						break;
					} else if($b1['stopOrderType']=="StopLoss" and $type == "SL") {
						$n_order['orderId'] = $b1['orderId'];
						break;
					}
					
				}
				
				$n_order['status'] = "FILLED";
				
			} else if(@$order['result']['orderId']!="") {
				$n_order['orderId'] = $order['result']['orderId'];
				$n_order['status'] = "FILLED";
			}
			
			$n_order['code'] = ($order['retCode']>0 ? $order['retCode'] : "");
			$n_order['msg'] = $order['retMsg'];
			$order=$n_order;
			
		} else {
			
			$order['code'] = -100;
			$order['msg'] = "order already closed";
			
			
		}
		
		return $order;
	}

	function prepare_order($symbol,$side,$type,$amount,$price,$cls=0) {
		
		//$symbol=str_replace("/","",$symbol);
		
		$digits=$this->digits;
		$vdigits=$this->vdigits;
		
		$o_keys = array("category"=>"linear","symbol"=>$symbol,"side"=>$side,"orderType"=>$type); // ,"workingType"=>"CONTRACT_PRICE"

		$points = pow(10,$digits*-1);
		$points=0;
		$rtype = $type;
		
		if($type == "MARKET") {
			unset($o_keys['type']);
			$o_keys['category'] = "linear";
			$o_keys['type'] = "MARKET";
			$o_keys['qty'] = $amount."";
			if ($o_keys['side']=="BUY") { $o_keys['side']="Buy";	}
			if ($o_keys['side']=="SELL") { $o_keys['side']="Sell";	}
			$o_keys['orderType']="Market";

		} else if($type == "LIMIT") {
			unset($o_keys['type']);
			$o_keys['category'] = "linear";
			$o_keys['type'] = "LIMIT";			
			$o_keys['qty'] = $amount."";
			$o_keys['price'] = $price."";
			if ($o_keys['side']=="BUY") { $o_keys['side']="Buy";	}
			if ($o_keys['side']=="SELL") { $o_keys['side']="Sell";	}
			$o_keys['orderType']="Limit";
			$o_keys['timeInForce'] = "GTC";
		} else if($type == "STOP") {
			
			if($side=="BUY") {
				$price1=$price-$points; 
			}else{
				$price1=$price+$points;
			}
			$o_keys['category'] = "linear";
			$o_keys['timeInForce'] = "GTC";
			$o_keys['type'] = "STOP_MARKET";
			$o_keys['qty'] = $amount."";
			//$o_keys['price'] = $price;
			$o_keys['stopPrice'] = $price1."";
		} else if($type == "SL") {
			$o_keys=array();
			$o_keys['category'] = "linear";
			$o_keys['type'] = "SL";
			$o_keys['symbol'] = $symbol;
			$o_keys['stopLoss'] = $price."";
			$o_keys['tpslMode'] = "Full";
			$o_keys['qty'] = $amount."";
			$o_keys['timeInForce'] = "GTC";			
			
		} else if($type == "TP") {
			$o_keys=array();
			$o_keys['category'] = "linear";
			$o_keys['type'] = "TP";
			$o_keys['symbol'] = $symbol;
			$o_keys['takeProfit'] = $price."";
			$o_keys['tpslMode'] = "Full";	
			$o_keys['qty'] = $amount."";
			$o_keys['timeInForce'] = "GTC";
		}
	
		if($cls==1) {
			$o_keys['reduceOnly'] = "true";
		}
		
		$o_keys['qty'] = $o_keys['qty']."";
			
		//$o_keys['timestamp'] = number_format(microtime(true) * 1000, 0, '.', '');
		
		// echo json_encode($o_keys)."\n";
		
		return $o_keys;
			
	}

	function bulk_order_send($orders) {
		
		$sure_baslangici = microtime(true);
		
		$n_orders = array();
		
		foreach($orders as $o_id => $order) {
			
			$type=$order['type'];
			unset($order['type']);
			
			$symbol = $order['symbol'];

			if($type == "TP" || $type == "SL") {
				$order = $this->call('/v5/position/trading-stop',1,$order,"POST");	
			} else {
				$order = $this->call('/v5/order/create',1,$order,"POST");
			}
			
			
			$sure_bitimi = microtime(true);
			$sure = $sure_bitimi - $sure_baslangici;
			// echo "gecen sure: $sure suan:$sure_bitimi\n";
			
			if($this->debug) print_r(print_r($order,1));
			$order = $this->obj2arr($order);
			
			$n_order = array();
			if(($type == "TP" or $type == "SL") && $order['retMsg']=="OK") {

				$ords = $this->open_orders($symbol);
				
				foreach($ords as $a1 => $b1) {
					
					if($b1['stopOrderType']=="TakeProfit" and $type == "TP") {
						$n_order['orderId'] = $b1['orderId'];
						break;
					} else if($b1['stopOrderType']=="StopLoss" and $type == "SL") {
						$n_order['orderId'] = $b1['orderId'];
						break;
					}
					
				}
				
				$n_order['status'] = "FILLED";
				
			} else if(@$order['result']['orderId']!="") {
				$n_order['orderId'] = $order['result']['orderId'];
				$n_order['status'] = "FILLED";
			}
			
			$n_order['code'] = ($order['retCode']>0 ? $order['retCode'] : "");
			$n_order['msg'] = $order['retMsg'];
			$n_orders[]=$n_order;
					
			
			
			
		}
		
		
		$order=$orders;
		
		return $n_orders;
	}  

}

