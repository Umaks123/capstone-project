const express = require('express');
const cors = require('cors');
const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { connectDB, sql } = require('./config/db'); 
const upload = require('./services/uploadService'); 

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';

const sns = new AWS.SNS({ 
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

app.use(cors({
  origin: ['https://uma.monster', 'https://www.uma.monster']
}));

app.use(express.json());

connectDB().then(() => {
    console.log("✅ Successfully connected to Unified CapstoneDB");
}).catch(err => {
    console.error("❌ Database initialization failed:", err.message);
});

// --- REGISTER ---
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

        res.status(201).json({ success: true, message: "User registered successfully" });
    } catch (err) {
        console.error("Registration Error:", err.message);
        res.status(500).json({ success: false, error: "Registration failed." });
    }
});

// --- LOGIN ---
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const pool = await connectDB();
        const result = await pool.request()
            .input('email', sql.VarChar, email)
            .query('SELECT * FROM Users WHERE Email = @email');

        const user = result.recordset[0];

        if (user && await bcrypt.compare(password, user.PasswordHash)) {
            
            // Log the login - wrapped in try/catch so a DB error here doesn't stop the login
            try {
                await pool.request()
                    .input('email', sql.VarChar, email)
                    .query('INSERT INTO LoginLogs (Email, LoginTime) VALUES (@email, GETDATE())');
            } catch (e) { console.error("Logging failed:", e.message); }

            // SNS Alert - REMOVED 'await' so it doesn't hang the response
            sns.publish({
                Message: `SECURITY ALERT: Successful login for ${email}`,
                TopicArn: process.env.AWS_SNS_TOPIC_ARN
            }).promise().catch(err => console.error("SNS Error:", err));

            const token = jwt.sign({ userId: user.Id, email: user.Email }, JWT_SECRET, { expiresIn: '2h' });
            res.json({ success: true, token });
        } else {
            res.status(401).json({ success: false, message: "Invalid credentials" });
        }
    } catch (err) {
        console.error("Login Error:", err.message);
        res.status(500).json({ success: false, error: "Server authentication error." });
    }
});

// --- UPLOAD ---
app.post('/api/upload', upload.single('myFile'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send({ success: false, message: 'No file provided.' });

        const pool = await connectDB(); 
        await pool.request()
            .input('fileName', sql.VarChar, req.file.originalname)
            .input('fileUrl', sql.VarChar, req.file.location) 
            .query('INSERT INTO FileMetadata (FileName, FileUrl, UploadDate) VALUES (@fileName, @fileUrl, GETDATE())');

        // Cleaned up SNS call
        sns.publish({
            Message: `FILE UPLOAD: ${req.file.originalname} uploaded by system.`,
            TopicArn: process.env.AWS_SNS_TOPIC_ARN
        }).promise().catch(err => console.error("SNS Error:", err));

        // FIXED: Only ONE response sent now
        res.status(200).json({ 
            success: true, 
            message: "File stored successfully!",
            url: req.file.location 
        });
    } catch (err) {
        console.error("Upload Error:", err.message);
        res.status(500).send({ success: false, error: 'Upload failed.' });
    }
});

app.get('/health', (req, res) => res.status(200).send('Instance is Healthy'));
app.get('/', (req, res) => res.send('Backend Server is Active!'));

app.listen(PORT, () => {
    console.log(`🚀 Server started on Port ${PORT}`);
});