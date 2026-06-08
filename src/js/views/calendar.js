/* StudyFlow Academic Calendar View Controller */

import { stateManager } from '../state.js';
import { openModal, navigateTo } from '../app.js';

let currentDate = new Date(); // Tracks the currently viewed month

export async function renderCalendar(container) {
  await renderLayout(container);
  bindCalendarEvents(container);
}

async function renderLayout(container) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  container.innerHTML = `
    <div class="calendar-wrapper">
      <!-- Calendar Header -->
      <div class="calendar-header">
        <div class="calendar-title-wrapper">
          <button class="calendar-nav-btn" id="prev-month-btn">
            <i data-lucide="chevron-left"></i>
          </button>
          <h2>${monthNames[month]} ${year}</h2>
          <button class="calendar-nav-btn" id="next-month-btn">
            <i data-lucide="chevron-right"></i>
          </button>
        </div>
        <div>
          <button class="calendar-nav-btn" id="today-btn" style="width: auto; padding: 0 16px; font-weight:600; font-size:0.85rem;">Hari Ini</button>
        </div>
      </div>

      <!-- Days Grid Header -->
      <div class="calendar-grid">
        <div class="calendar-day-header">Min</div>
        <div class="calendar-day-header">Sen</div>
        <div class="calendar-day-header">Sel</div>
        <div class="calendar-day-header">Rab</div>
        <div class="calendar-day-header">Kam</div>
        <div class="calendar-day-header">Jum</div>
        <div class="calendar-day-header">Sab</div>
      </div>

      <!-- Calendar Month Days -->
      <div class="calendar-grid" id="calendar-days-grid"></div>
    </div>
  `;

  await renderDaysGrid();
  lucide.createIcons();
}

async function renderDaysGrid() {
  const grid = document.getElementById('calendar-days-grid');
  if (!grid) return;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // First day of current month (0-6 representation, Sunday is 0)
  const firstDayIndex = new Date(year, month, 1).getDay();
  
  // Total days in current month
  const totalDays = new Date(year, month + 1, 0).getDate();
  
  // Total days in previous month
  const prevMonthTotalDays = new Date(year, month, 0).getDate();
  
  // Grid dates storage
  const cells = [];
  const tasks = await stateManager.getTasks();
  const categories = await stateManager.getCategories();

  // 1. Previous Month's trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    cells.push({
      day: prevMonthTotalDays - i,
      month: month - 1,
      year: year,
      differentMonth: true
    });
  }

  // 2. Current Month's days
  const today = new Date();
  for (let i = 1; i <= totalDays; i++) {
    const isToday = today.getDate() === i && today.getMonth() === month && today.getFullYear() === year;
    cells.push({
      day: i,
      month: month,
      year: year,
      differentMonth: false,
      isToday: isToday
    });
  }

  // 3. Next Month's leading days (making grid exactly multiple of 7, e.g., 42 cells)
  const remainingCells = 42 - cells.length;
  for (let i = 1; i <= remainingCells; i++) {
    cells.push({
      day: i,
      month: month + 1,
      year: year,
      differentMonth: true
    });
  }

  // Generate grid cells HTML
  grid.innerHTML = cells.map(cell => {
    let cellClasses = 'calendar-cell';
    if (cell.differentMonth) cellClasses += ' different-month';
    if (cell.isToday) cellClasses += ' today';

    // Query tasks due on this cell's date
    // Format cell date matching task dueDate (yyyy-mm-dd)
    const cellMonthStr = String(cell.month + 1).padStart(2, '0');
    const cellDayStr = String(cell.day).padStart(2, '0');
    const cellDateStr = `${cell.year}-${cellMonthStr}-${cellDayStr}`;

    const cellTasks = tasks.filter(t => t.dueDate && t.dueDate.startsWith(cellDateStr));

    // Get HTML for up to 3 task labels inside cell
    const tasksHTML = cellTasks.slice(0, 3).map(task => {
      const cat = categories.find(c => c.id === task.categoryId) || { name: 'Umum', color: '#64748b' };
      return `
        <span class="calendar-task-tag ${task.status}" style="background-color: ${cat.color};" title="${task.title}">
          ${task.title}
        </span>
      `;
    }).join('');

    // If more than 3 tasks, add a +N indicator
    const overflowCount = cellTasks.length - 3;
    const overflowHTML = overflowCount > 0 ? `
      <span class="text-muted" style="font-size: 0.7rem; font-weight: 700; padding-left: 4px;">
        +${overflowCount} Tugas Lagi
      </span>
    ` : '';

    return `
      <div class="${cellClasses}" data-date="${cellDateStr}">
        <span class="calendar-cell-date">${cell.day}</span>
        <div class="calendar-cell-tasks">
          ${tasksHTML}
          ${overflowHTML}
        </div>
      </div>
    `;
  }).join('');

  // Add click events to calendar cells
  grid.querySelectorAll('.calendar-cell').forEach(cell => {
    cell.onclick = () => {
      const dateStr = cell.getAttribute('data-date');
      const isDifferentMonth = cell.classList.contains('different-month');
      
      // Do not open details modal if empty day of different month clicked
      if (isDifferentMonth) return;

      const cellTasks = tasks.filter(t => t.dueDate && t.dueDate.startsWith(dateStr));
      openCellDetailsModal(dateStr, cellTasks, categories);
    };
  });
}

