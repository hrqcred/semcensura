const { createClient } = require('redis');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  var params = new URL('https://x' + req.url).searchParams;
  if (params.get('pwd') !== '1897') {
    return res.status(401).json({ error: 'unauthorized' });
  }

  var redisUrl = process.env.KV_URL || process.env.REDIS_URL;
  if (!redisUrl) {
    return res.status(200).json({
      configured: false,
      today: {},
      days: [],
      usernames: [],
      events: []
    });
  }

  var client = createClient({ url: redisUrl });
  try {
    await client.connect();

    var NUM_DAYS = 30;
    var dayKeys = [];
    for (var i = 0; i < NUM_DAYS; i++) {
      var d = new Date();
      d.setDate(d.getDate() - i);
      dayKeys.push('day:' + d.toISOString().slice(0, 10));
    }

    var multi = client.multi();
    dayKeys.forEach(function(k) { multi.hGetAll(k); });
    multi.zRangeWithScores('usernames', 0, 9, { REV: true });
    multi.lRange('events', 0, 49);

    var results = await multi.exec();

    var days = [];
    for (var i = 0; i < NUM_DAYS; i++) {
      var raw = results[i] || {};
      var obj = {};
      for (var k in raw) obj[k] = parseInt(raw[k]) || 0;
      days.push({ date: dayKeys[i].replace('day:', ''), ...obj });
    }

    var usernamesRaw = results[NUM_DAYS] || [];
    var usernames = usernamesRaw.map(function(item) {
      return { name: item.value, count: item.score };
    });

    var eventsRaw = results[NUM_DAYS + 1] || [];
    var events = eventsRaw.map(function(e) {
      try { return JSON.parse(e); } catch(x) { return null; }
    }).filter(Boolean);

    await client.quit();

    return res.status(200).json({
      configured: true,
      today: days[0] || {},
      days: days,
      usernames: usernames,
      events: events
    });
  } catch (e) {
    try { await client.quit(); } catch(x) {}
    return res.status(500).json({ error: e.message });
  }
};
