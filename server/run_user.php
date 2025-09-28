<?php

error_reporting(E_ALL);
ini_set('display_errors', 1);
header("Content-Type: text/html; charset=utf-8");
include "mysql.php";
include_once "print_log.php"; // print_log fonksiyonunu dahil et

$cli_ok = 0;
$admin_ok = 0;
$is_test = 0;

if (php_sapi_name() === "cli") {
    if ($argc < 3) {
        die("Kullanım: php run_user.php <signal_id> <channel_name>\n");
    }
    $cli_ok = 1;
    $sid = $argv[1];
    $channel = $argv[2];
} elseif (isset($_GET["anahtar"]) && $_GET["anahtar"] == "2023") {
    $admin_ok = 1;
    $sid = $_GET["run"];
    $is_test = $_GET["test"] ?? 0;
    $channel = $p_name;
    print_log($my, $sid, $user_id, $us_id, $channel, "Run_user script started via web with signal ID: {$sid}, test mode: {$is_test}, channel: {$channel}");
} else {
    die("Not Running from CLI or invalid key");
}

  

if($sid==0) { 
  
    $q = $my->query("SELECT id FROM user_signals WHERE user_id = 5118957445 AND api_id = 893 ORDER BY id DESC LIMIT 1");
    $row = $q->fetch_assoc();
    if ($row && isset($row['id'])) {
        $sid = $row['id'];
    } else {
        print_log($my, $s_id, $user_id, $us_id, $channel, "run_user: Uygun pozisyon bulunamadı (user_id=5118957445, api_id=893, ticket='').");
    }
}


$sl_tp_wait_seconds = 15;
$signal_cancel_seconds = 60 * 30;

$bir_kere_ac = 0;
$signal_id = $sid;
$bildirim_gonder = 1;
$pid = getmypid();

// Manuel pozisyon kapama işlemlerini devre dışı bırak
$my->query(
     "update `user_signals` set `open`='',`opentime`='',`close`='',`closetime`='',`ticket`='',status=0 where `id` = '$sid';"
);

function print_rr($arr, $alt = 0)
{
    $str = [];
    if (!is_array($arr)) {
        $arr = [$arr];
    }

    foreach ($arr as $a => $b) {
        if (is_array($b) or is_object($b)) {
            $str[] = "$a=[" . print_rr($b, 1) . "]\n";
        } else {
            $str[] = "$a=$b ";
        }
    }
    if ($alt == 1) {
        return implode(", ", $str) . "";
    } else {
        return implode(", ", $str) . ""; // Added to handle the else case
    }
}

if ($admin_ok == 1 && $is_test == 0) {
    $my->query(
        "update user_signals set ticket='',open='',opentime='',closed_volume='',close='',closetime='',profit='',event='',status='',sticket='',tticket='',tp_hit=0 where id ='$sid';"
    );
}

if ($admin_ok == 1 && $is_test == 1) {
    $my->query(
        "update user_signals set ticket='',open='',opentime='',closed_volume='',close='',closetime='',profit='',event='',status='',sticket='',tticket='',tp_hit=0 where id ='$sid';"
    );
}
if ($admin_ok == 1 && $is_test == 2) {
    $my->query(
        "update user_signals set sticket='',tticket='',status=1,closed_volume='',close=0,event='',closetime='' where id ='$sid';"
    );
}
$rsi = $my->query("SELECT * FROM `user_signals` WHERE id='$sid'");
$us = $rsi->fetch_assoc();

$rsi1 = $my->query("SELECT * FROM `signals` WHERE id='$us[signal_id]'");
$sg = $rsi1->fetch_assoc();

$api1 = $my->query("SELECT * FROM `api_keys` WHERE id='$us[api_id]'");
$api = $api1->fetch_assoc();
$api["order_type"] = "LIMIT";

$user_id = $api["user_id"];
$s_id = $sg["id"];
$us_id = $us["id"];
$channel = $api['bot_room'];
$signal_id = $us_id;
$sess_id = $user_id;

$sm1 = $my->query("select * from rates where symbol='$us[symbol]'");
$sym = $sm1->fetch_assoc();

$symbol = $us["symbol"];