function bindCalendarEvents(container) {
  // Prev Month
  container.querySelector('#prev-month-btn').onclick = async () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    await renderLayout(container);
  };

  // Next Month
  container.querySelector('#next-month-btn').onclick = async () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    await renderLayout(container);
  };

  // Today
  container.querySelector('#today-btn').onclick = async () => {
    currentDate = new Date();
    await renderLayout(container);
  };
}

// Opens details modal when clicking a date cell
function openCellDetailsModal(dateStr, tasks, categories) {
  const parsedDate = new Date(dateStr);
  const formattedHeaderDate = parsedDate.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  if (tasks.length === 0) {
    // Empty cell details
    const emptyHtml = `
      <div style="text-align: center; padding: 20px; color: var(--text-muted);">
        <i data-lucide="calendar-active" style="width: 40px; height: 40px; margin-bottom: 8px;"></i>
        <p>Tidak ada tugas atau deadline yang dikumpulkan pada hari ini.</p>
        <button class="add-task-btn" id="modal-cal-add-btn" style="margin: 16px auto 0 auto;">
          <i data-lucide="plus"></i>
          <span>Tambah Tugas</span>
        </button>
      </div>
    `;

    openModal(`Deadline ${formattedHeaderDate}`, emptyHtml, null);
    
    // Bind quick add task button
    const quickAddBtn = document.getElementById('modal-cal-add-btn');
    if (quickAddBtn) {
      quickAddBtn.onclick = () => {
        // Close calendar modal and open tasks view to add
        document.getElementById('modal-container').classList.add('hidden');
        navigateTo('#tasks');
        // Let's programmatically trigger task addition (after short timeout to load view)
        setTimeout(() => {
          const addBtn = document.getElementById('add-task-btn');
          if (addBtn) addBtn.click();
          // Inject default date
          setTimeout(() => {
            const dateInput = document.getElementById('task-due-input');
            if (dateInput) dateInput.value = dateStr + 'T12:00';
          }, 300);
        }, 500);
      };
    }
    return;
  }

  // Cell with tasks details list
  const listHtml = `
    <div class="calendar-day-tasks-list">
      ${tasks.map(task => {
        const cat = categories.find(c => c.id === task.categoryId) || { name: 'Umum', color: '#64748b' };
        const timeFormatted = new Date(task.dueDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const isOverdue = task.status !== 'done' && new Date(task.dueDate).getTime() < Date.now();
        
        return `
          <div class="calendar-modal-task-item" data-task-id="${task.id}">
            <div class="calendar-modal-task-left">
              <span class="task-category-dot" style="background-color: ${cat.color};"></span>
              <div>
                <div class="calendar-modal-task-title">${task.title}</div>
                <div class="calendar-modal-task-time">
                  <span class="task-priority-badge ${task.priority}">${task.priority}</span>
                  <span>• Jam ${timeFormatted}</span>
                </div>
              </div>
            </div>
            <div>
              <span class="list-status-badge ${task.status}" style="font-size: 0.7rem; padding: 2px 8px;">
                ${task.status === 'todo' ? 'Belum' : task.status === 'inprogress' ? 'Proses' : 'Selesai'}
              </span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  openModal(`Deadline ${formattedHeaderDate}`, listHtml, null);

  // Bind click trigger on task items inside modal
  const modal = document.getElementById('modal-body');
  modal.querySelectorAll('.calendar-modal-task-item').forEach(item => {
    item.onclick = () => {
      const taskId = item.getAttribute('data-task-id');
      // Close active modal
      document.getElementById('modal-container').classList.add('hidden');
      
      // Navigate to tasks and open details
      navigateTo('#tasks');
      setTimeout(() => {
        const taskCard = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskCard) {
          taskCard.click(); // Programmatically click to open details modal
        }
      }, 500);
    };
  });
}
