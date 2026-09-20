const { createClient } = require('redis');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  var params = new URL('https://x' + req.url).searchParams;
  var action = params.get('action');

  // Public check — no auth needed
  if (action === 'check') {
    var id = params.get('id');
    if (!id) return res.status(200).json({ valid: false });

    var redisUrl = process.env.KV_URL || process.env.REDIS_URL;
    if (!redisUrl) return res.status(200).json({ valid: false });

    var client = createClient({ url: redisUrl });
    try {
      await client.connect();
      var config = await client.get('utm:config');
      await client.quit();
      if (!config) return res.status(200).json({ valid: false });
      var cfg = JSON.parse(config);
      return res.status(200).json({ valid: cfg.key === id });
    } catch (e) {
      try { await client.quit(); } catch (x) {}
      return res.status(200).json({ valid: false });
    }
  }

  // Admin actions — require auth
  if (params.get('pwd') !== '1897') {
    return res.status(401).json({ error: 'unauthorized' });
  }

  var redisUrl = process.env.KV_URL || process.env.REDIS_URL;
  if (!redisUrl) {
    return res.status(200).json({ configured: false });
  }

  var client = createClient({ url: redisUrl });
  try {
    await client.connect();

    if (action === 'get') {
      var config = await client.get('utm:config');
      await client.quit();
      if (!config) {
        return res.status(200).json({ configured: true, data: null });
      }
      return res.status(200).json({ configured: true, data: JSON.parse(config) });
    }

    if (action === 'generate') {
      var config = await client.get('utm:config');
      var cfg = config ? JSON.parse(config) : {
        source: 'facebook',
        medium: 'cpc',
        campaign: 'descobreaqui',
        content: '',
        term: ''
      };
      var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      var key = '';
      for (var i = 0; i < 12; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      cfg.key = key;
      cfg.generated_at = new Date().toISOString();
      await client.set('utm:config', JSON.stringify(cfg));
      await client.quit();
      return res.status(200).json({ configured: true, data: cfg });
    }

    if (action === 'save') {
      var body = '';
      for await (var chunk of req) body += chunk;
      var updates = JSON.parse(body);
      var config = await client.get('utm:config');
      var cfg = config ? JSON.parse(config) : {};
      if (updates.source !== undefined) cfg.source = updates.source;
      if (updates.medium !== undefined) cfg.medium = updates.medium;
      if (updates.campaign !== undefined) cfg.campaign = updates.campaign;
      if (updates.content !== undefined) cfg.content = updates.content;
      if (updates.term !== undefined) cfg.term = updates.term;
      if (updates.site_url !== undefined) cfg.site_url = updates.site_url;
      await client.set('utm:config', JSON.stringify(cfg));
      await client.quit();
      return res.status(200).json({ configured: true, data: cfg });
    }

    await client.quit();
    return res.status(400).json({ error: 'invalid action' });
  } catch (e) {
    try { await client.quit(); } catch (x) {}
    return res.status(500).json({ error: e.message });
  }
};
