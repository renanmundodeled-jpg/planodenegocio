/**
 * PainelPRO — Proxy Server (VERSÃO CORRIGIDA)
 * Compatível com Render.com e Node.js
 */

const http  = require('http');
const https = require('https');

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_KEY; // coloque no Render (Environment)

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function proxyAnthropic(req, res) {
  let body = '';

  req.on('data', chunk => {
    body += chunk;
  });

  req.on('end', () => {
    let payload;

    try {
      payload = JSON.parse(body);
    } catch (err) {
      setCors(res);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'JSON inválido' }));
    }

    const data = JSON.stringify(payload);

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      }
    };

    const apiReq = https.request(options, apiRes => {
      let response = '';

      apiRes.on('data', chunk => {
        response += chunk;
      });

      apiRes.on('end', () => {
        setCors(res);
        res.writeHead(apiRes.statusCode || 200, {
          'Content-Type': 'application/json'
        });
        res.end(response);
      });
    });

    apiReq.on('error', err => {
      setCors(res);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    });

    apiReq.write(data);
    apiReq.end();
  });
}

const server = http.createServer((req, res) => {

  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  // Preflight (CORS)
  if (req.method === 'OPTIONS') {
    setCors(res);
    res.writeHead(204);
    return res.end();
  }

  // Rota do proxy
  if (req.method === 'POST' && req.url === '/api/anthropic') {
    return proxyAnthropic(req, res);
  }

  // Health check (Render usa isso)
  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    setCors(res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'ok',
      service: 'PainelPRO Proxy'
    }));
  }



  
const fs = require('fs');
const path = require('path');

if (req.method === 'GET' && req.url === '/') {
  const filePath = path.join(__dirname, 'plano_negocio_led.html');

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      return res.end('Erro ao carregar HTML');
    }

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });

  return;
}
  


  
  // Rota não encontrada
  setCors(res);
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Rota não encontrada' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 PainelPRO rodando na porta ${PORT}`);
});
