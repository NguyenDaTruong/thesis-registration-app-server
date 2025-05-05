const express = require('express');
const router = express.Router();
const dbService = require('../services/dbService');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

router.get('/', async (req, res) => {
    try {
        const result = await dbService.query(`
            SELECT dt.*, 
                   gv.HoTen AS GiangVienHoTen,
                   gv.MaNganh AS GiangVienMaNganh,
                   nh.TenNganh
            FROM DeTai dt
            LEFT JOIN GiangVien gv ON dt.MaGVHD = gv.MaGV
            LEFT JOIN NganhHoc nh ON gv.MaNganh = nh.MaNganh
        `);
        res.status(200).json(result.recordset);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// Cập nhật endpoint tìm kiếm
router.get('/search', async (req, res) => {
    const { q } = req.query;
    if (!q) {
        return res.status(400).json({ message: 'Vui lòng cung cấp từ khóa tìm kiếm' });
    }

    try {
        const searchQuery = `%${q}%`;
        const result = await dbService.query(`
            SELECT dt.MaDeTai, dt.TenDeTai, dt.GhiChu, dt.MaGVHD, 
                   dt.TrangThai, dt.image, dt.YeuCauSV, dt.TaiLieu, dt.LoaiDeTai,
                   gv.HoTen AS GiangVienHoTen,
                   gv.MaNganh AS GiangVienMaNganh,
                   nh.TenNganh
            FROM DeTai dt
            LEFT JOIN GiangVien gv ON dt.MaGVHD = gv.MaGV
            LEFT JOIN NganhHoc nh ON gv.MaNganh = nh.MaNganh
            WHERE dt.TenDeTai LIKE @param0 OR dt.GhiChu LIKE @param0
        `, [searchQuery]);

        // Giới hạn tối đa 5 kết quả
        const limitedResults = result.recordset.slice(0, 5);
        res.status(200).json(limitedResults);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await dbService.query(`
            SELECT dt.*, 
                   gv.HoTen AS GiangVienHoTen,
                   gv.MaNganh AS GiangVienMaNganh,
                   nh.TenNganh
            FROM DeTai dt
            LEFT JOIN GiangVien gv ON dt.MaGVHD = gv.MaGV
            LEFT JOIN NganhHoc nh ON gv.MaNganh = nh.MaNganh
            WHERE dt.MaDeTai = @param0
        `, [id]);
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Đề tài không tồn tại' });
        }
        res.status(200).json(result.recordset[0]);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

router.get('/nganh/:maGV', async (req, res) => {
    const { maGV } = req.params;
    try {
        const result = await dbService.query(`
            SELECT gv.MaNganh, nh.TenNganh
            FROM GiangVien gv
            LEFT JOIN NganhHoc nh ON gv.MaNganh = nh.MaNganh
            WHERE gv.MaGV = @param0
        `, [maGV]);
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Giảng viên không tồn tại' });
        }
        res.status(200).json(result.recordset);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { name, description, maGV, trangThai, image, yeuCauSV, taiLieu, loaiDeTai } = req.body;

        if (!name || !description || !maGV || !loaiDeTai) {
            return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
        }

        // Kiểm tra LoaiDeTai hợp lệ
        if (!['Chuyên đề', 'Khóa luận'].includes(loaiDeTai)) {
            return res.status(400).json({ message: 'Loại đề tài chỉ có thể là "Chuyên đề" hoặc "Khóa luận"' });
        }

        const checkGV = await dbService.query(
            'SELECT * FROM GiangVien WHERE MaGV = @param0',
            [maGV]
        );

        if (checkGV.recordset.length === 0) {
            return res.status(400).json({ message: 'Mã giảng viên không tồn tại' });
        }

        const result = await dbService.query(
            'INSERT INTO DeTai (TenDeTai, GhiChu, MaGVHD, LoaiDeTai, TrangThai, NgayTao, image, YeuCauSV, TaiLieu) VALUES (@param0, @param1, @param2, @param3, @param4, GETDATE(), @param5, @param6, @param7)',
            [name, description, maGV, loaiDeTai, trangThai || 'Chưa mở đăng ký', image || null, yeuCauSV || null, taiLieu || null]
        );

        res.status(200).json({ message: 'Thêm đề tài thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message, stack: error.stack });
    }
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { maGV, name, description, yeuCauSV, taiLieu, image, loaiDeTai } = req.body;

    if (!name || !description || !maGV || !loaiDeTai) {
        return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
    }

    // Kiểm tra LoaiDeTai hợp lệ
    if (!['Chuyên đề', 'Khóa luận'].includes(loaiDeTai)) {
        return res.status(400).json({ message: 'Loại đề tài chỉ có thể là "Chuyên đề" hoặc "Khóa luận"' });
    }

    try {
        const topicResult = await dbService.query(
            'SELECT MaGVHD FROM DeTai WHERE MaDeTai = @param0',
            [id]
        );

        if (topicResult.recordset.length === 0) {
            return res.status(404).json({ message: 'Đề tài không tồn tại' });
        }

        if (topicResult.recordset[0].MaGVHD !== maGV) {
            return res.status(403).json({ message: 'Bạn không có quyền chỉnh sửa đề tài này' });
        }

        const result = await dbService.query(
            'UPDATE DeTai SET TenDeTai = @param1, GhiChu = @param2, YeuCauSV = @param3, TaiLieu = @param4, image = @param5, LoaiDeTai = @param6 WHERE MaDeTai = @param0',
            [id, name, description, yeuCauSV, taiLieu, image, loaiDeTai]
        );

        if (result.rowsAffected[0] === 0) {
            return res.status(500).json({ message: 'Không thể cập nhật đề tài' });
        }

        res.status(200).json({ message: 'Cập nhật đề tài thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
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
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

router.put('/:id/toggle-registration', async (req, res) => {
    const { id } = req.params;
    try {
        const topicResult = await dbService.query(
            'SELECT TrangThai FROM DeTai WHERE MaDeTai = @param0',
            [id]
        );

        if (topicResult.recordset.length === 0) {
            return res.status(404).json({ message: 'Đề tài không tồn tại' });
        }

        const currentStatus = topicResult.recordset[0].TrangThai;
        const newStatus = currentStatus === 'Mở đăng ký' ? 'Chưa mở đăng ký' : 'Mở đăng ký';

        const updateResult = await dbService.query(
            'UPDATE DeTai SET TrangThai = @param0 WHERE MaDeTai = @param1',
            [newStatus, id]
        );

        if (updateResult.rowsAffected[0] === 0) {
            return res.status(500).json({ message: 'Không thể cập nhật trạng thái' });
        }

        res.status(200).json({ message: `Đã ${newStatus === 'Mở đăng ký' ? 'mở' : 'đóng'} đăng ký thành công`, newStatus });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await dbService.query(
            'DELETE FROM DeTai WHERE MaDeTai = @param0',
            [id]
        );

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Không tìm thấy đề tài để xóa' });
        }

        res.status(200).json({ message: 'Xóa đề tài thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi xóa đề tài', error: error.message });
    }
});

router.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Không có file tải lên' });
    }
    const imagePath = `/uploads/${req.file.filename}`;
    res.status(200).json({ message: 'Tải ảnh thành công', imagePath });
});

module.exports = router;