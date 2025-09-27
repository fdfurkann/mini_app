<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

function echo_flush($str) {
    echo $str;
    if (function_exists('ob_flush')) {@ob_flush();}
    flush();
}
// BingX API bilgileri
// Kullanıcıdan gelen bilgiler:
define('BINGX_API_KEY', 'Nz5601iRWgF8MYua7grNnjCuZiFo2uAkQkM4HdblIml7Ysmy05SZoy2vCsYlvvuFgAeIkgTlkErVYb6mGAnA');
define('BINGX_API_SECRET', 'gfCyAEkPvi3WdcKVeFQLrTeR5aLB0TCglL1sYfyFtaxygwZ4LBgGCQaipVoLYv9wXR4HV3yfP0RyVstWt9vA');

require_once __DIR__ . '/../old_files/bingx.rest.php';

$api_key = defined('BINGX_API_KEY') ? BINGX_API_KEY : '';
$api_secret = defined('BINGX_API_SECRET') ? BINGX_API_SECRET : '';

if (!$api_key || !$api_secret) {
    echo_flush("Lütfen dosyanın en üstüne API KEY ve SECRET'ı ekleyin.\n");
    exit(1);
}

$api = new rbingx($api_key, $api_secret);

if ($argc < 2) {
    echo_flush("Kullanım:\n");
    echo_flush("php bingx_cli.php open_orders\n");
    echo_flush("php bingx_cli.php positions\n");
    echo_flush("php bingx_cli.php order <symbol> <BUY|SELL> <MARKET|LIMIT> <usdt_miktar> [fiyat]\n");
    echo_flush("php bingx_cli.php close <symbol>\n");
    echo_flush("php bingx_cli.php trade_history [symbol] [limit]\n");
    exit(0);
}

$cmd = $argv[1];

if ($cmd === 'open_orders') {
    $orders = $api->open_orders();
    // Eğer orders anahtarı varsa asıl emirler onun içinde
    if (is_object($orders) && isset($orders->orders)) {
        $orders = $orders->orders;
    } elseif (is_array($orders) && isset($orders['orders'])) {
        $orders = $orders['orders'];
    }
    if (is_object($orders)) {
        $orders = json_decode(json_encode($orders), true);
    }
    if (empty($orders) || !is_array($orders)) {
        echo_flush("Açık emir yok.\n");
        exit(0);
    }
    $found = false;
    foreach ($orders as $order) {
        if (is_object($order)) $order = (array)$order;
        $type = isset($order['type']) ? $order['type'] : '-';
        $orderId = isset($order['orderId']) ? $order['orderId'] : '-';
        $price = isset($order['price']) ? $order['price'] : '-';
        if (($price === '-' || $price === '' || $price === '0' || $price === '0.0000') && isset($order['stopPrice']) && $order['stopPrice'] != 0) {
            $price = $order['stopPrice'];
        }
        $origQty = isset($order['origQty']) ? $order['origQty'] : (isset($order['quantity']) ? $order['quantity'] : '-');
        $executedQty = isset($order['executedQty']) ? $order['executedQty'] : '-';
        $status = isset($order['status']) ? $order['status'] : '-';
        $time = isset($order['time']) ? date('Y-m-d H:i:s', intval($order['time']/1000)) : '-';
        $side = isset($order['side']) ? $order['side'] : '-';
        $symbol = isset($order['symbol']) ? $order['symbol'] : '-';
        // En az bir alan doluysa found true
        if ($orderId !== '-' || $symbol !== '-' || $type !== '-') {
            $found = true;
            echo_flush("$time | $orderId | Symbol: $symbol | Side: $side | Type: $type | Price: $price | Quantity: $origQty | Executed: $executedQty | Status: $status\n");
        }
    }
    if (!$found) echo_flush("Açık emir yok.\n");
    exit(0);
}

