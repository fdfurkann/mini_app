<?php 

class rbinance {
	public $auth = [];
	public $debug=false;
	public $digits=0;
	public $vdigits=0;
    private $base = 'https://fapi.binance.com';
	
	public function __construct($key="", $secret="") {
	$this->auth['key'] = $key;
	$this->auth['secret'] = $secret;
	}



	private function request($url, $params = [], $method = "GET") {
		$opt = [
			"http" => [
				"method" => $method,
				"header" => "User-Agent: Mozilla/4.0 (compatible; PHP Binance API)\r\n"
			]
		];
		$context = stream_context_create($opt);
		$query = http_build_query($params, '', '&');
		return json_decode(file_get_contents($this->base.$url.'?'.$query, false, $context), true);
	}
	private function signedRequest($url, $params = [], $method = "GET") {
		
		
		
		$params['timestamp'] = number_format(microtime(true)*1000,0,'.','');

		  if(stristr($method,"batchOrder")) {
			$query = "batchOrders=".$params['batchOrders']."&timestamp=".$params['timestamp'];  
		  } else {
			$query = http_build_query($params, '', '&');
		  }
		  
		$signature = hash_hmac('sha256', $query, $this->auth['secret']);
		$opt = [
			"http" => [
				"method" => $method,
				"ignore_errors" => true,
				"header" => "User-Agent: Mozilla/4.0 (compatible; PHP Binance API)\r\nX-MBX-APIKEY: {$this->auth['key']}\r\nContent-type: application/x-www-form-urlencoded\r\n"
			]
		];
		if ( $method == 'GET' ) {
			// parameters encoded as query string in URL
			$endpoint = "{$this->base}{$url}?{$query}&signature={$signature}";
		} else {
			// parameters encoded as POST data (in $context)
			$endpoint = "{$this->base}{$url}";
			$postdata = "{$query}&signature={$signature}";
			$opt['http']['content'] = $postdata;
		}
		$context = stream_context_create($opt);
		return json_decode(file_get_contents($endpoint, false, $context), true);
	}

	# Will sign and call specified API method
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
	
	
	$url = $method;
	
	if($private==1) {
		$sonuc = $this->signedRequest($url, $params, $http_method);
	} else {
		$sonuc = $this->request($url, $params, $http_method);
	}




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

	function get_exchange() {
	  return $this->call('/fapi/v1/exchangeInfo');
	  
	}

	function get_leverage() {
		$form = $this->call('/fapi/v1/leverageBracket',1,array(),"GET");
		$form = $this->obj2arr($form);
		return $form;
	}
	function api_set_leverage($symbol,$leverage) {
		$form = $this->call('/fapi/v1/leverage',1,array("symbol"=>$symbol,"leverage"=>$leverage),"POST");
		$form = $this->obj2arr($form);
		return $form;
	}

	function api_set_margin_type($symbol,$marginType) { // margintype =  	ISOLATED, CROSSED
		$form = $this->call('/fapi/v1/marginType',1,array("symbol"=>$symbol,"marginType"=>$marginType),"POST");
		$form = $this->obj2arr($form);
		return $form;
	}

	function api_permissions() { // margintype =  	ISOLATED, CROSSED
		$form = $this->call('/sapi/v1/account/apiRestrictions',1,array(),"GET");
		$form = $this->obj2arr($form);
		return $form;
	}

