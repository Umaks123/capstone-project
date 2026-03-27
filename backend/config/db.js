const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER, 
    database: process.env.DB_DATABASE, // Default: FileMetadata
    options: {
        encrypt: true, 
        trustServerCertificate: true 
    }
};

const connectDB = async () => {
    try {
        const pool = await sql.connect(dbConfig);
        console.log("✅ SQL Server Connection Verified.");
        return pool;
    } catch (err) {
        console.error("❌ Database Connection Failed: ", err.message);
        throw err; // Throw error so server.js knows it failed
    }
};

// Export as an object
module.exports = { sql, connectDB, dbConfig };