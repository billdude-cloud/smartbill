const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const avatarUploadDir = path.join(__dirname, '../frontend/uploads/avatars');

// Ensure upload directory exists
if (!fs.existsSync(avatarUploadDir)) {
    fs.mkdirSync(avatarUploadDir, { recursive: true });
}

// Avatar upload configuration
const avatarStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, avatarUploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
        cb(null, `avatar_${req.user.id}_${Date.now()}${ext}`);
    }
});

const uploadAvatar = multer({
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (/^image\/(png|jpe?g|gif|webp)$/i.test(file.mimetype)) {
            cb(null, true);
            return;
        }
        cb(new Error('Only image files are allowed'));
    }
});

// ============================================
// EMAIL CONFIGURATION
// ============================================
const emailTransporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

emailTransporter.verify((error) => {
    if (error) {
        console.error('❌ Email configuration error:', error.message);
        console.log('⚠️  Email features (verification, password reset) will not work');
    } else {
        console.log('✅ Email server ready to send messages');
        console.log(`📧 From: ${process.env.EMAIL_FROM || 'SmartBill'}`);
    }
});

// ============================================
// SEND EMAIL HELPER FUNCTION
// ============================================
async function sendEmail(to, subject, html) {
    try {
        const info = await emailTransporter.sendMail({
            from: process.env.EMAIL_FROM || 'SmartBill <noreply@smartbill.com>',
            to,
            subject,
            html
        });
        console.log(`📧 Email sent to ${to}: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to send email to ${to}:`, error.message);
        return false;
    }
}

// CORS Configuration
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? ['https://smartbill-app-9uvq.onrender.com', 'https://smartbill-hrcu.onrender.com']
        : ['http://localhost:3000', 'http://localhost:5000', 'http://127.0.0.1:5500'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// MySQL Database connection pool
const pool = mysql.createPool({
    host: process.env.MYSQLHOST || 'gondola.proxy.rlwy.net',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || 'dFKdKoFFyfmyJEnSjEDumeuADaBepGgs',
    database: process.env.MYSQLDATABASE || 'railway',
    port: process.env.MYSQLPORT || 48363,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ============================================
// CREATE TABLES
// ============================================
async function createTables() {
    try {
        // Users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                avatar TEXT NULL,
                is_verified BOOLEAN DEFAULT FALSE,
                verification_token VARCHAR(255) NULL,
                verification_code VARCHAR(10) NULL,
                verification_code_expires DATETIME NULL,
                reset_token VARCHAR(255) NULL,
                reset_token_expires DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Users table ready');
        
        // Groups table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`groups\` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                created_by INT NOT NULL,
                invite_code VARCHAR(20) UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Groups table ready');
        
        // Group members table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS group_members (
                id INT AUTO_INCREMENT PRIMARY KEY,
                group_id INT NOT NULL,
                user_id INT NOT NULL,
                role VARCHAR(20) DEFAULT 'member',
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (group_id) REFERENCES \`groups\`(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_member (group_id, user_id)
            )
        `);
        console.log('✅ Group members table ready');
        
        // Group name-only members
        await pool.query(`
            CREATE TABLE IF NOT EXISTS group_name_members (
                id INT AUTO_INCREMENT PRIMARY KEY,
                group_id INT NOT NULL,
                name VARCHAR(100) NOT NULL,
                created_by INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (group_id) REFERENCES \`groups\`(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Group name members table ready');
        
        // Bills table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bills (
                id INT AUTO_INCREMENT PRIMARY KEY,
                group_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                total DECIMAL(10,2) NOT NULL,
                created_by INT NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (group_id) REFERENCES \`groups\`(id) ON DELETE CASCADE,
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        `);
        console.log('✅ Bills table ready');
        
        // Bill items table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bill_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                bill_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                quantity INT DEFAULT 1,
                FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Bill items table ready');
        
        // Bill splits table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bill_splits (
                id INT AUTO_INCREMENT PRIMARY KEY,
                bill_id INT NOT NULL,
                user_id INT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                paid BOOLEAN DEFAULT FALSE,
                paid_at TIMESTAMP NULL,
                FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_split (bill_id, user_id)
            )
        `);
        console.log('✅ Bill splits table ready');
        
        // Bill name-only splits table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bill_name_splits (
                id INT AUTO_INCREMENT PRIMARY KEY,
                bill_id INT NOT NULL,
                name_member_id INT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
                FOREIGN KEY (name_member_id) REFERENCES group_name_members(id) ON DELETE CASCADE,
                UNIQUE KEY unique_name_split (bill_id, name_member_id)
            )
        `);
        console.log('✅ Bill name splits table ready');
        
        // Payments table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS payments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                bill_id INT NOT NULL,
                user_id INT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                method VARCHAR(50),
                notes TEXT,
                paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);
        console.log('✅ Payments table ready');
        
        // Name payments table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS name_payments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                bill_id INT NOT NULL,
                name_member_id INT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                method VARCHAR(50),
                notes TEXT,
                paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
                FOREIGN KEY (name_member_id) REFERENCES group_name_members(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Name payments table ready');
        
        // Notifications table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                type VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                related_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Notifications table ready');
        
        console.log('✅ All MySQL tables ready');
        
    } catch (error) {
        console.error('❌ Error creating tables:', error.message);
    }
}

// Initialize database connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        await connection.query('SELECT 1');
        connection.release();
        console.log('? MySQL connected successfully to Railway');

        await createTables();
        return true;
    } catch (err) {
        console.error('? MySQL connection failed:', err.message);
        return false;
    }
}

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// ============================================
// NOTIFICATION HELPER
// ============================================
async function createNotification(userId, type, title, message, relatedId = null) {
    try {
        await pool.query(
            'INSERT INTO notifications (user_id, type, title, message, related_id) VALUES (?, ?, ?, ?, ?)',
            [userId, type, title, message, relatedId]
        );
    } catch (error) {
        console.error('Failed to create notification:', error);
    }
}

