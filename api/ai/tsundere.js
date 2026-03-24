// api/ai/tsundere.js

const axios = require("axios");
const FormData = require("form-data");

module.exports = {
  meta: {
    name: "Tsundere Text-to-Speech",
    description: "AI Voice with Tsundere style - converts text to speech with tsundere tone",
    author: "Jaybohol",
    version: "1.0.0",
    category: "ai",
    method: "GET",
    path: "/api/ai/tsundere?text="
  },
  
  onStart: async function({ req, res }) {
    try {
      const { text, voice = "Kore", language = "id-ID", speed = 1.1, pitch = 2.5 } = req.query;
      
      if (!text) {
        return res.status(400).json({
          success: false,
          author: "Jaybohol",
          message: "Parameter 'text' wajib diisi.",
          usage: "/api/ai/tsundere?text=Hello%20World"
        });
      }
      
      console.log(`🎙️ Generating Tsundere TTS for: "${text.substring(0, 50)}..."`);
      
      // Generate TTS audio
      const audioBuffer = await generateTsundereTTS(text, voice, language, parseFloat(speed), parseFloat(pitch));
      
      // Upload to catbox.moe
      const audioUrl = await uploadToCatbox(audioBuffer, `tsundere-${Date.now()}.mp3`);
      
      console.log(`✅ Audio URL: ${audioUrl}`);
      
      res.json({
        success: true,
        author: "Jaybohol",
        result: {
          text: text,
          audio: audioUrl
        }
      });
      
    } catch (error) {
      console.error("Tsundere TTS Error:", error.message);
      
      res.status(500).json({
        success: false,
        author: "Jaybohol",
        message: error.message || "Failed to generate Tsundere TTS"
      });
    }
  }
};

// ============= HELPER FUNCTIONS =============

function generateFakeIP() {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 255)).join('.');
}

async function generateTsundereTTS(text, voice, language, speed, pitch) {
  const url = 'https://api.screenapp.io/v2/proxy/google/tts';
  const fakeIP = generateFakeIP();
  
  const payload = {
    "input": text,
    "model": "gemini-2.5-flash-tts",
    "voice": voice || "Kore",
    "language_code": language || "id-ID",
    "response_format": "mp3",
    "speaking_rate": speed || 1.1,
    "pitch": pitch || 2.5,
    "volume_gain_db": 0
  };
  
  const headers = {
    'authority': 'api.screenapp.io',
    'accept': '*/*',
    'content-type': 'application/json',
    'origin': 'https://screenapp.io',
    'referer': 'https://screenapp.io/',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
    'x-forwarded-for': fakeIP,
    'client-ip': fakeIP,
    'via': '1.1 google'
  };
  
  try {
    const response = await axios({
      method: 'post',
      url: url,
      data: payload,
      headers: headers,
      responseType: 'arraybuffer',
      timeout: 30000
    });
    
    const audioBuffer = Buffer.from(response.data);
    
    if (audioBuffer.length < 1000) {
      throw new Error(`Generated audio too small: ${audioBuffer.length} bytes`);
    }
    
    console.log(`✅ Audio generated: ${audioBuffer.length} bytes`);
    return audioBuffer;
  } catch (error) {
    console.error("Tsundere TTS API Error:", error.message);
    throw new Error(error.message || 'Failed to generate Tsundere TTS');
  }
}

async function uploadToCatbox(buffer, filename) {
  try {
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', buffer, { filename: filename });
    
    const response = await axios.post('https://catbox.moe/user/api.php', formData, {
      headers: formData.getHeaders(),
      timeout: 30000
    });
    
    const url = response.data.trim();
    
    if (url && url.startsWith('http')) {
      console.log(`✅ Uploaded to catbox: ${url}`);
      return url;
    }
    
    throw new Error("Upload failed: " + url);
    
  } catch (error) {
    console.error("Upload Error:", error.message);
    throw new Error("Failed to upload audio to catbox.moe");
  }
}
