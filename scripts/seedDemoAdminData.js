require('dotenv').config();
const mongoose = require('mongoose');
const Alert = require('../models/Alert');
const Resource = require('../models/Resource');
const SOS = require('../models/SOS');

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/disaster_alert_mvp';

const demoAlerts = [
  {
    title: '[Demo] Pune Flash Flood Warning',
    disasterType: 'Flood',
    state: 'Maharashtra',
    city: 'Pune',
    severity: 'High',
    latitude: 18.5204,
    longitude: 73.8567,
    messageEnglish: 'Heavy rainfall has caused waterlogging near low-lying roads. Avoid river crossings and underpasses.',
    messageHindi: 'तेज बारिश के कारण निचले रास्तों पर जलभराव है। नदी पार करने और अंडरपास से बचें।',
    messageMarathi: 'मुसळधार पावसामुळे सखल रस्त्यांवर पाणी साचले आहे. नदी ओलांडणे आणि अंडरपास टाळा.',
    messageGujarati: 'ભારે વરસાદથી નીચાણવાળા રસ્તાઓ પર પાણી ભરાયું છે. નદી ક્રોસિંગ અને અંડરપાસ ટાળો.',
    messageBengali: 'ভারী বৃষ্টির কারণে নিচু রাস্তায় জল জমেছে। নদী পারাপার এবং আন্ডারপাস এড়িয়ে চলুন।',
    messageTamil: 'கனமழையால் தாழ்வான சாலைகளில் நீர் தேங்கியுள்ளது. ஆற்றைக் கடத்தலும் அடிப்பாதைகளும் தவிர்க்கவும்.',
    messageTelugu: 'భారీ వర్షంతో లోతట్టు రహదారుల్లో నీరు నిలిచింది. నది దాటడం మరియు అండర్‌పాస్‌లను నివారించండి.',
    messageKannada: 'ಭಾರಿ ಮಳೆಯಿಂದ ತಗ್ಗು ರಸ್ತೆಗಳು ನೀರಿನಿಂದ ತುಂಬಿವೆ. ನದಿ ದಾಟುವುದು ಮತ್ತು ಅಂಡರ್‌ಪಾಸ್‌ಗಳನ್ನು ತಪ್ಪಿಸಿ.',
    messageMalayalam: 'കനത്ത മഴ മൂലം താഴ്ന്ന റോഡുകളിൽ വെള്ളക്കെട്ടുണ്ട്. നദി കടക്കലും അണ്ടർപാസുകളും ഒഴിവാക്കുക.',
    messagePunjabi: 'ਭਾਰੀ ਮੀਂਹ ਕਾਰਨ ਹੇਠਲੇ ਰਸਤੇ ਪਾਣੀ ਨਾਲ ਭਰੇ ਹਨ। ਦਰਿਆ ਪਾਰ ਕਰਨ ਅਤੇ ਅੰਡਰਪਾਸ ਤੋਂ ਬਚੋ।',
    messageOdia: 'ଭାରୀ ବର୍ଷା ଯୋଗୁଁ ନିମ୍ନ ରାସ୍ତାରେ ପାଣି ଜମିଛି। ନଦୀ ପାର ଏବଂ ଅଣ୍ଡରପାସ୍ ଏଡ଼ନ୍ତୁ।',
    precautions: 'Move to higher floors, keep phones charged, avoid flooded roads, and follow admin updates.'
  },
  {
    title: '[Demo] Mumbai Coastal Wind Alert',
    disasterType: 'Cyclone',
    state: 'Maharashtra',
    city: 'Mumbai',
    severity: 'Medium',
    latitude: 19.0760,
    longitude: 72.8777,
    messageEnglish: 'Strong coastal winds are expected this evening. Secure loose objects and stay away from beaches.',
    messageHindi: 'आज शाम तटीय क्षेत्रों में तेज हवाएं चल सकती हैं। ढीली वस्तुएं सुरक्षित करें और समुद्र तट से दूर रहें।',
    messageMarathi: 'आज संध्याकाळी किनारी भागात जोरदार वारे अपेक्षित आहेत. सैल वस्तू सुरक्षित करा आणि समुद्रकिनाऱ्यापासून दूर रहा.',
    messageGujarati: 'આજે સાંજે દરિયાકાંઠે તેજ પવનની શક્યતા છે. ઢીલા સામાન સુરક્ષિત કરો અને બીચથી દૂર રહો.',
    messageBengali: 'আজ সন্ধ্যায় উপকূলীয় এলাকায় প্রবল বাতাসের সম্ভাবনা রয়েছে। ঢিলা জিনিস সুরক্ষিত করুন এবং সৈকত থেকে দূরে থাকুন।',
    messageTamil: 'இன்று மாலை கடற்கரை பகுதிகளில் பலத்த காற்று எதிர்பார்க்கப்படுகிறது. தளர்ந்த பொருட்களை பாதுகாத்து கடற்கரையிலிருந்து விலகுங்கள்.',
    messageTelugu: 'ఈ సాయంత్రం తీర ప్రాంతాల్లో బలమైన గాలులు వీచే అవకాశం ఉంది. వదులైన వస్తువులను భద్రపరచండి మరియు బీచ్‌లకు దూరంగా ఉండండి.',
    messageKannada: 'ಇಂದು ಸಂಜೆ ಕರಾವಳಿ ಭಾಗಗಳಲ್ಲಿ ಬಲವಾದ ಗಾಳಿ ನಿರೀಕ್ಷಿಸಲಾಗಿದೆ. ಸಡಿಲ ವಸ್ತುಗಳನ್ನು ಸುರಕ್ಷಿತಗೊಳಿಸಿ ಮತ್ತು ಕಡಲತೀರಗಳಿಂದ ದೂರವಿರಿ.',
    messageMalayalam: 'ഇന്ന് വൈകുന്നേരം തീരപ്രദേശങ്ങളിൽ ശക്തമായ കാറ്റ് പ്രതീക്ഷിക്കുന്നു. ഇളകിയ വസ്തുക്കൾ ഉറപ്പാക്കുക, കടൽത്തീരങ്ങളിൽ നിന്ന് അകലെ നിൽക്കുക.',
    messagePunjabi: 'ਅੱਜ ਸ਼ਾਮ ਤਟੀਆ ਇਲਾਕਿਆਂ ਵਿੱਚ ਤੇਜ਼ ਹਵਾਵਾਂ ਦੀ ਸੰਭਾਵਨਾ ਹੈ। ਢਿੱਲੀਆਂ ਚੀਜ਼ਾਂ ਸੁਰੱਖਿਅਤ ਕਰੋ ਅਤੇ ਬੀਚ ਤੋਂ ਦੂਰ ਰਹੋ।',
    messageOdia: 'ଆଜି ସନ୍ଧ୍ୟାରେ ଉପକୂଳ ଅଞ୍ଚଳରେ ଜୋର ପବନ ହେବାର ସମ୍ଭାବନା ଅଛି। ଢିଲା ଜିନିଷ ସୁରକ୍ଷିତ କରନ୍ତୁ ଏବଂ ସମୁଦ୍ରତଟରୁ ଦୂରେ ରୁହନ୍ତୁ।',
    precautions: 'Stay indoors, avoid coastal travel, secure windows, and keep emergency lights ready.'
  },
  {
    title: '[Demo] Nagpur Heatwave Advisory',
    disasterType: 'Heatwave',
    state: 'Maharashtra',
    city: 'Nagpur',
    severity: 'Low',
    latitude: 21.1458,
    longitude: 79.0882,
    messageEnglish: 'Afternoon heat levels may rise. Drink water regularly and avoid outdoor work during peak heat.',
    messageHindi: 'दोपहर में गर्मी बढ़ सकती है। नियमित पानी पिएं और तेज धूप में बाहर काम करने से बचें।',
    messageMarathi: 'दुपारी उष्णता वाढू शकते. नियमित पाणी प्या आणि तीव्र उन्हात बाहेर काम टाळा.',
    messageGujarati: 'બપોરે ગરમી વધી શકે છે. નિયમિત પાણી પીવો અને કડક તાપમાં બહારનું કામ ટાળો.',
    messageBengali: 'দুপুরে তাপমাত্রা বাড়তে পারে। নিয়মিত জল পান করুন এবং তীব্র গরমে বাইরে কাজ এড়িয়ে চলুন।',
    messageTamil: 'மதிய வெப்பம் அதிகரிக்கலாம். தொடர்ந்து தண்ணீர் குடித்து கடும் வெப்பத்தில் வெளிப்பணி தவிர்க்கவும்.',
    messageTelugu: 'మధ్యాహ్నం వేడి పెరగవచ్చు. తరచుగా నీరు తాగండి మరియు ఎక్కువ వేడి సమయంలో బయట పని చేయవద్దు.',
    messageKannada: 'ಮಧ್ಯಾಹ್ನ ಬಿಸಿಲು ಹೆಚ್ಚಾಗಬಹುದು. ನಿಯಮಿತವಾಗಿ ನೀರು ಕುಡಿಯಿರಿ ಮತ್ತು ತೀವ್ರ ಬಿಸಿಲಿನಲ್ಲಿ ಹೊರ ಕೆಲಸ ತಪ್ಪಿಸಿ.',
    messageMalayalam: 'ഉച്ചയ്ക്കുള്ള ചൂട് കൂടാം. പതിവായി വെള്ളം കുടിക്കുക, ശക്തമായ ചൂടിൽ പുറം ജോലികൾ ഒഴിവാക്കുക.',
    messagePunjabi: 'ਦੁਪਹਿਰ ਦੀ ਗਰਮੀ ਵੱਧ ਸਕਦੀ ਹੈ। ਨਿਯਮਿਤ ਪਾਣੀ ਪੀਓ ਅਤੇ ਤੇਜ਼ ਗਰਮੀ ਵਿੱਚ ਬਾਹਰ ਕੰਮ ਤੋਂ ਬਚੋ।',
    messageOdia: 'ଦିନ ମଝିରେ ଗରମ ବଢ଼ିପାରେ। ନିୟମିତ ପାଣି ପିଉନ୍ତୁ ଏବଂ ତୀବ୍ର ଗରମରେ ବାହାର କାମ ଏଡ଼ନ୍ତୁ।',
    precautions: 'Carry water, wear light clothes, rest in shade, and check elderly family members.'
  }
];

