const express = require('express');
const Database = require('better-sqlite3');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Отдача статических файлов из текущей директории
app.use(express.static(__dirname));

// Редирект с корневого пути на страницу логина
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// Открываем или создаем БД SQLite
const path = require('path');
let db;
try {
  const dbPath = path.join(__dirname, 'startup_manager.db');
  db = new Database(dbPath);
  console.log('✓ Подключено к SQLite базе данных');
  initializeDatabase();
} catch (error) {
  console.error('❌ Ошибка подключения к БД:', error.message);
  // Не убиваем процесс — даём Vercel вернуть ошибку корректно
}
// Инициализация БД
function initializeDatabase() {
  try {
    // Создание таблицы users
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        role TEXT DEFAULT 'participant',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Создание таблицы projects
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'active',
        manager_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        due_date DATE,
        FOREIGN KEY (manager_id) REFERENCES users(id)
      )
    `);

    // Создание таблицы tasks
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'new',
        priority TEXT DEFAULT 'medium',
        project_id INTEGER NOT NULL,
        assignee_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        due_date DATE,
        FOREIGN KEY (project_id) REFERENCES projects(id),
        FOREIGN KEY (assignee_id) REFERENCES users(id)
      )
    `);

    // Создание таблицы team_members
    db.exec(`
      CREATE TABLE IF NOT EXISTS team_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        role TEXT DEFAULT 'participant',
        join_date DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Вставка тестовых данных
    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO users (id, username, password, email, role) 
      VALUES (?, ?, ?, ?, ?)
    `);

    insertUser.run(1, 'admin', '1234', 'admin@example.com', 'manager');
    insertUser.run(2, 'user', '1234', 'user@example.com', 'participant');

    console.log('✓ База данных инициализирована');
  } catch (error) {
    console.error('❌ Ошибка инициализации БД:', error.message);
  }
}

// REST API endpoints

// Вход
app.post('/api/login', (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    const stmt = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?');
    const user = stmt.get(username, password);
    
    if (user) {
      res.json({ success: true, user });
    } else {
      res.json({ success: false, message: 'Неверные учетные данные' });
    }
  } catch (error) {
    res.json({ success: false, message: 'Ошибка БД: ' + error.message });
  }
});

// Получить все проекты
app.get('/api/projects', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT p.*, u.username as manager_name 
      FROM projects p 
      LEFT JOIN users u ON p.manager_id = u.id
      ORDER BY p.created_at DESC
    `);
    const projects = stmt.all();
    res.json(projects);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Получить один проект
app.get('/api/projects/:id', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT p.*, u.username as manager_name 
      FROM projects p 
      LEFT JOIN users u ON p.manager_id = u.id
      WHERE p.id = ?
    `);
    const project = stmt.get(req.params.id);
    res.json(project || {});
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Создать проект
app.post('/api/projects', (req, res) => {
  try {
    const { name, description, manager_id, due_date } = req.body;
    
    const stmt = db.prepare(
      'INSERT INTO projects (name, description, manager_id, due_date) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(name, description, manager_id, due_date);
    
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Обновить проект
app.put('/api/projects/:id', (req, res) => {
  try {
    const { name, description, status, due_date } = req.body;
    
    const stmt = db.prepare(
      'UPDATE projects SET name = ?, description = ?, status = ?, due_date = ? WHERE id = ?'
    );
    stmt.run(name, description, status, due_date, req.params.id);
    
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Удалить проект
app.delete('/api/projects/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Получить все задачи
app.get('/api/tasks', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT t.*, u.username as assignee_name, p.name as project_name
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN projects p ON t.project_id = p.id
      ORDER BY t.created_at DESC
    `);
    const tasks = stmt.all();
    res.json(tasks);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Получить задачи проекта
app.get('/api/projects/:id/tasks', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT t.*, u.username as assignee_name
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.project_id = ?
      ORDER BY t.created_at DESC
    `);
    const tasks = stmt.all(req.params.id);
    res.json(tasks);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Создать задачу
app.post('/api/tasks', (req, res) => {
  try {
    const { title, description, priority, project_id, assignee_id, due_date } = req.body;
    
    const stmt = db.prepare(
      'INSERT INTO tasks (title, description, priority, project_id, assignee_id, due_date) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const result = stmt.run(title, description, priority, project_id, assignee_id, due_date);
    
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Обновить задачу
app.put('/api/tasks/:id', (req, res) => {
  try {
    const { title, description, status, priority, assignee_id, due_date } = req.body;
    
    const stmt = db.prepare(
      'UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, assignee_id = ?, due_date = ? WHERE id = ?'
    );
    stmt.run(title, description, status, priority, assignee_id, due_date, req.params.id);
    
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Удалить задачу
app.delete('/api/tasks/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Получить команду
app.get('/api/team', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM team_members ORDER BY join_date DESC');
    const team = stmt.all();
    res.json(team);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Добавить члена команды
app.post('/api/team', (req, res) => {
  try {
    const { name, email, role } = req.body;
    
    const stmt = db.prepare(
      'INSERT INTO team_members (name, email, role) VALUES (?, ?, ?)'
    );
    const result = stmt.run(name, email, role);
    
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Удалить члена команды
app.delete('/api/team/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM team_members WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Получить статистику
app.get('/api/stats', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM projects) as total_projects,
        (SELECT COUNT(*) FROM projects WHERE status = 'active') as active_projects,
        (SELECT COUNT(*) FROM tasks) as total_tasks,
        (SELECT COUNT(*) FROM tasks WHERE status = 'completed') as completed_tasks,
        (SELECT COUNT(*) FROM tasks WHERE status = 'in_progress') as in_progress_tasks,
        (SELECT COUNT(*) FROM team_members) as team_members
    `);
    const stats = stmt.get();
    res.json(stats || {});
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`✓ Сервер запущен на http://localhost:${PORT}`);
    console.log(`✓ Откройте браузер: http://localhost:${PORT}`);
  });
}

module.exports = app;

// Закрытие БД при выходе
process.on('exit', () => {
  db.close();
});
