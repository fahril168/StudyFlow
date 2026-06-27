import { stateManager } from '../state.js';

export async function renderHistory(container) {
  const tasks = await stateManager.getTasks();
  const categories = await stateManager.getCategories(false);
  
  // Sort tasks: completed ones first (most recent), then others by due date
  tasks.sort((a, b) => {
    if (a.status === 'done' && b.status !== 'done') return -1;
    if (a.status !== 'done' && b.status === 'done') return 1;
    if (a.status === 'done') {
      return new Date(b.completedAt || b.dueDate || 0).getTime() - new Date(a.completedAt || a.dueDate || 0).getTime();
    }
    return new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime();
  });

  const completedCount = tasks.filter(t => t.status === 'done').length;

  let html = `
    <div class="history-page-container">
      
      <!-- Toolbar & Stats -->
      <div class="history-toolbar">
        <div class="history-toolbar-left">
          <select id="history-status-filter" class="history-filter-select">
            <option value="all">Semua Status</option>
            <option value="done" selected>Selesai Saja</option>
            <option value="active">Belum Selesai</option>
          </select>
          
          <select id="history-category-filter" class="history-filter-select">
            <option value="all">Semua Kategori</option>
            ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
        
        <div class="history-stats">
          <div class="history-stat-badge">
            <span class="history-stat-label">Total Tugas</span>
            <span class="history-stat-value">${tasks.length}</span>
          </div>
          <div class="history-stat-badge">
            <span class="history-stat-label">Tugas Selesai</span>
            <span class="history-stat-value" style="color: var(--color-done);">${completedCount}</span>
          </div>
        </div>
      </div>

      <!-- Data Table -->
      <div class="history-table-container">
        <table class="history-table">
          <thead>
            <tr>
              <th>Detail Tugas</th>
              <th>Kategori</th>
              <th>Prioritas</th>
              <th>Status</th>
              <th>Tenggat Waktu</th>
            </tr>
          </thead>
          <tbody id="history-table-body">
            <!-- Rendered via JS -->
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.innerHTML = html;

  const tbody = container.querySelector('#history-table-body');
  const statusFilter = container.querySelector('#history-status-filter');
  const categoryFilter = container.querySelector('#history-category-filter');

  const renderTable = () => {
    const sFilter = statusFilter.value;
    const cFilter = categoryFilter.value;

    const filtered = tasks.filter(t => {
      // Status Match
      let statusMatch = true;
      if (sFilter === 'done') statusMatch = t.status === 'done';
      else if (sFilter === 'active') statusMatch = t.status !== 'done';

      // Category Match
      let catMatch = true;
      if (cFilter !== 'all') catMatch = t.categoryId === parseInt(cFilter);

      return statusMatch && catMatch;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5">
            <div class="history-empty">
              <i data-lucide="archive-x"></i>
              <h3>Tidak ada data riwayat</h3>
              <p>Belum ada tugas yang sesuai dengan kriteria penyaringan Anda.</p>
            </div>
          </td>
        </tr>
      `;
      lucide.createIcons();
      return;
    }

    tbody.innerHTML = filtered.map(task => {
      const cat = categories.find(c => c.id === task.categoryId) || { name: 'Umum', color: '#64748b' };
      
      let statusLabel = 'Belum Dikerjakan';
      let statusClass = 'todo';
      let statusIcon = 'circle';
      if (task.status === 'inprogress') {
        statusLabel = 'Diproses';
        statusClass = 'inprogress';
        statusIcon = 'clock';
      } else if (task.status === 'done') {
        statusLabel = 'Selesai';
        statusClass = 'done';
        statusIcon = 'check-circle-2';
      }

      const dateStr = task.dueDate ? new Date(task.dueDate).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric'
      }) : '-';

      return `
        <tr>
          <td>
            <span class="history-task-title">${task.title}</span>
            <span class="history-task-desc">${task.description || 'Tidak ada deskripsi.'}</span>
          </td>
          <td>
            <div class="history-category-pill">
              <span class="history-category-dot" style="background-color: ${cat.color}"></span>
              <span>${cat.name}</span>
            </div>
          </td>
          <td>
            <span class="history-priority-badge ${task.priority}">${task.priority}</span>
          </td>
          <td>
            <div class="history-status-badge ${statusClass}">
              <i data-lucide="${statusIcon}" style="width: 14px; height: 14px;"></i>
              ${statusLabel}
            </div>
          </td>
          <td style="color: var(--text-secondary); font-weight: 500;">
            ${dateStr}
          </td>
        </tr>
      `;
    }).join('');

    lucide.createIcons();
  };

  // Bind Filters
  statusFilter.addEventListener('change', renderTable);
  categoryFilter.addEventListener('change', renderTable);

  // Initial Render
  renderTable();
}
