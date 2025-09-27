<?php
// history klasöründeki tüm csv dosyalarını oku ve open, high, low, close, volume array'lerine ayır

$historyDir = __DIR__ . '/history';
if (!is_dir($historyDir)) {
    die("history klasörü bulunamadı\n");
}

$files = glob($historyDir . '/*.csv');
if (!$files) {
    die("history klasöründe csv dosyası yok\n");
}

$allData = [];
foreach ($files as $file) {
    $symbol = basename($file, '.csv');
    $open = $high = $low = $close = $volume = $open_time = [];
    if (($handle = fopen($file, 'r')) !== false) {
        $header = fgetcsv($handle); // başlık satırı
        while (($row = fgetcsv($handle)) !== false) {
            $open_time[] = $row[0];
            $open[] = $row[1];
            $high[] = $row[2];
            $low[] = $row[3];
            $close[] = $row[4];
            $volume[] = $row[5];
        }
        fclose($handle);
    }
    $allData[$symbol] = [
        'open_time' => $open_time,
        'open' => $open,
        'high' => $high,
        'low' => $low,
        'close' => $close,
        'volume' => $volume
    ];
}

// Veritabanı bağlantısı
$host = 'localhost';
$user = 'root';
$pass = '';
$db   = 'orcatradebot';
$mysqli = new mysqli($host, $user, $pass, $db);
if ($mysqli->connect_errno) {
    die("MySQL bağlantı hatası: " . $mysqli->connect_error . "\n");
}

// Aktif kanalları bul
$channels = [];
$res = $mysqli->query("SELECT id, room_name, room_id FROM bot_rooms WHERE active=1");
while ($row = $res->fetch_assoc()) {
    $channels[] = $row;
}
$res->free();

if (!$channels) die("Aktif kanal yok\n");

// rates tablosundan symbol->digits, vdigits eşlemesi al
$digitsMap = [];
$res = $mysqli->query("SELECT symbol, digits, vdigits FROM rates WHERE symbol LIKE '%USDT%'");
while ($row = $res->fetch_assoc()) {
    $digitsMap[$row['symbol']] = [
        'digits' => (int)$row['digits'],
        'vdigits' => (int)$row['vdigits']
    ];
}
$res->free();

