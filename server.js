require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./config/db');

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
        await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        image_url TEXT,
        category VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('✅ Database initialized');
    } catch (error) {
        console.error('❌ Database initialization error:', error.message);
    }
};

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 Kerovic server running on port ${PORT}`);
    await initDB();
});

module.exports = app;