// Borsa hesabında açık pozisyon kontrolü ve senkronizasyon
if (intval($us["ticket"]) > 0) {
    $p_risk = $binance->position_risk();
    $acik_poz = isset($p_risk[$symbol]) ? $p_risk[$symbol] : 0;
    if (abs($acik_poz) > 0) {
        // Pozisyonu kendi pozisyonu olarak kabul et ve user_signals'ı güncelle
        $pozisyon_miktar = abs($acik_poz);
        $pozisyon_yon = ($acik_poz > 0) ? "LONG" : "SHORT";
        $pozisyon_fiyat = $sym["price"];
        $now = date("Y-m-d H:i:s");
        $my->query(
            "UPDATE user_signals SET open='{$pozisyon_fiyat}', volume='{$pozisyon_miktar}', opentime='{$now}', direction='{$pozisyon_yon}', status=1 WHERE id='{$us["id"]}'"
        );
        print_log($my, $s_id, $user_id, $us_id, $channel, "run_user: Borsadaki pozisyon bulundu ve user_signals güncellendi. Symbol: {$symbol}, Miktar: {$pozisyon_miktar}, Yön: {$pozisyon_yon}");
        // $us değişkenini de güncelle
        $us["open"] = $pozisyon_fiyat;
        $us["volume"] = $pozisyon_miktar;
        $us["opentime"] = $now;
        $us["direction"] = $pozisyon_yon;
        $us["status"] = 1;
    }
}

$api_key = $api["api_key"];
$api_secret = $api["api_secret"];

if ($api["api_type"] == 1) {
    $exchange = "binance";
    $binance = new rbinance($api_key, $api_secret);
} elseif ($api["api_type"] == 2) {
    $exchange = "bybit";
    $binance = new rbybit($api_key, $api_secret);
} elseif ($api["api_type"] == 3) {
    $exchange = "bingx";
    $binance = new rbingx($api_key, $api_secret);
} else {
    print_log($my, $s_id, $user_id, $us_id, $channel, "Geçersiz api_type değeri: " . $api["api_type"]);
    die("Geçersiz api_type değeri: " . $api["api_type"]);
}
$api_exchange = $exchange;

print_log($my, $s_id, $user_id, $us_id, $channel, "API Type: {$api['api_type']}, Exchange: {$api_exchange}, Symbol: {$symbol}");

if (empty($api["bot_room"])) {
    print_log($my, $s_id, $user_id, $us_id, $channel, "Telegram chat not found or not accessible.");
    die();
}

$telegram_url =
    "https://api.telegram.org/bot" .
    $server_api_key .
    "/getChatMember?chat_id=-100" .
    $api["bot_room"] .
    "&user_id=" .
    $user_id;
$telegram_response = @file_get_contents($telegram_url);

if ($telegram_response === false) {
    print_log($my, $s_id, $user_id, $us_id, $channel, "Telegram chat not found or not accessible.");
    die();
}

$json = json_decode($telegram_response);

if (
    isset($json->result->status) &&
    ($json->result->status == "member" ||
        $json->result->status == "creator" ||
        $json->result->status == "administrator")
) {
} else {
    print_log($my, $s_id, $user_id, $us_id, $channel, "Telegram chat not found or not accessible.");
    die();
}

$exchanges = $binance->get_exchange();

if ($exchange == "bingx") {
    $leverages = $binance->get_leverage($symbol);
} else {
    $leverages = $binance->get_leverage();
}

$sym_leverage = [];
$user_leverage = $api["leverage"];

$prev_not = 0;

