function generateValidCPF() {
  var n = [];
  for (var i = 0; i < 9; i++) n.push(Math.floor(Math.random() * 9));
  var d1 = 0;
  for (var i = 0; i < 9; i++) d1 += n[i] * (10 - i);
  d1 = 11 - (d1 % 11);
  if (d1 >= 10) d1 = 0;
  n.push(d1);
  var d2 = 0;
  for (var i = 0; i < 10; i++) d2 += n[i] * (11 - i);
  d2 = 11 - (d2 % 11);
  if (d2 >= 10) d2 = 0;
  n.push(d2);
  return n.join('');
}

var NAMES = [
  'Usuario DescobreAqui', 'Cliente Anonimo', 'Acesso Sigiloso',
  'Consulta Privada', 'Verificacao Segura', 'Analise Discreta'
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  var clientId = (process.env.SYNCPAY_CLIENT_ID || '').trim();
  var clientSecret = (process.env.SYNCPAY_CLIENT_SECRET || '').trim();
  var amount = parseFloat(process.env.SYNCPAY_AMOUNT || '19.90');
  var baseUrl = 'https://api.syncpayments.com.br';

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Payment gateway not configured' });
  }

  var name = NAMES[Math.floor(Math.random() * NAMES.length)];
  var cpf = generateValidCPF();
  var email = 'descobreaquicomsigilo@gmail.com';
  var phone = '11999999999';

  try {
    var authRes = await fetch(baseUrl + '/api/partner/v1/auth-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret })
    });
    var authData = await authRes.json();
    if (!authData.access_token) {
      return res.status(500).json({ error: 'Auth failed', status: authRes.status, details: authData });
    }

    var webhookUrl = 'https://www.descobreaqinsta.com.br/api/webhook';

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
