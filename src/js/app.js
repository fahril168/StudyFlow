/* StudyFlow Central Application Bootstrapper & Router */

import { stateManager } from './state.js';
import { renderAuth } from './components/auth.js';

// Dom References
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const viewContainer = document.getElementById('view-container');
const pageTitle = document.getElementById('page-title');
const pageSubtitle = document.getElementById('page-subtitle');
const sidebarAvatar = document.getElementById('sidebar-avatar');
const headerAvatar = document.getElementById('header-avatar');
const sidebarUserName = document.getElementById('sidebar-user-name');
const sidebarUserRole = document.getElementById('sidebar-user-role');
const themeToggle = document.getElementById('theme-toggle');
const sidebarToggle = document.getElementById('sidebar-toggle');
const appSidebar = document.getElementById('app-sidebar');
const logoutBtn = document.getElementById('logout-btn');
const notificationBtn = document.getElementById('notification-btn');
const notificationMenu = document.getElementById('notification-menu');
const notificationBadge = document.getElementById('notification-badge');
const notificationList = document.getElementById('notification-list');
const clearNotifications = document.getElementById('clear-notifications');

// View mapping definitions
const viewRoutes = {
  '#dashboard': {
    title: 'Dashboard',
    subtitle: 'Ringkasan tugas, jadwal, dan progres akademis Anda.',
    render: async (container) => {
      const { renderDashboard } = await import('./views/dashboard.js');
      await renderDashboard(container);
    }
  },
  '#tasks': {
    title: 'Manajemen Tugas',
    subtitle: 'Pantau, atur, dan selesaikan tugas-tugas kuliah Anda.',
    render: async (container) => {
      const { renderTasks } = await import('./views/tasks.js');
      await renderTasks(container);
    }
  },
  '#calendar': {
    title: 'Kalender Akademik',
    subtitle: 'Lihat deadline tugas dalam tampilan kalender bulanan.',
    render: async (container) => {
      const { renderCalendar } = await import('./views/calendar.js');
      await renderCalendar(container);
    }
  },
  '#stats': {
    title: 'Statistik Produktivitas',
    subtitle: 'Analisis penyelesaian tugas dan tingkat efektivitas belajar Anda.',
    render: async (container) => {
      const { renderStats } = await import('./views/stats.js');
      await renderStats(container);
    }
  },
  '#profile': {
    title: 'Profil Saya',
    subtitle: 'Kelola informasi pribadi, prodi, dan foto profil Anda.',
    render: async (container) => {
      const { renderProfile } = await import('./views/profile.js');
      await renderProfile(container, navigateTo);
    }
  }
};

// Global Routing function
export function navigateTo(hash) {
  window.location.hash = hash;
}

