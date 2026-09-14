const https = require('https');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const reqUrl = new URL('https://placeholder.com' + req.url);
  const username = reqUrl.searchParams.get('username');

  if (!username) {
    return res.status(400).json({ error: 'username required' });
  }

  const cleanUsername = username.replace(/^@+/, '').trim();

  const targetPath = '/api/proxy?path=' + encodeURIComponent('/api/instagram.php?tipo=perfil&username=' + encodeURIComponent(cleanUsername));

  const options = {
    hostname: 'stalkeai.com.br',
    path: targetPath,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'pt-BR,pt;q=0.9',
      'Referer': 'https://stalkeai.com.br/',
      'Origin': 'https://stalkeai.com.br',
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    let body = '';
    proxyRes.on('data', (chunk) => { body += chunk; });
    proxyRes.on('end', () => {
      try {
        const data = JSON.parse(body);

        if (data.error) {
          return res.status(404).json({ error: data.error });
        }

        var picUrl = data.profile_pic_url || data.profile_pic_url_hd || '';
        if (picUrl && picUrl.startsWith('/api/img?url=')) {
          try {
            var imgParam = new URL('https://stalkeai.com.br' + picUrl).searchParams.get('url');
            if (imgParam) picUrl = imgParam;
          } catch(e) {}
        } else if (picUrl && picUrl.startsWith('/')) {
          picUrl = 'https://stalkeai.com.br' + picUrl;
        }

        res.status(200).json({
          username: data.username || cleanUsername,
          full_name: data.full_name || '',
          biography: data.biography || '',
          media_count: data.media_count || 0,
          follower_count: data.follower_count || 0,
          following_count: data.following_count || 0,
          profile_pic_url: picUrl,
          is_private: data.is_private || false,
          is_verified: data.is_verified || false,
        });
      } catch (e) {
        res.status(500).json({ error: 'parse error', raw: body.substring(0, 200) });
      }
    });
  });

  proxyReq.on('error', (e) => {
    res.status(502).json({ error: e.message });
  });

  proxyReq.end();
};