if ($exchange == "binance") {
    foreach ($leverages as $a1 => $b1) {
        if (@$b1["symbol"] == $symbol) {
            $sym_leverage = $b1["brackets"];

            foreach ($sym_leverage as $a2 => $b2) {
                if (
                    $b2["notionalCap"] > $api["lotsize"] &&
                    $prev_not <= $api["lotsize"] &&
                    $user_leverage > $b2["initialLeverage"]
                ) {
                    $user_leverage = $b2["initialLeverage"];
                }
                $prev_not = $b2["notionalCap"];
            }
        }
    }
    print_log($my, $s_id, $user_id, $us_id, $channel, "Binance Leverage adjusted to: {$user_leverage}");
} elseif ($exchange == "bingx") {
    if (isset($leverages->data) && is_object($leverages->data)) {
        $sym_leverage = $leverages->data;

        if ($sg["direction"] == "LONG") {
            if (isset($sym_leverage->maxLongLeverage) && $user_leverage > $sym_leverage->maxLongLeverage) {
                $user_leverage = $sym_leverage->maxLongLeverage;
            }
        } elseif ($sg["direction"] == "SHORT") {
            if (isset($sym_leverage->maxShortLeverage) && $user_leverage > $sym_leverage->maxShortLeverage) {
                $user_leverage = $sym_leverage->maxShortLeverage;
            }
        }
    } else {
        print_log($my, $s_id, $user_id, $us_id, $channel, "Bingx Leverage data not found in API response. Raw response: " . print_r($leverages, true));
    }
    print_log($my, $s_id, $user_id, $us_id, $channel, "Bingx Leverage adjusted to: {$user_leverage}");
} else {
    foreach ($leverages as $a1 => $b1) {
        if ($b1["symbol"] == $symbol) {
            $sym_leverage = $b1["leverageFilter"]["maxLeverage"];

            if ($user_leverage > $sym_leverage) {
                $user_leverage = $sym_leverage;
            }
        }
    }
    print_log($my, $s_id, $user_id, $us_id, $channel, "Bybit Leverage adjusted to: {$user_leverage}");
}

$bysym = [];
$max_lots = [];

$max_lots[$symbol] = 0;

if ($exchange == "binance") {
    foreach ($exchanges["symbols"] as $s1 => $s2) {
        foreach ($s2["filters"] as $f1 => $f2) {
            if ($f2["filterType"] == "MARKET_LOT_SIZE") {
                $max_lot = $f2["maxQty"];
                $max_lots[$s2["symbol"]] = $max_lot;
            }
        }
    }
} elseif ($exchange == "bingx") {
    foreach ($exchanges->data as $a1 => $b1) {
        $exc_symbol = str_replace("-", "", $b1->symbol);

        if (trim($symbol) == trim($exc_symbol)) {
            $bysym["vdigits"] = $b1->quantityPrecision;
            $bysym["digits"] = $b1->pricePrecision;
            $max_lots[$symbol] = 10000000;
        }
    }
} else {
    foreach ($exchanges as $s1 => $s2) {
        if (trim($symbol) == trim($s2["symbol"])) {
            $min_lot =
                $s2["lotSizeFilter"]["minTradingQty"] ??
                $s2["lotSizeFilter"]["minOrderQty"];
            if ($min_lot == "") {
                $min_lot = $s2["lotSizeFilter"]["minOrderQty"];
            }
            $min_lot_parts = explode(".", (string) $min_lot);
            $bysym["vdigits"] = isset($min_lot_parts[1])
                ? strlen($min_lot_parts[1])
                : 0;

            $min_price = $s2["priceFilter"]["minPrice"];
            $min_price_parts = explode(".", (string) $min_price);
            $bysym["digits"] = isset($min_price_parts[1])
                ? strlen($min_price_parts[1])
                : 0;

            $max_lots[$symbol] = $s2["lotSizeFilter"]["maxOrderQty"];
        }
    }
}

$loop_signal = true;

if (
    false &&
        strtotime($sg["created_at"]) > 0 &&
        $cli_ok == 1 &&
        strtotime($sg["created_at"]) + $signal_cancel_seconds < time() and
    $sg["open_price"] > 0 and
    $us["open"] == 0
) {
    $my->query(
        "update `user_signals` set `event`='sinyalin süresi dolduğu için pas gecildi.',status=2,ticket='-1', `close`='$sg[entry1]',`closetime`='" .
            date("Y-m-d H:i:s") .
            "' where `id` ='" .
            $us["id"] .
            "'"
    );
    print_log($my, $s_id, $user_id, $us_id, $channel, "Signal processing loop stopped because of signal duration.");
    $loop_signal = false;
    die();
}

print_log($my, $s_id, $user_id, $us_id, $channel, "Signal processing loop started.");



