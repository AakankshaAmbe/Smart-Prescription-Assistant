const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const authController = require('./backend/controllers/authController');
const reminderRoutes = require('./backend/routes/reminderRoutes');
require('./backend/cron/reminderCron');
const smsRoutes = require('./backend/routes/smsRoutes');
const dashboardRoutes = require('./backend/routes/dashboardRoutes');
const pool = require('./backend/config/db');

const app = express();

// --- MIDDLEWARE ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'src/public')));

// Ensure upload directory exists
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

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

// --- AUTH ROUTES (POST) ---
app.post('/signup', authController.signupUser);
app.post('/login', authController.loginUser);

// --- OTHER ROUTES ---
app.use('/', reminderRoutes);
app.use('/', smsRoutes);
app.use('/', dashboardRoutes);

// ================= FILE UPLOAD ENDPOINTS =================

app.post('/prescription/upload-image', upload.single('file'), async (req, res) => {
    console.log('📸 Upload image request received');
    
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const userId = req.body.user_id;
        
        const prescriptionData = {
            status: 'success',
            patient_name: "Sample Patient",
            doctor_name: "Sample Doctor",
            date: new Date().toISOString().split('T')[0],
            medicines: [
                {
                    name: "Paracetamol",
                    dosage: "500mg",
                    frequency: "Twice daily",
                    duration: "5 days",
                    uses: "Fever and pain relief",
                    side_effects: "Nausea, stomach upset",
                    confidence: 95,
                    source: "AI Extracted"
                },
                {
                    name: "Amoxicillin",
                    dosage: "250mg",
                    frequency: "Three times daily",
                    duration: "7 days",
                    uses: "Bacterial infection",
                    side_effects: "Diarrhea, rash",
                    confidence: 92,
                    source: "AI Extracted"
                }
            ]
        };

        if (userId && userId !== 'undefined' && userId !== 'null') {
            try {
                await pool.query(
                    `INSERT INTO prescriptions (user_id, original_name, stored_filename, file_type, patient_name, doctor, medicines, status, upload_date)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
                    [userId, req.file.originalname, req.file.filename, req.file.mimetype, 
                     prescriptionData.patient_name, prescriptionData.doctor_name, 
                     JSON.stringify(prescriptionData.medicines), 'active']
                );
                console.log('✅ Prescription saved to database');
            } catch (dbError) {
                console.error('Database save error:', dbError);
            }
        }

        res.json(prescriptionData);

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed', details: error.message });
    }
});

app.post('/prescription/upload-pdf', upload.single('file'), async (req, res) => {
    console.log('📄 Upload PDF request received');
    
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const userId = req.body.user_id;
        
        const prescriptionData = {
            status: 'success',
            patient_name: "Sample Patient",
            doctor_name: "Sample Doctor",
            date: new Date().toISOString().split('T')[0],
            medicines: [
                {
                    name: "Sample Medicine 1",
                    dosage: "500mg",
                    frequency: "Twice daily",
                    duration: "5 days",
                    uses: "Sample use information",
                    side_effects: "Sample side effects",
                    confidence: 90,
                    source: "PDF Extracted"
                },
                {
                    name: "Sample Medicine 2",
                    dosage: "250mg",
                    frequency: "Once daily",
                    duration: "10 days",
                    uses: "Sample use information",
                    side_effects: "Sample side effects",
                    confidence: 85,
                    source: "PDF Extracted"
                }
            ]
        };

        if (userId && userId !== 'undefined' && userId !== 'null') {
            try {
                await pool.query(
                    `INSERT INTO prescriptions (user_id, original_name, stored_filename, file_type, patient_name, doctor, medicines, status, upload_date)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
                    [userId, req.file.originalname, req.file.filename, req.file.mimetype,
                     prescriptionData.patient_name, prescriptionData.doctor_name,
                     JSON.stringify(prescriptionData.medicines), 'active']
                );
                console.log('✅ PDF prescription saved to database');
            } catch (dbError) {
                console.error('Database save error:', dbError);
            }
        }

        res.json(prescriptionData);

    } catch (error) {
        console.error('PDF Upload error:', error);
        res.status(500).json({ error: 'PDF upload failed' });
    }
});

app.get('/prescription/image/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(__dirname, 'uploads', filename);
    
    if (fs.existsSync(filepath)) {
        res.sendFile(filepath);
    } else {
        res.status(404).json({ error: 'Image not found' });
    }
});

// ================= SEARCH MEDICINE ENDPOINT =================

