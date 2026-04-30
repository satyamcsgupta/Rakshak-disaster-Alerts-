const express = require('express');
const router = express.Router();
const sosController = require('../controllers/sosController');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/', requireAuth, sosController.createSOS);

// Nearby SOS features for normal users
router.get('/nearby', requireAuth, sosController.nearbySOS);
router.get('/api/requests', requireAuth, sosController.getNearbyRequests);
router.get('/api/stream', requireAuth, sosController.streamSOSUpdates);
router.post('/:id/accept', requireAuth, sosController.acceptRequest);
router.post('/:id/resolve', requireAuth, sosController.resolveRequest);
router.post('/:id/cancel', requireAuth, sosController.cancelRequest);
router.post('/:id/location', requireAuth, sosController.updateSOSLocation);

module.exports = router;
