const SOS = require('../models/SOS');
const User = require('../models/User');
const stateCoordinates = require('../config/stateCoordinates');

exports.dashboard = (req, res) => {
  res.render('volunteer/dashboard', {
    pageTitle: 'Volunteer Hub',
    volunteer: req.session.user
  });
};

exports.getSOSRequests = async (req, res) => {
  try {
    const { status, sortBy } = req.query;
    const volunteer = req.session.user;

    let query = { state: volunteer.state };
    if (status && status !== 'All') {
      query.status = status;
    }

    let sort = { createdAt: -1 };
    if (sortBy === 'urgent') sort = { urgency: -1 };
    if (sortBy === 'newest') sort = { createdAt: -1 };

    const requests = await SOS.find(query).sort(sort);
    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSOSDetails = async (req, res) => {
  try {
    const request = await SOS.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.acceptRequest = async (req, res) => {
  try {
    const volunteer = req.session.user;
    const request = await SOS.findByIdAndUpdate(req.params.id, {
      status: 'In Progress',
      assignedVolunteer: volunteer.id,
      responderName: volunteer.name
    }, { new: true });
    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.resolveRequest = async (req, res) => {
  try {
    const request = await SOS.findByIdAndUpdate(req.params.id, {
      status: 'Resolved'
    }, { new: true });
    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.toggleAvailability = async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    user.isAvailable = !user.isAvailable;
    await user.save();
    req.session.user.isAvailable = user.isAvailable;
    res.json({ success: true, isAvailable: user.isAvailable });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};
