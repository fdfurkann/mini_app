<?php
// Kullanım: php mysql_import.php db_adi

if ($argc < 2) {
    echo "Kullanım: php mysql_import.php db_adi\n";
    exit(1);
}

$remote_db = $argv[1];

// Uzak sunucu bağlantı bilgileri (mysql_cli_remote.php'den)
$remote_host = '170.64.201.133';

$remote_user = 'root';
$remote_pass = 'Trade!bot2021Tr';
$remote_charset = 'utf8mb4';

// PDO yerine mysqli ile bağlan
$remote_mysqli = new mysqli($remote_host, $remote_user, $remote_pass, $remote_db);
if ($remote_mysqli->connect_errno) {
    echo "Uzak sunucuya bağlanılamadı (mysqli): " . $remote_mysqli->connect_error . "\n";
    exit(2);
}
$remote_mysqli->set_charset($remote_charset);

// Yeni sunucu bağlantı bilgileri (mysql_cli.php ile aynı veritabanı)
$new_host = 'localhost';
$new_db = 'orcatradebot';
$new_user = 'root';
$new_pass = 'MySql!bot2021Tr';
$new_charset = 'utf8mb4';
$new_dsn = "mysql:host=$new_host;dbname=$new_db;charset=$new_charset";
$new_options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];
try {
    $new_pdo = new PDO($new_dsn, $new_user, $new_pass, $new_options);
} catch (PDOException $e) {
    echo "Yeni sunucuya bağlanılamadı: " . $e->getMessage() . "\n";
    exit(3);
}

function run_and_print($pdo, $sql) {
    echo $sql . "\n";
    /*
	try {
        $pdo->exec($sql);
        echo "[OK]\n";
    } catch (PDOException $e) {
        echo "[HATA] " . $e->getMessage() . "\n";
    }
	*/
}

// 1. sinyalgrup -> bot_rooms
$sinyalgrup = [];
$res = $remote_mysqli->query("SELECT * FROM sinyalgrup");
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $sinyalgrup[] = $row;
    }
    $res->free();
}
foreach ($sinyalgrup as $row) {
    $room_id = (int)($row['telegram_id'] ?? 0);
    $room_name = addslashes($row['isim'] ?? '');
    $admin_id = 0;
    $channel_desc = '';
    $channel_img = '';
    $telegram_link = addslashes($row['invite_link'] ?? '');
    $pnl_msg = '';
    $register = date('Y-m-d H:i:s');
    $active = 0;
    $sira = 0;
    $sql = "INSERT INTO bot_rooms (room_id, room_name, admin_id, channel_desc, channel_img, telegram_link, pnl_msg, register, active, sira) VALUES ($room_id, '$room_name', $admin_id, '$channel_desc', '$channel_img', '$telegram_link', '$pnl_msg', '$register', $active, $sira);";
    //run_and_print($new_pdo, $sql);
}

// 2. users -> users ve enrolled_users
$users = [];
$res = $remote_mysqli->query("SELECT * FROM users");
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $users[] = $row;
    }
    $res->free();
}
echo "Remote users count: " . count($users) . "\n";
foreach ($users as $row) {
    $id = (int)$row['user_id'];
    $username = addslashes($row['username'] ?? '');
    $full_name = addslashes(trim(($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? '')));
    $email = 'NULL';
    $phone = 'NULL';
    $is_admin = 0;
    $is_vip = 0;
    $subscription_expires_at = 'NULL';
    $created_at = date('Y-m-d H:i:s', (int)($row['tarih'] ?? time()));
    $updated_at = $created_at;
    $last_login = 'NULL';
    $login_hash = md5($id . $username . $created_at);
    $status = ($row['durum'] ?? 0) == 9 ? 'active' : 'passive';
    $language = 'tr';
    $notes = 'NULL';
    $old_id = 'NULL';
    $sql = "INSERT INTO users (id, username, full_name, email, phone, is_admin, is_vip, subscription_expires_at, created_at, updated_at, last_login, login_hash, status, language, notes, old_id) VALUES ($id, '$username', '$full_name', $email, $phone, $is_admin, $is_vip, $subscription_expires_at, '$created_at', '$updated_at', $last_login, '$login_hash', '$status', '$language', $notes, $old_id);";
    //run_and_print($new_pdo, $sql);
    $abonelik = (int)($row['abonelik'] ?? 0);
    if ($abonelik > 0) {
        $start_date = $created_at;
        $end_date = date('Y-m-d H:i:s', $abonelik);
        $package_id = 1;
        $package_time = 0;
        $package_api_rights = 0;
        $sql2 = "INSERT INTO enrolled_users (package_id, user_id, package_time, package_api_rights, start_date, end_date) VALUES ($package_id, $id, $package_time, $package_api_rights, '$start_date', '$end_date');";
        //run_and_print($new_pdo, $sql2);
    }
}

