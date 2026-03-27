// Глобальные переменные
let currentUser = null;
let projects = [];
let tasks = [];
let teamMembers = [];
let currentEditProjectId = null;

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем авторизацию
    checkAuth();
    
    // Инициализируем обработчики событий только если элементы существуют
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});

// Проверка авторизации
function checkAuth() {
    const user = localStorage.getItem('user');
    
    if (!user) {
        // Если пользователь не авторизован, перенаправляем на страницу входа
        window.location.href = '/login.html';
        return;
    }
    
    try {
        currentUser = JSON.parse(user);
        
        // Обновляем информацию о пользователе в интерфейсе
        const currentUserElement = document.getElementById('currentUser');
        const currentRoleElement = document.getElementById('currentRole');
        
        if (currentUserElement && currentRoleElement) {
            currentUserElement.textContent = currentUser.username;
            currentRoleElement.textContent = currentUser.role === 'manager' ? 'Менеджер' : 'Участник';
        }
        
        // Показываем главный экран
        const mainScreen = document.getElementById('mainScreen');
        if (mainScreen) {
            mainScreen.classList.add('active');
        }
        
        // Загружаем данные
        loadProjects();
        loadTasks();
        loadTeam();
        loadStats();
        
        // Показываем дашборд
        showDashboard();
    } catch (error) {
        console.error('Ошибка парсинга данных пользователя:', error);
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    }
}

// === АУТЕНТИФИКАЦИЯ ===
// Авторизация теперь происходит на странице login.html

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('user');
    
    // Перенаправляем на страницу входа
    window.location.href = '/login.html';
}

// === НАВИГАЦИЯ ===
function showDashboard() {
    showContent('dashboardContent');
    setActiveNav('dashboardNav');
    loadStats();
}

function showProjects() {
    showContent('projectsContent');
    setActiveNav('projectsNav');
    loadProjects();
}

function showTasks() {
    showContent('tasksContent');
    setActiveNav('tasksNav');
    loadTasks();
}

function showTeam() {
    showContent('teamContent');
    setActiveNav('teamNav');
    loadTeam();
}

function showContent(contentId) {
    document.querySelectorAll('.content').forEach(el => {
        el.classList.remove('active');
    });
    document.getElementById(contentId).classList.add('active');
}

function setActiveNav(navId) {
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active');
    });
    document.getElementById(navId).classList.add('active');
}

// === ПРОЕКТЫ ===
async function loadProjects() {
    try {
        const response = await fetch('/api/projects');
        projects = await response.json();
        renderProjects();
    } catch (error) {
        console.error('Ошибка загрузки проектов:', error);
    }
}

function renderProjects() {
    const projectsList = document.getElementById('projectsList');
    const searchValue = document.getElementById('projectSearch')?.value?.toLowerCase() || '';
    
    let filteredProjects = projects;
    if (searchValue) {
        filteredProjects = projects.filter(p => 
            p.name.toLowerCase().includes(searchValue) || 
            (p.description && p.description.toLowerCase().includes(searchValue))
        );
    }
    
    if (filteredProjects.length === 0) {
        projectsList.innerHTML = '<div class="empty-state"><p>Нет проектов</p></div>';
        return;
    }
    
    projectsList.innerHTML = filteredProjects.map(project => `
        <div class="project-card">
            <h3>${project.name}</h3>
            <p>${project.description || 'Нет описания'}</p>
            <span class="project-status status-${project.status}">${getStatusText(project.status)}</span>
            <div class="project-meta">
                <p>Менеджер: ${project.manager_name}</p>
                <p>Срок: ${project.due_date ? new Date(project.due_date).toLocaleDateString('ru-RU') : 'Не указан'}</p>
            </div>
            <div class="project-actions">
                <button class="btn btn-primary btn-small" onclick="openEditProjectModal(${project.id})">Редактировать</button>
                <button class="btn btn-danger" onclick="deleteProject(${project.id})">Удалить</button>
            </div>
        </div>
    `).join('');
}