app.post('/search-medicine', async (req, res) => {
    const { name } = req.body;
    
    console.log('🔍 Searching for medicine:', name);
    
    if (!name) {
        return res.status(400).json({ error: 'Medicine name required' });
    }
    
    try {
        const medicines = {
            'paracetamol': {
                found: true,
                name: 'Paracetamol',
                uses: 'Fever and mild to moderate pain relief',
                dosage: '500mg every 4-6 hours',
                when_to_take: 'With or without food',
                side_effects: 'Nausea, stomach upset, allergic reactions',
                precautions: 'Do not exceed 4000mg per day.',
                description: 'Paracetamol is a pain reliever and fever reducer.',
                confidence: 95
            },
            'amoxicillin': {
                found: true,
                name: 'Amoxicillin',
                uses: 'Bacterial infections',
                dosage: '250mg - 500mg every 8 hours',
                when_to_take: 'Take with food',
                side_effects: 'Diarrhea, nausea, rash',
                precautions: 'Complete full course.',
                description: 'Amoxicillin is a penicillin-type antibiotic.',
                confidence: 92
            },
            'ibuprofen': {
                found: true,
                name: 'Ibuprofen',
                uses: 'Pain, inflammation, fever',
                dosage: '200mg - 400mg every 6-8 hours',
                when_to_take: 'Take with food or milk',
                side_effects: 'Stomach pain, heartburn, nausea',
                precautions: 'Not for long-term use.',
                description: 'Ibuprofen is an NSAID anti-inflammatory drug.',
                confidence: 94
            }
        };
        
        const searchTerm = name.toLowerCase().trim();
        let result = medicines[searchTerm];
        
        if (!result) {
            const keys = Object.keys(medicines);
            const partialMatch = keys.find(key => key.includes(searchTerm) || searchTerm.includes(key));
            if (partialMatch) {
                result = medicines[partialMatch];
            }
        }
        
        if (result) {
            res.json(result);
        } else {
            res.json({
                found: false,
                message: `Medicine "${name}" not found in our database.`
            });
        }
        
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// ================= HISTORY API ENDPOINTS =================

app.get('/api/history', async (req, res) => {
    const userId = req.query.user_id;
    
    console.log('📥 GET /api/history - User ID:', userId);
    
    if (!userId) {
        return res.status(400).json({ error: 'user_id required' });
    }
    
    try {
        await pool.query(
            `UPDATE prescriptions 
             SET status = 'expired' 
             WHERE user_id = $1 
               AND (status = 'active' OR status IS NULL)
               AND upload_date < NOW() - INTERVAL '30 days'`,
            [userId]
        );

        await pool.query(
            `UPDATE prescriptions SET status = 'active' 
             WHERE user_id = $1 AND status IS NULL`,
            [userId]
        );

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
        
        const prescriptions = result.rows.map(row => ({
            ...row,
            medicines: row.medicines
                ? (typeof row.medicines === 'string' ? JSON.parse(row.medicines) : row.medicines)
                : []
        }));
        
        console.log(`✅ Found ${prescriptions.length} prescriptions`);
        res.json(prescriptions);
        
    } catch (err) {
        console.error('❌ History fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

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
            return res.status(404).json({ error: 'Prescription not found' });
        }

        await pool.query(
            `DELETE FROM prescriptions WHERE id = $1 AND user_id = $2`,
            [prescriptionId, userId]
        );

        console.log(`✅ Deleted prescription ${prescriptionId}`);
        res.json({ success: true, message: 'Prescription deleted successfully' });

    } catch (err) {
        console.error('❌ Delete error:', err);
        res.status(500).json({ error: 'Failed to delete prescription' });
    }
});

app.patch('/api/history/:id/status', async (req, res) => {
    const prescriptionId = req.params.id;
    const { user_id, status } = req.body;
    
    if (!user_id) {
        return res.status(400).json({ error: 'user_id required in body' });
    }
    
    if (!status || !['active', 'completed', 'expired'].includes(status)) {
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
        
        res.json({ success: true, status: status });
        
    } catch (err) {
        console.error('Status update error:', err);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// ================= DUMMY API ENDPOINTS (for voice & card) =================

app.post('/api/voice', async (req, res) => {
    res.json({ message: 'Voice endpoint - Python backend required' });
});

app.post('/api/card', async (req, res) => {
    res.json({ message: 'Card endpoint - Python backend required' });
});

app.get('/dashboard-stats', async (req, res) => {
    const userId = req.query.user_id;
    res.json({
        success: true,
        data: {
            active: 0,
            weeklyTaken: 0,
            pending: 0,
            adherence: 0,
            weeklyChart: [],
            prediction: { risk: 'LOW', missed: 0 }
        }
    });
});

app.get('/reminders', async (req, res) => {
    res.json([]);
});

app.post('/add-reminder', async (req, res) => {
    res.json({ success: true });
});

app.put('/update-reminder/:id', async (req, res) => {
    res.json({ success: true });
});

app.delete('/delete-reminder/:id', async (req, res) => {
    res.json({ success: true });
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`MediMate running at http://localhost:${PORT}`);
});