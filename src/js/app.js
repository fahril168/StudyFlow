/* StudyFlow Central Application Bootstrapper & Router */

import { stateManager } from './state.js';

// Dom References
const appContainer = document.getElementById('app-container');
const viewContainer = document.getElementById('view-container');
const pageTitle = document.getElementById('page-title');
const pageSubtitle = document.getElementById('page-subtitle');
const sidebarAvatar = document.getElementById('sidebar-avatar');
const headerAvatar = document.getElementById('header-avatar');
const sidebarUserName = document.getElementById('sidebar-user-name');
const sidebarUserRole = document.getElementById('sidebar-user-role');
const sidebarToggle = document.getElementById('sidebar-toggle');
const appSidebar = document.getElementById('app-sidebar');
const logoutBtn = document.getElementById('logout-btn');
const notificationBtn = document.getElementById('notification-btn');
const notificationMenu = document.getElementById('notification-menu');
const notificationBadge = document.getElementById('notification-badge');
const notificationList = document.getElementById('notification-list');
const clearNotifications = document.getElementById('clear-notifications');
const studentDependentRoutes = ['#tasks', '#calendar', '#stats', '#notifications', '#notes', '#history'];

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
  },
  '#notifications': {
    title: 'Notifikasi & Pengingat',
    subtitle: 'Lihat semua pengingat tugas dan batas waktu yang mendekat.',
    render: async (container) => {
      const { renderNotifications } = await import('./views/notifications.js');
      await renderNotifications(container, navigateTo);
    }
  },
  '#notes': {
    title: 'Buku Catatan',
    subtitle: 'Kelola semua catatan kilat Anda di satu tempat.',
    render: async (container) => {
      const { renderNotes } = await import('./views/notes.js');
      await renderNotes(container);
    }
  },
  '#history': {
    title: 'Laporan & Riwayat Tugas',
    subtitle: 'Rekapitulasi seluruh tugas yang pernah Anda kerjakan.',
    render: async (container) => {
      const { renderHistory } = await import('./views/history.js');
      await renderHistory(container);
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
    // If not authenticated, redirect to login.html
    window.location.href = 'login.html';
    return;
  }

  // Show app layout
  if (appContainer) {
    appContainer.classList.remove('hidden');
  }

  // Update user info in layout
  sidebarUserName.textContent = user.name;
  sidebarUserRole.textContent = user.role === 'admin' ? 'Administrator' : 'Mahasiswa';
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

  // Init Semester Filter
  const filterSelect = document.getElementById('global-semester-filter');
  if (filterSelect) {
    const currentSem = user.current_semester || 1;
    let optionsHtml = '<option value="">Semua Semester</option>';
    const maxSem = Math.max(currentSem, 14);
    for (let i = 1; i <= maxSem; i++) {
      optionsHtml += `<option value="${i}">Semester ${i}</option>`;
    }
    filterSelect.innerHTML = optionsHtml;
    filterSelect.innerHTML = optionsHtml;

    // Remove old listeners by cloning (if re-initializing)
    const newFilterSelect = filterSelect.cloneNode(true);
    filterSelect.parentNode.replaceChild(newFilterSelect, filterSelect);
    
    // Set the value AFTER cloning to preserve it
    newFilterSelect.value = stateManager.currentFilterSemester !== null ? stateManager.currentFilterSemester : "";
    
    newFilterSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      stateManager.currentFilterSemester = val ? parseInt(val) : null;
      checkAuthAndRoute();
    });
  }

  // Handle routing based on hash
  let hash = window.location.hash;

  // If admin and no student is selected, restrict routing to dashboard and profile
  if (user.role === 'admin' && !stateManager.getSelectedStudentId()) {
    if (hash === '#tasks' || hash === '#calendar' || hash === '#stats' || hash === '#notifications') {
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


// Layout Listeners
function initAppLayout() {
  // Theme toggle
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

  clearNotifications.addEventListener('click', async () => {
    await stateManager.clearAllNotifications();
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
  const unreadReminders = reminders.filter(r => !r.isRead);

  if (reminders.length === 0) {
    notificationBadge.classList.add('hidden');
    notificationBadge.textContent = '0';
    notificationList.innerHTML = '<div class="no-notifications">Tidak ada pengingat baru.</div>';
    return;
  }

  if (unreadReminders.length === 0) {
    notificationBadge.classList.add('hidden');
  } else {
    notificationBadge.classList.remove('hidden');
    notificationBadge.textContent = unreadReminders.length;
  }

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
    const readClass = rem.isRead ? 'read' : 'unread';
    const readStyle = rem.isRead ? 'opacity: 0.6;' : '';

    return `
      <div class="notification-item ${readClass}" data-notif-id="${rem.id}" style="cursor: pointer; ${readStyle}">
        <div class="notification-icon ${rem.type}">
          <i data-lucide="${iconName}"></i>
        </div>
        <div class="notification-info">
          <div class="notification-title">${rem.title}</div>
          <div class="notification-desc">${rem.message}</div>
          <div class="notification-time">${dateFormatted}</div>
        </div>
      </div>
    `;
  }).join('');

  // Add click listener to mark as read
  notificationList.querySelectorAll('.notification-item').forEach(item => {
    item.addEventListener('click', async () => {
      const notifId = item.getAttribute('data-notif-id');
      if (item.classList.contains('unread') && notifId && !notifId.startsWith('temp-')) {
        await stateManager.markNotificationRead(notifId);
        item.classList.remove('unread');
        item.classList.add('read');
        item.style.opacity = '0.6';
        
        let currentCount = parseInt(notificationBadge.textContent) || 0;
        if (currentCount > 1) {
          notificationBadge.textContent = currentCount - 1;
        } else {
          notificationBadge.classList.add('hidden');
          notificationBadge.textContent = '0';
        }
      }
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
  initAppLayout();
  checkAuthAndRoute();

  // Quick profile trigger in header goes to profile page
  document.getElementById('header-profile-trigger').addEventListener('click', () => {
    navigateTo('#profile');
  });

  // View all notifications link in dropdown closes the dropdown
  const viewAllBtn = document.getElementById('view-all-notifications');
  if (viewAllBtn) {
    viewAllBtn.addEventListener('click', () => {
      document.getElementById('notification-menu').classList.add('hidden');
    });
  }
});
