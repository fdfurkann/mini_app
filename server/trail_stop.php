<?php

function trail_stop(
    $sid,
    $name,
    $hedef,
    $sprice,
    $volume,
    $my,
    $binance,
    $api_exchange,
    $signal_id,
    $s_id,
    $us_id,
    $bildirim_gonder,
    $user_id
) {
    $rsi = $my->query("SELECT * FROM `user_signals` WHERE id='$sid'");
    $us = $rsi->fetch_assoc();

    if ($us["close"] > 0) {
        return;
    }

    $rsi1 = $my->query("SELECT * FROM `signals` WHERE id='$us[signal_id]'");
    $sg = $rsi1->fetch_assoc();

    $api1 = $my->query("SELECT * FROM `api_keys` WHERE id='$us[api_id]'");
    $api = $api1->fetch_assoc();
    $api["order_type"] = "LIMIT";
    $user_id = $api["user_id"];

    $sm1 = $my->query("select * from rates where symbol='$us[symbol]'");
    $sym = $sm1->fetch_assoc();

    $symbol = $us["symbol"];

    $sprice = number_format($sprice, $sym["digits"], ".", "");

    if (
        $us["direction"] == "LONG" && ($us["sl"] == 0 or $us["sl"] < $sprice) or
        $us["direction"] == "SHORT" && ($us["sl"] == 0 or $us["sl"] > $sprice)
    ) {
        if ($api_exchange == "bingx") {
            $o_pos = $binance->open_positions($symbol);

            $positions = [];

            foreach ($o_pos->data as $a_o => $a_b) {
                $b_b = (array) $a_b;

                $positions[] = $b_b;

                $price = $b_b["avgPrice"];
                $digits = explode(".", $price);
                $digits = strlen($digits[1]);

                $b_b["symbol"] = str_replace("-", "", $b_b["symbol"]);
                $sl_ticket = $binance->order_send(
                    $b_b["symbol"],
                    $b_b["positionSide"] == "LONG" ? "BUY" : "SELL",
                    "SL",
                    $b_b["positionAmt"],
                    $sprice,
                    1
                );

                if (
                    stristr(
                        $sl_ticket["msg"],
                        "The order size must be less than the available"
                    )
                ) {
                    echo "sl oluşturamadı
";

                    $o_ord = $binance->open_orders("");

                    $orders = [];

                    foreach ($o_ord->data->orders as $ea_o => $ea_b) {
                        $ea_b = (array) $ea_b;
                        if (
                            str_replace("-", "", $ea_b["symbol"]) ==
                                $b_b["symbol"] &&
                            $ea_b["type"] == "STOP_MARKET"
                        ) {
                            $sl_sil = $binance->order_delete(
                                $b_b["symbol"],
                                $ea_b["orderId"]
                            );

                            $eb_b["takeProfit"] = null;
                            $eb_b["stopLoss"] = null;

                            $sl_ticket = $binance->order_send(
                                $b_b["symbol"],
                                $b_b["positionSide"] == "LONG" ? "BUY" : "SELL",
                                "SL",
                                $b_b["positionAmt"],
                                $sprice,
                                1
                            );
                        }
                    }
                }

                print_r($sl_ticket);

                ob_flush();
                flush();
            }
        } else {
            $sl_ticket = $binance->order_send(
                $symbol,
                $us["direction"] == "LONG" ? "SELL" : "BUY",
                "SL",
                $volume,
                $sprice
            );
        }

        if ($sl_ticket["orderId"] > 0) {
            if ($us["sticket"] != "" && $api_exchange != "bybit") {
                $ord_delete = $binance->order_delete($symbol, $us["sticket"]);
                trade_log("delete ticket:" . print_r($ord_delete, 1));
                $my->query(
                    "update user_signals set sticket='' where id ='" .
                        $us["id"] .
                        "'"
                );
            }

            $sticket = $sl_ticket["orderId"];
            $signal_str =
                $api_exchange .
                " #$sticket UPDATE $name " .
                $us["symbol"] .
                " yeni_hedef:" .
                $hedef .
                " yeni_sl:" .
                $sprice;
            bildirim_ekle(
                $user_id,
                $signal_str,
                0,
                $bildirim_gonder,
                $my,
                $s_id,
                $us_id
            );
            $my->query(
                "update user_signals set sticket='" .
                    $sticket .
                    "',sl='" .
                    $sprice .
                    "' where id ='" .
                    $us["id"] .
                    "'"
            ) or die($my->error);
        } else {
            sleep(3);
        }
    }
}
