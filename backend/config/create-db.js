const { connectDB, sql } = require('./config/db');

async function createDatabase() {
    let pool;
    try {
        console.log("Connecting to SQL Server 'master'...");
        pool = await connectDB();
        
        if (!pool) {
            console.error("❌ Connection failed. Check your .env credentials.");
            return;
        }

        console.log("Executing: CREATE DATABASE FileMetadataDB...");
        // This creates the actual database container in AWS
        await pool.request().query(`CREATE DATABASE FileMetadataDB`);
        
        console.log("✅ SUCCESS! 'FileMetadataDB' has been created in the cloud.");
    } catch (err) {
        if (err.message.includes("already exists")) {
            console.log("ℹ️ Database already exists. You are ready for the next step!");
        } else {
            console.error("❌ Error during creation:", err.message);
        }
    } finally {
        if (pool) await sql.close();
        process.exit();
    }
}

createDatabase();