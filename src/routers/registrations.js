const express = require('express');
const router = express.Router();
const dbService = require('../services/dbService');

// Đăng ký đề tài
router.post('/', async (req, res) => {
    const { maSV, topicId } = req.body;

    if (!maSV || !topicId) {
        return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
    }

    try {
        // Kiểm tra xem sinh viên đã đăng ký bất kỳ đề tài nào chưa
        const checkExistingRegistration = await dbService.query(
            'SELECT * FROM DangKyDeTai WHERE MaSV = @param0',
            [maSV]
        );

        if (checkExistingRegistration.recordset.length > 0) {
            return res.status(400).json({ message: 'Bạn đã đăng ký một đề tài khác' });
        }

        // Kiểm tra xem sinh viên đã đăng ký đề tài này chưa
        const checkResult = await dbService.query(
            'SELECT * FROM DangKyDeTai WHERE MaSV = @param0 AND MaDeTai = @param1',
            [maSV, topicId]
        );

        if (checkResult.recordset.length > 0) {
            return res.status(400).json({ message: 'Bạn đã đăng ký đề tài này' });
        }

        // Lấy thông tin sinh viên
        const studentResult = await dbService.query(
            'SELECT HoLot, Ten, NgaySinh FROM SinhVien WHERE MaSV = @param0',
            [maSV]
        );

        if (studentResult.recordset.length === 0) {
            return res.status(404).json({ message: 'Sinh viên không tồn tại' });
        }

        const student = studentResult.recordset[0];
        const hoTen = `${student.HoLot} ${student.Ten}`.trim();
        const ngaySinh = student.NgaySinh;

        // Thêm bản ghi đăng ký
        await dbService.query(
            'INSERT INTO DangKyDeTai (MaSV, MaDeTai, HoTen, NgaySinh, NgayDangKy, TrangThai) VALUES (@param0, @param1, @param2, @param3, GETDATE(), @param4)',
            [maSV, topicId, hoTen, ngaySinh, 'Chờ duyệt']
        );
        res.status(200).json({ message: 'Đăng ký thành công, đang chờ duyệt' });
    } catch (error) {
        console.error('Error registering topic:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// Route cơ bản để kiểm tra
router.get('/', (req, res) => {
    res.send('Registrations route');
});

module.exports = router;