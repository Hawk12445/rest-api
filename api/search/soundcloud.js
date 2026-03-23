const axios = require("axios");
const cheerio = require("cheerio");

module.exports = {
  meta: {
    name: "SoundCloud Downloader",
    description: "Search and download tracks from SoundCloud",
    author: "Jaybohol",
    version: "2.0.0",
    category: "music",
    method: "GET",
    path: "/soundcloud?q=&limit="
  },
  
  onStart: async function({ req, res }) {
    try {
      const { q, url, limit = 10 } = req.query;
      
      // Check if it's a download request (by URL)
      if (url) {
        const result = await downloadSoundCloud(url);
        
        return res.json({
          success: true,
          author: "Jaybohol",
          result: {
            title: result.title,
            duration: result.duration,
            url: result.download_url || result.stream_url
          }
        });
      }
      
      // Search tracks by query
      if (!q) {
        return res.status(400).json({
          success: false,
          author: "Jaybohol",
          message: "Parameter 'q' atau URL diperlukan",
          usage: {
            search: "/soundcloud?q=lofi&limit=5",
            download: "/soundcloud?url=https://soundcloud.com/artist/track"
          }
        });
      }
      
      const limitVal = Math.min(Math.max(parseInt(limit) || 10, 1), 30);
      const results = await searchSoundCloud(q, limitVal);
      
      res.json({
        success: true,
        author: "Jaybohol",
        result: results.map(track => ({
          title: track.title,
          artist: track.artist,
          duration: track.duration,
          url: track.url,
          thumbnail: track.thumbnail
        }))
      });
      
    } catch (error) {
      console.error("SoundCloud API Error:", error.message);
      
      res.status(500).json({
        success: false,
        author: "Jaybohol",
        message: error.message || "Failed to process SoundCloud request"
      });
    }
  }
};

// ============= SOUNDCLOUD SEARCH =============

async function searchSoundCloud(query, limit = 10) {
  try {
    const clientId = await getSoundCloudClientId();
    
    const searchUrl = `https://api.soundcloud.com/tracks`;
    const response = await axios.get(searchUrl, {
      params: {
        q: query,
        limit: limit,
        client_id: clientId,
        linked_partitioning: 1
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    if (!response.data || !response.data.collection) {
      return [];
    }
    
    return response.data.collection.map(track => ({
      id: track.id,
      title: track.title,
      artist: track.user.username,
      duration: formatDuration(track.duration),
      duration_ms: track.duration,
      url: track.permalink_url,
      thumbnail: track.artwork_url || track.user.avatar_url
    }));
    
  } catch (error) {
    console.error("SoundCloud Search Error:", error.message);
    return await searchSoundCloudFallback(query, limit);
  }
}

// ============= SOUNDCLOUD DOWNLOAD =============

async function downloadSoundCloud(url) {
  if (!url) {
    throw new Error('SoundCloud URL is required');
  }
  
  try {
    const trackId = await extractTrackId(url);
    
    if (!trackId) {
      throw new Error("Could not extract track ID from URL");
    }
    
    const clientId = await getSoundCloudClientId();
    
    const trackInfo = await axios.get(`https://api.soundcloud.com/tracks/${trackId}`, {
      params: { client_id: clientId },
      timeout: 10000
    });
    
    const track = trackInfo.data;
    
    // Get stream URL with client_id
    const streamUrl = track.stream_url ? `${track.stream_url}?client_id=${clientId}` : null;
    
    // Get download URL if available
    let downloadUrl = track.download_url;
    if (downloadUrl) {
      downloadUrl = `${downloadUrl}?client_id=${clientId}`;
    }
    
    return {
      title: track.title,
      duration: formatDuration(track.duration),
      stream_url: streamUrl,
      download_url: downloadUrl || streamUrl
    };
    
  } catch (error) {
    console.error("SoundCloud Download Error:", error.message);
    return await downloadSoundCloudFallback(url);
  }
}

// ============= HELPER FUNCTIONS =============

async function getSoundCloudClientId() {
  const clientIds = [
    'a3e059563d7fd3372b49b37f00a00bcf',
    'gmV7Q5rVbGZB3J9A8QrLpY8QqLc7J6kZ',
    'l8r4Z7vK2pQ5xW9mN3jF6hT1yB8cD0eR',
    '2t9k7m4p6q8r0s2u4w6y8a0c2e4g6i8k',
    'pL8mN3bV7cX2zQ5wE9rT4yU6iA8oP0'
  ];
  
  return clientIds[Math.floor(Math.random() * clientIds.length)];
}

async function extractTrackId(url) {
  try {
    const urlPatterns = [
      /soundcloud\.com\/(?:[^\/]+)\/(?:[^\/]+)(?:-(\d+))?$/,
      /soundcloud\.com\/tracks\/(\d+)/,
      /soundcloud\.com\/playlists\/(\d+)/
    ];
    
    for (const pattern of urlPatterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    
    const trackIdMeta = $('meta[property="soundcloud:track:id"]').attr('content');
    if (trackIdMeta) {
      return trackIdMeta;
    }
    
    const scripts = $('script').toArray();
    for (const script of scripts) {
      const content = $(script).html();
      if (content && content.includes('track_id')) {
        const match = content.match(/track_id["']?\s*:\s*(\d+)/);
        if (match) {
          return match[1];
        }
      }
    }
    
    return null;
    
  } catch (error) {
    console.error("Extract Track ID Error:", error.message);
    return null;
  }
}

async function searchSoundCloudFallback(query, limit = 10) {
  try {
    const response = await axios.get(`https://soundcloud.com/search/sounds`, {
      params: { q: query },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const results = [];
    
    $('.soundList__item, .searchItem').each((i, elem) => {
      if (results.length >= limit) return false;
      
      const titleElem = $(elem).find('.soundTitle__title, .trackItem__title');
      const title = titleElem.text().trim();
      const link = titleElem.attr('href') || $(elem).find('a').first().attr('href');
      const artist = $(elem).find('.soundTitle__username, .trackItem__username').text().trim();
      const duration = $(elem).find('.duration, .trackItem__duration').text().trim();
      const thumbnail = $(elem).find('img').attr('src');
      
      if (title && link) {
        results.push({
          title: title,
          artist: artist || "Unknown Artist",
          duration: duration || "N/A",
          url: link.startsWith('http') ? link : `https://soundcloud.com${link}`,
          thumbnail: thumbnail || null
        });
      }
    });
    
    return results;
    
  } catch (error) {
    console.error("Fallback Search Error:", error.message);
    return [];
  }
}

async function downloadSoundCloudFallback(url) {
  try {
    const downloadApi = `https://soundcloud-downloader.vercel.app/api?url=${encodeURIComponent(url)}`;
    
    const response = await axios.get(downloadApi, {
      timeout: 20000
    });
    
    if (response.data && response.data.url) {
      return {
        title: response.data.title || "SoundCloud Track",
        duration: response.data.duration || "N/A",
        download_url: response.data.url
      };
    }
    
    throw new Error("No download URL found");
    
  } catch (error) {
    console.error("Fallback Download Error:", error.message);
    throw new Error("Unable to download track. The track may be private or not available for download.");
  }
}

function formatDuration(ms) {
  if (!ms) return "N/A";
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}:${seconds.padStart(2, '0')}`;
}
