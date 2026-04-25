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

const translateList = async (items, language) => Promise.all(items.map((item) => translateText(item, language)));

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
    translateText(severityNote, language),
    translateText(preparednessNote, language),
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
