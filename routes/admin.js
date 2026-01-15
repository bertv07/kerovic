const express = require('express');
const router = express.Router();

router.post('/login', (req, res) => {
    const { password } = req.body;

    if (password === process.env.ADMIN_PASSWORD) {
        res.json({ success: true, token: password });
    } else {
        res.status(401).json({ error: 'Contraseña incorrecta' });
    }
});

module.exports = router;
