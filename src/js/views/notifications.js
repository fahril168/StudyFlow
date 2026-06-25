import { stateManager } from '../state.js';

export async function renderNotifications(container, navigateTo) {
  const reminders = await stateManager.getReminders();

  let html = `
    <div class="notifications-page-container">
      <div class="view-header" style="margin-bottom: 0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2>Semua Notifikasi</h2>
          <p class="text-muted">Daftar pengingat tugas dan batas waktu yang mendekat.</p>
        </div>
        ${reminders.length > 0 ? `
        <button id="page-clear-notifications" style="padding: 8px 16px; border-radius: var(--radius-sm); background: var(--bg-hover); border: 1px solid var(--border-color); color: var(--text-secondary); font-weight: 600; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all var(--transition-fast);">
          <i data-lucide="trash-2" style="width: 18px; height: 18px;"></i> Bersihkan Semua
        </button>
        ` : ''}
      </div>
  `;

  if (reminders.length === 0) {
    html += `
      <div class="notifications-empty-state">
        <i data-lucide="bell-off"></i>
        <h3>Tidak Ada Notifikasi Baru</h3>
        <p>Bagus! Anda telah menyelesaikan semua tugas tepat waktu atau belum ada tugas yang mendekati batas waktu.</p>
      </div>
    </div>`; // close container
    container.innerHTML = html;
    return;
  }

  html += `
    <div class="notifications-list-container">
      ${reminders.map(rem => {
        const isDanger = rem.type === 'danger';
        const iconName = isDanger ? 'alert-octagon' : 'alert-circle';
        const dateFormatted = new Date(rem.time).toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        return `
          <div class="notification-page-item" data-task-id="${rem.taskId}">
            <div class="notification-page-icon ${rem.type}">
              <i data-lucide="${iconName}"></i>
            </div>
            <div class="notification-page-content">
              <div class="notification-page-header">
                <span class="notification-page-title">${rem.title}</span>
                <span class="notification-page-time">${dateFormatted}</span>
              </div>
              <div class="notification-page-desc">${rem.desc}</div>
              <div class="notification-action">
                <span>Lihat Tugas</span>
                <i data-lucide="arrow-right"></i>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  </div>`;

  container.innerHTML = html;

  // Add click listeners to navigate to tasks
  container.querySelectorAll('.notification-page-item').forEach(item => {
    item.addEventListener('click', () => {
      const taskId = item.getAttribute('data-task-id');
      navigateTo('#tasks');
      // Give the task view time to render, then highlight
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

  // Add click listener for "Bersihkan Semua"
  const clearBtn = container.querySelector('#page-clear-notifications');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      // Clear the page list
      const listContainer = container.querySelector('.notifications-list-container');
      if (listContainer) {
        listContainer.innerHTML = `
          <div class="notifications-empty-state">
            <i data-lucide="bell-off"></i>
            <h3>Tidak Ada Notifikasi Baru</h3>
            <p>Bagus! Anda telah menyelesaikan semua tugas tepat waktu atau belum ada tugas yang mendekati batas waktu.</p>
          </div>
        `;
        listContainer.style.gap = '0';
        lucide.createIcons();
      }
      clearBtn.style.display = 'none'; // hide the button itself
      
      // Also clear header notification dropdown to keep them in sync
      const headerList = document.getElementById('notification-list');
      const badge = document.getElementById('notification-badge');
      if (headerList) headerList.innerHTML = '<div class="no-notifications">Tidak ada pengingat baru.</div>';
      if (badge) {
        badge.classList.add('hidden');
        badge.textContent = '0';
      }
    });
  }
}
