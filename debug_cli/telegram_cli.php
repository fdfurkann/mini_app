<?php
error_reporting(0);
ini_set('display_errors', 0);

// Telegram API bilgileri
const API_ID = 9663478;
const API_HASH = '200e6ceea04b5fcc17d6fe2d0ce1c692';
const PHONE_NUMBER = '+905459111147';

require_once __DIR__ . '/vendor/autoload.php';

use danog\MadelineProto\API;
use danog\MadelineProto\Settings;
use danog\MadelineProto\Logger;
use danog\MadelineProto\Settings\Logger as SettingsLogger;

function echo_flush($str) {
    echo $str;
    if (function_exists('ob_flush') && ob_get_level() > 0) ob_flush();
    flush();
}

$session_file = __DIR__ . '/telegram.session';
$settings = new Settings();
$loggerSettings = new SettingsLogger();
$loggerSettings->setType(Logger::FILE_LOGGER)->setLevel(Logger::FATAL_ERROR);
$settings->setLogger($loggerSettings);
$settings->getAppInfo()->setApiId(API_ID);
$settings->getAppInfo()->setApiHash(API_HASH);

$MadelineProto = new API($session_file, $settings);
try {
    $MadelineProto->start();
} catch (Exception $e) {
    echo_flush("Giriş başarısız: " . $e->getMessage() . "\n");
    exit(1);
}

// MCP: Komut fonksiyonları
function cmd_chats($MadelineProto) {
    $dialogs = $MadelineProto->messages->getDialogs(['limit' => 50]);
    if (isset($dialogs['chats']) && is_array($dialogs['chats'])) {
        foreach ($dialogs['chats'] as $i => $chat) {
            $title = $chat['title'] ?? $chat['username'] ?? 'Bilinmeyen';
            $id = $chat['id'] ?? '';
            echo_flush("[$i] $title (ID: $id)\n");
        }
    } else {
        echo_flush("Sohbet bulunamadı!\n");
    }
}

function cmd_chat($MadelineProto, $chat_id) {
    if (!is_numeric($chat_id)) {
        $chat_id = ltrim($chat_id, '@');
    }
    try {
        $messages = $MadelineProto->messages->getHistory(['peer' => $chat_id, 'limit' => 100]);
        if (isset($messages['messages']) && is_array($messages['messages'])) {
            foreach ($messages['messages'] as $msg) {
                $from = $msg['from_id']['user_id'] ?? $msg['from_id']['channel_id'] ?? 'Sistem';
                $text = $msg['message'] ?? '';
                $date = isset($msg['date']) ? date('Y-m-d H:i:s', $msg['date']) : '-';
                echo_flush("[$date] [$from]: $text\n");
            }
        } else {
            echo_flush("Mesaj bulunamadı!\n");
        }
    } catch (Exception $e) {
        echo_flush("Sohbet veya kullanıcı bulunamadı: " . $e->getMessage() . "\n");
    }
}

function cmd_send($MadelineProto, $chat_id, $mesaj) {
    if (!is_numeric($chat_id)) {
        $chat_id = ltrim($chat_id, '@');
    }
    try {
        $MadelineProto->messages->sendMessage(['peer' => $chat_id, 'message' => $mesaj]);
        echo_flush("Mesaj gönderildi!\n");
    } catch (Exception $e) {
        echo_flush("Mesaj gönderilemedi: " . $e->getMessage() . "\n");
    }
}

// Komutlar dizisi (MCP)
$commands = [
    'chats' => function() use ($MadelineProto) { cmd_chats($MadelineProto); },
    'chat'  => function() use ($MadelineProto, $argv) {
        if (isset($argv[2])) cmd_chat($MadelineProto, $argv[2]);
        else echo_flush("Kullanım: php telegram_cli.php chat <id|username>\n");
    },
    'send'  => function() use ($MadelineProto, $argv) {
        if (isset($argv[2], $argv[3])) cmd_send($MadelineProto, $argv[2], $argv[3]);
        else echo_flush("Kullanım: php telegram_cli.php send <id|username> \"mesaj\"\n");
    },
];

if ($argc < 2 || !isset($commands[$argv[1]])) {
    echo_flush("Kullanım:\n");
    echo_flush("php telegram_cli.php chats\n");
    echo_flush("php telegram_cli.php chat <id|username>\n");
    echo_flush("php telegram_cli.php send <id|username> \"mesaj\"\n");
    exit(0);
}

// Komutu çalıştır
$commands[$argv[1]](); 