/* StudyFlow Dashboard View Controller */

import { stateManager } from '../state.js';
import { showToast, navigateTo } from '../app.js';

export async function renderDashboard(container) {
  const user = stateManager.getCurrentUser();
  if (!user) return;

  if (user.role === 'admin') {
    await renderAdminDashboard(container, user);
  } else {
    await renderStudentDashboard(container, user);
  }
}

// Student Dashboard Renderer
async function renderStudentDashboard(container, user) {
  const tasks = await stateManager.getTasks();
  const categories = await stateManager.getCategories();
  const notes = await stateManager.getNotes();

  // 1. Calculate Stats
  const activeTasks = tasks.filter(t => t.status !== 'done');
  const completedTasks = tasks.filter(t => t.status === 'done');
  
  const now = Date.now();
  const overdueCount = activeTasks.filter(t => t.dueDate && new Date(t.dueDate).getTime() < now).length;
  
  const nearDueCount = activeTasks.filter(t => {
    if (!t.dueDate) return false;
    const dueTime = new Date(t.dueDate).getTime();
    const diff = dueTime - now;
    return diff > 0 && diff <= 24 * 60 * 60 * 1000;
  }).length;

  const completedTodayCount = completedTasks.filter(t => {
    // Check if updated in the last 24h, or mock check: just completed.
    // To make it look realistic, we can count tasks in done.
    return t.status === 'done';
  }).length;

  // 2. Task Completion Progress
  const totalTasksCount = tasks.length;
  const completionPercent = totalTasksCount > 0 ? Math.round((completedTasks.length / totalTasksCount) * 100) : 0;

  // 3. Today's Schedule (tasks due today)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayTasks = tasks.filter(t => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    return due >= todayStart && due <= todayEnd && t.status !== 'done';
  });

  // 4. Upcoming Deadlines (not done, sorted by date, limit to 4)
  const upcomingTasks = [...activeTasks]
    .filter(t => t.dueDate)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 4);

  // Generate HTML
  container.innerHTML = `
    <!-- Quick Stats Cards -->
    <div class="dashboard-grid">
      <div class="stat-card">
        <div class="stat-icon-wrapper primary">
          <i data-lucide="book-open"></i>
        </div>
        <div class="stat-info">
          <span class="stat-value">${activeTasks.length}</span>
          <span class="stat-label">Tugas Aktif</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrapper danger">
          <i data-lucide="alert-triangle"></i>
        </div>
        <div class="stat-info">
          <span class="stat-value">${overdueCount}</span>
          <span class="stat-label">Terlambat</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrapper warning">
          <i data-lucide="clock"></i>
        </div>
        <div class="stat-info">
          <span class="stat-value">${nearDueCount}</span>
          <span class="stat-label">Mendekati Deadline</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrapper success">
          <i data-lucide="check-circle-2"></i>
        </div>
        <div class="stat-info">
          <span class="stat-value">${completedTodayCount}/${totalTasksCount}</span>
          <span class="stat-label">Tugas Selesai</span>
        </div>
      </div>
    </div>

    <!-- Main Dashboard Section -->
    <div class="dashboard-panels">
      <!-- Left Column: Tasks and Progress -->
      <div class="panel-left">
        <!-- Progress Widget -->
        <div class="panel-card">
          <div class="panel-header">
            <h3 class="panel-title"><i data-lucide="award"></i> Progres Mingguan</h3>
          </div>
          <div class="progress-widget">
            <div class="radial-progress-wrapper">
              <svg class="radial-progress-svg" viewBox="0 0 120 120">
                <circle class="progress-track" cx="60" cy="60" r="50"></circle>
                <circle class="progress-bar-fill" id="dashboard-progress-bar" cx="60" cy="60" r="50"></circle>
              </svg>
              <div class="progress-text" id="dashboard-progress-text">0%</div>
            </div>
            <div class="progress-info-text">
              <h4>Luar biasa, ${user.name}!</h4>
              <p>Anda telah menyelesaikan ${completedTasks.length} dari ${totalTasksCount} tugas semester ini.</p>
              <p class="text-muted" style="margin-top: 4px; font-size: 0.8rem;">
                ${completionPercent >= 75 ? '🔥 Pertahankan performa hebat Anda!' : completionPercent >= 40 ? '⚡ Sikit lagi untuk melampaui target!' : '📚 Mari mulai mencicil tugas Anda hari ini.'}
              </p>
            </div>
          </div>
        </div>

        <!-- Upcoming Deadlines -->
        <div class="panel-card">
          <div class="panel-header">
            <h3 class="panel-title"><i data-lucide="calendar-clock"></i> Deadline Terdekat</h3>
            <button class="clear-btn" id="view-all-tasks-btn">Lihat Semua</button>
          </div>
          <div class="dashboard-list">
            ${upcomingTasks.length === 0 ? `
              <div class="empty-list-placeholder">
                <i data-lucide="party-popper"></i>
                <p>Hore! Tidak ada tugas aktif yang mendekati deadline.</p>
              </div>
            ` : upcomingTasks.map(task => {
              const cat = categories.find(c => c.id === task.categoryId) || { name: 'Umum', color: '#64748b' };
              const isUrgent = new Date(task.dueDate).getTime() - now <= 24 * 60 * 60 * 1000;
              const isOverdue = new Date(task.dueDate).getTime() < now;
              
              let deadlineClass = '';
              let deadlineText = formatDate(task.dueDate);
              if (isOverdue) {
                deadlineClass = 'overdue';
                deadlineText = 'Terlambat! (' + deadlineText + ')';
              } else if (isUrgent) {
                deadlineClass = 'urgent';
                deadlineText = 'Segera (' + deadlineText + ')';
              }

              return `
                <div class="dashboard-task-item" data-task-id="${task.id}">
                  <div class="task-item-left">
                    <button class="task-status-btn" data-task-id="${task.id}" title="Tandai Selesai">
                      <i data-lucide="check"></i>
                    </button>
                    <div class="task-item-details">
                      <div class="task-item-title">${task.title}</div>
                      <div class="task-item-meta">
                        <span class="task-category-dot" style="background-color: ${cat.color}" title="${cat.name}"></span>
                        <span>${cat.name}</span>
                        <span class="task-priority-badge ${task.priority}">${task.priority}</span>
                      </div>
                    </div>
                  </div>
                  <div class="task-item-right">
                    <span class="task-deadline-pill ${deadlineClass}">
                      <i data-lucide="calendar"></i>
                      <span>${deadlineText}</span>
                    </span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- Right Column: Schedule and Sticky Notes -->
      <div class="panel-right">
        <!-- Today's Schedule -->
        <div class="panel-card">
          <div class="panel-header">
            <h3 class="panel-title"><i data-lucide="bell-ring"></i> Jadwal & Pengumpulan Hari Ini</h3>
          </div>
          <div class="dashboard-list">
            ${todayTasks.length === 0 ? `
              <div class="empty-list-placeholder">
                <i data-lucide="calendar-check"></i>
                <p>Bebas tugas untuk hari ini!</p>
              </div>
            ` : todayTasks.map(task => {
              const cat = categories.find(c => c.id === task.categoryId) || { name: 'Umum', color: '#64748b' };
              const timeFormatted = new Date(task.dueDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
              return `
                <div class="dashboard-task-item" data-task-id="${task.id}">
                  <div class="task-item-left">
                    <div class="task-item-details">
                      <div class="task-item-title">${task.title}</div>
                      <div class="task-item-meta">
                        <span class="task-category-dot" style="background-color: ${cat.color}"></span>
                        <span>${cat.name}</span>
                      </div>
                    </div>
                  </div>
                  <div class="task-item-right">
                    <span class="task-deadline-pill urgent">
                      <i data-lucide="clock"></i>
                      <span>${timeFormatted}</span>
                    </span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Sticky Notes Board -->
        <div class="panel-card">
          <div class="panel-header" style="margin-bottom: 15px;">
            <h3 class="panel-title"><i data-lucide="pin"></i> Catatan Kilat</h3>
            <div>
              <button class="clear-btn" id="add-note-btn" style="color: var(--primary); font-weight: 600; font-size: 0.85rem; margin-right: 8px;"><i data-lucide="plus" style="width: 14px; height: 14px; margin-right: 4px; vertical-align: middle;"></i>Tambah</button>
              <button class="clear-btn" id="view-all-notes-btn" style="font-size: 0.85rem;">Lihat Semua</button>
            </div>
          </div>
          
          <div class="sticky-notes-grid" id="sticky-notes-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; max-height: 300px; overflow-y: auto; padding: 4px;">
            <!-- Sticky notes elements injected here -->
          </div>
        </div>

      </div>
    </div>
  `;

  // Animate Circular Progress Bar
  setTimeout(() => {
    const circle = document.getElementById('dashboard-progress-bar');
    const text = document.getElementById('dashboard-progress-text');
    if (circle && text) {
      const radius = circle.r.baseVal.value;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference - (completionPercent / 100) * circumference;
      circle.style.strokeDashoffset = offset;
      text.textContent = `${completionPercent}%`;
    }
  }, 100);

  // Bind click listeners for tasks to show info
  container.querySelectorAll('.dashboard-task-item').forEach(item => {
    item.addEventListener('click', (e) => {
      // Ignore click if it's on the status button
      if (e.target.closest('.task-status-btn')) return;
      
      const taskId = item.getAttribute('data-task-id');
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

  // Complete task button listener
  container.querySelectorAll('.task-status-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const taskId = btn.getAttribute('data-task-id');
      
      // Update task status in state
      await stateManager.updateTask(taskId, { status: 'done' });
      showToast('Tugas diselesaikan! Bagus sekali.', 'success');
      
      // Re-render dashboard
      await renderStudentDashboard(container, user);
      
      // Custom event to update header notifications
      window.dispatchEvent(new CustomEvent('hashchange'));
    });
  });

  // Navigate to all tasks
  container.querySelector('#view-all-tasks-btn').onclick = () => navigateTo('#tasks');

  // Render Sticky Notes Helper
  const renderNotesList = (notes, wrapper) => {
    if (notes.length === 0) {
      wrapper.innerHTML = `
        <div class="empty-list-placeholder" style="grid-column: 1 / -1; padding: 20px;">
          <p style="font-size: 0.8rem; margin: 0;">Belum ada catatan tempel.</p>
        </div>
      `;
      return;
    }

    const colors = [
      { code: '#fef08a', name: 'yellow' },
      { code: '#bbf7d0', name: 'green' },
      { code: '#bfdbfe', name: 'blue' },
      { code: '#fbcfe8', name: 'pink' },
      { code: '#fed7aa', name: 'orange' }
    ];

    wrapper.innerHTML = notes.map(note => `
      <div class="sticky-note-card" data-note-id="${note.id}" style="background-color: ${note.color}; color: #1e293b; padding: 12px; border-radius: var(--radius-sm); border: 1px solid rgba(0,0,0,0.08); box-shadow: var(--shadow-sm); display: flex; flex-direction: column; justify-content: space-between; min-height: 120px; transition: transform var(--transition-fast), box-shadow var(--transition-fast); position: relative;">
        <textarea class="sticky-note-textarea" data-note-id="${note.id}" style="background: transparent; border: none; font-family: inherit; font-size: 0.8rem; font-weight: 500; resize: none; width: 100%; height: 60px; color: #1e293b; line-height: 1.3;" placeholder="Tulis catatan...">${note.content || ''}</textarea>
        
        <div class="sticky-note-footer" style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 8px; margin-top: 6px;">
          <!-- Color Palette -->
          <div class="sticky-note-colors" style="display: flex; gap: 4px;">
            ${colors.map(col => `
              <div class="color-dot ${note.color === col.code ? 'active' : ''}" data-note-id="${note.id}" data-color="${col.code}" style="width: 10px; height: 10px; border-radius: 50%; background-color: ${col.code}; border: 1px solid rgba(0,0,0,0.15); cursor: pointer; transition: transform var(--transition-fast); ${note.color === col.code ? 'transform: scale(1.3); box-shadow: 0 0 2px rgba(0,0,0,0.3);' : ''}"></div>
            `).join('')}
          </div>
          
          <!-- Delete Button -->
          <button type="button" class="delete-note-btn" data-note-id="${note.id}" style="background: none; border: none; color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0.6; transition: opacity var(--transition-fast);" onmouseover="this.style.opacity='1'; this.style.color='#ef4444';" onmouseout="this.style.opacity='0.6'; this.style.color='#64748b';">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
          </button>
        </div>
      </div>
    `).join('');
    lucide.createIcons();

    // Bind textarea changes (autosave)
    wrapper.querySelectorAll('.sticky-note-textarea').forEach(ta => {
      ta.onblur = async () => {
        const noteId = ta.getAttribute('data-note-id');
        const content = ta.value.trim();
        await stateManager.updateNote(noteId, { content });
      };
    });

    // Bind color selectors
    wrapper.querySelectorAll('.color-dot').forEach(dot => {
      dot.onclick = async () => {
        const noteId = dot.getAttribute('data-note-id');
        const color = dot.getAttribute('data-color');
        
        const noteCard = wrapper.querySelector(`.sticky-note-card[data-note-id="${noteId}"]`);
        if (noteCard) {
          noteCard.style.backgroundColor = color;
          noteCard.querySelectorAll('.color-dot').forEach(d => {
            d.style.transform = '';
            d.style.boxShadow = '';
          });
          dot.style.transform = 'scale(1.3)';
          dot.style.boxShadow = '0 0 2px rgba(0,0,0,0.3)';
        }

        await stateManager.updateNote(noteId, { color });
      };
    });

    // Bind delete actions
    wrapper.querySelectorAll('.delete-note-btn').forEach(btn => {
      btn.onclick = async () => {
        const noteId = btn.getAttribute('data-note-id');
        if (confirm('Hapus catatan ini?')) {
          await stateManager.deleteNote(noteId);
          const updatedNotes = await stateManager.getNotes();
          renderNotesList(updatedNotes, wrapper);
        }
      };
    });
  };

  // Render Sticky Notes
  const notesWrapper = container.querySelector('#sticky-notes-container');
  if (notesWrapper) {
    renderNotesList(notes, notesWrapper);
    
    // Bind Add Note Button
    const addNoteBtn = container.querySelector('#add-note-btn');
    if (addNoteBtn) {
      addNoteBtn.onclick = async () => {
        const newNote = await stateManager.addNote({
          content: '',
          color: '#fef08a' // Default yellow
        });
        if (newNote) {
          const updatedNotes = await stateManager.getNotes();
          renderNotesList(updatedNotes, notesWrapper);
        }
      };
    }

    // Bind View All Notes Button
    const viewAllNotesBtn = container.querySelector('#view-all-notes-btn');
    if (viewAllNotesBtn) {
      viewAllNotesBtn.onclick = () => navigateTo('#notes');
    }
  }
}

// Admin Dashboard Renderer
async function renderAdminDashboard(container, user) {
  const allTasks = await stateManager.getTasks();
  const allUsers = await stateManager.getStudents();

  // 1. Calculate Admin Stats
  const totalStudents = allUsers.length;
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(t => t.status === 'done').length;
  const globalCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  container.innerHTML = `
    <!-- Admin Stats Cards -->
    <div class="dashboard-grid">
      <div class="stat-card">
        <div class="stat-icon-wrapper primary">
          <i data-lucide="users"></i>
        </div>
        <div class="stat-info">
          <span class="stat-value">${totalStudents}</span>
          <span class="stat-label">Total Mahasiswa</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrapper warning">
          <i data-lucide="clipboard-list"></i>
        </div>
        <div class="stat-info">
          <span class="stat-value">${totalTasks}</span>
          <span class="stat-label">Total Tugas Aktif</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrapper success">
          <i data-lucide="check-square"></i>
        </div>
        <div class="stat-info">
          <span class="stat-value">${completedTasks}</span>
          <span class="stat-label">Tugas Terselesaikan</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrapper primary">
          <i data-lucide="trending-up"></i>
        </div>
        <div class="stat-info">
          <span class="stat-value">${globalCompletionRate}%</span>
          <span class="stat-label">Rasio Kelulusan Tugas</span>
        </div>
      </div>
    </div>

    <!-- Admin Workspaces -->
    <div class="dashboard-panels" style="grid-template-columns: 1fr;">
      <!-- Left panel: Students list & task completion status -->
      <div class="panel-left" style="margin-bottom: 0;">
        <div class="panel-card" style="margin-bottom: 0;">
          <div class="panel-header">
            <h3 class="panel-title"><i data-lucide="users"></i> Daftar Mahasiswa & Progres Belajar</h3>
          </div>
          <div class="dashboard-list">
            ${allUsers.length === 0 ? `
              <div class="empty-list-placeholder">
                <p>Belum ada mahasiswa terdaftar.</p>
              </div>
            ` : allUsers.map(student => {
              const studentTasks = allTasks.filter(t => t.studentId === student.id);
              const doneTasks = studentTasks.filter(t => t.status === 'done');
              const rate = studentTasks.length > 0 ? Math.round((doneTasks.length / studentTasks.length) * 100) : 0;
              
              return `
                <div class="dashboard-task-item" style="cursor: default;">
                  <div class="task-item-left">
                    <img src="${student.avatar}" alt="${student.name}" style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--border-color); background: var(--bg-card);">
                    <div class="task-item-details">
                      <div class="task-item-title">${student.name}</div>
                      <div class="task-item-meta">
                        <span>NIM: ${student.nim}</span>
                        <span>•</span>
                        <span>${student.prodi}</span>
                      </div>
                    </div>
                  </div>
                  <div class="task-item-right">
                    <span style="font-size: 0.8rem; font-weight: 600; margin-right: 8px;">
                      Progres: ${doneTasks.length}/${studentTasks.length} (${rate}%)
                    </span>
                    <div style="width: 80px; height: 6px; background-color: var(--bg-hover); border-radius: 3px; overflow: hidden; border: 1px solid var(--border-color);">
                      <div style="width: ${rate}%; height: 100%; background: var(--primary-gradient);"></div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

// Date helper formats (Indonesian)
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}
