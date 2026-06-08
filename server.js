import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

// Serve static assets for the frontend
app.use('/src', express.static(path.join(__dirname, 'src')));

// MySQL Connection Configuration
const dbConfig = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '' // default empty password for XAMPP
};

let pool = null;

// Initialize Database & Run migrations
async function initializeDatabase() {
  try {
    // 1. Establish initial connection without database selected to create it if missing
    const connection = await mysql.createConnection(dbConfig);
    console.log('Successfully connected to MySQL server.');
    
    await connection.query('CREATE DATABASE IF NOT EXISTS studyflow');
    console.log('Database "studyflow" checked/created.');
    await connection.end();

    // 2. Re-create pool connecting directly to "studyflow"
    pool = mysql.createPool({
      ...dbConfig,
      database: 'studyflow',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    console.log('MySQL Connection Pool created.');

    // 3. Create tables
    await runMigrations();

    // 4. Seed initial mock records if database is empty
    await seedDatabase();

  } catch (error) {
    console.error('FATAL DATABASE INITIALIZATION ERROR:', error);
    process.exit(1);
  }
}

async function runMigrations() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`SET FOREIGN_KEY_CHECKS = 0`);
    
    // Drop in reverse order of dependencies
    await conn.query(`DROP TABLE IF EXISTS tasks`);
    await conn.query(`DROP TABLE IF EXISTS sticky_notes`);
    await conn.query(`DROP TABLE IF EXISTS announcements`);
    await conn.query(`DROP TABLE IF EXISTS categories`);
    await conn.query(`DROP TABLE IF EXISTS users`);
    


    // Create in order of dependency
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL,
        name VARCHAR(100) NOT NULL,
        nim VARCHAR(50) NOT NULL,
        prodi VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL,
        avatar TEXT
      )
    `);
    console.log('Table "users" verified.');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        color VARCHAR(20) NOT NULL
      )
    `);
    console.log('Table "categories" verified.');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        date VARCHAR(50) NOT NULL,
        author VARCHAR(100) NOT NULL
      )
    `);
    console.log('Table "announcements" verified.');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        categoryId VARCHAR(50),
        priority VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL,
        dueDate VARCHAR(50),
        description TEXT,
        attachments TEXT, -- Stores JSON string of files [{name, size, type}]
        subtasks TEXT, -- Stores JSON string of subtasks [{id, title, isCompleted}]
        studentId VARCHAR(50),
        createdAt VARCHAR(50),
        completedAt VARCHAR(50),
        FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Table "tasks" verified.');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS sticky_notes (
        id VARCHAR(50) PRIMARY KEY,
        studentId VARCHAR(50),
        content TEXT NOT NULL,
        color VARCHAR(20) NOT NULL,
        createdAt VARCHAR(50) NOT NULL,
        FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Table "sticky_notes" verified.');

    await conn.query(`SET FOREIGN_KEY_CHECKS = 1`);

  } finally {
    conn.release();
  }
}

async function seedDatabase() {
  const conn = await pool.getConnection();
  try {
    // Check if users exist
    const [users] = await conn.query('SELECT count(*) as count FROM users');
    if (users[0].count === 0) {
      console.log('Database empty. Seeding initial mock data...');
      
      // Users seed
      await conn.query(`
        INSERT INTO users (id, email, password, name, nim, prodi, role, avatar) VALUES 
        ('stud-1', 'student@studyflow.id', 'student123', 'Reza Aditya', '10121045', 'Teknik Informatika', 'student', 'https://api.dicebear.com/7.x/adventurer/svg?seed=Reza'),
        ('admin-1', 'admin@studyflow.id', 'admin123', 'Dr. Budi Santoso', 'NIP. 19800812', 'Koordinator RPL & Basis Data', 'admin', 'https://api.dicebear.com/7.x/adventurer/svg?seed=Budi')
      `);

      // Categories seed
      await conn.query(`
        INSERT INTO categories (id, name, color) VALUES 
        ('cat-ai', 'Artificial Intelligence', '#6366f1'),
        ('cat-db', 'Basis Data', '#ec4899'),
        ('cat-rpl', 'Rekayasa Perangkat Lunak', '#10b981'),
        ('cat-jarkom', 'Jaringan Komputer', '#f59e0b')
      `);

      // Tasks seed
      const tomorrowStr = new Date(Date.now() + 1000 * 60 * 60 * 20).toISOString().split('T')[0] + 'T23:59';
      const threeDaysStr = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().split('T')[0] + 'T12:00';
      const yesterdayStr = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString().split('T')[0] + 'T23:59';
      const fourDaysAgoStr = new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString().split('T')[0] + 'T17:00';

      const attachment1 = JSON.stringify([{ name: 'Modul_Praktikum_AI_AStar.pdf', size: 1048576, type: 'application/pdf', date: '2026-06-05' }]);
      const attachment4 = JSON.stringify([{ name: 'Laporan_Subnetting_Reza.pdf', size: 2097152, type: 'application/pdf', date: '2026-06-04' }]);
      const subtasks1 = JSON.stringify([
        { id: 'sub-1', title: 'Pahami pseudocode A*', isCompleted: true },
        { id: 'sub-2', title: 'Tulis fungsi heuristik Manhattan', isCompleted: false },
        { id: 'sub-3', title: 'Uji dengan simulasi peta', isCompleted: false }
      ]);
      const subtasks2 = JSON.stringify([
        { id: 'sub-4', title: 'Analisis entitas e-commerce', isCompleted: true },
        { id: 'sub-5', title: 'Buat ERD sementara', isCompleted: true },
        { id: 'sub-6', title: 'Konversi ke 3NF', isCompleted: false }
      ]);

      await conn.query(`
        INSERT INTO tasks (id, title, categoryId, priority, status, dueDate, description, attachments, subtasks, studentId, createdAt, completedAt) VALUES 
        ('task-1', 'Tugas Mandiri 1: Implementasi A* Search', 'cat-ai', 'tinggi', 'todo', ?, 'Implementasikan algoritma pencarian A* dalam bahasa Python untuk mencari rute terpendek dari peta simulasi.', ?, ?, 'stud-1', '2026-06-07T10:00:00.000Z', NULL),
        ('task-2', 'Normalisasi Database E-Commerce', 'cat-db', 'sedang', 'inprogress', ?, 'Lakukan proses normalisasi database untuk model transaksi e-commerce hingga bentuk 3NF.', '[]', ?, 'stud-1', '2026-06-06T14:30:00.000Z', NULL),
        ('task-3', 'Dokumen SRS (Software Requirement Specification)', 'cat-rpl', 'tinggi', 'todo', ?, 'Susun dokumen SRS proyek kelompok sistem informasi perpustakaan menggunakan standar IEEE 830.', '[]', '[]', 'stud-1', '2026-06-05T09:00:00.000Z', NULL),
        ('task-4', 'Laporan Praktikum Subnetting VLSM', 'cat-jarkom', 'rendah', 'done', ?, 'Selesaikan laporan praktikum perhitungan subnetting IP Address dengan metode VLSM.', ?, '[]', 'stud-1', '2026-06-03T08:00:00.000Z', '2026-06-07T18:00:00.000Z'),
        ('task-5', 'Latihan Soal Probabilitas', 'cat-ai', 'sedang', 'done', ?, 'Menyelesaikan 10 soal latihan probabilitas Bayes Theorem.', '[]', '[]', 'stud-1', '2026-06-01T09:00:00.000Z', '2026-06-05T15:00:00.000Z'),
        ('task-6', 'Review Jurnal RPL', 'cat-rpl', 'rendah', 'done', ?, 'Review jurnal internasional mengenai Agile methodology.', '[]', '[]', 'stud-1', '2026-05-31T11:00:00.000Z', '2026-06-02T16:30:00.000Z'),
        ('task-7', 'Implementasi Query Optimization', 'cat-db', 'tinggi', 'done', ?, 'Optimasi performa query database dengan index.', '[]', '[]', 'stud-1', '2026-05-26T10:00:00.000Z', '2026-05-29T14:00:00.000Z'),
        ('task-8', 'Tugas Kelompok Jaringan Nirkabel', 'cat-jarkom', 'sedang', 'done', ?, 'Makalah perbandingan wifi standards IEEE 802.11.', '[]', '[]', 'stud-1', '2026-05-24T09:00:00.000Z', '2026-05-28T11:00:00.000Z'),
        ('task-9', 'Desain UI/UX StudyFlow', 'cat-rpl', 'tinggi', 'done', ?, 'Membuat mockup hi-fi dengan Figma.', '[]', '[]', 'stud-1', '2026-05-18T10:00:00.000Z', '2026-05-22T17:00:00.000Z'),
        ('task-10', 'Kuis AI DFS & BFS', 'cat-ai', 'tinggi', 'done', ?, 'Kuis online di e-learning.', '[]', '[]', 'stud-1', '2026-05-19T08:00:00.000Z', '2026-05-20T09:30:00.000Z'),
        ('task-11', 'Analisis Kebutuhan Sistem', 'cat-rpl', 'sedang', 'done', ?, 'Studi kasus SRS kebutuhan fungsional.', '[]', '[]', 'stud-1', '2026-05-10T14:00:00.000Z', '2026-05-13T16:00:00.000Z')
      `, [tomorrowStr, attachment1, subtasks1, threeDaysStr, subtasks2, yesterdayStr, fourDaysAgoStr, attachment4, yesterdayStr, yesterdayStr, yesterdayStr, yesterdayStr, yesterdayStr, yesterdayStr, yesterdayStr]);

      // Announcements seed
      await conn.query(`
        INSERT INTO announcements (id, title, content, date, author) VALUES 
        ('ann-1', 'Jadwal Ujian Akhir Semester (UAS)', 'UAS akan dimulai tanggal 15 Juni 2026. Harap persiapkan kartu ujian Anda.', '2026-06-07', 'Dr. Budi Santoso')
      `);

      // Sticky notes seed
      await conn.query(`
        INSERT INTO sticky_notes (id, studentId, content, color, createdAt) VALUES
        ('note-1', 'stud-1', 'Cari bahan materi AI untuk presentasi kelompok hari Kamis.', '#fef08a', '${new Date().toISOString()}'),
        ('note-2', 'stud-1', 'Beli buku referensi basis data di koperasi mahasiswa.', '#bbf7d0', '${new Date().toISOString()}'),
        ('note-3', 'stud-1', 'Siapkan daftar pertanyaan untuk sesi asistensi RPL.', '#bfdbfe', '${new Date().toISOString()}')
      `);

      console.log('Seeding completed successfully.');
    }
  } finally {
    conn.release();
  }
}

// ==========================================
// REST API ENDPOINTS
// ==========================================

const parseJsonColumn = (val) => {
  if (!val) return [];
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return val;
};

// Auth Endpoints
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE LOWER(email) = ? AND password = ?', [email.toLowerCase(), password]);
    if (rows.length > 0) {
      res.json({ success: true, user: rows[0] });
    } else {
      res.status(401).json({ success: false, message: 'Email atau password salah.' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { name, nim, prodi, email, password, role } = req.body;
  try {
    const [exists] = await pool.query('SELECT id FROM users WHERE LOWER(email) = ?', [email.toLowerCase()]);
    if (exists.length > 0) {
      return res.status(400).json({ success: false, message: 'Email sudah terdaftar.' });
    }

    const id = `user-${Date.now()}`;
    const avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`;

    await pool.query(
      'INSERT INTO users (id, email, password, name, nim, prodi, role, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, email.toLowerCase(), password, name, nim, prodi, role || 'student', avatar]
    );

    res.json({ success: true, user: { id, email, name, nim, prodi, role, avatar } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// User Profile Update Endpoint
app.put('/api/profile', async (req, res) => {
  const { userId, name, nim, prodi, email, avatar } = req.body;
  try {
    await pool.query(
      'UPDATE users SET name = ?, nim = ?, prodi = ?, email = ?, avatar = ? WHERE id = ?',
      [name, nim, prodi, email, avatar, userId]
    );
    
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    res.json({ success: true, user: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Students List Endpoint (for Admin Dashboard)
app.get('/api/students', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name, nim, prodi, role, avatar FROM users WHERE role = 'student'");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tasks Endpoints
app.get('/api/tasks', async (req, res) => {
  const { userId, role } = req.query;
  try {
    let rows;
    if (role === 'admin') {
      [rows] = await pool.query('SELECT * FROM tasks');
    } else {
      [rows] = await pool.query('SELECT * FROM tasks WHERE studentId = ?', [userId]);
    }
    
    // Parse attachments and subtasks back to array objects
    const parsedTasks = rows.map(t => ({
      ...t,
      attachments: parseJsonColumn(t.attachments),
      subtasks: parseJsonColumn(t.subtasks)
    }));
    res.json(parsedTasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  const { title, categoryId, priority, status, dueDate, description, attachments, subtasks, studentId } = req.body;
  const id = `task-${Date.now()}`;
  const attachmentsJson = JSON.stringify(attachments || []);
  const subtasksJson = JSON.stringify(subtasks || []);
  const createdAt = new Date().toISOString();
  const completedAt = status === 'done' ? new Date().toISOString() : null;
  
  try {
    await pool.query(
      'INSERT INTO tasks (id, title, categoryId, priority, status, dueDate, description, attachments, subtasks, studentId, createdAt, completedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title, categoryId || null, priority, status, dueDate, description, attachmentsJson, subtasksJson, studentId, createdAt, completedAt]
    );
    res.json({ id, title, categoryId, priority, status, dueDate, description, attachments, subtasks, studentId, createdAt, completedAt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { title, categoryId, priority, status, dueDate, description, attachments, subtasks } = req.body;
  const attachmentsJson = attachments ? JSON.stringify(attachments) : null;
  const subtasksJson = subtasks ? JSON.stringify(subtasks) : null;

  try {
    // Generate dynamic SQL set clause based on provided payload
    let updateFields = [];
    let values = [];

    if (title !== undefined) { updateFields.push('title = ?'); values.push(title); }
    if (categoryId !== undefined) { updateFields.push('categoryId = ?'); values.push(categoryId || null); }
    if (priority !== undefined) { updateFields.push('priority = ?'); values.push(priority); }
    if (status !== undefined) {
      updateFields.push('status = ?');
      values.push(status);
      updateFields.push('completedAt = ?');
      values.push(status === 'done' ? new Date().toISOString() : null);
    }
    if (dueDate !== undefined) { updateFields.push('dueDate = ?'); values.push(dueDate); }
    if (description !== undefined) { updateFields.push('description = ?'); values.push(description); }
    if (attachmentsJson !== null) { updateFields.push('attachments = ?'); values.push(attachmentsJson); }
    if (subtasksJson !== null) { updateFields.push('subtasks = ?'); values.push(subtasksJson); }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(id);
    await pool.query(`UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`, values);
    
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);
    const parsedTask = {
      ...rows[0],
      attachments: parseJsonColumn(rows[0].attachments),
      subtasks: parseJsonColumn(rows[0].subtasks)
    };
    res.json(parsedTask);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM tasks WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Categories Endpoints
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/categories', async (req, res) => {
  const { name, color } = req.body;
  const id = `cat-${Date.now()}`;
  try {
    const [exists] = await pool.query('SELECT id FROM categories WHERE LOWER(name) = ?', [name.toLowerCase()]);
    if (exists.length > 0) {
      return res.status(400).json({ success: false, message: 'Kategori sudah ada.' });
    }
    
    await pool.query('INSERT INTO categories (id, name, color) VALUES (?, ?, ?)', [id, name, color]);
    res.json({ success: true, category: { id, name, color } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM categories WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Announcements Endpoints
app.get('/api/announcements', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM announcements ORDER BY date DESC, id DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/announcements', async (req, res) => {
  const { title, content, author } = req.body;
  const id = `ann-${Date.now()}`;
  const dateStr = new Date().toISOString().split('T')[0];
  try {
    await pool.query(
      'INSERT INTO announcements (id, title, content, date, author) VALUES (?, ?, ?, ?, ?)',
      [id, title, content, dateStr, author]
    );
    res.json({ id, title, content, date: dateStr, author });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sticky Notes Endpoints
app.get('/api/notes', async (req, res) => {
  const { userId } = req.query;
  try {
    const [rows] = await pool.query('SELECT * FROM sticky_notes WHERE studentId = ? ORDER BY createdAt DESC', [userId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notes', async (req, res) => {
  const { studentId, content, color } = req.body;
  const id = `note-${Date.now()}`;
  const createdAt = new Date().toISOString();
  try {
    await pool.query(
      'INSERT INTO sticky_notes (id, studentId, content, color, createdAt) VALUES (?, ?, ?, ?, ?)',
      [id, studentId, content || '', color || '#fef08a', createdAt]
    );
    res.json({ id, studentId, content, color, createdAt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/notes/:id', async (req, res) => {
  const { id } = req.params;
  const { content, color } = req.body;
  try {
    let updateFields = [];
    let values = [];
    if (content !== undefined) { updateFields.push('content = ?'); values.push(content); }
    if (color !== undefined) { updateFields.push('color = ?'); values.push(color); }
    
    if (updateFields.length > 0) {
      values.push(id);
      await pool.query(`UPDATE sticky_notes SET ${updateFields.join(', ')} WHERE id = ?`, values);
    }
    
    const [rows] = await pool.query('SELECT * FROM sticky_notes WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/notes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM sticky_notes WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SPA Fallback Router: If requesting UI paths, return index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Database then Express Server
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`StudyFlow Server is running at http://localhost:${PORT}`);
    console.log(`Press Ctrl+C to stop`);
  });
});
