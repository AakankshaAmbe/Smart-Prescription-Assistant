const pool = require('../config/db');

exports.addReminder = async (req, res) => {
    const { user_id, medicines, times, duration, language, days, start_date, end_date } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO reminders 
            (user_id, medicines, times, duration, language, days, start_date, end_date)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
            [user_id, medicines, times, duration, language, days, start_date, end_date]
        );

        res.json({ success: true, data: result.rows[0] });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getReminders = async (req, res) => {
    const { user_id } = req.query;

    try {
        const result = await pool.query(`
            SELECT r.*, 
            COALESCE(
                (SELECT status 
                 FROM dose_logs 
                 WHERE reminder_id = r.id 
                 AND date = CURRENT_DATE 
                 ORDER BY id DESC 
                 LIMIT 1),
                'pending'
            ) AS latest_status
            FROM reminders r
            WHERE r.user_id = $1
        `, [user_id]);

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching reminders");
    }
};

exports.markTaken = async (req, res) => {
    const { doseId } = req.query;

    try {
        // check if dose exists
        const dose = await pool.query(
            `SELECT * FROM dose_logs WHERE id=$1`,
            [doseId]
        );

        if (dose.rows.length === 0) {
            return res.send("❌ Invalid Dose ID");
        }

        const current = dose.rows[0];

        // prevent double update
        if (current.status === 'taken') {
            return res.send("✅ Already marked as TAKEN");
        }

         if (isExpired(current.dose_time, current.date)) {
        return res.send("⛔ Link expired (3 min window passed)");
    }
        // update status
        await pool.query(
            `UPDATE dose_logs SET status='taken' WHERE id=$1`,
            [doseId]
        );

        res.send(`
            <h2 style="color:green;">✅ Dose Marked as TAKEN</h2>
            <p>You can close this page.</p>
        `);

    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};

exports.markMissed = async (req, res) => {
    const { doseId } = req.query;

    try {
        const dose = await pool.query(
            `SELECT * FROM dose_logs WHERE id=$1`,
            [doseId]
        );

        if (dose.rows.length === 0) {
            return res.send("❌ Invalid Dose ID");
        }

        const current = dose.rows[0];

        if (current.status === 'missed') {
            return res.send("❌ Already marked as MISSED");
        }

        // optional rule: don't allow missed if already taken
        if (current.status === 'taken') {
            return res.send("⚠️ Already marked as TAKEN, cannot mark missed");
        }
         if (isExpired(current.dose_time, current.date)) {
        return res.send("⛔ Link expired (3 min window passed)");
    }
        await pool.query(
            `UPDATE dose_logs SET status='missed' WHERE id=$1`,
            [doseId]
        );

        res.send(`
            <h2 style="color:red;">❌ Dose Marked as MISSED</h2>
            <p>You can close this page.</p>
        `);

    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};
function isExpired(doseTime, createdAt) {
    const now = new Date();

    const doseDate = new Date(createdAt);
    const [h, m] = doseTime.split(":");

    doseDate.setHours(h, m, 0);

    const diffMin = (now - doseDate) / 60000;

    return diffMin > 3;
}
// DELETE REMINDER
exports.deleteReminder = async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query(`DELETE FROM reminders WHERE id=$1`, [id]);

        res.json({ success: true, message: "Reminder deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// UPDATE REMINDER
exports.updateReminder = async (req, res) => {
    const { id } = req.params;
    const { medicines, times, duration, language, days, start_date, end_date } = req.body;

    try {
        const result = await pool.query(
            `UPDATE reminders 
             SET medicines=$1, times=$2, duration=$3, language=$4, days=$5, start_date=$6, end_date=$7
             WHERE id=$8 RETURNING *`,
            [medicines, times, duration, language, days, start_date, end_date, id]
        );

        res.json({ success: true, data: result.rows[0] });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};