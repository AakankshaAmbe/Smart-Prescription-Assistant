const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Points to C:\Priyanka\Project\MediMate\.env.txt
dotenv.config({ path: path.resolve(__dirname, '../../.env.txt') }); 

const pool = new Pool({
    user: process.env.DB_USER,      // Should be 'postgres' or your DB username
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: String(process.env.DB_PASSWORD),
    port: process.env.DB_PORT,
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};