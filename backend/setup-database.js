const sql = require('mssql');
require('dotenv').config();

console.log("DEBUG: Connecting to server:", process.env.DB_SERVER);

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function setup() {
    let pool;
    try {
        console.log("Connect to RDS Instance...");
        pool = await sql.connect(config);

        // 1. Create the Database
        console.log("Creating Database 'CapstoneDB'...");
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'CapstoneDB')
            CREATE DATABASE CapstoneDB
        `);

        // Close connection to reconnect to the specific DB
        await sql.close();
        
        const dbConfig = { ...config, database: 'CapstoneDB' };
        pool = await sql.connect(dbConfig);

        // 2. Create Users Table (Authentication)
        console.log("Creating 'Users' table...");
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
            CREATE TABLE Users (
                Id INT PRIMARY KEY IDENTITY(1,1),
                Username VARCHAR(100),
                Email VARCHAR(255) UNIQUE,
                PasswordHash VARCHAR(255)
            )
        `);

        // 3. Create LoginLogs Table (Requirement 10: Audit Logging)
        console.log("Creating 'LoginLogs' table...");
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='LoginLogs' AND xtype='U')
            CREATE TABLE LoginLogs (
                Id INT PRIMARY KEY IDENTITY(1,1),
                Email VARCHAR(255),
                LoginTime DATETIME DEFAULT GETDATE(),
                IPAddress VARCHAR(50)
            )
        `);

        // 4. Create FileMetadata Table (Requirement 5: Metadata Storage)
        console.log("Creating 'FileMetadata' table...");
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='FileMetadata' AND xtype='U')
            CREATE TABLE FileMetadata (
                Id INT PRIMARY KEY IDENTITY(1,1),
                FileName VARCHAR(255),
                FileUrl VARCHAR(500),
                UploadDate DATETIME DEFAULT GETDATE()
            )
        `);

        console.log("✅ ALL TABLES CREATED SUCCESSFULLY IN CapstoneDB!");
    } catch (err) {
        console.error("❌ Setup Error:", err.message);
    } finally {
        await sql.close();
        process.exit();
    }
}

setup();