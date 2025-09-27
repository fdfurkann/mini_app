import pool from './db.js';
import { create_order } from './run_user_create_order.js';
import { run_user } from './run_user.js';
import { rbinance } from './exchanges/binance_rest.js';
import { rbingx } from './exchanges/bingx_rest.js';
import { rbybit } from './exchanges/bybit_rest.js';

const funcMap = {
    create_order,
    run_user
    // Gerekirse başka fonksiyonlar eklenebilir
};

async function resolveBorsa(param) {
    if (param && param.borsa && param.api_id) {
        const [rows] = await pool.query('SELECT * FROM api_keys WHERE id = ?', [param.api_id]);
        if (!rows.length) throw new Error('api_keys tablosunda api_id bulunamadı: ' + param.api_id);
        const api = rows[0];
        if (api.api_type === 1) return new rbinance(api.api_key, api.api_secret);
        if (api.api_type === 2) return new rbybit(api.api_key, api.api_secret);
        if (api.api_type === 3) return new rbingx(api.api_key, api.api_secret);
        throw new Error('Bilinmeyen api_type: ' + api.api_type);
    }
    return param;
}

async function resolveParams(params) {
    const resolved = [];
    for (const p of params) {
        if (p && typeof p === 'object' && p.borsa) {
            resolved.push(await resolveBorsa(p));
        } else {
            resolved.push(p);
        }
    }
    return resolved;
}

async function main() {
    const id = process.argv[2];
    if (!id) {
        console.error('Kullanım: node trace_func.js <bot_log_id>');
        process.exit(1);
    }
    const [rows] = await pool.query('SELECT * FROM bot_log WHERE id = ?', [id]);
    if (!rows.length) {
        console.error('Kayıt bulunamadı.');
        process.exit(1);
    }
    const log = rows[0];
    if (!log.call_func) {
        console.error('call_func alanı boş.');
        process.exit(1);
    }
    let call;
    try {
        call = JSON.parse(log.call_func);
    } catch (e) {
        console.error('call_func parse edilemedi:', e);
        process.exit(1);
    }
    const funcName = call.functionName || call.func || call.name;
    const params = call.params || [];
    if (!funcMap[funcName]) {
        console.error('Fonksiyon bulunamadı:', funcName);
        process.exit(1);
    }
    try {
        const resolvedParams = await resolveParams(params);
        const result = await funcMap[funcName](...resolvedParams);
        console.log('Fonksiyon başarıyla çalıştı. Sonuç:', result);
    } catch (e) {
        console.error('Fonksiyon çalıştırılırken hata oluştu:', e);
    }
    process.exit(0);
}

main(); 