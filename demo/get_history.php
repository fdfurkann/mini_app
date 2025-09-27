<?php
// Binance Futures en çok işlem gören 100 USDT paritesini bul ve 1 aylık 1 saatlik geçmiş veriyi çekip history klasörüne kaydet (CSV)

function getTopFuturesSymbols($limit = 100) {
    $url = 'https://fapi.binance.com/fapi/v1/ticker/24hr';
    $data = json_decode(file_get_contents($url), true);
    if (!$data) return [];
    $usdtPairs = array_filter($data, fn($row) => str_ends_with($row['symbol'], 'USDT'));
    usort($usdtPairs, function($a, $b) {
        return $b['quoteVolume'] <=> $a['quoteVolume'];
    });
    $symbols = array_slice(array_column($usdtPairs, 'symbol'), 0, $limit);
    return $symbols;
}

function fetchFuturesKlines($symbol, $interval = '1h', $days = 30) {
    $endTime = time() * 1000;
    $startTime = $endTime - $days * 24 * 60 * 60 * 1000;
    $url = "https://fapi.binance.com/fapi/v1/klines?symbol=$symbol&interval=$interval&startTime=$startTime&endTime=$endTime&limit=1000";
    $data = json_decode(file_get_contents($url), true);
    return $data;
}

function saveHistoryCsv($symbol, $klines) {
    if (!is_dir(__DIR__ . '/history')) mkdir(__DIR__ . '/history');
    $file = __DIR__ . "/history/{$symbol}.csv";
    $fp = fopen($file, 'w');
    fputcsv($fp, ['open_time','open','high','low','close','volume']);
    foreach ($klines as $k) {
        fputcsv($fp, [$k[0], $k[1], $k[2], $k[3], $k[4], $k[5]]);
    }
    fclose($fp);
}

// Kullanım örneği (devamında sinyal üretilecek)
$symbols = getTopFuturesSymbols();
foreach ($symbols as $symbol) {
    $klines = fetchFuturesKlines($symbol);
    saveHistoryCsv($symbol, $klines);
    echo "$symbol verisi kaydedildi\n";
    // Burada sinyal üretme işlemi devam edecek
} 