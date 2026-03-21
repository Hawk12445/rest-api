const axios = require("axios");
const SoundCloud = require("soundcloud-scraper");
const path = require("path");
const fs = require("fs");

module.exports = {
  meta: {
    name: "SoundCloud Downloader",
    description: "Search and download music from SoundCloud with lyrics",
    author: "Jaybohol",
    version: "1.0.0",
    category: "random",
    method: "GET",
    path: "/soundcloud?query="
  },
  
  onStart: async function({ req, res }) {
    const musicName = req.query.query || '';
    
    if (!musicName) {
      return res.status(400).json({ 
        status: false,
        operator: "Jaybohol",
        error: "Please provide the title of the music!",
        usage: "/soundcloud?query=suzume"
      });
    }
    
    // User agents for rotating
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15",
      "Mozilla/5.0 (Linux; Android 9; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Mobile Safari/537.36",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.6 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (Linux; Android 10; Pixel 3 XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Mobile Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_2_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15"
    ];
    
    // API key storage path
    const apiKeyPath = path.join(__dirname, 'system', 'apikey.json');
    
    try {
      // Get or generate API key
      let apiKey;
      if (fs.existsSync(apiKeyPath)) {
        const data = fs.readFileSync(apiKeyPath, 'utf8');
        apiKey = JSON.parse(data).apiKey;
      } else {
        apiKey = await SoundCloud.keygen();
        fs.mkdirSync(path.dirname(apiKeyPath), { recursive: true });
        fs.writeFileSync(apiKeyPath, JSON.stringify({ apiKey }));
      }
      
      const client = new SoundCloud.Client(apiKey);
      const searchResults = await client.search(musicName, 'track');
      
      if (!searchResults || searchResults.length === 0) {
        return res.status(404).json({
          status: false,
          operator: "Jaybohol",
          error: "Can't find the music you're looking for.",
          query: musicName
        });
      }
      
      const song = searchResults[0];
      const songInfo = await client.getSongInfo(song.url);
      const stream = await songInfo.downloadProgressive();
      
      // Collect audio data
      const audioData = [];
      
      stream.on('data', chunk => audioData.push(chunk));
      
      // Handle stream completion
      const streamPromise = new Promise((resolve, reject) => {
        stream.on('end', async () => {
          const audioBuffer = Buffer.concat(audioData);
          const audioBase64 = audioBuffer.toString('base64');
          
          // Fetch lyrics
          let lyrics = "Lyrics not found";
          try {
            // Decoded URL: https://lyrist.vercel.app/api/
            const lyricsUrl = atob(`aHR0cHM6Ly9seXJpc3QudmVyY2VsLmFwcC9hcGkv`);
            const lyricsResponse = await axios.get(lyricsUrl + encodeURIComponent(musicName), {
              headers: { 
                'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)] 
              },
              timeout: 10000
            });
            lyrics = lyricsResponse.data.lyrics || "Lyrics not available";
          } catch (error) {
            console.error("Error fetching lyrics:", error.message);
          }
          
          resolve({
            songInfo,
            song,
            audioBase64,
            lyrics
          });
        });
        
        stream.on('error', (error) => {
          reject(error);
        });
      });
      
      const result = await streamPromise;
      
      res.json({
        status: true,
        operator: "Jaybohol",
        music: {
          id: result.songInfo.id,
          title: result.songInfo.title,
          description: result.songInfo.description,
          duration: result.songInfo.duration,
          duration_ms: result.songInfo.durationInMs,
          playCount: result.songInfo.playCount,
          commentsCount: result.songInfo.commentsCount,
          likes: result.songInfo.likes,
          genre: result.songInfo.genre,
          audio_url: result.song.url,
          thumbnail: result.songInfo.thumbnail,
          publishedAt: result.songInfo.publishedAt,
          embedURL: result.songInfo.embedURL,
          streams: result.songInfo.streams,
          trackURL: result.songInfo.trackURL,
          audio_base64: result.audioBase64,
          lyrics: result.lyrics
        },
        author: {
          name: result.songInfo.author.name,
          username: result.songInfo.author.username,
          url: result.songInfo.author.url,
          avatarURL: result.songInfo.author.avatarURL,
          verified: result.songInfo.author.verified,
          followers: result.songInfo.author.followers,
          following: result.songInfo.author.following
        },
        timestamp: new Date().toISOString(),
        credits: "Jaybohol"
      });
      
    } catch (error) {
      console.error("SoundCloud API Error:", error.message);
      
      // Handle invalid client ID
      if (error.message && error.message.includes('Invalid ClientID')) {
        try {
          const newKey = await SoundCloud.keygen();
          const apiKeyPath = path.join(__dirname, 'system', 'apikey.json');
          fs.mkdirSync(path.dirname(apiKeyPath), { recursive: true });
          fs.writeFileSync(apiKeyPath, JSON.stringify({ apiKey: newKey }));
          
          return res.status(500).json({
            status: false,
            operator: "Jaybohol",
            error: "New API key generated. Please retry your search!",
            message: "The API key was regenerated. Try again with the same query."
          });
        } catch (keygenError) {
          return res.status(500).json({
            status: false,
            operator: "Jaybohol",
            error: "Failed to generate new API key",
            details: keygenError.message
          });
        }
      }
      
      res.status(500).json({
        status: false,
        operator: "Jaybohol",
        error: "Failed to fetch music",
        details: error.message,
        query: musicName
      });
    }
  }
};
