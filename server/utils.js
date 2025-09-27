// MySQL DATETIME formatına çevirme fonksiyonu
export function formatMySQLDateTime(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      // Geçersiz tarih durumunda null veya hata döndür, duruma göre ayarla
      throw new Error("Geçersiz tarih formatlama girişimi.");
    }
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

// Zaman damgasını 5 dakikanın başlangıcına yuvarlama fonksiyonu
export function floorTo5Minutes(timestamp) {
    const date = new Date(timestamp);
    date.setMinutes(Math.floor(date.getMinutes() / 5) * 5, 0, 0); // Dakikayı 5'in katına yuvarla, saniye ve ms sıfırla
    return date.getTime();
}

// Kullanıcıya bildirim ekleme fonksiyonu
import { print_log } from './print_log.js';
import pool from './db.js';

export async function bildirim_ekle(b_user_id, msg, durum = 0) {
    if (!msg) return;
    // id, s_id, us_id gibi parametreler context dışı ise log sadece user_id ile atılır
    const log_str = `${new Date().toISOString()} - [u:${b_user_id}] bildirim = ${(msg || '').replace(/\n/g, ' ')}\n`;
    print_log({ uid: b_user_id, msg: log_str, pool });
    await pool.query("insert into bildirimler (user_id, msg, error_message, gonderim) values (?,?,NULL,?)", [b_user_id, msg, durum, 0]);
}

// Fiyatı tickSize hassasiyetine göre yuvarlama fonksiyonu
export function formatPriceTickSize(price, tickSize, digits) {
    if (!tickSize || tickSize <= 0) {
        return parseFloat(price).toString();
    }
    const priceNum = parseFloat(price);
    const tickSizeNum = parseFloat(tickSize);
    const rounded = Math.round(priceNum / tickSizeNum) * tickSizeNum;
    return parseFloat(rounded.toFixed(digits || 8)).toString();
}

// Miktarı stepSize hassasiyetine göre yuvarlama fonksiyonu
export function formatQuantityStepSize(qty, stepSize, vdigits) {
    if (!stepSize || stepSize <= 0) {
        return parseFloat(qty).toFixed(vdigits || 3);
    }
    const qtyNum = parseFloat(qty);
    const stepSizeNum = parseFloat(stepSize);
    return (Math.floor(qtyNum / stepSizeNum) * stepSizeNum).toFixed(vdigits || 3);
} 