const demoResources = [
  {
    name: '[Demo] Pune Municipal Relief Shelter',
    type: 'Shelter',
    state: 'Maharashtra',
    city: 'Pune',
    email: 'shelter.demo@rakshak.local',
    address: 'Shivajinagar Community Hall, Pune',
    latitude: 18.5308,
    longitude: 73.8475,
    capacity: '350 people',
    contactPhone: '020-40000001',
    isActive: true
  },
  {
    name: '[Demo] Mumbai Emergency Medical Camp',
    type: 'Medical Support',
    state: 'Maharashtra',
    city: 'Mumbai',
    email: 'medical.demo@rakshak.local',
    address: 'Dadar Relief Ground, Mumbai',
    latitude: 19.0180,
    longitude: 72.8448,
    capacity: '80 beds / first-aid desks',
    contactPhone: '022-40000002',
    isActive: true
  },
  {
    name: '[Demo] Nagpur Drinking Water Point',
    type: 'Water',
    state: 'Maharashtra',
    city: 'Nagpur',
    email: 'water.demo@rakshak.local',
    address: 'Sitabuldi Distribution Center, Nagpur',
    latitude: 21.1498,
    longitude: 79.0806,
    capacity: '6000 liters/day',
    contactPhone: '0712-4000003',
    isActive: true
  }
];

