const https = require('https');
const http = require('http');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const reqUrl = new URL('https://placeholder.com' + req.url);
  const imgUrl = reqUrl.searchParams.get('url');

  if (!imgUrl) {
    return res.status(400).json({ error: 'url required' });
  }

  let parsed;
  try {
    parsed = new URL(imgUrl);
  } catch (e) {
    return res.status(400).json({ error: 'invalid url' });
  }

  const mod = parsed.protocol === 'https:' ? https : http;

  mod.get(imgUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      'Accept': 'image/*',
      'Referer': 'https://www.instagram.com/',
    }
  }, (proxyRes) => {
    if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
      res.writeHead(302, { 'Location': '/api/img-proxy?url=' + encodeURIComponent(proxyRes.headers.location) });
      return res.end();
    }
    res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(proxyRes.statusCode);
    proxyRes.pipe(res);
  }).on('error', (e) => {
    res.status(502).json({ error: e.message });
  });
};
