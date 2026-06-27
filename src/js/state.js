/* StudyFlow Asynchronous Central State Management (MySQL Backend) */

// Fetch interceptor to support running under any XAMPP subdirectory
(function() {
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    if (typeof input === 'string' && input.includes('/api/')) {
      const pathname = window.location.pathname;
      let root = '';
      const lastSlashIndex = pathname.lastIndexOf('/');
      if (lastSlashIndex > 0) {
        root = pathname.substring(0, lastSlashIndex);
      }
      const base = root ? `${root}/api` : '/api';
      const apiIndex = input.indexOf('/api/');
      const endpoint = input.substring(apiIndex + 5);
      input = `${base}/${endpoint}`;
    }
    return originalFetch(input, init);
  };
})();

const STATE_USER_KEY = 'studyflow_user_session';

class StateManager {
  constructor() {
    this.currentUser = null;
    this.selectedStudentId = null;
    this.currentFilterSemester = null;
    this.loadSession();
  }

  loadSession() {
    try {
      const userSerialized = localStorage.getItem(STATE_USER_KEY);
      if (userSerialized) {
        this.currentUser = JSON.parse(userSerialized);
        this.currentFilterSemester = this.currentUser.current_semester || 1;
      }
    } catch (e) {
      console.error('Error loading session from localStorage:', e);
    }
  }

  saveSession() {
    try {
      if (this.currentUser) {
        localStorage.setItem(STATE_USER_KEY, JSON.stringify(this.currentUser));
      } else {
        localStorage.removeItem(STATE_USER_KEY);
      }
    } catch (e) {
      console.error('Error saving user session to localStorage:', e);
    }
  }

  // Authentication API (Asynchronous API Calls)
  async login(username, password) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (data.success) {
        this.currentUser = data.user;
        this.currentFilterSemester = this.currentUser.current_semester || 1;
        this.saveSession();
        return { success: true, user: this.currentUser };
      } else {
        return { success: false, message: data.message || 'Login gagal.' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Gagal terhubung ke server database.' };
    }
  }

