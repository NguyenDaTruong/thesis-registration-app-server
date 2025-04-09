require('dotenv').config();
const sql = require('mssql');

const dbConfig = {
    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD, 
    server: process.env.DB_SERVER, 
    database: process.env.DB_NAME, 
    instanceName: 'MSSQL2022', 
    options: {
        encrypt: true, 
        trustServerCertificate: true, 
    },
    port: 1433, 
};

// Kết nối đến SQL Server
const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log('Kết nối thành công đến SQL Server!');
        return pool;
    })
    .catch(err => {
        console.error('Lỗi kết nối:', err);
        process.exit(1); // Thoát nếu kết nối thất bại
    });

// Hàm trả về poolPromise
const connectDB = async () => {
    return poolPromise;
};

// Hàm thực hiện truy vấn
const query = async (queryString, params = {}) => {
    try {
        const pool = await poolPromise;
        const request = pool.request();
        for (const [key, value] of Object.entries(params)) {
            request.input(key, value);
        }
        return await request.query(queryString);
    } catch (err) {
        console.error('Lỗi truy vấn:', err);
        throw err;
    }
};

// Hàm đóng kết nối
const close = async () => {
    try {
        const pool = await poolPromise;
        await pool.close();
        console.log('Đã đóng kết nối đến SQL Server.');
    } catch (err) {
        console.error('Lỗi khi đóng kết nối:', err);
        throw err;
    }
};

module.exports = { connectDB, query, close, sql };  