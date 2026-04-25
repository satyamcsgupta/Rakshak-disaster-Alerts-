const languages = [
  { name: 'English', field: 'messageEnglish', voiceCode: 'en-IN' },
  { name: 'Hindi', field: 'messageHindi', voiceCode: 'hi-IN' },
  { name: 'Marathi', field: 'messageMarathi', voiceCode: 'mr-IN' },
  { name: 'Gujarati', field: 'messageGujarati', voiceCode: 'gu-IN' },
  { name: 'Bengali', field: 'messageBengali', voiceCode: 'bn-IN' },
  { name: 'Tamil', field: 'messageTamil', voiceCode: 'ta-IN' },
  { name: 'Telugu', field: 'messageTelugu', voiceCode: 'te-IN' },
  { name: 'Kannada', field: 'messageKannada', voiceCode: 'kn-IN' },
  { name: 'Malayalam', field: 'messageMalayalam', voiceCode: 'ml-IN' },
  { name: 'Punjabi', field: 'messagePunjabi', voiceCode: 'pa-IN' },
  { name: 'Odia', field: 'messageOdia', voiceCode: 'or-IN' }
];

const languageNames = languages.map((language) => language.name);

const languageCodeMap = {
  en: 'English',
  hi: 'Hindi',
  mr: 'Marathi',
  gu: 'Gujarati',
  bn: 'Bengali',
  ta: 'Tamil',
  te: 'Telugu',
  kn: 'Kannada',
  ml: 'Malayalam',
  pa: 'Punjabi',
  or: 'Odia'
};

const detectLanguageFromHeader = (acceptLanguageHeader) => {
  if (!acceptLanguageHeader || typeof acceptLanguageHeader !== 'string') {
    return null;
  }

  const candidates = acceptLanguageHeader
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .map((part) => part.split(';')[0]);

  for (const candidate of candidates) {
    const code = candidate.split('-')[0];
    if (languageCodeMap[code]) {
      return languageCodeMap[code];
    }
  }

  return null;
};

module.exports = {
  languages,
  languageNames,
  detectLanguageFromHeader
};