function checkAuthAndRoute() {
  const user = stateManager.getCurrentUser();

  if (!user) {
    // Show login screen
    appContainer.classList.add('hidden');
    authContainer.classList.remove('hidden');
    renderAuth(authContainer, () => {
      // On success, update layout and load dashboard view
      initAppLayout();
      // Force route evaluation after login (handles case where hash already #dashboard)
      checkAuthAndRoute();
    });
    return;
  }

  // Show app layout
  authContainer.classList.add('hidden');
  appContainer.classList.remove('hidden');

  // Update user info in layout
  sidebarUserName.textContent = user.name;
  sidebarUserRole.textContent = user.role === 'admin' ? 'Administrator' : `Mahasiswa - ${user.nim}`;
  sidebarAvatar.src = user.avatar;
  headerAvatar.src = user.avatar;

  // Handle admin global student selector widget and menu items visibility
  const adminWidget = document.getElementById('sidebar-admin-widget');
  if (adminWidget) {
    if (user.role === 'admin') {
      adminWidget.classList.remove('hidden');
      const globalSelect = document.getElementById('global-student-select');

      // Control visibility of student dependent menus
      const selectedStudentId = stateManager.getSelectedStudentId() || '';
      document.querySelectorAll('.student-dependent-menu').forEach(item => {
        if (selectedStudentId) {
          item.classList.remove('hidden');
        } else {
          item.classList.add('hidden');
        }
      });

      if (globalSelect && globalSelect.options.length <= 1) {
        stateManager.getStudents().then(students => {
          let optionsHtml = '<option value="">-- Pilih Mahasiswa --</option>';
          students.forEach(s => {
            optionsHtml += `<option value="${s.id}">${s.name}</option>`;
          });
          globalSelect.innerHTML = optionsHtml;
          globalSelect.value = stateManager.getSelectedStudentId() || '';

          const globalSelectText = document.getElementById('global-student-select-text');
          if (globalSelectText && globalSelect.selectedIndex >= 0) {
            globalSelectText.textContent = globalSelect.options[globalSelect.selectedIndex].text;
          }
        });
      } else if (globalSelect) {
        globalSelect.value = stateManager.getSelectedStudentId() || '';
        const globalSelectText = document.getElementById('global-student-select-text');
        if (globalSelectText && globalSelect.selectedIndex >= 0) {
          globalSelectText.textContent = globalSelect.options[globalSelect.selectedIndex].text;
        }
      }
    } else {
      adminWidget.classList.add('hidden');
      // For student role, always show dependent menus
      document.querySelectorAll('.student-dependent-menu').forEach(item => {
        item.classList.remove('hidden');
      });
    }
  }

  // Handle routing based on hash
  let hash = window.location.hash;

  // If admin and no student is selected, restrict routing to dashboard and profile
  if (user.role === 'admin' && !stateManager.getSelectedStudentId()) {
    if (hash === '#tasks' || hash === '#calendar' || hash === '#stats') {
      hash = '#dashboard';
      window.location.hash = '#dashboard';
    }
  }

  if (!hash || !viewRoutes[hash]) {
    hash = '#dashboard';
    window.location.hash = '#dashboard';
  }

  // Active navigation link styling
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === hash) {
      link.classList.add('active');
    }
  });

  // Load View
  const route = viewRoutes[hash];
  pageTitle.textContent = route.title;
  pageSubtitle.textContent = route.subtitle;

  viewContainer.innerHTML = '<div class="loading-view"><div class="spinner"></div>Loading...</div>';

  route.render(viewContainer)
    .then(() => {
      // Re-create icons for newly added HTML
      lucide.createIcons();
    })
    .catch(err => {
      console.error(`Error loading view ${hash}:`, err);
      viewContainer.innerHTML = `<div class="error-view"><i data-lucide="alert-triangle"></i> Gagal memuat halaman: ${err.message}</div>`;
      lucide.createIcons();
    });

  // Close responsive sidebar on navigation
  appSidebar.classList.remove('open');

  // Refresh reminders
  updateReminders();
}


// Initialise Theme
function initTheme() {
  const savedTheme = stateManager.getTheme();
  document.documentElement.setAttribute('data-theme', savedTheme);

  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    stateManager.setTheme(newTheme);
  });
}

// Layout Listeners
function initAppLayout() {
  // Mobile sidebar toggler
  sidebarToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    appSidebar.classList.toggle('open');
  });

  // Close sidebar clicking outside
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 1024 && !appSidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
      appSidebar.classList.remove('open');
    }
  });

  // Logout action
  logoutBtn.addEventListener('click', () => {
    stateManager.logout();
    showToast('Anda telah keluar dari sistem.', 'info');
    checkAuthAndRoute();
  });

  // Notification menu toggle
  notificationBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    notificationMenu.classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!notificationBtn.contains(e.target) && !notificationMenu.contains(e.target)) {
      notificationMenu.classList.add('hidden');
    }
  });

  clearNotifications.addEventListener('click', () => {
    notificationList.innerHTML = '<div class="no-notifications">Tidak ada pengingat baru.</div>';
    notificationBadge.classList.add('hidden');
    notificationBadge.textContent = '0';
    showToast('Semua notifikasi dibersihkan.', 'info');
  });

  // Global student selector listener
  const globalSelect = document.getElementById('global-student-select');
  const globalSelectText = document.getElementById('global-student-select-text');

  if (globalSelect) {
    if (!globalSelect.dataset.listenerAdded) {
      globalSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (globalSelectText) {
          const selectedOption = e.target.options[e.target.selectedIndex];
          globalSelectText.textContent = selectedOption ? selectedOption.text : '-- Pilih Mahasiswa --';
        }
        stateManager.setSelectedStudentId(val);
        checkAuthAndRoute();
      });
      globalSelect.dataset.listenerAdded = 'true';
    }

    // Set initial text if already populated
    if (globalSelectText && globalSelect.selectedIndex >= 0) {
      globalSelectText.textContent = globalSelect.options[globalSelect.selectedIndex].text;
    }
  }
}

