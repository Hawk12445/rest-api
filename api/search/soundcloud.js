const axios = require("axios");
const cheerio = require("cheerio");
const qs = require("querystring");

module.exports = {
  meta: {
    name: "SoundCloud Downloader",
    description: "Search and download tracks from SoundCloud",
    author: "Jaybohol",
    version: "1.0.0",
    category: "music",
    method: "GET",
    path: "/soundcloud?q=&limit="
  },
  
  onStart: async function({ req, res }) {
    try {
      const { q, url, limit = 10 } = req.query;
      
      // Check if it's a download request (by URL) or search request (by query)
      if (url) {
        // Download track by URL
        const result = await downloadSoundCloud(url);
        
        return res.json({
          status: true,
          operator: "Jaybohol",
          action: "download",
          track: {
            title: result.title,
            full_title: result.full_title,
            download_url: result.download_url
          },
          timestamp: new Date().toISOString()
        });
      }
      
      // Search tracks by query
      if (!q) {
        return res.status(400).json({
          status: false,
          operator: "Jaybohol",
          error: "Search query (q) or URL is required",
          usage: {
            search: "/soundcloud?q=lofi&limit=5",
            download: "/soundcloud?url=https://soundcloud.com/artist/track"
          }
        });
      }
      
      const limitVal = Math.min(Math.max(parseInt(limit) || 10, 1), 50);
      const results = await searchSoundCloud(q, limitVal);
      
      res.json({
        status: true,
        operator: "Jaybohol",
        action: "search",
        query: q,
        limit: limitVal,
        count: results.length,
        tracks: results,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error("SoundCloud API Error:", error.message);
      
      res.status(500).json({
        status: false,
        operator: "Jaybohol",
        error: error.message || "Failed to process SoundCloud request",
        timestamp: new Date().toISOString()
      });
    }
  }
};

// ============= SOUNDCLOUD SEARCH =============

const SEARCH_BASE_URL = 'https://www.forhub.io/soundcloud/';
const DOWNLOAD_API = 'https://www.forhub.io/download.php';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 10; RMX2185 Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.7444.171 Mobile Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'sec-ch-ua': '"Chromium";v="142", "Android WebView";v="142", "Not_A Brand";v="99"',
  'sec-ch-ua-mobile': '?1',
  'sec-ch-ua-platform': '"Android"',
  'upgrade-insecure-requests': '1'
};

async function searchSoundCloud(query, limit = 10) {
  try {
    // Build search URL
    const searchUrl = `https://www.forhub.io/soundcloud/search.php?q=${encodeURIComponent(query)}`;
    
    const response = await axios.get(searchUrl, {
      headers: HEADERS,
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const results = [];
    
    // Parse search results from the page
    // Looking for track items based on forhub.io structure
    $('.track-item, .search-result-item, .song-item').each((i, elem) => {
      if (results.length >= limit) return false;
      
      const titleElem = $(elem).find('.title, .song-title, .track-title');
      const title = titleElem.text().trim();
      const linkElem = $(elem).find('a');
      let trackUrl = linkElem.attr('href');
      
      // Extract SoundCloud URL from the link
      if (trackUrl && trackUrl.includes('/soundcloud/')) {
        // This might be an internal forhub URL, need to extract actual SoundCloud URL
        trackUrl = trackUrl;
      }
      
      const artist = $(elem).find('.artist, .author').text().trim();
      const duration = $(elem).find('.duration, .time').text().trim();
      const plays = $(elem).find('.plays, .play-count').text().trim();
      const thumbnail = $(elem).find('img').attr('src');
      
      if (title && trackUrl) {
        results.push({
          title: title,
          artist: artist || "Unknown Artist",
          url: trackUrl.startsWith('http') ? trackUrl : `https://www.forhub.io${trackUrl}`,
          duration: duration || "N/A",
          plays: plays || "N/A",
          thumbnail: thumbnail || null
        });
      }
    });
    
    // If no results found via scraping, return empty array
    return results;
    
  } catch (error) {
    console.error("SoundCloud Search Error:", error.message);
    throw new Error("Failed to search SoundCloud: " + error.message);
  }
}

async function downloadSoundCloud(url) {
  if (!url) {
    throw new Error('SoundCloud URL is required');
  }
  
  try {
    // 1. GET Request to get CSRF Token and Cookies
    const pageResponse = await axios.get(SEARCH_BASE_URL, { 
      headers: HEADERS,
      timeout: 15000
    });
    
    // Get cookies from response headers
    const rawCookies = pageResponse.headers['set-cookie'];
    if (!rawCookies || rawCookies.length === 0) {
      throw new Error("Failed to get cookies from forhub.io");
    }
    
    // Format cookie string (especially PHPSESSID)
    const cookieStr = rawCookies.map(c => c.split(';')[0]).join('; ');
    
    // Load HTML with Cheerio to get hidden input csrf_token
    const $ = cheerio.load(pageResponse.data);
    const csrfToken = $('input[name="csrf_token"]').val();
    
    if (!csrfToken) {
      throw new Error("Failed to get CSRF token");
    }
    
    // 2. POST Request to download.php
    const payload = qs.stringify({
      'csrf_token': csrfToken,
      'formurl': url
    });
    
    const postHeaders = {
      ...HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Origin': 'https://www.forhub.io',
      'Referer': 'https://www.forhub.io/soundcloud/en8/',
      'Cookie': cookieStr,
      'x-requested-with': 'mark.via.gp'
    };
    
    const downloadResponse = await axios.post(DOWNLOAD_API, payload, {
      headers: postHeaders,
      timeout: 20000
    });
    
    // 3. Extract results from HTML response
    const $dl = cheerio.load(downloadResponse.data);
    
    // Look for download div with id="dlMP3"
    const downloadDiv = $dl('#dlMP3');
    
    if (downloadDiv.length === 0) {
      // Try alternative selectors
      const altDownload = $dl('.download-btn, .download-link, a[href*="download"]');
      if (altDownload.length > 0) {
        const directUrl = altDownload.attr('href');
        if (directUrl) {
          return {
            title: "SoundCloud Track",
            full_title: "SoundCloud Track.mp3",
            download_url: directUrl
          };
        }
      }
      throw new Error("Download link not found. The track may be unavailable.");
    }
    
    // Get data-src (base64) and data-name attributes
    const encodedUrl = downloadDiv.attr('data-src');
    const fileName = downloadDiv.attr('data-name');
    const fullTitle = downloadDiv.attr('title');
    
    if (!encodedUrl) {
      throw new Error("Download URL not found");
    }
    
    // Decode Base64 to actual URL
    let decodedUrl = encodedUrl;
    try {
      decodedUrl = Buffer.from(encodedUrl, 'base64').toString('utf-8');
    } catch (e) {
      // If not base64, use as is
      decodedUrl = encodedUrl;
    }
    
    const result = {
      title: fileName || "SoundCloud Track",
      full_title: fullTitle ? fullTitle.replace('Download ', '') : (fileName ? fileName + '.mp3' : "soundcloud_track.mp3"),
      download_url: decodedUrl
    };
    
    return result;
    
  } catch (error) {
    if (error.response) {
      throw new Error(`HTTP Error: ${error.response.status} - ${error.response.statusText}`);
    }
    throw new Error(error.message || 'Error downloading from SoundCloud');
  }
}
