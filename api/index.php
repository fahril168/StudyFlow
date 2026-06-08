<?php
/*
 * StudyFlow PHP + MySQL Backend (XAMPP & Apache)
 * Serves as the unified REST API router.
 */

// Handle CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// MySQL configuration (Dynamic local/Vercel settings)
if (getenv('VERCEL') === '1') {
    $host = getenv('MYSQL_HOST');
    $user = getenv('MYSQL_USER');
    $password = getenv('MYSQL_PASSWORD');
    $dbname = getenv('MYSQL_DATABASE');
} else {
    $host = '127.0.0.1';
    $user = 'root';
    $password = '';
    $dbname = 'studyflow';
}

try {
    // Connect to MySQL server first to check/create db
    $pdo = new PDO("mysql:host=$host", $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbname` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE `$dbname`");
    
    // Create tables if they do not exist
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL,
        name VARCHAR(100) NOT NULL,
        nim VARCHAR(50) NOT NULL,
        prodi VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL,
        avatar TEXT
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        color VARCHAR(20) NOT NULL
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS announcements (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        date VARCHAR(50) NOT NULL,
        author VARCHAR(100) NOT NULL
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        categoryId VARCHAR(50),
        priority VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL,
        dueDate VARCHAR(50),
        description TEXT,
        attachments TEXT,
        subtasks TEXT,
        studentId VARCHAR(50),
        createdAt VARCHAR(50),
        completedAt VARCHAR(50),
        FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS sticky_notes (
        id VARCHAR(50) PRIMARY KEY,
        studentId VARCHAR(50),
        content TEXT NOT NULL,
        color VARCHAR(20) NOT NULL,
        createdAt VARCHAR(50) NOT NULL,
        FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE
    )");

    // Seed mock data if database is empty
    $stmt = $pdo->query("SELECT count(*) as count FROM users");
    $userCount = $stmt->fetch()['count'];
    if ($userCount == 0) {
        // Seed users
        $pdo->exec("INSERT INTO users (id, email, password, name, nim, prodi, role, avatar) VALUES 
        ('stud-1', 'student@studyflow.id', 'student123', 'Reza Aditya', '10121045', 'Teknik Informatika', 'student', 'https://api.dicebear.com/7.x/adventurer/svg?seed=Reza'),
        ('admin-1', 'admin@studyflow.id', 'admin123', 'Dr. Budi Santoso', 'NIP. 19800812', 'Koordinator RPL & Basis Data', 'admin', 'https://api.dicebear.com/7.x/adventurer/svg?seed=Budi')");

        // Seed categories
        $pdo->exec("INSERT INTO categories (id, name, color) VALUES 
        ('cat-ai', 'Artificial Intelligence', '#6366f1'),
        ('cat-db', 'Basis Data', '#ec4899'),
        ('cat-rpl', 'Rekayasa Perangkat Lunak', '#10b981'),
        ('cat-jarkom', 'Jaringan Komputer', '#f59e0b')");

        // Seed tasks
        $tomorrowStr = date('Y-m-d', time() + 20 * 3600) . 'T23:59';
        $threeDaysStr = date('Y-m-d', time() + 24 * 3600 * 3) . 'T12:00';
        $yesterdayStr = date('Y-m-d', time() - 24 * 3600) . 'T23:59';
        $fourDaysAgoStr = date('Y-m-d', time() - 24 * 3600 * 4) . 'T17:00';

        $attachment1 = json_encode([['name' => 'Modul_Praktikum_AI_AStar.pdf', 'size' => 1048576, 'type' => 'application/pdf', 'date' => '2026-06-05']]);
        $attachment4 = json_encode([['name' => 'Laporan_Subnetting_Reza.pdf', 'size' => 2097152, 'type' => 'application/pdf', 'date' => '2026-06-04']]);
        
        $subtasks1 = json_encode([
            ['id' => 'sub-1', 'title' => 'Pahami pseudocode A*', 'isCompleted' => true],
            ['id' => 'sub-2', 'title' => 'Tulis fungsi heuristik Manhattan', 'isCompleted' => false],
            ['id' => 'sub-3', 'title' => 'Uji dengan simulasi peta', 'isCompleted' => false]
        ]);
        $subtasks2 = json_encode([
            ['id' => 'sub-4', 'title' => 'Analisis entitas e-commerce', 'isCompleted' => true],
            ['id' => 'sub-5', 'title' => 'Buat ERD sementara', 'isCompleted' => true],
            ['id' => 'sub-6', 'title' => 'Konversi ke 3NF', 'isCompleted' => false]
        ]);

        $stmt = $pdo->prepare("INSERT INTO tasks (id, title, categoryId, priority, status, dueDate, description, attachments, subtasks, studentId, createdAt, completedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        $stmt->execute(['task-1', 'Tugas Mandiri 1: Implementasi A* Search', 'cat-ai', 'tinggi', 'todo', $tomorrowStr, 'Implementasikan algoritma pencarian A* dalam bahasa Python untuk mencari rute terpendek dari peta simulasi.', $attachment1, $subtasks1, 'stud-1', '2026-06-07T10:00:00.000Z', NULL]);
        $stmt->execute(['task-2', 'Normalisasi Database E-Commerce', 'cat-db', 'sedang', 'inprogress', $threeDaysStr, 'Lakukan proses normalisasi database untuk model transaksi e-commerce hingga bentuk 3NF.', '[]', $subtasks2, 'stud-1', '2026-06-06T14:30:00.000Z', NULL]);
        $stmt->execute(['task-3', 'Dokumen SRS (Software Requirement Specification)', 'cat-rpl', 'tinggi', 'todo', $yesterdayStr, 'Susun dokumen SRS proyek kelompok sistem informasi perpustakaan menggunakan standar IEEE 830.', '[]', '[]', 'stud-1', '2026-06-05T09:00:00.000Z', NULL]);
        $stmt->execute(['task-4', 'Laporan Praktikum Subnetting VLSM', 'cat-jarkom', 'rendah', 'done', $fourDaysAgoStr, 'Selesaikan laporan praktikum perhitungan subnetting IP Address dengan metode VLSM.', $attachment4, '[]', 'stud-1', '2026-06-03T08:00:00.000Z', '2026-06-07T18:00:00.000Z']);
        $stmt->execute(['task-5', 'Latihan Soal Probabilitas', 'cat-ai', 'sedang', 'done', $yesterdayStr, 'Menyelesaikan 10 soal latihan probabilitas Bayes Theorem.', '[]', '[]', 'stud-1', '2026-06-01T09:00:00.000Z', '2026-06-05T15:00:00.000Z']);
        $stmt->execute(['task-6', 'Review Jurnal RPL', 'cat-rpl', 'rendah', 'done', $yesterdayStr, 'Review jurnal internasional mengenai Agile methodology.', '[]', '[]', 'stud-1', '2026-05-31T11:00:00.000Z', '2026-06-02T16:30:00.000Z']);
        $stmt->execute(['task-7', 'Implementasi Query Optimization', 'cat-db', 'tinggi', 'done', $yesterdayStr, 'Optimasi performa query database dengan index.', '[]', '[]', 'stud-1', '2026-05-26T10:00:00.000Z', '2026-05-29T14:00:00.000Z']);
        $stmt->execute(['task-8', 'Tugas Kelompok Jaringan Nirkabel', 'cat-jarkom', 'sedang', 'done', $yesterdayStr, 'Makalah perbandingan wifi standards IEEE 802.11.', '[]', '[]', 'stud-1', '2026-05-24T09:00:00.000Z', '2026-05-28T11:00:00.000Z']);
        $stmt->execute(['task-9', 'Desain UI/UX StudyFlow', 'cat-rpl', 'tinggi', 'done', $yesterdayStr, 'Membuat mockup hi-fi dengan Figma.', '[]', '[]', 'stud-1', '2026-05-18T10:00:00.000Z', '2026-05-22T17:00:00.000Z']);
        $stmt->execute(['task-10', 'Kuis AI DFS & BFS', 'cat-ai', 'tinggi', 'done', $yesterdayStr, 'Kuis online di e-learning.', '[]', '[]', 'stud-1', '2026-05-19T08:00:00.000Z', '2026-05-20T09:30:00.000Z']);
        $stmt->execute(['task-11', 'Analisis Kebutuhan Sistem', 'cat-rpl', 'sedang', 'done', $yesterdayStr, 'Studi kasus SRS kebutuhan fungsional.', '[]', '[]', 'stud-1', '2026-05-10T14:00:00.000Z', '2026-05-13T16:00:00.000Z']);

        // Seed announcements
        $pdo->exec("INSERT INTO announcements (id, title, content, date, author) VALUES 
        ('ann-1', 'Jadwal Ujian Akhir Semester (UAS)', 'UAS akan dimulai tanggal 15 Juni 2026. Harap persiapkan kartu ujian Anda.', '2026-06-07', 'Dr. Budi Santoso')");

        // Seed sticky notes
        $now = gmdate('Y-m-d\TH:i:s.000\Z');
        $pdo->exec("INSERT INTO sticky_notes (id, studentId, content, color, createdAt) VALUES
        ('note-1', 'stud-1', 'Cari bahan materi AI untuk presentasi kelompok hari Kamis.', '#fef08a', '$now'),
        ('note-2', 'stud-1', 'Beli buku referensi basis data di koperasi mahasiswa.', '#bbf7d0', '$now'),
        ('note-3', 'stud-1', 'Siapkan daftar pertanyaan untuk sesi asistensi RPL.', '#bfdbfe', '$now')");
    }

} catch (PDOException $e) {
    header('Content-Type: application/json', true, 500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

$request_method = $_SERVER['REQUEST_METHOD'];
$request_uri = $_SERVER['REQUEST_URI'];

// Strip query string
if (($pos = strpos($request_uri, '?')) !== false) {
    $request_uri = substr($request_uri, 0, $pos);
}

// Extract path relative to /api
$api_pos = strpos($request_uri, '/api');
if ($api_pos !== false) {
    $path = substr($request_uri, $api_pos + 4);
} else {
    $path = $request_uri;
}

// Normalize route path
$path = '/' . trim($path, '/');

// Helper to retrieve request JSON body
function getJsonBody() {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?: [];
}

header('Content-Type: application/json');

function sendJson($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function sendError($message, $status = 500) {
    sendJson(['success' => false, 'error' => $message, 'message' => $message], $status);
}

// Router dispatching
if ($path === '/auth/login' && $request_method === 'POST') {
    $body = getJsonBody();
    $email = isset($body['email']) ? strtolower($body['email']) : '';
    $password = isset($body['password']) ? $body['password'] : '';
    
    $stmt = $pdo->prepare("SELECT * FROM users WHERE LOWER(email) = ? AND password = ?");
    $stmt->execute([$email, $password]);
    $user = $stmt->fetch();
    if ($user) {
        sendJson(['success' => true, 'user' => $user]);
    } else {
        sendJson(['success' => false, 'message' => 'Email atau password salah.'], 401);
    }
}

elseif ($path === '/auth/register' && $request_method === 'POST') {
    $body = getJsonBody();
    $name = $body['name'] ?? '';
    $nim = $body['nim'] ?? '';
    $prodi = $body['prodi'] ?? '';
    $email = isset($body['email']) ? strtolower($body['email']) : '';
    $password = $body['password'] ?? '';
    $role = $body['role'] ?? 'student';
    
    $stmt = $pdo->prepare("SELECT id FROM users WHERE LOWER(email) = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        sendJson(['success' => false, 'message' => 'Email sudah terdaftar.'], 400);
    }
    
    $id = 'user-' . round(microtime(true) * 1000);
    $avatar = 'https://api.dicebear.com/7.x/adventurer/svg?seed=' . rawurlencode($name);
    
    $stmt = $pdo->prepare("INSERT INTO users (id, email, password, name, nim, prodi, role, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$id, $email, $password, $name, $nim, $prodi, $role, $avatar]);
    
    sendJson(['success' => true, 'user' => [
        'id' => $id, 'email' => $email, 'name' => $name, 'nim' => $nim, 'prodi' => $prodi, 'role' => $role, 'avatar' => $avatar
    ]]);
}

elseif ($path === '/profile' && $request_method === 'PUT') {
    $body = getJsonBody();
    $userId = $body['userId'] ?? '';
    $name = $body['name'] ?? '';
    $nim = $body['nim'] ?? '';
    $prodi = $body['prodi'] ?? '';
    $email = $body['email'] ?? '';
    $avatar = $body['avatar'] ?? '';
    
    $stmt = $pdo->prepare("UPDATE users SET name = ?, nim = ?, prodi = ?, email = ?, avatar = ? WHERE id = ?");
    $stmt->execute([$name, $nim, $prodi, $email, $avatar, $userId]);
    
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    
    sendJson(['success' => true, 'user' => $user]);
}

elseif ($path === '/students' && $request_method === 'GET') {
    $stmt = $pdo->query("SELECT id, name, nim, prodi, role, avatar FROM users WHERE role = 'student'");
    sendJson($stmt->fetchAll());
}

elseif ($path === '/categories' && $request_method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM categories");
    sendJson($stmt->fetchAll());
}

elseif ($path === '/categories' && $request_method === 'POST') {
    $body = getJsonBody();
    $name = $body['name'] ?? '';
    $color = $body['color'] ?? '';
    
    $stmt = $pdo->prepare("SELECT id FROM categories WHERE LOWER(name) = ?");
    $stmt->execute([strtolower($name)]);
    if ($stmt->fetch()) {
        sendJson(['success' => false, 'message' => 'Kategori sudah ada.'], 400);
    }
    
    $id = 'cat-' . round(microtime(true) * 1000);
    $stmt = $pdo->prepare("INSERT INTO categories (id, name, color) VALUES (?, ?, ?)");
    $stmt->execute([$id, $name, $color]);
    
    sendJson(['success' => true, 'category' => ['id' => $id, 'name' => $name, 'color' => $color]]);
}

elseif (preg_match('#^/categories/([^/]+)$#', $path, $matches) && $request_method === 'DELETE') {
    $catId = $matches[1];
    $stmt = $pdo->prepare("DELETE FROM categories WHERE id = ?");
    $stmt->execute([$catId]);
    sendJson(['success' => true]);
}

elseif ($path === '/announcements' && $request_method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM announcements ORDER BY date DESC, id DESC");
    sendJson($stmt->fetchAll());
}

elseif ($path === '/announcements' && $request_method === 'POST') {
    $body = getJsonBody();
    $title = $body['title'] ?? '';
    $content = $body['content'] ?? '';
    $author = $body['author'] ?? '';
    
    $id = 'ann-' . round(microtime(true) * 1000);
    $dateStr = date('Y-m-d');
    
    $stmt = $pdo->prepare("INSERT INTO announcements (id, title, content, date, author) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$id, $title, $content, $dateStr, $author]);
    
    sendJson(['id' => $id, 'title' => $title, 'content' => $content, 'date' => $dateStr, 'author' => $author]);
}

elseif ($path === '/notes' && $request_method === 'GET') {
    $userId = $_GET['userId'] ?? '';
    $stmt = $pdo->prepare("SELECT * FROM sticky_notes WHERE studentId = ? ORDER BY createdAt DESC");
    $stmt->execute([$userId]);
    sendJson($stmt->fetchAll());
}

elseif ($path === '/notes' && $request_method === 'POST') {
    $body = getJsonBody();
    $studentId = $body['studentId'] ?? '';
    $content = $body['content'] ?? '';
    $color = $body['color'] ?? '#fef08a';
    
    $id = 'note-' . round(microtime(true) * 1000);
    $createdAt = gmdate('Y-m-d\TH:i:s.000\Z');
    
    $stmt = $pdo->prepare("INSERT INTO sticky_notes (id, studentId, content, color, createdAt) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$id, $studentId, $content, $color, $createdAt]);
    
    sendJson(['id' => $id, 'studentId' => $studentId, 'content' => $content, 'color' => $color, 'createdAt' => $createdAt]);
}

elseif (preg_match('#^/notes/([^/]+)$#', $path, $matches) && $request_method === 'PUT') {
    $noteId = $matches[1];
    $body = getJsonBody();
    
    $updates = [];
    $values = [];
    if (array_key_exists('content', $body)) { $updates[] = 'content = ?'; $values[] = $body['content']; }
    if (array_key_exists('color', $body)) { $updates[] = 'color = ?'; $values[] = $body['color']; }
    
    if (count($updates) > 0) {
        $values[] = $noteId;
        $sql = "UPDATE sticky_notes SET " . implode(', ', $updates) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
    }
    
    $stmt = $pdo->prepare("SELECT * FROM sticky_notes WHERE id = ?");
    $stmt->execute([$noteId]);
    sendJson($stmt->fetch());
}

elseif (preg_match('#^/notes/([^/]+)$#', $path, $matches) && $request_method === 'DELETE') {
    $noteId = $matches[1];
    $stmt = $pdo->prepare("DELETE FROM sticky_notes WHERE id = ?");
    $stmt->execute([$noteId]);
    sendJson(['success' => true]);
}

elseif ($path === '/tasks' && $request_method === 'GET') {
    $userId = $_GET['userId'] ?? '';
    $role = $_GET['role'] ?? 'student';
    
    if ($role === 'admin') {
        $stmt = $pdo->query("SELECT * FROM tasks");
        $tasks = $stmt->fetchAll();
    } else {
        $stmt = $pdo->prepare("SELECT * FROM tasks WHERE studentId = ?");
        $stmt->execute([$userId]);
        $tasks = $stmt->fetchAll();
    }
    
    foreach ($tasks as &$t) {
        $t['attachments'] = json_decode($t['attachments'] ?? '[]', true) ?: [];
        $t['subtasks'] = json_decode($t['subtasks'] ?? '[]', true) ?: [];
    }
    
    sendJson($tasks);
}

elseif ($path === '/tasks' && $request_method === 'POST') {
    $body = getJsonBody();
    $title = $body['title'] ?? '';
    $categoryId = $body['categoryId'] ?? null;
    $priority = $body['priority'] ?? '';
    $status = $body['status'] ?? 'todo';
    $dueDate = $body['dueDate'] ?? '';
    $description = $body['description'] ?? '';
    $attachments = $body['attachments'] ?? [];
    $subtasks = $body['subtasks'] ?? [];
    $studentId = $body['studentId'] ?? '';
    
    $id = 'task-' . round(microtime(true) * 1000);
    $attachmentsJson = json_encode($attachments);
    $subtasksJson = json_encode($subtasks);
    $createdAt = gmdate('Y-m-d\TH:i:s.000\Z');
    $completedAt = $status === 'done' ? gmdate('Y-m-d\TH:i:s.000\Z') : null;
    
    $stmt = $pdo->prepare("INSERT INTO tasks (id, title, categoryId, priority, status, dueDate, description, attachments, subtasks, studentId, createdAt, completedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$id, $title, $categoryId, $priority, $status, $dueDate, $description, $attachmentsJson, $subtasksJson, $studentId, $createdAt, $completedAt]);
    
    sendJson([
        'id' => $id, 'title' => $title, 'categoryId' => $categoryId, 'priority' => $priority, 'status' => $status,
        'dueDate' => $dueDate, 'description' => $description, 'attachments' => $attachments, 'subtasks' => $subtasks,
        'studentId' => $studentId, 'createdAt' => $createdAt, 'completedAt' => $completedAt
    ]);
}

elseif (preg_match('#^/tasks/([^/]+)$#', $path, $matches) && $request_method === 'PUT') {
    $taskId = $matches[1];
    $body = getJsonBody();
    
    $updates = [];
    $values = [];
    if (array_key_exists('title', $body)) { $updates[] = 'title = ?'; $values[] = $body['title']; }
    if (array_key_exists('categoryId', $body)) { $updates[] = 'categoryId = ?'; $values[] = $body['categoryId'] ?: null; }
    if (array_key_exists('priority', $body)) { $updates[] = 'priority = ?'; $values[] = $body['priority']; }
    if (array_key_exists('status', $body)) { 
        $updates[] = 'status = ?'; $values[] = $body['status']; 
        $updates[] = 'completedAt = ?'; $values[] = $body['status'] === 'done' ? gmdate('Y-m-d\TH:i:s.000\Z') : null;
    }
    if (array_key_exists('dueDate', $body)) { $updates[] = 'dueDate = ?'; $values[] = $body['dueDate']; }
    if (array_key_exists('description', $body)) { $updates[] = 'description = ?'; $values[] = $body['description']; }
    if (array_key_exists('attachments', $body)) { $updates[] = 'attachments = ?'; $values[] = json_encode($body['attachments']); }
    if (array_key_exists('subtasks', $body)) { $updates[] = 'subtasks = ?'; $values[] = json_encode($body['subtasks']); }
    
    if (count($updates) > 0) {
        $values[] = $taskId;
        $sql = "UPDATE tasks SET " . implode(', ', $updates) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
    }
    
    $stmt = $pdo->prepare("SELECT * FROM tasks WHERE id = ?");
    $stmt->execute([$taskId]);
    $task = $stmt->fetch();
    if ($task) {
        $task['attachments'] = json_decode($task['attachments'] ?? '[]', true) ?: [];
        $task['subtasks'] = json_decode($task['subtasks'] ?? '[]', true) ?: [];
    }
    sendJson($task);
}

elseif (preg_match('#^/tasks/([^/]+)$#', $path, $matches) && $request_method === 'DELETE') {
    $taskId = $matches[1];
    $stmt = $pdo->prepare("DELETE FROM tasks WHERE id = ?");
    $stmt->execute([$taskId]);
    sendJson(['success' => true]);
}

else {
    sendJson(['error' => 'Endpoint not found', 'path' => $path], 404);
}
