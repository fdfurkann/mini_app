import mysql from 'mysql2/promise';

async function sifirla() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        database: 'orcatradebot',
        // password: '', // Eğer parola varsa buraya ekle
        multipleStatements: true
    });
    try {
        await connection.query(`
            TRUNCATE bildirimler;
            TRUNCATE bildirimler_ch;
            TRUNCATE channel_events;
            TRUNCATE signals;
            TRUNCATE user_signals;
        `);
        console.log('Tüm tablolar başarıyla sıfırlandı.');
    } catch (err) {
        console.error('Hata:', err.message);
    } finally {
        await connection.end();
    }
}

sifirla(); 