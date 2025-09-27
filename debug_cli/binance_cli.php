<?php
//error_reporting(0);
//ini_set('display_errors', 0);

function echo_flush($str) {
    echo $str;
    if (function_exists('ob_flush') && ob_get_level() > 0) ob_flush();
    flush();
}
// Binance API bilgileri 
// Kullanıcıdan gelen bilgiler:

define('BINANCE_API_KEY', 'pbkZxyfevTgQqU028Zk1psBYqrlgCgtao1QtWj8do7P2OcxuMfFT2ryruVm0ueZV');
define('BINANCE_API_SECRET', 'afQ4FxgMfpPo2fXMfMAhxcGASpf3lOKfuuNqbGpws2haWHFgImBI4JdIPniubVCQ');

require_once dirname(__DIR__) . '/old_files/binance.rest.php';

$api_key = defined('BINANCE_API_KEY') ? BINANCE_API_KEY : '';
$api_secret = defined('BINANCE_API_SECRET') ? BINANCE_API_SECRET : '';

if (!$api_key || !$api_secret) {
    echo_flush("Lütfen dosyanın en üstüne API KEY ve SECRET'ı ekleyin.\n");
    exit(1);
}

$api = new rbinance($api_key, $api_secret);

if ($argc < 2) {
    echo_flush("Kullanım:\n");
    echo_flush("php binance_cli.php open_orders\n");
    echo_flush("php binance_cli.php positions\n");
    echo_flush("php binance_cli.php order <symbol> <BUY|SELL> <MARKET|LIMIT> <usdt_miktar> [fiyat]\n");
    echo_flush("php binance_cli.php close <symbol>\n");
    echo_flush("php binance_cli.php trade_history [symbol] [limit]\n");
    echo_flush("php binance_cli.php account\n");
    exit(0);
}

$cmd = $argv[1];

if ($cmd === 'account') {
    $account_info = $api->call('/fapi/v2/account', 1, [], "GET");
    if (isset($account_info['assets'])) {
        echo_flush("Hesap Bakiyeleri:\n");
        foreach ($account_info['assets'] as $asset) {
            if (floatval($asset['walletBalance']) > 0) {
                echo_flush(sprintf(
                    "Asset: %s | Wallet Balance: %s | Unrealized PNL: %s | Cross Wallet Balance: %s\n",
                    $asset['asset'],
                    $asset['walletBalance'],
                    $asset['unrealizedProfit'],
                    $asset['crossWalletBalance']
                ));
            }
        }
    } else {
        echo_flush("Hesap bilgileri alınamadı.\n");
        print_r($account_info);
    }
    exit(0);
}

if ($cmd === 'open_orders') {
    $orders = $api->open_orders();
    if (empty($orders)) {
        echo_flush("Açık emir yok.\n");
    } else {
        foreach ($orders as $order) {
            $type = isset($order['type']) ? $order['type'] : '-';
            $orderId = isset($order['orderId']) ? $order['orderId'] : '-';
            $price = isset($order['price']) ? $order['price'] : '-';
            $origQty = isset($order['origQty']) ? $order['origQty'] : '-';
            $executedQty = isset($order['executedQty']) ? $order['executedQty'] : '-';
            $status = isset($order['status']) ? $order['status'] : '-';
            $time = isset($order['time']) ? date('Y-m-d H:i:s', $order['time']/1000) : '-';
            $side = isset($order['side']) ? $order['side'] : '-';
            $symbol = isset($order['symbol']) ? $order['symbol'] : '-';
            echo_flush("$time | $orderId | Symbol: $symbol | Side: $side | Type: $type | Price: $price | Quantity: $origQty | Executed: $executedQty | Status: $status\n");
        }
    }
    exit(0);
}

