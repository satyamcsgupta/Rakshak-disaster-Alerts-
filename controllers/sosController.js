const SOS = require('../models/SOS');
const { states } = require('./alertController');
const stateCoordinates = require('../config/stateCoordinates');
const { sosEventBus, publishSOSEvent } = require('../services/sosEventBus');
const { sendSOSFallbackSMS } = require('../services/smsService');

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

const getLocationConfidence = (request) => {
  if (!hasGpsCoordinates(request)) return 'missing';
  if (request.locationAccuracy === null || request.locationAccuracy === undefined) return 'unknown';
  if (request.locationAccuracy <= 50) return 'high';
  if (request.locationAccuracy <= 150) return 'medium';
  return 'low';
};

const buildVerificationProfile = (request, duplicateCount = 0) => {
  const signals = [];
  const locationConfidence = getLocationConfidence(request);
  const hasContact = !!String(request.contactNumber || '').trim();
  const message = String(request.distressMessage || '').trim();
  const assignedResponder = !!request.assignedVolunteer || !!request.responderName;

  if (locationConfidence === 'high') {
    signals.push({ type: 'good', label: `Strong GPS accuracy ~${Math.round(request.locationAccuracy)}m` });
  } else if (locationConfidence === 'medium') {
    signals.push({ type: 'warn', label: `Usable GPS accuracy ~${Math.round(request.locationAccuracy)}m` });
  } else if (locationConfidence === 'low') {
    signals.push({ type: 'danger', label: `Weak GPS accuracy ~${Math.round(request.locationAccuracy)}m` });
  } else if (locationConfidence === 'unknown') {
    signals.push({ type: 'warn', label: 'GPS shared without accuracy radius' });
  } else {
    signals.push({ type: 'danger', label: 'No exact GPS shared' });
  }

  signals.push(hasContact
    ? { type: 'good', label: 'Contact number available' }
    : { type: 'danger', label: 'No contact number' });

  if (message.length < 12 || /^i am in trouble$/i.test(message)) {
    signals.push({ type: 'warn', label: 'Message is very generic' });
  } else {
    signals.push({ type: 'good', label: 'Custom distress message' });
  }

  if (duplicateCount > 1) {
    signals.push({ type: duplicateCount > 2 ? 'danger' : 'warn', label: `${duplicateCount} similar recent SOS requests` });
  }

  if (assignedResponder) {
    signals.push({ type: 'good', label: 'Volunteer response started' });
  }

  let recommendation = 'Needs manual review';
  let risk = 'review';

  if (request.verificationStatus === 'False Alarm') {
    recommendation = 'Marked false alarm by admin';
    risk = 'danger';
  } else if (request.verificationStatus === 'Verified') {
    recommendation = 'Verified by admin';
    risk = 'good';
  } else if (!hasGpsCoordinates(request) && !hasContact) {
    recommendation = 'High risk: verify by phone or mark false if confirmed';
    risk = 'danger';
  } else if (duplicateCount > 2 || locationConfidence === 'low') {
    recommendation = 'Suspicious: needs review before dispatch';
    risk = 'danger';
  } else if ((locationConfidence === 'high' || locationConfidence === 'medium') && hasContact && message.length >= 12) {
    recommendation = 'Likely genuine: call/dispatch to confirm';
    risk = 'good';
  }

  return { signals, recommendation, risk, duplicateCount, locationConfidence };
};

const buildSOSSummary = (sos) => ({
  _id: sos._id,
  userName: sos.userName,
  state: sos.state,
  city: sos.city,
  status: sos.status,
  distressMessage: sos.distressMessage,
  latitude: sos.latitude,
  longitude: sos.longitude,
  locationAccuracy: sos.locationAccuracy,
  locationSource: sos.locationSource,
  locationCapturedAt: sos.locationCapturedAt,
  verificationStatus: sos.verificationStatus || 'Unverified',
  createdAt: sos.createdAt
});

const publishSOSChange = (type, sos) => {
  publishSOSEvent({
    type,
    state: sos.state,
    request: buildSOSSummary(sos)
  });
};

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
  publishSOSChange('created', sos);
  sendSOSFallbackSMS(sos).catch((error) => {
    console.error('SMS fallback error:', error.message);
  });

  res.render('sos-success', {
    pageTitle: 'SOS Sent',
    state,
    sosId: sos._id.toString()
  });
};