if ($exchange == 'bybit') {

    try {
        $margin_type_from_db = strtoupper(trim($api["margin_type"]));
        if ($margin_type_from_db == "ISOLATED" || $margin_type_from_db == "CROSSED") {
            $positions = $binance->open_positions($symbol);
            $current_trade_mode = "CROSSED"; // Varsayılan
            if (!empty($positions) && isset($positions[0]['tradeMode'])) {
                $current_trade_mode = ($positions[0]['tradeMode'] == 1) ? "ISOLATED" : "CROSSED";
            }

            if ($current_trade_mode != $margin_type_from_db) {
                print_log($my, $s_id, $user_id, $us_id, $channel, "Bybit: Current margin mode is {$current_trade_mode}, changing to {$margin_type_from_db}.");
                // $margin_sonuc = $binance->api_set_margin_mode($margin_type_from_db);
                $margin_sonuc = $binance->api_set_margin_type($symbol, $margin_type_from_db,10);
            } else {
                $margin_sonuc = "Bybit: Margin mode is already {$margin_type_from_db}. No change needed.";
                print_log($my, $s_id, $user_id, $us_id, $channel, $margin_sonuc);
            }
            print_log($my, $s_id, $user_id, $us_id, $channel, "Margin type set result ({$exchange}): " . print_rr($margin_sonuc));
        } else {
            $margin_sonuc = "Invalid margin_type from DB: " . $api["margin_type"];
            print_log($my, $s_id, $user_id, $us_id, $channel, $margin_sonuc);
        }
        
    } catch (Exception $apikeyr) {
        print_r($apikeyr);

        $error_code = $apikeyr["code"];
        $error_msg = $apikeyr["msg"];
        $error_msg = str_replace("'", "", $error_msg);
        $error_msg = str_replace("\"", "", $error_msg);

        $new_sql =
            "update user_signals set open='" .
            ($price ?? 0) .
            "',close='" .
            ($price ?? 0) .
            "',opentime='" .
            date("Y-m-d H:i:s") .
            "',closetime='" .
            date("Y-m-d H:i:s") .
            "',status=2,ticket='-1',event='" .
            $error_code .
            "|" .
            $error_msg .
            "' where id = '" .
            $us["id"] .
            "'";
        print_log($my, $s_id, $user_id, $us_id, $channel, "Margin type setting failed, error: {$error_code} - {$error_msg}");

        $my->query($new_sql);
    }

    // Bybit için önce kaldıraç, sonra marjin tipi ayarlanır
    try {
        $level_status = $binance->api_set_leverage($symbol, $user_leverage);
        print_log($my, $s_id, $user_id, $us_id, $channel, "Leverage set result: " . print_rr($level_status));
    } catch (Exception $leverage_err) {
        print_log($my, $s_id, $user_id, $us_id, $channel, "Leverage setting failed: " . $leverage_err->getMessage());
    }


} else {
    // Diğer borsalar için önce marjin tipi, sonra kaldıraç ayarlanır
    try {
        $margin_type_from_db = strtoupper(trim($api["margin_type"]));
        if ($margin_type_from_db == "ISOLATED" || $margin_type_from_db == "CROSSED") {
            $margin_sonuc = $binance->api_set_margin_type($symbol, $margin_type_from_db);
        } else {
            $margin_sonuc = "Invalid margin_type from DB: " . $api["margin_type"];
        }
        print_log($my, $s_id, $user_id, $us_id, $channel, "Margin type set result ({$exchange}): " . print_rr($margin_sonuc));
    } catch (Exception $apikeyr) {
        $error_code = $apikeyr->getCode();
        $error_msg = str_replace(["'", "\""], "", $apikeyr->getMessage());
        $current_price = $sym["price"] ?? 0;
        $now = date("Y-m-d H:i:s");

        $new_sql = "UPDATE user_signals SET open='{$current_price}', close='{$current_price}', opentime='{$now}', closetime='{$now}', status=3, ticket='-1', event='{$error_code}|{$error_msg}' WHERE id = '{$us["id"]}'";
        print_log($my, $s_id, $user_id, $us_id, $channel, "Margin type setting failed, status set to 3. Error: {$error_code} - {$error_msg}");
        $my->query($new_sql);
    }

    try {
        $level_status = $binance->api_set_leverage($symbol, $user_leverage);
        print_log($my, $s_id, $user_id, $us_id, $channel, "Leverage set result: " . print_rr($level_status));
    } catch (Exception $leverage_err) {
        print_log($my, $s_id, $user_id, $us_id, $channel, "Leverage setting failed: " . $leverage_err->getMessage());
    }
}



