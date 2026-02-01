import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function setupDatabase() {
  let connection;
  
  try {
    console.log('🚀 Starting database setup...\n');
    
    // Koneksi tanpa database tertentu
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306,
      multipleStatements: true
    });

    console.log('✅ Connected to MySQL server');

    // Baca schema SQL
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Eksekusi schema
    await connection.query(schema);
    console.log('✅ Database schema created successfully');

    // Gunakan database yang baru dibuat
    await connection.query(`USE ${process.env.DB_NAME || 'aplikasi_listrik_db'}`);

    // Buat akun admin default
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@listrik.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const [existing] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      [adminEmail]
    );

    if (existing.length === 0) {
      await connection.query(
        'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
        [adminEmail, hashedPassword, 'admin']
      );
      console.log(`✅ Admin account created: ${adminEmail}`);
    } else {
      console.log(`ℹ️  Admin account already exists: ${adminEmail}`);
    }

    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📋 Default credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('\n⚠️  Please change the admin password after first login!\n');

  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();