function filterProjects() {
    renderProjects();
}

function showCreateProjectModal() {
    document.getElementById('createProjectModal').classList.add('active');
}

async function createProject(e) {
    e.preventDefault();
    
    const name = document.getElementById('projectName').value;
    const description = document.getElementById('projectDescription').value;
    const due_date = document.getElementById('projectDueDate').value;
    
    try {
        const response = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                description,
                manager_id: currentUser.id,
                due_date
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeModal('createProjectModal');
            document.getElementById('createProjectForm').reset();
            loadProjects();
            showSuccessMessage('Проект создан успешно!');
        } else {
            showErrorMessage('Ошибка при создании проекта');
        }
    } catch (error) {
        console.error('Ошибка создания проекта:', error);
        showErrorMessage('Ошибка при создании проекта');
    }
}

// === РЕДАКТИРОВАНИЕ ПРОЕКТА ===
function openEditProjectModal(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    currentEditProjectId = projectId;
    
    document.getElementById('editProjectName').value = project.name;
    document.getElementById('editProjectDescription').value = project.description || '';
    document.getElementById('editProjectStatus').value = project.status;
    document.getElementById('editProjectDueDate').value = project.due_date || '';
    
    document.getElementById('editProjectModal').classList.add('active');
}

async function updateProject(e) {
    e.preventDefault();
    
    if (!currentEditProjectId) return;
    
    const name = document.getElementById('editProjectName').value;
    const description = document.getElementById('editProjectDescription').value;
    const status = document.getElementById('editProjectStatus').value;
    const due_date = document.getElementById('editProjectDueDate').value;
    
    try {
        const response = await fetch(`/api/projects/${currentEditProjectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                description,
                status,
                due_date
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeModal('editProjectModal');
            currentEditProjectId = null;
            loadProjects();
            showSuccessMessage('Проект обновлен успешно!');
        } else {
            showErrorMessage('Ошибка при обновлении проекта');
        }
    } catch (error) {
        console.error('Ошибка обновления проекта:', error);
        showErrorMessage('Ошибка при обновлении проекта');
    }
}

async function deleteProject(id) {
    if (!confirm('Вы уверены?')) return;
    
    try {
        const response = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
        const data = await response.json();
        
        if (data.success) {
            loadProjects();
            showSuccessMessage('Проект удален');
        }
    } catch (error) {
        console.error('Ошибка удаления проекта:', error);
    }
}

// === ЗАДАЧИ ===
async function loadTasks() {
    try {
        const response = await fetch('/api/tasks');
        tasks = await response.json();
        renderTasks();
    } catch (error) {
        console.error('Ошибка загрузки задач:', error);
    }
}

function renderTasks() {
    const tasksList = document.getElementById('tasksList');
    const filterValue = document.getElementById('taskStatusFilter').value;
    const searchValue = document.getElementById('taskSearch')?.value?.toLowerCase() || '';
    
    let filteredTasks = tasks;
    
    // Фильтр по статусу
    if (filterValue) {
        filteredTasks = filteredTasks.filter(t => t.status === filterValue);
    }
    
    // Поиск по названию и описанию
    if (searchValue) {
        filteredTasks = filteredTasks.filter(t => 
            t.title.toLowerCase().includes(searchValue) || 
            (t.description && t.description.toLowerCase().includes(searchValue)) ||
            (t.project_name && t.project_name.toLowerCase().includes(searchValue))
        );
    }
    
    if (filteredTasks.length === 0) {
        tasksList.innerHTML = '<div class="empty-state"><p>Нет задач</p></div>';
        return;
    }
    
    tasksList.innerHTML = filteredTasks.map(task => `
        <div class="task-card">
            <h3>${task.title}</h3>
            <p>${task.description || 'Нет описания'}</p>
            <div class="task-meta">
                <span>Проект: ${task.project_name}</span>
                <span>Исполнитель: ${task.assignee_name || 'Не назначен'}</span>
                <span class="priority-${task.priority}">Приоритет: ${getPriorityText(task.priority)}</span>
            </div>
            <span class="task-status status-${task.status}">${getTaskStatusText(task.status)}</span>
            <p style="font-size: 12px; color: #999; margin-top: 8px;">
                Срок: ${task.due_date ? new Date(task.due_date).toLocaleDateString('ru-RU') : 'Не указан'}
            </p>
            <div class="task-actions">
                <button class="btn btn-success" onclick="updateTaskStatus(${task.id}, 'completed')">Выполнено</button>
                <button class="btn btn-primary" onclick="updateTaskStatus(${task.id}, 'in_progress')">В работе</button>
                <button class="btn btn-danger" onclick="deleteTask(${task.id})">Удалить</button>
            </div>
        </div>
    `).join('');
}

function filterTasks() {
    renderTasks();
}

function showCreateTaskModal() {
    // Заполняем список проектов
    const projectSelect = document.getElementById('taskProject');
    projectSelect.innerHTML = projects.map(p => `
        <option value="${p.id}">${p.name}</option>
    `).join('');
    
    document.getElementById('createTaskModal').classList.add('active');
}

async function createTask(e) {
    e.preventDefault();
    
    const title = document.getElementById('taskTitle').value;
    const description = document.getElementById('taskDescription').value;
    const project_id = document.getElementById('taskProject').value;
    const priority = document.getElementById('taskPriority').value;
    const due_date = document.getElementById('taskDueDate').value;
    
    try {
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title,
                description,
                project_id,
                priority,
                due_date,
                assignee_id: null
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeModal('createTaskModal');
            document.getElementById('createTaskForm').reset();
            loadTasks();
            showSuccessMessage('Задача создана успешно!');
        }
    } catch (error) {
        console.error('Ошибка создания задачи:', error);
        showErrorMessage('Ошибка при создании задачи');
    }
}

async function updateTaskStatus(id, status) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    try {
        const response = await fetch(`/api/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: task.title,
                description: task.description,
                status,
                priority: task.priority,
                assignee_id: task.assignee_id,
                due_date: task.due_date
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            loadTasks();
            loadStats();
            showSuccessMessage('Статус задачи обновлен!');
        }
    } catch (error) {
        console.error('Ошибка обновления задачи:', error);
    }
}

