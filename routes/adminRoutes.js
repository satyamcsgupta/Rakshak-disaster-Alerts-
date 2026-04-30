const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const sosController = require('../controllers/sosController');
const { requireAdmin } = require('../middleware/authMiddleware');

router.use(requireAdmin);

router.get('/', alertController.adminDashboard);
router.get('/alerts', alertController.adminAlertList);
router.get('/alerts/new', alertController.newAlertForm);
router.post('/alerts', alertController.createAlert);
router.get('/alerts/:id/edit', alertController.editAlertForm);
router.post('/alerts/:id', alertController.updateAlert);
router.post('/alerts/:id/delete', alertController.deleteAlert);
router.get('/sos', sosController.adminSOSList);
router.post('/sos/:id/status', sosController.updateSOSStatus);
router.post('/sos/:id/verification', sosController.updateSOSVerification);
router.post('/sos/:id/delete', sosController.deleteFalseSOS);

const resourceController = require('../controllers/resourceController');
router.get('/resources', resourceController.adminResourceList);
router.get('/resources/new', resourceController.newResourceForm);
router.post('/resources', resourceController.createResource);
router.get('/resources/:id/edit', resourceController.editResourceForm);
router.post('/resources/:id', resourceController.updateResource);
router.post('/resources/:id/delete', resourceController.deleteResource);

module.exports = router;
