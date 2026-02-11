const axios = require('axios');

const meta = {
  name: 'Fbv7',
  path: '/fbverify',
  method: 'get',
  category: 'tools'
};

async function onStart({ req, res }) {
  const { email, password } = req.query;

  // Validation
  if (!email || !password) {
    return res.status(400).json({
      status: false,
      error: 'Please provide both "email" and "password" of the Mail.tm account, byut.'
    });
  }

  try {
    // 1. Get the Login Token from Mail.tm
    const tokenResponse = await axios.post('https://api.mail.tm/token', {
      address: email,
      password: password
    });

    const token = tokenResponse.data.token;

    // 2. Fetch the latest messages
    const messageResponse = await axios.get('https://api.mail.tm/messages', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const messages = messageResponse.data['hydra:member'];

    if (messages.length === 0) {
      return res.json({
        status: true,
        message: "Inbox is empty. No verification code found yet, byut."
      });
    }

    // 3. Search for the Facebook Code in the most recent message
    // We look for a 5-6 digit number in the subject or intro
    const latestMessage = messages[0];
    const subject = latestMessage.subject;
    const codeMatch = subject.match(/\d{5,6}/); // Finds a 5 or 6 digit number

    if (codeMatch) {
      return res.json({
        status: true,
        creator: "jay",
        email: email,
        code: codeMatch[0],
        subject: subject,
        received_at: latestMessage.createdAt
      });
    } else {
      return res.json({
        status: true,
        message: "Message received, but no numerical code was found in the subject.",
        subject: subject
      });
    }

  } catch (error) {
    console.error('Verification Error:', error.message);
    
    // Handle wrong credentials or Mail.tm issues
    const errorMessage = error.response && error.response.status === 401 
      ? "Invalid email or password. Could not log in." 
      : "Failed to fetch messages from Mail.tm.";

    res.status(500).json({
      status: false,
      error: errorMessage,
      details: error.message
    });
  }
}

module.exports = { meta, onStart };
