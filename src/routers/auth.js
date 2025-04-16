const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const dbService = require('../services/dbService');

// Route kiểm tra
router.get('/', (req, res) => {
    res.send('Auth route');
});

const handleLogin = async (tableName, userIdField, userId, password, res) => {
    try {
        // Truy vấn kiểm tra người dùng
        const result = await dbService.query(
            `SELECT * FROM ${tableName} WHERE ${userIdField} = @param0`,
            [userId]
        );

        if (result.recordset.length === 0) {
            return res.status(401).json({ message: `${userIdField} không tồn tại` });
        }

        const user = result.recordset[0];
        const hashedPassword = user.MatKhau;

        if (!hashedPassword) {
            return res.status(401).json({ message: 'Mật khẩu không tồn tại' });
        }

        // So sánh mật khẩu nhập vào với mật khẩu đã mã hóa
        const isMatch = await bcrypt.compare(password, hashedPassword);
        if (!isMatch) {
            return res.status(401).json({ message: 'Mật khẩu không đúng' });
        }

        // Kiểm tra xem mật khẩu có phải là mật khẩu mặc định không
        const isDefaultPassword = await bcrypt.compare('123@123', hashedPassword);
        if (isDefaultPassword) {
            return res.status(200).json({
                message: 'Mật khẩu mặc định, cần đổi mật khẩu',
                redirect: 'changePassword',
                userId: user[userIdField]
            });
        }

        // Đăng nhập thành công
        return res.status(200).json({
            message: 'Đăng nhập thành công',
            redirect: tableName.toLowerCase(),
            userId: user[userIdField]
        });
    } catch (error) {
        console.error(`Error during ${tableName} login:`, error);
        return res.status(500).json({ message: 'Lỗi server' });
    }
};

// Route đăng nhập
router.post('/login', async (req, res) => {
    console.log('Request body:', req.body); // Log toàn bộ body nhận được
    const { maSV, matKhau } = req.body;

    console.log('Received login request:', { maSV, matKhau }); // Log dữ liệu sau khi destructuring

    try {
        // Kiểm tra dữ liệu đầu vào
        if (!maSV || !matKhau) {
            console.log('Missing maSV or matKhau');
            return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
        }

        // Sử dụng handleLogin để xử lý đăng nhập
        await handleLogin('SinhVien', 'MaSV', maSV, matKhau, res);
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// Route đăng nhập cho giảng viên
router.post('/lecturer/login', async (req, res) => {
    const { maGV, matKhau } = req.body;

    if (!maGV || !matKhau) {
        return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
    }

    try {
        const result = await dbService.query(
            'SELECT * FROM GiangVien WHERE MaGV = @param0',
            [maGV]
        );

        if (result.recordset.length === 0) {
            return res.status(401).json({ message: 'Mã giảng viên không tồn tại' });
        }

        const lecturer = result.recordset[0];
        const hashedPassword = lecturer.MatKhau;

        if (!hashedPassword) {
            return res.status(401).json({ message: 'Mật khẩu không tồn tại' });
        }

        const isMatch = await bcrypt.compare(matKhau, hashedPassword);
        if (!isMatch) {
            return res.status(401).json({ message: 'Mật khẩu không đúng' });
        }

        // Kiểm tra mã ngành
        const allowedMajorCodes = ['101', '103']; // Sư phạm Toán học (101), Công nghệ thông tin (103)
        if (!allowedMajorCodes.includes(lecturer.MaNganh)) {
            return res.status(403).json({
                message: 'Chuyên ngành của bạn không thuộc khuôn khổ đề tài (Công nghệ thông tin hoặc Sư phạm Toán học). Vui lòng liên hệ quản trị viên.',
                redirect: null,
                maGV: lecturer.MaGV
            });
        }

        // Kiểm tra trạng thái mật khẩu
        if (lecturer.IsDefaultPassword === 1) {
            return res.status(200).json({
                message: 'Mật khẩu mặc định, cần đổi mật khẩu',
                redirect: 'changePassword',
                maGV: lecturer.MaGV
            });
        }

        res.status(200).json({
            message: 'Đăng nhập thành công',
            redirect: 'lecturer',
            maGV: lecturer.MaGV
        });
    } catch (error) {
        console.error('Error during lecturer login:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// Thêm route để đổi mật khẩu
router.post('/change-password', async (req, res) => {
    const { maSV, maGV, newPassword } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!newPassword || (!maSV && !maGV)) {
        return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
    }

    try {
        // Mã hóa mật khẩu mới
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        let result;

        // Xử lý đổi mật khẩu cho sinh viên
        if (maSV) {
            result = await dbService.query(
                'UPDATE SinhVien SET MatKhau = @param0, IsDefaultPassword = 0 WHERE MaSV = @param1',
                [hashedPassword, maSV]
            );
        }
        // Xử lý đổi mật khẩu cho giảng viên
        else if (maGV) {
            result = await dbService.query(
                'UPDATE GiangVien SET MatKhau = @param0, IsDefaultPassword = 0 WHERE MaGV = @param1',
                [hashedPassword, maGV]
            );
        }

        // Kiểm tra xem có bản ghi nào được cập nhật không
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Mã không tồn tại' });
        }

        res.status(200).json({ message: 'Đổi mật khẩu thành công' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

module.exports = router;