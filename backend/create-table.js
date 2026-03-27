const { connectDB, sql } = require('./config/db');

async function setupTable() {
    let pool;
    try {
        console.log("Connecting to SQL Server...");
        pool = await connectDB();
        
        // If pool is undefined, the connection failed earlier
        if (!pool) {
            console.error("❌ Could not establish connection. Check your Networking/VPN.");
            return;
        }

        console.log("✅ Connection established. Creating table...");
        
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='FileMetadata' AND xtype='U')
            CREATE TABLE FileMetadata (
                Id INT PRIMARY KEY IDENTITY(1,1),
                FileName VARCHAR(255),
                FileUrl VARCHAR(500),
                UploadDate DATETIME DEFAULT GETDATE()
            )
        `);
        
        console.log("✅ Table 'FileMetadata' is ready!");
    } catch (err) {
        console.error("❌ Error inside Table Script:", err.message);
    } finally {
        if (pool) await sql.close();
        process.exit();
    }
}

setupTable();