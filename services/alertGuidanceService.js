const { translateText } = require('./translationService');

const disasterGuidance = {
  flood: {
    immediateActions: [
      'Move to higher ground as early as possible.',
      'Keep phones charged and carry essential documents in a waterproof bag.',
      'Follow official evacuation directions without waiting for water to rise further.'
    ],
    avoidActions: [
      'Do not walk or drive through flood water.',
      'Do not touch wet electrical switches or fallen wires.',
      'Do not return home until officials declare the area safer.'
    ],
    checklist: [
      'Drinking water',
      'Torch and power bank',
      'Dry food and medicines',
      'Waterproof document pouch'
    ]
  },
  cyclone: {
    immediateActions: [
      'Stay indoors and away from windows.',
      'Secure light outdoor items and keep emergency supplies ready.',
      'Track official updates because wind speed and landfall timing may change.'
    ],
    avoidActions: [
      'Do not go outside during strong winds, even if conditions look calm.',
      'Do not park under weak trees, poles, or loose structures.',
      'Do not ignore evacuation orders in coastal or low-lying areas.'
    ],
    checklist: [
      'Battery radio or phone',
      'Emergency medicines',
      'Stored clean water',
      'Blanket and rain protection'
    ]
  },
  earthquake: {
    immediateActions: [
      'Drop, cover, and hold under sturdy furniture.',
      'Move away from glass, shelves, and unstable objects.',
      'After shaking stops, exit carefully to an open area if safe.'
    ],
    avoidActions: [
      'Do not use lifts during or immediately after shaking.',
      'Do not stand near walls, balconies, or cracked structures.',
      'Do not rush back inside until damage is checked.'
    ],
    checklist: [
      'First-aid kit',
      'Flashlight',
      'Emergency whistle',
      'Shoes kept near bed'
    ]
  },
  fire: {
    immediateActions: [
      'Evacuate immediately using the nearest safe exit.',
      'Stay low if smoke is spreading indoors.',
      'Call emergency services and alert nearby people.'
    ],
    avoidActions: [
      'Do not use lifts.',
      'Do not open very hot doors suddenly.',
      'Do not go back for valuables once you evacuate.'
    ],
    checklist: [
      'Face covering or cloth',
      'Torch',
      'Emergency contact numbers',
      'Small first-aid pouch'
    ]
  },
  heatwave: {
    immediateActions: [
      'Drink water regularly even if you do not feel thirsty.',
      'Stay indoors or in shade during peak afternoon hours.',
      'Check on children, elderly people, and outdoor workers.'
    ],
    avoidActions: [
      'Do not stay in direct sun for long periods.',
      'Do not leave children or pets in parked vehicles.',
      'Do not ignore dizziness, nausea, or dehydration signs.'
    ],
    checklist: [
      'Drinking water',
      'ORS or electrolyte packets',
      'Cap or umbrella',
      'Light cotton clothing'
    ]
  },
  landslide: {
    immediateActions: [
      'Move away from steep slopes, damaged roads, and loose debris.',
      'Listen for unusual ground sounds, cracking, or rolling stones.',
      'Shift to a safer structure or relief point if advised.'
    ],
    avoidActions: [
      'Do not stand near retaining walls or weak hill edges.',
      'Do not travel on blocked or water-damaged roads.',
      'Do not ignore repeated small slides or soil movement.'
    ],
    checklist: [
      'Torch',
      'Essential medicines',
      'Important documents',
      'Battery backup'
    ]
  }
};

const defaultGuidance = {
  immediateActions: [
    'Stay alert and monitor official updates.',
    'Keep your phone charged and essential items ready.',
    'Move to a safer place if local authorities advise it.'
  ],
  avoidActions: [
    'Do not spread unverified messages.',
    'Do not ignore local emergency instructions.',
    'Do not delay preparing your emergency kit.'
  ],
  checklist: [
    'Phone and charger',
    'Medicines',
    'Drinking water',
    'ID documents'
  ]
};

const severityAdvice = {
  High: 'High severity means immediate attention and rapid action are important.',
  Medium: 'Medium severity means conditions can worsen, so prepare early and stay alert.',
  Low: 'Low severity means stay informed and keep basic precautions ready.'
};