if ($cmd === 'positions') {
    $positions = $api->call('/fapi/v2/positionRisk',1,array(),"GET");
    $found = false;

    if (!is_array($positions)) {
        echo_flush("API'den pozisyonlar alınamadı. Gelen yanıt:\n");
        var_dump($positions);
        exit(1);
    }

    foreach ($positions as $pos) {
        if (is_array($pos) && isset($pos['positionAmt']) && abs(floatval($pos['positionAmt'])) > 0) {
            $found = true;
            $symbol = $pos['symbol'];
            $positionAmt = $pos['positionAmt'];
            $entryPrice = $pos['entryPrice'];
            $unrealizedProfit = $pos['unRealizedProfit'];
            $leverage = $pos['leverage'];
            $positionSide = isset($pos['positionSide']) ? $pos['positionSide'] : '-';
            $updateTime = isset($pos['updateTime']) ? date('Y-m-d H:i:s', $pos['updateTime']/1000) : '-';
            $isolatedMargin = isset($pos['isolatedMargin']) ? $pos['isolatedMargin'] : '-';
            $liquidationPrice = isset($pos['liquidationPrice']) ? $pos['liquidationPrice'] : '-';
            $markPrice = isset($pos['markPrice']) ? $pos['markPrice'] : '-';
            $marginType = isset($pos['marginType']) ? $pos['marginType'] : '-';
            $openTime = isset($pos['updateTime']) ? date('Y-m-d H:i:s', $pos['updateTime']/1000) : '-';
            $orderId = isset($pos['positionId']) ? $pos['positionId'] : '-';
            echo_flush("$openTime | $orderId | Symbol: $symbol | Position: $positionAmt | Entry: $entryPrice | PNL: $unrealizedProfit | Leverage: $leverage | Side: $positionSide | IsolatedMargin: $isolatedMargin | Liquidation: $liquidationPrice | Mark: $markPrice | MarginType: $marginType\n");
        }
    }
    if (!$found) echo_flush("Açık pozisyon yok.\n");
    exit(0);
}

if ($cmd === 'order' && isset($argv[2], $argv[3], $argv[4], $argv[5])) {
    $symbol = strtoupper($argv[2]);
    $side = strtoupper($argv[3]);
    $type = strtoupper($argv[4]);
    $usdt = floatval($argv[5]);
    $price = isset($argv[6]) ? floatval($argv[6]) : 0;

    // Sembol hassasiyet ve minQty, stepSize çek
    $exchangeInfo = $api->call('/fapi/v1/exchangeInfo',0,array("symbol"=>$symbol),"GET");
    $symbolInfo = null;
    if (isset($exchangeInfo['symbols']) && is_array($exchangeInfo['symbols'])) {
        foreach ($exchangeInfo['symbols'] as $s) {
            if ($s['symbol'] == $symbol) {
                $symbolInfo = $s;
                break;
            }
        }
    }
    if (!$symbolInfo) {
        echo_flush("Sembol bilgisi alınamadı!\n");
        exit(1);
    }
    $pricePrecision = $symbolInfo['pricePrecision'];
    $quantityPrecision = $symbolInfo['quantityPrecision'];
    $minQty = 0.0001;
    $stepSize = 0.0001;
    foreach ($symbolInfo['filters'] as $f) {
        if ($f['filterType'] == 'LOT_SIZE' || $f['filterType'] == 'MARKET_LOT_SIZE') {
            $minQty = floatval($f['minQty']);
            $stepSize = floatval($f['stepSize']);
        }
    }

    // Fiyatı belirle
    if ($type == 'MARKET') {
        $ticker = $api->call('/fapi/v1/ticker/price',0,array('symbol'=>$symbol),"GET");
        $price = isset($ticker['price']) ? floatval($ticker['price']) : 0;
        if ($price <= 0) {
            echo_flush("Fiyat alınamadı!\n");
            exit(1);
        }
    }
    // Lot miktarını hesapla
    $quantity = $usdt / $price;
    // Adım ve hassasiyet uygula
    $quantity = floor($quantity / $stepSize) * $stepSize;
    $quantity = round($quantity, $quantityPrecision);
    if ($quantity < $minQty) {
        echo_flush("Hesaplanan miktar minQty'den küçük! ($quantity < $minQty)\n");
        exit(1);
    }
    if ($type == 'MARKET') {
        $result = $api->order_send($symbol, $side, 'MARKET', $quantity, 0);
    } else {
        $result = $api->order_send($symbol, $side, 'LIMIT', $quantity, $price);
    }
    if (isset($result['orderId'])) {
        echo_flush("Emir gönderildi! Order ID: ".$result['orderId']."\n");
    } else {
        echo_flush("Emir gönderilemedi: ".json_encode($result)."\n");
    }
    exit(0);
}

