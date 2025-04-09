const bcrypt = require('bcrypt');
const dbService = require('./src/services/dbService');

const saltRounds = 10;
const defaultPassword = '123@123';

// Hàm mã hóa mật khẩu
async function hashPassword(password) {
    return await bcrypt.hash(password, saltRounds);
}

// Hàm cập nhật mật khẩu trong bảng SinhVien
async function updatePasswords() {
    try {
        // Lấy tất cả sinh viên
        const result = await dbService.query('SELECT MaSV, MatKhau FROM SinhVien');
        const students = result.recordset; // Lấy danh sách sinh viên từ recordset
        
        for (const student of students) {
            // Kiểm tra nếu mật khẩu chưa được mã hóa
            const isMatch = await bcrypt.compare(defaultPassword, student.MatKhau);
            if (!isMatch) {
                const hashedPassword = await hashPassword(defaultPassword);
                await dbService.query(
                    'UPDATE SinhVien SET MatKhau = @param0 WHERE MaSV = @param1',
                    [hashedPassword, student.MaSV] // Truyền tham số dưới dạng mảng
                );
                console.log(`Updated password for MaSV: ${student.MaSV}`);
            }
        }
        console.log('All passwords updated successfully.');
    } catch (error) {
        console.error('Error updating passwords:', error);
    } finally {
        dbService.close();
    }
}

updatePasswords();