import crypto from 'crypto';
import https from 'https';

class rbingx {
    constructor(key = "", secret = "") {
        this.auth = {};
        this.auth['key'] = key;
        this.auth['secret'] = secret;
        this.debug = true;
        this.digits = 0;
        this.vdigits = 0;
        this.base = "";
    }

    get_sign(api_secret, payload) {
        return crypto.createHmac('sha256', api_secret).update(payload).digest('hex');
    }

    send_request(method, path, urlpa, payload, api_secret) {
        const APIURL = 'https://open-api.bingx.com';
        const APIKEY = this.auth['key'];
        const url = `${APIURL}${path}?${urlpa}&signature=${this.get_sign(api_secret, urlpa)}`;
        const options = {
            method: method,
            headers: {
                'X-BX-APIKEY': APIKEY
            }
        };
        return new Promise((resolve, reject) => {
            const req = https.request(url, options, (res) => {
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
            req.on('error', (e) => { reject(e); });
            req.end();
        });
    }

    praseParam(paramsMap) {
        const keys = Object.keys(paramsMap).sort();
        let paramsStr = keys.map(k => `${k}=${paramsMap[k]}`).join('&');
        return paramsStr + `&timestamp=${Date.now()}`;
    }

    async call(method, private_ = 0, params = {}, http_method = 'GET') {
        let payload = {};
        let path = method;
        let methodType = http_method;
        let paramsMap = params;
        let paramsStr = this.praseParam(paramsMap);
        let sonuc = await this.send_request(methodType, path, paramsStr, payload, this.auth['secret']);
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
        // Not implemented for Node.js
        return null;
    }

    async get_exchange_2() {
        let form = await this.call('/derivatives/v3/public/instruments-info', 1, {}, "GET");
        form = this.obj2arr(form);
        return form['result']['list'];
    }

    async get_exchange() {
        let form = await this.call('/openApi/swap/v2/quote/contracts', 1, {}, "GET");
        form = this.obj2arr(form);
        return form;
    }

    async get_leverage(symbol = "") {
        symbol = symbol.replace("USDT", "-USDT");
        let form = await this.call('/openApi/swap/v2/trade/leverage', 1, { symbol: symbol, timestamp: Date.now() }, "GET");
        form = this.obj2arr(form);
        return form;
    }

    async api_set_leverage(symbol, leverage) {
        symbol = symbol.replace("USDT", "-USDT");
        let form = await this.call('/openApi/swap/v2/trade/leverage', 1, { timestamp: Date.now(), side: "BOTH", symbol: symbol, leverage: leverage }, "POST");
        form = this.obj2arr(form);
        let form1 = {};
        form1['code'] = form.code;
        form1['msg'] = form.msg;
        return form;
    }

    async api_set_margin_type(symbol, marginType) {
        symbol = symbol.replace("USDT", "-USDT");
        let form = await this.call('/openApi/swap/v2/trade/marginType', 1, { timestamp: Date.now(), marginType: marginType, symbol: symbol, recvWindow: "60000" }, "POST");
        form = this.obj2arr(form);
        let form1 = {};
        form1['code'] = form.code;
        form1['msg'] = form.msg;
        return form;
    }

    async api_permissions() {
        let form = await this.call('/sapi/v1/account/apiRestrictions', 1, {}, "GET");
        form = this.obj2arr(form);
        return form;
    }

    async position_risk() {
        let form = await this.open_positions();
        let pozlar = {};
        if (form && form.data) {
            for (let b of form.data) {
                let nbs = (b.symbol || '').replace(/-/g, '');
                if (nbs.length > 0) {
                    pozlar[nbs] = (b.positionSide === "LONG" ? b.availableAmt : b.availableAmt * -1);
                }
            }
        }
        return pozlar;
    }

    async open_orders(symbol = "") {
        symbol = symbol.replace("USDT", "-USDT");
        let form = await this.call('/openApi/swap/v2/trade/openOrders', 1, { symbol: symbol, timestamp: Date.now() }, "GET");
        form = this.obj2arr(form);
        return form;
    }

    async fapi_historicalTrades(symbol = "") {
        symbol = symbol.replace("USDT", "-USDT");
        let now = Date.now();
        let form = await this.call('/openApi/swap/v2/trade/allOrders', 1, { startTime: now - 86400 * 7 * 1000, endTime: now, timestamp: now }, "GET");
        form = this.obj2arr(form);
        return form.data.orders;
    }

    async open_positions(symbol = "") {
        symbol = symbol.replace("USDT", "-USDT");
        let form = await this.call('/openApi/swap/v2/user/positions', 1, { symbol: symbol, recvWindow: "0", timestamp: Date.now() }, "GET");
        form = this.obj2arr(form);
        return form;
    }

    async get_account_info(symbol = "") {
        let form = await this.call('/openApi/swap/v2/user/balance', 1, {}, "GET");
        form = this.obj2arr(form);
        return form;
    }

    async order_delete(symbol, orderid) {
        symbol = symbol.replace("USDT", "-USDT");
        let o_keys = { symbol: symbol, orderId: orderid };
        let order = await this.call('/openApi/swap/v2/trade/order', 1, o_keys, "DELETE");
        if (order && order.code < 0) {
            console.log(`order_delete(error): ${order.code} ${order.msg}`);
            return order;
        }
        order = this.obj2arr(order);
        return order;
    }

    async order_send(symbol, side, type, amount, price, cls = 0) {
        symbol = symbol.replace("USDT", "-USDT");
        console.log(`order_send(symbol:${symbol},side:${side},type:${type},amount:${amount},price:${price},cls:${cls})`);
        let o_keys = { symbol: symbol, side: side, type: type };
        let debug = this.debug;
        let digits = this.digits;
        let points = Math.pow(10, digits * -1);
        points = 0;
        let rtype = type;
        let emri_kapat = 1;
        if (cls == 0) {
            if (side == "BUY") {
                o_keys['positionSide'] = "LONG";
            } else {
                o_keys['positionSide'] = "SHORT";
            }
        } else {
            if (side == "BUY") {
                o_keys['positionSide'] = "SHORT";
            } else {
                o_keys['positionSide'] = "LONG";
            }
        }
        o_keys['positionSide'] = "BOTH";
        console.log(`emri_kapat : ${emri_kapat}`);
        if (type == "MARKET") {
            o_keys['quantity'] = amount + "";
            o_keys['type'] = "MARKET";
        } else if (type == "LIMIT") {
            o_keys['quantity'] = amount + "";
            o_keys['price'] = price + "";
            o_keys['timeInForce'] = "GTC";
        } else if (type == "STOP") {
            let price1 = (side == "BUY") ? price - points : price + points;
            o_keys['quantity'] = amount + "";
            o_keys['price'] = price + "";
            o_keys['timeInForce'] = "GTC";
            o_keys['stopPrice'] = price1 + "";
        } else if (type == "SL") {
            o_keys['quantity'] = amount + "";
            o_keys['type'] = "STOP_MARKET";
            o_keys['timeInForce'] = "GTC";
            o_keys['stopPrice'] = price + "";
        } else if (type == "TP") {
            o_keys['quantity'] = amount + "";
            o_keys['type'] = "TAKE_PROFIT_MARKET";
            o_keys['timeInForce'] = "GTC";
            o_keys['stopPrice'] = price + "";
        }
        if (cls == 1) {
            o_keys['reduceOnly'] = "true";
        }
        let sure_baslangici = Date.now();
        console.log("o_keys:" + JSON.stringify(o_keys));
        console.log(o_keys);
        let order;
        if (emri_kapat == 1) {
            console.log("call url:/openApi/swap/v2/trade/order");
            order = await this.call('/openApi/swap/v2/trade/order', 1, o_keys, "POST");
            console.log(" order result:" + JSON.stringify(order));
            let sure_bitimi = Date.now();
            let sure = (sure_bitimi - sure_baslangici) / 1000.0;
            if (this.debug) console.log(JSON.stringify(order));
            order = this.obj2arr(order);
            let n_order = {};
            if (order?.data?.order?.orderId) {
                n_order['orderId'] = order.data.order.orderId;
                n_order['status'] = "FILLED";
            }
            n_order['code'] = (order.code > 0 ? order.code : "");
            n_order['msg'] = order.msg;
            order = n_order;
        } else {
            order = {};
            order['code'] = -100;
            order['msg'] = "order already closed";
        }
        return order;
    }

    prepare_order(symbol, side, type, amount, price, cls = 0) {
        symbol = symbol.replace("USDT", "-USDT");
        let digits = this.digits;
        let vdigits = this.vdigits;
        let o_keys = { symbol: symbol, side: side, type: type };
        let points = Math.pow(10, digits * -1);
        points = 0;
        let rtype = type;
        if (cls == 0) {
            if (side == "BUY") {
                o_keys['positionSide'] = "LONG";
            } else {
                o_keys['positionSide'] = "SHORT";
            }
        } else {
            if (side == "BUY") {
                o_keys['positionSide'] = "SHORT";
            } else {
                o_keys['positionSide'] = "LONG";
            }
        }
        o_keys['positionSide'] = "BOTH";
        if (type == "MARKET") {
            o_keys['quantity'] = amount + "";
            o_keys['type'] = "MARKET";
        } else if (type == "LIMIT") {
            o_keys['quantity'] = amount + "";
            o_keys['price'] = price + "";
            o_keys['timeInForce'] = "GTC";
        } else if (type == "STOP") {
            let price1 = (side == "BUY") ? price - points : price + points;
            o_keys['quantity'] = amount + "";
            o_keys['price'] = price + "";
            o_keys['timeInForce'] = "GTC";
            o_keys['stopPrice'] = price1 + "";
        } else if (type == "SL") {
            o_keys['quantity'] = amount + "";
            o_keys['type'] = "STOP_MARKET";
            o_keys['timeInForce'] = "GTC";
            o_keys['stopPrice'] = price + "";
        } else if (type == "TP") {
            o_keys['quantity'] = amount + "";
            o_keys['type'] = "TAKE_PROFIT_MARKET";
            o_keys['timeInForce'] = "GTC";
            o_keys['stopPrice'] = price + "";
        }
        return o_keys;
    }

    async bulk_order_send(orders) {
        let sure_baslangici = Date.now();
        let n_orders = [];
        for (let o_id in orders) {
            let order = orders[o_id];
            let symbol = order['symbol'];
            let result = await this.call('/openApi/swap/v2/trade/order', 1, order, "POST");
            let sure_bitimi = Date.now();
            let sure = (sure_bitimi - sure_baslangici) / 1000.0;
            console.log(JSON.stringify(result));
            result = this.obj2arr(result);
            let n_order = {};
            if (result?.data?.order?.orderId) {
                n_order['orderId'] = result.data.order.orderId;
                n_order['status'] = "FILLED";
            }
            n_order['code'] = (result.code > 0 ? result.code : "");
            n_order['msg'] = result.msg;
            n_orders.push(n_order);
        }
        return n_orders;
    }

    async get_last_price(symbol = "") {
        symbol = symbol.replace("USDT", "-USDT");
        let form = await this.call('/openApi/swap/v2/quote/price', 0, { symbol: symbol }, "GET");
        if (form && form.data && form.data.price) {
            return parseFloat(form.data.price);
        }
        return null;
    }
}

export default rbingx; 