function bildirim_ekle(
    $user_id,
    $msg,
    $durum,
    $bildirim_gonder,
    $my,
    $s_id,
    $us_id
) {
    if ($msg == "") {
        return;
    }
    $msg = stripslashes($msg);
    $msg1 = str_replace("\n", " ", $msg);

    if ($bildirim_gonder == 1) {
        $my->set_charset("utf8mb4");
        // Duplicate suppression: eğer aynı kullanıcı için aynı msg zaten eklenmişse
        // ve henüz gönderilmemiş (gonderim = 0) veya son 60 saniye içinde gönderilmişse, eklemeyi atla
        $threshold = time() - 60; // 60 saniye
        if ($select_stmt = $my->prepare("SELECT COUNT(*) as cnt FROM bildirimler WHERE user_id = ? AND msg = ? AND (gonderim = 0 OR gonderim > ?)")) {
            $select_stmt->bind_param("isi", $user_id, $msg, $threshold);
            $select_stmt->execute();
            $res = $select_stmt->get_result();
            $row = $res->fetch_assoc();
            $dupCount = intval($row['cnt'] ?? 0);
            $select_stmt->close();
            if ($dupCount > 0) {
                print_log($my, $s_id, $user_id, $us_id, $GLOBALS['channel'] ?? '', "bildirim_duplicate_skipped: bildirim tekrar atlanıyor for user={$user_id}");
                return;
            }
        }

        $stmt = $my->prepare(
            "INSERT INTO bildirimler (user_id, msg, gonderim) VALUES (?, ?, ?)"
        );
        $stmt->bind_param("isi", $user_id, $msg, $durum);
        $stmt->execute();
        $stmt->close();
    }
}

include_once "trail_stop.php";
include_once "close_order.php";
include_once "create_order.php";
include_once "create_limit_tp.php";

$fba = 0;
print_log($my, $s_id, $user_id, $us_id, $channel, "Signal processing loop started.".($loop_signal ? "true" : "false"));
while ($loop_signal) {
    $aa1 = $my->query(
        "SELECT * FROM user_signals where id = '" . $signal_id . "';"
    );
    $aa = $aa1->fetch_assoc();

    print_rr($aa);

    if ($aa["id"] > 0) {
    } else {
        break;
    }

    $rsi1 = $my->query("SELECT * FROM `signals` WHERE id='$us[signal_id]'");
    $signal = $rsi1->fetch_assoc();

    $sm1 = $my->query("select * from rates where symbol='$us[symbol]'");
    $sym = $sm1->fetch_assoc();

    $ask = doubleval($sym["price"]);
    $bid = doubleval($sym["price"]);

    if ($ask > 0 && $bid > 0) {
    } else {
        break;
    }
    if (
        ($signal["status"] == "closed" || $aa["ticket"] == -1) &&
        $is_test != 2
    ) {
        break;
    }

    $symbol = $signal["symbol"];

    if ($binance->digits == 0) {
        $binance->digits = $sym["digits"];
    }
    if ($binance->vdigits == 0) {
        $binance->vdigits = $sym["vdigits"];
    }

    $bid = $sym["price"];
    $ask = $sym["price"];

    if ($ask == "" || $bid == "") {
        continue;
    }

    if ($fba == 0 || $admin_ok == 1) {
    }

    $last_bid = $bid;
    $last_ask = $ask;
   
    if ($signal["direction"] == "LONG") {
        include("manage_buy.php");
        if (isset($break_buy) && $break_buy == 1) {
            break;
        }
    } elseif ($signal["direction"] == "SHORT") {
        include("manage_sell.php");
        if (isset($break_sell) && $break_sell == 1) {
            break;
        }
    }

    sleep(1);
}

print_log($my, $s_id, $user_id, $us_id, $channel, "Signal processing loop finished.");

$my->close();

?>
