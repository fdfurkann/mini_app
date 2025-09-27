<?php
// PHP'nin zaman aşımına uğramamasını sağlar
set_time_limit(0);

// Veritabanı bağlantı bilgileri
$mysql_host = "localhost";
$mysql_user = "root";
$mysql_pass = "MySql!bot2021Tr";
$mysql_name = "orcatradebot";

// MySQL'e bağlan
$conn = new mysqli($mysql_host, $mysql_user, $mysql_pass, $mysql_name);

// Bağlantı hatası kontrolü
if ($conn->connect_error) {
    die("MySQL bağlantı hatası: " . $conn->connect_error . "\n");
}
echo "MySQL bağlantısı başarılı.\n";

// Tarih-saat formatlama fonksiyonu
function to_datetime($timestamp) {
    return date("Y-m-d H:i:s", $timestamp);
}

// cURL ile GET isteği yapan yardımcı fonksiyon
function http_get($url) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $response = curl_exec($ch);
    if (curl_errno($ch)) {
        echo 'cURL Hatası: ' . curl_error($ch) . "\n";
        return null;
    }
    curl_close($ch);
    return $response;
}

// SQL sorgularını çalıştıran yardımcı fonksiyon
function my_query($conn, $sql) {
    try {
        $kes = explode(" ", strtolower(trim($sql)));
        $result = $conn->query($sql);

        if ($result === false) {
            echo "MySQL Sorgu Hatası: " . $conn->error . "\nSQL: " . $sql . "\n";
            return false;
        }

        if ($kes[0] == "select" || $kes[0] == "show") {
            return $result->fetch_all(MYSQLI_ASSOC);
        } elseif ($kes[0] == "insert") {
            return $conn->insert_id;
        } else {
            return $conn->affected_rows;
        }
    } catch (Exception $e) {
        echo "my_query(err) = " . $sql . "\nHata: " . $e->getMessage() . "\n";
        return $e;
    }
}

// Başlangıçta rates tablosunu temizle
my_query($conn, "TRUNCATE TABLE rates;");
echo "rates tablosu temizlendi.\n";

$sym_info = [];

// Borsa bilgilerini çek ve sembol detaylarını işle
try {
    echo "Borsa bilgileri çekiliyor...\n";
    $exch_content = http_get('https://fapi.binance.com/fapi/v1/exchangeInfo');
    if ($exch_content) {
        $exchange = json_decode($exch_content, true);
        if (isset($exchange['symbols'])) {
            foreach ($exchange['symbols'] as $sym) {
                $step_size = null;
                $tick_size = null;
                foreach ($sym['filters'] as $f) {
                    if ($f['filterType'] == 'LOT_SIZE') {
                        $step_size = $f['stepSize'];
                    }
                    if ($f['filterType'] == 'PRICE_FILTER') {
                        $tick_size = $f['tickSize'];
                    }
                }
                $sym_info[$sym['symbol']] = [
                    'digits' => $sym['pricePrecision'],
                    'vdigits' => $sym['quantityPrecision'],
                    'stepSize' => $step_size,
                    'tickSize' => $tick_size
                ];
            }
            echo "Toplam " . count($sym_info) . " adet sembol bilgisi işlendi.\n";
        } else {
            echo "Borsa bilgileri alınamadı veya format hatalı.\n";
        }
    }
} catch (Exception $e) {
    echo "Borsa bilgileri işlenirken hata: " . $e->getMessage() . "\n";
}

// Tüm semboller için fiyatları çek ve rates tablosunu doldur
try {
    $rates_content = http_get('https://fapi.binance.com/fapi/v1/ticker/price');
    if ($rates_content) {
        $rates = json_decode($rates_content, true);
        if (is_array($rates)) {
            foreach ($rates as $symbol_data) {
                if (!is_array($symbol_data) || !isset($symbol_data['symbol']) || !isset($symbol_data['price'])) {
                    continue;
                }
                $symbol_name = $symbol_data['symbol'];
                if (!isset($sym_info[$symbol_name])) {
                    echo "{$symbol_name} için sembol bilgisi bulunamadı, atlanıyor.\n";
                    continue;
                }
                $info = $sym_info[$symbol_name];
                $escaped_symbol = $conn->real_escape_string($symbol_name);
                $price = $conn->real_escape_string($symbol_data['price']);
                $digits = $info['digits'];
                $vdigits = $info['vdigits'];
                $stepSize = $info['stepSize'];
                $tickSize = $info['tickSize'];
                $dates = to_datetime(time());
                $query1 = "INSERT INTO `rates` (`symbol`, `price`, `dates`, `digits`, `vdigits`, `stepSize`, `tickSize`) VALUES ('{$escaped_symbol}', '{$price}', '{$dates}', '{$digits}', '{$vdigits}', '{$stepSize}', '{$tickSize}')";
                my_query($conn, $query1);
            }
            echo "Tüm semboller rates tablosuna eklendi.\n";
        } else {
            echo "Rates verisi alınamadı veya format hatalı.\n";
        }
    }
} catch (Exception $e) {
    echo "Rates verisi işlenirken hata: " . $e->getMessage() . "\n";
}

