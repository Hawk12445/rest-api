const axios = require('axios');
const crypto = require('crypto');

const meta = {
  name: 'FbCreatevv1',
  path: '/fbcreate?email=Enter email...&amount=Enter amount...', // Placeholders added here for reference
  method: 'get',
  category: 'tools',
  guide: {
    email: 'Enter email...',
    amount: 'Enter amount...'
  }
};

// --- Helper: Generate Random Strings ---
const genString = (len) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let res = '';
  for (let i = 0; i < len; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
  return res;
};

// --- Helper: Generate MD5 Signature ---
const generateSig = (params, secret) => {
  const sortedKeys = Object.keys(params).sort();
  let sigString = '';
  for (const key of sortedKeys) {
    sigString += `${key}=${params[key]}`;
  }
  return crypto.createHash('md5').update(sigString + secret).digest('hex');
};

// --- Helper: Email Validation ---
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

async function onStart({ req, res }) {
  const { email, amount } = req.query;

  if (!email || !amount) {
    return res.status(400).json({
      error: 'Both email and amount parameters are required',
      example: '/fbcreate?email=Enter email...&amount=Enter amount...'
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      status: false,
      error: 'Invalid email format'
    });
  }

  try {
    const results = [];
    //const count = Math.min(parseInt(amount), 5);
    const count = 1; // Limit to one account creation

    for (let i = 0; i < count; i++) {
      const password = genString(12);
      const firstName = "Jay";
      const lastName = genString(5);
      const birthday = "1998-05-20";

      const fbParams = {
        api_key: '882a8490361da98702bf97a021ddc14d',
        attempt_login: 'true',
        birthday: birthday,
        client_country_code: 'EN',
        fb_api_caller_class: 'com.facebook.registration.protocol.RegisterAccountMethod',
        fb_api_req_friendly_name: 'registerAccount',
        firstname: firstName,
        format: 'json',
        gender: 'M',
        lastname: lastName,
        email: email,
        locale: 'en_US',
        method: 'user.register',
        password: password,
        reg_instance: genString(32),
        return_multiple_errors: 'true'
      };

      fbParams.sig = generateSig(fbParams, '62f8ce9f74b12f84c123cc23437a4a32');

      const fbResponse = await axios.post('https://b-api.facebook.com/method/user.register', 
        new URLSearchParams(fbParams), 
        {
          headers: {
            'User-Agent': '[FBAN/FB4A;FBAV/35.0.0.48.273;FBDM/{density=1.33125,width=800,height=1205};FBLC/en_US;FBCR/;FBPN/com.facebook.katana;FBDV/Nexus 7;FBSV/4.1.1;FBBK/0;]'
          }
        }
      );

      // --- Verification Code Handling (Placeholder) ---
      // In a real-world scenario, you would:
      // 1. Check fbResponse.data for an indication that a verification code was sent.
      // 2. Use an email API (e.g., Nodemailer, SendGrid) to access the user's inbox.
      // 3. Extract the verification code from the email.
      // 4. Send the verification code to Facebook's API to complete the registration.

      results.push({
        email,
        password,
        name: `${firstName} ${lastName}`,
        fb_response: fbResponse.data,
        verification_status: "Verification code handling not fully implemented" // Placeholder
      });
    }

    res.json({
      status: true,
      creator: "jay",
      data: results
    });

  } catch (error) {
    res.status(500).json({
      status: false,
      error: 'Failed to process account creation.',
      details: error.message
    });
  }
}

module.exports = { meta, onStart };
