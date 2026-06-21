import { stateManager } from '../state.js';
import { downloadCSV, downloadJSON } from '../utils.js';

// Hold references to active chart instances to prevent canvas collision errors on re-render
let weeklyChartInstance = null;
let categoryChartInstance = null;

// Keep track of current filter states and fetched data locally
let localTasks = [];
let localCategories = [];
let localSelectedStudentId = ''; // Used by admin to select student
let currentFilterDate = 'all';
let currentFilterCategory = 'all';

export async function renderStats(container) {
  // Ensure container is empty
  container.innerHTML = '';

  const user = stateManager.getCurrentUser();
  if (!user) {
    container.innerHTML = `<div class="error-view"><i data-lucide="alert-triangle"></i>Pengguna tidak terautentikasi.</div>`;
    lucide.createIcons();
    return;
  }

  // Fetch all categories once
  localCategories = await stateManager.getCategories();

  if (user.role === 'admin') {
    await renderAdminDashboard(container, user);
  } else {
    // Student view
    localSelectedStudentId = user.id;
    await renderStudentDashboard(container, user.id, false);
  }
}

// -----------------------------------------------------------------
// ADMIN DASHBOARD VIEW
// -----------------------------------------------------------------
async function renderAdminDashboard(container, adminUser) {
  // Fetch overview data
  const adminStats = await stateManager.getAdminOverviewStats();
  const students = await stateManager.getStudents();

  if (!adminStats) {
    container.innerHTML = `<div class="error-view"><i data-lucide="alert-triangle"></i>Gagal mengambil statistik tim.</div>`;
    lucide.createIcons();
    return;
  }

  // Draw container layout
  container.innerHTML = `
    <div class="stats-container">
      <div class="stats-header-filters">
        <div class="stats-title-wrapper">
          <h2>Statistik & Monitoring Mahasiswa</h2>
          <p class="text-muted">Pantau produktivitas dan pengerjaan tugas seluruh mahasiswa</p>
        </div>
        <div class="stats-filters">
          <div class="filter-group">
            <label for="admin-select-student">Pilih Mahasiswa untuk Analisis Detail</label>
            <select id="admin-select-student" class="form-select">
              <option value="">-- Ringkasan Tim / Semua Mahasiswa --</option>
              ${students.map(s => `<option value="${s.id}" ${localSelectedStudentId === s.id ? 'selected' : ''}>${s.name} (${s.nim})</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <div id="admin-main-content">
        <!-- Rendered dynamic content depending on student dropdown selection -->
      </div>
    </div>
  `;

  // Attach listener to dropdown
  const selectDropdown = document.getElementById('admin-select-student');
  selectDropdown.addEventListener('change', async (e) => {
    const selectedVal = e.target.value;
    localSelectedStudentId = selectedVal;
    
    // Reset filters when switching
    currentFilterDate = 'all';
    currentFilterCategory = 'all';
    
    await updateAdminView(adminUser);
  });

  // Run initial update
  await updateAdminView(adminUser);
}

// Update either the admin aggregate list or a selected student's stats dashboard
async function updateAdminView(adminUser) {
  const mainDiv = document.getElementById('admin-main-content');
  if (!mainDiv) return;
  mainDiv.innerHTML = '';

  if (!localSelectedStudentId) {
    // No specific student selected, render aggregate overview
    const adminStats = await stateManager.getAdminOverviewStats();
    
    const kpiCardsHtml = `
      <div class="stats-grid-top">
        <div class="stats-summary-card">
          <div class="stats-icon-wrapper">
            <i data-lucide="users"></i>
          </div>
          <div class="stats-card-info">
            <h4>Total Mahasiswa</h4>
            <p class="stats-value">${adminStats.totalStudents}</p>
            <span class="stats-label">Aktif Terdaftar</span>
          </div>
        </div>

        <div class="stats-summary-card accent">
          <div class="stats-icon-wrapper">
            <i data-lucide="check-square"></i>
          </div>
          <div class="stats-card-info">
            <h4>Total Tugas Kuliah</h4>
            <p class="stats-value">${adminStats.totalTasks}</p>
            <span class="stats-label">Dengan ${adminStats.totalCompleted} tugas selesai</span>
          </div>
        </div>

        <div class="stats-summary-card warning">
          <div class="stats-icon-wrapper">
            <i data-lucide="clock"></i>
          </div>
          <div class="stats-card-info">
            <h4>Rata-rata Penyelesaian</h4>
            <p class="stats-value">${adminStats.avgCompletionHours} jam</p>
            <span class="stats-label">Rata-rata per tugas tim</span>
          </div>
        </div>

        <div class="stats-summary-card danger">
          <div class="stats-icon-wrapper">
            <i data-lucide="trending-up"></i>
          </div>
          <div class="stats-card-info">
            <h4>Rasio Kelulusan Tugas</h4>
            <p class="stats-value">${adminStats.totalTasks > 0 ? Math.round((adminStats.totalCompleted / adminStats.totalTasks) * 100) : 0}%</p>
            <span class="stats-label">Tingkat efektivitas tim</span>
          </div>
        </div>
      </div>
    `;

    const studentsTableHtml = `
      <div class="admin-metrics-card">
        <h3><i data-lucide="award"></i> Ringkasan Kinerja Mahasiswa</h3>
        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Mahasiswa</th>
                <th>Program Studi</th>
                <th>Total Tugas</th>
                <th>Tugas Selesai</th>
                <th>Progres Belajar</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${adminStats.studentMetrics.map(student => `
                <tr>
                  <td>
                    <div class="student-info-cell">
                      <img src="${student.avatar}" class="student-avatar" alt="avatar">
                      <div class="student-name-nim">
                        <strong>${student.name}</strong>
                        <span class="nim">${student.nim}</span>
                      </div>
                    </div>
                  </td>
                  <td>${student.prodi}</td>
                  <td>${student.totalTasks}</td>
                  <td>${student.completedTasks}</td>
                  <td>
                    <div class="progress-bar-container ${student.completionRate >= 75 ? 'success' : ''}">
                      <div class="progress-bar-fill" style="width: ${student.completionRate}%"></div>
                    </div>
                    <strong>${student.completionRate}%</strong>
                  </td>
                  <td>
                    <button class="btn-outline-primary view-student-btn" data-student-id="${student.id}">
                      Lihat Detail
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    mainDiv.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: var(--spacing-lg);">
        ${kpiCardsHtml}
        ${studentsTableHtml}
      </div>
    `;

    // Add click listeners to student detailed buttons
    mainDiv.querySelectorAll('.view-student-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const studentId = e.target.getAttribute('data-student-id');
        localSelectedStudentId = studentId;
        
        // Select student in the dropdown
        const selectDropdown = document.getElementById('admin-select-student');
        if (selectDropdown) selectDropdown.value = studentId;

        await updateAdminView(adminUser);
      });
    });

    lucide.createIcons();
  } else {
    // Render detailed view for a single selected student
    await renderStudentDashboard(mainDiv, localSelectedStudentId, true);
  }
}

