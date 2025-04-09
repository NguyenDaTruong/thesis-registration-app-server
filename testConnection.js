const { connectDB, sql } = require('./src/config/db');

(async () => {
    try {
        const pool = await connectDB();
        const result = await pool.request().query('SELECT 1 AS Test');
        console.log('Kết quả truy vấn:', result.recordset);
    } catch (err) {
        console.error('Lỗi:', err);
    }
})();