async function getGroupForUser(groupId, userId) {
    const [rows] = await pool.query(`
        SELECT g.*, gm.role
        FROM \`groups\` g
        JOIN group_members gm ON g.id = gm.group_id
        WHERE g.id = ? AND gm.user_id = ?
    `, [groupId, userId]);

    return rows[0] || null;
}

async function getBillForUser(billId, userId) {
    const [rows] = await pool.query(`
        SELECT b.*, g.name as group_name, u.name as created_by_name
        FROM bills b
        JOIN \`groups\` g ON b.group_id = g.id
        JOIN users u ON b.created_by = u.id
        WHERE b.id = ?
          AND b.group_id IN (
              SELECT group_id FROM group_members WHERE user_id = ?
          )
    `, [billId, userId]);

    return rows[0] || null;
}

// ============================================
// HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Server is running with MySQL',
        port: PORT,
        environment: process.env.NODE_ENV || 'development'
    });
});

// ============================================
// DEFAULT AVATAR GENERATOR
// ============================================
app.get('/api/profile/default-avatar', (req, res) => {
    try {
        const name = String(req.query.name || 'User').trim();
        const size = Math.max(32, Math.min(parseInt(req.query.size, 10) || 120, 512));
        
        const words = name.split(/\s+/).filter(Boolean);
        let initials = '';
        if (words.length === 1) {
            initials = words[0].charAt(0).toUpperCase();
        } else {
            initials = words[0].charAt(0).toUpperCase() + words[1].charAt(0).toUpperCase();
        }
        
        const colors = [
            '#667eea', '#764ba2', '#f59e0b', '#10b981', '#ef4444',
            '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
            '#06b6d4', '#84cc16', '#d946ef', '#f43f5e', '#0ea5e9'
        ];
        
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = ((hash << 5) - hash) + name.charCodeAt(i);
            hash = hash & hash;
        }
        const colorIndex = Math.abs(hash) % colors.length;
        const bgColor = colors[colorIndex];
        
        const fontSize = initials.length === 1 ? Math.floor(size * 0.5) : Math.floor(size * 0.4);
        
        const svg = `<?xml version="1.0" encoding="UTF-8"?>
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
                <rect width="${size}" height="${size}" fill="${bgColor}" />
                <text 
                    x="50%" 
                    y="50%" 
                    dominant-baseline="middle" 
                    text-anchor="middle" 
                    font-family="Arial, Helvetica, sans-serif" 
                    font-size="${fontSize}px" 
                    font-weight="bold" 
                    fill="white"
                >
                    ${initials}
                </text>
            </svg>`;
        
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.send(svg);
        
    } catch (error) {
        console.error('Error generating default avatar:', error);
        const fallbackSvg = `<?xml version="1.0" encoding="UTF-8"?>
            <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
                <rect width="120" height="120" fill="#667eea"/>
                <text x="60" y="60" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="48" font-weight="bold">U</text>
            </svg>`;
        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(fallbackSvg);
    }
});

// ============================================
// AUTH ROUTES
// ============================================

