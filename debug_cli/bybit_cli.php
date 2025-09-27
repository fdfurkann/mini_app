<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

if (!function_exists('trade_log')) {
    function trade_log(...$args) {
        foreach ($args as $arg) {
            if (is_array($arg) || is_object($arg)) {
                print_r($arg);
            } else {
                echo $arg;
            }
        }
        echo "\n";
        if (function_exists('ob_get_level') && ob_get_level() > 0 && function_exists('ob_flush')) ob_flush();
        flush();
    }
}
// Bybit API bilgileri
// Kullanıcıdan gelen bilgiler:
define('BYBIT_API_KEY', 'Qt1M5KcBLRbILo4jNQ');
define('BYBIT_API_SECRET', 'bkJw6nvA94qKrMiwtUMFClSbt1rv9qMtNxmE');

require_once __DIR__ . '/../old_files/bybit.rest.php';

$api_key = defined('BYBIT_API_KEY') ? BYBIT_API_KEY : '';
$api_secret = defined('BYBIT_API_SECRET') ? BYBIT_API_SECRET : '';

if (!$api_key || !$api_secret) {
    trade_log("Lütfen dosyanın en üstüne API KEY ve SECRET'ı ekleyin.");
    exit(1);
}

$api = new rbybit($api_key, $api_secret);

if ($argc < 2) {
    trade_log("Kullanım:\n");
    trade_log("php bybit_cli.php open_orders\n");
    trade_log("php bybit_cli.php positions\n");
    trade_log("php bybit_cli.php order <symbol> <BUY|SELL> <MARKET|LIMIT> <usdt_miktar> [fiyat]\n");
    trade_log("php bybit_cli.php close <symbol>\n");
    trade_log("php bybit_cli.php trade_history [symbol] [limit]\n");
    trade_log("php bybit_cli.php account\n");
    exit(0);
}

$cmd = $argv[1];

if ($cmd === 'account') {
    $balance_info = $api->call('/v5/account/wallet-balance', 1, ['accountType' => 'UNIFIED'], "GET");
    if (isset($balance_info['result']['list'][0]['coin'])) {
        trade_log("Hesap Bakiyeleri:\n");
        foreach ($balance_info['result']['list'][0]['coin'] as $asset) {
            if (floatval($asset['walletBalance']) > 0) {
                 trade_log(sprintf(
                    "Asset: %s | Wallet Balance: %s | Unrealized PNL: %s\n",
                    $asset['coin'],
                    $asset['walletBalance'],
                    $asset['unrealisedPnl']
                ));
            }
        }
    } else {
        trade_log("Hesap bilgileri alınamadı.\n");
        print_r($balance_info);
    }
    exit(0);
}

if ($cmd === 'open_orders') {
    $orders = $api->open_orders();
    if (empty($orders)) {
        trade_log("Açık emir yok.\n");
    } else {
        foreach ($orders as $order) {
            $orderId = isset($order['orderId']) ? $order['orderId'] : '-';
            $symbol = isset($order['symbol']) ? $order['symbol'] : '-';
            $side = isset($order['side']) ? $order['side'] : '-';
            $type = isset($order['orderType']) ? $order['orderType'] : (isset($order['stopOrderType']) ? $order['stopOrderType'] : '-');
            $price = isset($order['price']) ? $order['price'] : '-';
            $qty = isset($order['qty']) ? $order['qty'] : '-';
            $executedQty = isset($order['cumExecQty']) ? $order['cumExecQty'] : '-';
            $status = isset($order['orderStatus']) ? $order['orderStatus'] : '-';
            $time = isset($order['createdTime']) ? date('Y-m-d H:i:s', intval(round($order['createdTime'])/1000)) : '-';
            trade_log("$time | $orderId | Symbol: $symbol | Side: $side | Type: $type | Price: $price | Quantity: $qty | Executed: $executedQty | Status: $status\n");
        }
    }
    exit(0);
}

if ($cmd === 'positions') {
    $positions = $api->open_positions();
    $found = false;
    foreach ($positions as $pos) {
        $positionSize = isset($pos['size']) ? $pos['size'] : 0;
        if (abs(floatval($positionSize)) > 0) {
            $found = true;
            $symbol = $pos['symbol'];
            $positionAmt = $positionSize;
            $entryPrice = isset($pos['avgPrice']) ? $pos['avgPrice'] : (isset($pos['entryPrice']) ? $pos['entryPrice'] : '-');
            $unrealizedProfit = isset($pos['unrealisedPnl']) ? $pos['unrealisedPnl'] : (isset($pos['unRealizedProfit']) ? $pos['unRealizedProfit'] : '-');
            $leverage = isset($pos['leverage']) ? $pos['leverage'] : '-';
            $positionSide = isset($pos['side']) ? $pos['side'] : (isset($pos['positionSide']) ? $pos['positionSide'] : '-');
            $updateTime = isset($pos['updatedTime']) ? date('Y-m-d H:i:s', intval(round($pos['updatedTime'])/1000)) : '-';
            $isolatedMargin = isset($pos['isolatedMargin']) ? $pos['isolatedMargin'] : '-';
            $liquidationPrice = isset($pos['liqPrice']) ? $pos['liqPrice'] : (isset($pos['liquidationPrice']) ? $pos['liquidationPrice'] : '-');
            $markPrice = isset($pos['markPrice']) ? $pos['markPrice'] : '-';
            $marginType = isset($pos['marginType']) ? $pos['marginType'] : '-';
            $openTime = $updateTime;
            $orderId = isset($pos['positionId']) ? $pos['positionId'] : '-';
            trade_log("$openTime | $orderId | Symbol: $symbol | Position: $positionAmt | Entry: $entryPrice | PNL: $unrealizedProfit | Leverage: $leverage | Side: $positionSide | IsolatedMargin: $isolatedMargin | Liquidation: $liquidationPrice | Mark: $markPrice | MarginType: $marginType\n");
        }
    }
    if (!$found) trade_log("Açık pozisyon yok.\n");
    exit(0);
}

