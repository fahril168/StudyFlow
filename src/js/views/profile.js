/* StudyFlow User Profile View Controller */

import { stateManager } from '../state.js';
import { showToast } from '../app.js';

export async function renderProfile(container, navigateTo) {
  const user = stateManager.getCurrentUser();
  if (!user) return;

  const tasks = await stateManager.getTasks();
  const completedCount = tasks.filter(t => t.status === 'done').length;
  const activeCount = tasks.filter(t => t.status !== 'done').length;

  // Temp local state for selected avatar
  let selectedAvatar = user.avatar;

  // DiceBear avatar seeds list for selection
  const avatarSeeds = ['Reza', 'Aditya', 'Budi', 'Sarah', 'Dewi', 'Bella', 'Rian', 'Putri', 'Kevin', 'Lia'];

  const render = () => {
    const isAdmin = user.role === 'admin';
    const labelNim = isAdmin ? 'Kode/ID Admin' : 'NIM (Nomor Induk Mahasiswa)';
    const labelProdi = isAdmin ? 'Divisi / Bagian' : 'Program Studi';

    container.innerHTML = `
      <div class="profile-container">
        <!-- Left Panel: Avatar & Card -->
        <div class="profile-card-left">
          <div class="profile-avatar-large-wrapper">
            <img src="${selectedAvatar}" alt="${user.name}" class="profile-avatar-large" id="profile-avatar-preview">
          </div>
          <h3 class="profile-name-title" id="profile-name-preview">${user.name}</h3>
          <span class="profile-role-subtitle">${isAdmin ? 'Administrator' : 'Mahasiswa Aktif'}</span>
          
          <div class="profile-stats-mini">
            <div class="profile-mini-stat-item">
              <span class="profile-mini-stat-value" style="color: var(--primary);">${tasks.length}</span>
              <span class="profile-mini-stat-label">Total Tugas</span>
            </div>
            <div class="profile-mini-stat-item">
              <span class="profile-mini-stat-value" style="color: var(--color-priority-high);">${activeCount}</span>
              <span class="profile-mini-stat-label">Aktif</span>
            </div>
            <div class="profile-mini-stat-item">
              <span class="profile-mini-stat-value" style="color: var(--color-priority-low);">${completedCount}</span>
              <span class="profile-mini-stat-label">Selesai</span>
            </div>
          </div>
        </div>

        <!-- Right Panel: Form edit -->
        <div class="profile-card-right">
          <div class="chart-card-header" style="margin-bottom: 20px;">
            <h3 class="chart-card-title"><i data-lucide="user-cog"></i> Pengaturan Informasi Profil</h3>
          </div>

          <form id="profile-form">
            <!-- Avatar Picker -->
            <div class="form-group">
              <label class="form-label">Pilih Avatar Profil Anda</label>
              <div class="avatar-presets-grid">
                ${avatarSeeds.map(seed => {
      const url = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;
      const isSelected = selectedAvatar === url;
      return `
                    <button type="button" class="avatar-preset-btn ${isSelected ? 'selected' : ''}" data-url="${url}">
                      <img src="${url}" alt="Avatar ${seed}">
                    </button>
                  `;
    }).join('')}
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="profile-name-input">Nama Lengkap</label>
              <input type="text" id="profile-name-input" class="form-input-control" value="${user.name}" required>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="profile-nim-input">${labelNim}</label>
                <input type="text" id="profile-nim-input" class="form-input-control" value="${user.nim}" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="profile-prodi-input">${labelProdi}</label>
                <input type="text" id="profile-prodi-input" class="form-input-control" value="${user.prodi}" required>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="profile-email-input">Alamat Email</label>
              <input type="email" id="profile-email-input" class="form-input-control" value="${user.email}" required>
            </div>

            <div class="chart-card-header" style="margin-top: 32px; margin-bottom: 20px;">
              <h3 class="chart-card-title"><i data-lucide="lock"></i> Keamanan Akun</h3>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="profile-new-password-input">Password Baru (Opsional)</label>
                <input type="password" id="profile-new-password-input" class="form-input-control" placeholder="Kosongkan jika tidak diubah">
              </div>

              <div class="form-group">
                <label class="form-label" for="profile-confirm-password-input">Konfirmasi Password Baru</label>
                <input type="password" id="profile-confirm-password-input" class="form-input-control" placeholder="Ketik ulang password baru">
              </div>
            </div>

            <div class="modal-footer-btns" style="border-top: 1px solid var(--border-color); padding-top: 16px; justify-content: flex-start;">
              <button type="submit" class="modal-btn btn-confirm" style="width: auto; padding: 10px 24px;">Simpan Perubahan</button>
            </div>
          </form>
        </div>
      </div>
    `;

    bindEvents();
    lucide.createIcons();
  };

  const bindEvents = () => {
    // Avatar Preset Toggles
    const avatarBtns = container.querySelectorAll('.avatar-preset-btn');
    const avatarPreview = container.querySelector('#profile-avatar-preview');

    avatarBtns.forEach(btn => {
      btn.onclick = () => {
        avatarBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        const url = btn.getAttribute('data-url');
        selectedAvatar = url;
        avatarPreview.src = url;
      };
    });

    // Handle Form Submit
    const form = container.querySelector('#profile-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nameVal = container.querySelector('#profile-name-input').value.trim();
      const nimVal = container.querySelector('#profile-nim-input').value.trim();
      const prodiVal = container.querySelector('#profile-prodi-input').value.trim();
      const emailVal = container.querySelector('#profile-email-input').value.trim();
      const newPasswordVal = container.querySelector('#profile-new-password-input').value;
      const confirmPasswordVal = container.querySelector('#profile-confirm-password-input').value;

      if (!nameVal || !nimVal || !prodiVal || !emailVal) {
        showToast('Semua kolom profil wajib diisi!', 'error');
        return;
      }

      if (newPasswordVal) {
        if (newPasswordVal.length < 6) {
           showToast('Password baru minimal 6 karakter!', 'error');
           return;
        }
        if (newPasswordVal !== confirmPasswordVal) {
           showToast('Konfirmasi password tidak cocok!', 'error');
           return;
        }
      }

      const updatePayload = {
        name: nameVal,
        nim: nimVal,
        prodi: prodiVal,
        email: emailVal,
        avatar: selectedAvatar
      };

      if (newPasswordVal) {
        updatePayload.password = newPasswordVal;
      }

      // Update state
      const res = await stateManager.updateProfile(updatePayload);

      if (res.success) {
        showToast('Profil Anda berhasil diperbarui!', 'success');

        // Update header & sidebar DOM widgets immediately
        document.getElementById('sidebar-user-name').textContent = res.user.name;
        document.getElementById('sidebar-avatar').src = res.user.avatar;
        document.getElementById('header-avatar').src = res.user.avatar;
        if (res.user.role !== 'admin') {
          document.getElementById('sidebar-user-role').textContent = `Mahasiswa - ${res.user.nim}`;
        }

        // Redraw profile page to update mini stats name preview
        await renderProfile(container, navigateTo);
      } else {
        showToast(res.message, 'error');
      }
    });
  };

  render();
}
