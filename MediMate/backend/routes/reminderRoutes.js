const express = require('express');
const router = express.Router();
const controller = require('../controllers/reminderController');

router.post('/add-reminder', controller.addReminder);
router.get('/reminders', controller.getReminders);

// Add this middleware at top
router.use('/taken', (req, res, next) => {
    res.setHeader('ngrok-skip-browser-warning', 'true');
    next();
});

router.use('/missed', (req, res, next) => {
    res.setHeader('ngrok-skip-browser-warning', 'true');
    next();
});

router.get('/taken', controller.markTaken);
router.get('/missed', controller.markMissed);
router.get('/taken', controller.markTaken);
router.get('/missed', controller.markMissed);

router.delete('/delete-reminder/:id', controller.deleteReminder);
router.put('/update-reminder/:id', controller.updateReminder);
module.exports = router;