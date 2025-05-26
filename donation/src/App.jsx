import { useState, useEffect, useRef } from 'react'
import './App.css'

const SUGGESTED_AMOUNTS = [
  { label: 'צוויע נשמות', value: 340 },
  { label: 'א נשמה פאר יו"ט', value: 180 },
  { label: '20% אורסטעלן די גרעסטע אוריספארקוי', value: 220 },
  { label: 'קליינע משפחה', value: 500 },
  { label: 'מיטעלע משפחה', value: 1000 },
  { label: 'גרעסטע משפחה', value: 1800 },
];

// Card validation helpers (matching SMS/voice system)
const validateCard = {
  number: (num) => {
    const digits = num.replace(/\D/g, '');
    return /^[0-9]{15,16}$/.test(digits);
  },
  exp: (exp) => {
    if (!/^[0-9]{2}\/[0-9]{2}$/.test(exp)) return false;
    const [month, year] = exp.split('/').map(n => parseInt(n, 10));
    return month >= 1 && month <= 12;
  },
  cvv: (cvv) => /^[0-9]{3,4}$/.test(cvv),
  zip: (zip) => /^[0-9]{5}$/.test(zip)
};

function DonorInfoForm({ donorInfo, setDonorInfo }) {
  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    setDonorInfo(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <form className="donor-info-form" autoComplete="off" onSubmit={e => e.preventDefault()}>
      <div className="donor-info-row">
        <div className="donor-info-field wide">
          <label htmlFor="phone">Phone Number</label>
          <div className="phone-input-group">
            <input 
              id="phone" 
              type="tel" 
              value={donorInfo.phone} 
              onChange={handleChange} 
              required
            />
            <button type="button" className="enter-btn">Enter</button>
          </div>
        </div>
        <div className="donor-info-field">
          <label htmlFor="firstName">First Name</label>
          <input 
            id="firstName" 
            type="text" 
            value={donorInfo.firstName} 
            onChange={handleChange}
            required 
          />
        </div>
        <div className="donor-info-field">
          <label htmlFor="lastName">Last Name</label>
          <input 
            id="lastName" 
            type="text" 
            value={donorInfo.lastName} 
            onChange={handleChange}
            required 
          />
        </div>
      </div>
      <div className="donor-info-row">
        <div className="donor-info-field wide">
          <label htmlFor="address">Address</label>
          <input 
            id="address" 
            type="text" 
            placeholder="Enter a location"
            value={donorInfo.address}
            onChange={handleChange}
            required
          />
        </div>
        <div className="donor-info-field">
          <label htmlFor="apt">Apt#</label>
          <input 
            id="apt" 
            type="text" 
            value={donorInfo.apt}
            onChange={handleChange}
          />
        </div>
        <div className="donor-info-field wide">
          <label htmlFor="displayName">Name To Display</label>
          <input 
            id="displayName" 
            type="text" 
            value={donorInfo.displayName}
            onChange={handleChange}
          />
        </div>
        <div className="donor-info-field anon-field">
          <label htmlFor="anonymous">Anonymous</label>
          <input 
            id="anonymous" 
            type="checkbox" 
            style={{ marginLeft: 8 }} 
            checked={donorInfo.anonymous}
            onChange={handleChange}
          />
          <span className="info-icon" title="Your name will not be shown.">i</span>
        </div>
      </div>
      <div className="donor-info-row">
        <div className="donor-info-field">
          <label htmlFor="city">City</label>
          <input 
            id="city" 
            type="text" 
            value={donorInfo.city}
            onChange={handleChange}
            required
          />
        </div>
        <div className="donor-info-field">
          <label htmlFor="state">State</label>
          <input 
            id="state" 
            type="text" 
            value={donorInfo.state}
            onChange={handleChange}
            required
          />
        </div>
        <div className="donor-info-field">
          <label htmlFor="zip">Zip</label>
          <input 
            id="zip" 
            type="text" 
            value={donorInfo.zip}
            onChange={handleChange}
            required
          />
        </div>
        <div className="donor-info-field wide">
          <label htmlFor="email">Email Address</label>
          <input 
            id="email" 
            type="email" 
            value={donorInfo.email}
            onChange={handleChange}
            required
          />
        </div>
      </div>
    </form>
  );
}

function getCardType(number) {
  const n = number.replace(/\D/g, '');
  if (/^4/.test(n)) return 'Visa';
  if (/^5[1-5]/.test(n)) return 'Mastercard';
  if (/^6(?:011|5)/.test(n)) return 'Discover';
  if (/^3[47]/.test(n)) return 'Amex';
  return '';
}

