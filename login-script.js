// DOM элементы
const formOpenBtn = document.querySelector("#form-open");
const home = document.querySelector(".home");
const formContainer = document.querySelector(".form_container");
const formCloseBtn = document.querySelector(".form_close");
const signupBtn = document.querySelector("#signup");
const loginBtn = document.querySelector("#login");
const pwShowHide = document.querySelectorAll(".pw_hide");
const loginForm = document.querySelector("#loginForm");
const signupForm = document.querySelector("#signupForm");

// Открытие/закрытие формы
formOpenBtn.addEventListener("click", () => home.classList.add("show"));
formCloseBtn.addEventListener("click", () => home.classList.remove("show"));

// Переключение видимости пароля
pwShowHide.forEach((icon) => {
  icon.addEventListener("click", () => {
    let getPwInput = icon.parentElement.querySelector("input");
    if (getPwInput.type === "password") {
      getPwInput.type = "text";
      icon.classList.replace("uil-eye-slash", "uil-eye");
    } else {
      getPwInput.type = "password";
      icon.classList.replace("uil-eye", "uil-eye-slash");
    }
  });
});

// Переключение между формами входа и регистрации
signupBtn.addEventListener("click", (e) => {
  e.preventDefault();
  formContainer.classList.add("active");
});

loginBtn.addEventListener("click", (e) => {
  e.preventDefault();
  formContainer.classList.remove("active");
});

// Обработка формы входа
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;
  
  // Проверка заполнения роли
  if (!role) {
    alert("Пожалуйста, выберите роль");
    return;
  }
  
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Сохраняем данные пользователя
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Показываем сообщение об успехе
      showSuccessMessage("Вход выполнен успешно! Перенаправление...");
      
      // Перенаправляем на главную страницу
      setTimeout(() => {
        window.location.href = '/index.html';
      }, 1000);
    } else {
      showErrorMessage(data.message || 'Ошибка входа в систему');
    }
  } catch (error) {
    console.error('Ошибка входа:', error);
    showErrorMessage('Ошибка при подключении к серверу');
  }
});

// Обработка формы регистрации
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const username = document.getElementById("signup-username").value;
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;
  const confirmPassword = document.getElementById("signup-confirm-password").value;
  
  // Проверка совпадения паролей
  if (password !== confirmPassword) {
    showErrorMessage("Пароли не совпадают!");
    return;
  }
  
  // Проверка длины пароля
  if (password.length < 4) {
    showErrorMessage("Пароль должен содержать минимум 4 символа");
    return;
  }
  
  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showSuccessMessage("Регистрация успешна! Теперь вы можете войти");
      
      // Переключаемся на форму входа
      setTimeout(() => {
        formContainer.classList.remove("active");
        signupForm.reset();
      }, 1500);
    } else {
      showErrorMessage(data.message || 'Ошибка регистрации');
    }
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    showErrorMessage('Ошибка при подключении к серверу');
  }
});

// Функция показа сообщения об успехе
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

// Функция показа сообщения об ошибке
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

// Автоматически открываем форму при загрузке страницы
window.addEventListener('load', () => {
  setTimeout(() => {
    home.classList.add('show');
  }, 500);
});
