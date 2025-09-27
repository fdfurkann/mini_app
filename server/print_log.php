<?php

function print_log($my = null, $id = null, $uid = null, $usid = null, $chid = null, $msg = '') {
    if (is_null($id) && is_null($chid)) return;
    $now = new DateTime();
    $dt = $now->format('Y-m-d H:i:s');
    $cleanMsg = (string)$msg;
   
    if ($uid && $usid) {
        $prefix = "[c:$chid|s:$id,u:$uid,us:$usid]";
    } else {
        $prefix = "[c:$chid|s:$id]";
    }
    $out = "$dt $prefix $cleanMsg";
    
    echo $out . "\n";
    // Logu dosyaya da yaz
    $logfile = '/home/user/mini_app/server/orca.log';
    file_put_contents($logfile, $out . "\n", FILE_APPEND | LOCK_EX);
    ob_flush();
    flush();
    if ($my) {
        try {
            $stmt = $my->prepare("INSERT INTO bot_logs (signals_id, user_id, user_signals_id, channel_id, detail) VALUES (?, ?, ?, ?, ?)");
            $signals_id = $id ?? 0;
            $user_id = $uid ?? 0;
            $user_signals_id = $usid ?? 0;
            $channel_id = $chid ?? '';
            $detail = $msg;
            $stmt->bind_param("iiiss", $signals_id, $user_id, $user_signals_id, $channel_id, $detail);
            $stmt->execute();
            $stmt->close();
        } catch (Exception $e) {
            print_r($e);
            // error_log('print_log DB yazma hatası: ' . $e->getMessage());
        }
    }
}
