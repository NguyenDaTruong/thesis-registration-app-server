const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const dbService = require('../services/dbService');

// Route kiểm tra
router.get('/', (req, res) => {
    res.send('Auth route');
});

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

        // Truy vấn kiểm tra sinh viên
        const result = await dbService.query(
            'SELECT * FROM SinhVien WHERE MaSV = @param0',
            [maSV]
        );

        console.log('Query result:', result); // Log kết quả truy vấn

        if (result.recordset.length === 0) {
            console.log('Student not found');
            return res.status(401).json({ message: 'Mã sinh viên không tồn tại' });
        }

        const student = result.recordset[0];
        const hashedPassword = student.MatKhau;

        // Nếu không có mật khẩu trong cơ sở dữ liệu
        if (!hashedPassword) {
            console.log('No password found for student');
            return res.status(401).json({ message: 'Mật khẩu không tồn tại' });
        }

        // So sánh mật khẩu nhập vào với mật khẩu đã mã hóa
        const isMatch = await bcrypt.compare(matKhau, hashedPassword);
        if (!isMatch) {
            console.log('Password does not match');
            return res.status(401).json({ message: 'Mật khẩu không đúng' });
        }

        // Kiểm tra xem mật khẩu có phải là mật khẩu mặc định không
        const isDefaultPassword = await bcrypt.compare('123@123', hashedPassword);
        if (isDefaultPassword) {
            console.log('Default password detected, redirecting to change password');
            return res.status(200).json({ 
                message: 'Mật khẩu mặc định, cần đổi mật khẩu',
                redirect: 'changePassword',
                maSV: student.MaSV
            });
        }

        // Đăng nhập thành công, chuyển hướng đến trang student
        console.log('Login successful, redirecting to student page');
        res.status(200).json({ 
            message: 'Đăng nhập thành công',
            redirect: 'student',
            maSV: student.MaSV
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// Thêm route để đổi mật khẩu
router.post('/change-password', async (req, res) => {
    const { maSV, newPassword } = req.body;

    if (!maSV || !newPassword) {
        return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
    }

    try {
        // Mã hóa mật khẩu mới
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Cập nhật mật khẩu trong cơ sở dữ liệu
        const result = await dbService.query(
            'UPDATE SinhVien SET MatKhau = @param0 WHERE MaSV = @param1',
            [hashedPassword, maSV]
        );

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Mã sinh viên không tồn tại' });
        }

        res.status(200).json({ message: 'Đổi mật khẩu thành công' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

module.exports = router;