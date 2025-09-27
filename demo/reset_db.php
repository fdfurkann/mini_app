#!/usr/bin/env php
<?php
$host = 'localhost';
$user = 'root';
$pass = '';
$db   = 'orcatradebot';
$sqlFile = __DIR__ . '/orcatradebot.sql';

$mysqli = new mysqli($host, $user, $pass, $db);
if ($mysqli->connect_errno) {
    fwrite(STDERR, "Bağlantı hatası: " . $mysqli->connect_error . "\n");
    exit(1);
}

// Tüm tabloları sil
$res = $mysqli->query("SHOW TABLES");
if ($res) {
    while ($row = $res->fetch_array()) {
        $mysqli->query("DROP TABLE IF EXISTS `{$row[0]}`");
    }
    $res->free();
}

// SQL dosyasını yükle
if (!file_exists($sqlFile)) {
    fwrite(STDERR, "SQL dosyası bulunamadı: $sqlFile\n");
    exit(1);
}
$sql = file_get_contents($sqlFile);
if ($mysqli->multi_query($sql)) {
    do {
        // Sonraki sonucu işle
    } while ($mysqli->more_results() && $mysqli->next_result());
    fwrite(STDOUT, "Veritabanı başarıyla sıfırlandı ve yüklendi.\n");
} else {
    fwrite(STDERR, "SQL yükleme hatası: " . $mysqli->error . "\n");
    exit(1);
}
$mysqli->close(); 