async function deleteTask(id) {
    if (!confirm('Вы уверены?')) return;
    
    try {
        const response = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
        const data = await response.json();
        
        if (data.success) {
            loadTasks();
            showSuccessMessage('Задача удалена');
        }
    } catch (error) {
        console.error('Ошибка удаления задачи:', error);
    }
}

// === КОМАНДА ===
async function loadTeam() {
    try {
        const response = await fetch('/api/team');
        teamMembers = await response.json();
        renderTeam();
    } catch (error) {
        console.error('Ошибка загрузки команды:', error);
    }
}

function renderTeam() {
    const teamList = document.getElementById('teamList');
    
    if (teamMembers.length === 0) {
        teamList.innerHTML = '<div class="empty-state"><p>Нет членов команды</p></div>';
        return;
    }
    
    teamList.innerHTML = teamMembers.map(member => `
        <div class="team-member-card">
            <h3>${member.name}</h3>
            <p>${member.email || 'Email не указан'}</p>
            <span class="team-member-role">${member.role === 'manager' ? 'Менеджер' : 'Участник'}</span>
            <p style="font-size: 12px; color: #999;">
                Присоединился: ${new Date(member.join_date).toLocaleDateString('ru-RU')}
            </p>
            <div class="team-member-actions">
                <button class="btn btn-danger" onclick="deleteTeamMember(${member.id})">Удалить</button>
            </div>
        </div>
    `).join('');
}

function showAddTeamMemberModal() {
    document.getElementById('addTeamMemberModal').classList.add('active');
}

