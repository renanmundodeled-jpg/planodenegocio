/**
 * PainelPRO — Proxy Server
 * Resolve o erro CORS ao chamar a API da Anthropic de um arquivo local.
 *
 * COMO USAR:
 *   1. Instale o Node.js (https://nodejs.org) se ainda não tiver
 *   2. Abra o terminal nesta pasta
 *   3. Execute:  node server.js
 *   4. Acesse:  http://localhost:3000
 *
 * Não precisa instalar nada extra — usa apenas módulos nativos do Node.js
 */

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const url   = require('url');

const PORT     = 3000;
const API_KEY  = 'AIzaSyBmqt4bDXT4hLrssb6u5GHPD0Uof-V26pc'; // chave embutida — não exposta ao browser

// ── Tipos MIME básicos ──────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
};

// ── Cabeçalhos CORS ─────────────────────────────────────────────
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ── Proxy para a Anthropic API ──────────────────────────────────
function proxyAnthropic(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {

    let parsed;
    try { parsed = JSON.parse(body); }
    catch(e) { res.writeHead(400); res.end(JSON.stringify({error:'Body inválido'})); return; }

    const payload = Buffer.from(JSON.stringify(parsed));

    const options = {
      hostname: 'api.anthropic.com',
      path:     '/v1/messages',
      method:   'POST',
      headers: {
        'Content-Type':      'application/json',
        'Content-Length':    payload.length,
        'x-api-key':         API_KEY,          // chave injetada pelo servidor
        'anthropic-version': '2023-06-01',
      }
    };

    const apiReq = https.request(options, apiRes => {
      let data = '';
      apiRes.on('data', chunk => { data += chunk; });
      apiRes.on('end', () => {
        cors(res);
        res.writeHead(apiRes.statusCode, { 'Content-Type': 'application/json' });
        res.end(data);
      });
    });

    apiReq.on('error', err => {
      cors(res);
      res.writeHead(502);
      res.end(JSON.stringify({ error: 'Erro ao contatar a API: ' + err.message }));
    });

    apiReq.write(payload);
    apiReq.end();
  });
}

// ── Servidor HTTP ───────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    cors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  // Rota do proxy
  if (req.method === 'POST' && parsed.pathname === '/api/anthropic') {
    proxyAnthropic(req, res);
    return;
  }

  // Arquivos estáticos — serve o HTML e qualquer outro arquivo da pasta
  let filePath = parsed.pathname === '/' ? '/plano_negocio_led.html' : parsed.pathname;
  filePath = path.join(__dirname, filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Arquivo não encontrado: ' + parsed.pathname);
      return;
    }
    const ext  = path.extname(filePath);
    const mime = MIME[ext] || 'text/plain';
    cors(res);
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ✅ PainelPRO rodando em: http://localhost:' + PORT);
  console.log('  📡 Proxy da API ativo em: http://localhost:' + PORT + '/api/anthropic');
  console.log('');
  console.log('  Abra http://localhost:' + PORT + ' no navegador.');
  console.log('  Para encerrar: Ctrl + C');
  console.log('');
});
