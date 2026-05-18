const cron = require('node-cron');
const pool = require('../config/db');
const { sendSMS } = require('../services/smsService');
const TinyURL = require('tinyurl');
// ===============================
// 🧠 LANGUAGE MESSAGE FUNCTION
// ===============================

async function shortenURL(url) {
    const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
    const shortUrl = await response.text();
    return shortUrl.trim();
}
async function getMessage(language, medicines, time, doseId) {
    const medText = medicines.join(", ");

    const BASE_URL = "https://lustiness-uncured-flakily.ngrok-free.dev";
    const takenLink = await shortenURL(`${BASE_URL}/taken?doseId=${doseId}`);
    const missedLink = await shortenURL(`${BASE_URL}/missed?doseId=${doseId}`);
    
   //const takenLink = await TinyURL.shorten(`${BASE_URL}/taken?doseId=${doseId}`);
    //const missedLink = await TinyURL.shorten(`${BASE_URL}/missed?doseId=${doseId}`);


    switch (language) {
        case "hi":
            return `

अब ${medText} लें
समय: ${time}

लिया: ${takenLink}
छूटा: ${missedLink}`;

        case "mr":
            return `

आता ${medText} घ्या
वेळ: ${time}

घेतले: ${takenLink}
चुकले: ${missedLink}`;

        default:
            return `

Take ${medText} now
Time: ${time}

Taken: ${takenLink}
Missed: ${missedLink}`;
    }
}

// ===============================
// 1️⃣ MAIN CRON (EVERY MINUTE)
// ===============================
cron.schedule('* * * * *', async () => {
    try {
        const now = new Date();
        const currentDay = now.toLocaleDateString('en-US', { weekday: 'short' });

        console.log(`⏰ Cron Running: ${now.toLocaleTimeString()} ${currentDay}`);

        const { rows: reminders } = await pool.query(`SELECT * FROM reminders`);

        for (let r of reminders) {

            // ✅ SAFE ARRAY PARSING
            const days = Array.isArray(r.days)
                ? r.days
                : typeof r.days === "string"
                ? JSON.parse(r.days)
                : [];

            const times = Array.isArray(r.times)
                ? r.times
                : typeof r.times === "string"
                ? JSON.parse(r.times)
                : [];

            if (!days.includes(currentDay)) continue;

            for (let time of times) {

                // ✅ TIME MATCH WITH 60 SEC WINDOW
                const [h, m] = time.split(":");
                const doseTime = new Date();
                doseTime.setHours(h, m, 0);

                const diff = Math.abs((now - doseTime) / 1000); // seconds

                if (diff > 60) continue;

                console.log("✅ MATCH FOUND:", time);

                // 🔴 PREVENT DUPLICATE
                const existing = await pool.query(
                    `SELECT * FROM dose_logs 
                     WHERE reminder_id=$1 
                     AND dose_time=$2 
                     AND date::date = CURRENT_DATE`,
                    [r.id, time]
                );

                if (existing.rows.length > 0) {
                    console.log("⚠️ Already exists:", r.id, time);
                    continue;
                }

                // ➕ CREATE DOSE
                const dose = await pool.query(
                    `INSERT INTO dose_logs 
                     (reminder_id, dose_time, date, status, sms_sent)
                     VALUES ($1,$2,$3,'pending',false)
                     RETURNING *`,
                    [r.id, time, now]
                );

                const doseId = dose.rows[0].id;

                // 👤 GET USER PHONE
                const user = await pool.query(
                    `SELECT phone FROM users WHERE id=$1`,
                    [r.user_id]
                );

                const phone = user.rows[0]?.phone;

                if (!phone) {
                    console.log("❌ No phone for user:", r.user_id);
                    continue;
                }

                console.log("📞 Sending to:", phone);

                // 📨 GENERATE MESSAGE
                const msg =await getMessage(r.language, r.medicines, time, doseId);

                console.log("📩 Message:", msg);

                // 📲 SEND SMS
                const smsResult = await sendSMS(phone, msg);

                if (smsResult.success) {
                    await pool.query(
                        `UPDATE dose_logs SET sms_sent=true WHERE id=$1`,
                        [doseId]
                    );

                    console.log("✅ SMS SENT:", smsResult.sid);
                } else {
                    console.log("❌ SMS FAILED:", smsResult.error);
                }
            }
        }

    } catch (err) {
        console.error("❌ CRON ERROR:", err.message);
    }
});


// ===============================
// 2️⃣ AUTO MISS AFTER 3 MINUTES
// ===============================
cron.schedule('* * * * *', async () => {
    try {
        const now = new Date();

        const { rows: doses } = await pool.query(
            `SELECT * FROM dose_logs WHERE status='pending'`
        );

        for (let d of doses) {

            const doseTime = new Date(d.date);
            const [h, m] = d.dose_time.split(":");
            doseTime.setHours(h, m, 0);

            const diffMin = (now - doseTime) / 60000;

            // ⛔ AUTO MISS AFTER 3 MIN
            if (diffMin >= 3) {

                await pool.query(
                    `UPDATE dose_logs SET status='missed' WHERE id=$1`,
                    [d.id]
                );

                console.log("❌ AUTO MISSED:", d.id);
            }
        }

    } catch (err) {
        console.error("❌ AUTO MISS ERROR:", err.message);
    }
});