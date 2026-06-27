import { stateManager } from './state.js';

// Simple toast for login page
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info'}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  lucide.createIcons();

  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10);

  setTimeout(() => {
    toast.style.transform = 'translateX(120%)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect to index
  if (stateManager.getCurrentUser()) {
    window.location.href = 'index.html';
    return;
  }

  lucide.createIcons();

  const loginView = document.getElementById('login-view');
  const registerView = document.getElementById('register-view');

  const toggleToRegister = document.getElementById('toggle-to-register');
  if (toggleToRegister) {
    toggleToRegister.addEventListener('click', (e) => {
      e.preventDefault();
      loginView.classList.add('hidden');
      registerView.classList.remove('hidden');
    });
  }

  const toggleToLogin = document.getElementById('toggle-to-login');
  if (toggleToLogin) {
    toggleToLogin.addEventListener('click', (e) => {
      e.preventDefault();
      registerView.classList.add('hidden');
      loginView.classList.remove('hidden');
    });
  }

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      
      const res = await stateManager.login(email, password);
      if (res.success) {
        showToast('Login berhasil! Mengalihkan...', 'success');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1000);
      } else {
        showToast(res.message, 'error');
      }
    });
  }

  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value;
      const nim = document.getElementById('reg-nim').value;
      const prodi = document.getElementById('reg-prodi').value;
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;

      const res = await stateManager.register(name, nim, prodi, email, password, 'student');
      if (res.success) {
        showToast('Pendaftaran berhasil! Silakan masuk.', 'success');
        registerView.classList.add('hidden');
        loginView.classList.remove('hidden');
        document.getElementById('login-email').value = email;
      } else {
        showToast(res.message || 'Pendaftaran gagal.', 'error');
      }
    });
  }

  // Password Visibility Toggle Logic
  const setupPasswordToggle = (inputId) => {
    const passwordInput = document.getElementById(inputId);
    if (passwordInput) {
      const wrapper = passwordInput.closest('.input-wrapper');
      if (wrapper) {
        wrapper.addEventListener('click', (e) => {
          const toggleIcon = e.target.closest('.toggle-password');
          if (toggleIcon) {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Update icon based on state
            if (type === 'text') {
              toggleIcon.setAttribute('data-lucide', 'eye-off');
            } else {
              toggleIcon.setAttribute('data-lucide', 'eye');
            }
            lucide.createIcons();
          }
        });
      }
    }
  };

  setupPasswordToggle('login-password');
  setupPasswordToggle('reg-password');

  // Theme toggle logic for login page
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  if (themeToggleBtn) {
    const currentTheme = localStorage.getItem('studyflow_theme') || 'light';
    if (currentTheme === 'dark') {
      themeToggleBtn.innerHTML = '<i data-lucide="sun"></i>';
    }
    
    themeToggleBtn.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('studyflow_theme', 'light');
        themeToggleBtn.innerHTML = '<i data-lucide="moon"></i>';
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('studyflow_theme', 'dark');
        themeToggleBtn.innerHTML = '<i data-lucide="sun"></i>';
      }
      lucide.createIcons();
    });
  }
});
