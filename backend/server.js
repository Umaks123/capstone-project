const express = require('express');
const cors = require('cors');
const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Imports from your local files
const { connectDB, sql, dbConfig } = require('./config/db'); 
const upload = require('./services/uploadService'); 

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_12345';

// 1. Initialize AWS SNS (Requirement 8 & 10)
const sns = new AWS.SNS({ region: process.env.AWS_REGION });

app.use(cors());
app.use(express.json());

// Verify Database Connection on Startup
connectDB().then(() => {
    console.log("🚀 Initial Database Connection Successful");
}).catch(err => {
    console.error("❌ Initial Database Connection Failed:", err.message);
});

/**
 * HELPER: Connection for Auth operations
 * We use a dedicated pool to ensure we can switch to Logindata
 */
async function getLoginPool() {
    try {
        const pool = new sql.ConnectionPool({ ...dbConfig, database: 'Logindata' });
        await pool.connect();
        return pool;
    } catch (err) {
        console.error("Auth DB Connection Error:", err.message);
        throw err;
    }
}

// --- AUTHENTICATION ROUTES ---

/**
 * ROUTE: Register (Sign Up)
 */
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const pool = await getLoginPool(); 
        
        // Use Fully Qualified Name: Logindata.dbo.Users
        await pool.request()
            .input('username', sql.VarChar, username)
            .input('email', sql.VarChar, email)
            .input('password', sql.VarChar, hashedPassword)
            .query('INSERT INTO Logindata.dbo.Users (Username, Email, PasswordHash) VALUES (@username, @email, @password)');

        const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
        
        console.log(`👤 New user registered: ${email}`);
        res.status(201).json({ success: true, token, message: "User created successfully" });
    } catch (err) {
        console.error("Registration Error:", err.message);
        res.status(500).json({ error: "Registration failed. Table 'Logindata.dbo.Users' not found." });
    }
});

/**
 * ROUTE: Login
 * Satisfies Requirement 10 (Logging & SNS Alerting)
 */
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const pool = await getLoginPool();
        
        // Use Fully Qualified Name: Logindata.dbo.Users
        const result = await pool.request()
            .input('email', sql.VarChar, email)
            .query('SELECT * FROM Logindata.dbo.Users WHERE Email = @email');

        const user = result.recordset[0];

        if (user && await bcrypt.compare(password, user.PasswordHash)) {
            
            // 1. Audit Log: Insert into Logindata.dbo.LoginLogs (Requirement 10)
            await pool.request()
                .input('email', sql.VarChar, email)
                .query('INSERT INTO Logindata.dbo.LoginLogs (Email, LoginTime) VALUES (@email, GETDATE())');

            // 2. Security Alert: Send SNS Notification (Requirement 10)
            await sns.publish({
                Message: `ALARM: New Login for user ${email} at ${new Date().toLocaleString()}`,
                TopicArn: process.env.AWS_SNS_TOPIC_ARN
            }).promise();

            // 3. JWT Session
            const token = jwt.sign({ userId: user.Id, email: user.Email }, JWT_SECRET, { expiresIn: '1h' });
            
            console.log(`✅ Login successful: ${email}`);
            res.json({ success: true, token });
        } else {
            res.status(401).json({ success: false, message: "Invalid email or password" });
        }
    } catch (err) {
        console.error("Login Error:", err.message);
        res.status(500).json({ error: "Server error during login. Check 'Logindata' tables." });
    }
});

// --- FILE UPLOAD ROUTES ---

/**
 * ROUTE: File Upload to S3
 * Satisfies Requirement 5 (Metadata in DB) and Requirement 8 (Event Trigger)
 */
app.post('/api/upload', upload.single('myFile'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send('No file uploaded.');

        // 1. Store Metadata in FileMetadata DB (Requirement 5)
        const pool = await connectDB(); 
        await pool.request()
            .input('fileName', sql.VarChar, req.file.originalname)
            .input('fileUrl', sql.VarChar, req.file.location) 
            .query('INSERT INTO FileMetadata.dbo.FileMetadata (FileName, FileUrl, UploadDate) VALUES (@fileName, @fileUrl, GETDATE())');

        // 2. Generate Event for Lambda Processing (Requirement 8 & 9)
        await sns.publish({
            Message: JSON.stringify({
                event: "NEW_FILE_UPLOAD",
                bucket: process.env.S3_BUCKET_NAME,
                key: req.file.key,
                url: req.file.location
            }),
            TopicArn: process.env.AWS_SNS_TOPIC_ARN
        }).promise();

        console.log(`📁 File uploaded: ${req.file.originalname}`);
        res.status(200).json({ 
            success: true, 
            message: "File stored in S3 and Metadata saved to RDS!",
            url: req.file.location 
        });
    } catch (err) {
        console.error("Upload Error:", err);
        res.status(500).send('Server Error during S3/RDS upload');
    }
});

// Infrastructure health routes
app.get('/health', (req, res) => res.status(200).send('Healthy'));
app.get('/', (req, res) => res.send('Backend Server is Running!'));

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 SNS Topic Active: ${process.env.AWS_SNS_TOPIC_ARN}`);
});