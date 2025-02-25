require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const axios = require('axios');
const ngrok = require('ngrok'); // Ensure ngrok is imported

const path = require('path');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5000;

console.log("Server script is starting...");

// Verify environment variables
if (!process.env.HCAPTCHA_SECRET) {
    console.error('HCAPTCHA_SECRET is not set in environment variables');
    process.exit(1);
}

// Track used hCaptcha tokens to prevent reuse
const usedTokens = new Set();

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// User schema
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

const corsOptions = {
    origin: '*',
    methods: 'GET, POST',
    allowedHeaders: ['Content-Type'],
};

app.use(cors(corsOptions));
app.use(morgan('[:date[iso]] :method :url :status - :response-time ms'));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// hCaptcha verification middleware
const verifyCaptcha = async (req, res, next) => {
    const { token } = req.body;
    
    if (!token) {
        return res.status(400).json({ error: 'Captcha token is required' });
    }

    if (usedTokens.has(token)) {
        return res.status(400).json({ error: 'Invalid captcha token' });
    }

    try {
        const verificationResponse = await axios.post('https://hCaptcha.com/siteverify', 
            `secret=${process.env.HCAPTCHA_SECRET}&response=${token}`,
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        if (!verificationResponse.data.success) {
            return res.status(400).json({ error: 'Captcha verification failed', details: verificationResponse.data });
        }

        usedTokens.add(token);
        next();
    } catch ( error) {
        console.error('hCaptcha verification error:', error);
        return res.status(500).json({ error: 'Captcha verification service unavailable', details: error.message });
    }
};

// User authentication endpoints
app.post('/login', verifyCaptcha, async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const user = await User.findOne({ email });
        if (user && await bcrypt.compare(password, user.password)) {
            console.log(`[${new Date().toISOString()}] LOGIN SUCCESS - User: ${email}`);
            res.status(200).json({ message: 'Login successful', redirect: '/profile.html' });
        } else {
            console.log(`[${new Date().toISOString()}] LOGIN FAILED - User: ${email} - Reason: Invalid credentials`);
            res.status(401).json({ error: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed', details: error.message });
    }
});

app.post('/join', verifyCaptcha, async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();

        console.log(`[${new Date().toISOString()}] REGISTRATION SUCCESS - New User: ${email}`);
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed', details: error.message });
    }
});

// Email sending endpoint
app.post('/send-email', async (req, res) => {
    try {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.RECEIVER_EMAIL,
            subject: `Message from ${name}`,
            text: `From: ${name} <${email}>

Message:
${message}`
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "Email sent successfully" });
    } catch (error) {
        console.error('Email sending error:', error);
        res.status(500).json({ error: "Failed to send email", details: error.message });
    }
});

app.get('/users', async (req, res) => {
    try {
        const users = await User.find({});
        res.status(200).json(users);
    } catch (error) {
        console.error('Users fetch error:', error);
        res.status(500).json({ error: "Failed to fetch users", details: error.message });
    }
});

// Temporary endpoint to check registered users
app.get('/check-users', async (req, res) => {
    try {
        const users = await User.find({});
        console.log('Registered users:', users);
        res.status(200).json({ message: 'Users retrieved successfully', users });
    } catch (error) {
        console.error('Error retrieving users:', error);
        res.status(500).json({ error: 'Failed to retrieve users', details: error.message });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    let ngrokUrl;
    try {
        ngrokUrl = await ngrok.connect({ addr: PORT, authtoken: process.env.NGROK_AUTH_TOKEN });

        console.log(`Ngrok tunnel created at: ${ngrokUrl}`); // Log the ngrok URL
    // Retry logic for ngrok connection
    setTimeout(async () => {
        try {
            ngrokUrl = await ngrok.connect({ addr: PORT, authtoken: process.env.NGROK_AUTH_TOKEN });
            console.log(`Ngrok tunnel re-established at: ${ngrokUrl}`);
        } catch (error) {
            console.error('Error re-establishing ngrok tunnel:', error);
        }
    }, 60000); // Retry every 60 seconds

    // Retry logic for ngrok connection
    setTimeout(async () => {
        try {
            ngrokUrl = await ngrok.connect({ addr: PORT, authtoken: process.env.NGROK_AUTH_TOKEN });
            console.log(`Ngrok tunnel re-established at: ${ngrokUrl}`);
        } catch (error) {
            console.error('Error re-establishing ngrok tunnel:', error);
        }
    }, 60000); // Retry every 60 seconds

    // Retry logic for ngrok connection
    setTimeout(async () => {
        try {
            ngrokUrl = await ngrok.connect({ addr: PORT, authtoken: process.env.NGROK_AUTH_TOKEN });
            console.log(`Ngrok tunnel re-established at: ${ngrokUrl}`);
        } catch (error) {
            console.error('Error re-establishing ngrok tunnel:', error);
        }
    }, 60000); // Retry every 60 seconds

    // Retry logic for ngrok connection
    setTimeout(async () => {
        try {
            ngrokUrl = await ngrok.connect({ addr: PORT, authtoken: process.env.NGROK_AUTH_TOKEN });
            console.log(`Ngrok tunnel re-established at: ${ngrokUrl}`);
        } catch (error) {
            console.error('Error re-establishing ngrok tunnel:', error);
        }
    }, 60000); // Retry every 60 seconds

    // Retry logic for ngrok connection
    setTimeout(async () => {
        try {
            ngrokUrl = await ngrok.connect({ addr: PORT, authtoken: process.env.NGROK_AUTH_TOKEN });
            console.log(`Ngrok tunnel re-established at: ${ngrokUrl}`);
        } catch (error) {
            console.error('Error re-establishing ngrok tunnel:', error);
        }
    }, 60000); // Retry every 60 seconds

    // Retry logic for ngrok connection
    setTimeout(async () => {
        try {
            ngrokUrl = await ngrok.connect({ addr: PORT, authtoken: process.env.NGROK_AUTH_TOKEN });
            console.log(`Ngrok tunnel re-established at: ${ngrokUrl}`);
        } catch (error) {
            console.error('Error re-establishing ngrok tunnel:', error);
        }
    }, 60000); // Retry every 60 seconds

    // Retry logic for ngrok connection
    setTimeout(async () => {
        try {
            ngrokUrl = await ngrok.connect({ addr: PORT, authtoken: process.env.NGROK_AUTH_TOKEN });
            console.log(`Ngrok tunnel re-established at: ${ngrokUrl}`);
        } catch (error) {
            console.error('Error re-establishing ngrok tunnel:', error);
        }
    }, 60000); // Retry every 60 seconds

        console.log(`Ngrok tunnel created at: ${ngrokUrl}`);
    } catch (error) {
        console.error('Error creating ngrok tunnel:', error.message);


    }
});