// --- DEMO SİNYAL ÜRETİMİ ---
foreach ($channels as $channel) {
    $now = time();
    $oneMonthAgo = $now - 30*24*60*60;
    for ($t = $oneMonthAgo; $t <= $now; $t += 3600) {
        $rand = rand(1, 10);
        if ($rand <= 5) continue;
        $symbols = array_keys($allData);
        $symbol = $symbols[array_rand($symbols)];
        $close = null;
        $dateStr = date('Y-m-d H:00:00', $t);
        $found = false;
        $barIndex = null;
        foreach ($allData[$symbol]['open_time'] as $i => $openTime) {
            if (date('Y-m-d H:00:00', $openTime/1000) == $dateStr) {
                $close = $allData[$symbol]['close'][$i];
                $volume = $allData[$symbol]['volume'][$i];
                $barIndex = $i;
                $found = true;
                break;
            }
        }
        if ($found) {
            $digits = isset($digitsMap[$symbol]) ? $digitsMap[$symbol]['digits'] : 2;
            $vdigits = isset($digitsMap[$symbol]) ? $digitsMap[$symbol]['vdigits'] : 0;
            $tp_count = rand(5, 10);
            $direction = rand(0, 1) ? 'LONG' : 'SHORT';
            $closeF = floatval($close);
            $future_min = min($barIndex + 5, count($allData[$symbol]['close']) - 1);
            $future_max = min($barIndex + 10, count($allData[$symbol]['close']) - 1);
            if ($future_min >= $future_max) continue;
            $target_bar = rand($future_min, $future_max);
            $target_close = floatval($allData[$symbol]['close'][$target_bar]);
            $sl_rand = rand(1, 10);
            if ($direction === 'LONG') {
                $entry1 = $closeF;
                $entry2 = $closeF;
                $tp_step = ($target_close - $closeF) / $tp_count;
                if ($tp_step <= 0) continue;
                $tps = [];
                for ($tp = 1; $tp <= $tp_count; $tp++) {
                    $tp_val = round($closeF + $tp * $tp_step, $digits);
                    $tps[] = $tp_val;
                }
                $tp_percent = ($tp_step / $closeF) * 100;
                $entry_percent = 0;
                // SL: rastgeleye göre belirle
                $min_low = $closeF;
                for ($j = $barIndex; $j <= $target_bar; $j++) {
                    $bar_low = floatval($allData[$symbol]['low'][$j]);
                    if ($bar_low < $min_low) $min_low = $bar_low;
                }
                if ($sl_rand >= 5) {
                    // SL kesinlikle çarpmayacak (min_low'un biraz altı)
                    $stoploss = round($min_low - abs($min_low * 0.001), $digits);
                } else {
                    // SL kesinlikle çarpacak (min_low'un biraz üstü, TP'ye ulaşmadan önce)
                    $stoploss = round($min_low + abs($min_low * 0.001), $digits);
                }
                $stoploss_percent = (($closeF - $stoploss) / $closeF) * 100;
            } else {
                $entry1 = $closeF;
                $entry2 = $closeF;
                $tp_step = ($closeF - $target_close) / $tp_count;
                if ($tp_step <= 0) continue;
                $tps = [];
                for ($tp = 1; $tp <= $tp_count; $tp++) {
                    $tp_val = round($closeF - $tp * $tp_step, $digits);
                    $tps[] = $tp_val;
                }
                $tp_percent = ($tp_step / $closeF) * 100;
                $entry_percent = 0;
                // SL: rastgeleye göre belirle
                $max_high = $closeF;
                for ($j = $barIndex; $j <= $target_bar; $j++) {
                    $bar_high = floatval($allData[$symbol]['high'][$j]);
                    if ($bar_high > $max_high) $max_high = $bar_high;
                }
                if ($sl_rand >= 7) {
                    // SL kesinlikle çarpmayacak (max_high'un biraz üstü)
                    $stoploss = round($max_high + abs($max_high * 0.001), $digits);
                } else {
                    // SL kesinlikle çarpacak (max_high'un biraz altı, TP'ye ulaşmadan önce)
                    $stoploss = round($max_high - abs($max_high * 0.001), $digits);
                }
                $stoploss_percent = (( $stoploss - $closeF ) / $closeF) * 100;
            }
            $volumeF = round(floatval($volume), $vdigits);
            // Sinyali ekrana yaz
            echo "$dateStr | $symbol | $direction | Close: $closeF | TargetClose: $target_close | Entry1: $entry1 | Entry2: $entry2 | Stoploss: $stoploss | TP($tp_count): ";
            echo implode(', ', $tps) . " | Volume: $volumeF | SL_RAND: $sl_rand\n";

            // Sinyali veritabanına ekle (bind_param YOK, doğrudan query)
            $tpVals = array_pad($tps, 10, 'NULL'); // tp1-tp10
            $message_id = rand(1000, 9999);
            $sl_percent_str = number_format($stoploss_percent, 2, '.', '');
            $entry_percent_str = number_format($entry_percent, 2, '.', '');
            $tp_percent_str = number_format($tp_percent, 2, '.', '');
            $trend_str = $direction === 'LONG' ? 'BUY' : 'SELL';
            $signal_hash = sprintf(
                'create_signal %s %s %s %s %d %s',
                $symbol,
                $trend_str,
                $sl_percent_str,
                $entry_percent_str,
                $tp_count,
                $tp_percent_str
            );
            $created_at = $dateStr;
            $updated_at = $dateStr;
            $ticktime = strtotime($created_at);
            $bid = $closeF;
            $ask = $closeF;
            $sql = sprintf(
                "INSERT INTO signals (channel_id, message_id, symbol, direction, entry1, entry2, stop_loss, tp1, tp2, tp3, tp4, tp5, tp6, tp7, tp8, tp9, tp10, status, signal_hash, created_at, updated_at, ticktime, bid, ask) VALUES (%d, '%s', '%s', '%s', %F, %F, %F, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, '%s', '%s', '%s', '%s', %d, %F, %F)",
                $channel['room_id'],
                $mysqli->real_escape_string($message_id),
                $mysqli->real_escape_string($symbol),
                $mysqli->real_escape_string($direction),
                $entry1, $entry2, $stoploss,
                is_null($tpVals[0]) ? 'NULL' : $tpVals[0],
                is_null($tpVals[1]) ? 'NULL' : $tpVals[1],
                is_null($tpVals[2]) ? 'NULL' : $tpVals[2],
                is_null($tpVals[3]) ? 'NULL' : $tpVals[3],
                is_null($tpVals[4]) ? 'NULL' : $tpVals[4],
                is_null($tpVals[5]) ? 'NULL' : $tpVals[5],
                is_null($tpVals[6]) ? 'NULL' : $tpVals[6],
                is_null($tpVals[7]) ? 'NULL' : $tpVals[7],
                is_null($tpVals[8]) ? 'NULL' : $tpVals[8],
                is_null($tpVals[9]) ? 'NULL' : $tpVals[9],
                $mysqli->real_escape_string('created'),
                $mysqli->real_escape_string($signal_hash),
                $created_at,
                $updated_at,
                $ticktime,
                $bid,
                $ask
            );
            $mysqli->query($sql);
        }
    }
}

