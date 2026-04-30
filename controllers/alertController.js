const Alert = require('../models/Alert');
const SOS = require('../models/SOS');
const CheckInStatus = require('../models/CheckInStatus');
const { fetchOfficialAlerts, getFeedUrl } = require('../services/officialAlertService');
const { translateOfficialAlerts, translateText } = require('../services/translationService');
const { buildGuidance } = require('../services/alertGuidanceService');
const { languages, languageNames, detectLanguageFromHeader } = require('../config/languages');
const stateCoordinates = require('../config/stateCoordinates');

const states = [
  'Maharashtra',
  'Gujarat',
  'Karnataka',
  'Kerala',
  'Tamil Nadu',
  'Delhi',
  'Rajasthan',
  'West Bengal'
];

const getLocalizedMessage = (alert, language) => {
  const selectedLanguage = languages.find((item) => item.name === language);
  const localizedMessage = selectedLanguage ? alert[selectedLanguage.field] : '';
  return localizedMessage || alert.messageEnglish;
};

const getLocalizedPrecautions = async (alert, language) => {
  const precautions = alert.precautions || '';
  return translateText(precautions, language);
};

const parseCoordinate = (value) => {
  if (value === '' || value === undefined || value === null) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

exports.homePage = (req, res) => {
  res.render('home', {
    pageTitle: 'Rakshak - Multilingual Disaster Alert Platform',
    highlightFeatures: [
      {
        title: 'Instant Local Translation',
        description: 'Translate alerts into regional languages so more people understand the warning immediately.'
      },
      {
        title: 'Action-First Guidance',
        description: 'Every alert now includes quick summary, what to do now, what to avoid, and kit reminders.'
      },
      {
        title: 'Trusted Emergency Flow',
        description: 'Users can listen to alerts, locate the affected area, and raise an SOS without switching apps.'
      }
    ]
  });
};

exports.adminDashboard = async (req, res) => {
  const [
    alertCount,
    sosCount,
    latestAlerts,
    highSeverityCount,
    mediumSeverityCount,
    lowSeverityCount,
    pendingSosCount,
    resolvedSosCount,
    latestSos,
    totalSafeUsers,
    usersNeedHelp,
    latestCheckIns,
    checkInMapRecords
  ] = await Promise.all([
    Alert.countDocuments(),
    SOS.countDocuments(),
    Alert.find().sort({ createdAt: -1 }).limit(5),
    Alert.countDocuments({ severity: 'High' }),
    Alert.countDocuments({ severity: 'Medium' }),
    Alert.countDocuments({ severity: 'Low' }),
    SOS.countDocuments({ status: 'Pending' }),
    SOS.countDocuments({ status: 'Resolved' }),
    SOS.find().sort({ createdAt: -1 }).limit(3),
    CheckInStatus.countDocuments({ status: 'safe' }),
    CheckInStatus.countDocuments({ status: 'need_help' }),
    CheckInStatus.find().sort({ updatedAt: -1 }).limit(8),
    CheckInStatus.find({
      latitude: { $ne: null },
      longitude: { $ne: null }
    }).sort({ updatedAt: -1 }).limit(100)
  ]);

  res.render('admin/dashboard', {
    pageTitle: 'Admin Dashboard',
    alertCount,
    sosCount,
    latestAlerts,
    highSeverityCount,
    mediumSeverityCount,
    lowSeverityCount,
    pendingSosCount,
    resolvedSosCount,
    latestSos,
    totalSafeUsers,
    usersNeedHelp,
    pendingResponses: usersNeedHelp,
    latestCheckIns,
    checkInMapData: checkInMapRecords.map((record) => ({
      userName: record.userName,
      status: record.status,
      latitude: record.latitude,
      longitude: record.longitude,
      city: record.city,
      state: record.state,
      updatedAt: record.updatedAt.toLocaleString(),
      directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${record.latitude},${record.longitude}`
    }))
  });
};


exports.newAlertForm = (req, res) => {
  res.render('admin/new-alert', {
    pageTitle: 'Add Alert',
    states,
    languages,
    alert: null,
    formAction: '/admin/alerts',
    buttonText: 'Create Alert'
  });
};

exports.createAlert = async (req, res) => {
  try {
    req.body.latitude = parseCoordinate(req.body.latitude);
    req.body.longitude = parseCoordinate(req.body.longitude);
    await Alert.create(req.body);
    res.redirect('/admin/alerts?success=created');
  } catch (error) {
    console.error('Create Alert Error:', error);
    res.render('admin/new-alert', {
      pageTitle: 'Add Alert',
      states,
      languages,
      alert: req.body,
      formAction: '/admin/alerts',
      buttonText: 'Create Alert',
      error: 'Failed to create alert. Ensure all required language fields are filled.'
    });
  }
};

exports.adminAlertList = async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ createdAt: -1 });
    res.render('admin/alerts', {
      pageTitle: 'Manage Alerts',
      alerts
    });
  } catch (error) {
    res.status(500).render('500', { pageTitle: 'Server Error' });
  }
};

exports.editAlertForm = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) return res.status(404).render('404', { pageTitle: 'Alert Not Found' });

    res.render('admin/new-alert', {
      pageTitle: 'Edit Alert',
      states,
      languages,
      alert,
      formAction: `/admin/alerts/${alert._id}`,
      buttonText: 'Update Alert'
    });
  } catch (error) {
    res.redirect('/admin/alerts');
  }
};

exports.updateAlert = async (req, res) => {
  try {
    req.body.latitude = parseCoordinate(req.body.latitude);
    req.body.longitude = parseCoordinate(req.body.longitude);
    await Alert.findByIdAndUpdate(req.params.id, req.body, {
      runValidators: true
    });
    res.redirect('/admin/alerts?success=updated');
  } catch (error) {
    res.redirect('/admin/alerts?error=update_failed');
  }
};

exports.deleteAlert = async (req, res) => {
  try {
    await Alert.findByIdAndDelete(req.params.id);
    res.redirect('/admin/alerts?success=deleted');
  } catch (error) {
    res.redirect('/admin/alerts');
  }
};

const getPreferredLanguage = (req) => {
  if (req.query.language && languageNames.includes(req.query.language)) {
    return req.query.language;
  }

  if (req.session.user?.language && languageNames.includes(req.session.user.language)) {
    return req.session.user.language;
  }

  if (req.session?.language && languageNames.includes(req.session.language)) {
    return req.session.language;
  }

  const detectedLanguage = detectLanguageFromHeader(req.headers['accept-language']);
  if (detectedLanguage) {
    return detectedLanguage;
  }

  return 'English';
};

const setSessionPreferredLanguage = (req, language) => {
  if (!languageNames.includes(language)) return;
  if (req.session) {
    req.session.language = language;
    if (req.session.user) {
      req.session.user.language = language;
    }
  }
};

exports.userAlertList = async (req, res) => {
  const selectedState = req.query.state || req.session.user?.state || 'Maharashtra';
  const selectedCity = req.query.city || req.session.user?.city || '';
  const selectedLanguage = getPreferredLanguage(req);
  if (req.query.language && languageNames.includes(req.query.language)) {
    setSessionPreferredLanguage(req, selectedLanguage);
  }

  const alertQuery = { state: selectedState };
  const resourceQuery = { state: selectedState, isActive: true };

  if (selectedCity) {
    // Optional: Filter by city if available
    // alertQuery.city = selectedCity; 
    // resourceQuery.city = selectedCity;
  }

  const [alerts, rawOfficialAlerts, resources, weather, currentCheckIn] = await Promise.all([
    Alert.find(alertQuery).sort({ createdAt: -1 }),
    fetchOfficialAlerts(selectedState),
    require('../models/Resource').find(resourceQuery),
    require('../services/weatherService').getWeatherData(selectedState),
    CheckInStatus.findOne({ userId: req.session.user.id })
  ]);
  const officialAlerts = await Promise.all((await translateOfficialAlerts(rawOfficialAlerts, selectedLanguage)).map(async (alert) => ({
    ...alert,
    guidance: await buildGuidance({
      disasterType: alert.title || alert.source || 'General',
      severity: 'Medium',
      message: alert.description || alert.title,
      precautions: ''
    }, selectedLanguage)
  })));

  const localizedAlerts = await Promise.all(alerts.map(async (alert) => {
    const localizedMessage = getLocalizedMessage(alert, selectedLanguage);
    const localizedPrecautions = await getLocalizedPrecautions(alert, selectedLanguage);

    return {
      ...alert.toObject(),
      localizedMessage,
      localizedPrecautions,
      guidance: await buildGuidance({
        disasterType: alert.disasterType,
        severity: alert.severity,
        message: localizedMessage,
        precautions: localizedPrecautions
      }, selectedLanguage)
    };
  }));

  const severityOrder = { High: 3, Medium: 2, Low: 1 };
  const popupAlert = localizedAlerts
    .slice()
    .sort((a, b) => {
      const severityCompare = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
      if (severityCompare !== 0) return severityCompare;
      return new Date(b.createdAt) - new Date(a.createdAt);
    })[0] || null;

  res.render('alerts/index', {
    pageTitle: 'User Alerts',
    states,
    languages: languageNames,
    selectedState,
    selectedCity,
    selectedLanguage,
    officialAlerts,
    weather,
    currentCheckIn,
    officialFeedUrl: getFeedUrl(selectedState),
    alerts: localizedAlerts,
    popupAlert,
    summaryCards: [
      {
        label: 'Critical alerts',
        value: localizedAlerts.filter((alert) => alert.severity === 'High').length
      },
      {
        label: 'Official feed items',
        value: officialAlerts.length
      },
      {
        label: 'Preferred language',
        value: selectedLanguage
      }
    ],
    selectedStateCoordinates: stateCoordinates[selectedState] || null,
    alertMapData: localizedAlerts.map((alert) => {
      const hasCoordinates = Number.isFinite(alert.latitude) && Number.isFinite(alert.longitude);
      if (!hasCoordinates) return null;

      return {
        id: alert._id,
        title: alert.title,
        disasterType: alert.disasterType,
        severity: alert.severity,
        state: alert.state,
        message: alert.localizedMessage,
        createdAt: alert.createdAt.toLocaleString(),
        latitude: alert.latitude,
        longitude: alert.longitude,
        detailsUrl: `/alerts/${alert._id}?language=${encodeURIComponent(selectedLanguage)}`
      };
    }).filter(Boolean),
    resourceMapData: resources.map(res => ({
      name: res.name,
      type: res.type,
      latitude: res.latitude,
      longitude: res.longitude,
      capacity: res.capacity,
      contact: res.contactPhone
    }))
  });
};

exports.alertDetails = async (req, res) => {
  const selectedLanguage = getPreferredLanguage(req);
  if (req.query.language && languageNames.includes(req.query.language)) {
    setSessionPreferredLanguage(req, selectedLanguage);
  }
  const alert = await Alert.findById(req.params.id);

  if (!alert) return res.status(404).render('404', { pageTitle: 'Alert Not Found' });

  const localizedMessage = getLocalizedMessage(alert, selectedLanguage);
  const localizedPrecautions = await getLocalizedPrecautions(alert, selectedLanguage);
  const guidance = await buildGuidance({
    disasterType: alert.disasterType,
    severity: alert.severity,
    message: localizedMessage,
    precautions: localizedPrecautions
  }, selectedLanguage);

  res.render('alerts/show', {
    pageTitle: alert.title,
    alert,
    selectedLanguage,
    localizedMessage,
    localizedPrecautions,
    guidance
  });
};

exports.preparednessGuide = (req, res) => {
  res.render('preparedness', {
    pageTitle: 'Emergency Preparedness Guide'
  });
};

exports.markAsSafe = async (req, res) => {
  const SafeCheck = require('../models/SafeCheck');
  try {
    await SafeCheck.create({
      user: req.session.user.id,
      userName: req.session.user.name,
      alert: req.params.id,
      status: 'Safe'
    });
    res.redirect(`/alerts/${req.params.id}?success=safe`);
  } catch (error) {
    res.redirect(`/alerts/${req.params.id}`);
  }
};

exports.states = states;