const demoSosRequests = [
  {
    userName: '[Demo] Asha Patil',
    contactNumber: '9000000001',
    state: 'Maharashtra',
    city: 'Pune',
    distressMessage: 'Water is entering the ground floor. Need evacuation support for family.',
    latitude: 18.5196,
    longitude: 73.8553,
    locationAccuracy: 18,
    locationSource: 'gps',
    locationCapturedAt: new Date(),
    status: 'Pending',
    urgency: 'Critical',
    verificationStatus: 'Verified',
    verifiedAt: new Date(),
    adminNote: 'Demo case: exact GPS captured, priority evacuation.'
  },
  {
    userName: '[Demo] Rohit Deshmukh',
    contactNumber: '9000000002',
    state: 'Maharashtra',
    city: 'Mumbai',
    distressMessage: 'Stuck near flooded underpass. Vehicle stopped and phone battery is low.',
    latitude: 19.0176,
    longitude: 72.8562,
    locationAccuracy: 26,
    locationSource: 'gps',
    locationCapturedAt: new Date(),
    status: 'In Progress',
    urgency: 'High',
    responderName: 'Demo Response Team',
    verificationStatus: 'Needs Review',
    adminNote: 'Demo case: route navigation and status update.'
  },
  {
    userName: '[Demo] Meera Kulkarni',
    contactNumber: '9000000003',
    state: 'Maharashtra',
    city: 'Nagpur',
    distressMessage: 'Elderly person feeling dizzy during heatwave. Need medical guidance.',
    latitude: 21.1458,
    longitude: 79.0882,
    locationAccuracy: 55,
    locationSource: 'gps',
    locationCapturedAt: new Date(),
    status: 'Resolved',
    urgency: 'Medium',
    responderName: 'Demo Medical Volunteer',
    verificationStatus: 'Verified',
    verifiedAt: new Date(),
    adminNote: 'Demo case: resolved workflow.'
  }
];

const upsertByField = async (Model, key, records) => {
  for (const record of records) {
    await Model.findOneAndUpdate(
      { [key]: record[key] },
      { $set: record },
      { upsert: true, runValidators: true, new: true, setDefaultsOnInsert: true }
    );
  }
};

const seedDemoAdminData = async () => {
  try {
    await mongoose.connect(mongoUri);

    await upsertByField(Alert, 'title', demoAlerts);
    await upsertByField(Resource, 'name', demoResources);
    await upsertByField(SOS, 'userName', demoSosRequests);

    console.log('Demo admin data is ready:');
    console.log(`- ${demoAlerts.length} admin alerts`);
    console.log(`- ${demoResources.length} emergency resources`);
    console.log(`- ${demoSosRequests.length} SOS requests`);
    console.log('No existing real data was deleted.');
    process.exit(0);
  } catch (error) {
    console.error('Demo seed failed:', error);
    process.exit(1);
  }
};

seedDemoAdminData();
