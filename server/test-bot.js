import TelegramBot from 'node-telegram-bot-api';
import https from 'https';
import axios from 'axios';
import fetch from 'node-fetch';
// HTTPS agent ayarları
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
  maxSockets: 1,
  timeout: 30000
});

https.get('https://api.telegram.org', (res) => {
  console.log('statusCode:', res.statusCode);
}).on('error', (e) => {
  console.error('HTTPS test hatası:', e);
});

const token = '7203515878:AAFLmNSz_KASL2RSXoPk1mW85TXqx7sjxmE';

const bot = new TelegramBot(token,{ polling: true, request: {
  agentOptions: {
      keepAlive: true,
      family: 4
  }
}});

bot.on('message', (msg) => {
  console.log('Mesaj alındı:', msg.text);
});

bot.on('polling_error', (error) => {
  console.log('Hata:', error.message);
  console.log('Hata kodu:', error.code);
});


const chat_id = '-1002686562020'; // Buraya test için gerçek bir kanal ID'si gir
const user_id = '5118957445';      // Buraya test için gerçek bir kullanıcı ID'si gir

async function testTelegramGetChatMember() {
    try {
        var main_link = `https://api.telegram.org/bot${token}/getChatMember?chat_id=${chat_id}&user_id=${user_id}`
        console.log(main_link);
        const response = await axios.get(main_link);
        console.log('Telegram getChatMember yanıtı:', response.data);
    } catch (e) {
        console.error('Telegram getChatMember hatası:', e.message);
        console.error('Stack:', e.stack);
        console.error('Code:', e.code);
        console.error('Response:', JSON.stringify(e.response?.data || {}));
        console.error('Config:', JSON.stringify(e.config || {}));
    }
}

const chat_id_fetch = '-1001234567890'; // Buraya test için gerçek bir kanal ID'si gir
const user_id_fetch = '123456789';      // Buraya test için gerçek bir kullanıcı ID'si gir

async function testTelegramGetChatMemberFetch() {
    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/getChatMember?chat_id=${chat_id_fetch}&user_id=${user_id_fetch}`);
        const data = await response.json();
        console.log('Telegram getChatMember yanıtı (fetch):', data);
    } catch (e) {
        console.error('Telegram getChatMember hatası (fetch):', e.message, e.stack);
    }
}

testTelegramGetChatMember();
testTelegramGetChatMemberFetch();

console.log('Bot çalışıyor...');