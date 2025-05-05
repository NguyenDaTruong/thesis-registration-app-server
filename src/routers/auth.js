const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const dbService = require('../services/dbService');

router.get('/', (req, res) => {
    res.send('Auth route');
});

const handleLogin = async (tableName, userIdField, userId, password, res) => {
    try {
        const result = await dbService.query(
            `SELECT * FROM ${tableName} WHERE ${userIdField} = @param0`,
            [userId]
        );

        if (result.recordset.length === 0) {
            return res.status(401).json({ message: `${userIdField} không tồn tại` });
        }

        const user = result.recordset[0];
        const hashedPassword = user.MatKhau;
        const maNganh = user.MaNganh;

        if (!hashedPassword) {
            return res.status(401).json({ message: 'Mật khẩu không tồn tại' });
        }

        const isMatch = await bcrypt.compare(password, hashedPassword);
        if (!isMatch) {
            return res.status(401).json({ message: 'Mật khẩu không đúng' });
        }

        const isDefaultPassword = await bcrypt.compare('123@123', hashedPassword);

        if (isDefaultPassword) {
            if (!['101', '103'].includes(maNganh)) {
                return res.status(403).json({
                    message: 'Ngành của bạn chưa được hỗ trợ, vui lòng chờ trong tương lai.',
                    redirect: null,
                    userId: user[userIdField]
                });
            }
            return res.status(200).json({
                message: 'Mật khẩu mặc định, cần đổi mật khẩu',
                redirect: 'changePassword',
                userId: user[userIdField]
            });
        }

        return res.status(200).json({
            message: 'Đăng nhập thành công',
            redirect: 'home',
            userId: user[userIdField]
        });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi server' });
    }
};

router.post('/login', async (req, res) => {
    const { maSV, matKhau } = req.body;

    try {
        if (!maSV || !matKhau) {
            return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
        }

        await handleLogin('SinhVien', 'MaSV', maSV, matKhau, res);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server' });
    }
});

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

        const allowedMajorCodes = ['101', '103'];
        if (!allowedMajorCodes.includes(lecturer.MaNganh)) {
            return res.status(403).json({
                message: 'Chuyên ngành của bạn không thuộc khuôn khổ đề tài...',
                redirect: null,
                maGV: lecturer.MaGV
            });
        }

        const isDefaultPassword = await bcrypt.compare('123@123', hashedPassword);
        if (isDefaultPassword) {
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
        res.status(500).json({ message: 'Lỗi server' });
    }
});

router.post('/change-password', async (req, res) => {
    const { maSV, maGV, newPassword } = req.body;

    if (!newPassword || (!maSV && !maGV)) {
        return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
    }

    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        let result;

        if (maSV) {
            result = await dbService.query(
                'UPDATE SinhVien SET MatKhau = @param0, IsDefaultPassword = 0 WHERE MaSV = @param1',
                [hashedPassword, maSV]
            );
        } else if (maGV) {
            result = await dbService.query(
                'UPDATE GiangVien SET MatKhau = @param0, IsDefaultPassword = 0 WHERE MaGV = @param1',
                [hashedPassword, maGV]
            );
        }

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Mã không tồn tại' });
        }

        res.status(200).json({ message: 'Đổi mật khẩu thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server' });
    }
});

router.get('/user-info', async (req, res) => {
    const maSV = req.query.maSV;
    const maGV = req.query.maGV;

    try {
        let result;
        if (maSV) {
            result = await dbService.query(
                'SELECT HoLot + \' \' + Ten AS HoTen FROM SinhVien WHERE MaSV = @param0',
                [maSV]
            );
            if (result.recordset.length === 0) {
                return res.status(404).json({ message: 'Sinh viên không tồn tại' });
            }
            return res.status(200).json({ HoTen: result.recordset[0].HoTen });
        } else if (maGV) {
            result = await dbService.query(
                'SELECT HoTen FROM GiangVien WHERE MaGV = @param0',
                [maGV]
            );
            if (result.recordset.length === 0) {
                return res.status(404).json({ message: 'Giảng viên không tồn tại' });
            }
            return res.status(200).json({ HoTen: result.recordset[0].HoTen });
        } else {
            return res.status(400).json({ message: 'Vui lòng cung cấp maSV hoặc maGV' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// Cập nhật endpoint để lấy thông tin chi tiết của sinh viên
router.get('/students/:maSV', async (req, res) => {
    const { maSV } = req.params;

    try {
        const result = await dbService.query(
            'SELECT HoLot, Ten, NgaySinh, MaNganh, Email, SoDienThoai FROM SinhVien WHERE MaSV = @param0',
            [maSV]
        );
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Sinh viên không tồn tại' });
        }
        return res.status(200).json(result.recordset[0]);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// Thêm endpoint để lấy thông tin chi tiết của giảng viên
router.get('/lecturers/:maGV', async (req, res) => {
    const { maGV } = req.params;

    try {
        const result = await dbService.query(
            'SELECT HoTen, MaNganh, Email, SoDienThoai, MaKhoa, ChuyenNganh FROM GiangVien WHERE MaGV = @param0',
            [maGV]
        );
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Giảng viên không tồn tại' });
        }
        return res.status(200).json(result.recordset[0]);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server' });
    }
});

module.exports = router;