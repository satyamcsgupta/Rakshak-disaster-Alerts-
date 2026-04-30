const CheckInStatus = require('../models/CheckInStatus');

const parseCoordinate = (value) => {
  if (value === '' || value === undefined || value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

exports.checkIn = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const status = req.body.status;

    if (!['safe', 'need_help'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid check-in status.' });
    }

    const latitude = parseCoordinate(req.body.latitude);
    const longitude = parseCoordinate(req.body.longitude);

    const checkIn = await CheckInStatus.findOneAndUpdate(
      { userId: user.id },
      {
        userId: user.id,
        userName: user.name,
        email: user.email || '',
        status,
        latitude,
        longitude,
        city: req.body.city || user.city || '',
        state: req.body.state || user.state || '',
        updatedAt: new Date()
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    res.json({
      success: true,
      message: 'Status updated successfully.',
      checkIn
    });
  } catch (error) {
    console.error('Check-in status error:', error);
    res.status(500).json({ success: false, message: 'Could not update status.' });
  }
};

exports.getMyCheckIn = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const checkIn = await CheckInStatus.findOne({ userId: user.id }).lean();
    res.json({ success: true, checkIn: checkIn || null });
  } catch (error) {
    console.error('Get check-in status error:', error);
    res.status(500).json({ success: false, message: 'Could not fetch status.' });
  }
};
