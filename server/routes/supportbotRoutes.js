import { Router } from 'express';
import { AzureOpenAI } from 'openai';
import pool from '../db.js';
import { formatMySQLDateTime } from '../utils.js';

const router = Router();

const endpoint = "https://fdfurkann-4549-resource.cognitiveservices.azure.com/";
const apiKey = "2YSSvu3pvmom0EvRgUlX4oz4JJYUgEaenkFos0xf3vDCwFrn4L1dJQQJ99BIACHYHv6XJ3w3AAAAACOGmf6R";
const deployment = "gpt-5-chat";
const apiVersion = "2025-01-01-preview";
const modelName = "gpt-5-chat";

const client = new AzureOpenAI({ endpoint, apiKey, deployment, apiVersion });

router.post('/supportbot', async (req, res) => {
  try {
    const { messages, user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ message: 'Kullanıcı ID bilgisi eksik.' });
    }

    let promptRows = [];
    promptRows.push({ role: 'system', content: 'Sen Orcatradebot Kullanıcı Destek Asistanısın. Görevin, sana sistem tarafından verilen bilgiler doğrultusunda kullanıcının sorularını yanıtlamaktır. Veritabanı hakkında yorum yapma, sadece sana sunulan verileri kullanarak cevap ver.' });

    // --- KULLANICIYA AİT VERİLERİ ÇEKME ---
    // system_prompt tablosu
    try {
      const [rows] = await pool.execute('SELECT question, answer FROM system_prompt');
      promptRows = promptRows.concat(Array.isArray(rows) ? rows.map(row => ({ role: 'system', content: row.answer })) : []);
    } catch (e) {
      console.error('system_prompt fetch error:', e.message);
    }

    // users tablosu
    try {
      const [rows] = await pool.execute('SELECT id,username,full_name,email,phone,is_vip,subscription_expires_at,created_at,status,language FROM users WHERE id = ?', [user_id]);
      if (rows && rows.length > 0) {
        const csvData = `Kullanıcının üyelik bilgileri (users tablosu):\n${rowsToCSV(rows)}`;
        promptRows.push({ role: 'system', content: csvData });
      }
    } catch (e) { console.error('users fetch error:', e.message); }

    // user_signals tablosu
    try {
      const [rows] = await pool.execute('SELECT symbol,trend,open,opentime,close,closetime,profit,status,event FROM user_signals WHERE user_id = ? ORDER BY id DESC LIMIT 20', [user_id]);
      if (rows && rows.length > 0) {
        const csvData = `Kullanıcının son 20 işlemi (user_signals tablosu):\n${rowsToCSV(rows)}`;
        promptRows.push({ role: 'system', content: csvData });
      }
    } catch (e) { console.error('user_signals fetch error:', e.message); }

    // api_keys tablosu
    try {
      const [rows] = await pool.execute('SELECT api_name,api_type,lotsize,leverage,margin_type,max_orders,auto_trade,status,enrolled_id FROM api_keys WHERE user_id = ?', [user_id]);
      if (rows && rows.length > 0) {
        const csvData = `Kullanıcının API anahtarı ayarları (api_keys tablosu):\n${rowsToCSV(rows)}`;
        promptRows.push({ role: 'system', content: csvData });
      }
    } catch (e) { console.error('api_keys fetch error:', e.message); }

    // bildirimler tablosu
    try {
      const [rows] = await pool.execute('SELECT msg,gonderim FROM bildirimler WHERE user_id = ? ORDER BY id DESC LIMIT 10', [user_id]);
      if (rows && rows.length > 0) {
        const csvData = `Kullanıcıya gönderilen son 10 bildirim (bildirimler tablosu):\n${rowsToCSV(rows)}`;
        promptRows.push({ role: 'system', content: csvData });
      }
    } catch (e) { console.error('bildirimler fetch error:', e.message); }

    // enrolled_users tablosu
    try {
      const [rows] = await pool.execute('SELECT package_time,start_date,end_date FROM enrolled_users WHERE user_id = ?', [user_id]);
      if (rows && rows.length > 0) {
        const csvData = `Kullanıcının abonelik bilgileri (enrolled_users tablosu):\n${rowsToCSV(rows)}`;
        promptRows.push({ role: 'system', content: csvData });
      }
    } catch (e) { console.error('enrolled_users fetch error:', e.message); }
    
    // --- SQL ÜRETME VE AGENT MANTIĞI KALDIRILDI ---

    // Sadece önceden toplanan verilerle doğrudan cevap üretme
    const finalPrompt = [
      ...promptRows,
      ...(Array.isArray(messages) ? messages : [])
    ];

    const aiResponse = await client.chat.completions.create({
      messages: finalPrompt,
      max_completion_tokens: 1024,
      temperature: 0.7, // Daha tutarlı cevaplar için sıcaklık düşürüldü
      model: modelName
    });
    const aiMsg = aiResponse.choices?.[0]?.message?.content?.trim() || "Cevap alınamadı.";
    res.status(200).json({ choices: [{ message: { content: aiMsg } }] });

  } catch (error) {
    res.status(500).json({ message: error?.message || 'Bir hata oluştu.' });
  }
});

