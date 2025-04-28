const express = require('express');
const router = express.Router();
const dbService = require('../services/dbService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Cấu hình multer để lưu file
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'uploads');
        console.log('Multer destination path:', uploadPath);
        try {
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
                console.log('Multer created uploads directory');
            }
            // Kiểm tra quyền ghi
            fs.accessSync(uploadPath, fs.constants.W_OK);
            console.log('Multer destination is writable');
            cb(null, uploadPath);
        } catch (err) {
            console.error('Error in multer destination:', err);
            cb(err);
        }
    },
    filename: (req, file, cb) => {
        const filename = Date.now() + path.extname(file.originalname);
        console.log('Multer filename:', filename);
        cb(null, filename);
    },
});
const upload = multer({ storage }).single('image');

router.get('/', async (req, res) => {
    try {
        const result = await dbService.query('SELECT * FROM DeTai');
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error fetching topics:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

router.post('/', (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            console.error('Multer error:', err);
            return res.status(500).json({ message: 'Lỗi khi upload file', error: err.message });
        }

        try {
            const { name, description, maGV, trangThai } = req.body;
            const image = req.file ? `/uploads/${req.file.filename}` : null;

            console.log('Received request to add topic:');
            console.log('Body:', req.body);
            console.log('File:', req.file);
            console.log('Image path:', image);

            if (!name || !description || !maGV) {
                console.log('Missing required fields');
                return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
            }

            console.log('Checking GiangVien...');
            const checkGV = await dbService.query(
                'SELECT * FROM GiangVien WHERE MaGV = @param0',
                [maGV]
            );
            console.log('GiangVien check result:', checkGV.recordset);

            if (checkGV.recordset.length === 0) {
                console.log('GiangVien not found');
                return res.status(400).json({ message: 'Mã giảng viên không tồn tại' });
            }

            console.log('Inserting into DeTai...');
            const result = await dbService.query(
                'INSERT INTO DeTai (TenDeTai, GhiChu, MaGVHD, LoaiDeTai, TrangThai, image) VALUES (@param0, @param1, @param2, @param3, @param4, @param5)',
                [name, description, maGV, 'Đề tài nghiên cứu', trangThai || 'Chưa mở đăng ký', image]
            );
            console.log('Insert result:', result);

            res.status(200).json({ message: 'Thêm đề tài thành công' });
        } catch (error) {
            console.error('Error adding topic:', error);
            res.status(500).json({ message: 'Lỗi server', error: error.message, stack: error.stack });
        }
    });
});

router.put('/status', async (req, res) => {
    const { topicId, trangThai } = req.body;

    if (!topicId || !trangThai) {
        return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin' });
    }

    try {
        const result = await dbService.query(
            'UPDATE DeTai SET TrangThai = @param0 WHERE MaDeTai = @param1',
            [trangThai, topicId]
        );

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Đề tài không tồn tại' });
        }

        res.status(200).json({ message: 'Cập nhật trạng thái thành công' });
    } catch (error) {
        console.error('Error updating topic status:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

module.exports = router;