	function position_risk() {
		$form = $this->call('/fapi/v2/positionRisk',1,array(),"GET");
		$form = $this->obj2arr($form);
		
		$pozlar = array();
		
		foreach(@$form as $a => $b) {
			if(strlen($b['symbol'])>0) {
				$pozlar[$b['symbol']] = $b['positionAmt'];
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
		$form = $this->call('/fapi/v1/openOrders',1,array("symbol"=>$symbol),"GET");
		$form = $this->obj2arr($form);
		return $form;
	}

	function order_delete($symbol,$orderid) {
		
		$o_keys = array("symbol"=>$symbol,"orderId"=>$orderid); // ,"workingType"=>"CONTRACT_PRICE"
		
		$digits = $this->digits;
		$points = pow(10,$digits*-1);
		$points=0;
		$rtype = $type;
		
		
		$order = $this->call('/fapi/v1/order',1,$o_keys,"DELETE");
		
		
		if($order->code<0) {
			echo "order_delete(error): ".$order->code." ".$order->msg."\n";
			return $order;
		}
		
		$order = $this->obj2arr($order);
		return $order;
	}

	function order_send($symbol,$side,$type,$amount,$price,$cls=0) {
		
		
		$o_keys = array("symbol"=>$symbol,"side"=>$side,"type"=>$type); // ,"workingType"=>"CONTRACT_PRICE"
		
		$debug=$this->debug;
		$digits = $this->digits;
		$points = pow(10,$digits*-1);
		$points=0;
		$rtype = $type;
		

		$emri_kapat = 1;
		
		if($cls == 1) {
			
			$p_risk = $this->position_risk();
			
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
		
		if($type == "MARKET") {
			$o_keys['quantity'] = $amount;

		} else if($type == "LIMIT") {
			$o_keys['quantity'] = $amount;
			$o_keys['price'] = $price;
			$o_keys['timeInForce'] = "GTC";
		} else if($type == "STOP") {
			
			if($side=="BUY") {
				$price1=$price-$points;
			}else{
				$price1=$price+$points;
			}
			$o_keys['timeInForce'] = "GTC";
			$o_keys['type'] = "STOP_MARKET";
			$o_keys['quantity'] = $amount;
			//$o_keys['price'] = $price;
			$o_keys['stopPrice'] = $price1;
		} else if($type == "SL") {
			$o_keys['type'] = "STOP_MARKET";
			$o_keys['closePosition'] = "true";
			$o_keys['stopPrice'] = $price;
			
		} else if($type == "TP") {
			$o_keys['type'] = "TAKE_PROFIT_MARKET";
			$o_keys['closePosition'] = "true";
			$o_keys['stopPrice'] = $price;
		}
	
		if($cls==1) {
			$o_keys['reduceOnly'] = "true";
		}
				
		
		$sure_baslangici = microtime(true);
		
		
		if ($emri_kapat == 1) {
			
			$order = $this->call('/fapi/v1/order',1,$o_keys,"POST");
			
			
			$sure_bitimi = microtime(true);
			$sure = $sure_bitimi - $sure_baslangici;
			// echo "gecen sure: $sure suan:$sure_bitimi\n";
			
			if($order->code<0) {
				echo "order_send(error): ".$order->code." ".$order->msg."\n";
				return $order;
			}
			if($this->debug) print_r($order);
			$order = $this->obj2arr($order);
			
		} else {
			
			$order['code'] = -100;
			$order['msg'] = "order already closed";
			
			
		}
		
		return $order;
	}

	function prepare_order($symbol,$side,$type,$amount,$price,$cls=0) {
		
		$symbol=str_replace("/","",$symbol);
		
		$digits=$this->digits;
		$vdigits=$this->vdigits;
		
		$o_keys = array("symbol"=>$symbol,"side"=>$side,"type"=>$type); // ,"workingType"=>"CONTRACT_PRICE"

		$points = pow(10,$digits*-1);
		$points=0;
		$rtype = $type;
		
		if($type == "MARKET") {
			$o_keys['quantity'] = $amount;
			if($cls==1) {
				//$o_keys['closePosition'] = "true";
				$o_keys['priceProtect'] = "true";
			}
			
		} else if($type == "LIMIT") {
			$o_keys['quantity'] = $amount;
			$o_keys['price'] = $price;
			$o_keys['timeInForce'] = "GTC";
		} else if($type == "STOP") {
			
			if($side=="BUY") {
				$price1=$price-$points;
			}else{
				$price1=$price+$points;
			}
			$o_keys['timeInForce'] = "GTC";
			$o_keys['type'] = "STOP_MARKET";
			$o_keys['quantity'] = $amount;
			$o_keys['priceProtect'] = "true";
			//$o_keys['price'] = $price;
			$o_keys['stopPrice'] = $price1;
		} else if($type == "SL") {
			$o_keys['type'] = "STOP_MARKET";
			$o_keys['timeInForce'] = "GTE_GTC";
			$o_keys['closePosition'] = "true";
			$o_keys['priceProtect'] = "true";
			$o_keys['stopPrice'] = $price;
		} else if($type == "TP") {
			$o_keys['type'] = "TAKE_PROFIT_MARKET";
			$o_keys['timeInForce'] = "GTE_GTC";
			$o_keys['closePosition'] = "true";
			$o_keys['priceProtect'] = "true";
			$o_keys['stopPrice'] = $price;
		}
		//$o_keys['timestamp'] = number_format(microtime(true) * 1000, 0, '.', '');
		
		// echo json_encode($o_keys)."\n";
		
		return $o_keys;
			
	}

	function bulk_order_send($orders) {
		
		$sure_baslangici = microtime(true);
		
		$o_keys['batchOrders']=json_encode($orders);
		
		$order = $this->call('/fapi/v1/batchOrders',1,$o_keys,"POST");
		
		$sure_bitimi = microtime(true);
		$sure = $sure_bitimi - $sure_baslangici;
		// echo "gecen sure: $sure suan:$sure_bitimi\n";
		
		if($this->debug) print_r($order);
		$order = $this->obj2arr($order);
		return $order;
	}  

    // Trade geçmişi (kapanan işlemler)
    function trade_history($symbol = "", $limit = 20) {
        $params = array();
        if ($symbol) $params['symbol'] = $symbol;
        $params['limit'] = $limit;
        $form = $this->call('/fapi/v1/userTrades', 1, $params, "GET");
        $form = $this->obj2arr($form);
        return $form;
    }

}

