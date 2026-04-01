/**
 * PainelPRO — Proxy Server
 * Compatível com Render.com e qualquer ambiente Node.js
 */

const http  = require('http');
const https = require('https');

// Render injeta PORT automaticamente — fallback 3000 para uso local
const PORT    = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_KEY || 'AIzaSyBmqt4bDXT4hLrssb6u5GHPD0Uof-V26pc';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function proxyAnthropic(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {

    let payload;
    try {
      payload = Buffer.from(body); // já é JSON vindo do browser
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Body inválido' }));
      return;
    }

    const options = {
      hostname: 'api.anthropic.com',
      path:     '/v1/messages',
      method:   'POST',
      headers: {
        'Content-Type':      'application/json',
        'Content-Length':    payload.length,
        'x-api-key':         API_KEY,
        'anthropic-version': '2023-06-01',
      }
    };

    const apiReq = https.request(options, apiRes => {
      let data = '';
      apiRes.on('data', chunk => { data += chunk; });
      apiRes.on('end', () => {
        setCors(res);
        res.writeHead(apiRes.statusCode, { 'Content-Type': 'application/json' });
        res.end(data);
      });
    });

    apiReq.on('error', err => {
      setCors(res);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    });

    apiReq.write(payload);
    apiReq.end();
  });
}

const server = http.createServer((req, res) => {

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    setCors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  // Rota do proxy
  if (req.method === 'POST' && req.url === 'https://planodenegocio.onrender.com//api/anthropic') {
    proxyAnthropic(req, res);
    return;
  }

  // Health check — o Render usa isso para saber se o serviço está vivo
  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    setCors(res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'PainelPRO Proxy' }));
    return;
  }

  // Qualquer outra rota
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Rota não encontrada' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`PainelPRO proxy rodando na porta ${PORT}`);
});
