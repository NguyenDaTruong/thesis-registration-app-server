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
        // Kiểm tra xem sinh viên đã đăng ký đề tài nào chưa
        const checkExistingRegistration = await dbService.query(
            'SELECT * FROM DangKyDeTai WHERE MaSV = @param0',
            [maSV]
        );

        if (checkExistingRegistration.recordset.length > 0) {
            return res.status(400).json({ message: 'Bạn đã đăng ký một đề tài khác' });
        }

        // Kiểm tra xem đề tài đã được sinh viên khác đăng ký chưa
        const checkTopicRegistration = await dbService.query(
            'SELECT * FROM DangKyDeTai WHERE MaDeTai = @param0',
            [topicId]
        );

        if (checkTopicRegistration.recordset.length > 0) {
            return res.status(400).json({ message: 'Đề tài đã được đăng ký bởi sinh viên khác' });
        }

        const checkResult = await dbService.query(
            'SELECT * FROM DangKyDeTai WHERE MaSV = @param0 AND MaDeTai = @param1',
            [maSV, topicId]
        );

        if (checkResult.recordset.length > 0) {
            return res.status(400).json({ message: 'Bạn đã đăng ký đề tài này' });
        }

        const studentResult = await dbService.query(
            'SELECT MaNganh, HoLot, Ten FROM SinhVien WHERE MaSV = @param0',
            [maSV]
        );

        if (studentResult.recordset.length === 0) {
            return res.status(404).json({ message: 'Sinh viên không tồn tại' });
        }

        const studentMaNganh = studentResult.recordset[0].MaNganh;
        const studentName = `${studentResult.recordset[0].HoLot} ${studentResult.recordset[0].Ten}`.trim();
        if (!studentMaNganh) {
            return res.status(400).json({ message: 'Mã ngành của sinh viên không tồn tại' });
        }

        const topicResult = await dbService.query(
            'SELECT dt.TenDeTai, gv.MaNganh, dt.MaGVHD FROM DeTai dt JOIN GiangVien gv ON dt.MaGVHD = gv.MaGV WHERE dt.MaDeTai = @param0',
            [topicId]
        );

        if (topicResult.recordset.length === 0) {
            return res.status(404).json({ message: 'Đề tài không tồn tại' });
        }

        const lecturerMaNganh = topicResult.recordset[0].MaNganh;
        const lecturerMaGV = topicResult.recordset[0].MaGVHD;
        const topicName = topicResult.recordset[0].TenDeTai;
        if (!lecturerMaNganh) {
            return res.status(400).json({ message: 'Mã ngành của giảng viên không tồn tại' });
        }

        if (studentMaNganh !== lecturerMaNganh) {
            return res.status(400).json({ message: 'Mã ngành của bạn không khớp với mã ngành của giảng viên' });
        }

        const studentInfo = await dbService.query(
            'SELECT HoLot, Ten, NgaySinh FROM SinhVien WHERE MaSV = @param0',
            [maSV]
        );

        const student = studentInfo.recordset[0];
        const hoTen = `${student.HoLot} ${student.Ten}`.trim();
        const ngaySinh = student.NgaySinh;

        // Xóa thông báo cũ liên quan đến sinh viên và đề tài
        await dbService.query(
            'DELETE FROM ThongBao WHERE MaSV = @param0 AND MaDeTai = @param1',
            [maSV, topicId]
        );

        // Thêm MaGVHD vào DangKyDeTai
        await dbService.query(
            'INSERT INTO DangKyDeTai (MaSV, MaDeTai, HoTen, NgaySinh, NgayDangKy, TrangThai, MaGVHD) VALUES (@param0, @param1, @param2, @param3, GETDATE(), @param4, @param5)',
            [maSV, topicId, hoTen, ngaySinh, 'Chờ duyệt', lecturerMaGV]
        );

        // Lưu thông báo mới cho giảng viên
        const notificationMessage = `Có sinh viên ${studentName} muốn đăng ký đề tài ${topicName}`;
        await dbService.query(
            'INSERT INTO ThongBao (MaGV, Message, MaSV, MaDeTai, CreatedAt, IsRead) VALUES (@param0, @param1, @param2, @param3, GETDATE(), 0)',
            [lecturerMaGV, notificationMessage, maSV, topicId]
        );

        res.status(200).json({ message: 'Đăng ký thành công, đang chờ duyệt' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// Lấy danh sách tất cả đăng ký
router.get('/', async (req, res) => {
    try {
        const result = await dbService.query('SELECT MaSV, MaDeTai, NgayDangKy, TrangThai, MaGVHD FROM DangKyDeTai');
        if (!result || !result.recordset) {
            return res.status(500).json({ message: 'Không thể lấy dữ liệu từ database' });
        }
        res.status(200).json(result.recordset);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// Lấy danh sách đăng ký của sinh viên theo maSV
router.get('/by-student/:maSV', async (req, res) => {
    const { maSV } = req.params;
    try {
        const result = await dbService.query(
            `SELECT dk.MaDeTai, dk.TrangThai, dt.TenDeTai, dt.GhiChu, dt.TrangThai AS DeTaiTrangThai, dk.MaGVHD
             FROM DangKyDeTai dk
             JOIN DeTai dt ON dk.MaDeTai = dt.MaDeTai
             WHERE dk.MaSV = @param0`,
            [maSV]
        );
        if (!result || !result.recordset) {
            return res.status(500).json({ message: 'Không thể lấy dữ liệu từ database' });
        }
        res.status(200).json(result.recordset);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// Lấy danh sách sinh viên đăng ký đề tài của giảng viên
router.get('/by-lecturer/:maGV', async (req, res) => {
    const { maGV } = req.params;
    try {
        const result = await dbService.query(
            `SELECT dk.MaSV, dk.HoTen, dk.TrangThai, dt.TenDeTai AS topicName, dk.MaGVHD
             FROM DangKyDeTai dk
             JOIN DeTai dt ON dk.MaDeTai = dt.MaDeTai
             WHERE dk.MaGVHD = @param0`,
            [maGV]
        );
        if (!result || !result.recordset) {
            return res.status(500).json({ message: 'Không thể lấy dữ liệu từ database' });
        }
        res.status(200).json(result.recordset);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// Lấy danh sách sinh viên đăng ký theo MaDeTai
router.get('/by-topic/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await dbService.query(
            `SELECT MaSV, HoTen, NgayDangKy, MaGVHD
             FROM DangKyDeTai
             WHERE MaDeTai = @param0`,
            [id]
        );
        res.status(200).json(result.recordset);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// Cập nhật trạng thái đăng ký bởi giảng viên
router.put('/:maSV/:maDeTai', async (req, res) => {
    const { maSV, maDeTai } = req.params;
    const { maGV, status } = req.body;
    const validStatuses = ['Đã được duyệt', 'Không được duyệt'];

    if (!maSV || !maDeTai || !maGV || !status || !validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin hợp lệ' });
    }

    try {
        const topicResult = await dbService.query(
            'SELECT MaGVHD FROM DeTai WHERE MaDeTai = @param0',
            [maDeTai]
        );

        if (topicResult.recordset.length === 0) {
            return res.status(404).json({ message: 'Đề tài không tồn tại' });
        }

        if (topicResult.recordset[0].MaGVHD !== maGV) {
            return res.status(403).json({ message: 'Bạn không có quyền xử lý đăng ký này' });
        }

        const result = await dbService.query(
            'UPDATE DangKyDeTai SET TrangThai = @param0 WHERE MaSV = @param1 AND MaDeTai = @param2',
            [status, maSV, maDeTai]
        );

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Đăng ký không tồn tại' });
        }

        // Lưu thông báo cho sinh viên
        const topicName = (await dbService.query('SELECT TenDeTai FROM DeTai WHERE MaDeTai = @param0', [maDeTai])).recordset[0].TenDeTai;
        const notificationMessage = status === 'Đã được duyệt' ? `Đề tài ${topicName} đã được giảng viên chấp nhận` : `Đề tài ${topicName} không được chấp nhận`;
        await dbService.query(
            'INSERT INTO ThongBao (MaSV, Message, MaGV, MaDeTai, CreatedAt, IsRead) VALUES (@param0, @param1, @param2, @param3, GETDATE(), 0)',
            [maSV, notificationMessage, maGV, maDeTai]
        );

        res.status(200).json({ message: `Cập nhật trạng thái thành ${status} thành công` });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// Lấy danh sách thông báo cho giảng viên hoặc sinh viên
router.get('/notifications/:userId', async (req, res) => {
    const { userId } = req.params;
    const userType = req.query.type; // 'lecturer' hoặc 'student'

    try {
        let result;
        if (userType === 'lecturer') {
            result = await dbService.query(
                'SELECT * FROM ThongBao WHERE MaGV = @param0 AND Message LIKE \'Có sinh viên%\' ORDER BY CreatedAt DESC',
                [userId]
            );
        } else if (userType === 'student') {
            result = await dbService.query(
                'SELECT * FROM ThongBao WHERE MaSV = @param0 AND Message NOT LIKE \'Có sinh viên%\' ORDER BY CreatedAt DESC',
                [userId]
            );
        } else {
            return res.status(400).json({ message: 'Loại người dùng không hợp lệ' });
        }

        if (!result || !result.recordset) {
            return res.status(500).json({ message: 'Không thể lấy dữ liệu từ database' });
        }
        res.status(200).json(result.recordset);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

module.exports = router;