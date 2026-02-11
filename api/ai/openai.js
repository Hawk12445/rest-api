const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Directory to store memory files
const memoryDir = './memory';

// Ensure the memory directory exists
async function ensureMemoryDirExists() {
    try {
        await fs.mkdir(memoryDir, { recursive: true });
    } catch (error) {
        console.error('Error creating memory directory:', error.message);
        process.exit(1);
    }
}

ensureMemoryDirExists();

// Conversation memory (temporary, by UID)
const memory = {};

// Load environment variables (assuming you're using dotenv)
require('dotenv').config(); //Ensure .env file is in the root directory

const meta = {
    name: 'OpenAIChat',
    path: '/openai?prompt=&uid=',
    method: 'get',
    category: 'ai'
};

async function saveMemory(uid, conversationHistory) {
    const filePath = path.join(memoryDir, `memory_${uid}.json`);
    try {
        const jsonData = JSON.stringify(conversationHistory, null, 2);
        await fs.writeFile(filePath, jsonData, 'utf8');
        console.log(`Memory saved for UID ${uid} to ${filePath}`);
    } catch (error) {
        console.error(`Memory save error for UID ${uid}:`, error.message);
    }
}

async function loadMemory(uid) {
    const filePath = path.join(memoryDir, `memory_${uid}.json`);
    try {
        await fs.access(filePath, fs.constants.F_OK);
        const data = await fs.readFile(filePath, 'utf8');
        console.log(`Memory loaded for UID ${uid} from ${filePath}`);
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log(`No memory file found for UID ${uid}. Starting with a fresh context.`);
            return null;
        } else {
            console.error(`Memory load error for UID ${uid}:`, error.message);
            return null;
        }
    }
}

async function onStart({ req, res }) {
    const { prompt, uid } = req.query;

    if (!prompt || !uid) {
        return res.status(400).json({
            error: 'Both prompt and uid parameters are required',
            example: '/openai?prompt=hello&uid=123'
        });
    }

    // Load or initialize memory
    let conversationHistory = memory[uid] || await loadMemory(uid) || [
        { role: "system", content: "You are a helpful assistant." }
    ];
    memory[uid] = conversationHistory; // Update the in-memory cache

    // Add user message to conversation history
    conversationHistory.push({ role: "user", content: prompt });

    try {
        // Construct request body
        const requestBody = {
            model: "gpt-4o-mini",
            messages: conversationHistory
        };

        // Get API key from environment variables
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            console.error("OpenAI API key not found in environment variables.");
            return res.status(500).json({ status: false, error: "OpenAI API key not configured." });
        }

        // Make API request to OpenAI
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            requestBody,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }
            }
        );

        // Extract AI response
        const aiResponse = response.data.choices[0].message.content;

        // Add AI response to conversation history
        conversationHistory.push({ role: "assistant", content: aiResponse });

        // Save memory (both in-memory and to file)
        memory[uid] = conversationHistory; // Update the in-memory cache
        await saveMemory(uid, conversationHistory);

        // Send response to client
        res.json({
            status: true,
            response: aiResponse
        });

    } catch (error) {
        console.error('OpenAI API Error:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        });

        res.status(500).json({
            status: false,
            error: error.response?.data || error.message
        });
    }
}

module.exports = { meta, onStart };
