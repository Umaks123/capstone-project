const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER, 
    database: 'CapstoneDB', // Force unified database name
    options: {
        encrypt: true, 
        trustServerCertificate: true 
    }
};

const connectDB = async () => {
    try {
        const pool = await sql.connect(dbConfig);
        return pool;
    } catch (err) {
        console.error("❌ Database Connection Failed: ", err.message);
        throw err;
    }
};

module.exports = { sql, connectDB, dbConfig };