async function addTeamMember(e) {
    e.preventDefault();
    
    const name = document.getElementById('memberName').value;
    const email = document.getElementById('memberEmail').value;
    const role = document.getElementById('memberRole').value;
    
    try {
        const response = await fetch('/api/team', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, role })
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeModal('addTeamMemberModal');
            document.getElementById('addTeamMemberForm').reset();
            loadTeam();
            showSuccessMessage('Член команды добавлен!');
        }
    } catch (error) {
        console.error('Ошибка добавления члена команды:', error);
        showErrorMessage('Ошибка при добавлении члена команды');
    }
}

async function deleteTeamMember(id) {
    if (!confirm('Вы уверены?')) return;
    
    try {
        const response = await fetch(`/api/team/${id}`, { method: 'DELETE' });
        const data = await response.json();
        
        if (data.success) {
            loadTeam();
            showSuccessMessage('Член команды удален');
        }
    } catch (error) {
        console.error('Ошибка удаления члена команды:', error);
    }
}

// === СТАТИСТИКА ===
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        document.getElementById('totalProjects').textContent = stats.total_projects || 0;
        document.getElementById('activeProjects').textContent = stats.active_projects || 0;
        document.getElementById('totalTasks').textContent = stats.total_tasks || 0;
        document.getElementById('completedTasks').textContent = stats.completed_tasks || 0;
        document.getElementById('inProgressTasks').textContent = stats.in_progress_tasks || 0;
        document.getElementById('teamMembers').textContent = stats.team_members || 0;
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

// === МОДАЛЬНЫЕ ОКНА ===
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Закрытие модального окна при клике на фон
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
function getStatusText(status) {
    const statuses = {
        'active': 'Активный',
        'completed': 'Завершен',
        'paused': 'На паузе'
    };
    return statuses[status] || status;
}

function getTaskStatusText(status) {
    const statuses = {
        'new': 'Новая',
        'in_progress': 'В работе',
        'completed': 'Выполнена'
    };
    return statuses[status] || status;
}

function getPriorityText(priority) {
    const priorities = {
        'high': 'Высокий',
        'medium': 'Средний',
        'low': 'Низкий'
    };
    return priorities[priority] || priority;
}

// === СООБЩЕНИЯ ===
function showSuccessMessage(message) {
    const existingMessage = document.querySelector('.message-box');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const messageBox = document.createElement('div');
    messageBox.className = 'message-box success';
    messageBox.textContent = message;
    document.body.appendChild(messageBox);
    
    setTimeout(() => {
        messageBox.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        messageBox.classList.remove('show');
        setTimeout(() => messageBox.remove(), 300);
    }, 3000);
}

function showErrorMessage(message) {
    const existingMessage = document.querySelector('.message-box');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const messageBox = document.createElement('div');
    messageBox.className = 'message-box error';
    messageBox.textContent = message;
    document.body.appendChild(messageBox);
    
    setTimeout(() => {
        messageBox.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        messageBox.classList.remove('show');
        setTimeout(() => messageBox.remove(), 300);
    }, 3000);
}

// Добавляем стили для сообщений
const style = document.createElement('style');
style.textContent = `
  .message-box {
    position: fixed;
    top: 100px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    color: white;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  }
  
  .message-box.show {
    opacity: 1;
    transform: translateX(0);
  }
  
  .message-box.success {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
  
  .message-box.error {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  }
`;
document.head.appendChild(style);

// Проверка сохраненного пользователя при загрузке
window.addEventListener('load', () => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        const loginScreen = document.getElementById('loginScreen');
        const mainScreen = document.getElementById('mainScreen');
        if (loginScreen) loginScreen.classList.remove('active');
        if (mainScreen) mainScreen.classList.add('active');
        const currentUserEl = document.getElementById('currentUser');
        const currentRoleEl = document.getElementById('currentRole');
        if (currentUserEl) currentUserEl.textContent = currentUser.username;
        if (currentRoleEl) currentRoleEl.textContent = currentUser.role === 'manager' ? 'Менеджер' : 'Участник';
        loadProjects();
        loadTasks();
        loadTeam();
        loadStats();
    }
});