const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER, 
    database: 'CapstoneDB',
    options: {
        encrypt: true, 
        trustServerCertificate: true,
        connectTimeout: 80000 // Give it 30 seconds to connect
    },
    pool: {
        max: 10, // Max 10 users at the exact same millisecond
        min: 0,
        idleTimeoutMillis: 80000
    }
};

// This variable will hold our "Reusable Connection"
let poolPromise;

const connectDB = async () => {
    if (!poolPromise) {
        // If no connection exists, create one and save it
        poolPromise = sql.connect(dbConfig);
    }
    try {
        const pool = await poolPromise;
        return pool;
    } catch (err) {
        poolPromise = null; // Reset so it tries again next time
        console.error("❌ Database Connection Failed: ", err.message);
        throw err;
    }
};

module.exports = { sql, connectDB };