// Register with email verification
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields required' });
        }
        
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationCode = String(Math.floor(100000 + Math.random() * 900000));
        const verificationExpires = new Date(Date.now() + 15 * 60 * 1000);

        await pool.query(
            `INSERT INTO users (name, email, password, is_verified, verification_code, verification_code_expires) 
             VALUES (?, ?, ?, FALSE, ?, ?)`,
            [name, email, hashedPassword, verificationCode, verificationExpires]
        );

        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #667eea;">SmartBill</h1>
                </div>
                <h2 style="color: #374151;">Welcome to SmartBill, ${name}!</h2>
                <p style="color: #4b5563; line-height: 1.6;">Please verify your email address to start splitting bills with friends.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <div style="font-size: 2rem; letter-spacing: 0.5rem; font-weight: bold; color: #667eea; background: #f3f4f6; padding: 15px; border-radius: 8px;">
                        ${verificationCode}
                    </div>
                </div>
                <p style="color: #4b5563; line-height: 1.6;">Enter this code on the verification page. It will expire in 15 minutes.</p>
                <p style="color: #4b5563; line-height: 1.6;">If you didn't create an account, you can safely ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                <p style="color: #9ca3af; font-size: 0.875rem; text-align: center;">SmartBill - Split bills easily with friends</p>
            </div>
        `;

        await sendEmail(email, 'Verify Your SmartBill Account', emailHtml);

        res.status(201).json({
            message: 'Registration successful! Please check your email for verification code.',
            email
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login with verification check
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = users[0];

        if (!user.is_verified) {
            return res.status(403).json({
                error: 'Please verify your email before logging in',
                needsVerification: true,
                email: user.email
            });
        }

        const valid = await bcrypt.compare(password, user.password);
        
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name },
            process.env.JWT_SECRET || 'dev-secret-key',
            { expiresIn: '7d' }
        );
        
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user count
app.get('/api/users/count', authenticateToken, async (req, res) => {
    try {
        const [result] = await pool.query('SELECT COUNT(*) as count FROM users');
        res.json({ count: result[0].count });
    } catch (error) {
        console.error('Error fetching user count:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Forgot password - send reset email
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        
        const [users] = await pool.query('SELECT id, name FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.json({ message: 'If your email is registered, you will receive reset instructions.' });
        }
        
        const user = users[0];
        const resetToken = jwt.sign(
            { id: user.id, email, purpose: 'password_reset' },
            process.env.JWT_SECRET || 'dev-secret-key',
            { expiresIn: '1h' }
        );
        
        await pool.query(
            'UPDATE users SET reset_token = ?, reset_token_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id = ?',
            [resetToken, user.id]
        );
        
        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/reset-password.html?token=${resetToken}`;

        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #667eea;">SmartBill</h1>
                </div>
                <h2 style="color: #374151;">Password Reset Request</h2>
                <p style="color: #4b5563; line-height: 1.6;">Hello ${user.name},</p>
                <p style="color: #4b5563; line-height: 1.6;">We received a request to reset your password. Click the button below to set a new password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                        Reset Password
                    </a>
                </div>
                <p style="color: #4b5563; line-height: 1.6;">Or copy this link to your browser:</p>
                <p style="background: #f3f4f6; padding: 10px; border-radius: 5px; word-break: break-all; color: #667eea;">${resetLink}</p>
                <p style="color: #4b5563; line-height: 1.6;">This link will expire in 1 hour.</p>
                <p style="color: #4b5563; line-height: 1.6;">If you didn't request this, you can safely ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                <p style="color: #9ca3af; font-size: 0.875rem; text-align: center;">SmartBill - Split bills easily with friends</p>
            </div>
        `;

        await sendEmail(email, 'Reset Your SmartBill Password', emailHtml);

        res.json({ message: 'If your email is registered, you will receive reset instructions.' });
        
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Reset password
app.post('/api/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password required' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key');
        } catch (err) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }
        
        if (decoded.purpose !== 'password_reset') {
            return res.status(400).json({ error: 'Invalid token' });
        }
        
        const [users] = await pool.query(
            'SELECT id FROM users WHERE id = ? AND reset_token = ? AND reset_token_expires > NOW()',
            [decoded.id, token]
        );
        
        if (users.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }
        
        const user = users[0];
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await pool.query(
            'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
            [hashedPassword, decoded.id]
        );
        
        // Send confirmation email
        const confirmHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #667eea;">SmartBill</h1>
                </div>
                <h2 style="color: #374151;">Password Changed Successfully</h2>
                <p style="color: #4b5563; line-height: 1.6;">Hello ${user.name},</p>
                <p style="color: #4b5563; line-height: 1.6;">Your password has been changed successfully.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/login.html" style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                        Login to SmartBill
                    </a>
                </div>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                <p style="color: #9ca3af; font-size: 0.875rem; text-align: center;">SmartBill - Split bills easily with friends</p>
            </div>
        `;
        
        await sendEmail(user.email, 'Your Password Has Been Changed', confirmHtml);
        
        res.json({ message: 'Password reset successful' });
        
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Resend verification code
app.post('/api/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        
        const [users] = await pool.query('SELECT id, name FROM users WHERE email = ? AND is_verified = FALSE', [email]);
        
        if (users.length === 0) {
            return res.json({ message: 'If your email is registered and not verified, you will receive a new code.' });
        }
        
        const user = users[0];
        const verificationCode = String(Math.floor(100000 + Math.random() * 900000));
        
        await pool.query(
            `UPDATE users SET verification_code = ?, verification_code_expires = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id = ?`,
            [verificationCode, user.id]
        );

        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #667eea;">SmartBill</h1>
                </div>
                <h2 style="color: #374151;">Your New Verification Code</h2>
                <p style="color: #4b5563; line-height: 1.6;">Hello ${user.name},</p>
                <p style="color: #4b5563; line-height: 1.6;">Use the code below to verify your SmartBill account. It will expire in 15 minutes.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <div style="font-size: 2rem; letter-spacing: 0.5rem; font-weight: bold; color: #667eea; background: #f3f4f6; padding: 15px; border-radius: 8px;">
                        ${verificationCode}
                    </div>
                </div>
                <p style="color: #4b5563; line-height: 1.6;">If you did not request this email, you can safely ignore it.</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                <p style="color: #9ca3af; font-size: 0.875rem; text-align: center;">SmartBill - Split bills easily with friends</p>
            </div>
        `;

        await sendEmail(email, 'Your SmartBill Verification Code', emailHtml);

        res.json({ message: 'Verification code sent!' });
        
    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Verify email with code
app.post('/api/verify-email-code', async (req, res) => {
    try {
        const { email, code } = req.body;
        
        if (!email || !code) {
            return res.status(400).json({ error: 'Email and code required' });
        }
        
        const [users] = await pool.query(
            `SELECT id, name, email FROM users 
             WHERE email = ? AND verification_code = ? 
             AND verification_code_expires > NOW() 
             AND is_verified = FALSE`,
            [email, String(code).trim()]
        );
        
        if (users.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired verification code' });
        }
        
        const user = users[0];
        
        await pool.query(
            `UPDATE users SET is_verified = TRUE, verification_code = NULL, verification_code_expires = NULL WHERE id = ?`,
            [user.id]
        );
        
        const welcomeHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #667eea;">SmartBill</h1>
                </div>
                <h2 style="color: #374151;">Email Verified Successfully!</h2>
                <p style="color: #4b5563; line-height: 1.6;">Your email has been verified. You can now log in to your account.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/login.html" style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                        Login to SmartBill
                    </a>
                </div>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                <p style="color: #9ca3af; font-size: 0.875rem; text-align: center;">SmartBill - Split bills easily with friends</p>
            </div>
        `;

        await sendEmail(email, 'Welcome to SmartBill!', welcomeHtml);

        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name },
            process.env.JWT_SECRET || 'dev-secret-key',
            { expiresIn: '7d' }
        );
        
        res.json({
            message: 'Email verified successfully!',
            token,
            user: { id: user.id, name: user.name, email: user.email }
        });
        
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// PROFILE ROUTES
// ============================================

// Get user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, name, email, avatar, created_at FROM users WHERE id = ?',
            [req.user.id]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(users[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update user profile
app.put('/api/profile', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }
        
        await pool.query('UPDATE users SET name = ? WHERE id = ?', [name, req.user.id]);
        
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Change password
app.post('/api/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'All fields required' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        
        const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
        
        const valid = await bcrypt.compare(currentPassword, users[0].password);
        
        if (!valid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);
        
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete account
app.delete('/api/profile', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = ?', [req.user.id]);
        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Upload avatar
app.post('/api/profile/avatar', authenticateToken, uploadAvatar.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No avatar file provided' });
        }

        const avatarPath = `/uploads/avatars/${req.file.filename}`;
        
        const [users] = await pool.query('SELECT avatar FROM users WHERE id = ?', [req.user.id]);
        const oldAvatar = users[0]?.avatar;
        
        await pool.query('UPDATE users SET avatar = ? WHERE id = ?', [avatarPath, req.user.id]);
        
        if (oldAvatar && oldAvatar !== avatarPath) {
            const oldPath = path.join(__dirname, '../frontend', oldAvatar);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        res.json({ message: 'Avatar uploaded successfully', avatar: avatarPath });
    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ error: 'Failed to upload avatar' });
    }
});

