<?php 

class rbingx {
	public $auth = [];
	public $debug=true;
	public $digits=0;
	public $vdigits=0;
	public $base="";
	
	public function __construct($key="", $secret="") {
	$this->auth['key'] = $key;
	$this->auth['secret'] = $secret;
	}

	function get_sign($api_secret, $payload) {
	
		$signature = hash_hmac('sha256', $payload, $api_secret);
		//echo "sign=$signature\n";
		return $signature;
	}

	function send_request($method, $path, $urlpa, $payload, $api_secret) {
		global $APIURL, $APIKEY;
		
		
		$APIURL = 'https://open-api.bingx.com';
		$APIKEY = $this->auth['key'];
	
		
		$url = "$APIURL$path?$urlpa&signature=" . $this->get_sign($api_secret, $urlpa);
		//echo $url . "\n";
		$headers = array(
			'X-BX-APIKEY: ' . $APIKEY,
		);
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, $url);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
		curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
		curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
		$response = curl_exec($ch);
		curl_close($ch);
		return json_decode($response);
	}

	function praseParam($paramsMap) {
		ksort($paramsMap);
		$paramsStr = implode("&", array_map(function ($k, $v) {
			return "$k=$v";
		}, array_keys($paramsMap), $paramsMap));
		return $paramsStr . "&timestamp=" . round(microtime(true) * 1000);
	}	
	
	function call($method, $private=0, $params = [], $http_method = 'GET') {

	$sonuc = "";
	

	

    $payload = array();
    $path = $method;
    $method = $http_method;
    $paramsMap = $params;
    $paramsStr = $this->praseParam($paramsMap);
    $sonuc= $this->send_request($method, $path, $paramsStr, $payload, $this->auth['secret']);



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
		$form = $this->call('/openApi/swap/v2/quote/contracts',1,array(),"GET");
		$form = $this->obj2arr($form);
		return $form;
	  
	}	

	function get_leverage($symbol="") {
		$symbol = str_replace("USDT","-USDT",$symbol);
		//$form = $this->call('/derivatives/v3/public/instruments-info',1,array(),"GET");
		$form = $this->call('/openApi/swap/v2/trade/leverage',1,array("symbol"=>$symbol,"timestamp"=>round(microtime(true) * 1000)),"GET");
		$form = $this->obj2arr($form);
		return $form;
	  
	}	
	
	function api_set_leverage($symbol,$leverage) {
		
		$symbol = str_replace("USDT","-USDT",$symbol);
		
		$form = $this->call('/openApi/swap/v2/trade/leverage',1,array("timestamp"=>round(microtime(true) * 1000),"side"=>"BOTH","symbol"=>$symbol,"leverage"=>$leverage),"POST");
		$form = $this->obj2arr($form);
		
		$form1 = array();
		$form1['code'] = $form->code;
		$form1['msg'] = $form->msg;
		return $form;
	}

	function api_set_margin_type($symbol,$marginType) { // margintype =  	ISOLATED, CROSSED

		
		$symbol = str_replace("USDT","-USDT",$symbol);
		
		$form = $this->call('/openApi/swap/v2/trade/marginType',1,array("timestamp"=>round(microtime(true) * 1000),"marginType"=>$marginType,"symbol"=>$symbol,"recvWindow"=>"60000"),"POST");
		$form = $this->obj2arr($form);
		
		$form1 = array();
		$form1['code'] = $form->code;
		$form1['msg'] = $form->msg;
		return $form;
	}

	function api_permissions() { // margintype =  	ISOLATED, CROSSED
		$form = $this->call('/sapi/v1/account/apiRestrictions',1,array(),"GET");
		$form = $this->obj2arr($form);
		return $form;
	}

	function position_risk() {
		$form = $this->open_positions();
		$pozlar = array();
		foreach(@$form->data as $a => $b) {
			$nbs = str_replace("-","",$b->symbol);
			if(strlen($nbs)>0) {
				$pozlar[$nbs] = ($b->positionSide=="LONG" ? $b->availableAmt : $b->availableAmt*-1);
			
			}
		}
		
		

		return $pozlar;
	}

	function open_orders($symbol="") { // true = multi asset mode , false = single asset mode

		$symbol = str_replace("USDT","-USDT",$symbol);	
		$form = $this->call('/openApi/swap/v2/trade/openOrders',1,array("symbol"=>$symbol,"timestamp"=>round(microtime(true) * 1000)),"GET");
		$form = $this->obj2arr($form);
        // Eğer data alanı varsa onu döndür
        if (isset($form->data)) return $form->data;
        if (isset($form['data'])) return $form['data'];
        return $form;
	}

    // Pozisyonlar için eksik olan positions fonksiyonu
    function positions($symbol="") {
        $result = $this->open_positions($symbol);
        // Eğer data alanı varsa onu döndür
        if (isset($result->data)) return $result->data;
        if (isset($result['data'])) return $result['data'];
        return $result;
    }

	function fapi_historicalTrades() { // true = multi asset mode , false = single asset mode

		$symbol = str_replace("USDT","-USDT",$symbol);	
		$form = $this->call('/openApi/swap/v2/trade/allOrders',1,array("startTime"=>round(microtime(true) * 1000)-(86400*7*1000),"endTime"=>round(microtime(true) * 1000),"timestamp"=>round(microtime(true) * 1000)),"GET");
		$form = $this->obj2arr($form);
		
		return $form->data->orders;
	}

	function open_positions($symbol="") { // true = multi asset mode , false = single asset mode

		$symbol = str_replace("USDT","-USDT",$symbol);	
		$form = $this->call('/openApi/swap/v2/user/positions',1,array("symbol"=>$symbol,"recvWindow"=>"0","timestamp"=>round(microtime(true) * 1000)),"GET");
		$form = $this->obj2arr($form);
		return $form;
	}
	
	function get_account_info($symbol="") { // true = multi asset mode , false = single asset mode
		$form = $this->call('/openApi/swap/v2/user/balance',1,array(),"GET");
		$form = $this->obj2arr($form);
		return $form;
	}

	function order_delete($symbol,$orderid) {
		
		$symbol = str_replace("USDT","-USDT",$symbol);
		$o_keys = array("symbol"=>$symbol,"orderId"=>$orderid); // ,"workingType"=>"CONTRACT_PRICE"
		
		$digits = $this->digits;
		$points = pow(10,$digits*-1);
		$points=0;
		$rtype = $type;
		
		 
		$order = $this->call('/openApi/swap/v2/trade/order',1,$o_keys,"DELETE");
		
		
		if($order->code<0) {
			echo "order_delete(error): ".$order->code." ".$order->msg."\n";
			return $order;
		}
		
		$order = $this->obj2arr($order);
		return $order;
	}

	function order_send($symbol,$side,$type,$amount,$price,$cls=0) {
		
		$symbol = str_replace("USDT","-USDT",$symbol);	
		echo("order_send(symbol:$symbol,side:$side,type:$type,amount:$amount,price:$price,cls:$cls)");
		
		$o_keys = array("symbol"=>$symbol,"side"=>$side,"type"=>$type); // ,"workingType"=>"CONTRACT_PRICE"
		
		$debug=$this->debug;
		$digits = $this->digits;
		$points = pow(10,$digits*-1);
		$points=0;
		$rtype = $type;
		

		$emri_kapat = 1;
		
	
		if($cls==0) {
			if($side=="BUY") {
				$o_keys['positionSide']="LONG";
			} else {
				$o_keys['positionSide']="SHORT";
			}
		} else {
			if($side=="BUY") {
				$o_keys['positionSide']="SHORT";
			} else {
				$o_keys['positionSide']="LONG";
			}
		}		
		$o_keys['positionSide']="BOTH";
		// trade_log("emri_kapat : $emri_kapat");
		
		if($type == "MARKET") {
			
			$o_keys['quantity'] = $amount."";

			$o_keys['type']="MARKET";

		} else if($type == "LIMIT") {
			
			$o_keys['quantity'] = $amount."";
			$o_keys['price'] = $price."";
			$o_keys['timeInForce'] = "GTC";
		} else if($type == "STOP") {
			
			if($side=="BUY") {
				$price1=$price-$points; 
			}else{
				$price1=$price+$points;
			}
			$o_keys['quantity'] = $amount."";
			$o_keys['price'] = $price."";
			$o_keys['timeInForce'] = "GTC";
			
			//$o_keys['price'] = $price;
			$o_keys['stopPrice'] = $price1."";
		} else if($type == "SL") {
			
			$o_keys['quantity'] = $amount."";
			$o_keys['type']="STOP_MARKET";
			$o_keys['timeInForce'] = "GTC";
			
			//$o_keys['price'] = $price;
			$o_keys['stopPrice'] = $price."";		
			
		} else if($type == "TP") {

			$o_keys['quantity'] = $amount."";
			$o_keys['type']="TAKE_PROFIT_MARKET";
			$o_keys['timeInForce'] = "GTC";
			
			//$o_keys['price'] = $price;
			$o_keys['stopPrice'] = $price."";				
		}
		
		if($cls==1) {
			
			//$o_keys['takeProfit'] = "{\"type\": \"TAKE_PROFIT\"}";	
			//$o_keys['stopLoss'] = "{\"type\": \"STOP\"}";	
			$o_keys['reduceOnly'] = "true";	
			
		}
				 
		//$o_keys['positionIdx'] = 0;		
		$sure_baslangici = microtime(true);
		
		// trade_log("o_keys:".print_r($o_keys,1));
		print_r($o_keys);
		
		if ($emri_kapat == 1) {
			 
			if($type == "TP" or $type == "SL") {
				// trade_log("call url:/openApi/swap/v2/trade/order");
				$order = $this->call('/openApi/swap/v2/trade/order',1,$o_keys,"POST");	
			} else {
				// trade_log("call url:/openApi/swap/v2/trade/order");
				$order = $this->call('/openApi/swap/v2/trade/order',1,$o_keys,"POST");
			}
			
			echo(" order result:".print_r($order,1));
			
			$sure_bitimi = microtime(true);
			$sure = $sure_bitimi - $sure_baslangici;
			// echo "gecen sure: $sure suan:$sure_bitimi\n";
			
			// if($this->debug) trade_log(print_r($order,1));
			$order = $this->obj2arr($order);
			
			$n_order = array();
			if(@$order->data->order->orderId!="") {
				$n_order['orderId'] = $order->data->order->orderId;
				$n_order['status'] = "FILLED";
			}
			
			$n_order['code'] = ($order->code>0 ? $order->code : "");
			$n_order['msg'] = $order->msg;
			$order=$n_order;
			
		} else {
			
			$order['code'] = -100;
			$order['msg'] = "order already closed";
			
			
		}
		
		return $order;
	}

	function prepare_order($symbol,$side,$type,$amount,$price,$cls=0) {
		
		//$symbol=str_replace("/","",$symbol);
		
		$symbol = str_replace("USDT","-USDT",$symbol);	
		
		$digits=$this->digits;
		$vdigits=$this->vdigits;
		
		$o_keys = array("symbol"=>$symbol,"side"=>$side,"type"=>$type);

		$points = pow(10,$digits*-1);
		$points=0;
		$rtype = $type;
		
		if($cls==0) {
			if($side=="BUY") {
				$o_keys['positionSide']="LONG";
			} else {
				$o_keys['positionSide']="SHORT";
			}
		} else {
			if($side=="BUY") {
				$o_keys['positionSide']="SHORT";
			} else {
				$o_keys['positionSide']="LONG";
			}
		}		
		
		$o_keys['positionSide']="BOTH"; 
		
		if($type == "MARKET") {
			
			$o_keys['quantity'] = $amount."";

			$o_keys['type']="MARKET";

		} else if($type == "LIMIT") {
			
			$o_keys['quantity'] = $amount."";
			$o_keys['price'] = $price."";
			$o_keys['timeInForce'] = "GTC";
		} else if($type == "STOP") {
			
			if($side=="BUY") {
				$price1=$price-$points; 
			}else{
				$price1=$price+$points;
			}
			$o_keys['quantity'] = $amount."";
			$o_keys['price'] = $price."";
			$o_keys['timeInForce'] = "GTC";
			
			//$o_keys['price'] = $price;
			$o_keys['stopPrice'] = $price1."";
		} else if($type == "SL") {
			
			$o_keys['quantity'] = $amount."";
			$o_keys['type']="STOP_MARKET";
			$o_keys['timeInForce'] = "GTC";
			
			//$o_keys['price'] = $price;
			$o_keys['stopPrice'] = $price."";		
			
		} else if($type == "TP") {

			$o_keys['quantity'] = $amount."";
			$o_keys['type']="TAKE_PROFIT_MARKET";
			$o_keys['timeInForce'] = "GTC";
			
			//$o_keys['price'] = $price;
			$o_keys['stopPrice'] = $price."";				
		}
		
		//$o_keys['timestamp'] = number_format(microtime(true) * 1000, 0, '.', '');
		
		// echo json_encode($o_keys)."\n";
		
		return $o_keys;
			
	}

	function bulk_order_send($orders) {
		
		$sure_baslangici = microtime(true);
		
		$n_orders = array();
		
		foreach($orders as $o_id => $order) {
			
			
			
			$symbol = $order['symbol'];


			$order = $this->call('/openApi/swap/v2/trade/order',1,$order,"POST");
		
			
			
			$sure_bitimi = microtime(true);
			$sure = $sure_bitimi - $sure_baslangici;
			// echo "gecen sure: $sure suan:$sure_bitimi\n";
			
			print_r($order);
			
			if($this->debug) trade_log(print_r($order,1));
			$order = $this->obj2arr($order);
			
			$n_order = array();
			if(@$order->data->order->orderId!="") {
				$n_order['orderId'] = $order->data->order->orderId;
				$n_order['status'] = "FILLED";
			}
			
			$n_order['code'] = ($order->code>0 ? $order->code : "");
			$n_order['msg'] = $order->msg;
			$n_orders[]=$n_order;
					
			
			
			
		}
		
		
		$order=$orders;
		
		return $n_orders;
	}  

    // Sembol hassasiyet ve minQty, stepSize bilgisi için
    function exchange_info($symbol) {
        $symbol = str_replace("USDT","-USDT",$symbol);
        $exchange = $this->get_exchange();
        if (isset($exchange->data) && is_array($exchange->data)) {
            foreach ($exchange->data as $item) {
                $exc_symbol = str_replace("-", "", $item->symbol);
                if (trim($symbol) == trim($exc_symbol)) {
                    // PHP objesini diziye çevir
                    return json_decode(json_encode($item), true);
                }
            }
        }
        return null;
    }

    // Sembolün son fiyatını döndürür
    function ticker_price($symbol) {
        $symbol = str_replace("USDT","-USDT",$symbol);
        $form = $this->call('/openApi/swap/v2/quote/price', 0, array("symbol" => $symbol), "GET");
        $form = $this->obj2arr($form);
        if (isset($form->data) && isset($form->data->price)) {
            return array('price' => $form->data->price);
        }
        if (isset($form['data']) && isset($form['data']['price'])) {
            return array('price' => $form['data']['price']);
        }
        return null;
    }

}

