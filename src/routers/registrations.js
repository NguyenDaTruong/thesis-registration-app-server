const express = require('express');
const router = express.Router();

// Route cơ bản để kiểm tra
router.get('/', (req, res) => {
    res.send('Registrations route');
});

module.exports = router;