// --- SİNYAL YÖNETİMİ ---

echo "\n--- SİNYAL YÖNETİMİ BAŞLIYOR ---\n";
// 1. Tüm kanalları çek
$channels = [];
$res = $mysqli->query("SELECT id, room_id, room_name FROM bot_rooms");
echo "Tüm kanallar çekiliyor...\n";
while ($row = $res->fetch_assoc()) {
    $channels[] = $row;
    echo "Kanal: {$row['room_name']} (ID: {$row['id']})\n";
}
$res->free();

foreach ($channels as $channel) {
    echo "\nKanal işleniyor: {$channel['room_name']} (ID: {$channel['id']})\n";
    // 2. O kanala ait pending sinyalleri çek
    $signals = [];
    $res = $mysqli->query("SELECT * FROM signals WHERE channel_id = " . intval($channel['room_id']) . " AND status = 'created'");
    echo "Pending sinyaller çekiliyor...\n";
    while ($row = $res->fetch_assoc()) {
        $signals[] = $row;
        echo "Sinyal: {$row['symbol']} ({$row['direction']}) ID: {$row['id']}\n";
    }
    $res->free();
    if (empty($signals)) {
        echo "Bu kanalda pending sinyal yok.\n";
        continue;
    }
    foreach ($signals as $signal) {
        echo "\nSinyal işleniyor: {$signal['symbol']} ({$signal['direction']}) ID: {$signal['id']}\n";
        $symbol = $signal['symbol'];
        $entry1 = $signal['entry1'];
        $entry2 = $signal['entry2'];
        $stop_loss = $signal['stop_loss'];
        $tp_list = [];
        for ($i = 1; $i <= 10; $i++) {
            if (!empty($signal['tp'.$i])) $tp_list[] = $signal['tp'.$i];
        }
        $direction = $signal['direction'];
        $ticktime = $signal['ticktime'];
        $status = $signal['status'];
        // 3. O kanala ait apileri bul
        $apis = [];
        $res2 = $mysqli->query("SELECT id, user_id FROM api_keys WHERE bot_room = " . intval($channel['room_id']));
        echo "API anahtarları çekiliyor...\n";
        while ($row2 = $res2->fetch_assoc()) {
            $apis[] = $row2;
            echo "API: {$row2['id']} User: {$row2['user_id']}\n";
        }
        $res2->free();
        if (empty($apis)) {
            echo "Bu kanalda API yok.\n";
        }
        // 4. Her api için user_signals'a sinyal ekle
        foreach ($apis as $api) {
            // lotsize ve leverage çek
            $api_id = intval($api['id']);
            $user_id = intval($api['user_id']);
            $api_info = $mysqli->query("SELECT lotsize, leverage FROM api_keys WHERE id = $api_id")->fetch_assoc();
            $lotsize = isset($api_info['lotsize']) ? floatval($api_info['lotsize']) : 1;
            $leverage = isset($api_info['leverage']) ? intval($api_info['leverage']) : 1;
            // vdigits bul
            $vdigits = isset($digitsMap[$symbol]) ? $digitsMap[$symbol]['vdigits'] : 0;
            // open fiyatı entry2
            $open_price = floatval($entry2);
            $volume = $open_price > 0 ? round($lotsize / $open_price, $vdigits) : 0;
            // 12 haneli randomlar
            $ticket = str_pad(strval(mt_rand(0, 999999999999)), 12, '0', STR_PAD_LEFT);
            $sticket = str_pad(strval(mt_rand(0, 999999999999)), 12, '0', STR_PAD_LEFT);
            $tticket = str_pad(strval(mt_rand(0, 999999999999)), 12, '0', STR_PAD_LEFT);
            // status 1 (pozisyon açıldı)
            $status = 1;
            $q = "INSERT INTO user_signals (user_id, api_id, signal_id, lotsize, levelage, ticket, sticket, tticket, symbol, trend, open, opentime, volume, sl, tp, status) VALUES ("
                . "$user_id, $api_id, {$signal['id']}, $lotsize, $leverage, '$ticket', '$sticket', '$tticket', '"
                . $mysqli->real_escape_string($symbol) . "', '"
                . $mysqli->real_escape_string($direction) . "', $open_price, '"
                . date('Y-m-d H:i:s', $ticktime) . "', $volume, "
                . floatval($stop_loss) . ", "
                . floatval($tp_list[0]) . ", $status)";
            $mysqli->query($q);
            echo "user_signals eklendi: user_id={$user_id} api_id={$api_id} lotsize=$lotsize leverage=$leverage volume=$volume\n";
        }
        // 5. Paritenin geçmiş verisini bul
        if (!isset($allData[$symbol])) {
            echo "Geçmiş veri yok: $symbol\n";
            continue;
        }
        $open_time_arr = $allData[$symbol]['open_time'];
        $close_arr = $allData[$symbol]['close'];
        $high_arr = $allData[$symbol]['high'];
        $low_arr = $allData[$symbol]['low'];
        $volume_arr = $allData[$symbol]['volume'];
        // 6. Ticktime'dan itibaren ileri sar
        $barIndex = null;
        foreach ($open_time_arr as $i => $ot) {
            if ($ot/1000 >= $ticktime) { $barIndex = $i; break; }
        }
        if ($barIndex === null) {
            echo "Ticktime sonrası bar bulunamadı.\n";
            continue;
        }
        $opened = false;
        $closed = false;
        $tp_hit = 0;
        $last_tp = null;
        for ($i = $barIndex; $i < count($open_time_arr); $i++) {
            $bar_time = date('Y-m-d H:i:s', $open_time_arr[$i]/1000);
            $bar_close = floatval($close_arr[$i]);
            $bar_high = floatval($high_arr[$i]);
            $bar_low = floatval($low_arr[$i]);
            // echo "Bar: $bar_time | Close: $bar_close | High: $bar_high | Low: $bar_low\n";
            // Her bar'da ticktime, bid, ask güncelle
            $mysqli->query("UPDATE signals SET ticktime = " . intval($open_time_arr[$i]/1000) . ", bid = $bar_close, ask = $bar_close WHERE id = " . intval($signal['id']));
            // Açılış kontrolü
            if (!$opened) {
                if ($direction == 'LONG' && $bar_close >= $entry1 && $bar_close <= $entry2) {
                    $opened = true;
                    $mysqli->query("UPDATE signals SET status = 'open', open_time = '$bar_time', open_price = $entry2 WHERE id = " . intval($signal['id']));
                    echo "Sinyal açıldı: $bar_time, open_price: $entry2\n";
                    // user_signals güncelle: open, opentime, status=1, volume, ticket, sticket, tticket
                    $user_signals = $mysqli->query("SELECT id, lotsize FROM user_signals WHERE signal_id = " . intval($signal['id']));
                    while ($us = $user_signals->fetch_assoc()) {
                        $us_id = $us['id'];
                        $lotsize = floatval($us['lotsize']);
                        $volume = $entry2 > 0 ? round($lotsize / $entry2, $vdigits) : 0;
                        $ticket = str_pad(strval(mt_rand(0, 999999999999)), 12, '0', STR_PAD_LEFT);
                        $sticket = str_pad(strval(mt_rand(0, 999999999999)), 12, '0', STR_PAD_LEFT);
                        $tticket = str_pad(strval(mt_rand(0, 999999999999)), 12, '0', STR_PAD_LEFT);
                        $mysqli->query("UPDATE user_signals SET open = $entry2, opentime = '$bar_time', volume = $volume, ticket = '$ticket', sticket = '$sticket', tticket = '$tticket', status = 1 WHERE id = $us_id");
                    }
                } elseif ($direction == 'SHORT' && $bar_close <= $entry1 && $bar_close >= $entry2) {
                    $opened = true;
                    $mysqli->query("UPDATE signals SET status = 'open', open_time = '$bar_time', open_price = $entry2 WHERE id = " . intval($signal['id']));
                    echo "Sinyal açıldı: $bar_time, open_price: $entry2\n";
                    $user_signals = $mysqli->query("SELECT id, lotsize FROM user_signals WHERE signal_id = " . intval($signal['id']));
                    while ($us = $user_signals->fetch_assoc()) {
                        $us_id = $us['id'];
                        $lotsize = floatval($us['lotsize']);
                        $volume = $entry2 > 0 ? round($lotsize / $entry2, $vdigits) : 0;
                        $ticket = str_pad(strval(mt_rand(0, 999999999999)), 12, '0', STR_PAD_LEFT);
                        $sticket = str_pad(strval(mt_rand(0, 999999999999)), 12, '0', STR_PAD_LEFT);
                        $tticket = str_pad(strval(mt_rand(0, 999999999999)), 12, '0', STR_PAD_LEFT);
                        $mysqli->query("UPDATE user_signals SET open = $entry2, opentime = '$bar_time', volume = $volume, ticket = '$ticket', sticket = '$sticket', tticket = '$tticket', status = 1 WHERE id = $us_id");
                    }
                }
            }
            // Stop kontrolü
            if ($opened && !$closed) {
                if (($direction == 'LONG' && $bar_low <= $stop_loss) || ($direction == 'SHORT' && $bar_high >= $stop_loss)) {
                    $closed = true;
                    $mysqli->query("UPDATE signals SET status = 'closed', sl_hit = 1, close_time = '$bar_time', close_price = $stop_loss WHERE id = " . intval($signal['id']));
                    // Profit hesapla
                    $profit = ($direction == 'LONG') ? (($stop_loss - $entry2) / $entry2 * 100) : (($entry2 - $stop_loss) / $entry2 * 100);
                    $mysqli->query("UPDATE signals SET profit = $profit WHERE id = " . intval($signal['id']));
                    echo "StopLoss vuruldu, sinyal kapandı. Profit: $profit\n";
                    // user_signals güncelle: close, closetime, sl_hit=1, profit, status=2
                    $user_signals = $mysqli->query("SELECT id, lotsize, open, volume FROM user_signals WHERE signal_id = " . intval($signal['id']));
                    while ($us = $user_signals->fetch_assoc()) {
                        $us_id = $us['id'];
                        $lotsize = floatval($us['lotsize']);
                        $open_price = floatval($us['open']);
                        $volume = floatval($us['volume']);
                        $profit_usdt = $direction == 'LONG' ? ($stop_loss - $open_price) * $volume : ($open_price - $stop_loss) * $volume;
                        $mysqli->query("UPDATE user_signals SET close = $stop_loss, closetime = '$bar_time', sl_hit = 1, profit = $profit_usdt, status = 2 WHERE id = $us_id");
                    }
                    break;
                }
                // TP kontrolü
                foreach ($tp_list as $idx => $tp_val) {
                    if ($direction == 'LONG' && $bar_high >= $tp_val) {
                        $tp_hit = $idx + 1;
                        $last_tp = $tp_val;
                        echo "TP$tp_hit vuruldu: $tp_val\n";
                        // user_signals güncelle: tp_hit, profit
                        $user_signals = $mysqli->query("SELECT id, lotsize, open, volume FROM user_signals WHERE signal_id = " . intval($signal['id']));
                        while ($us = $user_signals->fetch_assoc()) {
                            $us_id = $us['id'];
                            $lotsize = floatval($us['lotsize']);
                            $open_price = floatval($us['open']);
                            $volume = floatval($us['volume']);
                            $profit_usdt = ($tp_val - $open_price) * $volume;
                            $mysqli->query("UPDATE user_signals SET tp_hit = $tp_hit, profit = $profit_usdt WHERE id = $us_id");
                        }
                    } elseif ($direction == 'SHORT' && $bar_low <= $tp_val) {
                        $tp_hit = $idx + 1;
                        $last_tp = $tp_val;
                        echo "TP$tp_hit vuruldu: $tp_val\n";
                        $user_signals = $mysqli->query("SELECT id, lotsize, open, volume FROM user_signals WHERE signal_id = " . intval($signal['id']));
                        while ($us = $user_signals->fetch_assoc()) {
                            $us_id = $us['id'];
                            $lotsize = floatval($us['lotsize']);
                            $open_price = floatval($us['open']);
                            $volume = floatval($us['volume']);
                            $profit_usdt = ($open_price - $tp_val) * $volume;
                            $mysqli->query("UPDATE user_signals SET tp_hit = $tp_hit, profit = $profit_usdt WHERE id = $us_id");
                        }
                    }
                }
                if ($tp_hit > 0 && $tp_hit == count($tp_list)) {
                    $closed = true;
                    $mysqli->query("UPDATE signals SET tp_hit = $tp_hit, last_tp = $last_tp, close_time = '$bar_time', close_price = $last_tp, status = 'closed' WHERE id = " . intval($signal['id']));
                    $profit = ($direction == 'LONG') ? (($last_tp - $entry2) / $entry2 * 100) : (($entry2 - $last_tp) / $entry2 * 100);
                    $mysqli->query("UPDATE signals SET profit = $profit WHERE id = " . intval($signal['id']));
                    echo "Tüm TP'ler vuruldu, sinyal kapandı. Profit: $profit\n";
                    // user_signals güncelle: close, closetime, status=2, profit
                    $user_signals = $mysqli->query("SELECT id, lotsize, open, volume FROM user_signals WHERE signal_id = " . intval($signal['id']));
                    while ($us = $user_signals->fetch_assoc()) {
                        $us_id = $us['id'];
                        $lotsize = floatval($us['lotsize']);
                        $open_price = floatval($us['open']);
                        $volume = floatval($us['volume']);
                        $profit_usdt = $direction == 'LONG' ? ($last_tp - $open_price) * $volume : ($open_price - $last_tp) * $volume;
                        $mysqli->query("UPDATE user_signals SET close = $last_tp, closetime = '$bar_time', status = 2, profit = $profit_usdt WHERE id = $us_id");
                    }
                    break;
                }
            }
        }
        // user_signals güncellemeleri (temel akış)
        echo "user_signals güncellemeleri yapılabilir (burada detay eklenebilir)\n";
    }
}

echo "\n--- SİNYAL YÖNETİMİ BİTTİ ---\n";

$mysqli->close();

// $allData dizisinde her parite için open, high, low, close, volume array'leri hazır 