function PaymentInfoForm({ onDonate, loading }) {
  const [cardNumber, setCardNumber] = useState('');
  const [exp, setExp] = useState('');
  const [cvv, setCvv] = useState('');
  const [note, setNote] = useState('');
  const [cardType, setCardType] = useState('');
  const [errors, setErrors] = useState({});
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const recaptchaRef = useRef(null);

  // Load reCAPTCHA script and render widget
  useEffect(() => {
    function renderRecaptcha() {
      if (window.grecaptcha && recaptchaRef.current && !recaptchaRef.current.hasChildNodes()) {
        window.grecaptcha.render(recaptchaRef.current, {
          sitekey: '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI',
          callback: (token) => setRecaptchaToken(token),
          'expired-callback': () => setRecaptchaToken(''),
          'error-callback': () => setRecaptchaToken(''),
        });
      }
    }
    if (!window.grecaptcha) {
      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = renderRecaptcha;
      document.body.appendChild(script);
    } else {
      renderRecaptcha();
    }
  }, []);

  // Card type detection and validation
  const handleCardNumber = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    let type = getCardType(value);
    setCardType(type);
    // Format with spaces for readability
    if (type === 'Amex') {
      value = value.replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3');
    } else {
      value = value.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
    }
    setCardNumber(value);
  };

  // Expiry auto-slash
  const handleExp = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length > 2) value = value.slice(0, 2) + '/' + value.slice(2);
    setExp(value);
  };

  // CVV max length by card type
  const handleCvv = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    let max = cardType === 'Amex' ? 4 : 3;
    setCvv(value.slice(0, max));
  };

  // Validation on submit
  const handleSubmit = (e) => {
    e.preventDefault();
    let errs = {};
    const digits = cardNumber.replace(/\D/g, '');
    if (cardType === 'Visa' && digits.length !== 16) errs.cardNumber = 'Visa must be 16 digits';
    if (cardType === 'Mastercard' && digits.length !== 16) errs.cardNumber = 'Mastercard must be 16 digits';
    if (cardType === 'Discover' && digits.length !== 16) errs.cardNumber = 'Discover must be 16 digits';
    if (cardType === 'Amex' && digits.length !== 15) errs.cardNumber = 'Amex must be 15 digits';
    if (!cardType) errs.cardNumber = 'Card type not recognized';
    if ((cardType === 'Amex' && cvv.length !== 4) || (cardType !== 'Amex' && cvv.length !== 3)) errs.cvv = 'Invalid CVV';
    if (!/^[0-9]{2}\/[0-9]{2}$/.test(exp)) errs.exp = 'Invalid expiration';
    if (!recaptchaToken) errs.recaptcha = 'Please complete the reCAPTCHA';
    setErrors(errs);
    if (Object.keys(errs).length === 0 && onDonate) {
      onDonate({ cardNumber: cardNumber.replace(/\D/g, ''), exp, cvv, note, recaptchaToken });
    }
  };

  return (
    <form className="payment-info-form" autoComplete="off" onSubmit={handleSubmit}>
      <h2 className="payment-title">Enter Your Card Info</h2>
      <div className="card-box">
        <div className="card-field wide" style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="cardNumber">Card Number</label>
          <div className="card-input-group">
            <span className="card-icon" aria-hidden>💳</span>
            <input id="cardNumber" type="text" inputMode="numeric" placeholder="____ ____ ____ ____" maxLength={cardType === 'Amex' ? 17 : 19} value={cardNumber} onChange={handleCardNumber} required aria-label="Card Number" />
            {cardType && <span style={{ marginLeft: 8, color: '#5a3ec8', fontWeight: 600 }}>{cardType}</span>}
          </div>
          {errors.cardNumber && <div style={{ color: 'red', fontSize: '0.95em' }}>{errors.cardNumber}</div>}
          <div className="card-logos">
            <img src="https://img.icons8.com/color/32/000000/visa.png" alt="Visa" />
            <img src="https://img.icons8.com/color/32/000000/mastercard-logo.png" alt="Mastercard" />
            <img src="https://img.icons8.com/color/32/000000/amex.png" alt="Amex" />
            <img src="https://img.icons8.com/color/32/000000/discover.png" alt="Discover" />
            <img src="https://img.icons8.com/color/32/000000/jcb.png" alt="JCB" />
            <img src="https://img.icons8.com/color/32/000000/maestro.png" alt="Maestro" />
          </div>
        </div>
        <div className="card-row">
          <div className="card-field">
            <label htmlFor="exp">Exp.</label>
            <input id="exp" type="text" inputMode="numeric" placeholder="MM/YY" maxLength={5} className="card-exp-input" value={exp} onChange={handleExp} required aria-label="Expiration Date" />
            {errors.exp && <div style={{ color: 'red', fontSize: '0.95em' }}>{errors.exp}</div>}
          </div>
          <div className="card-field">
            <label htmlFor="cvv">CVV</label>
            <input id="cvv" type="text" inputMode="numeric" placeholder="CVV" maxLength={cardType === 'Amex' ? 4 : 3} className="card-cvv-input" value={cvv} onChange={handleCvv} required aria-label="CVV" />
            {errors.cvv && <div style={{ color: 'red', fontSize: '0.95em' }}>{errors.cvv}</div>}
          </div>
        </div>
      </div>
      <div className="note-row">
        <label htmlFor="note">Note</label>
        <textarea id="note" rows={2} placeholder="" value={note} onChange={e => setNote(e.target.value)} />
      </div>
      <div style={{ margin: '1.5rem 0 0.5rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div
          ref={recaptchaRef}
          className="g-recaptcha"
          style={{
            marginBottom: 8,
            minHeight: 78,
            minWidth: 304,
            background: '#fff',
            overflow: 'visible',
            zIndex: 1000,
            borderRadius: 8,
            boxShadow: '0 2px 8px 0 #b0a7d622',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        ></div>
        {errors.recaptcha && <div style={{ color: 'red', fontSize: '0.95em' }}>{errors.recaptcha}</div>}
      </div>
      <button type="submit" className="next-btn" disabled={loading}>Donate</button>
    </form>
  );
}

function App() {
  const [tab, setTab] = useState(0);
  const [amount, setAmount] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [donorInfo, setDonorInfo] = useState({
    phone: '',
    firstName: '',
    lastName: '',
    address: '',
    apt: '',
    displayName: '',
    anonymous: false,
    city: '',
    state: '',
    zip: '',
    email: ''
  });

  const handleAmountChange = (e) => {
    const value = e.target.value;
    // Only set amount if it's a valid number
    if (value === '' || !isNaN(parseFloat(value))) {
      setAmount(value);
      setSelected(null);
      setError('');
    }
  };

  const handleSuggested = (idx) => {
    setSelected(idx);
    setAmount(SUGGESTED_AMOUNTS[idx].value.toString()); // Convert to string for input value
  };

  // Next/Donate button logic
  const canGoNext = () => {
    if (tab === 0) return !!amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0;
    if (tab === 1) {
      return donorInfo.phone && donorInfo.firstName && donorInfo.lastName &&
             donorInfo.address && donorInfo.city && donorInfo.state && 
             donorInfo.zip && donorInfo.email;
    }
    return true;
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (tab < 2 && canGoNext()) setTab(tab + 1);
    else if (tab === 2 && canGoNext()) {
      // Trigger donate
      const form = document.querySelector('.payment-info-form');
      if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      } else {
        setError('Payment form not found.');
      }
    }
  };

  const handleDonate = async (cardFields) => {
    // Validate card details
    if (!validateCard.number(cardFields.cardNumber)) {
      setError('Invalid card number');
      return;
    }
    if (!validateCard.exp(cardFields.exp)) {
      setError('Invalid expiration date');
      return;
    }
    if (!validateCard.cvv(cardFields.cvv)) {
      setError('Invalid CVV');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const payload = {
        amount: parseFloat(amount),
        ...donorInfo,
        cardNumber: cardFields.cardNumber.replace(/\D/g, ''),
        exp: cardFields.exp,
        cvv: cardFields.cvv,
        note: cardFields.note,
        recaptchaToken: cardFields.recaptchaToken // <-- Ensure token is sent
      };

      // Get the API URL based on the current environment
      const apiUrl = process.env.NODE_ENV === 'production'
        ? '/.netlify/functions/donate'
        : 'https://probable-space-fiesta-q76wvqq94jxr2x7ww-4000.app.github.dev/api/donate';

      // Add Cardknox API key to payload for backend
      payload.cardknoxApiKey = 'kupatgemachdev4bf80ea4600f4d7bafc0148922c770c';

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if ((res.ok && data.status === 'success') || data.status === 'success' || (data.cardknox && typeof data.cardknox === 'string' && data.cardknox.includes('xResult=A'))) {
        setSuccess(true);
        // Clear sensitive data
        setDonorInfo(prev => ({
          ...prev,
          phone: '',
          email: ''
        }));
      } else {
        setError(data.error?.message || data.error || 'Payment failed. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="header-banner">
        {/* Replace with your logo if available */}
        {/* <img src="/your-logo.png" alt="Organization Logo" /> */}
        <div className="banner-text">
          <div style={{ fontWeight: 700, fontSize: '1.3em', marginBottom: 8 }}>
            המוסד הקדוש מאמר מרדכי
          </div>
          <div>
            בראשות כ"ק אדמו"ר רבי פרדס מקוואזניץ שליט"א<br />
            כל מי שישתתף יבני גם הוא יזכה לכך
          </div>
        </div>
      </div>
      <main style={{ background: '#faf9fd', minHeight: '100vh', padding: '2rem 0' }}>
        <h1 style={{ marginLeft: '2rem', marginTop: 0 }}>Donate</h1>
        <div className="tabs" role="tablist">
          <button className={`tab${tab === 0 ? ' active' : ''}`} onClick={() => setTab(0)} aria-selected={tab === 0}>Donation Amount</button>
          <button className={`tab${tab === 1 ? ' active' : ''}`} onClick={() => setTab(1)} aria-selected={tab === 1}>Donor info</button>
          <button className={`tab${tab === 2 ? ' active' : ''}`} onClick={() => setTab(2)} aria-selected={tab === 2}>Payment Method</button>
        </div>
        {tab === 0 && (
          <section className="donation-step">
            <div className="donation-amount-box">
              <label htmlFor="donation-amount">Your Donation</label>
              <div className="donation-amount-input">
                <span style={{ color: '#b0a7d6', fontWeight: 600 }}>$</span>
                <input
                  id="donation-amount"
                  type="number"
                  min="1"
                  step="any"
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="Donation Amount"
                  aria-label="Donation Amount"
                />
                <span style={{ color: '#b0a7d6', fontSize: '0.9em', marginLeft: 4 }}>USD</span>
              </div>
              <a className="recurring-link" href="#">Schedule Recurring Payment</a>
            </div>
            <div className="suggested-amounts">
              <div className="suggested-row">
                <button className={`suggested-btn${selected === 0 ? ' selected' : ''}`} onClick={() => handleSuggested(0)}>
                  <div>{SUGGESTED_AMOUNTS[0].label}</div>
                  <div style={{ fontWeight: 700, fontSize: '1.2em' }}>${SUGGESTED_AMOUNTS[0].value.toFixed(2)}</div>
                </button>
                <button className={`suggested-btn${selected === 1 ? ' selected' : ''}`} onClick={() => handleSuggested(1)}>
                  <div>{SUGGESTED_AMOUNTS[1].label}</div>
                  <div style={{ fontWeight: 700, fontSize: '1.2em' }}>${SUGGESTED_AMOUNTS[1].value.toFixed(2)}</div>
                </button>
              </div>
              <div className="suggested-row">
                <button className={`suggested-btn${selected === 2 ? ' selected' : ''}`} onClick={() => handleSuggested(2)}>
                  <div>{SUGGESTED_AMOUNTS[2].label}</div>
                  <div style={{ fontWeight: 700, fontSize: '1.2em' }}>${SUGGESTED_AMOUNTS[2].value.toFixed(2)}</div>
                </button>
                <button className={`suggested-btn${selected === 3 ? ' selected' : ''}`} onClick={() => handleSuggested(3)}>
                  <div>{SUGGESTED_AMOUNTS[3].label}</div>
                  <div style={{ fontWeight: 700, fontSize: '1.2em' }}>${SUGGESTED_AMOUNTS[3].value.toFixed(2)}</div>
                </button>
              </div>
              <div className="suggested-row">
                <button className={`suggested-btn${selected === 4 ? ' selected' : ''}`} onClick={() => handleSuggested(4)}>
                  <div>{SUGGESTED_AMOUNTS[4].label}</div>
                  <div style={{ fontWeight: 700, fontSize: '1.2em' }}>${SUGGESTED_AMOUNTS[4].value.toFixed(2)}</div>
                </button>
                <button className={`suggested-btn${selected === 5 ? ' selected' : ''}`} onClick={() => handleSuggested(5)}>
                  <div>{SUGGESTED_AMOUNTS[5].label}</div>
                  <div style={{ fontWeight: 700, fontSize: '1.2em' }}>${SUGGESTED_AMOUNTS[5].value.toFixed(2)}</div>
                </button>
              </div>
            </div>
          </section>
        )}
        {tab === 1 && (
          <section className="donation-step">
            <DonorInfoForm donorInfo={donorInfo} setDonorInfo={setDonorInfo} />
          </section>
        )}
        {tab === 2 && !success && (
          <section className="donation-step">
            <PaymentInfoForm onDonate={handleDonate} loading={loading} />
          </section>
        )}
        {tab === 2 && success && (
          <div className="thank-you">
            <h2>Thank you for your donation!</h2>
            <p>Your payment was processed successfully.</p>
          </div>
        )}
        {error && (
          <div style={{ color: 'red', textAlign: 'center', marginTop: 16 }}>{error}</div>
        )}
        {/* Only show the Next/Donate button for tab 0 and 1 */}
        {(tab === 0 || tab === 1) && (
          <button
            className="next-btn"
            onClick={handleNext}
            disabled={!canGoNext()}
            type="button"
          >
            Next <span aria-hidden>→</span>
          </button>
        )}
      </main>
    </>
  );
}

export default App;
