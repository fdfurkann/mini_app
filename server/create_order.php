<?php

// Include required functions
if (!function_exists('print_log')) {
    require_once 'print_log.php';
}
if (!function_exists('bildirim_ekle')) {
    require_once 'run_user.php';
}

function create_order(
    $sid,
    $my,
    $bysym,
    $binance,
    $api_exchange,
    $max_lots,
    $user_id,
    $s_id,
    $us_id,
    $admin_ok,
    $is_test,
    $bildirim_gonder,
    $user_leverage,
    $channel
) {
    print_log($my, $s_id, $user_id, $us_id, $channel, "create_order function called for signal ID: {$sid}");

    $rsi = $my->query("SELECT * FROM `user_signals` WHERE id='$sid'");
    $us = $rsi->fetch_assoc();

    if (($us["close"] > 0 || $us["open"] > 0) && $admin_ok == 1) {
        print_log($my, $s_id, $user_id, $us_id, $channel, "Order creation skipped for signal ID: {$sid} - already closed or open.");
        return;
    }

    $rsi1 = $my->query("SELECT * FROM `signals` WHERE id='$us[signal_id]'");
    $sg = $rsi1->fetch_assoc();

    $api1 = $my->query("SELECT * FROM `api_keys` WHERE id='$us[api_id]'");
    $api = $api1->fetch_assoc();
    $user_id = $api["user_id"];

    $sm1 = $my->query("select * from rates where symbol='$us[symbol]'");
    $sym = $sm1->fetch_assoc();

    $ask = $sym["price"];
    $bid = $sym["price"];
    if ($api_exchange == "bybit") {
        $sym["digits"] = $bysym["digits"];
        $sym["vdigits"] = $bysym["vdigits"];
    }
    $symbol = $us["symbol"];

    $price = 0;
    if ($admin_ok == 1 && $is_test == 1) {
        $volume = number_format(10, $sym["vdigits"], ".", "");
    } else {
        $volume = number_format($api["lotsize"], $sym["vdigits"], ".", "");
    }
    $sprice = number_format($sg["stop_loss"], $sym["digits"], ".", "");

    $tprice = 0;
    $signal_max_tp = 0;

    for ($i = 1; $i <= 10; $i++) {
        if ($sg["tp" . $i] > 0) {
            $tprice = number_format($sg["tp" . $i], $sym["digits"], ".", "");
            $signal_max_tp = $i;
        }
    }

    $user_max_tp = 5;

    for ($i = 1; $i <= 10; $i++) {
        if ($api["tp" . $i] > 0) {
            $user_max_tp = $i;
        }
    }

    // --- POZİSYON KONTROLÜ ---
    $p_risk = $binance->position_risk();
    $open_position_exists = false;
    if (is_array($p_risk) && isset($p_risk[$symbol]) && floatval($p_risk[$symbol]) != 0) {
        $open_position_exists = true;
    }
    if ($open_position_exists) {
        $error_code = -101;
        $error_msg = "Open position exists";
        $signal_str =
            "⚠️ ***Order Failed*** ⚠️\n\n" .
            "**Signal:** {$symbol} " .
            ($sg["direction"] ?? "") .
            "\n" .
            "**API Name:** {$api["api_name"]}\n" .
            "**Exchange:** {$api_exchange}\n\n" .
            "**Exchange Error:** {$error_msg} (code: {$error_code})\n\n" .
            "Please check your exchange account and API settings. The position for this signal **COULD NOT BE OPENED**.";

        print_log($my, $s_id, $user_id, $us_id, $channel, "Açık pozisyon bulundu, yeni emir açılmadı: {$error_msg}");
        bildirim_ekle($user_id, $signal_str, 0, $bildirim_gonder, $my, $s_id, $us_id);
        return;
    }
    // --- POZİSYON KONTROLÜ SONU --

    $emir_adet = 0;

    foreach ($p_risk as $a => $b) {
        if ($b != 0) {
            $emir_adet++;
        }
    }
    print_log($my, $s_id, $user_id, $us_id, $channel, "Current open orders count: {$emir_adet}");

    $price = $sym["price"];

    if (isset($p_risk[$symbol]) && $p_risk[$symbol] != 0) {
        $orders = [];
        $orders["code"] = -101;
        $orders["msg"] =
            "🚫 ***{$symbol} OPEN POSITION EXISTS***\n\n" .
            "📊 **Trade Details:**\n" .
            "📡 **API Name:** {$api["api_name"]}\n" .
            "🏦 **Exchange:** {$api_exchange}\n\n" .
            "A new trade could not be opened as you already have an open position in this pair.";
        print_log($my, $s_id, $user_id, $us_id, $channel, "Error: {$orders["msg"]}");
    } elseif ($emir_adet >= $api["max_orders"]) {
        $error_code = -102;
        $error_msg = "Max orders reached";
        $signal_str =
            "⚠️ ***Order Failed*** ⚠️\n\n" .
            "**Signal:** {$symbol} " .
            ($sg["direction"] ?? "") .
            "\n" .
            "**API Name:** {$api["api_name"]}\n" .
            "**Exchange:** {$api_exchange}\n\n" .
            "**Exchange Error:** {$error_msg} (code: {$error_code})\n\n" .
            "Please check your exchange account and API settings. The position for this signal **COULD NOT BE OPENED**.";
        print_log($my, $s_id, $user_id, $us_id, $channel, "Error: {$signal_str}");
        bildirim_ekle($user_id, $signal_str, 0, $bildirim_gonder, $my, $s_id, $us_id);
    } else {
        $max_lot = $max_lots[$symbol] ?? 0;

        $b_orders = [];

        $price = $sym["price"];
        $volume = number_format(
            $api["lotsize"] / $price,
            $sym["vdigits"],
            ".",
            ""
        );
        print_log($my, $s_id, $user_id, $us_id, $channel, "[DEBUG] Hesaplanan volume: {$volume}, Max lot: {$max_lot}");

        if ($max_lot > 0 && $volume > $max_lot) {
            $volume = number_format($max_lot, $sym["vdigits"], ".", "");
            print_log($my, $s_id, $user_id, $us_id, $channel, "[DEBUG] Volume max lota ayarlandı: {$volume}");
        }

        // Bybit için debug logları
        if ($api_exchange == "bybit") {
            print_log($my, $s_id, $user_id, $us_id, $channel, "[DEBUG] Bybit ana pozisyon açılışı başlıyor. Symbol: {$symbol}, Volume: {$volume}, Price: {$price}");
            $main_order_result = $binance->order_send(
                $symbol,
                isset($sg["direction"]) && $sg["direction"] == "LONG" ? "BUY" : "SELL",
                "MARKET",
                $volume,
                $price
            );
            print_log($my, $s_id, $user_id, $us_id, $channel, "[DEBUG] Bybit ana pozisyon order_send sonucu: " . print_rr($main_order_result, true));

            // Eğer Bybit path'te ana emir başarılı döndüyse, sadece kaydet ve daha sonra genel blokta SL/TP işlemleri yapılacak.
            if (!empty($main_order_result["orderId"]) || !empty($main_order_result["orderID"])) {
                $main_sent = true;
                $main_prev_order = $main_order_result;

                $active_orders = $binance->open_orders($symbol);
                print_log($my, $s_id, $user_id, $us_id, $channel, "[DEBUG] Bybit open_orders sonucu: " . print_rr($active_orders, true));
                $open_positions = $binance->open_positions($symbol);
                print_log($my, $s_id, $user_id, $us_id, $channel, "[DEBUG] Bybit open_positions sonucu: " . print_rr($open_positions, true));

                // NOT: SL/TP emirleri burada gönderilmeyecek. Genel akışta ana emir doğrulanırsa SL/TP gönderimi yapılacaktır.
            } else {
                print_log($my, $s_id, $user_id, $us_id, $channel, "[ERROR] Bybit ana pozisyon orderId alınamadı, SL/TP emirleri burada açılmayacak.");
            }
        }

        // New SL/TP logic
        $sprice = 0;
        if (isset($api["stop_loss_settings"])) {
            if ($api["stop_loss_settings"] == "signal") {
                if (isset($sg["stop_loss"]) && $sg["stop_loss"] > 0) {
                    $sprice = number_format(
                        $sg["stop_loss"],
                        $sym["digits"],
                        ".",
                        ""
                    );
                }
            } elseif (
                $api["stop_loss_settings"] == "custom" &&
                isset($api["percent_loss"]) &&
                $api["percent_loss"] > 0
            ) {
                if (isset($sg["direction"]) && $sg["direction"] == "LONG") {
                    $sprice = number_format(
                        $price * (1 - $api["percent_loss"] / 100),
                        $sym["digits"],
                        ".",
                        ""
                    );
                } else {
                    // SHORT
                    $sprice = number_format(
                        $price * (1 + $api["percent_loss"] / 100),
                        $sym["digits"],
                        ".",
                        ""
                    );
                }
            }
        }

        $tprice = 0;
        if (isset($api["take_profit"])) {
            if ($api["take_profit"] == "signal") {
                $signal_tprice = 0;
                for ($i = 10; $i >= 1; $i--) {
                    if (isset($sg["tp" . $i]) && $sg["tp" . $i] > 0) {
                        $signal_tprice = $sg["tp" . $i];
                        break;
                    }
                }
                if ($signal_tprice > 0) {
                    $tprice = number_format(
                        $signal_tprice,
                        $sym["digits"],
                        ".",
                        ""
                    );
                }
            } elseif (
                $api["take_profit"] == "custom" &&
                isset($api["percent_profit"]) &&
                $api["percent_profit"] > 0
            ) {
                if (isset($sg["direction"]) && $sg["direction"] == "LONG") {
                    $tprice = number_format(
                        $price * (1 + $api["percent_profit"] / 100),
                        $sym["digits"],
                        ".",
                        ""
                    );
                } else {
                    // SHORT
                    $tprice = number_format(
                        $price * (1 - $api["percent_profit"] / 100),
                        $sym["digits"],
                        ".",
                        ""
                    );
                }
            }
        }

        // Prepare orders
        // $main_order = null;
        // $sl_order = null;
        // $tp_order = null;
        //
        // if (isset($sg["direction"]) && $sg["direction"] == "LONG") {
        //     $main_order = $binance->prepare_order(...);
        //     ...
        // } elseif (isset($sg["direction"]) && $sg["direction"] == "SHORT") {
        //     $main_order = $binance->prepare_order(...);
        //     ...
        // }
        // Emirleri tek tek gönder
        $orders = [];
        $sticket = -1;
        $tticket = -1;

        // Ana emir
        if (isset($sg["direction"]) && $sg["direction"] == "LONG") {
            $main_side = "BUY";
        } elseif (isset($sg["direction"]) && $sg["direction"] == "SHORT") {
            $main_side = "SELL";
        } else {
            $main_side = "BUY";
        }

        // Sadece daha önce Bybit yolunda ana emir gönderilmediyse ana emri gönder, aksi halde önceki sonucu kullan
        if (!$main_sent) {
            $main_order = $binance->order_send(
                $symbol,
                $main_side,
                "MARKET",
                $volume,
                $price
            );
            $orders[0] = $main_order;
            print_log($my, $s_id, $user_id, $us_id, $channel, "Main order send response: " . print_rr($main_order, true));
        } else {
            $main_order = $main_prev_order;
            $orders[0] = $main_order;
            print_log($my, $s_id, $user_id, $us_id, $channel, "Main order reused from earlier Bybit send: " . print_rr($main_order, true));
        }

        // SL emir
        if ($sprice > 0 && isset($api["stop_loss_settings"]) && $api["stop_loss_settings"] != "none") {
            $sl_side = (isset($sg["direction"]) && $sg["direction"] == "LONG") ? ($api_exchange == "bingx" ? "BUY" : "SELL") : ($api_exchange == "bingx" ? "SELL" : "BUY");
            $sl_volume = $volume;
            $sl_order = $binance->order_send(
                $symbol,
                $sl_side,
                "SL",
                $sl_volume,
                $sprice
            );
            $orders[1] = $sl_order;
            print_log($my, $s_id, $user_id, $us_id, $channel, "SL order send response: " . print_rr($sl_order, true));
        }

        // TP emir
        if ($tprice > 0 && isset($api["take_profit"]) && $api["take_profit"] != "none") {
            $tp_side = (isset($sg["direction"]) && $sg["direction"] == "LONG") ? ($api_exchange == "bingx" ? "BUY" : "SELL") : ($api_exchange == "bingx" ? "SELL" : "BUY");
            $tp_volume = $volume;
            $tp_order = $binance->order_send(
                $symbol,
                $tp_side,
                "TP",
                $tp_volume,
                $tprice
            );
            $orders[2] = $tp_order;
            print_log($my, $s_id, $user_id, $us_id, $channel, "TP order send response: " . print_rr($tp_order, true));
        }

        $main_order_result = $main_order;
        
        $sticket = -1;
        $tticket = -1;

        if ($main_order_result && (!empty($main_order_result["orderId"]) || !empty($main_order_result["orderID"]))) {
            $order_ticket = $main_order_result["orderId"] ?? $main_order_result["orderID"];
            $order_status = $main_order_result["status"];

            // Borsadan gerçek giriş fiyatını al
            $gercek_acilis_fiyati = $price; // Fallback olarak anlık fiyat
            try {
                $order_details = $binance->order_status($symbol, $order_ticket);
                if (isset($order_details["avgPrice"]) && (float)$order_details["avgPrice"] > 0) {
                    $gercek_acilis_fiyati = $order_details["avgPrice"];
                    print_log($my, $s_id, $user_id, $us_id, $channel, "Borsadan gerçek açılış fiyatı alındı: {$gercek_acilis_fiyati}");
                } else {
                    print_log($my, $s_id, $user_id, $us_id, $channel, "Gerçek açılış fiyatı alınamadı (avgPrice=0), anlık fiyat kullanılıyor: {$gercek_acilis_fiyati}. Gelen Cevap: " . print_rr($order_details, true));
                }
            } catch (Exception $e) {
                print_log($my, $s_id, $user_id, $us_id, $channel, "Gerçek açılış fiyatı alınırken hata oluştu, anlık fiyat kullanılıyor: {$gercek_acilis_fiyati}. Hata: " . $e->getMessage());
            }

            global $user_leverage;
            $opentime = date("d-m-Y H:i:s");
            $signal_str =
                "✅ ***{$symbol} {$sg["direction"]} POSITION OPENED***\n\n" .
                "📊 **Order Details:**\n" .
                "📡 **API Name:** {$api["api_name"]}\n" .
                "🏦 **Exchange:** {$api_exchange}\n" .
                "💰 **Entry Price:** {$gercek_acilis_fiyati}\n" .
                "📦 **Volume:** {$volume}\n" .
                "⚙️ **Leverage:** {$user_leverage}x\n" .
                "⏰ **Open Time:** {$opentime}\n\n" .
                "✨ *Good luck! Your position is being tracked.*";

            $my->query(
                "update user_signals set open='" .
                    $gercek_acilis_fiyati .
                    "', volume='" .
                    $volume .
                    "', ticket='" .
                    $order_ticket .
                    "' where id='" .
                    $sid .
                    "'"
            );
            print_log($my, $s_id, $user_id, $us_id, $channel, "#{$order_ticket} {$symbol} {$sg["direction"]} MARKET {$volume} {$gercek_acilis_fiyati} " . date("Y-m-d H:i:s") . " {$order_status}");

            // Send position opened notification
            bildirim_ekle(
                $user_id,
                $signal_str,
                0,
                $bildirim_gonder,
                $my,
                $s_id,
                $us_id
            );
            print_log($my, $s_id, $user_id, $us_id, $channel, "Position opened notification sent to user.");

            // Process SL order result
            if (isset($orders[1])) {
                if (isset($orders[1]["orderId"]) && $orders[1]["orderId"] != "") {
                    $sticket = $orders[1]["orderId"];
                    $current_datetime = date("Y-m-d H:i:s");
                    $status = $orders[1]["status"] ?? 'FILLED';
                    $side = $orders[1]["side"] ?? ($sl_order["side"] ?? '');
                    $type = $orders[1]["type"] ?? 'SL';
                    $stopPrice = $orders[1]["stopPrice"] ?? $sprice;
                    print_log($my, $s_id, $user_id, $us_id, $channel, "#{$sticket} {$symbol} {$side} {$type} {$sl_volume} {$stopPrice} {$current_datetime} {$status}");
                } else {
                    $sl_error_code = $orders[1]["code"] ?? -1;
                    $sl_error_msg = stripslashes($orders[1]["msg"] ?? "Unknown SL error");
                    print_log($my, $s_id, $user_id, $us_id, $channel, "order error code : {$sl_error_code} msg : {$sl_error_msg}");
                    
                    // Retry SL order placement
                    for ($i = 0; $i < 3; $i++) {
                        sleep(1);
                        print_log($my, $s_id, $user_id, $us_id, $channel, "Retrying to place SL order, attempt " . ($i + 1));
                        $retry_sl_order = $binance->order_send($symbol, $sl_side, 'SL', $sl_volume, $sprice);
                        if (isset($retry_sl_order["orderId"]) && $retry_sl_order["orderId"] != "") {
                            $sticket = $retry_sl_order["orderId"];
                            $current_datetime = date("Y-m-d H:i:s");
                            $status = $retry_sl_order["status"] ?? 'NEW';
                            $side = $retry_sl_order["side"] ?? ($sl_order["side"] ?? '');
                            $type = $retry_sl_order["type"] ?? 'SL';
                            $stopPrice = $retry_sl_order["stopPrice"] ?? $sprice;
                            $origQty = $retry_sl_order["origQty"] ?? $sl_volume;
                            print_log($my, $s_id, $user_id, $us_id, $channel, "#{$sticket} {$symbol} {$side} {$type} {$origQty} {$stopPrice} {$current_datetime} {$status}");
                            break;
                        } else {
                            $sl_error_code = $retry_sl_order["code"] ?? -1;
                            $sl_error_msg = stripslashes($retry_sl_order["msg"] ?? "Unknown SL error");
                            print_log($my, $s_id, $user_id, $us_id, $channel, "SL order attempt " . ($i + 1) . " failed: code {$sl_error_code} - {$sl_error_msg}");
                        }
                    }

                    if ($sticket == -1) {
                        $sl_fail_msg = "❌ ***STOP LOSS ORDER FAILED***\n\n" .
                            "**Symbol:** {$symbol}\n" .
                            "**API Name:** {$api["api_name"]}\n" .
                            "**Exchange:** {$api_exchange}\n" .
                            "**Exchange Response:** {$sl_error_msg}\n\n" .
                            "Stop Loss order could not be placed after 3 attempts.\n\n" .
                            "🤖 But don't worry, Orca is tracking the signal for you.";
                        bildirim_ekle(
                            $user_id,
                            $sl_fail_msg,
                            0,
                            $bildirim_gonder,
                            $my,
                            $s_id,
                            $us_id
                        );
                        print_log($my, $s_id, $user_id, $us_id, $channel, "Failed to place SL order after 3 attempts. Notification sent to user.");
                    }
                }
            }

            // Process TP order result
            if (isset($orders[2])) {
                if (isset($orders[2]["orderId"]) && $orders[2]["orderId"] != "") {
                    $tticket = $orders[2]["orderId"];
                    $current_datetime = date("Y-m-d H:i:s");
                    $status = $orders[2]["status"] ?? 'FILLED';
                    $side = $orders[2]["side"] ?? ($tp_order["side"] ?? '');
                    $type = $orders[2]["type"] ?? 'TP';
                    $stopPrice = $orders[2]["stopPrice"] ?? $tprice;
                    print_log($my, $s_id, $user_id, $us_id, $channel, "#{$tticket} {$symbol} {$side} {$type} {$tp_volume} {$stopPrice} {$current_datetime} {$status}");
                } else {
                    $tp_error_code = $orders[2]["code"] ?? -1;
                    $tp_error_msg = stripslashes($orders[2]["msg"] ?? "Unknown TP error");
                    print_log($my, $s_id, $user_id, $us_id, $channel, "order error code : {$tp_error_code} msg : {$tp_error_msg}");
                    
                    // Retry TP order placement
                    for ($i = 0; $i < 3; $i++) {
                        sleep(1);
                        print_log($my, $s_id, $user_id, $us_id, $channel, "Retrying to place TP order, attempt " . ($i + 1));
                        $retry_tp_order = $binance->order_send($symbol, $tp_side, 'TP', $tp_volume, $tprice);
                        if (isset($retry_tp_order["orderId"]) && $retry_tp_order["orderId"] != "") {
                            $tticket = $retry_tp_order["orderId"];
                            $current_datetime = date("Y-m-d H:i:s");
                            $status = $retry_tp_order["status"] ?? 'NEW';
                            $side = $retry_tp_order["side"] ?? ($tp_order["side"] ?? '');
                            $type = $retry_tp_order["type"] ?? 'TP';
                            $stopPrice = $retry_tp_order["stopPrice"] ?? $tprice;
                            $origQty = $retry_tp_order["origQty"] ?? $tp_volume;
                            print_log($my, $s_id, $user_id, $us_id, $channel, "#{$tticket} {$symbol} {$side} {$type} {$origQty} {$stopPrice} {$current_datetime} {$status}");
                            break;
                        } else {
                            $tp_error_code = $retry_tp_order["code"] ?? -1;
                            $tp_error_msg = stripslashes($retry_tp_order["msg"] ?? "Unknown TP error");
                            print_log($my, $s_id, $user_id, $us_id, $channel, "TP order attempt " . ($i + 1) . " failed: code {$tp_error_code} - {$tp_error_msg}");
                        }
                    }

                    if ($tticket == -1) {
                        $tp_fail_msg = "❌ ***TAKE PROFIT ORDER FAILED***\n\n" .
                            "**Symbol:** {$symbol}\n" .
                            "**API Name:** {$api["api_name"]}\n" .
                            "**Exchange:** {$api_exchange}\n" .
                            "**Exchange Response:** {$tp_error_msg}\n\n" .
                            "Take Profit order could not be placed after 3 attempts.\n\n" .
                            "🤖 But don't worry, Orca is tracking the signal for you.";
                        bildirim_ekle(
                            $user_id,
                            $tp_fail_msg,
                            0,
                            $bildirim_gonder,
                            $my,
                            $s_id,
                            $us_id
                        );
                        print_log($my, $s_id, $user_id, $us_id, $channel, "Failed to place TP order after 3 attempts. Notification sent to user.");
                    }
                }
            }

            $my->query(
                "update user_signals set sticket='" .
                    $sticket .
                    "', tticket='" .
                    $tticket .
                    "' where id='" .
                    $sid .
                    "'"
            );
            print_log($my, $s_id, $user_id, $us_id, $channel, "User signal updated with SL ticket: {$sticket} and TP ticket: {$tticket}.");


            // Remaining Limit TP logic
            if ($api["take_profit"] == "signal") {
                if ($signal_max_tp > 0 && $signal_max_tp < $user_max_tp) {
                    $user_max_tp = $signal_max_tp;
                }

                $total_tp = 0;

                for ($tg = 1; $tg <= $user_max_tp; $tg++) {
                    $new_lot_yuzde = $api["tp" . $tg];

                    $total_gecti = 0;
                    if ($total_tp + $new_lot_yuzde > 100) {
                        $new_lot_yuzde = 100 - $total_tp;
                        $total_gecti = 1;
                    }

                    $new_lot = number_format(
                        $volume * ($new_lot_yuzde / 100),
                        $sym["vdigits"],
                        ".",
                        ""
                    );
                    // if(new_lot<sym.min_lot) new_lot=sym.min_lot;

                    if ($tg == $user_max_tp) {
                        $new_lot_yuzde = 100 - $total_tp;
                        $new_lot = number_format(
                            $volume * ($new_lot_yuzde / 100),
                            $sym["vdigits"],
                            ".",
                            ""
                        );
                    }

                    $total_tp = $total_tp + $new_lot_yuzde;

                    $new_price = $sg["tp" . $tg];

                    if ($new_lot > 0) {
                        if ($api_exchange == "bingx") {
                            if (
                                isset($sg["direction"]) &&
                                $sg["direction"] == "LONG"
                            ) {
                                $nt = $binance->order_send(
                                    $symbol,
                                    "SELL",
                                    "LIMIT",
                                    $new_lot,
                                    $new_price,
                                    1
                                );
                            } else {
                                $nt = $binance->order_send(
                                    $symbol,
                                    "BUY",
                                    "LIMIT",
                                    $new_lot,
                                    $new_price,
                                    1
                                );
                            }
                        } else {
                            if (
                                isset($sg["direction"]) &&
                                $sg["direction"] == "LONG"
                            ) {
                                $nt = $binance->order_send(
                                    $symbol,
                                    "SELL",
                                    "LIMIT",
                                    $new_lot,
                                    $new_price,
                                    1
                                );
                            } else {
                                $nt = $binance->order_send(
                                    $symbol,
                                    "BUY",
                                    "LIMIT",
                                    $new_lot,
                                    $new_price,
                                    1
                                );
                            }
                        }
                    }

                    $nt_orderId = $nt["orderId"] ?? 'N/A';
                    $nt_side = $sg["direction"] == "LONG" ? 'SELL' : 'BUY';
                    $nt_type = "LIMIT";
                    $nt_price = $new_price;
                    $nt_origQty = $new_lot;

                    $log_msg = "---- limit tp order {$tg} -> #{$nt_orderId} {$nt_side} {$nt_type} price:{$nt_price} lot:{$nt_origQty}";
                    print_log($my, $s_id, $user_id, $us_id, $channel, $log_msg);
                }
                print_log($my, $s_id, $user_id, $us_id, $channel, "Limit TP orders processed for signal ID: {$s_id}.");
            }				
            
            
        } else {
            // Ana emir açma başarısızsa, borsadan dönen hata mesajını bildirime ekle
            $error_code = $main_order_result["code"] ?? ($main_order_result["retCode"] ?? -1);
            $error_msg = stripslashes($main_order_result["msg"] ?? ($main_order_result["retMsg"] ?? ""));
            if (empty($error_msg)) {
                $error_msg = "Unknown error";
            }
            $signal_str =
                "⚠️ ***Order Failed*** ⚠️\n\n" .
                "**Signal:** {$us["symbol"]} " .
                ($sg["direction"] ?? "") .
                "\n" .
                "**API Name:** {$api["api_name"]}\n" .
                "**Exchange:** {$api_exchange}\n\n" .
                "**Exchange Error:** {$error_msg} (code: {$error_code})\n\n" .
                "Please check your exchange account and API settings. The position for this signal **COULD NOT BE OPENED**.";
            $new_sql =
                "update user_signals set open='" .
                $price .
                "',close='" .
                $price .
                "',opentime='" .
                date("Y-m-d H:i:s") .
                "',closetime='" .
                date("Y-m-d H:i:s") .
                "',status=3,ticket='-1',event='" .
                $error_code .
                "|" .
                $error_msg .
                "' where id = '" .
                $us["id"] .
                "'";
            $my->query($new_sql) or die($my->error);
            print_log($my, $s_id, $user_id, $us_id, $channel, "Order creation failed, error: {$error_code} - {$error_msg}");
            bildirim_ekle(
                $user_id,
                $signal_str,
                0,
                $bildirim_gonder,
                $my,
                $s_id,
                $us_id
            );
            return;
        }
       
    }
}
?>