// Delete avatar
app.delete('/api/profile/avatar', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.query('SELECT avatar FROM users WHERE id = ?', [req.user.id]);
        const currentAvatar = users[0]?.avatar;

        await pool.query('UPDATE users SET avatar = NULL WHERE id = ?', [req.user.id]);

        if (currentAvatar) {
            const filePath = path.join(__dirname, '../frontend', currentAvatar);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        res.json({ message: 'Avatar removed successfully' });
    } catch (error) {
        console.error('Avatar deletion error:', error);
        res.status(500).json({ error: 'Failed to remove avatar' });
    }
});

// ============================================
// GROUPS ROUTES
// ============================================

// Get user's groups
app.get('/api/groups', authenticateToken, async (req, res) => {
    try {
        const [groups] = await pool.query(`
            SELECT
                g.*,
                (
                    COALESCE((SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id), 0) +
                    COALESCE((SELECT COUNT(*) FROM group_name_members gnm WHERE gnm.group_id = g.id), 0)
                ) AS member_count
            FROM \`groups\` g
            WHERE g.id IN (
                SELECT group_id FROM group_members WHERE user_id = ?
            )
            ORDER BY g.created_at DESC
        `, [req.user.id]);
        
        res.json(groups);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch groups' });
    }
});

// Get single group
app.get('/api/groups/:id', authenticateToken, async (req, res) => {
    try {
        const group = await getGroupForUser(req.params.id, req.user.id);
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        
        const [memberCount] = await pool.query(`
            SELECT (
                COALESCE((SELECT COUNT(*) FROM group_members WHERE group_id = ?), 0) +
                COALESCE((SELECT COUNT(*) FROM group_name_members WHERE group_id = ?), 0)
            ) AS count
        `, [req.params.id, req.params.id]);
        
        res.json({
            group: group,
            member_count: memberCount[0].count,
            user_role: group.role
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch group' });
    }
});

// Get all members in a group
app.get('/api/groups/:groupId/all-members', authenticateToken, async (req, res) => {
    try {
        const groupId = req.params.groupId;

        const group = await getGroupForUser(groupId, req.user.id);
        if (!group) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }
        
        // Get registered users from group_members
        const [registeredMembers] = await pool.query(`
            SELECT 
                u.id, 
                u.name, 
                u.email, 
                'registered' as type, 
                gm.role,
                gm.joined_at
            FROM group_members gm
            JOIN users u ON gm.user_id = u.id
            WHERE gm.group_id = ?
            ORDER BY gm.role = 'admin' DESC, u.name ASC
        `, [groupId]);
        
        // Get name-only members
        const [nameOnlyMembers] = await pool.query(`
            SELECT 
                gnm.id, 
                gnm.name, 
                NULL as email, 
                'name-only' as type, 
                'member' as role,
                gnm.created_at as joined_at
            FROM group_name_members gnm
            WHERE gnm.group_id = ?
            ORDER BY gnm.name ASC
        `, [groupId]);
        
        const allMembers = [...registeredMembers, ...nameOnlyMembers];
        
        console.log(`Group ${groupId} members: ${allMembers.length} total (${registeredMembers.length} registered, ${nameOnlyMembers.length} name-only)`);
        
        res.json(allMembers);
    } catch (error) {
        console.error('Error fetching all members:', error);
        res.status(500).json({ error: 'Failed to fetch members' });
    }
});

// Create group
app.post('/api/groups', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        const { name, description } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Group name required' });
        }
        
        const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        
        const [groupResult] = await connection.query(
            'INSERT INTO `groups` (name, description, created_by, invite_code) VALUES (?, ?, ?, ?)',
            [name, description || '', req.user.id, inviteCode]
        );
        
        const groupId = groupResult.insertId;
        
        await connection.query(
            'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
            [groupId, req.user.id, 'admin']
        );
        
        await connection.commit();
        
        res.status(201).json({
            message: 'Group created',
            group_id: groupId,
            invite_code: inviteCode
        });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ error: 'Failed to create group' });
    } finally {
        connection.release();
    }
});

// Join group with invite code
app.post('/api/groups/join', authenticateToken, async (req, res) => {
    try {
        const inviteCode = String(req.body.invite_code || req.body.inviteCode || '').trim().toUpperCase();
        if (!inviteCode) {
            return res.status(400).json({ error: 'Invite code required' });
        }

        const [groups] = await pool.query('SELECT id, name FROM `groups` WHERE invite_code = ?', [inviteCode]);

        if (groups.length === 0) {
            return res.status(404).json({ error: 'Invalid invite code' });
        }

        const group = groups[0];

        await pool.query(
            'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = role',
            [group.id, req.user.id, 'member']
        );

        res.json({ message: `Joined ${group.name}`, group });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to join group' });
    }
});

// Add registered member to group by email
app.post('/api/groups/:groupId/members', authenticateToken, async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const email = String(req.body.email || '').trim().toLowerCase();

        const group = await getGroupForUser(groupId, req.user.id);
        if (!group || group.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can add members' });
        }

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const [users] = await pool.query(
            'SELECT id, name, email FROM users WHERE LOWER(email) = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'No registered user found with that email' });
        }

        const member = users[0];

        const [existingMembers] = await pool.query(
            'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
            [groupId, member.id]
        );

        if (existingMembers.length > 0) {
            return res.status(400).json({ error: 'That user is already a member of this group' });
        }

        await pool.query(
            'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
            [groupId, member.id, 'member']
        );

        if (member.id !== req.user.id) {
            await createNotification(
                member.id,
                'group_invite',
                'Added To Group',
                `${req.user.name} added you to "${group.name}"`,
                parseInt(groupId, 10)
            );
        }

        res.status(201).json({
            message: 'Registered member added',
            member: {
                id: member.id,
                name: member.name,
                email: member.email,
                type: 'registered',
                role: 'member'
            }
        });
    } catch (error) {
        console.error('Error adding registered member:', error);
        res.status(500).json({ error: 'Failed to add member' });
    }
});

