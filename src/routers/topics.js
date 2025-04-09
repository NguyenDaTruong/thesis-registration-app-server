const express = require('express');
const router = express.Router();

// Route cơ bản để kiểm tra
router.get('/', (req, res) => {
    res.send('Topics route');
});

module.exports = router;