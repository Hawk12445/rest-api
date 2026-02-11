const axios = require('axios');
const crypto = require('crypto');

const meta = {
  name: 'FbCreate',
  path: '/fbcreate',
  method: 'get',
  category: 'tools'
};

// --- Helper Functions ---

const genString = (len) => {
  const char = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let res = '';
  for (let i = 0; i < len; i++) res += char.charAt(Math.floor(Math.random() * char.length));
  return res;
};

async function onStart({ req, res }) {
  const { amount } = req.query;

  if (!amount) {
    return res.status(400).json({
      status: false,
      error: 'The "amount" parameter is required, byut.'
    });
  }

  try {
    const results = [];
    const count = parseInt(amount);

    for (let i = 0; i < count; i++) {
      // 1. Get Mail.tm Domain
      const domRes = await axios.get("https://api.mail.tm/domains");
      const domain = domRes.data['hydra:member'][0].domain;
      
      // 2. Create Temp Mail Account
      const email = `${genString(10)}@${domain}`;
      const password = genString(12);
      await axios.post("https://api.mail.tm/accounts", { address: email, password });

      // 3. Register Facebook
      const firstName = "Flex"; // You can replace these with a name generator if you want
      const lastName = genString(5);
      const birthday = "1998-05-20";
      
      const fbData = {
        api_key: '882a8490361da98702bf97a021ddc14d',
        attempt_login: 'true',
        birthday: birthday,
        client_country_code: 'EN',
        fb_api_caller_class: 'com.facebook.registration.protocol.RegisterAccountMethod',
        fb_api_req_friendly_name: 'registerAccount',
        firstname: firstName,
        format: 'json',
        gender: Math.random() > 0.5 ? 'M' : 'F',
        lastname: lastName,
        email: email,
        locale: 'en_US',
        method: 'user.register',
        password: password,
        reg_instance: genString(32),
        return_multiple_errors: 'true'
      };

      // Create Signature (sig)
      const sig = crypto.createHash('md5').update(
        Object.keys(fbData).sort().map(k => `${k}=${fbData[k]}`).join('') + '62f8ce9f74b12f84c123cc23437a4a32'
      ).digest('hex');
      fbData.sig = sig;

      const fbResponse = await axios.post('https://b-api.facebook.com/method/user.register', new URLSearchParams(fbData), {
        headers: { 'User-Agent': '[FBAN/FB4A;FBAV/35.0.0.48.273;FBDM/{density=1.33125,width=800,height=1205};FBLC/en_US;FBCR/;FBPN/com.facebook.katana;FBDV/Nexus 7;FBSV/4.1.1;FBBK/0;]' }
      });

      results.push({
        email,
        password,
        fb_response: fbResponse.data
      });
    }

    res.json({
      status: true,
      creator: "Jay",
      data: results
    });

  } catch (error) {
    console.error('FbCreate Error:', error.message);
    res.status(500).json({
      status: false,
      error: 'Something went wrong while creating the account.'
    });
  }
}

module.exports = { meta, onStart };
