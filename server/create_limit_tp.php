<?php

function create_limit_tp(
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
    $is_test
) {
    $api1_check = $my->query("SELECT take_profit FROM `api_keys` JOIN `user_signals` ON api_keys.id = user_signals.api_id WHERE user_signals.id='$sid'");
    $api_check = $api1_check->fetch_assoc();

    if (!$api_check || $api_check['take_profit'] !== 'signal') {
        print_log($my, $s_id, $user_id, $us_id, $channel, "create_limit_tp skipped because take_profit setting is not 'signal'.");
        return;
    }

    print_log($my, $s_id, $user_id, $us_id, $channel, "create_limit_tp function called for signal ID: {$sid}");

    $rsi = $my->query("SELECT * FROM `user_signals` WHERE id='$sid'");
    $us = $rsi->fetch_assoc();

    if ($is_test != 2) {
        print_log($my, $s_id, $user_id, $us_id, $channel, "create_limit_tp skipped because is_test is not 2.");
        return;
    }

    $rsi1 = $my->query("SELECT * FROM `signals` WHERE id='$us[signal_id]'");
    $sg = $rsi1->fetch_assoc();

    $api1 = $my->query("SELECT * FROM `api_keys` WHERE id='$us[api_id]'");
    $api = $api1->fetch_assoc();
    $user_id = $api["user_id"];

    $sm1 = $my->query("select * from rates where symbol='$us[symbol]'");
    $sym = $sm1->fetch_assoc();

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

    $p_risk = $binance->position_risk();

    $emir_adet = 0;

    foreach ($p_risk as $a => $b) {
        if ($b != 0) {
            $emir_adet++;
        }
    }
    print_log($my, $s_id, $user_id, $us_id, $channel, "Current open orders count: {$emir_adet}");

    $price = $sym["price"];

    if (true) {
        if ($signal_max_tp > 0 && $signal_max_tp < $user_max_tp) {
            $user_max_tp = $signal_max_tp;
            print_log($my, $s_id, $user_id, $us_id, $channel, "User max TP adjusted to signal max TP: {$user_max_tp}");
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
                print_log($my, $s_id, $user_id, $us_id, $channel, "Sending LIMIT TP order for TP{$tg}: symbol {$symbol}, side " . ($sg["direction"] == "LONG" ? "SELL" : "BUY") . ", lot {$new_lot}, price {$new_price}");
                if ($api_exchange == "bingx") {
                    if (isset($sg["direction"]) && $sg["direction"] == "LONG") {
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
                    if (isset($sg["direction"]) && $sg["direction"] == "LONG") {
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
                print_log($my, $s_id, $user_id, $us_id, $channel, "LIMIT TP order response for TP{$tg}: " . print_r($nt, true));
            }

            if ($total_gecti == 1) {
                print_log($my, $s_id, $user_id, $us_id, $channel, "Total TP percentage reached 100%, breaking loop.");
                break;
            }
        }
    }
    print_log($my, $s_id, $user_id, $us_id, $channel, "create_limit_tp function finished for signal ID: {$sid}.");
}
