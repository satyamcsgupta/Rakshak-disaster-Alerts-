const SOS = require('../models/SOS');
const { states } = require('./alertController');
const stateCoordinates = require('../config/stateCoordinates');

exports.createSOS = async (req, res) => {
  const { userName, state, latitude, longitude } = req.body;

  await SOS.create({
    userName: userName || 'Anonymous',
    state,
    distressMessage: 'I am in trouble',
    latitude: latitude || null,
    longitude: longitude || null
  });

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
      const latitude = request.latitude || fallbackCoordinates?.latitude || null;
      const longitude = request.longitude || fallbackCoordinates?.longitude || null;

      if (!latitude || !longitude) return null;

      return {
        userName: request.userName,
        state: request.state,
        status: request.status || 'Pending',
        distressMessage: request.distressMessage,
        createdAt: request.createdAt.toLocaleString(),
        latitude,
        longitude,
        usedFallback: !(request.latitude && request.longitude)
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
