const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');

// Multer config - memory storage for Render (no local file persistence)
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes'), false);
        }
    }
});

// Price helpers: DB stores cents (INTEGER), API sends/receives decimals
const toCents = (price) => Math.round(parseFloat(price) * 100);
const fromCents = (row) => ({ ...row, price: row.price / 100 });

// Helper: Upload buffer to Cloudinary
const uploadToCloudinary = (buffer, folder = 'kerovic') => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder, resource_type: 'image' },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        stream.end(buffer);
    });
};

// GET all products (public)
router.get('/', async (req, res) => {
    try {
        const { category } = req.query;
        let result;

        if (category) {
            result = await db.execute({
                sql: 'SELECT * FROM products WHERE category = ? ORDER BY created_at DESC',
                args: [category]
            });
        } else {
            result = await db.execute('SELECT * FROM products ORDER BY created_at DESC');
        }

        res.json(result.rows.map(fromCents));
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// GET single product (public)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.execute({
            sql: 'SELECT * FROM products WHERE id = ?',
            args: [id]
        });

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json(fromCents(result.rows[0]));
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Error al obtener producto' });
    }
});

// GET categories (public)
router.get('/meta/categories', async (req, res) => {
    try {
        const result = await db.execute('SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category');
        res.json(result.rows.map(row => row.category));
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Error al obtener categorías' });
    }
});

// POST create product (protected)
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const { name, description, price, category } = req.body;
        let imageUrl = null;

        if (req.file) {
            const uploadResult = await uploadToCloudinary(req.file.buffer);
            imageUrl = uploadResult.secure_url;
        }

        const insertResult = await db.execute({
            sql: 'INSERT INTO products (name, description, price, image_url, category) VALUES (?, ?, ?, ?, ?)',
            args: [name, description, toCents(price), imageUrl, category]
        });

        // libSQL does not support RETURNING — fetch the newly created row
        const newId = insertResult.lastInsertRowid;
        const result = await db.execute({
            sql: 'SELECT * FROM products WHERE id = ?',
            args: [newId]
        });

        res.status(201).json(fromCents(result.rows[0]));
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Error al crear producto' });
    }
});

// PUT update product (protected)
router.put('/:id', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, category } = req.body;

        // Get current product
        const current = await db.execute({
            sql: 'SELECT * FROM products WHERE id = ?',
            args: [id]
        });
        if (current.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        let imageUrl = current.rows[0].image_url;

        // Upload new image if provided
        if (req.file) {
            const uploadResult = await uploadToCloudinary(req.file.buffer);
            imageUrl = uploadResult.secure_url;
        }

        await db.execute({
            sql: 'UPDATE products SET name = ?, description = ?, price = ?, image_url = ?, category = ? WHERE id = ?',
            args: [name, description, toCents(price), imageUrl, category, id]
        });

        // Fetch the updated row
        const result = await db.execute({
            sql: 'SELECT * FROM products WHERE id = ?',
            args: [id]
        });

        res.json(fromCents(result.rows[0]));
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Error al actualizar producto' });
    }
});

// DELETE product (protected)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch the product before deleting so we can return it
        const result = await db.execute({
            sql: 'SELECT * FROM products WHERE id = ?',
            args: [id]
        });

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const deletedProduct = result.rows[0];

        await db.execute({
            sql: 'DELETE FROM products WHERE id = ?',
            args: [id]
        });

        res.json({ message: 'Producto eliminado', product: fromCents(deletedProduct) });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
});

module.exports = router;