  async register(name, nim, prodi, username, password, role = 'student') {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, nim, prodi, username, password, role })
      });
      const data = await res.json();
      return data;
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Gagal terhubung ke server database.' };
    }
  }

  logout() {
    this.currentUser = null;
    this.saveSession();
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getSelectedStudentId() {
    return this.selectedStudentId;
  }

  setSelectedStudentId(id) {
    this.selectedStudentId = id;
  }

  async getStudents() {
    try {
      const res = await fetch('/api/students');
      if (!res.ok) throw new Error('Failed to fetch students');
      const data = await res.json();
      return data;
    } catch (error) {
      console.error('Get students error:', error);
      return [];
    }
  }

  async updateProfile(profileData) {
    if (!this.currentUser) return { success: false, message: 'Sesi login tidak ditemukan.' };

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.currentUser.id, ...profileData })
      });
      const data = await res.json();

      if (data.success) {
        this.currentUser = data.user;
        this.saveSession();
        return { success: true, user: this.currentUser };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, message: 'Gagal memperbarui profil di database.' };
    }
  }

  // Tasks API (Asynchronous API Calls)
  async getTasks() {
    if (!this.currentUser) return [];
    try {
      let userId = this.currentUser.id;
      let role = this.currentUser.role;
      if (role === 'admin' && this.selectedStudentId) {
        userId = this.selectedStudentId;
        role = 'student';
      }
      const semesterParam = this.currentFilterSemester ? `&semester=${this.currentFilterSemester}` : '';
      const res = await fetch(`/api/tasks?userId=${userId}&role=${role}${semesterParam}`);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      return data;
    } catch (error) {
      console.error('Get tasks error:', error);
      return [];
    }
  }

  async addTask(taskData) {
    if (!this.currentUser) return null;
    try {
      let studentId = this.currentUser.id;
      if (this.currentUser.role === 'admin' && this.selectedStudentId) {
        studentId = this.selectedStudentId;
      }
      const semester = this.currentFilterSemester || (this.currentUser.current_semester || 1);
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, semester, ...taskData })
      });
      if (!res.ok) throw new Error('Failed to create task');
      const data = await res.json();
      return data;
    } catch (error) {
      console.error('Add task error:', error);
      return null;
    }
  }

  async updateTask(taskId, updateData) {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      if (!res.ok) throw new Error('Failed to update task');
      const data = await res.json();
      return data;
    } catch (error) {
      console.error('Update task error:', error);
      return null;
    }
  }

  async deleteTask(taskId) {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete task');
      const data = await res.json();
      return data.success;
    } catch (error) {
      console.error('Delete task error:', error);
      return false;
    }
  }

  // Categories API (Asynchronous API Calls)
  async getCategories(filterBySemester = true) {
    try {
      let url = '/api/categories';
      if (filterBySemester && this.currentFilterSemester) {
        url += `?semester=${this.currentFilterSemester}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch categories');
      const data = await res.json();
      return data;
    } catch (error) {
      console.error('Get categories error:', error);
      return [];
    }
  }

  async addCategory(name, color, isGlobal = false, semester = null) {
    try {
      if (semester === null) {
        semester = this.currentUser ? (this.currentUser.current_semester || 1) : 1;
      }
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color, semester, is_global: isGlobal })
      });
      const data = await res.json();
      return data;
    } catch (error) {
      console.error('Add category error:', error);
      return { success: false, message: 'Gagal menghubungi server database.' };
    }
  }

  async updateCategory(categoryId, name, color, isGlobal = false, semester = null) {
    try {
      if (semester === null) {
        semester = this.currentUser ? (this.currentUser.current_semester || 1) : 1;
      }
      const res = await fetch(`/api/categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color, semester, is_global: isGlobal })
      });
      const data = await res.json();
      return data;
    } catch (error) {
      console.error('Update category error:', error);
      return { success: false, message: 'Gagal menghubungi server database.' };
    }
  }

  async deleteCategory(categoryId) {
    try {
      const res = await fetch(`/api/categories/${categoryId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete category');
      const data = await res.json();
      return data.success;
    } catch (error) {
      console.error('Delete category error:', error);
      return false;
    }
  }


  // Notifications API (Database backed + Auto-sync from Tasks)
  async getReminders() {
    if (!this.currentUser) return [];
    
    // 1. Fetch persistent notifications from DB
    let dbNotifs = [];
    try {
      const res = await fetch(`/api/notifications?userId=${this.currentUser.id}`);
      if (res.ok) {
        dbNotifs = await res.json();
      }
    } catch (e) {
      console.error('Fetch notifs error:', e);
    }
    
    // 2. Fetch tasks and sync new reminders
    const tasks = await this.getTasks();
    const now = Date.now();
    
    for (const task of tasks) {
      if (task.status === 'done') continue;
      if (!task.dueDate) continue;

      const dueTime = new Date(task.dueDate).getTime();
      const timeDiff = dueTime - now;
      
      let title = '';
      let desc = '';
      let type = '';
      
      if (timeDiff < 0) {
        title = `Tugas Terlambat!`;
        desc = `"${task.title}" telah melewati tenggat waktu.`;
        type = 'danger';
      } else if (timeDiff <= 24 * 60 * 60 * 1000) {
        title = `Mendekati Deadline!`;
        desc = `Tugas "${task.title}" tersisa kurang dari 24 jam.`;
        type = 'danger';
      } else if (timeDiff <= 48 * 60 * 60 * 1000) {
        title = `Tenggat Waktu Dekat`;
        desc = `Tugas "${task.title}" harus dikumpulkan dalam 2 hari.`;
        type = 'warning';
      }
      
      if (title) {
        // Check if this specific reminder already exists in DB (by exact description match)
        const exists = dbNotifs.find(n => n.message === desc);
        if (!exists) {
          // Create it in DB
          try {
            await fetch('/api/notifications', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                studentId: this.currentUser.id,
                title: title,
                message: desc,
                type: type
              })
            });
            // We just let the next fetch get it, or push it to local array
            dbNotifs.push({
              id: 'temp-' + Date.now(),
              title: title,
              message: desc,
              type: type,
              isRead: false,
              time: new Date().toISOString()
            });
          } catch (e) {
            console.error('Failed to auto-create notif:', e);
          }
        }
      }
    }

    return dbNotifs.sort((a, b) => {
      // Unread first
      if (!a.isRead && b.isRead) return -1;
      if (a.isRead && !b.isRead) return 1;
      // Danger first
      if (a.type === 'danger' && b.type !== 'danger') return -1;
      if (a.type !== 'danger' && b.type === 'danger') return 1;
      return new Date(a.time).getTime() - new Date(b.time).getTime();
    });
  }

  async markNotificationRead(notifId) {
    try {
      await fetch(`/api/notifications/${notifId}/read`, { method: 'PUT' });
    } catch (e) {
      console.error('Failed to mark read:', e);
    }
  }

  async clearAllNotifications() {
    if (!this.currentUser) return;
    try {
      await fetch('/api/notifications/clear', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.currentUser.id })
      });
    } catch (e) {
      console.error('Failed to clear notifs:', e);
    }
  }


  // Sticky Notes API
  async getNotes() {
    if (!this.currentUser) return [];
    try {
      let userId = this.currentUser.id;
      if (this.currentUser.role === 'admin' && this.selectedStudentId) {
        userId = this.selectedStudentId;
      }
      const res = await fetch(`/api/notes?userId=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch notes');
      return await res.json();
    } catch (error) {
      console.error('Get notes error:', error);
      return [];
    }
  }

  async addNote(noteData) {
    if (!this.currentUser) return null;
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: this.currentUser.id, ...noteData })
      });
      if (!res.ok) throw new Error('Failed to create note');
      return await res.json();
    } catch (error) {
      console.error('Add note error:', error);
      return null;
    }
  }

  async updateNote(noteId, updateData) {
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      if (!res.ok) throw new Error('Failed to update note');
      return await res.json();
    } catch (error) {
      console.error('Update note error:', error);
      return null;
    }
  }

  async deleteNote(noteId) {
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete note');
      return await res.json();
    } catch (error) {
      console.error('Delete note error:', error);
      return { success: false };
    }
  }

  async getUserStats(userId) {
    const currentUser = this.getCurrentUser();
    let allTasks = [];
    if (currentUser && currentUser.role === 'admin') {
      try {
        const res = await fetch(`/api/tasks?userId=${currentUser.id}&role=admin`);
        if (res.ok) allTasks = await res.json();
      } catch (e) {
        console.error(e);
      }
    } else {
      allTasks = await this.getTasks();
    }

    const tasks = userId ? allTasks.filter(t => t.studentId === userId) : allTasks;
    const completedTasks = tasks.filter(t => t.status === 'done' && t.completedAt);
    const pendingTasks = tasks.filter(t => t.status !== 'done');

    const weeklyMap = {};
    completedTasks.forEach(t => {
      const d = new Date(t.completedAt);
      const year = d.getFullYear();
      const week = this.getISOWeek(d);
      const key = `${year}-W${String(week).padStart(2, '0')}`;
      weeklyMap[key] = (weeklyMap[key] || 0) + 1;
    });

    const weeklyCompletion = [];
    const now = new Date();
    for (let i = 3; i >= 0; i--) {
      const targetDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const w = this.getISOWeek(targetDate);
      const y = targetDate.getFullYear();
      const key = `${y}-W${String(w).padStart(2, '0')}`;
      weeklyCompletion.push({
        week: `Mgg ${w}`,
        key: key,
        count: weeklyMap[key] || 0
      });
    }

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

    const catMap = {};
    completedTasks.forEach(t => {
      if (t.categoryId && t.createdAt && t.completedAt) {
        const created = new Date(t.createdAt);
        const completed = new Date(t.completedAt);
        const diffHours = (completed - created) / (1000 * 60 * 60);
        if (diffHours > 0) {
          if (!catMap[t.categoryId]) catMap[t.categoryId] = { total: 0, count: 0 };
          catMap[t.categoryId].total += diffHours;
          catMap[t.categoryId].count++;
        }
      }
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const completedToday = completedTasks.filter(t => t.completedAt.startsWith(todayStr)).length;

    return {
      weeklyCompletion,
      avgCompletionHours,
      categoryAverages: catMap,
      heatmap,
      streakDays: maxStreak,
      completedToday,
      totalCompleted: completedTasks.length,
      totalPending: pendingTasks.length,
      completionRate: tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0
    };
  }

  async getAdminOverviewStats() {
    const currentUser = this.getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') return null;

    try {
      const res = await fetch(`/api/tasks?userId=${currentUser.id}&role=admin`);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const allTasks = await res.json();
      const students = await this.getStudents();
      const completedTasks = allTasks.filter(t => t.status === 'done');

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

      const studentMetrics = students.map(student => {
        const studentTasks = allTasks.filter(t => t.studentId === student.id);
        const studentCompleted = studentTasks.filter(t => t.status === 'done');
        return {
          ...student,
          totalTasks: studentTasks.length,
          completedTasks: studentCompleted.length,
          completionRate: studentTasks.length > 0 ? Math.round((studentCompleted.length / studentTasks.length) * 100) : 0
        };
      });

      return {
        totalStudents: students.length,
        totalTasks: allTasks.length,
        totalCompleted: completedTasks.length,
        avgCompletionHours,
        studentMetrics
      };
    } catch (e) {
      console.error('Error calculating admin overview stats:', e);
      return null;
    }
  }

  getISOWeek(date) {
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
}

export const stateManager = new StateManager();
