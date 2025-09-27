<?php
// Kullanım: php mysql_cli.php "SELECT * FROM tablo LIMIT 1"

// MySQL bağlantı bilgileri
$host = 'localhost';
$db   = 'orcatradebot';
$user = 'root';
$pass = 'MySql!bot2021Tr';
$charset = 'utf8mb4';

if ($argc < 2) {
    echo "Kullanım: php mysql_cli.php \"SQL_SORGUSU\"\n";
    exit(1);
}

$sql = $argv[1];

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    $stmt = $pdo->query($sql);
    $results = $stmt->fetchAll();
    if (empty($results)) {
        echo "(Boş sonuç)\n";
    } else {
        foreach ($results as $row) {
            echo json_encode($row, JSON_UNESCAPED_UNICODE) . "\n";
        }
    }
} catch (PDOException $e) {
    echo "Hata: " . $e->getMessage() . "\n";
    exit(2);
} 