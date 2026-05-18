const twilio = require('twilio');
require('dotenv').config();

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

function formatPhoneNumber(phone) {
    if (!phone) return null;

    phone = phone.toString().replace(/\s|-/g, "");

    if (phone.startsWith("+")) return phone;

    if (phone.length === 10) return "+91" + phone;

    return phone;
}

async function sendSMS(to, message) {
    try {
        const formattedTo = formatPhoneNumber(to);

        if (!formattedTo) {
            console.error("❌ Invalid phone number");
            return { success: false, error: "Invalid phone number" };
        }

        const response = await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: formattedTo
        });

        console.log("📩 SMS sent to:", formattedTo);
        console.log("SID:", response.sid);

        return { success: true, sid: response.sid };

    } catch (err) {
        console.error("❌ SMS Error:", err.message);

        return { success: false, error: err.message };
    }
}

module.exports = { sendSMS };