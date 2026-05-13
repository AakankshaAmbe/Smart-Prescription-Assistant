const express = require('express');
const router = express.Router();
const controller = require('../controllers/reminderController');

router.post('/add-reminder', controller.addReminder);
router.get('/reminders', controller.getReminders);

router.get('/taken', controller.markTaken);
router.get('/missed', controller.markMissed);

router.delete('/delete-reminder/:id', controller.deleteReminder);
router.put('/update-reminder/:id', controller.updateReminder);
module.exports = router;