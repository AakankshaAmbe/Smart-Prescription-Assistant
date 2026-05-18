const { Pool } = require('pg');

// For Render production - use DATABASE_URL
// For local development - use .env variables
let pool;

if (process.env.DATABASE_URL) {
    // Production on Render
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false  // Required for Render PostgreSQL
        }
    });
} else {
    // Local development
    const dotenv = require('dotenv');
    const path = require('path');
    dotenv.config({ path: path.resolve(__dirname, '../../.env.txt') });
    
    pool = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: String(process.env.DB_PASSWORD),
        port: process.env.DB_PORT,
    });
}

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    console.error('Database connection error details:', err.message);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool  // Export pool too for direct access if needed
};