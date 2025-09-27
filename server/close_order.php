<?php

function close_order(
    $sid,
    $close_price,
    $close_point,
    $close_volume,
    $my,
    $binance,
    $api_exchange,
    $user_id,
    $s_id,
    $us_id,
    $bildirim_gonder,
    $channel
) {
    print_log($my, $s_id, $user_id, $us_id, $channel, "close_order function called for signal ID: {$sid}, close_point: {$close_point}, close_volume: {$close_volume}");

    $rsi = $my->query("SELECT * FROM `user_signals` WHERE id='$sid'");
    $us = $rsi->fetch_assoc();

    if ($us["close"] > 0) {
        print_log($my, $s_id, $user_id, $us_id, $channel, "Order already closed for signal ID: {$sid}, returning.");
        return;
    }

    $rsi1 = $my->query("SELECT * FROM `signals` WHERE id='$us[signal_id]'");
    $sg = $rsi1->fetch_assoc();

    $us['direction'] = $sg['direction'];

    $api1 = $my->query("SELECT * FROM `api_keys` WHERE id='$us[api_id]'");
    $api = $api1->fetch_assoc();
    $api["order_type"] = "LIMIT";
    $user_id = $api["user_id"];

    $sm1 = $my->query("select * from rates where symbol='$us[symbol]'");
    $sym = $sm1->fetch_assoc();

    $symbol = $us["symbol"];

    $price = 0;
    $volume = $api["lotsize"];
    $sprice = $sg["stop_loss"];

    $b_orders = [];
    $tamamen_kapandi = 0;
    $kapat_ticket = null;

    $p_risk = $binance->position_risk();
    $acik_poz = isset($p_risk[$symbol]) ? $p_risk[$symbol] : 0;
    print_log($my, $s_id, $user_id, $us_id, $channel, "Position risk for {$symbol}: {$acik_poz}");

    if ($acik_poz == 0) {
        $close_price = $us["sl"];

        $kapat_volume = $us["volume"] - $us["closed_volume"];
        $profit = 0;
        $profitPercent = 0;

        if ($sg["direction"] == "LONG") {
            $profit = ($us["sl"] - $us["open"]) * $us["volume"];
            if ($us["open"] > 0) {
                $profitPercent =
                    (($us["sl"] - $us["open"]) / $us["open"]) *
                    100 *
                    $api["leverage"];
            }
        } elseif ($us["direction"] == "SHORT") {
            $profit = ($us["open"] - $us["sl"]) * $us["volume"];
            if ($us["open"] > 0) {
                $profitPercent =
                    (($us["open"] - $us["sl"]) / $us["open"]) *
                    100 *
                    $api["leverage"];
            }
        }

        $my->query(
            "update user_signals set close='" .
                $close_price .
                "',closed_volume=(closed_volume+" .
                $kapat_volume .
                "),closetime='" .
                date("Y-m-d H:i:s") .
                "' where id ='" .
                $us["id"] .
                "'"
        ) or die($my->error);
        $profitSign = $profit >= 0 ? "+" : "";
        $profitText =
            $profitPercent != 0
                ? "\n**Profit/Loss:** {$profitSign}" .
                    number_format($profit, 2) .
                    " USDT ({$profitSign}" .
                    number_format($profitPercent, 2) .
                    "%)"
                : "";

        $signal_str =
            "📈 **POSITION CLOSED**\n\n" .
            "**Symbol:** {$symbol}\n" .
            "**API Name:** {$api["api_name"]}\n" .
            "**Exchange:** {$api_exchange}\n" .
            "**Close Price:** {$close_price}\n" .
            "**Close Time:** " .
            date("d-m-Y H:i:s") .
            "{$profitText}\n\n" .
            "Position was closed automatically (not found in market).";
        bildirim_ekle(
            $user_id,
            $signal_str,
            0,
            $bildirim_gonder,
            $my,
            $s_id,
            $us_id
        );
    } elseif ($us["volume"] > $us["closed_volume"]) {
        $kapat_volume = number_format(
            $us["volume"] * ($close_volume / 100),
            $sym["vdigits"],
            ".",
            ""
        );

        $min_lot = pow(10, -$sym["vdigits"]);

        if ($kapat_volume < $min_lot) {
            $kapat_volume = $min_lot;
            print_log($my, $s_id, $user_id, $us_id, $channel, "Adjusted close volume to minimum lot: {$kapat_volume}");
        }

        if ($us["closed_volume"] + $kapat_volume >= $us["volume"]) {
            $kapat_volume = number_format(
                $us["volume"] - $us["closed_volume"],
                $sym["vdigits"],
                ".",
                ""
            );
            $tamamen_kapandi = 1;
            print_log($my, $s_id, $user_id, $us_id, $channel, "Closing remaining volume, completely closed. Volume: {$kapat_volume}");
        }

        $profit = 0;
        $price = 0;

        $kapat_ticket = null; // Initialize as null
        
        // Check if the order type is MARKET. SL/TP orders should trigger a MARKET close.
        if (true) {
            if ($sg["direction"] == "LONG") {
                $price = $sym["price"];
                print_log($my, $s_id, $user_id, $us_id, $channel, "Sending MARKET SELL order to close LONG position. Volume: {$kapat_volume}, Price: {$price}");
                try {
                    $kapat_ticket = $binance->order_send(
                        $symbol,
                        "SELL",
                        "MARKET",
                        $kapat_volume,
                        $price,
                        1
                    );
                } catch (Exception $e) {
                    print_log($my, $s_id, $user_id, $us_id, $channel, "Error sending close order: " . $e->getMessage());
                    $kapat_ticket = ['code' => $e->getCode(), 'msg' => $e->getMessage()];
                }
            } elseif ($us["direction"] == "SHORT") {
                $price = $sym["price"];
                print_log($my, $s_id, $user_id, $us_id, $channel, "Sending MARKET BUY order to close SHORT position. Volume: {$kapat_volume}, Price: {$price}");
                try {
                    $kapat_ticket = $binance->order_send(
                        $symbol,
                        "BUY",
                        "MARKET",
                        $kapat_volume,
                        $price,
                        1
                    );
                } catch (Exception $e) {
                    print_log($my, $s_id, $user_id, $us_id, $channel, "Error sending close order: " . $e->getMessage());
                    $kapat_ticket = ['code' => $e->getCode(), 'msg' => $e->getMessage()];
                }
            }
        }
        print_log($my, $s_id, $user_id, $us_id, $channel, "Close order ticket: " . print_r($kapat_ticket, true));

        $order_ticket = $kapat_ticket["orderId"] ?? null;
        $order_status = $kapat_ticket["status"] ?? 'ERROR';

        if ($order_ticket) {
            $results =
                "#" .
                $order_ticket .
                " " .
                $symbol .
                " " .
                $kapat_volume .
                " " .
                $us["direction"] .
                " " .
                $price .
                " #" .
                $order_ticket .
                " " .
                $profit .
                " " .
                date("Y-m-d H:i:s") .
                " " .
                $order_status;

            $profitPercent = 0;
            if ($us["open"] > 0) {
                if ($us["direction"] == "LONG") {
                    $profitPercent =
                        (($price - $us["open"]) / $us["open"]) * 100;
                } else {
                    $profitPercent =
                        (($us["open"] - $price) / $us["open"]) * 100;
                }
            }
            $profitSign = $profit >= 0 ? "+" : "";

            if ($tamamen_kapandi == 0) {
                $signal_str =
                    "🎯 **{$symbol} {$us["direction"]} {$close_point} HIT**\n\n" .
                    "📊 **Trade Details:**\n" .
                    "📡 **API Name:** {$api["api_name"]}\n" .
                    "🏦 **Exchange:** {$api_exchange}\n" .
                    "💰 Entry Price: " .
                    number_format($us["open"], 5) .
                    "\n" .
                    "🎯 {$close_point} Price: " .
                    number_format($price, 5) .
                    "\n" .
                    "📊 Closed Amount: {$kapat_volume}\n" .
                    "💚 Profit: {$profitSign}" .
                    number_format($profit, 2) .
                    " USDT ({$profitSign}" .
                    number_format($profitPercent, 2) .
                    "%)\n" .
                    "⏰ Close Time: " .
                    date("d-m-Y H:i:s") .
                    "\n\n" .
                    "🎉 Congratulations! Your target has been reached.";

                $my->query(
                    "update user_signals set tp='" .
                        $close_price .
                        "',closed_volume=(closed_volume+" .
                        $kapat_volume .
                        ") where id ='" .
                        $us["id"] .
                        "'"
                ) or die($my->error);
                print_log($my, $s_id, $user_id, $us_id, $channel, "Partial close for signal ID: {$sid}. Closed volume: {$kapat_volume}");
                bildirim_ekle(
                    $user_id,
                    $signal_str,
                    0,
                    $bildirim_gonder,
                    $my,
                    $s_id,
                    $us_id
                );
            } else {
                if ($close_point == "SL") {
                    $signal_str =
                        "❌ **{$symbol} {$us["direction"]} STOP LOSS**\n\n" .
                        "📊 **Trade Details:**\n" .
                        "📡 **API Name:** {$api["api_name"]}\n" .
                        "🏦 **Exchange:** {$api_exchange}\n" .
                        "💰 Entry Price: " .
                        number_format($us["open"], 5) .
                        "\n" .
                        "❌ Exit Price: " .
                        number_format($price, 5) .
                        "\n" .
                        "📊 Closed Amount: {$kapat_volume}\n" .
                        "💔 Profit/Loss: {$profitSign}" .
                        number_format($profit, 2) .
                        " USDT ({$profitSign}" .
                        number_format($profitPercent, 2) .
                        "%)\n" .
                        "⏰ Close Time: " .
                        date("d-m-Y H:i:s");
                } else {
                    // TP
                    $signal_str =
                        "🎯 **{$symbol} {$us["direction"]} {$close_point} HIT**\n\n" .
                        "📊 **Trade Details:**\n" .
                        "📡 **API Name:** {$api["api_name"]}\n" .
                        "🏦 **Exchange:** {$api_exchange}\n" .
                        "💰 Entry Price: " .
                        number_format($us["open"], 5) .
                        "\n" .
                        "🎯 {$close_point} Price: " .
                        number_format($price, 5) .
                        "\n" .
                        "📊 Closed Amount: {$kapat_volume}\n" .
                        "💚 Profit: {$profitSign}" .
                        number_format($profit, 2) .
                        " USDT ({$profitSign}" .
                        number_format($profitPercent, 2) .
                        "%)\n" .
                        "⏰ Close Time: " .
                        date("d-m-Y H:i:s") .
                        "\n\n" .
                        "🎉 Congratulations! Your target has been reached.";
                }

                $my->query(
                    "update user_signals set close='" .
                        $close_price .
                        "',closed_volume=(closed_volume+" .
                        $kapat_volume .
                        "),closetime='" .
                        date("Y-m-d H:i:s") .
                        "' where id ='" .
                        $us["id"] .
                        "'"
                ) or die($my->error);
                print_log($my, $s_id, $user_id, $us_id, $channel, "Full close for signal ID: {$sid}. Close price: {$close_price}, Closed volume: {$kapat_volume}");
                bildirim_ekle(
                    $user_id,
                    $signal_str,
                    0,
                    $bildirim_gonder,
                    $my,
                    $s_id,
                    $us_id
                );
            }
        } else {
            $error_code = $kapat_ticket["code"] ?? 'N/A';
            $error_msg = isset($kapat_ticket["msg"]) ? stripslashes($kapat_ticket["msg"]) : 'Unknown error';
            $error_msg = str_replace("'", "", $error_msg);
            $error_msg = str_replace("\"", "", $error_msg);

            if ($error_code == "-100") {
                $kapat_volume = $api["lotsize"];

                if ($us["direction"] == "LONG") {
                    $profit = ($us["sl"] - $us["open"]) * $api["lotsize"];
                    $profit = number_format($profit, 5, ".", "");
                } else {
                    $profit = ($us["open"] - $us["sl"]) * $api["lotsize"];
                    $profit = number_format($profit, 5, ".", "");
                }

                $signal_str =
                    $api_exchange .
                    " CLOSED " .
                    $us["symbol"] .
                    " " .
                    $us["direction"] .
                    " open:" .
                    $us["open"] .
                    " close:" .
                    $price .
                    " lot:" .
                    $kapat_volume .
                    " profit:" .
                    $profit;
                $new_sql =
                    "update user_signals set close='" .
                    $price .
                    "',closetime='" .
                    date("Y-m-d H:i:s") .
                    "',status=1 where id = '" .
                    $us["id"] .
                    "'";

                $my->query($new_sql) or die($my->error);
                bildirim_ekle(
                    $user_id,
                    $signal_str,
                    0,
                    $bildirim_gonder,
                    $my,
                    $s_id,
                    $us_id
                );
            } else {
                if ($price == 0) {
                    $price = $us["sl"];
                }
                if ($price == 0) {
                    $price = $sg["entry1"];
                }
                print_log($my, $s_id, $user_id, $us_id, $channel, "Close order failed, updating user_signals status to 2. Error: {$error_code} - {$error_msg}");

                $new_sql =
                    "update user_signals set close='" .
                    $price .
                    "',closetime='" .
                    date("Y-m-d H:i:s") .
                    "',status=2,event='" .
                    $error_code .
                    "|" .
                    $error_msg .
                    "' where id = '" .
                    $us["id"] .
                    "'";

                $my->query($new_sql);
            }
        }
    }
}
