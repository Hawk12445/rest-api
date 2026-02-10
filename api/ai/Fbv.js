const axios = require("axios");
const crypto = require("crypto");
const { faker } = require("@faker-js/faker");

const meta = {
  name: 'FbCreateV2',
  path: '/fbcreate-v2',
  method: 'get',
  category: 'tools'
};

class FbCreateAPI {
  constructor() {
    this.fbApiKey = '882a8490361da98702bf97a021ddc14d';
    this.fbSecret = '62f8ce9f74b12f84c123cc23437a4a32';
    this.fbUserAgent = '[FBAN/FB4A;FBAV/35.0.0.48.273;FBDM/{density=1.33125,width=800,height=1205};FBLC/en_US;FBCR/;FBPN/com.facebook.katana;FBDV/Nexus 7;FBSV/4.1.1;FBBK/0;]';
  }

  generateRandomString(length) {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  async getMailDomains() {
    try {
      const response = await axios.get("https://api.mail.tm/domains");
      return response.data['hydra:member'];
    } catch (error) {
      console.error('[×] E-mail Domain Error:', error.message);
      return null;
    }
  }

  async createMailTmAccount() {
    const domains = await this.getMailDomains();
    if (!domains) return null;

    const domain = domains[Math.floor(Math.random() * domains.length)].domain;
    const username = this.generateRandomString(10);
    const password = faker.internet.password();
    const email = `${username}@${domain}`;

    try {
      const response = await axios.post("https://api.mail.tm/accounts", {
        address: email,
        password: password
      });

      if (response.status === 201) {
        return {
          email,
          password,
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          birthday: faker.date.birthdate({ min: 18, max: 45, mode: 'age' }).toISOString().split('T')[0]
        };
      }
    } catch (error) {
      console.error('[×] Email Creation Error:', error.message);
    }
    return null;
  }

  async registerFacebook(account) {
    const gender = Math.random() > 0.5 ? 'M' : 'F';
    const reqData = {
      api_key: this.fbApiKey,
      attempt_login: 'true',
      birthday: account.birthday,
      client_country_code: 'EN',
      fb_api_caller_class: 'com.facebook.registration.protocol.RegisterAccountMethod',
      fb_api_req_friendly_name: 'registerAccount',
      firstname: account.firstName,
      format: 'json',
      gender: gender,
      lastname: account.lastName,
      email: account.email,
      locale: 'en_US',
      method: 'user.register',
      password: account.password,
      reg_instance: this.generateRandomString(32),
      return_multiple_errors: 'true'
    };

    // Generate Signature (sig)
    const sortedKeys = Object.keys(reqData).sort();
    let sigString = "";
    for (const key of sortedKeys) {
      sigString += `${key}=${reqData[key]}`;
    }
    const sig = crypto.createHash('md5').update(sigString + this.fbSecret).digest('hex');
    reqData.sig = sig;

    try {
      const response = await axios.post('https://b-api.facebook.com/method/user.register', new URLSearchParams(reqData), {
        headers: { 'User-Agent': this.fbUserAgent }
      });
      return response.data;
    } catch (error) {
      return { error: error.message, details: error.response?.data };
    }
  }
}

async function onStart({ req, res }) {
  try {
    const amount = parseInt(req.query.amount) || 1;
    const fbApi = new FbCreateAPI();
    const results = [];

    for (let i = 0; i < amount; i++) {
      const mailAcc = await fbApi.createMailTmAccount();
      if (mailAcc) {
        const fbResult = await fbApi.registerFacebook(mailAcc);
        results.push({
          account: mailAcc,
          facebook_response: fbResult
        });
      }
    }

    res.json({
      status: true,
      creator: "Flex AI",
      results: results
    });

  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
}

module.exports = { meta, onStart, FbCreateAPI };
