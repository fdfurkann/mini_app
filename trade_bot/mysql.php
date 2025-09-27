<?php 

ob_start();
ob_implicit_flush(true);
error_reporting(E_ALL & ~E_NOTICE);

ini_set("display_errors","On");
ini_set("implicit_flush","On");

include("binance.rest.php");
include("bingx.rest.php");
include("bybit.rest.php");

$p_name="coinnet";

// .env dosyasını oku
$env_path = __DIR__ . '/../.env';
$env = file_exists($env_path) ? file($env_path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) : [];
$env_vars = array();
foreach ($env as $line) {
    if (strpos(trim($line), '#') === 0 || strpos($line, '=') === false) {
        continue;
    }
    list($key, $value) = explode('=', $line, 2);
    $env_vars[trim($key)] = trim($value);
}

$mysql_host = $env_vars['DB_HOST'] ?? null;
$mysql_user = $env_vars['DB_USER'] ?? null;
$mysql_pass = $env_vars['DB_PASSWORD'] ?? null;
$mysql_name = $env_vars['DB_NAME'] ?? null;

function trade_log(...$args) {
    global $my, $s_id, $user_id, $us_id, $channel;

    $detail = '';
    foreach ($args as $arg) {
        if (is_array($arg) || is_object($arg)) {
            $detail .= print_r($arg, true);
        } else {
            $detail .= $arg;
        }
        $detail .= ' ';
    }

    $detail = trim($detail);
    $escaped_detail = $my->real_escape_string($detail);
    
    $s_id = $s_id ?? 0;
    $user_id = $user_id ?? 0;
    $us_id = $us_id ?? 0;
    $channel = $channel ?? '';

    $stmt = $my->prepare("INSERT INTO bot_logs (signals_id, user_id, user_signals_id, channel_id, detail) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("sssss", $s_id, $user_id, $us_id, $channel, $escaped_detail);
    $stmt->execute();
    $stmt->close();
}


// Telegram ayarları .env dosyasından okunacak
$server_api_key = $env_vars['BOT_TOKEN'] ?? '';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$my = new mysqli($mysql_host, $mysql_user, $mysql_pass, $mysql_name);

$my->query("set names utf8;");

?>