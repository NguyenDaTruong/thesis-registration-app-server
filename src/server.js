const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');
const topicsRouter = require('./routers/topics');
const registrationsRouter = require('./routers/registrations');
const authRouter = require('./routers/auth');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Tạo thư mục uploads nếu chưa tồn tại
const uploadsDir = path.join(__dirname, 'uploads').replace(/\\/g, '/'); // Chuẩn hóa đường dẫn
console.log('Uploads directory path:', uploadsDir);
try {
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('Uploads directory created successfully');
    } else {
        console.log('Uploads directory already exists');
    }

    // Kiểm tra quyền ghi
    fs.accessSync(uploadsDir, fs.constants.W_OK);
    console.log('Uploads directory is writable');

    // Kiểm tra quyền đọc
    fs.accessSync(uploadsDir, fs.constants.R_OK);
    console.log('Uploads directory is readable');
} catch (err) {
    console.error('Error with uploads directory:', err);
    process.exit(1);
}

// Phục vụ file tĩnh từ thư mục uploads
app.use('/uploads', (req, res, next) => {
    const filePath = path.join(uploadsDir, req.path).replace(/\\/g, '/'); // Chuẩn hóa đường dẫn
    console.log('Request to /uploads:', req.path);
    console.log('Attempting to serve file:', filePath);
    if (fs.existsSync(filePath)) {
        console.log('File exists, serving...');
    } else {
        console.log('File does not exist');
    }
    next();
});
app.use('/uploads', express.static(uploadsDir, {
    fallthrough: false // Ngăn middleware tiếp theo xử lý nếu file không tồn tại
}));

// Xử lý lỗi nếu file không tồn tại
app.use('/uploads', (err, req, res, next) => {
    console.error('Error serving file:', err);
    res.status(404).send('Cannot GET ' + req.path);
});

// Kiểm tra kết nối khi server khởi động
(async () => {
    try {
        await connectDB();
    } catch (err) {
        console.error('Không thể khởi động server do lỗi kết nối SQL Server:', err);
        process.exit(1);
    }
})();

// Cấu hình middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT'],
    allowedHeaders: ['Content-Type']
}), (req, res, next) => {
    console.log('CORS middleware triggered');
    next();
});

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