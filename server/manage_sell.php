<?php

$break_sell = 0;

if ($aa["close"] > 0 && $aa["volume"] <= $aa["closed_volume"]) {
    // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: Position for signal ID {$signal_id} already closed.");
    $break_sell = 1;
} elseif (
    ($admin_ok == 1 ||
        ($aa["open"] == 0 &&
            strtotime($signal["created_at"]) > 0 &&
            strtotime($signal["created_at"]) + $signal_cancel_seconds >
                time())) &&
    $is_test != 2 &&
    $bir_kere_ac == 0
) {
    // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: create_order called for signal ID {$signal_id}.");
    create_order(
        $signal_id,
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
    );
    // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: create_order called for signal ID {$signal_id}.");
    $bir_kere_ac = 1;
} elseif ($aa["open"] > 0 && $aa["close"] == 0) {
    // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: Position open, managing SL/TP for signal ID {$signal_id}.");
    $new_sl = 0;
    $new_tp = 0;

    if (
        $aa["sticket"] < 1 &&
        isset($api["stop_loss_settings"]) &&
        $api["stop_loss_settings"] != "none" &&
        $aa["sl_wait"] + $sl_tp_wait_seconds < time()
    ) {
        if ($aa["sl"] > 0) {
            $new_sl = $aa["sl"];
        } elseif ($api["stop_loss_settings"] == "signal") {
            $new_sl = $signal["stop_loss"];
        } elseif ($api["stop_loss_settings"] == "custom") {
            $new_sl = $sym["price"] * ((100 + $api["percent_loss"]) / 100);
        }

        if ($new_sl > 0) {
            // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: Sending SL order (BUY) for {$signal["symbol"]} at {$new_sl}.");
            $sl_ticket = $binance->order_send(
                $signal["symbol"],
                "BUY",
                "SL",
                $aa["volume"],
                $new_sl
            );
            if ($sl_ticket["orderId"] > 0) {
                $my->query(
                    "update user_signals set sl='" .
                        $new_sl .
                        "',sl_wait='" .
                        time() .
                        "',sticket='" .
                        $sl_ticket["orderId"] .
                        "' where id ='" .
                        $aa["id"] .
                        "'"
                );
                // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: SL order successful, user_signals updated. Ticket: {$sl_ticket["orderId"]}");
            } else {
                $error_code = $sl_ticket["code"];
                $error_msg = stripslashes($sl_ticket["msg"]);
                $error_msg = str_replace("'", "", $error_msg);
                $error_msg = str_replace("\"", "", $error_msg);
                // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: SL order failed. Error: {$error_code} - {$error_msg}");

                $p_risk = $binance->position_risk();
                $acik_poz = $p_risk[$signal["symbol"]];

                if ($acik_poz == 0) {
                    $close_price = $aa["sl"];

                    $kapat_volume = $aa["volume"] - $aa["closed_volume"];

                    if ($aa["direction"] == "LONG") {
                        $profit = ($aa["sl"] - $aa["open"]) * $api["lotsize"];
                        $profit = number_format($profit, 5, ".", "");
                    } elseif ($aa["direction"] == "SHORT") {
                        $profit = ($aa["open"] - $aa["sl"]) * $api["lotsize"];
                        $profit = number_format($profit, 5, ".", "");
                    }

                    $signal_str =
                        $api_exchange .
                        " N-CLOSED " .
                        $aa["symbol"] .
                        " " .
                        $aa["direction"] .
                        " open:" .
                        $aa["open"] .
                        " close:" .
                        $close_price .
                        " lot:" .
                        $kapat_volume .
                        " profit:" .
                        $profit;

                    $my->query(
                        "update user_signals set status=2, close='" .
                            $close_price .
                            "',closed_volume=(closed_volume+" .
                            $kapat_volume .
                            "),closetime='" .
                            date("Y-m-d H:i:s") .
                            "' where id ='" .
                            $aa["id"] .
                            "'"
                    ) or die($my->error);
                    bildirim_ekle(
                        $user_id,
                        $signal_str,
                        0,
                        $bildirim_gonder,
                        $my,
                        $s_id,
                        $us_id
                    );
                } elseif ($error_code == "-4130") {
                    $open_orders = $binance->open_orders($symbol);

                    foreach ($open_orders as $op1 => $op2) {
                        if (
                            $op2["symbol"] == $symbol and
                            $op2["type"] == "STOP_MARKET"
                        ) {
                            // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: Cancelling existing STOP_MARKET order {$op2["orderId"]} due to error -4130.");
                            $cancel_stop = $binance->order_delete(
                                $symbol,
                                $op2["orderId"]
                            );
                        }
                    }

                    $my->query(
                        "update user_signals set sticket='' where id ='" .
                            $aa["id"] .
                            "'"
                    );
                    // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: sticket cleared due to error -4130.");
                } else {
                    $sticket = -1;

                    if (
                        stristr($error_msg, "orders or positions are available")
                    ) {
                        $sticket = $us_id;
                        // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: SL order failed, orders or positions available. Setting sticket to {$us_id}.");
                    }

                    $my->query(
                        "update user_signals set sticket='$sticket',sl_wait='" .
                            time() .
                            "',event='" .
                            $error_code .
                            "|" .
                            $error_msg .
                            "' where id ='" .
                            $aa["id"] .
                            "'"
                    );
                    // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: SL order failed, user_signals updated with error and sticket.");
                }
            }
        }
    }

    if (
        $aa["tticket"] < 1 &&
        isset($api["take_profit"]) &&
        $api["take_profit"] != "none"
    ) {
        $tprice = 0;

        if ($api["take_profit"] == "signal") {
            for ($i = 1; $i <= 10; $i++) {
                if (isset($signal["tp" . $i]) && $signal["tp" . $i] > 0) {
                    $tprice = number_format(
                        $signal["tp" . $i],
                        $sym["digits"],
                        ".",
                        ""
                    );
                }
            }
            $new_tp = $tprice;
        } elseif ($api["take_profit"] == "custom") {
            $new_tp = $sym["price"] * ((100 - $api["percent_profit"]) / 100);
        }

        if ($new_tp > 0 && $aa["tp_wait"] + $sl_tp_wait_seconds < time()) {
            // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: Sending TP order (BUY) for {$signal["symbol"]} at {$new_tp}.");
            $tp_ticket = $binance->order_send(
                $signal["symbol"],
                "BUY",
                "TP",
                $aa["volume"],
                $new_tp
            );
            if ($tp_ticket["orderId"] > 0) {
                $my->query(
                    "update user_signals set tticket='" .
                        $tp_ticket["orderId"] .
                        "',tp_wait='" .
                        time() .
                        "' where id ='" .
                        $aa["id"] .
                        "'"
                );
                // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: TP order successful, user_signals updated. Ticket: {$tp_ticket["orderId"]}");
            } else {
                $error_code = $tp_ticket["code"];
                $error_msg = stripslashes($tp_ticket["msg"]);
                $error_msg = str_replace("'", "", $error_msg);
                $error_msg = str_replace("\"", "", $error_msg);
                // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: TP order failed. Error: {$error_code} - {$error_msg}");

                $p_risk = $binance->position_risk();
                $acik_poz = $p_risk[$signal["symbol"]];

                if ($acik_poz == 0) {
                    $close_price = $aa["sl"];

                    $kapat_volume = $aa["volume"] - $aa["closed_volume"];

                    if ($aa["direction"] == "LONG") {
                        $profit = ($aa["sl"] - $aa["open"]) * $api["lotsize"];
                        $profit = number_format($profit, 5, ".", "");
                    } elseif ($aa["direction"] == "SHORT") {
                        $profit = ($aa["open"] - $aa["sl"]) * $api["lotsize"];
                        $profit = number_format($profit, 5, ".", "");
                    }

                    $signal_str =
                        $api_exchange .
                        " N-CLOSED " .
                        $aa["symbol"] .
                        " " .
                        $aa["direction"] .
                        " open:" .
                        $aa["open"] .
                        " close:" .
                        $close_price .
                        " lot:" .
                        $kapat_volume .
                        " profit:" .
                        $profit;

                    $my->query(
                        "update user_signals set status=2, close='" .
                            $close_price .
                            "',closed_volume=(closed_volume+" .
                            $kapat_volume .
                            "),closetime='" .
                            date("Y-m-d H:i:s") .
                            "' where id ='" .
                            $aa["id"] .
                            "'"
                    ) or die($my->error);
                    bildirim_ekle(
                        $user_id,
                        $signal_str,
                        0,
                        $bildirim_gonder,
                        $my,
                        $s_id,
                        $us_id
                    );
                } elseif ($error_code == "-4130") {
                    $open_orders = $binance->open_orders($symbol);

                    foreach ($open_orders as $op1 => $op2) {
                        if (
                            $op2["symbol"] == $symbol and
                            $op2["type"] == "TAKE_PROFIT_MARKET"
                        ) {
                            // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: Cancelling existing TAKE_PROFIT_MARKET order {$op2["orderId"]} due to error -4130.");
                            $cancel_stop = $binance->order_delete(
                                $symbol,
                                $op2["orderId"]
                            );
                        }
                    }

                    $my->query(
                        "update user_signals set tticket='' where id ='" .
                            $aa["id"] .
                            "'"
                    );
                    // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: tticket cleared due to error -4130.");
                } else {
                    $tticket = -1;

                    if (
                        stristr($error_msg, "orders or positions are available")
                    ) {
                        $tticket = $us_id;
                        // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: TP order failed, orders or positions available. Setting tticket to {$us_id}.");
                    }

                    $my->query(
                        "update user_signals set tticket='$tticket',tp_wait='" .
                            time() .
                            "',event='" .
                            $error_code .
                            "|" .
                            $error_msg .
                            "' where id ='" .
                            $aa["id"] .
                            "'"
                    );
                    // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: TP order failed, user_signals updated with error and tticket.");
                }
            }
        }
    }

    if (isset($api["take_profit"]) && $api["take_profit"] == "signal") {
        // Bu blok, yalnızca take_profit ayarı 'signal' ise çalışır.
        // create_limit_tp çağrısı burada olmasa da, gelecekteki limit TP mantığı
        // veya mevcut TP mantığı bu koşulun içinde kalmalıdır.
        // Şimdilik, mevcut TP mantığı zaten bu koşula benzer şekilde çalışıyor,
        // bu yüzden bu ek koşul, niyetinizi daha net hale getirir.
    }

    // START: NEW TRAIL STOP & BREAK EVEN LOGIC
    // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: Initiating Trail Stop/Break Even logic for signal ID {$signal_id}.");
    // TP HIT bildirimi (her döngüde kontrol)
    $current_tp_level = isset($signal["tp_hit"]) ? (int)$signal["tp_hit"] : 0;
    $user_tp_hit = isset($aa["tp_hit"]) ? (int)$aa["tp_hit"] : 0;
    if ($current_tp_level > $user_tp_hit) {
        $i = $current_tp_level;
        if (isset($api["tp" . $i]) && $api["tp" . $i] > 0) {
            $tp_price = $signal["tp" . $i];
            $entry_price = $aa["open"];
            $volume = $aa["volume"];
            $profit = 0;
            $profit_percent = 0;
            if ($signal["direction"] == "LONG") {
                $profit = ($tp_price - $entry_price) * $volume;
                if ($entry_price > 0) {
                    $profit_percent = (($tp_price - $entry_price) / $entry_price) * 100;
                }
            } else {
                $profit = ($entry_price - $tp_price) * $volume;
                if ($entry_price > 0) {
                    $profit_percent = (($entry_price - $tp_price) / $entry_price) * 100;
                }
            }
            $profit_sign = $profit >= 0 ? "+" : "";
            $closed_amount = number_format($volume * ($api["tp" . $i] / 100), $sym["vdigits"], ".", "");
            $tp_message =
                "🎯 **{$signal["symbol"]} {$signal["direction"]} TP{$i} HIT**\n\n" .
                "📊 **Trade Details:**\n" .
                "📡 **API Name:** {$api["api_name"]}\n" .
                "🏦 **Exchange:** {$api_exchange}\n" .
                "💰 Entry Price: " . number_format($entry_price, 7) . "\n" .
                "🎯 TP{$i} Price: " . number_format($tp_price, 7) . "\n" .
                "📊 Closed Amount: {$closed_amount}\n" .
                "💚 Profit: {$profit_sign}" . number_format($profit, 2) .
                " USDT ({$profit_sign}" . number_format($profit_percent, 2) . "%)\n" .
                "⏰ Close Time: " . date("d-m-Y H:i:s") . "\n\n" .
                "🎉 Congratulations! Your target has been reached.";
            bildirim_ekle(
                $user_id,
                $tp_message,
                0,
                $bildirim_gonder,
                $my,
                $s_id,
                $us_id
            );
            $my->query("UPDATE user_signals SET tp_hit = '{$current_tp_level}' WHERE id = '{$aa["id"]}'");
            $aa["tp_hit"] = $current_tp_level;
            // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: TP{$i} HIT bildirimi gönderildi ve tp_hit güncellendi.");
        }
        
        // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: TP hit level increased from {$user_tp_hit} to {$current_tp_level}.");
        $new_sl_details = null;

        // Trail Stop Logic
        if (isset($api["trail_stop"]) && $api["trail_stop"] > 0) {
            $trail_idx = (int) $api["trail_stop"];
            // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: Trail Stop enabled with index {$trail_idx}.");
            $new_sl_candidate = null;
            $tp_level_for_notification = null;

            if ($current_tp_level - $trail_idx === 0) {
                $new_sl_candidate = $aa["open"];
                $tp_level_for_notification = 0;
            } elseif ($current_tp_level - $trail_idx > 0) {
                $tp_level_for_notification = $current_tp_level - $trail_idx;
                if (isset($signal["tp" . $tp_level_for_notification])) {
                    $new_sl_candidate =
                        $signal["tp" . $tp_level_for_notification];
                }
            }

            if ($new_sl_candidate) {
                $new_sl_details = [
                    "new_sl" => (float) $new_sl_candidate,
                    "reason" => "TRAIL STOP",
                    "hedef" =>
                        (float) ($signal["tp" . $current_tp_level] ?? 0),
                    "tp_level" => (int) $tp_level_for_notification,
                ];
            }
        }

        // Break Even Logic (can overwrite Trail Stop if its condition is met)
        if (
            isset($api["break_even_level"]) &&
            $api["break_even_level"] > 0
        ) {
            $break_even_idx = (int) $api["break_even_level"];
            // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: Break Even enabled with level {$break_even_idx}.");
            if ($current_tp_level >= $break_even_idx) {
                $new_sl_details = [
                    "new_sl" => (float) $aa["open"],
                    "reason" => "BREAK EVEN",
                    "hedef" =>
                        (float) ($signal["tp" . $break_even_idx] ?? 0),
                    "tp_level" => (int) $break_even_idx,
                ];
                // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: Break Even condition met. New SL candidate: {$aa["open"]}.");
            }
        }

        if ($new_sl_details) {
            $should_update_sl = false;
            $current_sl = (float) $aa["sl"];
            $new_sl = $new_sl_details["new_sl"];

            if ($new_sl > 0) {
                if ($signal["direction"] == "LONG") {
                    if ($current_sl == 0 || $new_sl > $current_sl) {
                        $should_update_sl = true;
                        // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: SL should be updated (LONG): current {$current_sl}, new {$new_sl}.");
                    }
                } elseif ($signal["direction"] == "SHORT") {
                    if ($current_sl == 0 || $new_sl < $current_sl) {
                        $should_update_sl = true;
                        // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: SL should be updated (SHORT): current {$current_sl}, new {$new_sl}.");
                    }
                }
            }

            if ($should_update_sl) {
                if (!empty($aa["sticket"]) && $aa["sticket"] > 0) {
                    try {
                        // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: Deleting existing SL order: {$aa["sticket"]}.");
                        $binance->order_delete($symbol, $aa["sticket"]);
                    } catch (Exception $e) {
                        // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: Error deleting existing SL order: {$e->getMessage()}");
                    }
                }

                $new_sl_price = number_format(
                    $new_sl,
                    $sym["digits"],
                    ".",
                    ""
                );
                $sl_side = $signal["direction"] == "LONG" ? "SELL" : "BUY";
                $order_id_for_db = null;
                $success = false;

                $is_safe_to_place_sl = false;
                if ($signal["direction"] == "LONG" && $new_sl_price < $sym["price"]) {
                    $is_safe_to_place_sl = true;
                } elseif ($signal["direction"] == "SHORT" && $new_sl_price > $sym["price"]) {
                    $is_safe_to_place_sl = true;
                } else {
                    // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: New SL price {$new_sl_price} is not valid against current price {$sym["price"]}. Skipping SL order.");
                }

                if ($is_safe_to_place_sl) {
                    for ($attempt = 1; $attempt <= 3; $attempt++) {
                        // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: Attempt {$attempt} to place new SL order at {$new_sl_price}.");
                        try {
                            $new_stop_order = $binance->order_send(
                                $symbol,
                                $sl_side,
                                "SL",
                                $aa["volume"],
                                $new_sl_price
                            );
                            if (!empty($new_stop_order["orderId"])) {
                                $order_id_for_db = $new_stop_order["orderId"];
                                $success = true;
                                // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: New SL order placed successfully, orderId: {$order_id_for_db}.");
                                $break_sell = 1;
                                break;
                            }
                        } catch (Exception $e) {
                            $new_stop_order = ["msg" => $e->getMessage()];
                            // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: Error placing new SL order: {$e->getMessage()}");
                        }
                        if (!$success && $attempt < 3) {
                            usleep(500000);
                        }
                    }
                }

                $notification_str = "";
                if ($success) {
                    // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: New SL order successful. Reason: {$new_sl_details["reason"]}.");
                    if ($new_sl_details["reason"] == "TRAIL STOP") {
                        $tpLabel =
                            $new_sl_details["tp_level"] == 0
                                ? "Entry Price"
                                : "TrailStop TP" .
                                    $new_sl_details["tp_level"]
                                    . " Level";
                        $tpValue =
                            $new_sl_details["tp_level"] == 0
                                ? $aa["open"]
                                : $signal[
                                    "tp" . $new_sl_details["tp_level"]
                                ];
                        $notification_str =
                            "🔄 **{$symbol} {$signal["direction"]} TRAIL STOP**\n\n" .
                            "📊 **Trade Details:**\n" .
                            "📡 **API Name:** {$api["api_name"]}\n" .
                            "🏦 **Exchange:** {$api_exchange}\n" .
                            "💰 Entry Price: {$aa["open"]}\n" .
                            "🔔 {$tpLabel}: {$tpValue}\n" .
                            "🛡️ New Stop Loss: {$new_sl_price}\n" .
                            "⏰ Time: " .
                            date("d-m-Y H:i:s") .
                            "\n\n" .
                            "🚦 Stop Loss updated automatically.";
                    } else {
                        // BREAK EVEN
                        $notification_str =
                            "⚖️ **{$symbol} {$signal["direction"]} BREAK EVEN**\n\n" .
                            "📊 **Trade Details:**\n" .
                            "📡 **API Name:** {$api["api_name"]}\n" .
                            "🏦 **Exchange:** {$api_exchange}\n" .
                            "💰 Entry Price: {$aa["open"]}\n" .
                            "🔔 BreakEven TP{$new_sl_details["tp_level"]} Level: {$new_sl_details["hedef"]}\n" .
                            "🛡️ New Stop Loss: {$new_sl_price}\n" .
                            "⏰ Time: " .
                            date("d-m-Y H:i:s") .
                            "\n\n" .
                            "🚦 Stop Loss moved to break even automatically.";
                    }
                } else {
                    $error_msg = $new_stop_order["msg"] ?? "Unknown error";
                    // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: New SL order failed after 3 attempts. Error: {$error_msg}");
                    $notification_str =
                        "❌ **STOP LOSS ORDER FAILED ({$new_sl_details["reason"]})**\n\n" .
                        "**Symbol:** {$symbol}\n" .
                        "**API Name:** {$api["api_name"]}\n" .
                        "**Exchange:** {$api_exchange}\n" .
                        "**Exchange Response:** {$error_msg}\n\n" .
                        "Stop Loss order could not be placed after 3 attempts.\n\n" .
                        "🤖 But don't worry, Orca is tracking the signal for you.";
                }
                bildirim_ekle(
                    $user_id,
                    $notification_str,
                    0,
                    $bildirim_gonder,
                    $my,
                    $s_id,
                    $us_id
                );
                $my->query(
                    "UPDATE user_signals SET sl='{$new_sl_price}', sticket='{$order_id_for_db}' WHERE id='{$aa["id"]}'"
                );
                // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: user_signals updated with new SL price: {$new_sl_price} and sticket: {$order_id_for_db}.");
                $aa["sl"] = $new_sl_price;
                $aa["sticket"] = $order_id_for_db;
            }
        }
        $my->query(
            "UPDATE user_signals SET tp_hit = '{$current_tp_level}' WHERE id = '{$aa["id"]}'"
        );
        // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: user_signals updated with new tp_hit: {$current_tp_level}.");
        $aa["tp_hit"] = $current_tp_level;
    }
    // END: NEW TRAIL STOP & BREAK EVEN LOGIC

    for ($i = 0; $i <= 10; $i++) {
        if ($aa["closetime"] != "") {
            $break_sell = 1;
        }

        // Güvenli erişim: signal'da tp key'i olmayabilir, isset ile kontrol edelim
        $tpKey = "tp" . $i;
        if (
            isset($signal[$tpKey]) &&
            $signal[$tpKey] > 0 &&
            $sym["price"] <= $signal[$tpKey] &&
            ($aa["tp"] == 0 || $aa["tp"] > $signal[$tpKey])
        ) {
            // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: TP{$i} hit for signal ID {$signal_id} at price {$sym["price"]}. Closing order.");
          
        }
    }

    if (
        $aa["sl"] > 0 &&
        $sym["price"] >= $aa["sl"] &&
        $aa["close"] == 0 &&
        $aa["closetime"] == ""
    ) {
        // print_log($my, $s_id, $user_id, $us_id, $channel, "manage_sell: SL triggered for signal ID {$signal_id} at price {$sym["price"]}. Closing order.");
        close_order(
            $signal_id,
            $aa["sl"],
            "SL",
            100,
            $my,
            $binance,
            $api_exchange,
            $user_id,
            $s_id,
            $us_id,
            $bildirim_gonder,
            $channel
        );
        $break_sell = 1;
      
    }
}
