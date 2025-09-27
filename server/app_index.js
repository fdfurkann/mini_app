import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from './db.js';
import { exec, spawn } from 'child_process'; // spawn'ı import et
import path from 'path'; // path modülünü import et
import fs from 'fs';

// Import all route modules
import adminRoutes from './routes/adminRoutes.js';
import apiKeyRoutes from './routes/apiKeyRoutes.js';
import authRoutes from './routes/authRoutes.js';
import backtestRoutes from './routes/backtestRoutes.js';
import channelRoutes from './routes/channelRoutes.js';
import faqRoutes from './routes/faqRoutes.js';
import signalRoutes from './routes/signalRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import tradeRoutes from './routes/tradeRoutes.js';
import userRoutes from './routes/userRoutes.js';
import channelOwnerRoutes from './routes/channelOwnerRoutes.js';
import supportbotRoutes from './routes/supportbotRoutes.js';
import systemPromptRoutes from './routes/systemPromptRoutes.js';


const debug = 1;

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env dosyasını yükle - bu dosya zaten db.js içinde yükleniyor ama burada da olması zararsız.
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const port = process.env.PORT || 3001;


// CORS configuration
app.use((req, res, next) => {
  req.setTimeout(30000);   // 30 saniye
  res.setTimeout(30000);
  // /api/admin/rates endpoint'i için loglamayı atla
  if (req.originalUrl === '/api/admin/rates') {
    return next();
  }

  const oldSend = res.send;
  res.send = function (data) {
    try {
      const jsonData = typeof data === 'string' ? JSON.parse(data) : data;
      const formattedJson = JSON.stringify(jsonData)
        .replace(/"(\w+)":/g, '\x1b[36m"$1"\x1b[0m:') // Key'leri cyan renk yap
        .replace(/: "([^"]+)"/g, ': \x1b[33m"$1"\x1b[0m') // String değerleri sarı yap
        .replace(/: (\d+\.?\d*)/g, ': \x1b[32m$1\x1b[0m'); // Sayısal değerleri yeşil yap
      if (debug) {
        console.log('\x1b[35mRESPONSE ' + req.originalUrl + ' :\x1b[0m', formattedJson);
      }
    } catch (e) {
      if (debug) {
        console.log('\x1b[35mRESPONSE ' + req.originalUrl + ' :\x1b[0m ', data);
      }
    }
    oldSend.apply(res, arguments);
  };
  next();
});

app.use(cors({
  origin: ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:8081', 'http://127.0.0.1:8081', 'https://miniapp.orcatradebot.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-telegram-id', 'x-login-hash'] // x-telegram-id ve x-login-hash ekle
}));

// Body parsers - JSON ve TEXT kabul et
app.use(express.json());
app.use(express.text({ type: 'text/plain' })); 

// Test database connection
app.get('/api/check-connection', async (req, res) => {
  try {
    console.log('Checking database connection...');
    const connection = await pool.getConnection();
    console.log('Database connection successful');
    connection.release();
    res.json({ isConnected: true });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ 
      isConnected: false, 
      error: error.message 
    });
  }
});


// Use all imported routers
app.use('/api', adminRoutes);
app.use('/api', apiKeyRoutes);
app.use('/api', authRoutes);
app.use('/api', backtestRoutes);
app.use('/api', channelRoutes);
app.use('/api', faqRoutes);
app.use('/api', signalRoutes);
app.use('/api', subscriptionRoutes);
app.use('/api', tradeRoutes);
app.use('/api', userRoutes);
app.use('/api', channelOwnerRoutes);
app.use('/api', supportbotRoutes);
app.use('/api', systemPromptRoutes);


// LOG GÖRÜNTÜLEYİCİ İÇİN ESKİ STREAMING ENDPOINT'İNİ KALDIRIP YENİSİNİ EKLİYORUZ.
app.get('/api/get_logs/:filename', (req, res) => {
    const { filename } = req.params;

    // Güvenlik için sadece dosya adını alıp, dizin değiştirme gibi karakterleri temizliyoruz.
    const sanitizedFilename = path.basename(filename);
    
    let logFilePath;
    logFilePath = path.join('/home/user/mini_app/server/', sanitizedFilename);

    // Dosyanın var olup olmadığını kontrol edelim
    if (!fs.existsSync(logFilePath)) {
        return res.status(404).json({ error: 'Log dosyası bulunamadı.' });
    }

    // `tail` komutu ile dosyanın son 50 satırını oku
    exec(`tail -n 50 "${logFilePath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).json({ error: 'Log okunurken bir hata oluştu.', details: stderr });
        }
        res.setHeader('Content-Type', 'application/json');
        res.json({ logs: stdout });
    });
});

// Eski SSE (Server-Sent Events) endpoint'i - Artık kullanılmıyor.
app.get('/api/stream_logs/:filename', (req, res) => {
    const { filename } = req.params;

    // Güvenlik için sadece dosya adını alıp, dizin değiştirme gibi karakterleri temizliyoruz.
    const sanitizedFilename = path.basename(filename);
    const logFilePath = `/home/user/mini_app/server/${sanitizedFilename}`;

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });

    // Dosyanın var olup olmadığını kontrol edelim
    if (!fs.existsSync(logFilePath)) {
        res.write(`data: Log dosyası bulunamadı: ${logFilePath}\n\n`);
        res.end();
        return;
    }

    const tail = spawn('tail', ['-f', '-n', '100', logFilePath]);

    tail.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
            if (line) {
                res.write(`data: ${line}\n\n`);
            }
        });
    });

    tail.stderr.on('data', (data) => {
        console.error(`tail stderr: ${data}`);
        res.write(`data: Hata: ${data.toString()}\n\n`);
    });

    req.on('close', () => {
        tail.kill();
    });
});


// Frontend için statik dosya servisi (eğer frontend build dosyaları ana dizindeyse)
app.use(express.static(join(__dirname, '..', 'dist'))); // Frontend build klasörünüzün yolu

// Bilinmeyen tüm GET isteklerini index.html'e yönlendir (Client-side routing için)
app.get('*', (req, res) => {
  // API isteklerini hariç tut
  if (req.path.startsWith('/api/')) {
    return res.status(404).send('API endpoint not found');
  }
  // index.html için önbelleği devre dışı bırak
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.sendFile(join(__dirname, '..', 'dist', 'index.html')); // Frontend build klasörünüzdeki index.html yolu
});


// Sunucuyu başlat
const startServer = () => {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`API test endpoint: http://localhost:${port}/api/check-connection`);
  });
};

try {
  startServer();
} catch (error) {
  console.error('Failed to start server:', error);
}