if ($cmd === 'positions') {
    $positions = $api->positions();
    if (is_object($positions)) {
        $positions = json_decode(json_encode($positions), true);
    }
    $found = false;
    foreach ($positions as $pos) {
        if (is_object($pos)) $pos = (array)$pos;
        if (abs(floatval($pos['positionAmt'])) > 0) {
            $found = true;
            $symbol = isset($pos['symbol']) ? $pos['symbol'] : '-';
            $positionAmt = isset($pos['positionAmt']) ? $pos['positionAmt'] : '-';
            $entryPrice = isset($pos['entryPrice']) ? $pos['entryPrice'] : (isset($pos['avgPrice']) ? $pos['avgPrice'] : '-');
            $markPrice = isset($pos['markPrice']) ? $pos['markPrice'] : '-';
            $unrealizedProfit = isset($pos['unRealizedProfit']) ? $pos['unRealizedProfit'] : '-';
            $leverage = isset($pos['leverage']) ? $pos['leverage'] : '-';
            $positionSide = isset($pos['positionSide']) ? $pos['positionSide'] : '-';
            $updateTime = isset($pos['updateTime']) ? date('Y-m-d H:i:s', intval($pos['updateTime']/1000)) : '-';
            $isolatedMargin = isset($pos['isolatedMargin']) ? $pos['isolatedMargin'] : '-';
            $liquidationPrice = isset($pos['liquidationPrice']) ? $pos['liquidationPrice'] : '-';
            $marginType = isset($pos['marginType']) ? $pos['marginType'] : '-';
            $openTime = isset($pos['updateTime']) ? date('Y-m-d H:i:s', intval($pos['updateTime']/1000)) : '-';
            $orderId = isset($pos['positionId']) ? $pos['positionId'] : '-';
            // PNL hesapla
            $pnl_percent = '-';
            $pnl_usdt = '-';
            if (is_numeric($entryPrice) && is_numeric($markPrice) && is_numeric($leverage) && $entryPrice > 0 && $markPrice > 0 && is_numeric($positionAmt)) {
                if (strtoupper($positionSide) == 'LONG') {
                    $pnl_percent = round((($markPrice - $entryPrice) / $entryPrice) * 100 * $leverage, 2) . '%';
                    $pnl_usdt = round(($markPrice - $entryPrice) * $positionAmt, 4);
                } elseif (strtoupper($positionSide) == 'SHORT') {
                    $pnl_percent = round((($entryPrice - $markPrice) / $entryPrice) * 100 * $leverage, 2) . '%';
                    $pnl_usdt = round(($entryPrice - $markPrice) * $positionAmt, 4);
                }
            } elseif (isset($pos['unrealizedProfit'])) {
                $pnl_usdt = $pos['unrealizedProfit'];
            } elseif (isset($pos['unrealizedProfit'])) {
                $pnl_usdt = $pos['unrealizedProfit'];
            }
            echo_flush("$openTime | $orderId | Symbol: $symbol | Position: $positionAmt | Entry: $entryPrice | Mark: $markPrice | PNL: $pnl_percent | Profit: $pnl_usdt USDT | Leverage: $leverage | Side: $positionSide | IsolatedMargin: $isolatedMargin | Liquidation: $liquidationPrice | MarginType: $marginType\n");
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
    $exchangeInfo = $api->exchange_info($symbol);
    $symbolInfo = $exchangeInfo;
    $pricePrecision = isset($symbolInfo['pricePrecision']) ? $symbolInfo['pricePrecision'] : 4;
    $quantityPrecision = isset($symbolInfo['quantityPrecision']) ? $symbolInfo['quantityPrecision'] : 3;
    $minQty = isset($symbolInfo['minQty']) ? floatval($symbolInfo['minQty']) : 0.0001;
    $stepSize = isset($symbolInfo['stepSize']) ? floatval($symbolInfo['stepSize']) : 0.0001;

    // Fiyatı belirle
    if ($type == 'MARKET') {
        $ticker = $api->ticker_price($symbol);
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
    echo_flush("API Yanıtı: ".print_r($result, true)."\n");
    if ($result === null) {
        echo_flush("API'dan null yanıt geldi! Muhtemelen ağ/bağlantı veya yetki sorunu.\n");
    }
    if ($result === false) {
        echo_flush("API'dan false (hatalı) yanıt geldi!\n");
    }
    if (isset($result['orderId'])) {
        echo_flush("Emir gönderildi! Order ID: ".$result['orderId']."\n");
    } else {
        echo_flush("Emir gönderilemedi veya hata oluştu!\n");
    }
    exit(0);
}

if ($cmd === 'close' && isset($argv[2])) {
    $symbol = strtoupper($argv[2]);
    $positions = $api->positions();
    if (is_object($positions)) {
        $positions = json_decode(json_encode($positions), true);
    }
    $found = false;
    foreach ($positions as $pos) {
        if (is_object($pos)) $pos = (array)$pos;
        $pos_symbol = isset($pos['symbol']) ? str_replace('-', '', strtoupper($pos['symbol'])) : '';
        if ($pos_symbol === $symbol && abs(floatval($pos['positionAmt'])) > 0) {
            $found = true;
            $positionSide = isset($pos['positionSide']) ? strtoupper($pos['positionSide']) : '';
            if ($positionSide === 'SHORT') {
                $side = 'BUY';
            } else {
                $side = 'SELL';
            }
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
    $trades = $api->trade_history($symbol, $limit);
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

if ($cmd === 'balance') {
    $balance = $api->get_account_info();
    echo_flush("Bakiye Bilgisi:\n".print_r($balance, true)."\n");
    exit(0);
}

if ($cmd === 'account') {
    $balance = $api->get_account_info();
    echo_flush("Bakiye Bilgisi:\n".print_r($balance, true)."\n");
    exit(0);
} 