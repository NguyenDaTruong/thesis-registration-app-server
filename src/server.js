const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');
const topicsRouter = require('./routers/topics');
const registrationsRouter = require('./routers/registrations');
const authRouter = require('./routers/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Kiểm tra kết nối khi server khởi động
(async () => {
    try {
        await connectDB(); // Gọi hàm connectDB
    } catch (err) {
        console.error('Không thể khởi động server do lỗi kết nối SQL Server:', err);
        process.exit(1);
    }
})();

// Cấu hình middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}), (req, res, next) => {
    console.log('CORS middleware triggered');
    next();
});

// Đảm bảo middleware express.json() được gọi trước các route
app.use(express.json(), (req, res, next) => {
    console.log('Middleware parsed body:', req.body);
    console.log('Request body:', req.body);
    next();
});

// Định nghĩa các route
app.use('/api/topics', topicsRouter);
app.use('/api/registrations', registrationsRouter);
app.use('/api/auth', authRouter);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


app.post('/test', (req, res) => {
    console.log('Test request body:', req.body);
    res.json({ received: req.body });
});
