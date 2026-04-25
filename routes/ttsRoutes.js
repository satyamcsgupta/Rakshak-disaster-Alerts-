const express = require('express');
const router = express.Router();

const languageCodes = {
  English: 'en',
  Hindi: 'hi',
  Marathi: 'mr',
  Gujarati: 'gu',
  Bengali: 'bn',
  Tamil: 'ta',
  Telugu: 'te',
  Kannada: 'kn',
  Malayalam: 'ml',
  Punjabi: 'pa',
  Odia: 'or'
};

router.get('/', async (req, res) => {
  let text = String(req.query.text || '').trim();
  const language = String(req.query.language || 'English');
  const languageCode = languageCodes[language] || 'en';

  if (!text) {
    return res.status(400).json({ error: 'Text is required.' });
  }

  // Safety truncate for Google TTS limit
  if (text.length > 200) {
    text = text.substring(0, 200);
  }

  try {
    console.log(`TTS Request: "${text.substring(0, 30)}..." in ${language} (${languageCode})`);
    
    const url = new URL('https://translate.googleapis.com/translate_tts');
    url.searchParams.set('ie', 'UTF-8');
    url.searchParams.set('client', 'tw-ob');
    url.searchParams.set('tl', languageCode);
    url.searchParams.set('q', text);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`TTS Google API Error: ${response.status} - ${errorText}`);
      throw new Error(`TTS request failed with status ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    
    console.log(`TTS Success: Generated ${audioBuffer.length} bytes of audio`);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    return res.send(audioBuffer);
  } catch (error) {
    console.error('TTS Server Exception:', error);
    return res.status(500).json({ error: 'Voice playback failed.', details: error.message });
  }
});

module.exports = router;