const helplines = [
  { label: 'National Emergency', number: '112' },
  { label: 'Ambulance', number: '108' },
  { label: 'Disaster Helpline', number: '1078' }
];

const localGuidanceTranslations = {
  Marathi: {
    'Stay alert and monitor official updates.': 'सतर्क रहा आणि अधिकृत सूचना तपासत रहा.',
    'Keep your phone charged and essential items ready.': 'फोन चार्ज ठेवा आणि आवश्यक वस्तू तयार ठेवा.',
    'Move to a safer place if local authorities advise it.': 'स्थानिक प्रशासनाने सांगितल्यास सुरक्षित ठिकाणी जा.',
    'Do not spread unverified messages.': 'अप्रमाणित संदेश पसरवू नका.',
    'Do not ignore local emergency instructions.': 'स्थानिक आपत्कालीन सूचनांकडे दुर्लक्ष करू नका.',
    'Do not delay preparing your emergency kit.': 'आपत्कालीन किट तयार करण्यात उशीर करू नका.',
    'Phone and charger': 'फोन आणि चार्जर',
    'Medicines': 'औषधे',
    'Drinking water': 'पिण्याचे पाणी',
    'ID documents': 'ओळखपत्रे',
    'Medium severity means conditions can worsen, so prepare early and stay alert.': 'मध्यम तीव्रतेचा अर्थ परिस्थिती बिघडू शकते, म्हणून लवकर तयारी करा आणि सतर्क रहा.',
    'Keep emergency supplies, identity documents, and trusted contacts ready.': 'आपत्कालीन साहित्य, ओळखपत्रे आणि विश्वासू संपर्क तयार ठेवा.'
  },
  Hindi: {
    'Stay alert and monitor official updates.': 'सतर्क रहें और आधिकारिक सूचनाएं देखते रहें.',
    'Keep your phone charged and essential items ready.': 'फोन चार्ज रखें और जरूरी सामान तैयार रखें.',
    'Move to a safer place if local authorities advise it.': 'स्थानीय प्रशासन कहे तो सुरक्षित स्थान पर जाएं.',
    'Do not spread unverified messages.': 'अपुष्ट संदेश न फैलाएं.',
    'Do not ignore local emergency instructions.': 'स्थानीय आपातकालीन निर्देशों को नजरअंदाज न करें.',
    'Do not delay preparing your emergency kit.': 'आपातकालीन किट तैयार करने में देरी न करें.',
    'Phone and charger': 'फोन और चार्जर',
    'Medicines': 'दवाइयां',
    'Drinking water': 'पीने का पानी',
    'ID documents': 'पहचान दस्तावेज',
    'Medium severity means conditions can worsen, so prepare early and stay alert.': 'मध्यम गंभीरता का मतलब है कि स्थिति बिगड़ सकती है, इसलिए जल्दी तैयारी करें और सतर्क रहें.',
    'Keep emergency supplies, identity documents, and trusted contacts ready.': 'आपातकालीन सामान, पहचान दस्तावेज और भरोसेमंद संपर्क तैयार रखें.'
  },
  Gujarati: {
    'Stay alert and monitor official updates.': 'સતર્ક રહો અને સત્તાવાર અપડેટ્સ તપાસતા રહો.',
    'Keep your phone charged and essential items ready.': 'ફોન ચાર્જ રાખો અને જરૂરી વસ્તુઓ તૈયાર રાખો.',
    'Move to a safer place if local authorities advise it.': 'સ્થાનિક સત્તાવાળાઓ કહે તો સુરક્ષિત જગ્યાએ જાઓ.'
  },
  Bengali: {
    'Stay alert and monitor official updates.': 'সতর্ক থাকুন এবং সরকারি আপডেট দেখুন.',
    'Keep your phone charged and essential items ready.': 'ফোন চার্জ রাখুন এবং জরুরি জিনিস প্রস্তুত রাখুন.',
    'Move to a safer place if local authorities advise it.': 'স্থানীয় কর্তৃপক্ষ বললে নিরাপদ স্থানে যান.'
  },
  Tamil: {
    'Stay alert and monitor official updates.': 'எச்சரிக்கையாக இருந்து அதிகாரப்பூர்வ தகவல்களை கவனியுங்கள்.',
    'Keep your phone charged and essential items ready.': 'தொலைபேசியை சார்ஜ் செய்து அவசிய பொருட்களை தயார் வைத்திருங்கள்.',
    'Move to a safer place if local authorities advise it.': 'உள்ளூர் அதிகாரிகள் அறிவுறுத்தினால் பாதுகாப்பான இடத்திற்கு செல்லுங்கள்.'
  },
  Kannada: {
    'Stay alert and monitor official updates.': 'ಎಚ್ಚರಿಕೆಯಿಂದಿರಿ ಮತ್ತು ಅಧಿಕೃತ ನವೀಕರಣಗಳನ್ನು ಗಮನಿಸಿ.',
    'Keep your phone charged and essential items ready.': 'ಫೋನ್ ಚಾರ್ಜ್ ಇಡಿ ಮತ್ತು ಅಗತ್ಯ ವಸ್ತುಗಳನ್ನು ಸಿದ್ಧವಾಗಿಡಿ.',
    'Move to a safer place if local authorities advise it.': 'ಸ್ಥಳೀಯ ಅಧಿಕಾರಿಗಳು ಸೂಚಿಸಿದರೆ ಸುರಕ್ಷಿತ ಸ್ಥಳಕ್ಕೆ ಹೋಗಿ.'
  },
  Malayalam: {
    'Stay alert and monitor official updates.': 'ജാഗ്രത പാലിച്ച് ഔദ്യോഗിക വിവരങ്ങൾ ശ്രദ്ധിക്കുക.',
    'Keep your phone charged and essential items ready.': 'ഫോൺ ചാർജിൽ വച്ച് ആവശ്യ സാധനങ്ങൾ തയ്യാറാക്കി വയ്ക്കുക.',
    'Move to a safer place if local authorities advise it.': 'പ്രാദേശിക അധികാരികൾ നിർദേശിച്ചാൽ സുരക്ഷിത സ്ഥലത്തേക്ക് മാറുക.'
  }
};

