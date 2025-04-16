const bcrypt = require('bcrypt');
const dbService = require('./src/services/dbService');

const saltRounds = 10;
const defaultPassword = '123@123';

// Hàm mã hóa mật khẩu
async function hashPassword(password) {
    return await bcrypt.hash(password, saltRounds);
}

// Hàm cập nhật mật khẩu trong bảng GiangVien
async function updateLecturerPasswords() {
    try {
        // Lấy tất cả giảng viên
        const result = await dbService.query('SELECT MaGV, MatKhau FROM GiangVien');
        const lecturers = result.recordset;

        for (const lecturer of lecturers) {
            // Kiểm tra nếu mật khẩu chưa được mã hóa
            const isMatch = await bcrypt.compare(defaultPassword, lecturer.MatKhau);
            if (!isMatch) {
                const hashedPassword = await hashPassword(defaultPassword);
                await dbService.query(
                    'UPDATE GiangVien SET MatKhau = @param0, IsDefaultPassword = 1 WHERE MaGV = @param1',
                    [hashedPassword, lecturer.MaGV]
                );
                console.log(`Updated password for MaGV: ${lecturer.MaGV}`);
            }
        }
        console.log('All lecturer passwords updated successfully.');
    } catch (error) {
        console.error('Error updating lecturer passwords:', error);
    } finally {
        dbService.close();
    }
}

updateLecturerPasswords();