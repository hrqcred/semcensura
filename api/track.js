const { createClient } = require('redis');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  var redisUrl = process.env.KV_URL || process.env.REDIS_URL;
  if (!redisUrl) {
    var gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.setHeader('Content-Type', 'image/gif');
    return res.status(200).end(gif);
  }

  var params = new URL('https://x' + req.url).searchParams;
  var stage = params.get('stage');
  if (!stage) return res.status(400).json({ error: 'stage required' });

  var username = params.get('username') || '';
  var day = new Date().toISOString().slice(0, 10);
  var ua = (req.headers['user-agent'] || '').toLowerCase();
  var device = /mobile|android|iphone|ipad/i.test(ua) ? 'mobile' : 'desktop';
  var ref = params.get('ref') || 'direto';

  var client = createClient({ url: redisUrl });
  try {
    await client.connect();

    var multi = client.multi();
    multi.hIncrBy('day:' + day, stage, 1);
    multi.hIncrBy('day:' + day, 'device:' + device, 1);

    if (username) {
      multi.zIncrBy('usernames', 1, username.toLowerCase());
    }

    var event = JSON.stringify({
      t: Date.now(),
      s: stage,
      u: username,
      d: device,
      r: ref
    });
    multi.lPush('events', event);
    multi.lTrim('events', 0, 49);

    await multi.exec();
    await client.quit();
  } catch (e) {
    try { await client.quit(); } catch(x) {}
  }

  var gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.setHeader('Content-Type', 'image/gif');
  res.status(200).end(gif);
};
