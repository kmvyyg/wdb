import express from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Configure CORS to accept GitHub Codespace domain
app.use(cors({
  origin: [
    'http://localhost:5173',
    /^https:\/\/.*\.app\.github\.dev$/  // Allow any GitHub Codespace domain
  ],
  credentials: true
}));

app.use(express.json());

// Add a test endpoint
app.get('/', (req, res) => {
  res.send('Donation server is running');
});

// Validation helpers
const validateInput = {
  amount: (amt) => amt > 0,
  cardNumber: (num) => /^[0-9]{15,16}$/.test(num.replace(/\D/g, '')),
  exp: (exp) => /^[0-9]{2}\/[0-9]{2}$/.test(exp),
  cvv: (cvv) => /^[0-9]{3,4}$/.test(cvv),
  zip: (zip) => /^[0-9]{5}$/.test(zip)
};

// Add this helper for reCAPTCHA verification
async function verifyRecaptcha(token) {
  const secret = process.env.RECAPTCHA_SECRET_KEY || '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe'; // Google test secret
  try {
    const res = await axios.post('https://www.google.com/recaptcha/api/siteverify', new URLSearchParams({
      secret,
      response: token
    }));
    return res.data && res.data.success;
  } catch (err) {
    console.error('reCAPTCHA verification error:', err);
    return false;
  }
}

app.post('/api/donate', async (req, res) => {
  try {
    const {
      amount,
      cardNumber,
      exp,
      cvv,
      phone,
      firstName,
      lastName,
      address,
      apt,
      city,
      state,
      zip,
      email,
      displayName,
      anonymous,
      note,
      recaptchaToken
    } = req.body;

    // reCAPTCHA validation
    if (!recaptchaToken) {
      return res.status(400).json({ error: 'Missing reCAPTCHA token' });
    }
    const recaptchaValid = await verifyRecaptcha(recaptchaToken);
    if (!recaptchaValid) {
      return res.status(400).json({ error: 'reCAPTCHA validation failed. Please try again.' });
    }

    // Basic validation
    if (!validateInput.amount(amount)) {
      return res.status(400).json({ error: 'Invalid donation amount' });
    }
    if (!validateInput.cardNumber(cardNumber)) {
      return res.status(400).json({ error: 'Invalid card number' });
    }
    if (!validateInput.exp(exp)) {
      return res.status(400).json({ error: 'Invalid expiration date' });
    }
    if (!validateInput.cvv(cvv)) {
      return res.status(400).json({ error: 'Invalid CVV' });
    }
    if (!validateInput.zip(zip)) {
      return res.status(400).json({ error: 'Invalid ZIP code' });
    }

    // Format address and data
    const fullAddress = apt ? `${address}, Apt ${apt}` : address;
    const expDate = exp.replace('/', '');

    // Prepare Cardknox API payload
    const cardknoxPayload = {
      xKey: req.body.cardknoxApiKey || process.env.CARDKNOX_API_KEY || 'test_key',
      xVersion: '4.5.6',
      xSoftwareVersion: '4.5.6',
      xSoftwareName: 'DonationWeb',
      xCommand: 'cc:sale',
      xAmount: amount.toString(),
      xCardNum: cardNumber.replace(/\D/g, ''),
      xExp: expDate,
      xCVV: cvv,
      xZip: zip,
      xBillFirstName: firstName,
      xBillLastName: lastName,
      xBillStreet: fullAddress,
      xBillCity: city,
      xBillState: state,
      xEmail: email,
      xCustom01: displayName || `${firstName} ${lastName}`,
      xCustom02: anonymous ? 'true' : 'false',
      xCustom03: note || ''
    };
    // Do NOT add xPhone at all

    // Send to Cardknox
    try {
      const cardknoxRes = await axios.post('https://x1.cardknox.com/gateway', new URLSearchParams(cardknoxPayload));
      const cardknoxData = cardknoxRes.data;

      if (cardknoxData.xResult === 'A') {
        res.json({
          status: 'success',
          transactionId: cardknoxData.xTransId,
          amount: amount,
          message: 'Donation processed successfully',
          cardknox: cardknoxData
        });
      } else {
        console.error('Cardknox error:', cardknoxData);
        res.status(400).json({
          error: cardknoxData.xError || 'Payment failed',
          cardknox: cardknoxData
        });
      }
    } catch (apiErr) {
      console.error('Cardknox API request failed:', apiErr?.response?.data || apiErr);
      res.status(500).json({ error: 'Payment gateway error', details: apiErr?.response?.data || apiErr.message });
    }

  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ 
      error: 'Payment processing failed. Please try again.' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
