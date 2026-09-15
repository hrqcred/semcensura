module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  var url = process.env.KV_REST_API_URL;
  var token = process.env.KV_REST_API_TOKEN;

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

  var today = new Date().toISOString().slice(0, 10);

  var dayKeys = [];
  for (var i = 0; i < 7; i++) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    dayKeys.push('day:' + d.toISOString().slice(0, 10));
  }

  var commands = dayKeys.map(function(k) { return ['HGETALL', k]; });
  commands.push(['ZREVRANGEBYSCORE', 'usernames', '+inf', '-inf', 'WITHSCORES', 'LIMIT', '0', '10']);
  commands.push(['LRANGE', 'events', '0', '29']);

  try {
    var results = await redis(...commands);

    var days = [];
    for (var i = 0; i < 7; i++) {
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

    var usernamesRaw = results[7].result || [];
    var usernames = [];
    if (Array.isArray(usernamesRaw)) {
      for (var i = 0; i < usernamesRaw.length; i += 2) {
        usernames.push({ name: usernamesRaw[i], count: parseInt(usernamesRaw[i+1]) || 0 });
      }
    }

    var eventsRaw = results[8].result || [];
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