// -----------------------------------------------------------------
// STUDENT DETAILED DASHBOARD VIEW
// -----------------------------------------------------------------
async function renderStudentDashboard(targetContainer, studentId, isAdminViewing) {
  // Fetch tasks
  // For admins, we fetch all tasks from server, then filter locally
  const currentUser = stateManager.getCurrentUser();
  let tasks = [];
  if (currentUser.role === 'admin') {
    try {
      const res = await fetch(`/api/tasks?userId=${currentUser.id}&role=admin`);
      if (res.ok) {
        const allTasks = await res.json();
        tasks = allTasks.filter(t => t.studentId === studentId);
      }
    } catch (e) {
      console.error(e);
    }
  } else {
    tasks = await stateManager.getTasks();
  }

  localTasks = tasks;

  // Render core dashboard elements inside target container
  targetContainer.innerHTML = `
    <div class="stats-container" style="padding: 0;">
      ${isAdminViewing ? `
        <div style="display: flex; align-items: center; gap: var(--spacing-sm); margin-bottom: -10px;">
          <button id="back-to-aggregate" class="btn-secondary" style="padding: 6px 12px; font-size: 0.85rem;">
            <i data-lucide="arrow-left"></i> Kembali ke Ringkasan Tim
          </button>
        </div>
      ` : ''}

      <div class="stats-header-filters" style="${isAdminViewing ? 'margin-top: 10px;' : ''}">
        <div class="stats-title-wrapper">
          <h2>Statistik Produktivitas Pribadi</h2>
          <p class="text-muted">Pantau pencapaian akademik dan kecepatan belajar Anda</p>
        </div>
        <div class="stats-filters">
          <div class="filter-group">
            <label for="filter-date">Tenggat Waktu</label>
            <select id="filter-date" class="form-select">
              <option value="all" ${currentFilterDate === 'all' ? 'selected' : ''}>Semua Waktu</option>
              <option value="7days" ${currentFilterDate === '7days' ? 'selected' : ''}>7 Hari Terakhir</option>
              <option value="30days" ${currentFilterDate === '30days' ? 'selected' : ''}>30 Hari Terakhir</option>
            </select>
          </div>
          <div class="filter-group">
            <label for="filter-category">Kategori</label>
            <select id="filter-category" class="form-select">
              <option value="all" ${currentFilterCategory === 'all' ? 'selected' : ''}>Semua Kategori</option>
              ${localCategories.map(c => `<option value="${c.id}" ${currentFilterCategory === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <!-- KPI Summary Cards Section -->
      <div id="stats-kpi-row" class="stats-grid-top"></div>

      <!-- Charts Section -->
      <div class="stats-charts-container">
        <div class="chart-card">
          <div class="chart-card-header">
            <h4 class="chart-card-title"><i data-lucide="bar-chart-3"></i> Progres Selesai Mingguan</h4>
          </div>
          <div class="chart-wrapper">
            <canvas id="weeklyChart"></canvas>
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-card-header">
            <h4 class="chart-card-title"><i data-lucide="gauge"></i> Rata-rata Penyelesaian per Kategori</h4>
          </div>
          <div class="chart-wrapper">
            <canvas id="categoryChart"></canvas>
          </div>
        </div>
      </div>

      <!-- Heatmap & Insights Row -->
      <div class="stats-activity-insights">
        <div class="heatmap-section">
          <h3><i data-lucide="calendar"></i> Pola Aktivitas Harian</h3>
          <p class="text-muted" style="font-size: 0.8rem; margin: -10px 0 16px 0;">Intensitas pengerjaan tugas selesai dalam satu minggu</p>
          <div class="heatmap-grid" id="heatmap-grid-container"></div>
        </div>

        
    </div>
  `;

  // Attach event listener for back button if admin is viewing
  if (isAdminViewing) {
    const backBtn = document.getElementById('back-to-aggregate');
    backBtn.addEventListener('click', async () => {
      localSelectedStudentId = '';
      const selectDropdown = document.getElementById('admin-select-student');
      if (selectDropdown) selectDropdown.value = '';
      await updateAdminView(currentUser);
    });
  }

  // Setup filter update logic
  const dateSelect = document.getElementById('filter-date');
  const catSelect = document.getElementById('filter-category');

  const onFilterChange = () => {
    currentFilterDate = dateSelect.value;
    currentFilterCategory = catSelect.value;
    refreshCalculatedData();
  };

  dateSelect.addEventListener('change', onFilterChange);
  catSelect.addEventListener('change', onFilterChange);

  // Initialize data render
  refreshCalculatedData();
  lucide.createIcons();
}

// Perform calculations based on active filters and redraw cards/charts
function refreshCalculatedData() {
  // Filter task list locally
  let filtered = [...localTasks];

  // 1. Apply Date Filter
  if (currentFilterDate !== 'all') {
    const now = Date.now();
    let limitDays = currentFilterDate === '7days' ? 7 : 30;
    const msLimit = limitDays * 24 * 60 * 60 * 1000;
    
    filtered = filtered.filter(t => {
      const dateToCheck = t.completedAt ? new Date(t.completedAt).getTime() : new Date(t.createdAt).getTime();
      return (now - dateToCheck) <= msLimit;
    });
  }

  // 2. Apply Category Filter
  if (currentFilterCategory !== 'all') {
    filtered = filtered.filter(t => t.categoryId === currentFilterCategory);
  }

  // Calculate local stats
  const calculated = computeStats(filtered, localCategories);

  // Update DOM elements
  renderKPICards(calculated);
  renderHeatmap(calculated.heatmap);
  renderInsights(calculated);
  renderCharts(calculated);

  // Bind Export handlers with currently filtered metrics (if buttons exist)
  const exportCsvBtn = document.getElementById('export-csv-btn');
  if (exportCsvBtn) {
    exportCsvBtn.onclick = () => {
      const data = calculated.weeklyCompletion.map(w => ({ Minggu: w.label, Selesai: w.count }));
      downloadCSV(data, `statistik_mahasiswa_${localSelectedStudentId}.csv`);
    };
  }

  const exportJsonBtn = document.getElementById('export-json-btn');
  if (exportJsonBtn) {
    exportJsonBtn.onclick = () => {
      downloadJSON(calculated, `statistik_mahasiswa_${localSelectedStudentId}.json`);
    };
  }
}

// -----------------------------------------------------------------
// RENDERING FUNCTIONS FOR DETAILED STATS SCREEN
// -----------------------------------------------------------------
function renderKPICards(stats) {
  const row = document.getElementById('stats-kpi-row');
  if (!row) return;

  row.innerHTML = `
    <div class="stats-summary-card accent">
      <div class="stats-icon-wrapper">
        <i data-lucide="check-circle-2"></i>
      </div>
      <div class="stats-card-info">
        <h4>Tingkat Penyelesaian</h4>
        <p class="stats-value">${stats.completionRate}%</p>
        <span class="stats-label">${stats.totalCompleted} dari ${stats.totalCompleted + stats.totalPending} selesai</span>
      </div>
    </div>

    <div class="stats-summary-card">
      <div class="stats-icon-wrapper">
        <i data-lucide="hourglass"></i>
      </div>
      <div class="stats-card-info">
        <h4>Waktu Penyelesaian</h4>
        <p class="stats-value">${stats.avgCompletionHours} jam</p>
        <span class="stats-label">Rata-rata durasi tugas</span>
      </div>
    </div>

    <div class="stats-summary-card warning">
      <div class="stats-icon-wrapper">
        <i data-lucide="zap"></i>
      </div>
      <div class="stats-card-info">
        <h4>Streak Produktivitas</h4>
        <p class="stats-value">${stats.streakDays} Hari</p>
        <span class="stats-label">Hari berturut-turut selesai</span>
      </div>
    </div>

    <div class="stats-summary-card ${stats.completedToday >= 2 ? 'accent' : 'danger'}">
      <div class="stats-icon-wrapper">
        <i data-lucide="target"></i>
      </div>
      <div class="stats-card-info">
        <h4>Target Harian</h4>
        <p class="stats-value">${stats.completedToday} / 2</p>
        <span class="stats-label">${stats.completedToday >= 2 ? 'Target hari ini tercapai!' : 'Tingkatkan belajar hari ini'}</span>
      </div>
    </div>
  `;
  lucide.createIcons();
}

function renderHeatmap(heatmapData) {
  const container = document.getElementById('heatmap-grid-container');
  if (!container) return;

  const dayLabels = {
    mon: 'Sen',
    tue: 'Sel',
    wed: 'Rab',
    thu: 'Kam',
    fri: 'Jum',
    sat: 'Sab',
    sun: 'Min'
  };

  container.innerHTML = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => {
    const count = heatmapData[day] || 0;
    
    // Choose HSL opacity and hover styling dynamically based on density
    let opacity = 0.15;
    let bgColor = 'var(--text-muted)';
    let textColor = 'var(--text-secondary)';
    
    if (count > 0) {
      bgColor = 'var(--accent)';
      opacity = count === 1 ? 0.45 : (count === 2 ? 0.75 : 1.0);
      textColor = opacity > 0.6 ? 'var(--text-white)' : 'var(--text-primary)';
    }

    return `
      <div class="heatmap-cell" style="background-color: ${bgColor}; opacity: ${opacity}; color: ${textColor};" title="${count} tugas selesai pada hari ${dayLabels[day]}">
        <span>${dayLabels[day]}</span>
        <span class="count-badge">${count}</span>
      </div>
    `;
  }).join('');
}

function renderInsights(stats) {
  const container = document.getElementById('insights-container');
  if (!container) return;

  const insightsList = generateInsights(stats, localCategories);

  if (insightsList.length === 0) {
    container.innerHTML = `<li><i data-lucide="info"></i> Belum ada insight. Selesaikan lebih banyak tugas untuk memicu kecerdasan analitik.</li>`;
  } else {
    container.innerHTML = insightsList.map(ins => `
      <li>
        <i data-lucide="lightbulb"></i>
        <span>${ins}</span>
      </li>
    `).join('');
  }
  lucide.createIcons();
}

function renderCharts(stats) {
  const weeklyCanvas = document.getElementById('weeklyChart');
  const categoryCanvas = document.getElementById('categoryChart');

  if (!weeklyCanvas || !categoryCanvas) return;

  // Clear previous Chart.js instances if active
  if (weeklyChartInstance) {
    weeklyChartInstance.destroy();
  }
  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }

  // 1. Weekly Task Completion Bar Chart
  const weeklyCtx = weeklyCanvas.getContext('2d');
  
  // Create beautiful gradient
  const primaryGrad = weeklyCtx.createLinearGradient(0, 0, 0, 200);
  primaryGrad.addColorStop(0, '#4f46e5');
  primaryGrad.addColorStop(1, '#818cf8');

  weeklyChartInstance = new Chart(weeklyCtx, {
    type: 'bar',
    data: {
      labels: stats.weeklyCompletion.map(w => w.label),
      datasets: [{
        label: 'Tugas Selesai',
        data: stats.weeklyCompletion.map(w => w.count),
        backgroundColor: primaryGrad,
        borderRadius: 8,
        barThickness: 24
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(100, 116, 139, 0.1)' },
          ticks: { stepSize: 1, color: 'var(--text-muted)' }
        },
        x: {
          grid: { display: false },
          ticks: { color: 'var(--text-muted)' }
        }
      }
    }
  });

  // 2. Average Completion Time per Category (Horizontal Bar Chart)
  const categoryCtx = categoryCanvas.getContext('2d');
  const accentGrad = categoryCtx.createLinearGradient(0, 0, 300, 0);
  accentGrad.addColorStop(0, '#0d9488');
  accentGrad.addColorStop(1, '#22d3ee');

  // Filter out categories with 0 hours to make the chart look clean and meaningful
  const populatedCats = stats.categoryAverages.filter(c => c.avgHours > 0);

  categoryChartInstance = new Chart(categoryCtx, {
    type: 'bar',
    data: {
      labels: populatedCats.length > 0 ? populatedCats.map(c => c.categoryName) : ['Belum Ada Data'],
      datasets: [{
        label: 'Durasi (Jam)',
        data: populatedCats.length > 0 ? populatedCats.map(c => c.avgHours) : [0],
        backgroundColor: accentGrad,
        borderRadius: 6,
        barThickness: 16
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: 'rgba(100, 116, 139, 0.1)' },
          ticks: { color: 'var(--text-muted)' }
        },
        y: {
          grid: { display: false },
          ticks: { color: 'var(--text-muted)' }
        }
      }
    }
  });
}

// -----------------------------------------------------------------
// LOCAL CORE STATS ALGORITHMS
// -----------------------------------------------------------------
function computeStats(tasks, categories) {
  const completedTasks = tasks.filter(t => t.status === 'done' && t.completedAt);
  const pendingTasks = tasks.filter(t => t.status !== 'done');

  // Calculate Weekly Completion
  const weeklyMap = {};
  completedTasks.forEach(t => {
    const d = new Date(t.completedAt);
    const year = d.getFullYear();
    const week = getISOWeekNumber(d);
    const key = `${year}-W${String(week).padStart(2, '0')}`;
    weeklyMap[key] = (weeklyMap[key] || 0) + 1;
  });

  const weeklyCompletion = [];
  const now = new Date();
  for (let i = 3; i >= 0; i--) {
    const targetDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const w = getISOWeekNumber(targetDate);
    const y = targetDate.getFullYear();
    const key = `${y}-W${String(w).padStart(2, '0')}`;
    weeklyCompletion.push({
      label: `Mgg ${w}`,
      key: key,
      count: weeklyMap[key] || 0
    });
  }

  // Calculate average completion time in hours
  let totalHours = 0;
  let completedCountWithDates = 0;
  completedTasks.forEach(t => {
    if (t.createdAt && t.completedAt) {
      const created = new Date(t.createdAt);
      const completed = new Date(t.completedAt);
      const diffMs = completed - created;
      if (diffMs > 0) {
        totalHours += diffMs / (1000 * 60 * 60);
        completedCountWithDates++;
      }
    }
  });
  const avgCompletionHours = completedCountWithDates > 0 ? Math.round(totalHours / completedCountWithDates * 10) / 10 : 0;

  // Heatmap of productivity by weekday (Mon - Sun)
  const heatmap = { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 };
  completedTasks.forEach(t => {
    const d = new Date(t.completedAt);
    const day = d.getDay();
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const key = dayKeys[day];
    if (heatmap[key] !== undefined) {
      heatmap[key]++;
    }
  });

  // Calculate Streak
  const completionDates = completedTasks
    .map(t => new Date(t.completedAt).toISOString().split('T')[0])
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort();

  let streak = 0;
  let maxStreak = 0;
  let prevDate = null;

  completionDates.forEach(dateStr => {
    const cur = new Date(dateStr);
    if (!prevDate) {
      streak = 1;
    } else {
      const diffTime = Math.abs(cur - prevDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        streak++;
      } else if (diffDays > 1) {
        streak = 1;
      }
    }
    if (streak > maxStreak) maxStreak = streak;
    prevDate = cur;
  });

  // Average completion hours by category
  const categoryAverages = [];
  categories.forEach(cat => {
    const catTasks = completedTasks.filter(t => t.categoryId === cat.id);
    let catTotalHours = 0;
    let catCompletedWithDates = 0;
    catTasks.forEach(t => {
      if (t.createdAt && t.completedAt) {
        const created = new Date(t.createdAt);
        const completed = new Date(t.completedAt);
        const diffMs = completed - created;
        if (diffMs > 0) {
          catTotalHours += diffMs / (1000 * 60 * 60);
          catCompletedWithDates++;
        }
      }
    });
    const avg = catCompletedWithDates > 0 ? Math.round(catTotalHours / catCompletedWithDates * 10) / 10 : 0;
    categoryAverages.push({
      categoryName: cat.name,
      avgHours: avg
    });
  });

  // Target vs Realization (tasks completed today vs daily target of 2)
  const todayStr = new Date().toISOString().split('T')[0];
  const completedToday = completedTasks.filter(t => t.completedAt.startsWith(todayStr)).length;

  return {
    weeklyCompletion,
    avgCompletionHours,
    categoryAverages,
    heatmap,
    streakDays: maxStreak,
    completedToday,
    totalCompleted: completedTasks.length,
    totalPending: pendingTasks.length,
    completionRate: tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0
  };
}

function getISOWeekNumber(date) {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNr = (tmp.getUTCDay() + 6) % 7;
  tmp.setUTCDate(tmp.getUTCDate() - dayNr + 3);
  const firstThursday = tmp.valueOf();
  tmp.setUTCMonth(0, 1);
  if (tmp.getUTCDay() !== 4) {
    tmp.setUTCMonth(0, 1 + ((4 - tmp.getUTCDay()) + 7) % 7);
  }
  const weekNumber = 1 + Math.ceil((firstThursday - tmp) / 604800000);
  return weekNumber;
}

function generateInsights(stats, categories) {
  const insights = [];
  
  if (stats.avgCompletionHours > 48) {
    insights.push(`Rata-rata penyelesaian tugas Anda cukup lama (<strong>${Math.round(stats.avgCompletionHours / 24 * 10) / 10} hari</strong>). Coba gunakan fitur <strong> checklist sub-tugas</strong> untuk memecah tugas besar menjadi bagian yang lebih kecil.`);
  } else if (stats.avgCompletionHours > 0) {
    insights.push(`Kecepatan penyelesaian tugas Anda sangat baik! Rata-rata selesai dalam <strong>${stats.avgCompletionHours} jam</strong>.`);
  }

  if (stats.streakDays >= 3) {
    insights.push(`Luar biasa! Anda memiliki streak belajar selama <strong>${stats.streakDays} hari</strong> berturut-turut. Pertahankan ritme ini!`);
  } else {
    insights.push(`Streak belajar Anda saat ini <strong>${stats.streakDays} hari</strong>. Cobalah menyelesaikan setidaknya 1 tugas sederhana setiap hari untuk membangun kebiasaan produktif.`);
  }

  // Find most active day
  let maxDayVal = 0;
  let maxDayKey = '';
  const dayLabels = {
    mon: 'Senin',
    tue: 'Selasa',
    wed: 'Rabu',
    thu: 'Kamis',
    fri: 'Jumat',
    sat: 'Sabtu',
    sun: 'Minggu'
  };
  Object.entries(stats.heatmap).forEach(([day, val]) => {
    if (val > maxDayVal) {
      maxDayVal = val;
      maxDayKey = day;
    }
  });

  if (maxDayVal > 0) {
    insights.push(`Hari teraktif Anda adalah <strong>${dayLabels[maxDayKey]}</strong>. Pertimbangkan untuk merencanakan tugas-tugas dengan tingkat kesulitan tinggi pada hari tersebut.`);
  }

  // Find fastest category
  let fastestCat = null;
  let minHours = Infinity;
  stats.categoryAverages.forEach(c => {
    if (c.avgHours > 0 && c.avgHours < minHours) {
      minHours = c.avgHours;
      fastestCat = c.categoryName;
    }
  });

  if (fastestCat) {
    insights.push(`Anda paling cepat menyelesaikan tugas kategori <strong>${fastestCat}</strong> (rata-rata ${minHours} jam). Gunakan momentum ini!`);
  }

  if (stats.completionRate < 50 && stats.totalPending > 3) {
    insights.push(`Ada ${stats.totalPending} tugas menunggu. Prioritaskan tugas berlabel <strong>Tinggi</strong> untuk menghemat waktu sebelum deadline.`);
  }

  return insights;
}
