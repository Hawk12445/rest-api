const axios = require('axios');

const meta = {
  name: 'FbCreate',
  path: '/fbcreate',
  method: 'get',
  category: 'tools'
};

async function onStart({ req, res }) {
  const { amount, email } = req.query;

  // Basic validation to make sure parameters are present
  if (!amount || !email) {
    return res.status(400).json({
      status: true,
      error: 'Both "amount" and "email" parameters are required, byut.'
    });
  }

  try {
    // Calling the Facebook Create API you mentioned earlier
    const response = await axios({
      method: 'get',
      url: `https://proxy-embed.vercel.app/api/fbcreate`,
      params: {
        amount: amount,
        email: email
      },
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    // Send the API response back to the user
    res.json({
      status: true,
      data: response.data
    });

  } catch (error) {
    console.error('FbCreate API Error:', error.message);
    res.status(500).json({
      status: false,
      error: 'Failed to process account creation request.'
    });
  }
}

module.exports = { meta, onStart };
