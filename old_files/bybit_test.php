<?php
require_once __DIR__ . '/bybit.rest.php';

// --- Kullanıcı Bilgileri ve İşlem Parametreleri ---
$API_KEY = 'Qt1M5KcBLRbILo4jNQ';
$API_SECRET = 'bkJw6nvA94qKrMiwtUMFClSbt1rv9qMtNxmE';
$SYMBOL = 'HIGHUSDT';
$LEVERAGE = 20; // Kaldıraç
$MARGIN_TYPE = 'CROSSED';
$ORDER_MARGIN_USDT = 6; // İşlem büyüklüğü (USDT)
$STOPLOSS_PERCENT = 5; // %5
$TAKEPROFIT_PERCENT = 5; // %5
$bulk_order = 1;

$bybit = new rbybit($API_KEY, $API_SECRET);

try {
    // 1. Sembol Bilgisi
    $exchangeInfo = $bybit->get_exchange();
    $symbolInfo = null;
    foreach ($exchangeInfo as $s) {
        if ($s['symbol'] === $SYMBOL) {
            $symbolInfo = $s;
            break;
        }
    }
    if (!$symbolInfo) throw new Exception('Sembol bulunamadı!');
    print_r(['symbolInfo' => $symbolInfo]);
    $bybit->digits = isset($symbolInfo['pricePrecision']) ? $symbolInfo['pricePrecision'] : 2;
    $bybit->vdigits = isset($symbolInfo['quantityPrecision']) ? $symbolInfo['quantityPrecision'] : 3;

    // StepSize, minQty ve tickSize bul
    $stepSize = 0.0001;
    $minQty = 0.0001;
    $tickSize = 0.0001;
    if (isset($symbolInfo['lotSizeFilter'])) {
        $stepSize = floatval($symbolInfo['lotSizeFilter']['qtyStep']);
        $minQty = floatval($symbolInfo['lotSizeFilter']['minOrderQty']);
    }
    if (isset($symbolInfo['priceFilter'])) {
        $tickSize = floatval($symbolInfo['priceFilter']['tickSize']);
    }

    // 2. Kaldıraç Ayarla
    $leverageResult = $bybit->api_set_leverage($SYMBOL, $LEVERAGE);
    print_r(['Kaldıraç Ayar Sonucu' => $leverageResult]);

    // 3. Margin Tipi Ayarla
    $marginTypeResult = $bybit->api_set_margin_type($SYMBOL, $MARGIN_TYPE);
    print_r(['Margin Tipi Ayar Sonucu' => $marginTypeResult]);

    // 4. Son fiyatı al
    $priceInfo = $bybit->call('/v5/market/tickers', 0, ['category' => 'linear', 'symbol' => $SYMBOL], 'GET');
    $lastPrice = floatval($priceInfo['result']['list'][0]['lastPrice']);
    print_r(['Son Fiyat' => $lastPrice]);

    // 5. Miktarı hesapla (USDT cinsinden)
    $quantity = $ORDER_MARGIN_USDT / $lastPrice;
    $quantity = floor($quantity / $stepSize) * $stepSize;
    if ($quantity < $minQty) {
        throw new Exception("Hesaplanan miktar minQty'den küçük! ({$quantity} < {$minQty})");
    }
    $quantity = floatval(number_format($quantity, $bybit->vdigits, '.', ''));
    print_r(['İşlem Miktarı' => $quantity]);

    if ($bulk_order == 0) {
        // 6. Piyasa Emri Aç (LONG)
        $marketOrder = $bybit->order_send($SYMBOL, 'BUY', 'MARKET', $quantity, $lastPrice);
        print_r(['Piyasa Emri Sonucu' => $marketOrder]);

        // 7. Stop Loss Fiyatı Hesapla
        $stopLossPrice = number_format($lastPrice * (1 - $STOPLOSS_PERCENT / 100), $bybit->digits, '.', '');
        // 8. Take Profit Fiyatı Hesapla
        $takeProfitPrice = number_format($lastPrice * (1 + $TAKEPROFIT_PERCENT / 100), $bybit->digits, '.', '');
        print_r(['Stop Loss Fiyatı' => $stopLossPrice]);
        print_r(['Take Profit Fiyatı' => $takeProfitPrice]);

        // 9. Stop Loss Emri Aç (reduceOnly olmadan)
        $stopOrder = $bybit->order_send($SYMBOL, 'SELL', 'SL', $quantity, $stopLossPrice);
        print_r(['Stop Loss Emri Sonucu' => $stopOrder]);

        // 10. Take Profit Emri Aç (reduceOnly olmadan)
        $tpOrder = $bybit->order_send($SYMBOL, 'SELL', 'TP', $quantity, $takeProfitPrice);
        print_r(['Take Profit Emri Sonucu' => $tpOrder]);
    } else {
        // 7. Stop Loss Fiyatı Hesapla
        $stopLossPrice = number_format($lastPrice * (1 - $STOPLOSS_PERCENT / 100), $bybit->digits, '.', '');
        // 8. Take Profit Fiyatı Hesapla
        $takeProfitPrice = number_format($lastPrice * (1 + $TAKEPROFIT_PERCENT / 100), $bybit->digits, '.', '');
        print_r(['Stop Loss Fiyatı' => $stopLossPrice]);
        print_r(['Take Profit Fiyatı' => $takeProfitPrice]);

        // Emirleri hazırlayıp topluca gönder
        $orders = [];
        $orders[] = $bybit->prepare_order($SYMBOL, 'BUY', 'MARKET', $quantity, $lastPrice);
        $orders[] = $bybit->prepare_order($SYMBOL, 'SELL', 'SL', $quantity, $stopLossPrice);
        $orders[] = $bybit->prepare_order($SYMBOL, 'SELL', 'TP', $quantity, $takeProfitPrice);
        print_r(['orders' => $orders]);
        $bulkResult = $bybit->bulk_order_send($orders);
        print_r(['Bulk Order Sonucu' => $bulkResult]);
    }

    // --- YENİ: Kademeli Limit TP Emirleri ---
    $tpPercents = [1, 2, 3, 4];
    $tpQtyPercent = 0.20; // %20
    foreach ($tpPercents as $tpPercent) {
        $tpPrice = $lastPrice * (1 + $tpPercent / 100);
        $tpPrice = floor($tpPrice / $tickSize) * $tickSize;
        $tpPrice = floatval(number_format($tpPrice, $bybit->digits, '.', ''));
        $tpQty = $quantity * $tpQtyPercent;
        $tpQty = floor($tpQty / $stepSize) * $stepSize;
        if ($tpQty < $minQty) continue;
        $tpQty = floatval(number_format($tpQty, $bybit->vdigits, '.', ''));
        $limitTpOrder = $bybit->order_send($SYMBOL, 'SELL', 'LIMIT', $tpQty, $tpPrice, 1);
        print_r(["%{$tpPercent} TP Limit Emri" => $limitTpOrder]);
    }
} catch (Exception $err) {
    echo 'Hata: ' . $err->getMessage() . "\n";
} 