// 3. apikeys -> api_keys
$apikeys = [];
$res = $remote_mysqli->query("SELECT * FROM apikeys");
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $apikeys[] = $row;
    }
    $res->free();
}
foreach ($apikeys as $row) {
    $user_id = (int)$row['user_id'];
    $api_name = addslashes($row['name'] ?? '');
    $api_key = addslashes($row['api_key'] ?? '');
    $api_secret = addslashes($row['api_secret'] ?? '');
    $api_type = 1;
    $bot_room = 0;
    $user_room = null;
    foreach ($sinyalgrup as $grup) {
        if ((int)($grup['telegram_id'] ?? 0) === $user_id) {
            $user_room = (int)$grup['telegram_id'];
            break;
        }
    }
    if ($user_room) {
        $bot_room = $user_room;
    }
    $defaults = [
        'lotsize' => '6',
        'leverage' => 20,
        'margin_type' => 'ISOLATED',
        'max_orders' => 10,
        'auto_trade' => 1,
        'stop_loss' => 0,
        'stop_loss_settings' => 'signal',
        'percent_loss' => 'NULL',
        'stop_amount' => 'NULL',
        'take_profit' => 'NULL',
        'take_profit_trading_setting' => 'NULL',
        'signal_profit' => 'NULL',
        'percent_profit' => 'NULL',
        'tp0' => 'NULL',
        'tp1' => '20',
        'tp2' => '20',
        'tp3' => '20',
        'tp4' => '20',
        'tp5' => '20',
        'tp6' => '20',
        'tp7' => '20',
        'tp8' => '20',
        'tp9' => '20',
        'tp10' => '20',
        'is_profit_target_enabled' => 'NULL',
        'profit_amount' => 'NULL',
        'profit_target_amount' => 'NULL',
        'withdraw_to_cost' => 'NULL',
        'trail_stop' => 0,
        'sl_tp_order' => 0,
        'break_even_level' => "'none'",
        'status' => 1
    ];
    $lotsize = isset($row['lot']) ? (int)$row['lot'] : $defaults['lotsize'];
    $leverage = isset($row['leverage']) ? (int)$row['leverage'] : $defaults['leverage'];
    $margin_type = $defaults['margin_type'];
    $max_orders = isset($row['maxemir']) ? (int)$row['maxemir'] : $defaults['max_orders'];
    $auto_trade = $defaults['auto_trade'];
    $stop_loss = isset($row['stoploss']) ? (int)$row['stoploss'] : $defaults['stop_loss'];
    $stop_loss_settings = isset($row['stop_loss_settings']) ? addslashes($row['stop_loss_settings']) : $defaults['stop_loss_settings'];
    $percent_loss = $defaults['percent_loss'];
    $stop_amount = $defaults['stop_amount'];
    $take_profit = isset($row['takeprofit']) ? (int)$row['takeprofit'] : $defaults['take_profit'];
    $take_profit_trading_setting = $defaults['take_profit_trading_setting'];
    $signal_profit = $defaults['signal_profit'];
    $percent_profit = $defaults['percent_profit'];
    $tp0 = $defaults['tp0'];
    $tp1 = isset($row['tp1']) ? addslashes($row['tp1']) : $defaults['tp1'];
    $tp2 = isset($row['tp2']) ? addslashes($row['tp2']) : $defaults['tp2'];
    $tp3 = isset($row['tp3']) ? addslashes($row['tp3']) : $defaults['tp3'];
    $tp4 = isset($row['tp4']) ? addslashes($row['tp4']) : $defaults['tp4'];
    $tp5 = isset($row['tp5']) ? addslashes($row['tp5']) : $defaults['tp5'];
    $tp6 = isset($row['tp6']) ? addslashes($row['tp6']) : $defaults['tp6'];
    $tp7 = isset($row['tp7']) ? addslashes($row['tp7']) : $defaults['tp7'];
    $tp8 = isset($row['tp8']) ? addslashes($row['tp8']) : $defaults['tp8'];
    $tp9 = isset($row['tp9']) ? addslashes($row['tp9']) : $defaults['tp9'];
    $tp10 = isset($row['tp10']) ? addslashes($row['tp10']) : $defaults['tp10'];
    $is_profit_target_enabled = $defaults['is_profit_target_enabled'];
    $profit_amount = $defaults['profit_amount'];
    $profit_target_amount = $defaults['profit_target_amount'];
    $withdraw_to_cost = $defaults['withdraw_to_cost'];
    $trail_stop = $defaults['trail_stop'];
    $sl_tp_order = $defaults['sl_tp_order'];
    $break_even_level = $defaults['break_even_level'];
    $status = isset($row['durum']) ? (int)$row['durum'] : $defaults['status'];
    $enrolled_id = 'NULL';
    $created_at = date('Y-m-d H:i:s');
    $updated_at = $created_at;
    $sql = "INSERT INTO api_keys (user_id, api_name, api_key, api_secret, api_type, bot_room, lotsize, leverage, margin_type, max_orders, auto_trade, stop_loss, stop_loss_settings, percent_loss, stop_amount, take_profit, take_profit_trading_setting, signal_profit, percent_profit, tp0, tp1, tp2, tp3, tp4, tp5, tp6, tp7, tp8, tp9, tp10, is_profit_target_enabled, profit_amount, profit_target_amount, withdraw_to_cost, trail_stop, sl_tp_order, break_even_level, status, enrolled_id, created_at, updated_at) VALUES ($user_id, '$api_name', '$api_key', '$api_secret', $api_type, $bot_room, $lotsize, $leverage, '$margin_type', $max_orders, $auto_trade, $stop_loss, '$stop_loss_settings', $percent_loss, $stop_amount, $take_profit, $take_profit_trading_setting, $signal_profit, $percent_profit, $tp0, '$tp1', '$tp2', '$tp3', '$tp4', '$tp5', '$tp6', '$tp7', '$tp8', '$tp9', '$tp10', $is_profit_target_enabled, $profit_amount, $profit_target_amount, $withdraw_to_cost, $trail_stop, $sl_tp_order, $break_even_level, $status, $enrolled_id, '$created_at', '$updated_at');";
    //run_and_print($new_pdo, $sql);
}

