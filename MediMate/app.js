const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('./backend/config/db'); // Path to your new config



app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'src/public')));

// --- SIGNUP ROUTE ---
app.post('/signup', async (req, res) => {
    const { name, phone, email, password, confirm_password } = req.body;

    if (password !== confirm_password) {
        return res.send("Passwords do not match!");
    }

    try {
        // Hash the password for safety
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            'INSERT INTO users (full_name, phone, email, password) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, phone, email, hashedPassword]
        );

        res.redirect('/login.html'); // Redirect to login after success
    } catch (err) {
        if (err.code === '23505') {
            res.send("Email already exists.");
        } else {
            console.error(err);
            res.status(500).send("Database Error");
        }
    }
});

// --- LOGIN ROUTE ---
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (userResult.rows.length === 0) {
            return res.send("User not found.");
        }

        const user = userResult.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
           res.json({
    success: true,
    user: {
        full_name: user.full_name,
        id: user.id,
        phone: user.phone
    }
}); // Change this to your main app page
        } else {
            res.send("Incorrect password.");
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));