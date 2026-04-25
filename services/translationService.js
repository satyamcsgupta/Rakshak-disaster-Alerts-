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

const translationCache = new Map();

const translateText = async (text, language) => {
  const targetCode = languageCodes[language];

  if (!text || !targetCode || targetCode === 'en') {
    return text;
  }

  const cacheKey = `${targetCode}:${text}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const url = new URL('https://translate.googleapis.com/translate_a/single');
    url.searchParams.set('client', 'gtx');
    url.searchParams.set('sl', 'auto');
    url.searchParams.set('tl', targetCode);
    url.searchParams.set('dt', 't');
    url.searchParams.set('q', text);

    const response = await fetch(url, {
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Translation failed with status ${response.status}`);
    }

    const data = await response.json();
    const translated = data?.[0]?.map((item) => item?.[0]).join('') || text;

    translationCache.set(cacheKey, translated);
    return translated;
  } catch (error) {
    console.error('Translation failed:', error.message);
    return text;
  } finally {
    clearTimeout(timeout);
  }
};

const translateOfficialAlerts = async (alerts, language) => {
  if (language === 'English') return alerts;

  return Promise.all(alerts.map(async (alert) => ({
    ...alert,
    originalTitle: alert.title,
    originalDescription: alert.description,
    title: await translateText(alert.title, language),
    description: await translateText(alert.description, language),
    translatedLanguage: language
  })));
};

module.exports = {
  translateText,
  translateOfficialAlerts
};
