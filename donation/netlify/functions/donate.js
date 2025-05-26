const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body);
    const {
      amount, firstName, lastName, address, apt, displayName, anonymous, city, state, zip, email, phone, cardNumber, exp, cvv, note, recaptchaToken, cardknoxApiKey
    } = data;

    // 1. Verify reCAPTCHA
    const recaptchaSecret = process.env.RECAPTCHA_SECRET || '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe'; // Google test secret
    const recaptchaRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${recaptchaSecret}&response=${recaptchaToken}`
    });
    const recaptchaJson = await recaptchaRes.json();
    if (!recaptchaJson.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'reCAPTCHA verification failed' })
      };
    }

    // 2. Process payment with Cardknox
    const cardknoxPayload = new URLSearchParams({
      key: cardknoxApiKey,
      amount: amount.toString(),
      cc: cardNumber,
      exp: exp,
      cvv: cvv,
      zip: zip,
      name: `${firstName} ${lastName}`,
      email: email,
      address: address,
      city: city,
      state: state,
      note: note || '',
      phone: phone || '',
      invoice: displayName || '',
      anonymous: anonymous ? 'yes' : 'no',
      apt: apt || ''
    });

    const cardknoxRes = await fetch('https://x1.cardknox.com/gateway', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: cardknoxPayload.toString()
    });
    const cardknoxText = await cardknoxRes.text();

    // Parse Cardknox response
    const result = {};
    cardknoxText.split('&').forEach(pair => {
      const [k, v] = pair.split('=');
      result[k] = decodeURIComponent(v || '');
    });

    if (result.xResult === 'A') {
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'success', cardknox: cardknoxText })
      };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ status: 'error', error: result.xError || 'Payment failed', cardknox: cardknoxText })
      };
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Server error' })
    };
  }
};
