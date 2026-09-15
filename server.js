const http = require('http');
const fs = require('fs');
const path = require('path');
const proxyHandler = require('./api/proxy');

const PORT = process.env.PORT || 8080;
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/img-proxy')) {
    const imgUrl = new URL('http://localhost' + req.url).searchParams.get('url');
    if (!imgUrl) {
      res.writeHead(400);
      return res.end('url required');
    }
    const parsed = new URL(imgUrl);
    const mod = parsed.protocol === 'https:' ? require('https') : require('http');
    mod.get(imgUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)',
        'Accept': 'image/*',
        'Referer': 'https://www.instagram.com/',
      }
    }, (proxyRes) => {
      if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
        res.writeHead(302, { 'Location': '/api/img-proxy?url=' + encodeURIComponent(proxyRes.headers.location) });
        return res.end();
      }
      res.writeHead(proxyRes.statusCode, {
        'Content-Type': proxyRes.headers['content-type'] || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      });
      proxyRes.pipe(res);
    }).on('error', () => {
      res.writeHead(502);
      res.end('proxy error');
    });
    return;
  }

  if (req.url.startsWith('/api/proxy')) {
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    };
    return proxyHandler(req, res);
  }

  let filePath = req.url.split('?')[0];
  if (filePath === '/') filePath = '/index.html';
  if (filePath === '/feed') filePath = '/feed.html';
  if (filePath === '/dm') filePath = '/dm.html';
  if (filePath === '/cta') filePath = '/cta.html';
  if (filePath === '/obrigado') filePath = '/obrigado.html';
  filePath = path.join(__dirname, filePath);

  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('Server running at http://localhost:' + PORT);
});
