<?php
require_once('bingx.rest.php');

// API anahtarlarını buraya girin
define('API_KEY', 'dGJdf7VcfVVYJ5qARtJZAPDUf2EMhRAcQy1h41L3AclqzuYQ2T7hT51sGR5w3O0MygzJF5bKiF4acRe5rD81A');
define('API_SECRET', 'voeqBhZGHmAkdafX1PEd1E5W4o8nFiOQyzPsKaFlyGWwFKBfNWzhpTHrMUZPWfXhUt96y1vxM1oCbn6FcQ');

$bingx = new rbingx(API_KEY, API_SECRET);

// Emir parametreleri
$order = array(
    'symbol' => 'LRCUSDT',
    'side' => 'BUY',
    'type' => 'MARKET',
    'quantity' => '40',
    'positionSide' => 'LONG',
);

// Parametreleri PHP fonksiyonuyla hazırla
$params = $bingx->prepare_order($order['symbol'], $order['side'], $order['type'], $order['quantity'], isset($order['price']) ? $order['price'] : '', 0);

// İmza stringini ve parametreleri yazdır
$params['timestamp'] = round(microtime(true) * 1000);
ksort($params);
$paramsStr = implode('&', array_map(function ($k, $v) { return "$k=$v"; }, array_keys($params), $params));
$signString = $paramsStr . "&secret_key=" . API_SECRET;
echo "SIGN STRING: $signString\n";
$signature = hash_hmac('sha256', $signString, API_SECRET);
echo "SIGNATURE: " . strtoupper($signature) . "\n";

// API isteği gönder
$result = $bingx->call('/openApi/swap/v2/trade/order', 1, $params, 'POST');
echo "\nAPI YANITI:\n";
print_r($result); 