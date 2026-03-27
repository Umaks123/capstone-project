const { connectDB, sql } = require('./config/db');

async function setupLoginDB() {
    let pool;
    try {
        pool = await connectDB();
        console.log("Creating database 'logindata'...");
        await pool.request().query(`IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'logindata') CREATE DATABASE logindata`);
        
        // Switch to the new DB to create tables
        const loginPool = await sql.connect({
            ...require('./config/db').dbConfig, // spread existing config
            database: 'logindata' 
        });

        console.log("Creating Users and LoginLogs tables...");
        await loginPool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
            CREATE TABLE Users (
                Id INT PRIMARY KEY IDENTITY(1,1),
                Email VARCHAR(255) UNIQUE,
                OTP VARCHAR(6),
                OTPExpiry DATETIME
            );

            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='LoginLogs' AND xtype='U')
            CREATE TABLE LoginLogs (
                Id INT PRIMARY KEY IDENTITY(1,1),
                Email VARCHAR(255),
                LoginTime DATETIME DEFAULT GETDATE(),
                IPAddress VARCHAR(50)
            );
        `);
        console.log("✅ Login Database & Tables Ready!");
    } catch (err) {
        console.error("❌ Setup Error:", err.message);
    } finally {
        process.exit();
    }
}
setupLoginDB();