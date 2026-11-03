// Simple Express backend for Gemini API proxy
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());


// Gemini API endpoints
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
const GEMINI_API_AUDIO_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.post('/api/gemini', async (req, res) => {
  try {
    const { prompt, systemInstruction, audio } = req.body;
    let url = audio ? `${GEMINI_API_AUDIO_URL}?key=${GEMINI_API_KEY}` : `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;
    let body = audio
      ? {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Charon" } } }
          }
        }
      : {
          contents: [{ parts: [{ text: prompt }] }],
          ...(systemInstruction && { systemInstruction: { parts: [{ text: systemInstruction }] } })
        };
    const response = await axios.post(url, body);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

app.listen(PORT, () => {
  console.log(`Gemini backend running on port ${PORT}`);
});
