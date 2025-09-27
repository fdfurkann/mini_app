import crypto from 'crypto';
import https from 'https';

class rbybit {
    constructor(key = "", secret = "") {
        this.auth = {};
        this.auth['key'] = key;
        this.auth['secret'] = secret;
        this.debug = true;
        this.digits = 0;
        this.vdigits = 0;
        this.base = "";
    }

    request(url, params = {}, method = "GET") {
        return new Promise((resolve, reject) => {
            const query = new URLSearchParams(params).toString();
            const endpoint = this.base + url + (query ? '?' + query : '');
            const options = {
                method: method,
                headers: {
                    'User-Agent': 'Mozilla/4.0 (compatible; PHP ByBIT API)'
                }
            };
            https.get(endpoint, options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(null);
                    }
                });
            }).on('error', (e) => {
                reject(e);
            });
        });
    }

    signedRequest(url, params = {}, method = "GET") {
        return new Promise((resolve, reject) => {
            const timestamp = Date.now().toString();
            const recvWindow = "5000";
            let query = '';
            let body = '';
            let contentType = 'application/x-www-form-urlencoded';
            if (method === "GET") {
                query = new URLSearchParams(params).toString();
            } else {
                query = new URLSearchParams(params).toString();
            }
            // İmza oluşturulacak string: timestamp+api_key+recvWindow+query
            const stringToSign = timestamp + this.auth['key'] + recvWindow + query;
            const signature = crypto.createHmac('sha256', this.auth['secret'])
                .update(stringToSign)
                .digest('hex');
            let options = {
                method: method,
                headers: {
                    'X-BAPI-SIGN': signature,
                    'X-BAPI-API-KEY': this.auth['key'],
                    'X-BAPI-TIMESTAMP': timestamp,
                    'X-BAPI-RECV-WINDOW': recvWindow,
                    'Content-type': contentType
                }
            };
            let endpoint;
            if (method === "GET") {
                endpoint = `${this.base}${url}?${query}`;
            } else {
                endpoint = `${this.base}${url}`;
                body = query;
            }
            const req = https.request(endpoint, options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(null);
                    }
                });
            });
            if (method !== 'GET') {
                req.write(body);
            }
            req.on('error', (e) => {
                reject(e);
            });
            req.end();
        });
    }

    async call(method, private_ = 0, params = {}, http_method = 'GET') {
        let sonuc = "";
        let url = 'https://api.bybit.com' + method;
        if (private_ == 1) {
            sonuc = await this.signedRequest(url, params, http_method);
        } else {
            sonuc = await this.request(url, params, http_method);
        }
        console.log(`url: ${url}`);
        console.log(`params: ${new URLSearchParams(params).toString()}`);
        return sonuc;
    }

    signed(method) {
        return !(
            (method.includes('ticker/price')) ||
            (method.includes('/exchangeInfo')) ||
            (method.includes('/depth'))
        );
    }

    obj2arr(arr) {
        return arr;
    }

    call_http(url, options = {}) {
        // Not implemented: curl benzeri fonksiyon Node.js'de genellikle fetch veya axios ile yapılır.
        // Burada kullanılmıyor, gerekirse eklenir.
        return null;
    }

    async get_exchange_2() {
        let form = await this.call('/derivatives/v3/public/instruments-info', 1, {}, "GET");
        form = this.obj2arr(form);
        return form['result']['list'];
    }

    async get_exchange() {
        let form = await this.call('/v5/market/instruments-info', 1, { category: "linear", limit: 1000 }, "GET");
        form = this.obj2arr(form);
        return form['result']['list'];
    }

    async get_leverage_2() {
        let form = await this.call('/derivatives/v3/public/instruments-info', 1, {}, "GET");
        form = this.obj2arr(form);
        return form['result']['list'];
    }

    async get_leverage() {
        let form = await this.call('/v5/market/instruments-info', 1, { category: "linear" }, "GET");
        form = this.obj2arr(form);
        return form['result']['list'];
    }

    async api_set_leverage_2(symbol, leverage) {
        let form = await this.call('/contract/v3/private/position/set-leverage', 1, { symbol: symbol, buyLeverage: leverage, sellLeverage: leverage }, "POST");
        form = this.obj2arr(form);
        let form1 = {};
        form1['code'] = form['retCode'];
        form1['msg'] = form['retMsg'];
        return form1;
    }

    async api_set_leverage(symbol, leverage) {
        let form = await this.call('/v5/position/set-leverage', 1, { category: "linear", symbol: symbol, buyLeverage: "" + leverage, sellLeverage: "" + leverage }, "POST");
        form = this.obj2arr(form);
        let form1 = {};
        form1['code'] = form['retCode'];
        form1['msg'] = form['retMsg'];
        return form1;
    }

    async api_upgrade_unified() {
        let form = await this.call('/v5/account/upgrade-to-uta', 1, {}, "POST");
        form = this.obj2arr(form);
        let form1 = {};
        form1['code'] = form['retCode'];
        form1['msg'] = form['retMsg'];
        return form1;
    }

    async api_switch_mode(symbol, trading_mode) {
        let marginType = trading_mode;
        if (marginType == "ISOLATED") marginType = 1;
        if (marginType == "CROSSED") marginType = 0;
        let form = await this.call('/v5/position/switch-mode', 1, { category: "linear", symbol: symbol, coin: null, mode: trading_mode }, "POST");
        form = this.obj2arr(form);
        let form1 = {};
        form1['code'] = form['retCode'];
        form1['msg'] = form['retMsg'];
        return form1;
    }

    async api_set_margin_mode(marginType) {
        let form = await this.call('/v5/account/set-margin-mode', 1, { setMarginMode: marginType }, "POST");
        form = this.obj2arr(form);
        let form1 = {};
        form1['code'] = form['retCode'];
        form1['msg'] = form['retMsg'];
        return form1;
    }

    async api_set_margin_type(symbol, marginType, leverage = "20") {
        if (marginType == "ISOLATED") marginType = 1;
        if (marginType == "CROSSED") marginType = 0;
        let form = await this.call('/v5/position/switch-isolated', 1, { category: "linear", symbol: symbol, buyLeverage: "" + leverage, sellLeverage: "" + leverage, tradeMode: marginType }, "POST");
        form = this.obj2arr(form);
        let form1 = {};
        form1['code'] = form['retCode'];
        form1['msg'] = form['retMsg'];
        return form1;
    }

    async api_permissions() {
        let form = await this.call('/sapi/v1/account/apiRestrictions', 1, {}, "GET");
        form = this.obj2arr(form);
        return form;
    }

    async position_risk() {
        let form = await this.open_positions();
        let pozlar = {};
        for (let b of form) {
            if (b['symbol'] && b['symbol'].length > 0) {
                pozlar[b['symbol']] = (b['side'] == "Buy" ? b['size'] : b['size'] * -1);
            }
        }
        return pozlar;
    }

    async api_set_position_mode(dualSidePosition) {
        let form = await this.call('/fapi/v1/positionSide/dual', 1, { dualSidePosition: dualSidePosition }, "POST");
        form = this.obj2arr(form);
        return form;
    }

    async api_set_multi_asset_mode(multiAssetsMargin) {
        let form = await this.call('/fapi/v1/multiAssetsMargin', 1, { multiAssetsMargin: multiAssetsMargin }, "POST");
        form = this.obj2arr(form);
        return form;
    }

    async open_orders(symbol = "") {
        let form = await this.call('/v5/order/realtime', 1, { category: "linear", settleCoin: "USDT" }, "GET");
        form = this.obj2arr(form);
        if (!form || !form.result || !Array.isArray(form.result.list)) return [];
        return form.result.list;
    }

    async fapi_historicalTrades() {
        let form = await this.call('/v5/position/closed-pnl', 1, { category: "linear", settleCoin: "USDT" }, "GET");
        form = this.obj2arr(form);
        return form['result']['list'];
    }

    async open_positions(symbol = "") {
        let form = await this.call('/v5/position/list', 1, { category: "linear", settleCoin: "USDT" }, "GET");
        form = this.obj2arr(form);
        if (!form || !form.result || !Array.isArray(form.result.list)) return [];
        return form.result.list;
    }

    async get_account_info(symbol = "") {
        let form = await this.call('/v5/account/info', 1, {}, "GET");
        form = this.obj2arr(form);
        return form;
    }

    async order_delete(symbol, orderid) {
        let o_keys = { category: "linear", symbol: symbol, orderId: orderid };
        let order = await this.call('/v5/order/cancel', 1, o_keys, "POST");
        if (order && order.code < 0) {
            console.log(`order_delete(error): ${order.code} ${order.msg}`);
            return order;
        }
        order = this.obj2arr(order);
        return order;
    }

    async order_send(symbol, side, type, amount, price, cls = 0) {
        if (typeof trade_log !== 'function') {
            global.trade_log = function(msg) { console.log(msg); };
        }
        trade_log(`order_send(symbol:${symbol},side:${side},type:${type},amount:${amount},price:${price},cls:${cls})`);
        let o_keys = { category: "linear", symbol: symbol, side: side, orderType: type };
        let debug = this.debug;
        let digits = this.digits;
        let points = Math.pow(10, digits * -1);
        points = 0;
        let rtype = type;
        let emri_kapat = 1;
        // Sadece cls==1 ise pozisyon risk kontrolü ve reduceOnly uygula
        if (cls == 1) {
            // SELL LIMIT için sadece pozisyonu kapat
            if (side === "SELL" && type === "LIMIT") {
                let p_risk = await this.position_risk(symbol);
                let kac_lot = p_risk[symbol];
                if (kac_lot > 0) {
                    if (amount > Math.abs(kac_lot)) {
                        amount = Math.abs(kac_lot);
                    }
                } else {
                    emri_kapat = 0;
                }
                o_keys["reduceOnly"] = "true";
            } else {
                // Diğer tüm emri kapat işlemleri (MARKET, STOP, SL, TP)
                let p_risk = await this.position_risk(symbol);
                let kac_lot = p_risk[symbol];
                if (side == "SELL" && kac_lot > 0) {
                    if (amount > Math.abs(kac_lot)) {
                        amount = Math.abs(kac_lot);
                    }
                } else if (side == "BUY" && kac_lot < 0) {
                    if (amount > Math.abs(kac_lot)) {
                        amount = Math.abs(kac_lot);
                    }
                } else {
                    emri_kapat = 0;
                }
                o_keys["reduceOnly"] = "true";
            }
        }
        trade_log(`emri_kapat : ${emri_kapat}`);
        if (type == "MARKET") {
            o_keys["category"] = "linear";
            o_keys["qty"] = amount + "";
            if (o_keys["side"] == "BUY") { o_keys["side"] = "Buy"; }
            if (o_keys["side"] == "SELL") { o_keys["side"] = "Sell"; }
            o_keys["orderType"] = "Market";
        } else if (type == "LIMIT") {
            o_keys["category"] = "linear";
            o_keys["qty"] = amount + "";
            o_keys["price"] = price + "";
            if (o_keys["side"] == "BUY") { o_keys["side"] = "Buy"; }
            if (o_keys["side"] == "SELL") { o_keys["side"] = "Sell"; }
            o_keys["orderType"] = "Limit";
            o_keys["timeInForce"] = "GTC";
        } else if (type == "STOP") {
            let price1 = (side == "BUY") ? price - points : price + points;
            o_keys["category"] = "linear";
            o_keys["timeInForce"] = "GTC";
            o_keys["type"] = "STOP_MARKET";
            o_keys["qty"] = amount + "";
            o_keys["stopPrice"] = price1 + "";
        } else if (type == "SL") {
            o_keys = {};
            o_keys["category"] = "linear";
            o_keys["symbol"] = symbol;
            o_keys["stopLoss"] = price + "";
            o_keys["tpslMode"] = "Full";
            o_keys["positionIdx"] = "0";
        } else if (type == "TP") {
            o_keys = {};
            o_keys["category"] = "linear";
            o_keys["symbol"] = symbol;
            o_keys["takeProfit"] = price + "";
            o_keys["tpslMode"] = "Full";
            o_keys["positionIdx"] = "0";
        }
        let sure_baslangici = Date.now();
        trade_log("o_keys:" + JSON.stringify(o_keys));
        console.log(o_keys);
        let order;
        if (emri_kapat == 1) {
            if (type == "TP" || type == "SL") {
                trade_log("call url:/v5/position/trading-stop");
                order = await this.call('/v5/position/trading-stop', 1, o_keys, "POST");
            } else {
                trade_log("call url:/v5/order/create");
                order = await this.call('/v5/order/create', 1, o_keys, "POST");
            }
            trade_log(" order result:" + JSON.stringify(order));
            let sure_bitimi = Date.now();
            let sure = (sure_bitimi - sure_baslangici) / 1000.0;
            if (this.debug) trade_log(JSON.stringify(order));
            order = this.obj2arr(order);
            let n_order = {};
            if ((type == "TP" || type == "SL") && order['retMsg'] == "OK") {
                let ords = await this.open_orders(symbol);
                if (Array.isArray(ords)) {
                    for (let b1 of ords) {
                        if (b1['stopOrderType'] == "TakeProfit" && type == "TP") {
                            n_order['orderId'] = b1['orderId'];
                            break;
                        } else if (b1['stopOrderType'] == "StopLoss" && type == "SL") {
                            n_order['orderId'] = b1['orderId'];
                            break;
                        }
                    }
                }
                n_order['status'] = "FILLED";
            } else if (order?.result?.orderId) {
                n_order['orderId'] = order.result.orderId;
                n_order['status'] = "FILLED";
            }
            n_order['code'] = (order['retCode'] > 0 ? order['retCode'] : "");
            n_order['msg'] = order['retMsg'];
            order = n_order;
        } else {
            order = {};
            order['code'] = -100;
            order['msg'] = "order already closed";
        }
        return order;
    }

    prepare_order(symbol, side, type, amount, price, cls = 0) {
        let digits = this.digits;
        let vdigits = this.vdigits;
        let o_keys = { category: "linear", symbol: symbol, side: side, orderType: type };
        let points = Math.pow(10, digits * -1);
        points = 0;
        let rtype = type;
        if (type == "MARKET") {
            delete o_keys['type'];
            o_keys["category"] = "linear";
            o_keys["type"] = "MARKET";
            o_keys["qty"] = amount + "";
            if (o_keys["side"] == "BUY") { o_keys["side"] = "Buy"; }
            if (o_keys["side"] == "SELL") { o_keys["side"] = "Sell"; }
            o_keys["orderType"] = "Market";
        } else if (type == "LIMIT") {
            delete o_keys['type'];
            o_keys["category"] = "linear";
            o_keys["type"] = "LIMIT";
            o_keys["qty"] = amount + "";
            o_keys["price"] = price + "";
            if (o_keys["side"] == "BUY") { o_keys["side"] = "Buy"; }
            if (o_keys["side"] == "SELL") { o_keys["side"] = "Sell"; }
            o_keys["orderType"] = "Limit";
            o_keys["timeInForce"] = "GTC";
        } else if (type == "STOP") {
            let price1 = (side == "BUY") ? price - points : price + points;
            o_keys["category"] = "linear";
            o_keys["timeInForce"] = "GTC";
            o_keys["type"] = "STOP_MARKET";
            o_keys["qty"] = amount + "";
            o_keys["stopPrice"] = price1 + "";
        } else if (type == "SL") {
            o_keys = {};
            o_keys["category"] = "linear";
            o_keys["type"] = "SL";
            o_keys["symbol"] = symbol;
            o_keys["stopLoss"] = price + "";
            o_keys["tpslMode"] = "Full";
            o_keys["qty"] = amount + "";
            o_keys["timeInForce"] = "GTC";
        } else if (type == "TP") {
            o_keys = {};
            o_keys["category"] = "linear";
            o_keys["type"] = "TP";
            o_keys["symbol"] = symbol;
            o_keys["takeProfit"] = price + "";
            o_keys["tpslMode"] = "Full";
            o_keys["qty"] = amount + "";
            o_keys["timeInForce"] = "GTC";
        }
        if (cls == 1) {
            o_keys["reduceOnly"] = "true";
        }
        o_keys["qty"] = o_keys["qty"] + "";
        return o_keys;
    }

    async bulk_order_send(orders) {
        if (typeof trade_log !== 'function') {
            global.trade_log = function(msg) { console.log(msg); };
        }
        let sure_baslangici = Date.now();
        let n_orders = [];
        for (let o_id in orders) {
            let order = orders[o_id];
            let type = order['type'];
            delete order['type'];
            let symbol = order['symbol'];
            let result;
            if (type == "TP" || type == "SL") {
                result = await this.call('/v5/position/trading-stop', 1, order, "POST");
            } else {
                result = await this.call('/v5/order/create', 1, order, "POST");
            }
            let sure_bitimi = Date.now();
            let sure = (sure_bitimi - sure_baslangici) / 1000.0;
            if (this.debug) trade_log(JSON.stringify(result));
            result = this.obj2arr(result);
            let n_order = {};
            if ((type == "TP" || type == "SL") && result['retMsg'] == "OK") {
                let ords = await this.open_orders(symbol);
                for (let b1 of ords) {
                    if (b1['stopOrderType'] == "TakeProfit" && type == "TP") {
                        n_order['orderId'] = b1['orderId'];
                        break;
                    } else if (b1['stopOrderType'] == "StopLoss" && type == "SL") {
                        n_order['orderId'] = b1['orderId'];
                        break;
                    }
                }
                n_order['status'] = "FILLED";
            } else if (result?.result?.orderId) {
                n_order['orderId'] = result.result.orderId;
                n_order['status'] = "FILLED";
            }
            n_order['code'] = (result['retCode'] > 0 ? result['retCode'] : "");
            n_order['msg'] = result['retMsg'];
            n_orders.push(n_order);
        }
        return n_orders;
    }
}

export default rbybit; 