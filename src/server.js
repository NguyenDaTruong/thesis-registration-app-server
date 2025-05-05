const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');
const topicsRouter = require('./routers/topics');
const registrationsRouter = require('./routers/registrations');
const authRouter = require('./routers/auth');
const dbService = require('./services/dbService');

const app = express();
const PORT = process.env.PORT || 3000;

// Kiểm tra kết nối và khởi động server
const startServer = async () => {
    try {
        await connectDB();
        console.log('Kết nối thành công đến SQL Server!');

        // Cấu hình middleware
        app.use(cors({
            origin: '*',
            methods: ['GET', 'POST', 'PUT'],
            allowedHeaders: ['Content-Type']
        }), (req, res, next) => {
            next();
        });

        app.use(express.json(), (req, res, next) => {
            next();
        });

        // Định nghĩa các route
        app.use('/api/topics', topicsRouter);
        app.use('/api/registrations', registrationsRouter);
        app.use('/api/auth', authRouter);

        // Route để lấy thông tin sinh viên
        app.get('/api/students/:maSV', async (req, res) => {
            const { maSV } = req.params;
            try {
                const result = await dbService.query(
                    'SELECT MaNganh, IsDefaultPassword FROM SinhVien WHERE MaSV = @param0',
                    [maSV]
                );
                if (result.recordset.length === 0) {
                    return res.status(404).json({ message: 'Sinh viên không tồn tại' });
                }
                res.status(200).json(result.recordset[0]);
            } catch (error) {
                res.status(500).json({ message: 'Lỗi server', error: error.message });
            }
        });

        // Cho phép public folder uploads
        app.use('/uploads', express.static('uploads'));

        app.post('/test', (req, res) => {
            res.json({ received: req.body });
        });

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Không thể khởi động server do lỗi kết nối SQL Server:', err);
        process.exit(1);
    }
};

startServer();