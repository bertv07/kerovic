const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const pool = require('../config/db');
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
        let query = 'SELECT * FROM products ORDER BY created_at DESC';
        let params = [];

        if (category) {
            query = 'SELECT * FROM products WHERE category = $1 ORDER BY created_at DESC';
            params = [category];
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// GET single product (public)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Error al obtener producto' });
    }
});

// GET categories (public)
router.get('/meta/categories', async (req, res) => {
    try {
        const result = await pool.query('SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category');
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
            const result = await uploadToCloudinary(req.file.buffer);
            imageUrl = result.secure_url;
        }

        const query = `
      INSERT INTO products (name, description, price, image_url, category)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
        const values = [name, description, price, imageUrl, category];
        const result = await pool.query(query, values);

        res.status(201).json(result.rows[0]);
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
        const current = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
        if (current.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        let imageUrl = current.rows[0].image_url;

        // Upload new image if provided
        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer);
            imageUrl = result.secure_url;
        }

        const query = `
      UPDATE products 
      SET name = $1, description = $2, price = $3, image_url = $4, category = $5
      WHERE id = $6
      RETURNING *
    `;
        const values = [name, description, price, imageUrl, category, id];
        const result = await pool.query(query, values);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Error al actualizar producto' });
    }
});

// DELETE product (protected)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json({ message: 'Producto eliminado', product: result.rows[0] });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
});

module.exports = router;
