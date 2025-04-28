const bcrypt = require('bcrypt');
const dbService = require('./src/services/dbService'); // Sửa đường dẫn

const resetPassword = async () => {
    const saltRounds = 10;
    const defaultPassword = '123@123';
    const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

    try {
        await dbService.query(
            'UPDATE GiangVien SET MatKhau = @param0, IsDefaultPassword = 1 WHERE MaGV = @param1',
            [hashedPassword, '24000415']
        );
        console.log('Đã đặt lại mật khẩu mặc định cho giảng viên 24000415');
    } catch (error) {
        console.error('Lỗi khi đặt lại mật khẩu:', error);
    }
};

resetPassword();