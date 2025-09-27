import http from 'http';
import https from 'https';
import { URL } from 'url';

class phttp {
  static request(options, postData = null) {
    return new Promise((resolve, reject) => {
      let urlObj;
      // console.log('[phttp][DEBUG] Gelen options:', JSON.stringify(options));
      if (typeof options === 'string') {
        urlObj = new URL(options);
        options = {
          protocol: urlObj.protocol,
          hostname: urlObj.hostname,
          port: urlObj.port,
          path: urlObj.pathname + urlObj.search,
          method: 'GET',
        };
      } else if (options.url) {
        urlObj = new URL(options.url);
        options = {
          ...options,
          protocol: urlObj.protocol,
          hostname: urlObj.hostname,
          port: urlObj.port,
          path: urlObj.pathname + urlObj.search,
        };
        delete options.url;
      }
      // IPv4 kullan
      options.family = 4;
      // Timeout 30 saniye
      options.timeout = 30000;
      // Default method GET
      if (!options.method) options.method = 'GET';
      // Agent ayarı (keepAlive vs. gerekiyorsa eklenebilir)
      let reqModule = options.protocol === 'https:' ? https : http;
      // console.log('[phttp][DEBUG] Son istek options:', JSON.stringify(options));
      const req = reqModule.request(options, (res) => {
        let data = [];
        // console.log('[phttp][DEBUG] Yanıt alındı, statusCode:', res.statusCode, 'headers:', res.headers);
        res.on('data', chunk => data.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(data);
          const bodyString = buffer.toString();
          let jsonData = undefined;
          const contentType = res.headers['content-type'] || '';
          if (contentType.includes('application/json')) {
            try {
              jsonData = JSON.parse(bodyString);
            } catch (e) {
              jsonData = undefined;
              // console.log('[phttp][DEBUG] JSON parse hatası:', e, 'Body:', bodyString);
            }
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: buffer,
            bodyString,
            data: jsonData,
            res
          });
        });
      });
      req.on('error', (err) => {
        // console.log('[phttp][DEBUG] İstek hatası:', err);
        reject(err);
      });
      if (postData) {
        // console.log('[phttp][DEBUG] postData:', postData);
        if (typeof postData === 'string' || Buffer.isBuffer(postData)) {
          req.write(postData);
        } else if (typeof postData === 'object') {
          req.write(JSON.stringify(postData));
        }
      }
      req.end();
    });
  }
}

export default phttp;
