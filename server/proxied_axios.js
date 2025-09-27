import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { HttpProxyAgent } from 'http-proxy-agent';

const proxyUrl = process.env.PROXY_URL;

let httpAgent = null;
let httpsAgent = null;
let defaultConfig = {
  timeout: 20000,
};

if (proxyUrl) {
  console.log(`Proxy kullanılıyor: ${proxyUrl}`);
  httpAgent = new HttpProxyAgent(proxyUrl);
  httpsAgent = new HttpsProxyAgent(proxyUrl);
  defaultConfig.httpAgent = httpAgent;
  defaultConfig.httpsAgent = httpsAgent;
} else {
  // Proxy yoksa IPv4 kullan (hem http hem https için)
  defaultConfig.family = 4;
}

const proxiedAxios = axios.create(defaultConfig);

export default proxiedAxios;
