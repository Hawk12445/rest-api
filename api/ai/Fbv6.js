const axios = require('axios');
const crypto = require('crypto');

const meta = {
  name: 'FbCreatev6',
  path: '/fbcreate',
  method: 'get',
  category: 'tools'
};

const genString = (len) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let res = '';
  for (let i = 0; i < len; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
  return res;
};

const generateSig = (params, secret) => {
  const sortedKeys = Object.keys(params).sort();
  let sigString = '';
  for (const key of sortedKeys) {
    sigString += `${key}=${params[key]}`;
  }
  return crypto.createHash('md5').update(sigString + secret).digest('hex');
};

// --- New Helper: Fetch OTP from Mail.tm ---
async function getFBCode(email, password) {
  try {
    // 1. Get Login Token
    const tokenRes = await axios.post('https://api.mail.tm/token', { address: email, password: password });
    const token = tokenRes.data.token;

    // 2. Poll for messages (Check 5 times with 5s delay)
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const msgRes = await axios.get('https://api.mail.tm/messages', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const messages = msgRes.data['hydra:member'];
      if (messages.length > 0) {
        const subject = messages[0].subject; // Facebook code is usually in the subject
        const code = subject.match(/\d{5,6}/); // Extract 5 or 6 digit code
        if (code) return code[0];
      }
    }
    return "Code not found yet. Check again later.";
  } catch (err) {
    return "Error fetching code: " + err.message;
  }
}

async function onStart({ req, res }) {
  const { amount, firstName, lastName } = req.query;

  if (!amount || isNaN(amount)) {
    return res.status(400).json({ status: false, error: 'Valid amount required, byut.' });
  }

  const results = [];
  const count = Math.min(parseInt(amount), 3);

  try {
    for (let i = 0; i < count; i++) {
      const domainResponse = await axios.get('https://api.mail.tm/domains');
      const domain = domainResponse.data['hydra:member'][0].domain;

      const email = `${genString(10)}@${domain}`;
      const password = genString(12);
      const finalFirstName = firstName || "Flex";
      const finalLastName = lastName || genString(5);

      // Create Mail.tm account
      await axios.post('https://api.mail.tm/accounts', { address: email, password: password });

      // FB Registration Params
      const fbParams = {
        api_key: '882a8490361da98702bf97a021ddc14d',
        attempt_login: 'true',
        birthday: '1998-05-20',
        client_country_code: 'EN',
        fb_api_caller_class: 'com.facebook.registration.protocol.RegisterAccountMethod',
        fb_api_req_friendly_name: 'registerAccount',
        firstname: finalFirstName,
        format: 'json',
        gender: 'M',
        lastname: finalLastName,
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
        { headers: { 'User-Agent': '[FBAN/FB4A;FBAV/35.0.0.48.273;FBDM/{density=1.33125,width=800,height=1205};FBLC/en_US;FBCR/;FBPN/com.facebook.katana;FBDV/Nexus 7;FBSV/4.1.1;FBBK/0;]' } }
      );

      // --- NEW: Wait for the code ---
      const otpCode = await getFBCode(email, password);

      results.push({
        email,
        password,
        name: `${finalFirstName} ${finalLastName}`,
        verification_code: otpCode,
        fb_response: fbResponse.data
      });
    }

    res.json({
      status: true,
      creator: "jay",
      data: results
    });

  } catch (error) {
    res.status(500).json({ status: false, error: error.message });
  }
}

module.exports = { meta, onStart };