$ban_until = 0;

// Ana döngü
while (true) {
    $now = round(microtime(true) * 1000);
    if ($ban_until > $now) {
        $wait_time = floor(($ban_until - $now) / 1000);
        echo "IP yasaklı, {$wait_time} saniye bekleniyor.\n";
        sleep(1);
        continue;
    }

    try {
        $rates_content = http_get('https://fapi.binance.com/fapi/v1/ticker/price');
        if (!$rates_content) {
            sleep(3);
            continue;
        }
        
        $rates = json_decode($rates_content, true);

        // Ban mesajı kontrolü
        if (is_array($rates) && isset($rates['msg']) && strpos($rates['msg'], 'banned until') !== false) {
            preg_match('/banned until (\d+)/', $rates['msg'], $matches);
            if (isset($matches[1])) {
                $ban_until = (int)$matches[1];
                $wait_time = floor(($ban_until - $now) / 1000);
                echo "Ban mesajı alındı, {$wait_time} saniye bekleniyor.\n";
            }
            sleep(1);
            continue;
        }

        if (!is_array($rates)) {
             echo "Beklenmeyen rates formatı: " . gettype($rates) . "\n";
             sleep(3);
             continue;
        }
        
        // echo "/fapi/v1/ticker/price: " . count($rates) . "\n";

        foreach ($rates as $symbol_data) {
             if (!is_array($symbol_data) || !isset($symbol_data['symbol']) || !isset($symbol_data['price'])) {
                // echo "Beklenmeyen veri formatı: " . json_encode($symbol_data) . "\n";
                continue;
            }

            try {
                $symbol_name = $symbol_data['symbol'];

                if (!isset($sym_info[$symbol_name])) {
                    // Sembol bilgisi yoksa yeniden çek
                    $exch_content_inner = http_get('https://fapi.binance.com/fapi/v1/exchangeInfo');
                    if ($exch_content_inner) {
                        $exchange_inner = json_decode($exch_content_inner, true);
                        if (isset($exchange_inner['symbols'])) {
                            foreach ($exchange_inner['symbols'] as $sym) {
                                // ... (Python'daki gibi filtreleri tekrar işle)
                                $sym_info[$sym['symbol']] = [ /* ... */ ];
                            }
                        }
                    }
                }
                
                if (!isset($sym_info[$symbol_name])) {
                    echo "{$symbol_name} için sembol bilgisi bulunamadı, atlanıyor.\n";
                    continue;
                }

                $info = $sym_info[$symbol_name];
                $escaped_symbol = $conn->real_escape_string($symbol_name);
                $check = my_query($conn, "SELECT * FROM rates WHERE symbol='{$escaped_symbol}'");

                $symbol_time = isset($symbol_data['time']) ? $symbol_data['time'] : round(microtime(true) * 1000);
                $dates = to_datetime(round($symbol_time / 1000));
                
                $price = $conn->real_escape_string($symbol_data['price']);
                $digits = $info['digits'];
                $vdigits = $info['vdigits'];
                $stepSize = $info['stepSize'];
                $tickSize = $info['tickSize'];

                if (count($check) == 0) {
                    $query1 = "INSERT INTO `rates` (`symbol`, `price`, `dates`, `digits`, `vdigits`, `stepSize`, `tickSize`) VALUES ('{$escaped_symbol}', '{$price}', '{$dates}', '{$digits}', '{$vdigits}', '{$stepSize}', '{$tickSize}')";
                    my_query($conn, $query1);
                } else {
                    $query2 = "UPDATE `rates` SET price='{$price}', dates='{$dates}', digits='{$digits}', vdigits='{$vdigits}', stepSize='{$stepSize}', tickSize='{$tickSize}' WHERE symbol='{$escaped_symbol}'";
                    my_query($conn, $query2);
                }

            } catch (Exception $e) {
                echo "{$symbol_name} için hata: " . $e->getMessage() . "\n";
            }
        }

    } catch (Exception $e) {
        echo "Ana döngü hatası: " . $e->getMessage() . "\n";
    }

    sleep(1);
}

$conn->close();
?> 