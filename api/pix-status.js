module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  var params = new URL('https://x' + req.url).searchParams;
  var identifier = params.get('id');
  if (!identifier) return res.status(400).json({ error: 'id required' });

  var clientId = process.env.SYNCPAY_CLIENT_ID;
  var clientSecret = process.env.SYNCPAY_CLIENT_SECRET;
  var baseUrl = 'https://api.syncpayments.com.br';

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'not configured' });
  }

  try {
    var authRes = await fetch(baseUrl + '/api/partner/v1/auth-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret })
    });
    var authData = await authRes.json();
    if (!authData.access_token) return res.status(500).json({ error: 'auth failed' });

    var txRes = await fetch(baseUrl + '/api/partner/v1/transaction/' + encodeURIComponent(identifier), {
      headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + authData.access_token
      }
    });
    var txData = await txRes.json();

    return res.status(200).json({
      status: (txData.status || txData.data && txData.data.status || 'pending').toLowerCase(),
      amount: txData.amount || (txData.data && txData.data.amount) || 0
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