if ($cmd === 'order' && isset($argv[2], $argv[3], $argv[4], $argv[5])) {
    $symbol = strtoupper($argv[2]);
    $side = strtoupper($argv[3]);
    $type = strtoupper($argv[4]);
    $usdt = floatval($argv[5]);
    $price = isset($argv[6]) ? floatval($argv[6]) : 0;

    // Sembol hassasiyet ve minQty, stepSize çek
    $exchangeInfo = $api->get_exchange();
    $symbolInfo = null;
    if (is_array($exchangeInfo)) {
        foreach ($exchangeInfo as $s) {
            if ($s['symbol'] == $symbol) {
                $symbolInfo = $s;
                break;
            }
        }
    }
    if (!$symbolInfo) {
        trade_log("Sembol bilgisi alınamadı!\n");
        exit(1);
    }
    $pricePrecision = isset($symbolInfo['pricePrecision']) ? $symbolInfo['pricePrecision'] : 4;
    $quantityPrecision = isset($symbolInfo['quantityPrecision']) ? $symbolInfo['quantityPrecision'] : 3;
    $minQty = isset($symbolInfo['minOrderQty']) ? floatval($symbolInfo['minOrderQty']) : 0.001;
    $stepSize = isset($symbolInfo['lotSizeFilter']['qtyStep']) ? floatval($symbolInfo['lotSizeFilter']['qtyStep']) : 0.001;

    // Fiyatı belirle
    if ($type == 'MARKET') {
        $ticker = $api->call('/v5/market/tickers',0,array('category'=>'linear','symbol'=>$symbol),"GET");
        $price = isset($ticker['result']['list'][0]['lastPrice']) ? floatval($ticker['result']['list'][0]['lastPrice']) : 0;
        if ($price <= 0) {
            trade_log("Fiyat alınamadı!\n");
            exit(1);
        }
    }
    // Lot miktarını hesapla
    $quantity = $usdt / $price;
    // Adım ve hassasiyet uygula
    $quantity = floor($quantity / $stepSize) * $stepSize;
    $quantity = round($quantity, $quantityPrecision);
    if ($quantity < $minQty) {
        trade_log("Hesaplanan miktar minQty'den küçük! ($quantity < $minQty)\n");
        exit(1);
    }
    if ($type == 'MARKET') {
        $result = $api->order_send($symbol, $side, 'MARKET', $quantity, 0);
    } else {
        $result = $api->order_send($symbol, $side, 'LIMIT', $quantity, $price);
    }
    if (isset($result['orderId'])) {
        trade_log("Emir gönderildi! Order ID: ".$result['orderId']."\n");
    } else {
        trade_log("Emir gönderilemedi: ".json_encode($result)."\n");
    }
    exit(0);
}

if ($cmd === 'close' && isset($argv[2])) {
    $symbol = strtoupper($argv[2]);
    $positions = $api->open_positions();
    $found = false;
    foreach ($positions as $pos) {
        $positionSize = isset($pos['size']) ? $pos['size'] : 0;
        if ($pos['symbol'] === $symbol && abs(floatval($positionSize)) > 0) {
            $found = true;
            $side = floatval($positionSize) > 0 ? 'SELL' : 'BUY';
            $quantity = abs(floatval($positionSize));
            $result = $api->order_send($symbol, $side, 'MARKET', $quantity, 0, 1);
            if (isset($result['orderId'])) {
                trade_log("Pozisyon kapatıldı! Order ID: ".$result['orderId']."\n");
            } else {
                trade_log("Pozisyon kapatılamadı: ".json_encode($result)."\n");
            }
            break;
        }
    }
    if (!$found) trade_log("Açık pozisyon bulunamadı.\n");
    exit(0);
}

if ($cmd === 'delete' && isset($argv[2], $argv[3])) {
    $symbol = strtoupper($argv[2]);
    $orderId = $argv[3];
    $result = $api->order_delete($symbol, $orderId);
    if (isset($result['orderId'])) {
        trade_log("Emir silindi! Order ID: ".$result['orderId']."\n");
    } else {
        trade_log("Emir silinemedi: ".json_encode($result)."\n");
    }
    exit(0);
}

if ($cmd === 'trade_history') {
    $symbol = isset($argv[2]) ? strtoupper($argv[2]) : "";
    $limit = isset($argv[3]) ? intval($argv[3]) : 20;
    $trades = $api->call('/v5/execution/list',1,array('category'=>'linear','symbol'=>$symbol,'limit'=>$limit),"GET");
    if (empty($trades['result']['list'])) {
        trade_log("Trade geçmişi yok.\n");
    } else {
        foreach ($trades['result']['list'] as $trade) {
            $time = isset($trade['execTime']) ? date('Y-m-d H:i:s', $trade['execTime']/1000) : '-';
            $symbol = isset($trade['symbol']) ? $trade['symbol'] : '-';
            $side = isset($trade['side']) ? $trade['side'] : ($trade['execType'] == 'Sell' ? 'SELL' : 'BUY');
            $price = isset($trade['execPrice']) ? $trade['execPrice'] : '-';
            $qty = isset($trade['execQty']) ? $trade['execQty'] : '-';
            $realizedPnl = isset($trade['closedPnl']) ? $trade['closedPnl'] : '-';
            $positionSide = isset($trade['positionSide']) ? $trade['positionSide'] : '-';
            trade_log("$time | $symbol | $side | Price: $price | Qty: $qty | PnL: $realizedPnl | Position: $positionSide\n");
        }
    }
    exit(0);
} 