<?php
// Kullanım: php import_signal.php remote_db_adi

if ($argc < 2) {
    echo "Kullanım: php import_signal.php remote_db_adi\n";
    exit(1);
}

$remote_db = $argv[1];

// Uzak sunucu bağlantı bilgileri (mysql_cli_remote.php'den)
$remote_host = '170.64.201.133';
$remote_user = 'root';
$remote_pass = 'Trade!bot2021Tr';
$remote_charset = 'utf8mb4';

$remote_mysqli = new mysqli($remote_host, $remote_user, $remote_pass, $remote_db);
if ($remote_mysqli->connect_errno) {
    echo "Uzak sunucuya bağlanılamadı (mysqli): " . $remote_mysqli->connect_error . "\n";
    exit(2);
}
$remote_mysqli->set_charset($remote_charset);

// signals tablosunu çek
$signals = [];
$res = $remote_mysqli->query("SELECT * FROM signals");
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $signals[] = $row;
    }
    $res->free();
}
echo "Remote signals count: " . count($signals) . "\n";

// Alan eşleştirmesi: remote ve local signals tabloları farklı olabilir, örnek eşleştirme yapılacak
foreach ($signals as $row) {
    // Remote tablodan gelen alanlar
    $id = isset($row['id']) ? (int)$row['id'] : 'NULL';
    $symbol = isset($row['symbol']) ? addslashes($row['symbol']) : '';
    $direction = isset($row['trend']) ? addslashes($row['trend']) : '';
    $entry1 = isset($row['entry1']) ? (float)$row['entry1'] : 0;
    $entry2 = isset($row['entry2']) ? (float)$row['entry2'] : 0;
    $stop_loss = isset($row['sl']) ? (float)$row['sl'] : 0;
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
    $status = isset($row['status']) ? addslashes($row['status']) : 'open';
    $created_at = isset($row['tarih']) ? addslashes($row['tarih']) : date('Y-m-d H:i:s');
    $updated_at = $created_at;
    // Local signals tablosuna uygun şekilde INSERT sorgusu hazırla
    $sql = "INSERT INTO signals (symbol, direction, entry1, entry2, stop_loss, tp1, tp2, tp3, tp4, tp5, tp6, tp7, tp8, tp9, tp10, status, created_at, updated_at) VALUES ('{$symbol}', '{$direction}', {$entry1}, {$entry2}, {$stop_loss}, {$tp1}, {$tp2}, {$tp3}, {$tp4}, {$tp5}, {$tp6}, {$tp7}, {$tp8}, {$tp9}, {$tp10}, '{$status}', '{$created_at}', '{$updated_at}');";
    echo $sql . "\n";
} 