const express = require('express');
const router = express.Router();
const { sendSMS } = require('../services/smsService');
const pool = require('../config/db');

router.post('/send-test-sms', async (req, res) => {

    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({
            success: false,
            message: "user_id required"
        });
    }

    try {
        // 🔹 GET USER
        const userResult = await pool.query(
            `SELECT id, full_name, phone FROM users WHERE id = $1`,
            [user_id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const user = userResult.rows[0];

        // 🔹 GET ONE REMINDER (latest)
        const reminderResult = await pool.query(
            `SELECT * FROM reminders 
             WHERE user_id = $1 
             ORDER BY id DESC LIMIT 1`,
            [user_id]
        );

        if (reminderResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No reminder found"
            });
        }

        const r = reminderResult.rows[0];

        // 🔹 CREATE DUMMY DOSE LOG (for testing)
        const doseResult = await pool.query(
            `INSERT INTO dose_logs (reminder_id, dose_time, date, status, sms_sent)
             VALUES ($1, $2, NOW(), 'pending', true)
             RETURNING *`,
            [r.id, r.times[0]]
        );

        const doseId = doseResult.rows[0].id;

        // 🔹 GENERATE MESSAGE
        const message = generateMessage(r, doseId);

        // 🔹 SEND SMS
        const result = await sendSMS(user.phone, message);

        if (result.success) {
            res.json({
                success: true,
                user: user.full_name,
                phone: user.phone,
                message,
                sid: result.sid
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: "Server error"
        });
    }
});

module.exports = router;
function generateMessage(reminder, doseId) {

    const medicineText = reminder.medicines.join(", ");
    const time = reminder.times[0];

    const takenLink = `http://localhost:3000/taken?doseId=${doseId}`;
    const missedLink = `http://localhost:3000/missed?doseId=${doseId}`;

    let msg = "";

    switch (reminder.language) {

        case "Hindi":
            msg = `💊 दवाई लेने का समय

अब ${medicineText} लें
समय: ${time}

✔ लिया: ${takenLink}
❌ छूटा: ${missedLink}`;
            break;

        case "Marathi":
            msg = `💊 औषध घेण्याची वेळ

आता ${medicineText} घ्या
वेळ: ${time}

✔ घेतले: ${takenLink}
❌ चुकले: ${missedLink}`;
            break;

        default: // English
            msg = `💊 Medication Reminder

Take ${medicineText} now
Time: ${time}

✔ Taken: ${takenLink}
❌ Missed: ${missedLink}`;
    }

    return msg;
}