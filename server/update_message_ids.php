<?php
// signals tablosunda belirli bir kanala ve tarihe ait kayıtların message_id alanını sırayla güncelleyen script

$host = 'localhost';
$db   = 'orcatradebot';
$user = 'root';
$pass = 'MySql!bot2021Tr';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    die("Bağlantı hatası: " . $e->getMessage());
}

$sql = "SELECT id FROM signals WHERE channel_id = 2693689149 AND open_time < '2025-08-20' ORDER BY open_time ASC, id ASC";
$stmt = $pdo->query($sql);
$rows = $stmt->fetchAll();

$message_id = 1;
foreach ($rows as $row) {
    $update = $pdo->prepare("UPDATE signals SET message_id = ? WHERE id = ?");
    $update->execute([$message_id, $row['id']]);
    echo "update signals set message_id = $message_id where id = {$row['id']};\n";
    $message_id++;
}

echo "Toplam güncellenen kayıt: " . ($message_id - 1) . "\n"; 