const translateGuidanceText = async (text, language) => (
  localGuidanceTranslations[language]?.[text] || translateText(text, language)
);

const normalizeDisasterType = (value = '') => value.toLowerCase().trim();

const findGuidanceTemplate = (disasterType) => {
  const normalized = normalizeDisasterType(disasterType);
  const matchedKey = Object.keys(disasterGuidance).find((key) => normalized.includes(key));
  return matchedKey ? disasterGuidance[matchedKey] : defaultGuidance;
};

const simplifyMessage = (message, severity) => {
  const cleanMessage = (message || '').replace(/\s+/g, ' ').trim();
  if (!cleanMessage) {
    return severityAdvice[severity] || severityAdvice.Low;
  }

  const sentenceMatch = cleanMessage.match(/[^.!?]+[.!?]?/);
  const firstSentence = sentenceMatch ? sentenceMatch[0].trim() : cleanMessage;

  if (firstSentence.length <= 140) {
    return firstSentence;
  }

  return `${firstSentence.slice(0, 137).trim()}...`;
};

const translateList = async (items, language) => {
  const translated = [];
  for (const item of items) {
    translated.push(await translateGuidanceText(item, language));
  }
  return translated;
};

const buildGuidance = async ({ disasterType, severity, message, precautions }, language = 'English') => {
  const template = findGuidanceTemplate(disasterType);
  const summarySource = simplifyMessage(message, severity);
  const severityNote = severityAdvice[severity] || severityAdvice.Low;
  const preparednessNote = precautions
    ? `Precaution focus: ${precautions}`
    : 'Keep emergency supplies, identity documents, and trusted contacts ready.';

  const [
    summary,
    localizedSeverityNote,
    localizedPreparednessNote,
    immediateActions,
    avoidActions,
    checklist
  ] = await Promise.all([
    translateText(`Quick summary: ${summarySource}`, language),
    translateGuidanceText(severityNote, language),
    translateGuidanceText(preparednessNote, language),
    translateList(template.immediateActions, language),
    translateList(template.avoidActions, language),
    translateList(template.checklist, language)
  ]);

  return {
    summary,
    severityNote: localizedSeverityNote,
    preparednessNote: localizedPreparednessNote,
    immediateActions,
    avoidActions,
    checklist,
    helplines
  };
};

module.exports = {
  buildGuidance
};