// Remove registered member from group
app.delete('/api/groups/:groupId/members/:memberId', authenticateToken, async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const memberId = parseInt(req.params.memberId, 10);

        const group = await getGroupForUser(groupId, req.user.id);
        if (!group || group.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can remove members' });
        }

        if (memberId === req.user.id) {
            return res.status(400).json({ error: 'Admins cannot remove themselves from the group' });
        }

        const [result] = await pool.query(
            'DELETE FROM group_members WHERE group_id = ? AND user_id = ? AND role != ?',
            [groupId, memberId, 'admin']
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Member not found or cannot be removed' });
        }

        res.json({ message: 'Registered member removed successfully' });
    } catch (error) {
        console.error('Error removing registered member:', error);
        res.status(500).json({ error: 'Failed to remove member' });
    }
});

// ============================================
// NAME-ONLY MEMBERS ROUTES
// ============================================

// Add name-only member to group
app.post('/api/groups/:groupId/name-members', authenticateToken, async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const name = String(req.body.name || '').trim();
        
        const group = await getGroupForUser(groupId, req.user.id);
        if (!group || group.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can add members' });
        }

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }
        
        const [result] = await pool.query(
            'INSERT INTO group_name_members (group_id, name, created_by) VALUES (?, ?, ?)',
            [groupId, name, req.user.id]
        );
        
        res.status(201).json({
            message: 'Name-only member added',
            member: { id: result.insertId, name, type: 'name-only' }
        });
    } catch (error) {
        console.error('Error adding name-only member:', error);
        res.status(500).json({ error: 'Failed to add member' });
    }
});

// Get name-only members for a group
app.get('/api/groups/:groupId/name-members', authenticateToken, async (req, res) => {
    try {
        const groupId = req.params.groupId;
        
        const [membership] = await pool.query(
            'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
            [groupId, req.user.id]
        );
        
        if (membership.length === 0) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }
        
        const [nameMembers] = await pool.query(`
            SELECT id, name, created_at
            FROM group_name_members
            WHERE group_id = ?
            ORDER BY created_at DESC
        `, [groupId]);
        
        res.json(nameMembers);
    } catch (error) {
        console.error('Error fetching name-only members:', error);
        res.status(500).json({ error: 'Failed to fetch name-only members' });
    }
});

// Delete name-only member
app.delete('/api/groups/:groupId/name-members/:memberId', authenticateToken, async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const memberId = req.params.memberId;
        
        const [adminCheck] = await pool.query(
            'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
            [groupId, req.user.id]
        );
        
        if (adminCheck.length === 0 || adminCheck[0].role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can remove members' });
        }
        
        await pool.query(
            'DELETE FROM group_name_members WHERE id = ? AND group_id = ?',
            [memberId, groupId]
        );
        
        res.json({ message: 'Name-only member removed successfully' });
    } catch (error) {
        console.error('Error removing name-only member:', error);
        res.status(500).json({ error: 'Failed to remove member' });
    }
});

// ============================================
// BILLS ROUTES
// ============================================

// Get user's bills
app.get('/api/bills', authenticateToken, async (req, res) => {
    try {
        const groupId = req.query.group_id ? parseInt(req.query.group_id, 10) : null;
        let query = `
            SELECT b.*, g.name as group_name, u.name as created_by_name
            FROM bills b
            JOIN \`groups\` g ON b.group_id = g.id
            JOIN users u ON b.created_by = u.id
            WHERE b.group_id IN (
                SELECT group_id FROM group_members WHERE user_id = ?
            )
        `;
        const params = [req.user.id];
        
        if (groupId) {
            query += ` AND b.group_id = ?`;
            params.push(groupId);
        }
        
        query += ` ORDER BY b.created_at DESC`;
        
        const [bills] = await pool.query(query, params);
        
        res.json(bills);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch bills' });
    }
});

