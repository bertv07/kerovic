require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const productsRouter = require('./routes/products');
const adminRouter = require('./routes/admin');

app.use('/api/products', productsRouter);
app.use('/api/admin', adminRouter);

// Config endpoint (public info only)
app.get('/api/config', (req, res) => {
    res.json({
        whatsappNumber: process.env.WHATSAPP_NUMBER || '584121410816'
    });
});

// Initialize database
const initDB = async () => {
    try {
        await db.execute('SELECT 1');
        console.log('✅ Turso database connected');
    } catch (error) {
        console.error('❌ Database connection error:', error.message);
    }
};

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 Kerovic server running on port ${PORT}`);
    await initDB();
});

module.exports = app;
