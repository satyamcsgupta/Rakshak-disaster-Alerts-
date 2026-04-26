const SOS = require('../models/SOS');
const { states } = require('./alertController');
const stateCoordinates = require('../config/stateCoordinates');

const parseCoordinate = (value) => {
  if (value === '' || value === undefined || value === null) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const ownsRequest = (sos, user) => (
  !!(sos && user && sos.user && sos.user.toString() === user.id.toString())
);

const hasGpsCoordinates = (request) => (
  request.locationSource === 'gps'
  && request.latitude !== null
  && request.latitude !== undefined
  && request.longitude !== null
  && request.longitude !== undefined
);

exports.createSOS = async (req, res) => {
  const {
    userName,
    state,
    city,
    latitude,
    longitude,
    locationAccuracy,
    locationSource,
    contactNumber
  } = req.body;
  const userId = req.session.user ? req.session.user.id : null;
  const parsedLatitude = parseCoordinate(latitude);
  const parsedLongitude = parseCoordinate(longitude);
  const parsedAccuracy = parseCoordinate(locationAccuracy);
  const hasCoordinates = parsedLatitude !== null && parsedLongitude !== null;
  const safeLocationSource = ['gps', 'ip', 'manual'].includes(locationSource)
    ? locationSource
    : 'unavailable';

  const sos = await SOS.create({
    user: userId,
    userName: userName || req.session.user?.name || 'Anonymous',
    contactNumber: contactNumber || req.session.user?.phone || '',
    state,
    city: city || req.session.user?.city || '',
    distressMessage: req.body.distressMessage || 'I am in trouble',
    latitude: parsedLatitude,
    longitude: parsedLongitude,
    locationAccuracy: parsedAccuracy,
    locationSource: hasCoordinates ? safeLocationSource : 'unavailable',
    locationCapturedAt: hasCoordinates ? new Date() : null
  });

  console.log('Captured Latitude:', sos.latitude ?? '');
  console.log('Captured Longitude:', sos.longitude ?? '');
  console.log('Saved Successfully');

  res.render('sos-success', {
    pageTitle: 'SOS Sent',
    state
  });
};

exports.adminSOSList = async (req, res) => {
  const requests = await SOS.find().sort({ createdAt: -1 });

  res.render('admin/sos', {
    pageTitle: 'SOS Requests',
    requests,
    states,
    sosMapData: requests.map((request) => {
      const fallbackCoordinates = stateCoordinates[request.state] || null;
      const hasExactLocation = hasGpsCoordinates(request);
      const latitude = hasExactLocation ? request.latitude : fallbackCoordinates?.latitude ?? null;
      const longitude = hasExactLocation ? request.longitude : fallbackCoordinates?.longitude ?? null;

      if (latitude === null || longitude === null) return null;

      return {
        userName: request.userName,
        state: request.state,
        status: request.status || 'Pending',
        distressMessage: request.distressMessage,
        createdAt: request.createdAt.toLocaleString(),
        latitude,
        longitude,
        locationAccuracy: request.locationAccuracy,
        locationSource: request.locationSource || 'unavailable',
        usedFallback: !hasExactLocation,
        directionsUrl: hasExactLocation ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}` : ''
      };
    }).filter(Boolean)
  });
};

exports.updateSOSStatus = async (req, res) => {
  await SOS.findByIdAndUpdate(req.params.id, {
    status: req.body.status
  }, { runValidators: true });

  res.redirect('/admin/sos');
};

exports.nearbySOS = (req, res) => {
  res.render('sos/nearby', {
    pageTitle: 'Nearby SOS Requests',
    user: req.session.user
  });
};

exports.getNearbyRequests = async (req, res) => {
  try {
    const { status, sortBy } = req.query;
    const user = req.session.user;

    let query = { state: user.state };
    if (status && status !== 'All') {
      query.status = status;
    }

    let sort = { createdAt: -1 };
    if (sortBy === 'urgent') sort = { urgency: -1 };
    if (sortBy === 'newest') sort = { createdAt: -1 };

    let requests = await SOS.find(query).sort(sort);
    
    requests = requests.map(req => {
      const doc = req.toObject();
      doc.isOwner = !!(user && doc.user && doc.user.toString() === user.id.toString());
      if (doc.locationSource !== 'gps' || doc.latitude === null || doc.latitude === undefined || doc.longitude === null || doc.longitude === undefined) {
        const fallback = stateCoordinates[doc.state];
        if (fallback) {
          doc.latitude = fallback.latitude;
          doc.longitude = fallback.longitude;
          doc.usedFallback = true;
        }
      } else {
        doc.usedFallback = false;
      }
      return doc;
    });

    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.acceptRequest = async (req, res) => {
  try {
    const user = req.session.user;
    const sos = await SOS.findById(req.params.id);
    if (!sos) return res.status(404).json({ success: false, message: 'Not found' });
    if (ownsRequest(sos, user)) {
      return res.status(403).json({ success: false, message: 'You cannot accept your own SOS request.' });
    }
    if (sos.status !== 'Pending') {
      return res.status(409).json({ success: false, message: 'This request is no longer pending.' });
    }

    const request = await SOS.findByIdAndUpdate(req.params.id, {
      status: 'In Progress',
      assignedVolunteer: user.id, // kept for DB compatibility
      responderName: user.name
    }, { new: true });
    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.resolveRequest = async (req, res) => {
  try {
    const sos = await SOS.findById(req.params.id);
    if (!sos) return res.status(404).json({ success: false, message: 'Not found' });

    const isAssignedResponder = sos.assignedVolunteer && sos.assignedVolunteer.toString() === req.session.user.id.toString();
    if (!ownsRequest(sos, req.session.user) && !isAssignedResponder && req.session.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    sos.status = 'Resolved';
    await sos.save();
    res.json({ success: true, message: 'Request marked resolved' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.cancelRequest = async (req, res) => {
  try {
    const sos = await SOS.findById(req.params.id);
    if (!sos) return res.status(404).json({ success: false, message: 'Not found' });
    if (!ownsRequest(sos, req.session.user)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    await SOS.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Request cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
