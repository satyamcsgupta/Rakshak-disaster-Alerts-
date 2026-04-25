const express = require('express');
const router = express.Router();
const volunteerController = require('../controllers/volunteerController');
const { requireVolunteer } = require('../middleware/authMiddleware');

router.use(requireVolunteer);

router.get('/', volunteerController.dashboard);
router.get('/sos', volunteerController.getSOSRequests);
router.get('/sos/:id', volunteerController.getSOSDetails);
router.post('/requests/:id/accept', volunteerController.acceptRequest);
router.post('/requests/:id/resolve', volunteerController.resolveRequest);
router.post('/availability', volunteerController.toggleAvailability);

module.exports = router;
