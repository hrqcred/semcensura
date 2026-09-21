module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  var body = req.body || {};
  var name = (body.name || '').trim();
  var email = (body.email || '').trim();
  var cpf = (body.cpf || '').replace(/\D/g, '');
  var phone = (body.phone || '').replace(/\D/g, '');

  if (!name || !email || !cpf || cpf.length !== 11) {
    return res.status(400).json({ error: 'Campos obrigatórios: name, email, cpf (11 dígitos)' });
  }
  if (!phone || phone.length < 10) phone = '00000000000';

  var clientId = process.env.SYNCPAY_CLIENT_ID;
  var clientSecret = process.env.SYNCPAY_CLIENT_SECRET;
  var amount = parseFloat(process.env.SYNCPAY_AMOUNT || '19.90');
  var baseUrl = 'https://api.syncpayments.com.br';

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Payment gateway not configured' });
  }

  try {
    var authRes = await fetch(baseUrl + '/api/partner/v1/auth-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret })
    });
    var authData = await authRes.json();
    if (!authData.access_token) {
      return res.status(500).json({ error: 'Auth failed' });
    }

    var webhookUrl = (process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'https://www.descobreaqinsta.com.br') + '/api/webhook';

    var pixRes = await fetch(baseUrl + '/api/partner/v1/cash-in', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + authData.access_token
      },
      body: JSON.stringify({
        amount: amount,
        description: 'DescobreAqui - Acesso Completo',
        webhook_url: webhookUrl,
        client: {
          name: name,
          cpf: cpf,
          email: email,
          phone: phone
        }
      })
    });

    var pixData = await pixRes.json();

    if (!pixRes.ok) {
      return res.status(pixRes.status).json({ error: 'PIX generation failed', details: pixData });
    }

    return res.status(200).json({
      pix_code: pixData.pix_code,
      identifier: pixData.identifier,
      amount: amount
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
