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

// Smart Server Detection: Local vs Production (InfinityFree)
$is_localhost = in_array($_SERVER['SERVER_NAME'], ['localhost', '127.0.0.1', '::1']);

if ($is_localhost) {
    // MySQL configuration (local XAMPP)
    $host = '127.0.0.1';
    $user = 'root';
    $password = '';
    $dbname = 'studyflow';
} else {
    // MySQL configuration (InfinityFree Production)
    $host = 'sql110.infinityfree.com';
    $user = 'if0_42281786';
    $password = 'riel2323';
    $dbname = 'if0_42281786_studyflow';
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

    $pdo->exec("CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        categoryId VARCHAR(50),
        priority VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL,
        dueDate VARCHAR(50),
        description TEXT,
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
    


    // --- NEW TABLES ---
    $pdo->exec("CREATE TABLE IF NOT EXISTS subtasks (
        id VARCHAR(50) PRIMARY KEY,
        taskId VARCHAR(50) NOT NULL,
        title TEXT NOT NULL,
        isCompleted TINYINT(1) DEFAULT 0,
        FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS task_attachments (
        id VARCHAR(50) PRIMARY KEY,
        taskId VARCHAR(50) NOT NULL,
        fileName VARCHAR(255) NOT NULL,
        fileSize INT NOT NULL,
        fileType VARCHAR(100),
        fileUrl TEXT,
        createdAt VARCHAR(50),
        FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(50) PRIMARY KEY,
        studentId VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT,
        type VARCHAR(20) DEFAULT 'info',
        isRead TINYINT(1) DEFAULT 0,
        createdAt VARCHAR(50),
        FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE
    )");

    // --- AUTOMATIC MIGRATION SCRIPT ---
    // If the 'tasks' table still has the 'subtasks' JSON column, we migrate it then drop it.
    try {
        $colCheck = $pdo->query("SHOW COLUMNS FROM tasks LIKE 'subtasks'");
        if ($colCheck->rowCount() > 0) {
            $legacyTasks = $pdo->query("SELECT id, subtasks, attachments FROM tasks")->fetchAll();
            foreach ($legacyTasks as $lt) {
                $tId = $lt['id'];
                
                // Migrate subtasks
                if (!empty($lt['subtasks']) && $lt['subtasks'] !== '[]') {
                    $subs = json_decode($lt['subtasks'], true);
                    if (is_array($subs)) {
                        foreach ($subs as $sub) {
                            $subId = $sub['id'] ?? ('sub-' . uniqid());
                            $title = $sub['title'] ?? '';
                            $isComp = !empty($sub['isCompleted']) ? 1 : 0;
                            
                            $stmt = $pdo->prepare("INSERT IGNORE INTO subtasks (id, taskId, title, isCompleted) VALUES (?, ?, ?, ?)");
                            $stmt->execute([$subId, $tId, $title, $isComp]);
                        }
                    }
                }
                
                // Migrate attachments
                if (!empty($lt['attachments']) && $lt['attachments'] !== '[]') {
                    $atts = json_decode($lt['attachments'], true);
                    if (is_array($atts)) {
                        foreach ($atts as $att) {
                            $attId = 'att-' . uniqid();
                            $name = $att['name'] ?? '';
                            $size = (int)($att['size'] ?? 0);
                            $type = $att['type'] ?? '';
                            $date = $att['date'] ?? gmdate('Y-m-d\TH:i:s.000\Z');
                            
                            $stmt = $pdo->prepare("INSERT IGNORE INTO task_attachments (id, taskId, fileName, fileSize, fileType, createdAt) VALUES (?, ?, ?, ?, ?, ?)");
                            $stmt->execute([$attId, $tId, $name, $size, $type, $date]);
                        }
                    }
                }
            }
            
            // Drop legacy JSON columns
            $pdo->exec("ALTER TABLE tasks DROP COLUMN subtasks, DROP COLUMN attachments");
        }
    } catch (Exception $em) {
        // Ignore if already dropped
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
    $password = $body['password'] ?? '';
    
    if ($password !== '') {
        $stmt = $pdo->prepare("UPDATE users SET name = ?, nim = ?, prodi = ?, email = ?, avatar = ?, password = ? WHERE id = ?");
        $stmt->execute([$name, $nim, $prodi, $email, $avatar, $password, $userId]);
    } else {
        $stmt = $pdo->prepare("UPDATE users SET name = ?, nim = ?, prodi = ?, email = ?, avatar = ? WHERE id = ?");
        $stmt->execute([$name, $nim, $prodi, $email, $avatar, $userId]);
    }
    
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

// --- TASKS API MODIFIED FOR NEW TABLES ---

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
    
    // Fetch related subtasks and attachments
    $stmtSub = $pdo->query("SELECT * FROM subtasks");
    $allSubs = $stmtSub->fetchAll();
    
    $stmtAtt = $pdo->query("SELECT * FROM task_attachments");
    $allAtts = $stmtAtt->fetchAll();
    
    foreach ($tasks as &$t) {
        $tId = $t['id'];
        
        $tSubs = array_filter($allSubs, function($s) use ($tId) { return $s['taskId'] === $tId; });
        // Format to match old JSON
        $t['subtasks'] = array_values(array_map(function($s) {
            return [
                'id' => $s['id'],
                'title' => $s['title'],
                'isCompleted' => (bool)$s['isCompleted']
            ];
        }, $tSubs));
        
        $tAtts = array_filter($allAtts, function($a) use ($tId) { return $a['taskId'] === $tId; });
        $t['attachments'] = array_values(array_map(function($a) {
            return [
                'id' => $a['id'],
                'name' => $a['fileName'],
                'size' => $a['fileSize'],
                'type' => $a['fileType'],
                'date' => $a['createdAt']
            ];
        }, $tAtts));
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
    $studentId = $body['studentId'] ?? '';
    
    $id = 'task-' . round(microtime(true) * 1000);
    $createdAt = gmdate('Y-m-d\TH:i:s.000\Z');
    $completedAt = $status === 'done' ? gmdate('Y-m-d\TH:i:s.000\Z') : null;
    
    $stmt = $pdo->prepare("INSERT INTO tasks (id, title, categoryId, priority, status, dueDate, description, studentId, createdAt, completedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$id, $title, $categoryId, $priority, $status, $dueDate, $description, $studentId, $createdAt, $completedAt]);
    
    // Insert subtasks
    $subtasks = $body['subtasks'] ?? [];
    foreach ($subtasks as $sub) {
        $sId = $sub['id'] ?? ('sub-' . uniqid());
        $sTitle = $sub['title'] ?? '';
        $sComp = !empty($sub['isCompleted']) ? 1 : 0;
        $pdo->prepare("INSERT INTO subtasks (id, taskId, title, isCompleted) VALUES (?, ?, ?, ?)")->execute([$sId, $id, $sTitle, $sComp]);
    }
    
    // Insert attachments
    $attachments = $body['attachments'] ?? [];
    foreach ($attachments as $att) {
        $aId = $att['id'] ?? ('att-' . uniqid());
        $aName = $att['name'] ?? '';
        $aSize = (int)($att['size'] ?? 0);
        $aType = $att['type'] ?? '';
        $aDate = $att['date'] ?? gmdate('Y-m-d\TH:i:s.000\Z');
        $pdo->prepare("INSERT INTO task_attachments (id, taskId, fileName, fileSize, fileType, createdAt) VALUES (?, ?, ?, ?, ?, ?)")->execute([$aId, $id, $aName, $aSize, $aType, $aDate]);
    }
    
    // Fetch fresh to return
    $t = [
        'id' => $id, 'title' => $title, 'categoryId' => $categoryId, 'priority' => $priority, 'status' => $status,
        'dueDate' => $dueDate, 'description' => $description, 'studentId' => $studentId, 'createdAt' => $createdAt, 'completedAt' => $completedAt,
        'subtasks' => $subtasks, 'attachments' => $attachments
    ];
    sendJson($t);
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
    
    if (count($updates) > 0) {
        $values[] = $taskId;
        $sql = "UPDATE tasks SET " . implode(', ', $updates) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
    }
    
    // Update subtasks (full replace for simplicity)
    if (array_key_exists('subtasks', $body)) {
        $pdo->prepare("DELETE FROM subtasks WHERE taskId = ?")->execute([$taskId]);
        foreach ($body['subtasks'] as $sub) {
            $sId = $sub['id'] ?? ('sub-' . uniqid());
            $sTitle = $sub['title'] ?? '';
            $sComp = !empty($sub['isCompleted']) ? 1 : 0;
            $pdo->prepare("INSERT INTO subtasks (id, taskId, title, isCompleted) VALUES (?, ?, ?, ?)")->execute([$sId, $taskId, $sTitle, $sComp]);
        }
    }
    
    // Update attachments (full replace for simplicity)
    if (array_key_exists('attachments', $body)) {
        $pdo->prepare("DELETE FROM task_attachments WHERE taskId = ?")->execute([$taskId]);
        foreach ($body['attachments'] as $att) {
            $aId = $att['id'] ?? ('att-' . uniqid());
            $aName = $att['name'] ?? '';
            $aSize = (int)($att['size'] ?? 0);
            $aType = $att['type'] ?? '';
            $aDate = $att['date'] ?? gmdate('Y-m-d\TH:i:s.000\Z');
            $pdo->prepare("INSERT INTO task_attachments (id, taskId, fileName, fileSize, fileType, createdAt) VALUES (?, ?, ?, ?, ?, ?)")->execute([$aId, $taskId, $aName, $aSize, $aType, $aDate]);
        }
    }
    
    // Refetch the full task
    $stmt = $pdo->prepare("SELECT * FROM tasks WHERE id = ?");
    $stmt->execute([$taskId]);
    $task = $stmt->fetch();
    if ($task) {
        $task['subtasks'] = array_key_exists('subtasks', $body) ? $body['subtasks'] : []; // Simplified mapping
        $task['attachments'] = array_key_exists('attachments', $body) ? $body['attachments'] : [];
    }
    sendJson($task);
}

elseif (preg_match('#^/tasks/([^/]+)$#', $path, $matches) && $request_method === 'DELETE') {
    $taskId = $matches[1];
    $stmt = $pdo->prepare("DELETE FROM tasks WHERE id = ?");
    $stmt->execute([$taskId]);
    sendJson(['success' => true]);
}

// --- NOTIFICATIONS API ---

elseif ($path === '/notifications' && $request_method === 'GET') {
    $userId = $_GET['userId'] ?? '';
    $stmt = $pdo->prepare("SELECT * FROM notifications WHERE studentId = ? ORDER BY createdAt DESC");
    $stmt->execute([$userId]);
    $notifs = $stmt->fetchAll();
    
    // Normalize output for frontend (which expects 'taskId' or 'time' logic)
    foreach ($notifs as &$n) {
        $n['isRead'] = (bool)$n['isRead'];
        $n['time'] = $n['createdAt'];
    }
    sendJson($notifs);
}

elseif ($path === '/notifications' && $request_method === 'POST') {
    $body = getJsonBody();
    $studentId = $body['studentId'] ?? '';
    $title = $body['title'] ?? '';
    $message = $body['message'] ?? '';
    $type = $body['type'] ?? 'info';
    
    $id = 'notif-' . round(microtime(true) * 1000);
    $createdAt = gmdate('Y-m-d\TH:i:s.000\Z');
    
    $stmt = $pdo->prepare("INSERT INTO notifications (id, studentId, title, message, type, isRead, createdAt) VALUES (?, ?, ?, ?, ?, 0, ?)");
    $stmt->execute([$id, $studentId, $title, $message, $type, $createdAt]);
    
    sendJson(['success' => true]);
}

elseif (preg_match('#^/notifications/([^/]+)/read$#', $path, $matches) && $request_method === 'PUT') {
    $notifId = $matches[1];
    $stmt = $pdo->prepare("UPDATE notifications SET isRead = 1 WHERE id = ?");
    $stmt->execute([$notifId]);
    sendJson(['success' => true]);
}

elseif ($path === '/notifications/clear' && $request_method === 'DELETE') {
    $body = getJsonBody();
    $userId = $body['userId'] ?? '';
    $stmt = $pdo->prepare("DELETE FROM notifications WHERE studentId = ?");
    $stmt->execute([$userId]);
    sendJson(['success' => true]);
}

elseif (preg_match('#^/notifications/([^/]+)$#', $path, $matches) && $request_method === 'DELETE') {
    $notifId = $matches[1];
    $stmt = $pdo->prepare("DELETE FROM notifications WHERE id = ?");
    $stmt->execute([$notifId]);
    sendJson(['success' => true]);
}

else {
    sendJson(['error' => 'Endpoint not found', 'path' => $path], 404);
}

