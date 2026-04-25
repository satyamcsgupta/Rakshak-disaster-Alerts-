const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Alert = require('../models/Alert');
const SOS = require('../models/SOS');

dotenv.config();

const sampleAlerts = [
  {
    title: 'Heavy Rainfall Warning',
    disasterType: 'Flood',
    state: 'Maharashtra',
    severity: 'High',
    messageEnglish: 'Heavy rainfall is expected in low-lying areas. Avoid travel near rivers and waterlogged roads.',
    messageHindi: 'निचले इलाकों में भारी बारिश की संभावना है। नदियों और जलभराव वाली सड़कों के पास यात्रा से बचें।',
    messageMarathi: 'सखल भागात मुसळधार पावसाची शक्यता आहे. नद्या आणि पाणी साचलेल्या रस्त्यांजवळ प्रवास टाळा.',
    messageGujarati: 'નીચાણવાળા વિસ્તારોમાં ભારે વરસાદની શક્યતા છે. નદીઓ અને પાણી ભરાયેલા રસ્તાઓ પાસે મુસાફરી ટાળો.',
    messageBengali: 'নিম্নাঞ্চলে ভারী বৃষ্টির সম্ভাবনা রয়েছে। নদী এবং জলমগ্ন রাস্তার কাছে যাতায়াত এড়িয়ে চলুন।',
    messageTamil: 'தாழ்வான பகுதிகளில் கனமழை எதிர்பார்க்கப்படுகிறது. ஆறுகள் மற்றும் நீர் தேங்கிய சாலைகளுக்கு அருகில் பயணம் தவிர்க்கவும்.',
    messageTelugu: 'తక్కువ ఎత్తు ప్రాంతాల్లో భారీ వర్షం కురిసే అవకాశం ఉంది. నదులు మరియు నీరు నిలిచిన రహదారుల దగ్గర ప్రయాణం చేయవద్దు.',
    messageKannada: 'ತಗ್ಗು ಪ್ರದೇಶಗಳಲ್ಲಿ ಭಾರಿ ಮಳೆಯ ಸಾಧ್ಯತೆ ಇದೆ. ನದಿಗಳು ಮತ್ತು ನೀರು ತುಂಬಿರುವ ರಸ್ತೆಗಳ ಬಳಿ ಪ್ರಯಾಣ ತಪ್ಪಿಸಿ.',
    messageMalayalam: 'താഴ്ന്ന പ്രദേശങ്ങളിൽ കനത്ത മഴ പ്രതീക്ഷിക്കുന്നു. നദികൾക്കും വെള്ളം കെട്ടിക്കിടക്കുന്ന റോഡുകൾക്കും സമീപം യാത്ര ഒഴിവാക്കുക.',
    messagePunjabi: 'ਨੀਵੇਂ ਇਲਾਕਿਆਂ ਵਿੱਚ ਭਾਰੀ ਮੀਂਹ ਦੀ ਸੰਭਾਵਨਾ ਹੈ। ਦਰਿਆਵਾਂ ਅਤੇ ਪਾਣੀ ਭਰੀਆਂ ਸੜਕਾਂ ਦੇ ਨੇੜੇ ਯਾਤਰਾ ਤੋਂ ਬਚੋ।',
    messageOdia: 'ନିମ୍ନାଞ୍ଚଳରେ ଭାରି ବର୍ଷା ହେବାର ସମ୍ଭାବନା ଅଛି। ନଦୀ ଏବଂ ପାଣି ଭରା ରାସ୍ତା ପାଖରେ ଯାତ୍ରା ଏଡ଼ନ୍ତୁ।',
    precautions: 'Move important items to higher places, keep your phone charged, avoid flooded roads, and follow local authority instructions.'
  },
  {
    title: 'Cyclone Coastal Alert',
    disasterType: 'Cyclone',
    state: 'Gujarat',
    severity: 'High',
    messageEnglish: 'Strong winds are likely near coastal areas. Stay indoors and keep away from beaches.',
    messageHindi: 'तटीय क्षेत्रों में तेज हवाओं की संभावना है। घर के अंदर रहें और समुद्र तटों से दूर रहें।',
    messageMarathi: 'किनारी भागात जोरदार वारे वाहण्याची शक्यता आहे. घरात रहा आणि समुद्रकिनाऱ्यांपासून दूर रहा.',
    messageGujarati: 'દરિયાકાંઠાના વિસ્તારોમાં તેજ પવનની શક્યતા છે. ઘરમાં રહો અને દરિયાકિનારાથી દૂર રહો.',
    messageBengali: 'উপকূলীয় এলাকায় প্রবল বাতাসের সম্ভাবনা রয়েছে। ঘরের ভিতরে থাকুন এবং সমুদ্র সৈকত থেকে দূরে থাকুন।',
    messageTamil: 'கடற்கரை பகுதிகளில் பலத்த காற்று வீச வாய்ப்பு உள்ளது. வீட்டுக்குள் இருங்கள் மற்றும் கடற்கரையிலிருந்து விலகி இருங்கள்.',
    messageTelugu: 'తీర ప్రాంతాల్లో బలమైన గాలులు వీచే అవకాశం ఉంది. ఇంటి లోపల ఉండండి మరియు బీచ్‌లకు దూరంగా ఉండండి.',
    messageKannada: 'ಕರಾವಳಿ ಪ್ರದೇಶಗಳ ಬಳಿ ಬಲವಾದ ಗಾಳಿಯ ಸಾಧ್ಯತೆ ಇದೆ. ಮನೆಯೊಳಗೆ ಇರಿ ಮತ್ತು ಕಡಲತೀರಗಳಿಂದ ದೂರವಿರಿ.',
    messageMalayalam: 'തീരപ്രദേശങ്ങളിൽ ശക്തമായ കാറ്റിന് സാധ്യതയുണ്ട്. വീടിനുള്ളിൽ ഇരിക്കുക, കടൽത്തീരങ്ങളിൽ നിന്ന് അകലെ നിൽക്കുക.',
    messagePunjabi: 'ਤਟੀਆ ਇਲਾਕਿਆਂ ਵਿੱਚ ਤੇਜ਼ ਹਵਾਵਾਂ ਦੀ ਸੰਭਾਵਨਾ ਹੈ। ਘਰ ਅੰਦਰ ਰਹੋ ਅਤੇ ਸਮੁੰਦਰੀ ਤਟਾਂ ਤੋਂ ਦੂਰ ਰਹੋ।',
    messageOdia: 'ଉପକୂଳ ଅଞ୍ଚଳରେ ଜୋର ପବନ ହେବାର ସମ୍ଭାବନା ଅଛି। ଘର ଭିତରେ ରୁହନ୍ତୁ ଏବଂ ସମୁଦ୍ରତଟରୁ ଦୂରେ ରୁହନ୍ତୁ।',
    precautions: 'Secure loose objects, store drinking water, keep emergency lights ready, and avoid going outside during strong winds.'
  },
  {
    title: 'Heatwave Advisory',
    disasterType: 'Heatwave',
    state: 'Delhi',
    severity: 'Medium',
    messageEnglish: 'High temperatures are expected during afternoon hours. Avoid direct sunlight and drink enough water.',
    messageHindi: 'दोपहर के समय तापमान अधिक रहने की संभावना है। सीधी धूप से बचें और पर्याप्त पानी पिएं।',
    messageMarathi: 'दुपारच्या वेळी तापमान जास्त राहण्याची शक्यता आहे. थेट उन्हापासून दूर रहा आणि पुरेसे पाणी प्या.',
    messageGujarati: 'બપોરના સમયમાં તાપમાન વધુ રહેવાની શક્યતા છે. સીધા તડકાથી બચો અને પૂરતું પાણી પીવો.',
    messageBengali: 'দুপুরের সময় উচ্চ তাপমাত্রা থাকতে পারে। সরাসরি রোদ এড়িয়ে চলুন এবং পর্যাপ্ত জল পান করুন।',
    messageTamil: 'மதிய நேரங்களில் அதிக வெப்பநிலை எதிர்பார்க்கப்படுகிறது. நேரடி வெயிலைத் தவிர்த்து போதுமான தண்ணீர் குடிக்கவும்.',
    messageTelugu: 'మధ్యాహ్నం సమయంలో అధిక ఉష్ణోగ్రతలు ఉండే అవకాశం ఉంది. నేరుగా ఎండలో ఉండవద్దు మరియు తగినంత నీరు తాగండి.',
    messageKannada: 'ಮಧ್ಯಾಹ್ನದ ಸಮಯದಲ್ಲಿ ಹೆಚ್ಚಿನ ತಾಪಮಾನ ನಿರೀಕ್ಷಿಸಲಾಗಿದೆ. ನೇರ ಸೂರ್ಯರಶ್ಮಿಯನ್ನು ತಪ್ಪಿಸಿ ಮತ್ತು ಸಾಕಷ್ಟು ನೀರು ಕುಡಿಯಿರಿ.',
    messageMalayalam: 'ഉച്ചയ്ക്ക് ഉയർന്ന താപനില പ്രതീക്ഷിക്കുന്നു. നേരിട്ടുള്ള സൂര്യപ്രകാശം ഒഴിവാക്കി മതിയായ വെള്ളം കുടിക്കുക.',
    messagePunjabi: 'ਦੁਪਹਿਰ ਦੇ ਸਮੇਂ ਵੱਧ ਤਾਪਮਾਨ ਦੀ ਸੰਭਾਵਨਾ ਹੈ। ਸਿੱਧੀ ਧੁੱਪ ਤੋਂ ਬਚੋ ਅਤੇ ਕਾਫੀ ਪਾਣੀ ਪੀਓ।',
    messageOdia: 'ଦିନ ମଝିରେ ଅଧିକ ତାପମାତ୍ରା ହେବାର ସମ୍ଭାବନା ଅଛି। ସିଧା ସୂର୍ଯ୍ୟକିରଣ ଏଡ଼ନ୍ତୁ ଏବଂ ପର୍ଯ୍ୟାପ୍ତ ପାଣି ପିଉନ୍ତୁ।',
    precautions: 'Carry water, wear light cotton clothes, avoid outdoor work from 12 PM to 4 PM, and check on elderly people.'
  },
  {
    title: 'Landslide Risk Notice',
    disasterType: 'Landslide',
    state: 'Kerala',
    severity: 'Medium',
    messageEnglish: 'Continuous rain may increase landslide risk in hilly areas. Avoid steep slopes and unsafe roads.',
    messageHindi: 'लगातार बारिश से पहाड़ी क्षेत्रों में भूस्खलन का खतरा बढ़ सकता है। खड़ी ढलानों और असुरक्षित सड़कों से बचें।',
    messageMarathi: 'सतत पावसामुळे डोंगराळ भागात भूस्खलनाचा धोका वाढू शकतो. तीव्र उतार आणि असुरक्षित रस्ते टाळा.',
    messageGujarati: 'સતત વરસાદથી પહાડી વિસ્તારોમાં ભૂસ્ખલનનો જોખમ વધી શકે છે. ઊંચી ઢાળ અને અસુરક્ષિત રસ્તાઓથી બચો.',
    messageBengali: 'নিরবচ্ছিন্ন বৃষ্টিতে পাহাড়ি এলাকায় ভূমিধসের ঝুঁকি বাড়তে পারে। খাড়া ঢাল এবং অনিরাপদ রাস্তা এড়িয়ে চলুন।',
    messageTamil: 'தொடர்ச்சியான மழை மலைப்பகுதிகளில் மண்சரிவு அபாயத்தை அதிகரிக்கலாம். செங்குத்தான சரிவுகள் மற்றும் பாதுகாப்பற்ற சாலைகளைத் தவிர்க்கவும்.',
    messageTelugu: 'నిరంతర వర్షం కొండ ప్రాంతాల్లో భూస్ఖలనం ప్రమాదాన్ని పెంచవచ్చు. నిటారైన వాలులు మరియు సురక్షితం కాని రహదారులను నివారించండి.',
    messageKannada: 'ನಿರಂತರ ಮಳೆಯು ಗುಡ್ಡ ಪ್ರದೇಶಗಳಲ್ಲಿ ಭೂಕುಸಿತದ ಅಪಾಯವನ್ನು ಹೆಚ್ಚಿಸಬಹುದು. ತೀವ್ರ ಇಳಿಜಾರುಗಳು ಮತ್ತು ಅಸುರಕ್ಷಿತ ರಸ್ತೆಗಳು ತಪ್ಪಿಸಿ.',
    messageMalayalam: 'തുടർച്ചയായ മഴ മലപ്രദേശങ്ങളിൽ മണ്ണിടിച്ചിൽ സാധ്യത വർധിപ്പിച്ചേക്കാം. കുത്തനെയുള്ള ചരിവുകളും സുരക്ഷിതമല്ലാത്ത റോഡുകളും ഒഴിവാക്കുക.',
    messagePunjabi: 'ਲਗਾਤਾਰ ਮੀਂਹ ਨਾਲ ਪਹਾੜੀ ਇਲਾਕਿਆਂ ਵਿੱਚ ਭੂਸਖਲਨ ਦਾ ਖਤਰਾ ਵੱਧ ਸਕਦਾ ਹੈ। ਖੜੀਆਂ ਢਲਾਣਾਂ ਅਤੇ ਅਸੁਰੱਖਿਅਤ ਸੜਕਾਂ ਤੋਂ ਬਚੋ।',
    messageOdia: 'ଲଗାତାର ବର୍ଷାରେ ପାହାଡ଼ିଆ ଅଞ୍ଚଳରେ ଭୂସ୍ଖଳନ ଝୁମ୍ପ ବଢ଼ିପାରେ। ଖଡ଼ା ଢାଳ ଏବଂ ଅସୁରକ୍ଷିତ ରାସ୍ତା ଏଡ଼ନ୍ତୁ।',
    precautions: 'Do not park near slopes, listen for cracking sounds, move away from unstable ground, and report blocked roads.'
  }
];

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/disaster_alert_mvp';
    await mongoose.connect(mongoUri);

    await Alert.deleteMany();
    await SOS.deleteMany();
    await Alert.insertMany(sampleAlerts);

    console.log('Sample alerts inserted successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error.message);
    process.exit(1);
  }
};

seedDatabase();
