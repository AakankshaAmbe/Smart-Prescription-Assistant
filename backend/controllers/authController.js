const bcrypt = require('bcryptjs');
const pool = require('../config/db');

exports.signupUser = async (req, res) => {
    const { name, phone, email, password, confirm_password } = req.body;

    if (password !== confirm_password) {
        return res.status(400).json({ success: false, message: "Passwords do not match!" });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await pool.query(
            'INSERT INTO users (full_name, phone, email, password) VALUES ($1, $2, $3, $4)',
            [name, phone, email, hashedPassword]
        );

        res.status(200).json({ success: true, message: "Account Created Successfully!" });
    } catch (err) {
        if (err.code === '23505') {
            res.status(400).json({ success: false, message: "Email already registered." });
        } else {
            console.error(err);
            res.status(500).json({ success: false, message: "Database Error." });
        }
    }
};

exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            // --- UPDATED: Sending the user's name back to the frontend ---
            res.status(200).json({ 
                success: true, 
                message: "Login Successful! Redirecting...",
                  user: {
                    userName: user.full_name,
                    id: user.id,
                    phone: user.phone
    }
            });
        } else {
            res.status(401).json({ success: false, message: "Incorrect password." });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server Error." });
    }
};