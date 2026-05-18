const express = require('express');
const path = require('path');
const authController = require('./backend/controllers/authController');
const reminderRoutes = require('./backend/routes/reminderRoutes');
require('./backend/cron/reminderCron');
const smsRoutes = require('./backend/routes/smsRoutes');
const dashboardRoutes = require('./backend/routes/dashboardRoutes');
const pool = require('./backend/config/db');

// AFTER app creation


// API Routes

const app = express();

// --- MIDDLEWARE ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'src/public')));

// --- PAGE ROUTES (GET) ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/views/index.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/views/login.html'));
});

app.get('/signup.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/views/signup.html'));
});

// --- AUTH ROUTES (POST) ---
// These call the logic hidden in your backend/controllers folder
app.post('/signup', authController.signupUser);
app.post('/login', authController.loginUser);

app.get('/upload_prescription.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/views/upload_prescription.html'));
});

app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/views/dashboard.html'));
});

app.get('/reminders.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/views/reminders.html'));
});
app.get('/results.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/views/results.html'));
});
app.get('/search.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/views/search.html'));
});
app.get('/history.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/views/history.html'));
});
app.get('/medicine-info.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/views/medicine-info.html'));
});
app.use('/', reminderRoutes);
app.use('/', smsRoutes);
app.use('/', dashboardRoutes);

// ✅ GET: Fetch prescriptions (FIXED - Convert JSONB to text)
app.get('/api/history', async (req, res) => {
    const userId = req.query.user_id;
    
    console.log('📥 GET /api/history - User ID:', userId);
    
    if (!userId) {
        return res.status(400).json({ error: 'user_id required' });
    }
    
    try {
        // Auto-expire prescriptions older than 30 days
        await pool.query(
            `UPDATE prescriptions 
             SET status = 'expired' 
             WHERE user_id = $1 
               AND (status = 'active' OR status IS NULL)
               AND upload_date < NOW() - INTERVAL '30 days'`,
            [userId]
        );

        // Set any remaining NULL statuses to 'active'
        await pool.query(
            `UPDATE prescriptions SET status = 'active' 
             WHERE user_id = $1 AND status IS NULL`,
            [userId]
        );

        // Fetch all prescriptions - Convert medicines from JSONB to text
        const result = await pool.query(
            `SELECT 
                id,
                original_name,
                COALESCE(stored_filename, filename) AS stored_filename,
                file_type,
                patient_name,
                doctor,
                array_to_json(medicines) AS medicines,
                upload_date,
                status,
                updated_at
             FROM prescriptions
             WHERE user_id = $1
             ORDER BY upload_date DESC`,
            [userId]
        );
        
        // Parse medicines back to JSON for frontend
        const prescriptions = result.rows.map(row => ({
            ...row,
            medicines: row.medicines
                ? (typeof row.medicines === 'string' ? JSON.parse(row.medicines) : row.medicines)
                : []
        }));
        
        console.log(`✅ Found ${prescriptions.length} prescriptions for user ${userId}`);
        res.json(prescriptions);
        
    } catch (err) {
        console.error('❌ History fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// ✅ DELETE: Remove a prescription
app.delete('/api/history/:id', async (req, res) => {
    const prescriptionId = req.params.id;
    const userId = req.query.user_id;

    if (!userId) {
        return res.status(400).json({ error: 'user_id required' });
    }

    try {
        const check = await pool.query(
            `SELECT id FROM prescriptions WHERE id = $1 AND user_id = $2`,
            [prescriptionId, userId]
        );

        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Prescription not found or not yours' });
        }

        await pool.query(
            `DELETE FROM prescriptions WHERE id = $1 AND user_id = $2`,
            [prescriptionId, userId]
        );

        console.log(`✅ Deleted prescription ${prescriptionId} for user ${userId}`);
        res.json({ success: true, message: 'Prescription deleted successfully' });

    } catch (err) {
        console.error('❌ Delete error:', err);
        res.status(500).json({ error: 'Failed to delete prescription' });
    }
});

// ✅ PATCH: Update prescription status
app.patch('/api/history/:id/status', async (req, res) => {
    const prescriptionId = req.params.id;
    const { user_id, status } = req.body;
    
    console.log('Received:', { prescriptionId, user_id, status });
    
    if (!user_id) {
        return res.status(400).json({ error: 'user_id required in body' });
    }
    
    if (!status) {
        return res.status(400).json({ error: 'status required in body' });
    }
    
    if (!['active', 'completed', 'expired'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    
    try {
        const result = await pool.query(
            `UPDATE prescriptions 
             SET status = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2 AND user_id = $3 
             RETURNING id, status`,
            [status, prescriptionId, user_id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Prescription not found' });
        }
        
        console.log('Update successful:', result.rows[0]);
        res.json({ success: true, status: status });
        
    } catch (err) {
        console.error('Status update error:', err);
        res.status(500).json({ error: 'Failed to update status' });
    }
});




// --- START SERVER ---
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`MediMate running at http://localhost:${PORT}`);
});

