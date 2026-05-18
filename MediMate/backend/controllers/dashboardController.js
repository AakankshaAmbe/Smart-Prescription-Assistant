const pool = require('../config/db');

exports.getDashboardStats = async (req, res) => {
    try {
        const userId = req.query.user_id;

        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID required" });
        }

        // 🔹 Active Medications
        const activeMeds = await pool.query(
            `SELECT COUNT(*) FROM reminders WHERE user_id=$1`,
            [userId]
        );

        // 🔹 This Week Taken
        const weeklyTaken = await pool.query(
            `SELECT COUNT(*) FROM dose_logs 
             WHERE reminder_id IN (SELECT id FROM reminders WHERE user_id=$1)
             AND status='taken'
             AND date >= NOW() - INTERVAL '7 days'`,
            [userId]
        );

        // 🔹 Total doses
        const totalDoses = await pool.query(
            `SELECT COUNT(*) FROM dose_logs 
             WHERE reminder_id IN (SELECT id FROM reminders WHERE user_id=$1)`,
            [userId]
        );

        const takenDoses = await pool.query(
            `SELECT COUNT(*) FROM dose_logs 
             WHERE reminder_id IN (SELECT id FROM reminders WHERE user_id=$1)
             AND status='taken'`,
            [userId]
        );

        const adherence = totalDoses.rows[0].count == 0 ? 0 :
            Math.round((takenDoses.rows[0].count / totalDoses.rows[0].count) * 100);

        // 🔹 Pending
        const pending = await pool.query(
            `SELECT COUNT(*) FROM dose_logs 
             WHERE reminder_id IN (SELECT id FROM reminders WHERE user_id=$1)
             AND status='missed'`,
            [userId]
        );

        // ===============================
        // ✅ FIXED WEEKLY CHART (Sun → Sat)
        // ===============================
        const weeklyRaw = await pool.query(
            `SELECT date, status
             FROM dose_logs
             WHERE reminder_id IN (SELECT id FROM reminders WHERE user_id=$1)
             AND date >= NOW() - INTERVAL '7 days'`,
            [userId]
        );

        const daysOrder = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

        let weeklyMap = {
            Sun:{taken:0, missed:0},
            Mon:{taken:0, missed:0},
            Tue:{taken:0, missed:0},
            Wed:{taken:0, missed:0},
            Thu:{taken:0, missed:0},
            Fri:{taken:0, missed:0},
            Sat:{taken:0, missed:0}
        };

        weeklyRaw.rows.forEach(d => {
            const day = new Date(d.date).toLocaleDateString('en-US',{weekday:'short'});

            if (d.status === "taken") weeklyMap[day].taken++;
            if (d.status === "missed") weeklyMap[day].missed++;
        });

        const weeklyChart = daysOrder.map(day => ({
            day,
            taken: weeklyMap[day].taken,
            missed: weeklyMap[day].missed
        }));

        // ===============================
        // 🤖 AI PREDICTION
        // ===============================
        const totalMissed = Object.values(weeklyMap).reduce((a,b)=>a+b.missed,0);
        const totalTaken = Object.values(weeklyMap).reduce((a,b)=>a+b.taken,0);

        let riskLevel = "LOW";
        if (totalMissed > totalTaken) riskLevel = "HIGH";
        else if (totalMissed > 2) riskLevel = "MEDIUM";

        res.json({
            success: true,
            data: {
                active: activeMeds.rows[0].count,
                weeklyTaken: weeklyTaken.rows[0].count,
                adherence,
                pending: pending.rows[0].count,
                weeklyChart,
                prediction: {
                    risk: riskLevel,
                    missed: totalMissed
                }
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
};