import mysql from 'mysql2';

// Koneksi ke database XAMPP
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'monitoring'
});

// Cek koneksi
connection.connect(err => {
  if (err) {
    console.error('❌ Error connecting to MySQL:', err.stack);
    return;
  }
  console.log('✅ Connected to MySQL as ID:', connection.threadId);
});

export default connection;
