const express = require('express');
const cors = require('cors');
const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Unified Database Configuration
const { connectDB, sql } = require('./config/db'); 
// S3 Upload Logic (Requirement 5)
const upload = require('./services/uploadService'); 

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';

// Initialize AWS SNS (Requirements 8 & 10)
const sns = new AWS.SNS({ 
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Middleware
app.use(cors()); // Allows your Frontend to communicate with this Backend
app.use(express.json());

// --- DATABASE CONNECTION CHECK ---
connectDB().then(() => {
    console.log("✅ Successfully connected to Unified CapstoneDB");
}).catch(err => {
    console.error("❌ Database initialization failed:", err.message);
});


// --- AUTHENTICATION ROUTES (Requirement 10: Logging & Alerts) ---

/**
 * ROUTE: Register
 */
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const pool = await connectDB(); 
        
        await pool.request()
            .input('username', sql.VarChar, username)
            .input('email', sql.VarChar, email)
            .input('password', sql.VarChar, hashedPassword)
            .query('INSERT INTO Users (Username, Email, PasswordHash) VALUES (@username, @email, @password)');

        console.log(`👤 User Registered: ${email}`);
        res.status(201).json({ success: true, message: "User registered successfully" });
    } catch (err) {
        console.error("Registration Error:", err.message);
        res.status(500).json({ success: false, error: "Registration failed. Check if table exists." });
    }
});

/**
 * ROUTE: Login
 */
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const pool = await connectDB();
        const result = await pool.request()
            .input('email', sql.VarChar, email)
            .query('SELECT * FROM Users WHERE Email = @email');

        const user = result.recordset[0];

        if (user && await bcrypt.compare(password, user.PasswordHash)) {
            
            // 1. Audit Logging (Requirement 10)
            await pool.request()
                .input('email', sql.VarChar, email)
                .query('INSERT INTO LoginLogs (Email, LoginTime) VALUES (@email, GETDATE())');

            // 2. Real-time Security Alert (Requirement 10)
            await sns.publish({
                Message: `SECURITY ALERT: Successful login detected for user ${email} at ${new Date().toISOString()}`,
                TopicArn: process.env.AWS_SNS_TOPIC_ARN
            }).promise();

            // Generate Token
            const token = jwt.sign({ userId: user.Id, email: user.Email }, JWT_SECRET, { expiresIn: '2h' });
            
            console.log(`✅ Login Successful: ${email}`);
            res.json({ success: true, token });
        } else {
            res.status(401).json({ success: false, message: "Invalid email or password" });
        }
    } catch (err) {
        console.error("Login Error:", err.message);
        res.status(500).json({ success: false, error: "Server authentication error." });
    }
});


// --- FILE UPLOAD ROUTES (Requirement 5 & 8) ---

/**
 * ROUTE: Upload to S3 + Save Metadata
 */
app.post('/api/upload', upload.single('myFile'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send({ success: false, message: 'No file provided.' });

        // 1. Store Metadata in RDS (Requirement 5)
        const pool = await connectDB(); 
        await pool.request()
            .input('fileName', sql.VarChar, req.file.originalname)
            .input('fileUrl', sql.VarChar, req.file.location) 
            .query('INSERT INTO FileMetadata (FileName, FileUrl, UploadDate) VALUES (@fileName, @fileUrl, GETDATE())');

        // 2. Trigger Async Processing Event (Requirement 8)
        // This message can be picked up by an AWS Lambda or SQS
        await sns.publish({
            Message: JSON.stringify({
                event: "NEW_FILE_UPLOADED",
                fileName: req.file.originalname,
                s3Url: req.file.location,
                timestamp: new Date().toISOString()
            }),
            TopicArn: process.env.AWS_SNS_TOPIC_ARN
        }).promise();

        console.log(`📁 File Uploaded and Logged: ${req.file.originalname}`);
        res.status(200).json({ 
            success: true, 
            message: "File stored in S3 and RDS log created!",
            url: req.file.location 
        });
    } catch (err) {
        console.error("Upload Error:", err.message);
        res.status(500).send({ success: false, error: 'Database or S3 error during upload.' });
    }
});


// --- HEALTH & INFRASTRUCTURE ROUTES ---

// Critical for AWS Load Balancer Health Check (Requirement 7)
app.get('/health', (req, res) => res.status(200).send('Instance is Healthy'));

app.get('/', (req, res) => res.send('Backend Server is Active on AWS EC2!'));

app.listen(PORT, () => {
    console.log(`🚀 Server started on Port ${PORT}`);
    console.log(`📡 SNS Monitoring Active: ${process.env.AWS_SNS_TOPIC_ARN}`);
});