// Updates notification items in top bar
async function updateReminders() {
  const reminders = await stateManager.getReminders();

  if (reminders.length === 0) {
    notificationBadge.classList.add('hidden');
    notificationBadge.textContent = '0';
    notificationList.innerHTML = '<div class="no-notifications">Tidak ada pengingat baru.</div>';
    return;
  }

  notificationBadge.classList.remove('hidden');
  notificationBadge.textContent = reminders.length;

  notificationList.innerHTML = reminders.map(rem => {
    const isDanger = rem.type === 'danger';
    const iconName = isDanger ? 'alert-octagon' : 'alert-circle';
    const dateFormatted = new Date(rem.time).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <div class="notification-item" data-task-id="${rem.taskId}">
        <div class="notification-icon ${rem.type}">
          <i data-lucide="${iconName}"></i>
        </div>
        <div class="notification-info">
          <div class="notification-title">${rem.title}</div>
          <div class="notification-desc">${rem.desc}</div>
          <div class="notification-time">${dateFormatted}</div>
        </div>
      </div>
    `;
  }).join('');

  // Add click listener to notification items
  notificationList.querySelectorAll('.notification-item').forEach(item => {
    item.addEventListener('click', () => {
      const taskId = item.getAttribute('data-task-id');
      notificationMenu.classList.add('hidden');
      navigateTo('#tasks');
      // Highlight the task in tasks view
      setTimeout(() => {
        const taskCard = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskCard) {
          taskCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          taskCard.classList.add('highlight-glow');
          setTimeout(() => taskCard.classList.remove('highlight-glow'), 3000);
        }
      }, 500);
    });
  });

  lucide.createIcons();
}

// Global Toast Notification System
export function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let iconName = 'check-circle';
  if (type === 'error') iconName = 'x-circle';
  if (type === 'warning') iconName = 'alert-triangle';
  if (type === 'info') iconName = 'info';

  toast.innerHTML = `
    <i data-lucide="${iconName}"></i>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);
  lucide.createIcons();

  setTimeout(() => {
    toast.style.transform = 'translateX(120%)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Global modal dialog manager
export function openModal(title, bodyHtml, onConfirm = null, confirmText = 'Simpan') {
  const modalContainer = document.getElementById('modal-container');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');

  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHtml;

  // Bind close buttons
  const closeBtn = document.getElementById('modal-close-btn');
  const cancelBtn = modalBody.querySelector('.btn-cancel');
  const confirmBtn = modalBody.querySelector('.btn-confirm');

  const closeModal = () => {
    modalContainer.classList.add('hidden');
  };

  closeBtn.onclick = closeModal;
  if (cancelBtn) cancelBtn.onclick = closeModal;

  if (confirmBtn && onConfirm) {
    confirmBtn.textContent = confirmText;
    confirmBtn.onclick = () => {
      const result = onConfirm(modalBody);
      if (result !== false) {
        closeModal();
      }
    };
  }

  modalContainer.classList.remove('hidden');
  lucide.createIcons();
}

// Initialize Router & Global Listeners
window.addEventListener('hashchange', checkAuthAndRoute);
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initAppLayout();
  checkAuthAndRoute();

  // Quick profile trigger in header goes to profile page
  document.getElementById('header-profile-trigger').addEventListener('click', () => {
    navigateTo('#profile');
  });
});
