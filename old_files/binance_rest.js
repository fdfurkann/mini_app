import crypto from 'crypto';
import https from 'https';

class rbinance {
    constructor(key = "", secret = "") {
        this.auth = {};
        this.auth['key'] = key;
        this.auth['secret'] = secret;
        this.debug = false;
        this.digits = 0;
        this.vdigits = 0;
        this.base = '';
    }

    request(url, params = {}, method = "GET") {
        return new Promise((resolve, reject) => {
            const query = new URLSearchParams(params).toString();
            const endpoint = this.base + url + (query ? '?' + query : '');
            const options = {
                method: method,
                headers: {
                    'User-Agent': 'Mozilla/4.0 (compatible; PHP Binance API)'
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
            params['timestamp'] = Date.now().toString();
            let query = '';
            if (method.toLowerCase().includes('batchorder')) {
                query = `batchOrders=${params['batchOrders']}&timestamp=${params['timestamp']}`;
            } else {
                query = new URLSearchParams(params).toString();
            }
            const signature = crypto.createHmac('sha256', this.auth['secret']).update(query).digest('hex');
            let endpoint = '';
            let options = {
                method: method,
                headers: {
                    'User-Agent': 'Mozilla/4.0 (compatible; PHP Binance API)',
                    'X-MBX-APIKEY': this.auth['key'],
                    'Content-type': 'application/x-www-form-urlencoded'
                }
            };
            if (method === 'GET') {
                endpoint = `${this.base}${url}?${query}&signature=${signature}`;
            } else {
                endpoint = `${this.base}${url}`;
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
                req.write(`${query}&signature=${signature}`);
            }
            req.on('error', (e) => {
                reject(e);
            });
            req.end();
        });
    }

    async call(method, private_ = 0, params = {}, http_method = 'GET') {
        let sonuc = "";
        let url = 'https://www.binance.com' + method;
        if (private_ == 1) {
            sonuc = await this.signedRequest(url, params, http_method);
        } else {
            sonuc = await this.request(url, params, http_method);
        }
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

    async get_exchange() {
        return await this.call('/fapi/v1/exchangeInfo');
    }

    async get_leverage() {
        let form = await this.call('/fapi/v1/leverageBracket', 1, {}, "GET");
        form = this.obj2arr(form);
        return form;
    }

    async api_set_leverage(symbol, leverage) {
        let form = await this.call('/fapi/v1/leverage', 1, { "symbol": symbol, "leverage": leverage }, "POST");
        form = this.obj2arr(form);
        return form;
    }

    async api_set_margin_type(symbol, marginType) {
        let form = await this.call('/fapi/v1/marginType', 1, { "symbol": symbol, "marginType": marginType }, "POST");
        form = this.obj2arr(form);
        return form;
    }

    async api_permissions() {
        let form = await this.call('/sapi/v1/account/apiRestrictions', 1, {}, "GET");
        form = this.obj2arr(form);
        return form;
    }

    async position_risk() {
        let form = await this.call('/fapi/v2/positionRisk', 1, {}, "GET");
        form = this.obj2arr(form);
        let pozlar = {};
        if (Array.isArray(form)) {
            for (let b of form) {
                if (b['symbol'] && b['symbol'].length > 0) {
                    pozlar[b['symbol']] = b['positionAmt'];
                }
            }
        }
        return pozlar;
    }

    async api_set_position_mode(dualSidePosition) {
        let form = await this.call('/fapi/v1/positionSide/dual', 1, { "dualSidePosition": dualSidePosition }, "POST");
        form = this.obj2arr(form);
        return form;
    }

    async api_set_multi_asset_mode(multiAssetsMargin) {
        let form = await this.call('/fapi/v1/multiAssetsMargin', 1, { "multiAssetsMargin": multiAssetsMargin }, "POST");
        form = this.obj2arr(form);
        return form;
    }

    async open_orders(symbol = "") {
        let form = await this.call('/fapi/v1/openOrders', 1, { "symbol": symbol }, "GET");
        form = this.obj2arr(form);
        return form;
    }

    async order_delete(symbol, orderid) {
        let o_keys = { "symbol": symbol, "orderId": orderid };
        let order = await this.call('/fapi/v1/order', 1, o_keys, "DELETE");
        if (order && order.code < 0) {
            // console.log("order_delete(error): " + order.code + " " + order.msg);
            return order;
        }
        order = this.obj2arr(order);
        return order;
    }

    async order_send(symbol, side, type, amount, price, cls = 0) {
        let o_keys = { "symbol": symbol, "side": side, "type": type };
        let debug = this.debug;
        let digits = this.digits;
        let points = Math.pow(10, digits * -1);
        points = 0;
        let rtype = type;
        let emri_kapat = 1;
        if (cls == 1) {
            let p_risk = await this.position_risk();
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
        }
        if (type == "MARKET") {
            o_keys['quantity'] = amount;
        } else if (type == "LIMIT") {
            o_keys['quantity'] = amount;
            o_keys['price'] = price;
            o_keys['timeInForce'] = "GTC";
        } else if (type == "STOP") {
            let price1 = 0;
            if (side == "BUY") {
                price1 = price - points;
            } else {
                price1 = price + points;
            }
            o_keys['timeInForce'] = "GTC";
            o_keys['type'] = "STOP_MARKET";
            o_keys['quantity'] = amount;
            o_keys['stopPrice'] = price1;
        } else if (type == "SL") {
            o_keys['timeInForce'] = "GTE_GTC";
            o_keys['type'] = "STOP_MARKET";
            o_keys['closePosition'] = "true";
            o_keys['stopPrice'] = price;
        } else if (type == "TP") {
            o_keys['timeInForce'] = "GTE_GTC";
            o_keys['type'] = "TAKE_PROFIT_MARKET";
            o_keys['closePosition'] = "true";
            o_keys['stopPrice'] = price;
        }
        if (cls == 1) {
            o_keys['reduceOnly'] = "true";
        }
        let order = {};
        if (emri_kapat == 1) {
            order = await this.call('/fapi/v1/order', 1, o_keys, "POST");
            if (order && order.code < 0) {
                // console.log("order_send(error): " + order.code + " " + order.msg);
                return order;
            }
            if (this.debug) console.log(order);
            order = this.obj2arr(order);
        } else {
            order['code'] = -100;
            order['msg'] = "order already closed";
        }
        return order;
    }

    prepare_order(symbol, side, type, amount, price, cls = 0) {
        symbol = symbol.replace("/", "");
        let digits = this.digits;
        let vdigits = this.vdigits;
        let o_keys = { "symbol": symbol, "side": side, "type": type };
        let points = Math.pow(10, digits * -1);
        points = 0;
        let rtype = type;

        if (type == "MARKET") {
            o_keys['quantity'] = parseFloat(amount).toFixed(vdigits);
        } else if (type == "LIMIT") {
            o_keys['quantity'] = parseFloat(amount).toFixed(vdigits);
            o_keys['price'] = parseFloat(price).toFixed(digits);
            o_keys['timeInForce'] = "GTC";
        } else if (type == "STOP") {
            let price1 = 0;
            if (side == "BUY") {
                price1 = price - points;
            } else {
                price1 = price + points;
            }
            o_keys['timeInForce'] = "GTC";
            o_keys['type'] = "STOP_MARKET";
            o_keys['quantity'] = parseFloat(amount).toFixed(vdigits);
            o_keys['stopPrice'] = parseFloat(price1).toFixed(digits);
        } else if (type == "SL") {
            o_keys['timeInForce'] = "GTE_GTC";
            o_keys['type'] = "STOP_MARKET";
            o_keys['closePosition'] = "true";
            o_keys['stopPrice'] = parseFloat(price).toFixed(digits);
        } else if (type == "TP") {
            o_keys['timeInForce'] = "GTE_GTC";
            o_keys['type'] = "TAKE_PROFIT_MARKET";
            o_keys['closePosition'] = "true";
            o_keys['stopPrice'] = parseFloat(price).toFixed(digits);
        }
        if (cls == 1) {
            o_keys['reduceOnly'] = "true";
        }

        return o_keys;
    }

    async bulk_order_send(orders) {
        // Binance API batchOrders: her bir order objesi string olarak encode edilmeli
        // Örnek: [{symbol:..., side:..., type:..., quantity:..., ...}, ...]
        // API'ye gönderim: batchOrders=[{"symbol":"BTCUSDT","side":"BUY",...}, ...]
        let batchOrdersArr = orders.map(order => {
            // Sadece gerekli alanları al
            const allowedKeys = [
                'symbol', 'side', 'type', 'quantity', 'price', 'timeInForce',
                'stopPrice', 'closePosition', 'reduceOnly', 'priceProtect'
            ];
            let cleanOrder = {};
            for (let key of allowedKeys) {
                if (order[key] !== undefined) cleanOrder[key] = order[key];
            }
            return cleanOrder;
        });
        let o_keys = {};
        o_keys['batchOrders'] = JSON.stringify(batchOrdersArr);
        let order = await this.call('/fapi/v1/batchOrders', 1, o_keys, "POST");
        if (this.debug) console.log(order);
        order = this.obj2arr(order);
        return order;
    }

    async trade_history(symbol = "", limit = 20) {
        let params = {};
        if (symbol) params['symbol'] = symbol;
        params['limit'] = limit;
        let form = await this.call('/fapi/v1/userTrades', 1, params, "GET");
        form = this.obj2arr(form);
        return form;
    }
}

export default rbinance;