// Helper function for CSV conversion (her iki endpoint için de kullanılabilir)
function rowsToCSV(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return 'Bu konuyla ilgili veri bulunamadı.';
  const header = Object.keys(rows[0]).join(',');
  let values = '';
  for (const row of rows) {
    const formattedRow = { ...row };
    for (const key in formattedRow) {
      if (formattedRow[key] instanceof Date) {
        formattedRow[key] = formatMySQLDateTime(formattedRow[key]);
      } else if (typeof formattedRow[key] === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(formattedRow[key])) {
        try {
          const d = new Date(formattedRow[key]);
          if (!isNaN(d.getTime())) {
            formattedRow[key] = formatMySQLDateTime(d);
          }
        } catch {}
      }
      if (typeof formattedRow[key] === 'string') {
        formattedRow[key] = formattedRow[key].replace(/[\n\r,]+/g, ' '); // Virgülleri de temizle
      }
    }
    const values1 = Object.values(formattedRow).join(',');
    values += values1 + '\n';
  }
  return `${header}\n${values}`;
}

router.post('/adminsupportbot', async (req, res) => {
  // Set a longer timeout for this potentially long-running request
  res.setTimeout(180000, () => {
    // Handle timeout error
    console.log('Request has timed out.');
    if (!res.headersSent) {
      res.status(504).send('Gateway Timeout');
    }
  });

  try {
    const { messages, mode } = req.body;
    let promptRows = [];
    // Tablo yapısı ve açıklamaları
    promptRows.push({ role: 'system', content: 'Tablo: api_keys | Açıklama: Kullanıcıya ait borsa API anahtarları ve işlem ayarları. Sütunlar:\n- id: API anahtarının benzersiz kayıt numarası (primary key)\n- user_id: API anahtarının ait olduğu kullanıcının id\'si (users tablosuna referans)\n- api_name: Kullanıcının API anahtarına verdiği isim (ör: "Binance Vadeli")\n- api_key: Borsadan alınan API anahtarı (kullanıcıya özel, borsadan alınır)\n- api_secret: Borsadan alınan API secret (kullanıcıya özel, borsadan alınır)\n- api_type: Borsa tipi (1=Binance, 2=Bybit, 3=Bingx gibi)\n- bot_room: Botun işlem yaptığı Telegram kanalının id\'si (kanala özel işlemler için)\n- lotsize: İşlem açılırken kullanılacak USDT miktarı (ör: 10, 50, 100)\n- leverage: Kaldıraç oranı (ör: 10, 20, 50)\n- margin_type: Marjin tipi (CROSS veya ISOLATED)\n- max_orders: Aynı anda açılabilecek maksimum emir sayısı\n- auto_trade: 1 ise otomatik trade aktif, 0 ise pasif (manuel işlem)\n- stop_loss: 1 ise stop loss aktif, 0 ise pasif\n- stop_loss_settings: Stop loss tipi (none: yok, signal: sinyalden, custom: kullanıcı tanımlı)\n- percent_loss: Custom stop loss için yüzde değer (ör: %2 kayıpta stop)\n- stop_amount: Stop loss için miktar (USDT cinsinden)\n- take_profit: Take profit tipi (none: yok, signal: sinyalden, custom: kullanıcı tanımlı)\n- take_profit_trading_setting: TP emirlerinin yönetim şekli (ör: hepsi birden, kademeli)\n- signal_profit: Sinyal bazlı kar hedefi aktif mi (1=evet, 0=hayır)\n- percent_profit: Yüzdesel kar hedefi (ör: %5 kar alınca pozisyon kapansın)\n- tp0: 0. take profit hedefi (bazı stratejilerde kullanılabilir)\n- tp1-tp10: 1. ile 10. arası take profit hedef fiyatları (kademeli kar al noktaları)\n- is_profit_target_enabled: Kar hedefi aktif mi (1=evet, 0=hayır)\n- profit_amount: Kar hedefi miktarı (USDT cinsinden)\n- profit_target_amount: Kar hedefi için toplam miktar\n- withdraw_to_cost: Kar çekiminde maliyete çekme aktif mi (1=evet, 0=hayır)\n- trail_stop: İz süren stop aktif mi (1=evet, 0=hayır)\n- sl_tp_order: SL ve TP emirleri birlikte mi açılır (1=evet, 0=hayır)\n- break_even_level: Break even seviyesi (ör: TP2\'ye gelince maliyete çek)\n- status: API anahtarının aktiflik durumu (1=aktif, 0=pasif)\n- enrolled_id: Bağlı olduğu abonelik id\'si (abonelik olmadan işlem yapılamaz)\n- start_date: API anahtarının kullanım başlangıç tarihi\n- end_date: API anahtarının kullanım bitiş tarihi\n- created_at: Kayıt oluşturulma tarihi (timestamp)\n- updated_at: Son güncellenme tarihi (timestamp)' });
    promptRows.push({ role: 'system', content: 'Tablo: bildirimler | Açıklama: Kullanıcılara gönderilen bireysel bildirimler. Sütunlar:\n- id: Bildirim kaydının benzersiz numarası\n- user_id: Bildirimin gönderileceği kullanıcının id\'si\n- msg: Kullanıcıya gönderilecek mesaj içeriği\n- error_message: Bildirim gönderiminde hata oluşursa hata mesajı\n- gonderim: Bildirimin gönderildiği zamanın unix timestamp\'i (0 ise henüz gönderilmedi, -1 ise gönderilemedi)' });
    promptRows.push({ role: 'system', content: 'Tablo: bildirimler_ch | Açıklama: Telegram kanallarına gönderilen toplu bildirimler ve işlem kayıtları. Sütunlar:\n- id: Kanal bildirim kaydının benzersiz id\'si (primary key)\n- channel_id: Bildirimin gönderildiği Telegram kanalının id\'si (bot_rooms tablosuna referans)\n- post_id: Telegram kanalında gönderilen mesajın id\'si\n- symbol: Sinyal veya işlemin ait olduğu parite (örn: BTCUSDT)\n- trend: İşlem yönü (LONG veya SHORT)\n- open: Pozisyonun açıldığı fiyat\n- opendate: Pozisyonun açıldığı zaman (datetime veya string)\n- sl: Stop loss (zarar durdur) fiyatı\n- last: Son fiyat (veya pozisyonun kapandığı fiyat)\n- lastdate: Son fiyatın oluştuğu zaman (datetime veya string)\n- cmd: Gerçekleşen işlem tipi veya komut (örn: "order_send", "close", "tp_hit")\n- profit: İşlemden elde edilen kar/zarar miktarı\n- msg: Kanala gönderilen bildirim mesajı (metin)\n- gonderim: Bildirimin gönderildiği zamanın unix timestamp\'i (0 ise henüz gönderilmedi, -1 ise gönderilemedi)\n- error_message: Bildirim gönderiminde hata oluşursa hata mesajı\n- result: Bildirim veya işlemin sonucu (örn: 1=başarılı, 0=başarısız, hata kodu)' });
    promptRows.push({ role: 'system', content: 'Tablo: bot_logs | Açıklama: Botun çalışmasıyla ilgili log (kayıt) verileri. Sütunlar:\n- id: Log kaydının benzersiz id\'si (primary key)\n- signals_id: İlgili sinyalin id\'si (sinyal tablosuna referans, yoksa 0)\n- user_id: Logun ilgili olduğu kullanıcının id\'si (users tablosuna referans, yoksa 0)\n- user_signals_id: Kullanıcıya özel sinyalin id\'si (user_signals tablosuna referans, yoksa 0)\n- channel_id: Logun ilgili olduğu kanalın id\'si (bot_rooms tablosuna referans, yoksa boş)\n- detail: Logun detaylı açıklaması veya mesajı (serbest metin, hata veya işlem açıklaması)\n- call_func: Logun oluştuğu fonksiyon veya çağrı bilgisi (serbest metin)\n- created_at: Log kaydının veritabanına eklendiği zaman (timestamp)' });
    promptRows.push({ role: 'system', content: 'Tablo: bot_rooms | Açıklama: Botun kayıtlı olduğu Telegram kanalları ve kanal bilgileri. Sütunlar:\n- id: Kanal kaydının benzersiz id\'si (primary key)\n- room_id: Telegram kanalının benzersiz id\'si (Telegram\'dan alınan kanal/chat id)\n- room_name: Kanalın adı (ör: "Orca Trade Sinyal Kanalı")\n- admin_id: Kanal yöneticisinin kullanıcı id\'si (users tablosuna referans)\n- channel_desc: Kanalın açıklaması veya tanıtım metni\n- channel_img: Kanalın profil/fotoğraf url\'si veya dosya yolu\n- telegram_link: Kanalın davet veya genel Telegram linki (ör: t.me/orcatradebot)\n- register: Kanalın sisteme kaydedildiği tarih veya kayıt bilgisi (string/timestamp)\n- active: Kanalın aktiflik durumu (1=aktif, 0=pasif)\n- sira: Kanalın sıralama veya öncelik değeri (menüde/ekranda sıralama için)' });
    promptRows.push({ role: 'system', content: 'Tablo: enrolled_users | Açıklama: Kullanıcıların satın aldığı abonelik paketleri ve abonelik hakları. Sütunlar:\n- id: Abonelik kaydının benzersiz id\'si (primary key)\n- package_id: Kullanıcının satın aldığı abonelik paketinin id\'si (packages tablosuna referans)\n- user_id: Aboneliğin ait olduğu kullanıcının id\'si (users tablosuna referans)\n- package_time: Paketin süresi (gün cinsinden)\n- package_api_rights: Paket ile birlikte gelen API hakkı/adedi\n- start_date: Aboneliğin başladığı tarih (timestamp)\n- end_date: Aboneliğin biteceği tarih (timestamp)\n- created_at: Abonelik kaydının oluşturulma tarihi (timestamp)\n- updated_at: Son güncellenme tarihi (timestamp)' });
    promptRows.push({ role: 'system', content: 'Tablo: signals | Açıklama: Kanallara veya kullanıcılara gönderilen işlem sinyalleri. Sütunlar:\n- id: Sinyalin benzersiz id\'si\n- channel_id: Sinyalin gönderildiği kanalın id\'si (veya kullanıcıya özelse negatif id)\n- message_id: Sinyalin gönderildiği Telegram mesaj id\'si veya api anahtarı id\'si\n- symbol: İşlem yapılacak parite (örn: BTCUSDT)\n- direction: İşlem yönü (LONG veya SHORT)\n- entry1: İşleme giriş aralığının alt fiyatı\n- entry2: İşleme giriş aralığının üst fiyatı\n- stop_loss: Zarar durdur fiyatı\n- tp1: 1. take profit (kar al) hedef fiyatı\n- tp2: 2. take profit hedef fiyatı\n- tp3: 3. take profit hedef fiyatı\n- tp4: 4. take profit hedef fiyatı\n- tp5: 5. take profit hedef fiyatı\n- tp6: 6. take profit hedef fiyatı\n- tp7: 7. take profit hedef fiyatı\n- tp8: 8. take profit hedef fiyatı\n- tp9: 9. take profit hedef fiyatı\n- tp10: 10. take profit hedef fiyatı\n- status: Sinyalin durumu (created, pending, active, closed, cancelled, error)\n- signal_hash: Sinyalin benzersiz hash değeri\n- ticktime: Sinyalin oluşturulduğu zamanın unix timestamp\'i\n- bid: Sinyal anındaki alış fiyatı\n- ask: Sinyal anındaki satış fiyatı\n- open_time: Pozisyonun açıldığı zaman (datetime)\n- open_price: Pozisyonun açıldığı fiyat\n- close_time: Pozisyonun kapandığı zaman (datetime)\n- close_price: Pozisyonun kapandığı fiyat\n- tp_hit: Sinyalde ulaşılan son TP seviyesi (kaçıncı TP\'ye ulaşıldı)\n- sl_hit: Sinyalde kaç kere stop loss oldu\n- closed_reason: Sinyalin kapanma nedeni (ör: manuel, stop, hedef)\n- profit: Sinyalden elde edilen toplam kar/zarar miktarı\n- created_at: Sinyal kaydının oluşturulma tarihi (timestamp)\n- updated_at: Son güncellenme tarihi (timestamp)\n- last_tp: Son ulaşılan TP seviyesi (int, default 0)' });
    promptRows.push({ role: 'system', content: 'Tablo: users | Açıklama: Sistemdeki kullanıcılar ve üyelik bilgileri. Sütunlar:\n- id: Kullanıcının benzersiz id\'si (Telegram id)\n- username: Kullanıcının Telegram kullanıcı adı\n- full_name: Kullanıcının tam adı\n- email: Kullanıcının e-posta adresi\n- phone: Kullanıcının telefon numarası\n- is_admin: 1 ise admin, 0 ise normal kullanıcı\n- is_vip: 1 ise VIP kullanıcı, 0 ise normal\n- subscription_expires_at: Abonelik bitiş tarihi\n- created_at: Kullanıcı kaydının oluşturulma tarihi\n- updated_at: Son güncellenme tarihi\n- last_login: Son giriş zamanı\n- login_hash: Giriş doğrulama için kullanılan hash\n- status: Kullanıcı durumu (active, inactive, banned)\n- language: Kullanıcının tercih ettiği dil\n- notes: Kullanıcıya özel notlar\n- old_id: Eski sistemden taşınan kullanıcı id\'si' });
    promptRows.push({ role: 'system', content: 'Tablo: user_signals | Açıklama: Kullanıcıya özel açılan sinyaller ve pozisyonlar. Sütunlar:\n- id: Kullanıcı sinyalinin benzersiz kayıt numarası (primary key)\n- user_id: Sinyali açan kullanıcının id\'si (users tablosuna referans)\n- api_id: Sinyalin açıldığı API anahtarının id\'si (api_keys tablosuna referans)\n- signal_id: Bağlı olduğu ana sinyalin id\'si (signals tablosuna referans)\n- lotsize: Pozisyonun açıldığı miktar (USDT cinsinden)\n- levelage: Pozisyonun açıldığı kaldıraç oranı\n- strateji: Kullanılan strateji adı (örn: "martingale", "standart")\n- ticket: Borsadaki pozisyonun veya emrin bilet/ticket numarası\n- symbol: İşlem yapılan parite (örn: BTCUSDT)\n- trend: Pozisyon yönü (LONG veya SHORT)\n- open: Pozisyonun açıldığı fiyat\n- opentime: Pozisyonun açıldığı zaman (datetime veya string)\n- volume: Açılan pozisyonun toplam miktarı\n- closed_volume: Kapanan miktar (pozisyonun bir kısmı kapandıysa)\n- sl: Pozisyonun stop loss (zarar durdur) fiyatı\n- tp: Pozisyonun take profit (kar al) fiyatı\n- close: Pozisyonun kapandığı fiyat\n- closetime: Pozisyonun kapandığı zaman (datetime veya string)\n- profit: Pozisyondan elde edilen toplam kar/zarar miktarı\n- event: Pozisyonla ilgili açıklama veya olay kaydı (ör: "SL tetiklendi")\n- status: Pozisyonun durumu (örn: 1=açık, 2=kapalı, 3=hatalı, 4=beklemede, 5=manuel kapalı)\n- sticket: Stop loss emrinin borsadaki ticket numarası\n- tticket: Take profit emrinin borsadaki ticket numarası\n- sl_wait: Stop loss için bekleme veya tekrar deneme sayısı\n- tp_wait: Take profit için bekleme veya tekrar deneme sayısı\n- sl_hit: Pozisyonun kaç kere stop loss olduğu (int)\n- tp_hit: Pozisyonun kaç kere take profit olduğu (int)' });
    // Admin asistanı kimliği system promptu
    promptRows.unshift({ role: 'system', content: 'Sen Orcatradebot Admin Asistanısın, görevin adminlerin cevabını merak ettiği tüm sorulara cevap vermek.' });
    promptRows.unshift({ role: 'system', content: 'DİKKAT: Bir kanala ait bir soru sorulduğunda önce bot_rooms tablosında bahsedilen kanalın room_id değerini al, bu o kanalın telegram_id\'si olur. Diğer tablolarda kanala ait bir şey sorulduğunda veya arandığında bu değer ile arama yapmalısın. Bir üye ile ilgili soru sorulduğunda önce o üyenin users tablosundan id\'si bulunmalı ve sonra diğer tablolarda o üye ile ilgili arama yapılmalı.' });
    // Tablo formatında gösterim fonksiyonu
    function jsonToTable(rows, columns) {
        let header = '| ' + columns.join(' | ') + ' |\n';
        let sep = '| ' + columns.map(() => '---').join(' | ') + ' |\n';
        let body = rows.map(row => '| ' + columns.map(col => row[col]).join(' | ') + ' |').join('\n');
        return header + sep + body;
    }

    // Eğer agent modu isteniyorsa zincirleme LLM agent akışını başlat
    if (mode === 'agent' && Array.isArray(messages) && messages.length > 0) {
      const lastUserMsg = messages[messages.length - 1];
      const adminQuestion = lastUserMsg?.content || '';
      console.log('[adminsupportbot][agent] Admin sorusu:', adminQuestion);

      const sqlGenBasePrompt = [
        ...promptRows,
        { role: 'system', content: 'Sen bir SQL uzmanısın. Aşağıdaki soruyu cevaplamak için hangi SQL sorgularını çalıştırmak gerekir? Eğer gerekiyorsa gereken sql sorgularını üret. Gerekmiyorsa sql sorgusu üretme. Sadece sorguları, açıklamasız ve kod bloğu olmadan, birden fazla gerekiyorsa her mesajda bir sql sorgusu üretebilirsin. cevap geldikten sonra sıradaki sorgunu söyleyip onunda cevabını alırsın. sql sorgusu üretmediğinde datayı topladığını anlayacağım.' },
        { role: 'system', content: 'DİKKAT: Sorgu üretirken kesinlikle select * kullanma! Sadece gerekli sütunları ekleyerek select sütun_ismi,sütun_ismi,... şeklinde sorgular üret.' },
        { role: 'system', content: 'DİKKAT: Sadece şu MySQL tablolarına SELECT sorgusu yapabilirsin: api_keys, bildirimler, bildirimler_ch, bot_logs, bot_rooms, enrolled_users, signals, users, user_signals. Diğer tablolara erişim ve sorgu kesinlikle yasaktır. Sadece bu tablolardan veri çekebilirsin.' },
       
        { role: 'user', content: `Soru: ${adminQuestion}` }        
      ];

      let conversationHistory = [...sqlGenBasePrompt, { role: 'user', content: adminQuestion }];
      let accumulatedResults = [];
      const MAX_LOOPS = 5; // Sonsuz döngüyü önlemek için

      for (let i = 0; i < MAX_LOOPS; i++) {
        console.log(`[adminsupportbot][agent] SQL üretim döngüsü ${i + 1}`);
        
        const sqlGenResponse = await client.chat.completions.create({
          messages: conversationHistory,
          max_completion_tokens: 1024,
          temperature: 1,
          model: modelName
        });
        const sqlText = sqlGenResponse.choices?.[0]?.message?.content?.trim() || '';
        console.log(`[adminsupportbot][agent] Döngü ${i + 1} - Üretilen SQL:`, sqlText);

        conversationHistory.push({ role: 'assistant', content: sqlText });

        const sqlQueries = sqlText.split('\n').map(q => q.trim()).filter(q => q.toLowerCase().startsWith('select'));

        if (sqlQueries.length === 0) {
          console.log(`[adminsupportbot][agent] Çalıştırılacak yeni SQL sorgusu yok. Döngü sonlandırılıyor.`);
          break;
        }

        let currentLoopResultsText = '';
        for (const query of sqlQueries) {
          try {
            console.log('[adminsupportbot][agent] SQL sorgusu çalıştırılıyor:', query);
            const [rows] = await pool.execute(query);
            accumulatedResults.push({ query, rows });
            currentLoopResultsText += `Sorgu: ${query}\nSonuç (CSV):\n${rowsToCSV(rows)}\n---\n`;
            console.log('[adminsupportbot][agent] Sorgu sonucu:', rows);
          } catch (err) {
            accumulatedResults.push({ query, error: err.message });
            currentLoopResultsText += `Sorgu: ${query}\nHata: ${err.message}\n---\n`;
            console.log('[adminsupportbot][agent] Sorgu hatası:', err.message);
          }
        }

        conversationHistory.push({ role: 'system', content: `Aşağıda çalıştırılan sorguların sonuçları var. Bu sonuçlara göre, adminin sorusunu tam olarak cevaplamak için başka SQL sorguları çalıştırman gerekiyor mu? Gerekiyorsa, yeni sorguları yaz. Gerekmiyorsa, sorgu yazma.` });
        conversationHistory.push({ role: 'user', content: currentLoopResultsText });
      }

      if (accumulatedResults.length === 0) {
        console.log('[adminsupportbot][agent] SQL sorgusu üretilmedi, assistant modunda cevaplanacak.');
        const assistantPrompt = [...sqlGenBasePrompt, { role: 'user', content: adminQuestion }];
        const assistantResponse = await client.chat.completions.create({
          messages: assistantPrompt,
          max_completion_tokens: 1024,
          temperature: 1,
          model: modelName
        });
        const assistantAnswer = assistantResponse.choices?.[0]?.message?.content?.trim() || 'Cevap alınamadı.';
        return res.status(200).json({ choices: [{ message: { content: assistantAnswer } }] });
      }

      const finalResultText = accumulatedResults
        .filter(r => !r.error && r.rows.length > 0)
        .map(r => `Sorgu: ${r.query}\nSonuç (CSV):\n${rowsToCSV(r.rows)}`)
        .join('\n---\n');

      const answerPrompt = [
        ...promptRows,
        { role: 'system', content: 'Aşağıda adminin sorusu ve bu soruya karşılık çalıştırılan SQL sorgularının CSV formatında sonuçları var. Sonuçlara bakarak adminin sorusunu detaylı ve açıklayıcı şekilde yanıtla.' },
        { role: 'user', content: `Soru: ${adminQuestion}\n\nSQL Sonuçları (CSV):\n${finalResultText}` }
      ];

      console.log('[adminsupportbot][agent] LLM cevap üretim promptu:', answerPrompt);
      const answerResponse = await client.chat.completions.create({
        messages: answerPrompt,
        max_completion_tokens: 1024,
        temperature: 1,
        model: modelName
      });
      const finalAnswer = answerResponse.choices?.[0]?.message?.content?.trim() || 'Cevap alınamadı.';
      console.log('[adminsupportbot][agent] LLM final cevabı:', finalAnswer);
      return res.status(200).json({ choices: [{ message: { content: finalAnswer } }] });
    }

    // Helper function for CSV conversion
    function rowsToCSV(rows) {
      if (!Array.isArray(rows) || rows.length === 0) return 'Sonuç bulunamadı.';
      const header = Object.keys(rows[0]).join(',');
      let values = '';
      for (const row of rows) {
        const formattedRow = { ...row };
        for (const key in formattedRow) {
          if (formattedRow[key] instanceof Date) {
            formattedRow[key] = formatMySQLDateTime(formattedRow[key]);
          } else if (typeof formattedRow[key] === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(formattedRow[key])) {
            try {
              const d = new Date(formattedRow[key]);
              if (!isNaN(d.getTime())) {
                formattedRow[key] = formatMySQLDateTime(d);
              }
            } catch {}
          }
          if (typeof formattedRow[key] === 'string') {
            formattedRow[key] = formattedRow[key].replace(/[\n\r]+/g, ' ');
          }
        }
        const values1 = Object.values(formattedRow).join(',');
        values += values1 + '\n';
      }
      return `${header}\n${values}`;
    }

    const { messages: oldMessages } = req.body;
    // Admin'e özel system mesajı

    promptRows.push({ role: 'system', content: 'Bu bir admin destek botudur, yöneticiye özel cevap ver.' });
    
    
    try {
      const [rows] = await pool.execute('SELECT question, answer FROM system_prompt');
      promptRows = promptRows.concat(Array.isArray(rows)
        ? rows.map(row => ({ role: row.question, content: row.answer }))
        : []);
    } catch {}

    const systemPrompts = Array.isArray(promptRows)
      ? promptRows.filter(row => typeof row.role === 'string' && row.role.trim() && typeof row.content === 'string' && row.content.trim())
      : [];

    const sqlPrompt = [
      ...systemPrompts,
      ...(Array.isArray(oldMessages) ? oldMessages : [])
    ];

    console.log('[adminsupportbot][default] LLM promptu:', sqlPrompt);

    const aiResponse = await client.chat.completions.create({
      messages: sqlPrompt,
      max_completion_tokens: 1024,
      temperature: 1,
      model: modelName
    });
    const aiMsg = aiResponse.choices?.[0]?.message?.content?.trim() || "Cevap alınamadı.";
    console.log('[adminsupportbot][default] LLM cevabı:', aiMsg);
    res.status(200).json({ choices: [{ message: { content: aiMsg } }] });
  } catch (error) {
    console.log('[adminsupportbot][error]', error);
    res.status(500).json({ message: error?.message || 'Bir hata oluştu.' });
  }
});

export default router;