module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return res.status(200).json({ ok: true, skip: true });
  }

  const params = new URL('https://x' + req.url).searchParams;
  const stage = params.get('stage');
  if (!stage) return res.status(400).json({ error: 'stage required' });

  const username = params.get('username') || '';
  const day = new Date().toISOString().slice(0, 10);
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  const device = /mobile|android|iphone|ipad/i.test(ua) ? 'mobile' : 'desktop';
  const ref = params.get('ref') || 'direto';

  const commands = [
    ['HINCRBY', 'day:' + day, stage, 1],
    ['HINCRBY', 'day:' + day, 'device:' + device, 1],
  ];

  if (username) {
    commands.push(['ZINCRBY', 'usernames', 1, username.toLowerCase()]);
  }

  var event = JSON.stringify({
    t: Date.now(),
    s: stage,
    u: username,
    d: device,
    r: ref
  });
  commands.push(['LPUSH', 'events', event]);
  commands.push(['LTRIM', 'events', 0, 49]);

  try {
    await fetch(url + '/pipeline', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commands)
    });
  } catch (e) {}

  // 1x1 transparent gif
  var gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.setHeader('Content-Type', 'image/gif');
  res.status(200).end(gif);
};
