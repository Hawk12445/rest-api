const axios = require("axios");
const FormData = require("form-data");

module.exports = {
  meta: {
    name: "Dracin Text-to-Speech",
    description: "AI Voice with Drama China (Dracin) style - converts text to speech with Chinese drama narrator style",
    author: "Jaybohol",
    version: "1.0.0",
    category: "ai",
    method: "GET",
    path: "/dracin/tts?text=&speed=&music=&volume="
  },
  
  onStart: async function({ req, res }) {
    try {
      const { text, speed = 1.0, music = "true", volume = 0.3, stream = "false" } = req.query;
      
      if (!text) {
        return res.status(400).json({
          status: false,
          operator: "Jaybohol",
          error: "Text is required",
          usage: "/dracin/tts?text=Hello%20World&speed=1.0&music=true&volume=0.3"
        });
      }
      
      // Validate text length
      if (text.length > 500) {
        return res.status(413).json({
          status: false,
          error: "Text too long. Maximum 500 characters"
        });
      }
      
      // Parse parameters
      let parsedSpeed = parseFloat(speed);
      if (isNaN(parsedSpeed) || parsedSpeed < 0.5 || parsedSpeed > 2.0) parsedSpeed = 1.0;
      
      let useBg = music === "true" || music === "1" || music === "yes";
      let bgVol = parseFloat(volume);
      if (isNaN(bgVol) || bgVol < 0.1 || bgVol > 1.0) bgVol = 0.3;
      
      // Generate TTS audio
      const audioBuffer = await generateDracinTTS(text, parsedSpeed, useBg, bgVol);
      
      // Stream directly if requested
      if (stream === "true") {
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', 'inline; filename="dracin-tts.mp3"');
        return res.send(audioBuffer);
      }
      
      // Try to upload to temporary storage for URL
      let audioUrl = null;
      let uploadError = null;
      
      try {
        audioUrl = await uploadToTmp(audioBuffer, `dracin-${Date.now()}.mp3`);
      } catch (uploadErr) {
        uploadError = uploadErr.message;
      }
      
      res.json({
        status: true,
        operator: "Jaybohol",
        text: text,
        text_length: text.length,
        settings: {
          speed: parsedSpeed,
          background_music: useBg,
          music_volume: bgVol
        },
        audio: audioUrl ? {
          url: audioUrl,
          size_bytes: audioBuffer.length
        } : {
          base64: audioBuffer.toString('base64'),
          size_bytes: audioBuffer.length,
          upload_error: uploadError
        },
        credits: "Jaybohol (via Dracin TTS)",
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error("Dracin TTS Error:", error.message);
      
      res.status(500).json({
        status: false,
        operator: "Jaybohol",
        error: error.message
      });
    }
  }
};

// Dracin TTS Generator
async function generateDracinTTS(text, speed = 1.0, useBg = true, bgVol = 0.3) {
  const url = 'https://ricky01anjay-suaraind.hf.space/generate';
  
  try {
    const response = await axios.get(url, {
      params: {
        text: text,
        speed: speed,
        use_bg: useBg,
        bg_vol: bgVol
      },
      responseType: 'arraybuffer',
      timeout: 30000
    });
    
    return Buffer.from(response.data);
  } catch (error) {
    throw new Error(`Dracin TTS API Error: ${error.message}`);
  }
}

// Upload to temporary storage (example using tmp.ninja)
async function uploadToTmp(buffer, filename) {
  try {
    const formData = new FormData();
    formData.append('file', buffer, { filename: filename });
    
    const response = await axios.post('https://tmp.ninja/api.php', formData, {
      headers: formData.getHeaders(),
      timeout: 10000
    });
    
    if (response.data && response.data.url) {
      return response.data.url;
    }
    throw new Error("Upload failed");
  } catch (error) {
    console.error("Upload error:", error.message);
    throw error;
  }
}