if ($cmd === 'close' && isset($argv[2])) {
    $symbol = strtoupper($argv[2]);
    $positions = $api->call('/fapi/v2/positionRisk',1,array(),"GET");
    $found = false;
    foreach ($positions as $pos) {
        if ($pos['symbol'] === $symbol && abs(floatval($pos['positionAmt'])) > 0) {
            $found = true;
            $side = floatval($pos['positionAmt']) > 0 ? 'SELL' : 'BUY';
            $quantity = abs(floatval($pos['positionAmt']));
            $result = $api->order_send($symbol, $side, 'MARKET', $quantity, 0, 1);
            if (isset($result['orderId'])) {
                echo_flush("Pozisyon kapatıldı! Order ID: ".$result['orderId']."\n");
            } else {
                echo_flush("Pozisyon kapatılamadı: ".json_encode($result)."\n");
            }
            break;
        }
    }
    if (!$found) echo_flush("Açık pozisyon bulunamadı.\n");
    exit(0);
}

if ($cmd === 'delete' && isset($argv[2], $argv[3])) {
    $symbol = strtoupper($argv[2]);
    $orderId = $argv[3];
    $result = $api->order_delete($symbol, $orderId);
    if (isset($result['orderId'])) {
        echo_flush("Emir silindi! Order ID: ".$result['orderId']."\n");
    } else {
        echo_flush("Emir silinemedi: ".json_encode($result)."\n");
    }
    exit(0);
}

if ($cmd === 'trade_history') {
    $symbol = isset($argv[2]) ? strtoupper($argv[2]) : "";
    $limit = isset($argv[3]) ? intval($argv[3]) : 20;
    $startDate = isset($argv[4]) ? strtotime($argv[4]) * 1000 : null; // Tarih filtresi (timestamp ms)

    $trades = $api->trade_history($symbol, $limit);

    if ($startDate !== null) {
        $trades = array_filter($trades, function($trade) use ($startDate) {
            return isset($trade['time']) && $trade['time'] >= $startDate;
        });
    }

    if (empty($trades)) {
        echo_flush("Trade geçmişi yok.\n");
    } else {
        foreach ($trades as $trade) {
            $time = isset($trade['time']) ? date('Y-m-d H:i:s', $trade['time']/1000) : '-';
            $symbol = isset($trade['symbol']) ? $trade['symbol'] : '-';
            $side = isset($trade['side']) ? $trade['side'] : ($trade['maker'] ? 'SELL' : 'BUY');
            $price = isset($trade['price']) ? $trade['price'] : '-';
            $qty = isset($trade['qty']) ? $trade['qty'] : '-';
            $realizedPnl = isset($trade['realizedPnl']) ? $trade['realizedPnl'] : '-';
            $positionSide = isset($trade['positionSide']) ? $trade['positionSide'] : '-';
            echo_flush("$time | $symbol | $side | Price: $price | Qty: $qty | PnL: $realizedPnl | Position: $positionSide\n");
        }
    }
    exit(0);
}

if ($cmd === 'order_history') {
    $symbol = isset($argv[2]) ? strtoupper($argv[2]) : "";
    $limit = isset($argv[3]) ? intval($argv[3]) : 20;

    $orders = $api->order_history($symbol, $limit);

    if (empty($orders)) {
        echo_flush("Order geçmişi yok.\n");
    } else {
        foreach ($orders as $order) {
            $time = isset($order['time']) ? date('Y-m-d H:i:s', $order['time']/1000) : '-';
            $orderId = isset($order['orderId']) ? $order['orderId'] : '-';
            $symbol = isset($order['symbol']) ? $order['symbol'] : '-';
            $side = isset($order['side']) ? $order['side'] : '-';
            $type = isset($order['type']) ? $order['type'] : '-';
            $price = isset($order['price']) ? $order['price'] : '-';
            $origQty = isset($order['origQty']) ? $order['origQty'] : '-';
            $executedQty = isset($order['executedQty']) ? $order['executedQty'] : '-';
            $status = isset($order['status']) ? $order['status'] : '-';
            echo_flush("$time | $orderId | Symbol: $symbol | Side: $side | Type: $type | Price: $price | Quantity: $origQty | Executed: $executedQty | Status: $status\n");
        }
    }
    exit(0);
}

echo_flush("Geçersiz komut!\n");
exit(1); 