// 4. signals -> signals
$signals = [];
$res = $remote_mysqli->query("SELECT * FROM signals where close>0 order by opendate asc");
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $signals[] = $row;
    }
    $res->free();
}
echo "Remote signals count: " . count($signals) . "\n";
foreach ($signals as $row) {

    $channel_id = $room_id;
    $message_id = isset($row['signalid']) ? addslashes($row['signalid']) : '';
    $symbol = isset($row['symbol']) ? addslashes($row['symbol']) : '';
    $direction = isset($row['trend']) ? addslashes($row['trend']) : '';
    $entry1 = isset($row['entry1']) ? (float)$row['entry1'] : 0;
    $entry2 = isset($row['entry2']) ? (float)$row['entry2'] : 0;
    $sl = isset($row['sl']) ? (float)$row['sl'] : 0;
    $tp1 = isset($row['tp1']) ? (float)$row['tp1'] : 0;
    $tp2 = isset($row['tp2']) ? (float)$row['tp2'] : 0;
    $tp3 = isset($row['tp3']) ? (float)$row['tp3'] : 0;
    $tp4 = isset($row['tp4']) ? (float)$row['tp4'] : 0;
    $tp5 = isset($row['tp5']) ? (float)$row['tp5'] : 0;
    $tp6 = isset($row['tp6']) ? (float)$row['tp6'] : 0;
    $tp7 = isset($row['tp7']) ? (float)$row['tp7'] : 0;
    $tp8 = isset($row['tp8']) ? (float)$row['tp8'] : 0;
    $tp9 = isset($row['tp9']) ? (float)$row['tp9'] : 0;
    $tp10 = isset($row['tp10']) ? (float)$row['tp10'] : 0;
    // status belirleme
    $close_time = isset($row['closedate']) ? $row['closedate'] : null;
    $open_time = isset($row['opendate']) ? $row['opendate'] : null;
    $status = 'pending';
    if (!empty($close_time) && $close_time !== '0000-00-00 00:00:00' && $close_time !== null) {
        $status = 'closed';
    } elseif (!empty($open_time) && $open_time !== '0000-00-00 00:00:00' && $open_time !== null) {
        $status = 'active';
    }
    $signal_hash = isset($row['signal_hash']) ? addslashes($row['signal_hash']) : '';
    $ticktime = isset($row['tickdate']) ? (int)$row['tickdate'] : 0;
    $bid = isset($row['bid']) ? (float)$row['bid'] : 0;
    $ask = isset($row['ask']) ? (float)$row['ask'] : 0;
    $open_time_sql = isset($row['opendate']) ? "'" . addslashes($row['opendate']) . "'" : 'NULL';
    $open_price = isset($row['open']) ? (float)$row['open'] : 0;
    $close_time_sql = isset($row['closedate']) ? "'" . addslashes($row['closedate']) . "'" : 'NULL';
    $close_price = isset($row['close']) ? (float)$row['close'] : 0;
    // last_tp hesaplama (takeprofit'e bak, tp_list'te en son hangisini geçmişse last_tp odur)
    $takeprofit = isset($row['takeprofit']) ? (float)$row['takeprofit'] : 0;
    $stop_loss = isset($row['stoploss']) ? (float)$row['stoploss'] : 0;
    $tp_list = [$tp1, $tp2, $tp3, $tp4, $tp5, $tp6, $tp7, $tp8, $tp9, $tp10];
    $last_tp = 0;
    if ($takeprofit > 0) {
        foreach ($tp_list as $i => $tp) {
            if ($tp > 0 && $takeprofit >= $tp) {
                $last_tp = $i + 1;
            }
        }
    }
    // last_sl hesaplama (TP'ye tam ulaşılmışsa stop yazma)
    $last_sl = 0;
    if ($stop_loss > 0) {
        if ($last_tp < 5) {
            $last_sl = 1;
        } else {
            $last_sl = 0;
        }
    }
    // profit hesaplama (önce takeprofit'e bak, yoksa stoploss'a bak)
    $profit = 0;
    if ($entry1 > 0) {
        if ($takeprofit > 0 && $last_tp > 0) {
            $tp_price = $tp_list[$last_tp - 1];
            if (strtoupper($direction) === 'LONG') {
                $profit = ($tp_price - $open_price) / $open_price * 100;
            } elseif (strtoupper($direction) === 'SHORT') {
                $profit = ($open_price - $tp_price) / $open_price * 100;
            }
        } elseif ($stop_loss > 0) {
            if (strtoupper($direction) === 'LONG') {
                $profit = ($stop_loss - $open_price) / $open_price * 100;
            } elseif (strtoupper($direction) === 'SHORT') {
                $profit = ($open_price - $stop_loss) / $open_price * 100;
            }
        }
    }
    $profit = number_format($profit, 3, '.', '');
    $tp_hit = $last_tp > 0 ? $last_tp : 0;
    $sl_hit = $last_sl > 0 ? $last_sl : 0;
    $closed_reason = '';
    $created_at = isset($row['tarih']) ? "'" . addslashes($row['tarih']) . "'" : 'CURRENT_TIMESTAMP';
    $updated_at = $created_at;
    $sql = "INSERT INTO signals (channel_id, message_id, symbol, direction, entry1, entry2, stop_loss, tp1, tp2, tp3, tp4, tp5, tp6, tp7, tp8, tp9, tp10, status, signal_hash, ticktime, bid, ask, open_time, open_price, close_time, close_price, tp_hit, sl_hit, closed_reason, profit, created_at, updated_at, last_tp) VALUES ($channel_id, '$message_id', '$symbol', '$direction', $entry1, $entry2, $sl, $tp1, $tp2, $tp3, $tp4, $tp5, $tp6, $tp7, $tp8, $tp9, $tp10, '$status', '$signal_hash', $ticktime, $bid, $ask, $open_time_sql, $open_price, $close_time_sql, $close_price, $tp_hit, $sl_hit, '$closed_reason', $profit, $created_at, $updated_at, $last_tp);";
    run_and_print($new_pdo, $sql);
    // Tek satırda özet bilgi yazdır
    //echo "[SYMBOL: $symbol] [Açılış: $open_price $open_time_sql] [Kapanış: $close_price $close_time_sql] [TP: $takeprofit] [SL: $stop_loss] [last_sl: $last_sl] [last_tp: $last_tp] [profit: $profit]" . "\n";
} 