exports.updateSOSLocation = async (req, res) => {
  try {
    const user = req.session.user;
    const sos = await SOS.findById(req.params.id);
    if (!sos) return res.status(404).json({ success: false, message: 'Not found' });

    if (!ownsRequest(sos, user)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (sos.status === 'Resolved') {
      return res.status(409).json({ success: false, message: 'SOS is already resolved.' });
    }

    const latitude = parseCoordinate(req.body.latitude);
    const longitude = parseCoordinate(req.body.longitude);
    const accuracy = parseCoordinate(req.body.accuracy);

    if (latitude === null || longitude === null) {
      return res.status(400).json({ success: false, message: 'Invalid coordinates.' });
    }

    sos.latitude = latitude;
    sos.longitude = longitude;
    sos.locationAccuracy = accuracy;
    sos.locationSource = 'gps';
    sos.locationCapturedAt = new Date();
    await sos.save();

    publishSOSChange('location-updated', sos);
    res.json({ success: true });
  } catch (error) {
    console.error('Update SOS location error:', error);
    res.status(500).json({ success: false, message: 'Could not update location.' });
  }
};

exports.adminSOSList = async (req, res) => {
  const requests = await SOS.find().sort({ createdAt: -1 }).lean();
  const verificationRequests = requests.map((request) => {
    const requestTime = request.createdAt ? request.createdAt.getTime() : 0;
    const duplicateCount = requests.filter((other) => {
      if (other._id.toString() === request._id.toString()) return false;
      const otherTime = other.createdAt ? other.createdAt.getTime() : 0;
      const closeInTime = Math.abs(otherTime - requestTime) <= 10 * 60 * 1000;
      const sameContact = request.contactNumber && other.contactNumber && request.contactNumber === other.contactNumber;
      const sameUser = request.user && other.user && request.user.toString() === other.user.toString();
      const sameGps = hasGpsCoordinates(request)
        && hasGpsCoordinates(other)
        && Math.abs(request.latitude - other.latitude) < 0.0005
        && Math.abs(request.longitude - other.longitude) < 0.0005;
      return closeInTime && (sameContact || sameUser || sameGps);
    }).length + 1;

    request.verificationProfile = buildVerificationProfile(request, duplicateCount);
    return request;
  });

  res.render('admin/sos', {
    pageTitle: 'SOS Requests',
    requests: verificationRequests,
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
        verificationStatus: request.verificationStatus || 'Unverified',
        adminNote: request.adminNote || '',
        usedFallback: !hasExactLocation,
        directionsUrl: hasExactLocation ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}` : ''
      };
    }).filter(Boolean)
  });
};

exports.updateSOSStatus = async (req, res) => {
  const sos = await SOS.findByIdAndUpdate(req.params.id, {
    status: req.body.status
  }, { new: true, runValidators: true });

  if (sos) publishSOSChange('status-updated', sos);

  res.redirect('/admin/sos');
};

exports.updateSOSVerification = async (req, res) => {
  const allowedStatuses = ['Unverified', 'Verified', 'Needs Review', 'False Alarm'];
  const requestedStatus = req.body.quickVerification || req.body.verificationStatus;
  const verificationStatus = allowedStatuses.includes(requestedStatus)
    ? requestedStatus
    : 'Unverified';
  const update = {
    verificationStatus,
    adminNote: req.body.adminNote || '',
    verifiedBy: req.session.user.id,
    verifiedAt: new Date()
  };

  if (verificationStatus === 'False Alarm') {
    update.status = 'Resolved';
  }

  const sos = await SOS.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });

  if (sos) publishSOSChange('verification-updated', sos);

  res.redirect('/admin/sos');
};

exports.deleteFalseSOS = async (req, res) => {
  try {
    const sos = await SOS.findById(req.params.id);
    if (!sos) {
      return res.redirect('/admin/sos?error=not_found');
    }

    const adminConfirmedFalseAlarm = req.body.confirmFalseAlarm === 'true';
    if (sos.verificationStatus !== 'False Alarm' && !adminConfirmedFalseAlarm) {
      return res.redirect('/admin/sos?error=mark_false_first');
    }

    publishSOSChange('deleted', sos);
    await SOS.findByIdAndDelete(req.params.id);
    res.redirect('/admin/sos?success=false_sos_deleted');
  } catch (error) {
    console.error('Delete false SOS error:', error);
    res.redirect('/admin/sos?error=delete_failed');
  }
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
      doc.verificationStatus = doc.verificationStatus || 'Unverified';
      return doc;
    });

    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.streamSOSUpdates = (req, res) => {
  const user = req.session.user;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (event) => {
    const canSeeEvent = user.role === 'admin' || event.state === user.state;
    if (!canSeeEvent) return;
    res.write(`event: sos\\n`);
    res.write(`data: ${JSON.stringify(event)}\\n\\n`);
  };

  res.write(`event: connected\\n`);
  res.write(`data: ${JSON.stringify({ state: user.state, at: new Date().toISOString() })}\\n\\n`);

  sosEventBus.on('sos-event', send);
  const heartbeat = setInterval(() => {
    res.write(`event: heartbeat\\n`);
    res.write(`data: ${JSON.stringify({ at: new Date().toISOString() })}\\n\\n`);
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sosEventBus.off('sos-event', send);
    res.end();
  });
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
    publishSOSChange('accepted', request);
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
    publishSOSChange('resolved', sos);
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
    publishSOSChange('cancelled', sos);
    await SOS.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Request cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
