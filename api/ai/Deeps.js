const axios = require('axios');
const fs = require('fs');
const querystring = require('querystring');

// Memory management functions (saveMemory, loadMemory) remain the same

const meta = {
  name: 'DeepAI', // Change the name accordingly
  path: '/deepai?prompt=&uid=', // Change the path
  method: 'get',
  category: 'ai'
};

async function onStart({ req, res }) {
  const { prompt, uid } = req.query;

  if (!prompt || !uid) {
    return res.status(400).json({
      error: 'Both prompt and uid parameters are required',
      example: '/deepai?prompt=hello&uid=123' // Update the example
    });
  }

  // Load or initialize memory
  if (!memory[uid]) {
    const saved = loadMemory(uid);
    memory[uid] = saved || [
      {
        role: "system",
        content: "You are a helpful AI assistant." // Customize the initial message
      }
    ];
  }

  // Add the user message
  memory[uid].push({
    role: "user",
    content: prompt
  });

  try {
    // ** Replace this section with the new API call **

    const payload = {
      chat_style: 'chat',
      chatHistory: JSON.stringify(memory[uid]), // Convert chatHistory to JSON string
      model: 'deepseek-v3.2',
      hacker_is_stinky: 'very_stinky',
      enabled_tools: JSON.stringify(["image_generator", "image_editor"]) // Convert enabled_tools to JSON string
    };

    const headers = {
      'User-Agent': "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36",
      'Accept-Encoding': "gzip, deflate, br, zstd",
      'sec-ch-ua-platform': "\"Android\"",
      'api-key': "tryit-70752989396-96a099189041d9c7050992dcba168f97",
      'sec-ch-ua': "\"Not(A:Brand\";v=\"8\", \"Chromium\";v=\"144\", \"Google Chrome\";v=\"144\"",
      'sec-ch-ua-mobile': "?1",
      'origin': "https://deepai.org",
      'sec-fetch-site': "same-site",
      'sec-fetch-mode': "cors",
      'sec-fetch-dest': "empty",
      'accept-language': "en-US,en;q=0.9,fil;q=0.8,pt;q=0.7,ar;q=0.6",
      'priority': "u=1, i",
      'Cookie': "_ga=GA1.1.913044145.1767180564; __qca=P1-56e9f8fe-4894-482f-9a8d-4012011af479; _cc_id=64c944d51ed1f9f90e739b0ee4cbdbe0; csrftoken=aSwO13Vnn8sWbEmLzH8wNprvypy4ZoAD; sessionid=2fqaseudfpifehn7z1ka2ioaw8056xwe; _gcl_au=1.1.1506189737.1767180564.912415267.1768051105.1768051336; __gads=ID=3b8ad7b5d8209d55:T=1768049935:RT=1768359871:S=ALNI_MbUgCRcDnbFRzndmUXopYbOGYHKJg; __gpi=UID=000011e11a8afa13:T=1768049935:RT=1768359871:S=ALNI_MZw-LhiqyKraKSV_jb0EDDaMjw0fw; __eoi=ID=7251143188ab3f90:T=1768049935:RT=1768359871:S=AA-Afjbmpoc24lY0FzUyG6Muvn4j; cto_bundle=VcZx9l9xSUZIYzVTdUs3NzhSQmNRU0QlMkJCZnZWY3ZrbEdJNEtnWk5naVBlQUJUN0lOOEViTk55VU9tSTJUdWM3YzNqMHBjU2VCS1NvYzlRQ3QlMkJwY1pBWXhYNnh0Q2NDaXJvRFRFbnYlMkZ4ZTVqaUMwcGhhNGl5MVdxOWRxdVBQSTNTZmE0MDhYUkc3RlE3R1ZkTk9QTzdNQk53MmclM0QlM0Q; user_sees_ads=false; _ga_GY2GHX2J9Y=GS2.1.s1770291196$o6$g0$t1770291196$j60$l0$h0"
    };

    const apiResponse = await axios.post(
      'https://api.deepai.org/hacking_is_a_serious_crime', // ** REPLACE WITH THE NEW API ENDPOINT **
      querystring.stringify(payload), // Use querystring.stringify to encode the payload
      {
        headers: headers
      }
    );

    // Log the API response for debugging
    console.log("New AI API Response:", apiResponse.data);

    // ** Extract data from the response **
    // Assuming the response is JSON and contains a "reply" field:
    const responseData = apiResponse.data;
    const aiReply = responseData.reply; // ** ADJUST THIS BASED ON THE API RESPONSE STRUCTURE **
    const success = true; // ** ADJUST THIS BASED ON THE API RESPONSE STRUCTURE **

    // Save the AI reply to memory
    memory[uid].push({
      role: "assistant",
      content: aiReply
    });

    // Save the memory
    saveMemory(uid);

    // Send the final response to the client
    res.json({
      status: success,
      response: aiReply,
    });

  } catch (error) {
    // Log the error
    console.error('New AI API Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });

    // Send an error response to the client
    res.status(500).json({
      status: false,
      error: error.response?.data || error.message
    });
  }
}

module.exports = { meta, onStart };
      
