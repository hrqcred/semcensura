module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  var params = new URL('https://x' + req.url).searchParams;
  var pwd = params.get('pwd');
  if (pwd !== '1897') {
    return res.status(401).json({ error: 'unauthorized' });
  }

  var url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
  var token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

  if ((!url || !token) && process.env.REDIS_URL) {
    try {
      var parsed = new URL(process.env.REDIS_URL);
      url = 'https://' + parsed.hostname;
      token = parsed.password;
    } catch(e) {}
  }

  if (!url || !token) {
    return res.status(200).json({
      configured: false,
      today: {},
      days: [],
      usernames: [],
      events: []
    });
  }

  async function redis(...commands) {
    var r = await fetch(url + '/pipeline', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commands)
    });
    return r.json();
  }

  var NUM_DAYS = 30;

  var dayKeys = [];
  for (var i = 0; i < NUM_DAYS; i++) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    dayKeys.push('day:' + d.toISOString().slice(0, 10));
  }

  var commands = dayKeys.map(function(k) { return ['HGETALL', k]; });
  commands.push(['ZREVRANGEBYSCORE', 'usernames', '+inf', '-inf', 'WITHSCORES', 'LIMIT', '0', '10']);
  commands.push(['LRANGE', 'events', '0', '49']);

  try {
    var results = await redis(...commands);

    var days = [];
    for (var i = 0; i < NUM_DAYS; i++) {
      var raw = results[i].result || {};
      var obj = {};
      if (Array.isArray(raw)) {
        for (var j = 0; j < raw.length; j += 2) obj[raw[j]] = parseInt(raw[j+1]) || 0;
      } else {
        for (var k in raw) obj[k] = parseInt(raw[k]) || 0;
      }
      days.push({
        date: dayKeys[i].replace('day:', ''),
        ...obj
      });
    }

    var usernamesRaw = results[NUM_DAYS].result || [];
    var usernames = [];
    if (Array.isArray(usernamesRaw)) {
      for (var i = 0; i < usernamesRaw.length; i += 2) {
        usernames.push({ name: usernamesRaw[i], count: parseInt(usernamesRaw[i+1]) || 0 });
      }
    }

    var eventsRaw = results[NUM_DAYS + 1].result || [];
    var events = eventsRaw.map(function(e) {
      try { return JSON.parse(e); } catch(x) { return null; }
    }).filter(Boolean);

    return res.status(200).json({
      configured: true,
      today: days[0] || {},
      days: days,
      usernames: usernames,
      events: events
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
