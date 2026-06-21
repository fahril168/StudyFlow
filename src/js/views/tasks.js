/* StudyFlow Task Management View Controller */

import { stateManager } from '../state.js';
import { showToast, openModal } from '../app.js';

// Local view state
let viewMode = 'kanban'; // 'kanban' or 'list'
let searchQuery = '';
let filterCategory = '';
let filterPriority = '';

export async function renderTasks(container) {
  const user = stateManager.getCurrentUser();
  if (!user) return;

  await renderLayout(container, user);
  await renderViewContent();
}

async function renderLayout(container, user) {
  const categories = await stateManager.getCategories();

  // Create main structure
  container.innerHTML = `
    <!-- Toolbar -->
    <div class="tasks-toolbar">
      <div class="toolbar-left">
        <div class="search-input-wrapper">
          <i data-lucide="search"></i>
          <input type="text" id="task-search" class="search-control" placeholder="Cari nama tugas..." value="${searchQuery}">
        </div>
        
        <select id="filter-category" class="filter-select">
          <option value="">Semua Kategori</option>
          ${categories.map(c => `<option value="${c.id}" ${filterCategory === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
        </select>

        <select id="filter-priority" class="filter-select">
          <option value="">Semua Prioritas</option>
          <option value="rendah" ${filterPriority === 'rendah' ? 'selected' : ''}>Rendah</option>
          <option value="sedang" ${filterPriority === 'sedang' ? 'selected' : ''}>Sedang</option>
          <option value="tinggi" ${filterPriority === 'tinggi' ? 'selected' : ''}>Tinggi</option>
        </select>
      </div>

      <div class="toolbar-right">
        <!-- View Switcher -->
        <div class="view-toggle-group">
          <button class="toggle-btn ${viewMode === 'kanban' ? 'active' : ''}" id="toggle-kanban" title="Tampilan Papan Kartu">
            <i data-lucide="grid"></i>
            <span>Kartu</span>
          </button>
          <button class="toggle-btn ${viewMode === 'list' ? 'active' : ''}" id="toggle-list" title="Tampilan Daftar">
            <i data-lucide="list"></i>
            <span>Daftar</span>
          </button>
        </div>

        <button class="filter-select" id="manage-categories-btn" style="display: flex; align-items: center; gap: 6px;">
          <i data-lucide="tags" style="width: 16px; height: 16px;"></i>
          <span>Kelola Kategori</span>
        </button>

        ${user.role !== 'admin' ? `
          <button class="add-task-btn" id="add-task-btn">
            <i data-lucide="plus"></i>
            <span>Tambah Tugas</span>
          </button>
        ` : ''}
      </div>
    </div>

    <!-- Active View Content Container -->
    <div id="tasks-content-area"></div>
  `;

  // Bind Toolbar Actions
  const searchInput = container.querySelector('#task-search');
  searchInput.addEventListener('input', async (e) => {
    searchQuery = e.target.value;
    await renderViewContent();
  });

  const categoryFilter = container.querySelector('#filter-category');
  categoryFilter.addEventListener('change', async (e) => {
    filterCategory = e.target.value;
    await renderViewContent();
  });

  const priorityFilter = container.querySelector('#filter-priority');
  priorityFilter.addEventListener('change', async (e) => {
    filterPriority = e.target.value;
    await renderViewContent();
  });

  // Toggle buttons
  container.querySelector('#toggle-kanban').onclick = async () => {
    viewMode = 'kanban';
    container.querySelector('#toggle-kanban').classList.add('active');
    container.querySelector('#toggle-list').classList.remove('active');
    await renderViewContent();
  };

  container.querySelector('#toggle-list').onclick = async () => {
    viewMode = 'list';
    container.querySelector('#toggle-list').classList.add('active');
    container.querySelector('#toggle-kanban').classList.remove('active');
    await renderViewContent();
  };

  // Manage Categories button clicked
  container.querySelector('#manage-categories-btn').onclick = async () => await openManageCategoriesModal(container);

  // Add Task Button Clicked
  const addTaskBtn = container.querySelector('#add-task-btn');
  if (addTaskBtn) {
    addTaskBtn.onclick = async () => await openTaskFormModal(null, container);
  }
}

// Filter tasks based on global inputs
async function getFilteredTasks() {
  let tasks = await stateManager.getTasks();

  if (searchQuery) {
    tasks = tasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())));
  }

  if (filterCategory) {
    tasks = tasks.filter(t => t.categoryId === filterCategory);
  }

  if (filterPriority) {
    tasks = tasks.filter(t => t.priority === filterPriority);
  }

  return tasks;
}

// Renders the correct view layout content (Kanban Board / List View)
async function renderViewContent() {
  const contentArea = document.getElementById('tasks-content-area');
  if (!contentArea) return;

  const tasks = await getFilteredTasks();
  const categories = await stateManager.getCategories();

  if (viewMode === 'kanban') {
    renderKanban(contentArea, tasks, categories);
  } else {
    renderList(contentArea, tasks, categories);
  }

  lucide.createIcons();
}

// Render Kanban View
function renderKanban(container, tasks, categories) {
  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inprogressTasks = tasks.filter(t => t.status === 'inprogress');
  const doneTasks = tasks.filter(t => t.status === 'done');

  container.innerHTML = `
    <div class="kanban-board">
      <!-- To Do -->
      <div class="kanban-column" data-status="todo">
        <div class="column-header todo">
          <span class="column-title"><i data-lucide="circle"></i> Belum Dikerjakan</span>
          <span class="task-count-badge" id="count-todo">${todoTasks.length}</span>
        </div>
        <div class="kanban-list" id="list-todo">
          ${todoTasks.map(t => getKanbanCardHTML(t, categories)).join('')}
        </div>
      </div>

      <!-- In Progress -->
      <div class="kanban-column" data-status="inprogress">
        <div class="column-header inprogress">
          <span class="column-title"><i data-lucide="play-circle"></i> Proses</span>
          <span class="task-count-badge" id="count-inprogress">${inprogressTasks.length}</span>
        </div>
        <div class="kanban-list" id="list-inprogress">
          ${inprogressTasks.map(t => getKanbanCardHTML(t, categories)).join('')}
        </div>
      </div>

      <!-- Completed -->
      <div class="kanban-column" data-status="done">
        <div class="column-header done">
          <span class="column-title"><i data-lucide="check-circle-2"></i> Selesai</span>
          <span class="task-count-badge" id="count-done">${doneTasks.length}</span>
        </div>
        <div class="kanban-list" id="list-done">
          ${doneTasks.map(t => getKanbanCardHTML(t, categories)).join('')}
        </div>
      </div>
    </div>
  `;

  // Bind click & drag handlers
  bindCardClickListeners();
  bindDragAndDropHandlers();
}

function getKanbanCardHTML(task, categories) {
  const cat = categories.find(c => c.id === task.categoryId) || { name: 'Umum', color: '#64748b' };
  const attachmentsCount = task.attachments ? task.attachments.length : 0;
  const overdue = task.status !== 'done' && task.dueDate && new Date(task.dueDate).getTime() < Date.now();
  const dateFormatted = task.dueDate ? formatDate(task.dueDate) : 'No due date';

  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  const totalSubtasks = subtasks.length;
  const completedSubtasks = subtasks.filter(s => s.isCompleted).length;
  const progressPercentage = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return `
    <div class="task-card" draggable="true" data-task-id="${task.id}">
      <div class="task-card-header">
        <span class="task-category-tag" style="background-color: ${cat.color}">${cat.name}</span>
        <span class="task-priority-badge ${task.priority}">${task.priority}</span>
      </div>
      <div class="task-card-title">${task.title}</div>
      
      ${totalSubtasks > 0 ? `
        <div class="task-card-progress-wrapper" style="margin: 8px 0;">
          <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-muted); margin-bottom: 2px;">
            <span>Sub-tugas</span>
            <span>${completedSubtasks}/${totalSubtasks} (${progressPercentage}%)</span>
          </div>
          <div style="width: 100%; height: 4px; background-color: var(--bg-hover); border-radius: 2px; overflow: hidden; border: 1px solid var(--border-color);">
            <div style="width: ${progressPercentage}%; height: 100%; background: var(--primary-gradient); transition: width 0.3s ease;"></div>
          </div>
        </div>
      ` : ''}

      <div class="task-card-footer">
        <div class="task-card-icons">
          ${attachmentsCount > 0 ? `<span><i data-lucide="paperclip"></i> ${attachmentsCount}</span>` : ''}
          ${totalSubtasks > 0 ? `<span><i data-lucide="check-square"></i> ${completedSubtasks}/${totalSubtasks}</span>` : ''}
          ${task.description ? `<span><i data-lucide="align-left"></i></span>` : ''}
        </div>
        <div class="task-deadline-pill ${overdue ? 'overdue' : ''}" style="font-size: 0.75rem;">
          <i data-lucide="calendar"></i>
          <span>${dateFormatted}</span>
        </div>
        ${stateManager.getCurrentUser().role !== 'admin' ? `
          <button class="card-delete-btn" data-task-id="${task.id}" title="Hapus Tugas" style="margin-left: 8px; background:none; border:none; color: var(--danger); cursor:pointer;">
            <i data-lucide="trash-2"></i>
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

// Render List View
function renderList(container, tasks, categories) {
  if (tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-list-placeholder" style="background-color: var(--bg-card); padding: 40px;">
        <i data-lucide="clipboard"></i>
        <p>Tidak ada tugas yang sesuai filter.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="list-view-container">
      <table class="list-table">
        <thead>
          <tr>
            <th>Tugas</th>
            <th>Kategori</th>
            <th>Prioritas</th>
            <th>Tenggat Waktu</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${tasks.map(task => {
            const cat = categories.find(c => c.id === task.categoryId) || { name: 'Umum', color: '#64748b' };
            const statusLabel = task.status === 'todo' ? 'Belum Dikerjakan' : task.status === 'inprogress' ? 'Proses' : 'Selesai';
            const dateFormatted = task.dueDate ? formatDate(task.dueDate) : '-';
            const overdue = task.status !== 'done' && task.dueDate && new Date(task.dueDate).getTime() < Date.now();
            
            const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
            const totalSub = subtasks.length;
            const completedSub = subtasks.filter(s => s.isCompleted).length;
            const subText = totalSub > 0 ? ` <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal; margin-left: 6px;">(${completedSub}/${totalSub})</span>` : '';

            return `
              <tr data-task-id="${task.id}">
                <td style="font-weight: 600;">
                  <div style="display: flex; align-items: center; gap: 4px;">
                    <span>${task.title}</span>
                    ${subText}
                  </div>
                </td>
                <td>
                  <span class="task-category-tag" style="background-color: ${cat.color}">${cat.name}</span>
                </td>
                <td>
                  <span class="task-priority-badge ${task.priority}">${task.priority}</span>
                </td>
                <td>
                  <span class="task-deadline-pill ${overdue ? 'overdue' : ''}" style="border: none; padding: 0; background: none;">
                    ${dateFormatted}
                  </span>
                </td>
                <td>
                  <span class="list-status-badge ${task.status}">${statusLabel}</span>
                </td>
                <td>
                  <div class="list-action-btns">
                    <button class="list-btn edit-task-row" data-task-id="${task.id}" title="Edit Tugas">
                      <i data-lucide="edit-3"></i>
                    </button>
                    ${stateManager.getCurrentUser().role !== 'admin' ? `
                      <button class="list-btn delete delete-task-row" data-task-id="${task.id}" title="Hapus Tugas">
                        <i data-lucide="trash-2"></i>
                      </button>
                    ` : ''}
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Bind click triggers for lists
  container.querySelectorAll('tbody tr').forEach(row => {
    row.addEventListener('click', async (e) => {
      if (e.target.closest('.list-action-btns')) return;
      const taskId = row.getAttribute('data-task-id');
      await openTaskFormModal(taskId, document.querySelector('.view-container'));
    });
  });

  container.querySelectorAll('.edit-task-row').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const taskId = btn.getAttribute('data-task-id');
      await openTaskFormModal(taskId, document.querySelector('.view-container'));
    });
  });

  container.querySelectorAll('.delete-task-row').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const taskId = btn.getAttribute('data-task-id');
      if (confirm('Apakah Anda yakin ingin menghapus tugas ini?')) {
        await stateManager.deleteTask(taskId);
        showToast('Tugas berhasil dihapus.', 'success');
        await renderViewContent();
        
        // Refresh notifications
        window.dispatchEvent(new CustomEvent('hashchange'));
      }
    });
  });
}

// Drag and Drop Logic
function bindDragAndDropHandlers() {
  const cards = document.querySelectorAll('.task-card');
  const columns = document.querySelectorAll('.kanban-column');
  
  cards.forEach(card => {
    card.addEventListener('dragstart', () => {
      card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });
  });

  columns.forEach(column => {
    column.addEventListener('dragover', (e) => {
      e.preventDefault();
      column.classList.add('drag-over');
    });

    column.addEventListener('dragenter', (e) => {
      e.preventDefault();
      column.classList.add('drag-over');
    });

    column.addEventListener('dragleave', () => {
      column.classList.remove('drag-over');
    });

    column.addEventListener('drop', async (e) => {
      e.preventDefault();
      column.classList.remove('drag-over');
      
      const draggingCard = document.querySelector('.dragging');
      if (!draggingCard) return;

      const taskId = draggingCard.getAttribute('data-task-id');
      const newStatus = column.getAttribute('data-status');

      // Update state
      const task = await stateManager.updateTask(taskId, { status: newStatus });
      if (task) {
        showToast(`Tugas dipindahkan ke status: ${newStatus === 'todo' ? 'Belum Dikerjakan' : newStatus === 'inprogress' ? 'Proses' : 'Selesai'}`, 'info');
        await renderViewContent();

        // Dispatch status update event to refresh notification badge
        window.dispatchEvent(new CustomEvent('hashchange'));
      }
    });
  });
}

// Card details modal trigger
function bindCardClickListeners() {
  document.querySelectorAll('.task-card').forEach(card => {
    // Open modal on card click
    card.addEventListener('click', async () => {
      const taskId = card.getAttribute('data-task-id');
      await openTaskFormModal(taskId, document.querySelector('.view-container'));
    });

    // Delete button inside card (if present)
    const deleteBtn = card.querySelector('.card-delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevent opening modal
        const taskId = deleteBtn.getAttribute('data-task-id');
        if (confirm('Apakah Anda yakin ingin menghapus tugas ini?')) {
          await stateManager.deleteTask(taskId);
          showToast('Tugas berhasil dihapus.', 'success');
          await renderViewContent();
          // Refresh notifications / hashchange
          window.dispatchEvent(new CustomEvent('hashchange'));
        }
      });
    }
  });
}

// Modal Form Creator for Add/Edit
async function openTaskFormModal(taskId = null, pageContainer) {
  const categories = await stateManager.getCategories();
  const isEdit = !!taskId;
  const user = stateManager.getCurrentUser();
  const isAdmin = user.role === 'admin';

  let task = {
    title: '',
    categoryId: categories[0]?.id || '',
    priority: 'sedang',
    status: 'todo',
    dueDate: '',
    description: '',
    attachments: [],
    subtasks: []
  };

  if (isEdit) {
    const tasks = await stateManager.getTasks();
    const foundTask = tasks.find(t => t.id === taskId);
    if (!foundTask) return;
    task = JSON.parse(JSON.stringify(foundTask)); // Deep copy
    if (!task.subtasks) task.subtasks = [];
  }

  const titleModal = isEdit ? (isAdmin ? 'Rincian Tugas Mahasiswa' : 'Edit Tugas Kuliah') : 'Tambah Tugas Baru';
  
  const formHtml = `
    <form id="task-form">
      <div class="form-group">
        <label class="form-label" for="task-title-input">Judul Tugas</label>
        <input type="text" id="task-title-input" class="form-input-control" value="${task.title}" required ${isAdmin ? 'disabled' : ''}>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="task-category-input">Kategori Mata Kuliah</label>
          <select id="task-category-input" class="form-input-control" ${isAdmin ? 'disabled' : ''}>
            ${categories.map(c => `<option value="${c.id}" ${task.categoryId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="task-priority-input">Skala Prioritas</label>
          <select id="task-priority-input" class="form-input-control" ${isAdmin ? 'disabled' : ''}>
            <option value="rendah" ${task.priority === 'rendah' ? 'selected' : ''}>Rendah</option>
            <option value="sedang" ${task.priority === 'sedang' ? 'selected' : ''}>Sedang</option>
            <option value="tinggi" ${task.priority === 'tinggi' ? 'selected' : ''}>Tinggi</option>
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="task-due-input">Tenggat Waktu (Deadline)</label>
          <input type="datetime-local" id="task-due-input" class="form-input-control" value="${task.dueDate}" required ${isAdmin ? 'disabled' : ''}>
        </div>

        <div class="form-group">
          <label class="form-label" for="task-status-input">Status Pengerjaan</label>
          <select id="task-status-input" class="form-input-control" ${isAdmin ? 'disabled' : ''}>
            <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>Belum Dikerjakan</option>
            <option value="inprogress" ${task.status === 'inprogress' ? 'selected' : ''}>Dalam Proses</option>
            <option value="done" ${task.status === 'done' ? 'selected' : ''}>Selesai</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="task-desc-input">Deskripsi Instruksi Tugas</label>
        <textarea id="task-desc-input" class="form-input-control form-textarea" placeholder="Detail petunjuk, link materi, atau catatan kelompok..." ${isAdmin ? 'disabled' : ''}>${task.description || ''}</textarea>
      </div>

      <!-- Sub-Tugas Checklist Section -->
      <div class="form-group">
        <label class="form-label" style="display: flex; justify-content: space-between; align-items: center;">
          <span>Daftar Sub-Tugas (Checklist)</span>
          <span class="subtask-progress-text" id="subtask-progress-info" style="font-size: 0.75rem; font-weight: 600; color: var(--primary);">0%</span>
        </label>
        
        <div class="subtask-progress-bar-container" style="width: 100%; height: 6px; background-color: var(--bg-hover); border-radius: 3px; overflow: hidden; margin-bottom: 12px; border: 1px solid var(--border-color);">
          <div id="modal-subtask-progress-fill" style="width: 0%; height: 100%; background: var(--primary-gradient); transition: width 0.3s ease;"></div>
        </div>

        ${!isAdmin ? `
          <div class="subtask-add-control" style="display: flex; gap: 8px; margin-bottom: 12px;">
            <input type="text" id="subtask-new-input" class="form-input-control" placeholder="Tambah sub-tugas baru..." style="margin-bottom: 0;">
            <button type="button" id="subtask-add-btn" class="admin-submit-btn" style="width: auto; white-space: nowrap; padding: 0 16px; border-radius: var(--radius-xs);"><i data-lucide="plus" style="width:16px; height:16px; vertical-align:middle; margin-right:4px;"></i>Tambah</button>
          </div>
        ` : ''}

        <div class="subtasks-list-wrapper" id="task-subtasks-list" style="display: flex; flex-direction: column; gap: 8px; max-height: 180px; overflow-y: auto; margin-bottom: 12px;">
          <!-- Subtasks checklist items injected here -->
        </div>
      </div>

      <!-- File Attachment Simulation -->
      <div class="form-group">
        <label class="form-label">Lampiran Berkas Tugas (PDF/DOC/PPT)</label>
        ${!isAdmin ? `
          <div class="file-upload-dropzone" id="file-dropzone">
            <i data-lucide="upload-cloud"></i>
            <div class="file-upload-text">Klik atau seret file ke sini untuk mengunggah</div>
            <div class="file-upload-subtext">Mendukung file dokumen PDF, DOCX, PPTX hingga 10MB</div>
          </div>
        ` : ''}
        
        <div class="attachments-list" id="task-attachments-list">
          <!-- Attachments injected here -->
        </div>
      </div>

      <div class="modal-footer-btns">
        <button type="button" class="modal-btn btn-cancel">Batal</button>
        ${!isAdmin ? `
          <button type="submit" class="modal-btn btn-confirm">${isEdit ? 'Simpan Perubahan' : 'Tambah Tugas'}</button>
        ` : ''}
      </div>
    </form>
  `;

  // Render attachment list helper
  const renderAttachments = (attachments, wrapper) => {
    if (attachments.length === 0) {
      wrapper.innerHTML = '<div class="text-muted" style="font-size: 0.8rem; font-style: italic;">Tidak ada file dilampirkan.</div>';
      return;
    }

    wrapper.innerHTML = attachments.map((att, idx) => `
      <div class="attachment-badge">
        <div class="attachment-badge-left">
          <i data-lucide="file-text"></i>
          <span><strong>${att.name}</strong> (${(att.size / 1024 / 1024).toFixed(2)} MB)</span>
        </div>
        ${!isAdmin ? `
          <div class="attachment-remove-btn" data-index="${idx}" title="Hapus Berkas">
            <i data-lucide="x"></i>
          </div>
        ` : `<a href="#" style="color: var(--primary); font-size: 0.8rem; font-weight:600;" onclick="alert('Mengunduh berkas ${att.name}'); return false;">Unduh</a>`}
      </div>
    `).join('');
    lucide.createIcons();

    // Bind remove button click
    wrapper.querySelectorAll('.attachment-remove-btn').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.getAttribute('data-index'));
        attachments.splice(idx, 1);
        renderAttachments(attachments, wrapper);
      };
    });
  };

  openModal(titleModal, formHtml, (modalBody) => {
    // If admin, modal is just viewing. No confirmation updates.
    if (isAdmin) return true;

    // Get values
    const titleVal = modalBody.querySelector('#task-title-input').value.trim();
    const catVal = modalBody.querySelector('#task-category-input').value;
    const prioVal = modalBody.querySelector('#task-priority-input').value;
    const statusVal = modalBody.querySelector('#task-status-input').value;
    const dueVal = modalBody.querySelector('#task-due-input').value;
    const descVal = modalBody.querySelector('#task-desc-input').value.trim();

    if (!titleVal || !dueVal) {
      showToast('Judul dan Deadline wajib diisi!', 'error');
      return false;
    }

    const payload = {
      title: titleVal,
      categoryId: catVal,
      priority: prioVal,
      status: statusVal,
      dueDate: dueVal,
      description: descVal,
      attachments: task.attachments,
      subtasks: task.subtasks
    };

    // run async actions in background
    (async () => {
      if (isEdit) {
        await stateManager.updateTask(task.id, payload);
        showToast('Tugas kuliah berhasil diperbarui.', 'success');
      } else {
        await stateManager.addTask(payload);
        showToast('Tugas kuliah baru berhasil ditambahkan.', 'success');
      }

      // Refresh view
      await renderViewContent();

      // Trigger router/notifications refresh
      window.dispatchEvent(new CustomEvent('hashchange'));
    })();

    return true;
  });

  // Attach event actions for upload and files inside modal
  const modalBody = document.getElementById('modal-body');
  const attWrapper = modalBody.querySelector('#task-attachments-list');
  renderAttachments(task.attachments, attWrapper);

  // Render subtasks checklist
  const subWrapper = modalBody.querySelector('#task-subtasks-list');
  
  // Render subtask list helper
  const renderSubtasks = (subtasks, wrapper) => {
    const total = subtasks.length;
    const completed = subtasks.filter(s => s.isCompleted).length;
    const progressVal = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Update progress bar in modal
    const fill = document.getElementById('modal-subtask-progress-fill');
    const text = document.getElementById('subtask-progress-info');
    if (fill) fill.style.width = `${progressVal}%`;
    if (text) text.textContent = `${completed}/${total} (${progressVal}%)`;

    if (total === 0) {
      wrapper.innerHTML = '<div class="text-muted" style="font-size: 0.8rem; font-style: italic;">Belum ada sub-tugas.</div>';
      return;
    }

    wrapper.innerHTML = subtasks.map((sub, idx) => `
      <div class="subtask-item-row" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--bg-hover); border-radius: var(--radius-xs); border: 1px solid var(--border-color);">
        <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; flex-grow: 1;">
          <input type="checkbox" class="subtask-check" data-index="${idx}" ${sub.isCompleted ? 'checked' : ''} ${isAdmin ? 'disabled' : ''} style="cursor: pointer; width: 16px; height: 16px;">
          <span style="font-size: 0.85rem; text-decoration: ${sub.isCompleted ? 'line-through' : 'none'}; color: ${sub.isCompleted ? 'var(--text-muted)' : 'var(--text-primary)'}; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${sub.title}</span>
        </div>
        ${!isAdmin ? `
          <button type="button" class="subtask-remove-btn" data-index="${idx}" style="background: none; border: none; color: var(--text-muted); cursor: pointer; transition: color 0.2s; display: flex; align-items: center; justify-content: center;">
            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
          </button>
        ` : ''}
      </div>
    `).join('');
    lucide.createIcons();

    // Bind check action
    wrapper.querySelectorAll('.subtask-check').forEach(chk => {
      chk.onchange = () => {
        const idx = parseInt(chk.getAttribute('data-index'));
        subtasks[idx].isCompleted = chk.checked;
        renderSubtasks(subtasks, wrapper);
      };
    });

    // Bind remove action
    wrapper.querySelectorAll('.subtask-remove-btn').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.getAttribute('data-index'));
        subtasks.splice(idx, 1);
        renderSubtasks(subtasks, wrapper);
      };
    });
  };

  renderSubtasks(task.subtasks, subWrapper);

  // Bind add subtask action
  if (!isAdmin) {
    const addSubtaskBtn = modalBody.querySelector('#subtask-add-btn');
    const newSubtaskInput = modalBody.querySelector('#subtask-new-input');
    
    const addSubtaskAction = () => {
      const title = newSubtaskInput.value.trim();
      if (!title) return;
      task.subtasks.push({
        id: `sub-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: title,
        isCompleted: false
      });
      newSubtaskInput.value = '';
      renderSubtasks(task.subtasks, subWrapper);
    };

    if (addSubtaskBtn) {
      addSubtaskBtn.onclick = addSubtaskAction;
    }
    if (newSubtaskInput) {
      newSubtaskInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addSubtaskAction();
        }
      };
    }
  }

  const dropzone = modalBody.querySelector('#file-dropzone');
  if (dropzone) {
    dropzone.onclick = () => {
      // Simulate file upload
      const fileNames = [
        'Instruksi_Tugas_Praktikum.pdf', 
        'Draft_Laporan_Analisis.docx', 
        'Slide_Presentasi_Kelompok.pptx', 
        'Screenshot_Error_Database.png'
      ];
      const randomName = fileNames[Math.floor(Math.random() * fileNames.length)];
      const randomSize = Math.floor(Math.random() * 5 * 1024 * 1024) + 500000; // 500kb - 5.5MB
      
      const isDuplicate = task.attachments.some(att => att.name === randomName);
      if (isDuplicate) {
        showToast('Berkas dengan nama ini sudah diunggah.', 'warning');
        return;
      }

      task.attachments.push({
        name: randomName,
        size: randomSize,
        type: 'document',
        date: new Date().toISOString().split('T')[0]
      });

      showToast(`Berkas "${randomName}" berhasil diunggah (Simulasi).`, 'success');
      renderAttachments(task.attachments, attWrapper);
    };
  }
}

// Categories Management modal popover
async function openManageCategoriesModal(pageContainer) {
  const categories = await stateManager.getCategories();
  
  const getCategoriesHTML = () => `
    <div class="manage-categories-wrapper">
      <div style="display: flex; flex-direction: column; gap: 16px; max-height: 250px; overflow-y: auto; margin-bottom: 20px;" id="categories-modal-list">
        ${categories.map(c => `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border-bottom: 1px solid var(--border-color);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="width: 14px; height: 14px; border-radius: 50%; background-color: ${c.color};"></span>
              <strong style="font-size: 0.9rem;">${c.name}</strong>
            </div>
            <button class="list-btn delete delete-cat-btn" data-cat-id="${c.id}" title="Hapus Kategori">
              <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
            </button>
          </div>
        `).join('')}
      </div>

      <form id="add-category-form" style="border-top: 1px solid var(--border-color); padding-top: 16px;">
        <h4 style="margin-bottom: 12px; font-size: 0.95rem;">Tambah Kategori Mata Kuliah</h4>
        <div class="form-group">
          <label class="form-label">Nama Mata Kuliah</label>
          <input type="text" id="new-cat-name" class="form-input-control" placeholder="RPL, Pemrograman Web, AI, dsb." required>
        </div>
        <div class="form-group">
          <label class="form-label">Warna Tag Kategori</label>
          <input type="color" id="new-cat-color" class="form-input-control" style="height: 44px; padding: 4px;" value="#4f46e5">
        </div>
        <button type="submit" class="admin-submit-btn" style="background-color: var(--accent);">Simpan Kategori</button>
      </form>
    </div>
  `;

  openModal('Kelola Kategori Kuliah', getCategoriesHTML(), null);

  // Remove Close Confirmation since categories CRUD is immediate
  const closeConfirm = document.getElementById('modal-close-btn');
  const modalContainer = document.getElementById('modal-container');
  
  const refreshModalList = async () => {
    const listWrap = document.getElementById('categories-modal-list');
    if (listWrap) {
      const cats = await stateManager.getCategories();
      listWrap.innerHTML = cats.map(c => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border-bottom: 1px solid var(--border-color);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="width: 14px; height: 14px; border-radius: 50%; background-color: ${c.color};"></span>
            <strong style="font-size: 0.9rem;">${c.name}</strong>
          </div>
          <button class="list-btn delete delete-cat-btn" data-cat-id="${c.id}" title="Hapus Kategori">
            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
          </button>
        </div>
      `).join('');
      lucide.createIcons();
      bindDeleteCat();
    }
  };

  const bindDeleteCat = () => {
    document.querySelectorAll('.delete-cat-btn').forEach(btn => {
      btn.onclick = async () => {
        const catId = btn.getAttribute('data-cat-id');
        if (confirm('Apakah Anda yakin ingin menghapus kategori ini? Semua tugas dengan kategori ini akan disetel menjadi kategori umum.')) {
          await stateManager.deleteCategory(catId);
          showToast('Kategori berhasil dihapus.', 'success');
          
          // Refresh list inside modal
          await refreshModalList();
          
          // Refresh background view
          await renderLayout(pageContainer, stateManager.getCurrentUser());
          await renderViewContent();
        }
      };
    });
  };

  bindDeleteCat();

  // Add Category form submit
  const addCatForm = document.getElementById('add-category-form');
  addCatForm.onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('new-cat-name').value.trim();
    const color = document.getElementById('new-cat-color').value;

    const res = await stateManager.addCategory(name, color);
    if (res.success) {
      showToast(`Kategori "${name}" berhasil ditambahkan!`, 'success');
      document.getElementById('new-cat-name').value = '';
      
      // Refresh list inside modal
      await refreshModalList();
      
      // Refresh background view
      await renderLayout(pageContainer, stateManager.getCurrentUser());
      await renderViewContent();
    } else {
      showToast(res.message, 'error');
    }
  };
}

// Format date helper
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
