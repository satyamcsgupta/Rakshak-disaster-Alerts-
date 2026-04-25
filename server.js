const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const connectDB = require('./config/db');
const ensureDefaultAdmin = require('./services/adminSeedService');

dotenv.config();
connectDB().then(() => ensureDefaultAdmin()).catch(err => console.error('Seeding error:', err));

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
const MongoStore = require('connect-mongo').default || require('connect-mongo');

app.use(session({
  secret: process.env.SESSION_SECRET || 'college-project-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/disaster_alert_mvp',
    collectionName: 'sessions'
  })
}));

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

app.use('/', require('./routes/alertRoutes'));
app.use('/admin', require('./routes/adminRoutes'));
app.use('/sos', require('./routes/sosRoutes'));
app.use('/volunteer', require('./routes/volunteerRoutes'));
app.use('/auth', require('./routes/authRoutes'));
app.use('/tts', require('./routes/ttsRoutes'));

app.use((req, res) => {
  res.status(404).render('404', {
    pageTitle: 'Page Not Found'
  });
});

const PORT = Number(process.env.PORT) || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Close the old server or change PORT in .env.`);
    process.exit(1);
  }

  console.error('Server failed to start:', error.message);
  process.exit(1);
});
