const { createClient } = require('redis');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true });
  }

  var redisUrl = process.env.KV_URL || process.env.REDIS_URL;
  if (!redisUrl) return res.status(200).json({ ok: true });

  var body = req.body || {};

  // SyncPay CashIn webhooks wrap in data object
  var d = body.data || body;

  var status = (d.status || d.payment_status || '').toLowerCase();

  if (status !== 'approved' && status !== 'paid' && status !== 'completed') {
    return res.status(200).json({ received: true, action: 'ignored', status: status });
  }

  var day = new Date().toISOString().slice(0, 10);
  var email = d.customer_email || d.email || (d.client && d.client.email) || '';
  var name = (d.client && d.client.name) || d.customer_name || '';
  var value = d.amount || d.value || d.final_amount || 0;
  var method = d.payment_method || 'pix';

  var client = createClient({ url: redisUrl });
  try {
    await client.connect();

    var multi = client.multi();
    multi.hIncrBy('day:' + day, 'sale', 1);
    if (value) {
      multi.hIncrBy('day:' + day, 'revenue', Math.round(Number(value) * 100));
    }

    var event = JSON.stringify({
      t: Date.now(),
      s: 'sale',
      u: email || name || 'cliente',
      d: method,
      r: 'R$ ' + Number(value).toFixed(2).replace('.', ',')
    });
    multi.lPush('events', event);
    multi.lTrim('events', 0, 49);

    await multi.exec();

    await client.quit();
  } catch (e) {
    try { await client.quit(); } catch (_) {}
  }

  return res.status(200).json({ received: true, action: 'tracked' });
};