// Get single bill with both split types
app.get('/api/bills/:id', authenticateToken, async (req, res) => {
    try {
        const billId = req.params.id;
        
        const [bills] = await pool.query(`
            SELECT b.*, g.name as group_name, u.name as created_by_name
            FROM bills b
            JOIN \`groups\` g ON b.group_id = g.id
            JOIN users u ON b.created_by = u.id
            WHERE b.id = ?
        `, [billId]);
        
        if (bills.length === 0) {
            return res.status(404).json({ error: 'Bill not found' });
        }
        
        const [items] = await pool.query('SELECT * FROM bill_items WHERE bill_id = ?', [billId]);
        
        // Get registered member splits
        const [registeredSplits] = await pool.query(`
            SELECT 
                bs.*, 
                u.name, 
                u.email, 
                'registered' as member_type
            FROM bill_splits bs
            JOIN users u ON bs.user_id = u.id
            WHERE bs.bill_id = ?
        `, [billId]);
        
        // Get name-only member splits
        const [nameSplits] = await pool.query(`
            SELECT 
                bns.*, 
                gnm.name, 
                NULL as email, 
                'name-only' as member_type
            FROM bill_name_splits bns
            JOIN group_name_members gnm ON bns.name_member_id = gnm.id
            WHERE bns.bill_id = ?
        `, [billId]);
        
        const allSplits = [...registeredSplits, ...nameSplits];
        
        res.json({
            bill: bills[0],
            items,
            splits: allSplits
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get payment status for a bill (includes name-only members)
app.get('/api/bills/:billId/payment-status', authenticateToken, async (req, res) => {
    try {
        const billId = req.params.billId;
        
        // Get registered member splits with payment status
        const [registeredSplits] = await pool.query(`
            SELECT 
                bs.user_id as member_id,
                'registered' as member_type,
                u.name,
                u.email,
                bs.amount,
                bs.paid,
                bs.paid_at
            FROM bill_splits bs
            JOIN users u ON bs.user_id = u.id
            WHERE bs.bill_id = ?
        `, [billId]);
        
        // Get name-only member splits with payment status
        const [nameSplits] = await pool.query(`
            SELECT 
                bns.name_member_id as member_id,
                'name-only' as member_type,
                gnm.name,
                NULL as email,
                bns.amount,
                (np.id IS NOT NULL) as paid,
                np.paid_at
            FROM bill_name_splits bns
            JOIN group_name_members gnm ON bns.name_member_id = gnm.id
            LEFT JOIN name_payments np ON np.bill_id = bns.bill_id AND np.name_member_id = bns.name_member_id
            WHERE bns.bill_id = ?
        `, [billId]);
        
        const allSplits = [...registeredSplits, ...nameSplits];
        
        res.json(allSplits);
    } catch (error) {
        console.error('Error fetching payment status:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create bill
app.post('/api/bills', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        const { group_id, title, description, items, tax, tip, splits } = req.body;
        
        if (!group_id || !title || !items || items.length === 0) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const group = await getGroupForUser(group_id, req.user.id);
        if (!group) {
            return res.status(403).json({ error: 'You are not allowed to create bills in this group' });
        }
        
        let subtotal = 0;
        items.forEach(item => {
            subtotal += parseFloat(item.amount) * (item.quantity || 1);
        });
        const taxAmount = parseFloat(tax) || 0;
        const tipAmount = parseFloat(tip) || 0;
        const total = subtotal + taxAmount + tipAmount;
        
        const [billResult] = await connection.query(
            'INSERT INTO bills (group_id, title, description, total, created_by) VALUES (?, ?, ?, ?, ?)',
            [group_id, title, description || '', total, req.user.id]
        );
        
        const billId = billResult.insertId;
        
        for (const item of items) {
            await connection.query(
                'INSERT INTO bill_items (bill_id, name, amount, quantity) VALUES (?, ?, ?, ?)',
                [billId, item.name, item.amount, item.quantity || 1]
            );
        }

        // Get all members for the group
        const [registeredMembers] = await connection.query(
            'SELECT user_id, \'registered\' as type FROM group_members WHERE group_id = ?',
            [group_id]
        );
        const [nameOnlyMembers] = await connection.query(
            'SELECT id, \'name-only\' as type FROM group_name_members WHERE group_id = ?',
            [group_id]
        );
        
        const allMembers = [...registeredMembers, ...nameOnlyMembers];
        
        // Check if custom splits were provided
        if (splits && Array.isArray(splits) && splits.length > 0) {
            for (const split of splits) {
                const amount = parseFloat(split.amount);
                if (isNaN(amount) || amount < 0) continue;
                
                if (split.member_type === 'registered') {
                    await connection.query(
                        'INSERT INTO bill_splits (bill_id, user_id, amount) VALUES (?, ?, ?)',
                        [billId, split.member_id, amount]
                    );
                } else if (split.member_type === 'name-only') {
                    await connection.query(
                        'INSERT INTO bill_name_splits (bill_id, name_member_id, amount) VALUES (?, ?, ?)',
                        [billId, split.member_id, amount]
                    );
                }
            }
        } else if (allMembers.length > 0) {
            // Equal split for all members
            const shareAmount = total / allMembers.length;
            for (const member of allMembers) {
                if (member.type === 'registered') {
                    await connection.query(
                        'INSERT INTO bill_splits (bill_id, user_id, amount) VALUES (?, ?, ?)',
                        [billId, member.user_id, shareAmount]
                    );
                } else {
                    await connection.query(
                        'INSERT INTO bill_name_splits (bill_id, name_member_id, amount) VALUES (?, ?, ?)',
                        [billId, member.id, shareAmount]
                    );
                }
            }
        }
        
        await connection.commit();
        
        res.status(201).json({ message: 'Bill created', bill_id: billId });
    } catch (error) {
        await connection.rollback();
        console.error('Error creating bill:', error);
        res.status(500).json({ error: 'Failed to create bill: ' + error.message });
    } finally {
        connection.release();
    }
});

// Update bill
app.put('/api/bills/:id', authenticateToken, async (req, res) => {
    try {
        const billId = req.params.id;
        const { title, total, status } = req.body;
        
        await pool.query(
            'UPDATE bills SET title = ?, total = ?, status = ? WHERE id = ?',
            [title, total, status, billId]
        );
        
        res.json({ message: 'Bill updated successfully' });
    } catch (error) {
        console.error('Error updating bill:', error);
        res.status(500).json({ error: 'Failed to update bill' });
    }
});

// Delete bill
app.delete('/api/bills/:id', authenticateToken, async (req, res) => {
    try {
        const billId = req.params.id;
        
        await pool.query('DELETE FROM bills WHERE id = ?', [billId]);
        
        res.json({ message: 'Bill deleted successfully' });
    } catch (error) {
        console.error('Error deleting bill:', error);
        res.status(500).json({ error: 'Failed to delete bill' });
    }
});

// ============================================
// PAYMENT ROUTES
// ============================================

// Record payment for registered user
app.post('/api/payments', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        const { bill_id, amount, method, notes } = req.body;
        
        if (!bill_id || !amount || amount <= 0) {
            return res.status(400).json({ error: 'Valid amount required' });
        }
        
        const [bills] = await connection.query('SELECT * FROM bills WHERE id = ?', [bill_id]);
        
        if (bills.length === 0) {
            return res.status(404).json({ error: 'Bill not found' });
        }
        
        const bill = bills[0];
        
        const [splits] = await connection.query(
            'SELECT * FROM bill_splits WHERE bill_id = ? AND user_id = ?',
            [bill_id, req.user.id]
        );
        
        if (splits.length === 0) {
            return res.status(403).json({ error: 'You are not part of this bill' });
        }
        
        const split = splits[0];
        
        if (split.paid) {
            return res.status(400).json({ error: 'You have already paid for this bill' });
        }
        
        const shareAmount = parseFloat(split.amount);
        const paymentAmount = parseFloat(amount);
        
        if (Math.abs(paymentAmount - shareAmount) > 0.01) {
            return res.status(400).json({ 
                error: `Payment amount should be $${shareAmount.toFixed(2)}`,
                expectedAmount: shareAmount
            });
        }
        
        await connection.query(
            `INSERT INTO payments (bill_id, user_id, amount, method, notes) VALUES (?, ?, ?, ?, ?)`,
            [bill_id, req.user.id, amount, method || 'cash', notes || null]
        );
        
        await connection.query(
            `UPDATE bill_splits SET paid = TRUE, paid_at = NOW() WHERE bill_id = ? AND user_id = ?`,
            [bill_id, req.user.id]
        );
        
        const [pending] = await connection.query(
            'SELECT COUNT(*) as count FROM bill_splits WHERE bill_id = ? AND paid = FALSE',
            [bill_id]
        );
        
        let newStatus = 'partial';
        if (parseInt(pending[0].count) === 0) {
            newStatus = 'paid';
            await connection.query('UPDATE bills SET status = ? WHERE id = ?', ['paid', bill_id]);
        } else {
            await connection.query('UPDATE bills SET status = ? WHERE id = ?', ['partial', bill_id]);
        }
        
        await connection.commit();
        
        res.json({ message: 'Payment recorded successfully', billStatus: newStatus });
        
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        connection.release();
    }
});

// Record payment for name-only member
app.post('/api/name-payments', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        const { bill_id, name_member_id, amount, method, notes } = req.body;
        
        if (!bill_id || !name_member_id || !amount || amount <= 0) {
            return res.status(400).json({ error: 'Valid amount and member required' });
        }
        
        const [bills] = await connection.query('SELECT * FROM bills WHERE id = ?', [bill_id]);
        
        if (bills.length === 0) {
            return res.status(404).json({ error: 'Bill not found' });
        }
        
        const bill = bills[0];
        
        const [adminCheck] = await connection.query(
            'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
            [bill.group_id, req.user.id]
        );
        
        const isAdmin = adminCheck.length > 0 && adminCheck[0].role === 'admin';
        const isCreator = bill.created_by === req.user.id;
        
        if (!isAdmin && !isCreator) {
            return res.status(403).json({ error: 'Only admins or bill creators can record payments for name-only members' });
        }
        
        const [splits] = await connection.query(
            'SELECT * FROM bill_name_splits WHERE bill_id = ? AND name_member_id = ?',
            [bill_id, name_member_id]
        );
        
        if (splits.length === 0) {
            return res.status(404).json({ error: 'Name member not part of this bill' });
        }
        
        const split = splits[0];
        
        const shareAmount = parseFloat(split.amount);
        const paymentAmount = parseFloat(amount);
        
        if (Math.abs(paymentAmount - shareAmount) > 0.01) {
            return res.status(400).json({ 
                error: `Payment amount should be $${shareAmount.toFixed(2)}`,
                expectedAmount: shareAmount
            });
        }
        
        await connection.query(
            `INSERT INTO name_payments (bill_id, name_member_id, amount, method, notes) VALUES (?, ?, ?, ?, ?)`,
            [bill_id, name_member_id, amount, method || 'cash', notes || null]
        );
        
        await connection.commit();
        
        res.json({ message: 'Payment recorded successfully for name-only member' });
        
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        connection.release();
    }
});

// Get payment summary
app.get('/api/payments/summary', authenticateToken, async (req, res) => {
    try {
        const [paymentsMade] = await pool.query(
            'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE user_id = ?',
            [req.user.id]
        );
        
        const [paymentsReceived] = await pool.query(`
            SELECT COALESCE(SUM(p.amount), 0) as total
            FROM payments p
            JOIN bills b ON p.bill_id = b.id
            WHERE b.created_by = ? AND p.user_id != ?
        `, [req.user.id, req.user.id]);
        
        res.json({
            paymentsMade: parseFloat(paymentsMade[0].total),
            paymentsReceived: parseFloat(paymentsReceived[0].total)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Send payment reminders
app.post('/api/bills/:id/reminders', authenticateToken, async (req, res) => {
    try {
        const billId = req.params.id;
        const targetUserId = req.body?.user_id ? parseInt(req.body.user_id, 10) : null;

        const [bills] = await pool.query(
            'SELECT id, title, group_id, created_by FROM bills WHERE id = ?',
            [billId]
        );

        if (bills.length === 0) {
            return res.status(404).json({ error: 'Bill not found' });
        }

        const bill = bills[0];

        const [adminCheck] = await pool.query(
            'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
            [bill.group_id, req.user.id]
        );

        const isAdmin = adminCheck.length > 0 && adminCheck[0].role === 'admin';
        const isCreator = bill.created_by === req.user.id;

        if (!isAdmin && !isCreator) {
            return res.status(403).json({ error: 'Only bill creators or group admins can send reminders' });
        }

        let query = `
            SELECT bs.user_id, bs.amount, u.name, u.email
            FROM bill_splits bs
            JOIN users u ON bs.user_id = u.id
            WHERE bs.bill_id = ? AND bs.paid = FALSE
        `;
        const params = [billId];

        if (targetUserId) {
            query += ' AND bs.user_id = ?';
            params.push(targetUserId);
        } else {
            query += ' AND bs.user_id != ?';
            params.push(req.user.id);
        }

        const [unpaidMembers] = await pool.query(query, params);

        if (unpaidMembers.length === 0) {
            return res.status(400).json({
                error: targetUserId ? 'That member has already paid or is not part of this bill' : 'No unpaid members to remind'
            });
        }

        for (const member of unpaidMembers) {
            await createNotification(
                member.user_id,
                'payment_reminder',
                'Payment Reminder',
                `${req.user.name} reminded you to pay $${Number(member.amount).toFixed(2)} for "${bill.title}"`,
                billId
            );

            if (member.email) {
                const emailHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #667eea;">SmartBill</h1>
                        </div>
                        <h2 style="color: #374151;">Payment Reminder</h2>
                        <p style="color: #4b5563; line-height: 1.6;">Hello ${member.name},</p>
                        <p style="color: #4b5563; line-height: 1.6;">${req.user.name} reminded you about your pending payment.</p>
                        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>Bill:</strong> ${bill.title}</p>
                            <p style="margin: 5px 0;"><strong>Amount Due:</strong> $${Number(member.amount).toFixed(2)}</p>
                            <p style="margin: 5px 0;"><strong>From:</strong> ${req.user.name}</p>
                        </div>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/bills.html?billId=${billId}" 
                               style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                                View Bill
                            </a>
                        </div>
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                        <p style="color: #9ca3af; font-size: 0.875rem; text-align: center;">SmartBill - Split bills easily with friends</p>
                    </div>
                `;

                await sendEmail(member.email, `Payment Reminder: ${bill.title}`, emailHtml);
                console.log(`Email reminder sent to ${member.email}`);
            }
        }

        const [nameOnlyPending] = await pool.query(`
            SELECT COUNT(*) AS count
            FROM bill_name_splits bns
            LEFT JOIN name_payments np
                ON np.bill_id = bns.bill_id
               AND np.name_member_id = bns.name_member_id
            WHERE bns.bill_id = ?
              AND np.id IS NULL
        `, [billId]);

        const emailCount = unpaidMembers.filter(member => member.email).length;

        res.json({
            message: unpaidMembers.length === 1
                ? `Reminder sent to ${unpaidMembers[0].name}`
                : `Sent ${unpaidMembers.length} payment reminder${unpaidMembers.length === 1 ? '' : 's'}`,
            remindedCount: unpaidMembers.length,
            emailSent: emailCount,
            nameOnlyPending: nameOnlyPending[0]?.count || 0
        });
    } catch (error) {
        console.error('Error sending reminders:', error);
        res.status(500).json({ error: 'Failed to send payment reminders' });
    }
});

// ============================================
// DASHBOARD SUMMARY
// ============================================
app.get('/api/dashboard/summary', authenticateToken, async (req, res) => {
    try {
        const [groupResult] = await pool.query(
            'SELECT COUNT(*) as count FROM group_members WHERE user_id = ?',
            [req.user.id]
        );
        
        const [owedResult] = await pool.query(`
            SELECT COALESCE(SUM(bs.amount), 0) as total
            FROM bill_splits bs
            JOIN bills b ON bs.bill_id = b.id
            WHERE bs.user_id = ? AND bs.paid = FALSE
        `, [req.user.id]);
        
        const [owedToMeResult] = await pool.query(`
            SELECT COALESCE(SUM(bs.amount), 0) as total
            FROM bill_splits bs
            JOIN bills b ON bs.bill_id = b.id
            WHERE b.created_by = ? AND bs.user_id != ? AND bs.paid = FALSE
        `, [req.user.id, req.user.id]);
        
        const [pendingResult] = await pool.query(`
            SELECT COUNT(DISTINCT b.id) as count
            FROM bills b
            JOIN bill_splits bs ON b.id = bs.bill_id
            WHERE bs.user_id = ? AND bs.paid = FALSE
        `, [req.user.id]);
        
        res.json({
            groupCount: parseInt(groupResult[0].count),
            iOwe: parseFloat(owedResult[0].total),
            owedToMe: parseFloat(owedToMeResult[0].total),
            pendingBills: parseInt(pendingResult[0].count)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Spending alert
app.post('/api/spending-alert', authenticateToken, async (req, res) => {
    try {
        const monthlyBudget = Number(req.body.monthly_budget) || 0;
        
        const [result] = await pool.query(`
            SELECT COALESCE(SUM(bs.amount), 0) as total
            FROM bill_splits bs
            JOIN bills b ON b.id = bs.bill_id
            WHERE bs.user_id = ?
              AND MONTH(b.created_at) = MONTH(CURRENT_DATE())
              AND YEAR(b.created_at) = YEAR(CURRENT_DATE())
        `, [req.user.id]);
        
        const currentSpending = parseFloat(result[0].total) || 0;
        const percentage = monthlyBudget > 0 ? (currentSpending / monthlyBudget) * 100 : 0;
        let alert = null;
        
        if (monthlyBudget > 0 && percentage >= 100) {
            alert = `⚠️ You've exceeded your monthly budget of $${monthlyBudget.toFixed(2)}! Current spending: $${currentSpending.toFixed(2)}`;
        } else if (monthlyBudget > 0 && percentage >= 80) {
            alert = `⚠️ You've used ${percentage.toFixed(0)}% of your monthly budget. Current: $${currentSpending.toFixed(2)}`;
        } else if (monthlyBudget > 0 && percentage >= 50) {
            alert = `📊 You've used ${percentage.toFixed(0)}% of your monthly budget.`;
        }
        
        res.json({ monthlyBudget, currentSpending, percentage, alert });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to calculate spending alert' });
    }
});

// ============================================
// NOTIFICATIONS
// ============================================
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const [notifications] = await pool.query(`
            SELECT * FROM notifications 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 20
        `, [req.user.id]);
        
        const [unreadResult] = await pool.query(`
            SELECT COUNT(*) as count FROM notifications 
            WHERE user_id = ? AND is_read = FALSE
        `, [req.user.id]);
        
        res.json({
            notifications,
            unreadCount: parseInt(unreadResult[0].count)
        });
    } catch (error) {
        console.error(error);
        res.json({ notifications: [], unreadCount: 0 });
    }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
    try {
        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
            [req.user.id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// GROUP GOAL (placeholder)
// ============================================
app.get('/api/groups/:id/goal', authenticateToken, async (req, res) => {
    res.json({ goal: null, contributors: [] });
});

app.post('/api/groups/:id/goal', authenticateToken, async (req, res) => {
    res.json({ message: 'Goal saved' });
});

app.post('/api/groups/:id/goal/contributions', authenticateToken, async (req, res) => {
    res.json({ message: 'Contribution added' });
});

// ============================================
// SERVE FRONTEND (fallback for any other route)
// ============================================
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../frontend/index.html'));
    } else {
        res.status(404).json({ error: 'API endpoint not found' });
    }
});

// ============================================
// START SERVER
// ============================================
testConnection().then(() => {
    app.listen(PORT, () => {
        console.log(`✅ Server running on http://localhost:${PORT}`);
        console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
        console.log(`✅ Default avatar: http://localhost:${PORT}/api/profile/default-avatar?name=Test&size=100`);
        console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`? Database host: ${process.env.MYSQLHOST || 'gondola.proxy.rlwy.net'}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    app.listen(PORT, () => {
        console.log(`⚠️  Server running without database on port ${PORT}`);
        console.log(`??  Check your Railway MySQL environment variables`);
    });
});
