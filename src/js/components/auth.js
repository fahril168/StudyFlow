/* StudyFlow Authentication Component */

import { stateManager } from '../state.js';
import { showToast } from '../app.js';

export function renderAuth(container, onAuthSuccess) {
  let isLogin = true;

  const render = () => {
    container.innerHTML = isLogin ? getLoginHTML() : getRegisterHTML();
    bindEvents();
    lucide.createIcons();
  };

  const getLoginHTML = () => `
    <div class="auth-card">
      <div class="auth-header">
        <div class="auth-logo">
          <i data-lucide="graduation-cap"></i>
        </div>
        <h2 class="auth-title">StudyFlow</h2>
        <p class="auth-subtitle">Manajemen Tugas & Jadwal Akademis</p>
      </div>

      <form id="login-form">
        <div class="form-group">
          <label for="login-email">Email Mahasiswa</label>
          <div class="input-wrapper">
            <i data-lucide="mail"></i>
            <input type="email" id="login-email" class="form-control" placeholder="nim/nama@studyflow.id" required>
          </div>
        </div>

        <div class="form-group">
          <label for="login-password">Kata Sandi</label>
          <div class="input-wrapper">
            <i data-lucide="lock"></i>
            <input type="password" id="login-password" class="form-control" placeholder="••••••••" required>
          </div>
        </div>

        <button type="submit" class="auth-btn">Masuk ke Dashboard</button>
      </form>

      <div class="auth-footer">
        Belum punya akun? <a href="#" id="toggle-auth">Daftar Sekarang</a>
      </div>

      <div class="demo-credentials">
        <h5>💡 Akun Demo (Gunakan untuk Uji Coba):</h5>
        <p><strong>Mahasiswa:</strong> <code>student@studyflow.id</code> / <code>student123</code></p>

      </div>
    </div>
  `;

  const getRegisterHTML = () => `
    <div class="auth-card">
      <div class="auth-header">
        <div class="auth-logo">
          <i data-lucide="graduation-cap"></i>
        </div>
        <h2 class="auth-title">Pendaftaran</h2>
        <p class="auth-subtitle">Buat akun akademik StudyFlow Anda</p>
      </div>

      <form id="register-form">
        <div class="form-group">
          <label for="reg-name">Nama Lengkap</label>
          <div class="input-wrapper">
            <i data-lucide="user"></i>
            <input type="text" id="reg-name" class="form-control" placeholder="Reza Aditya" required>
          </div>
        </div>

        <div class="form-group">
          <label for="reg-nim" id="nim-label">NIM (Nomor Induk Mahasiswa)</label>
          <div class="input-wrapper">
            <i data-lucide="credit-card" id="nim-icon"></i>
            <input type="text" id="reg-nim" class="form-control" placeholder="10121045" required>
          </div>
        </div>

        <div class="form-group">
          <label for="reg-prodi" id="prodi-label">Program Studi</label>
          <div class="input-wrapper">
            <i data-lucide="book-open"></i>
            <input type="text" id="reg-prodi" class="form-control" placeholder="Teknik Informatika" required>
          </div>
        </div>

        <div class="form-group">
          <label for="reg-email">Alamat Email</label>
          <div class="input-wrapper">
            <i data-lucide="mail"></i>
            <input type="email" id="reg-email" class="form-control" placeholder="reza@studyflow.id" required>
          </div>
        </div>

        <div class="form-group">
          <label for="reg-password">Kata Sandi</label>
          <div class="input-wrapper">
            <i data-lucide="lock"></i>
            <input type="password" id="reg-password" class="form-control" placeholder="Minimal 6 karakter" minlength="6" required>
          </div>
        </div>

        <button type="submit" class="auth-btn">Daftar Akun Baru</button>
      </form>

      <div class="auth-footer">
        Sudah memiliki akun? <a href="#" id="toggle-auth">Masuk di sini</a>
      </div>
    </div>
  `;

  const bindEvents = () => {
    const toggleLink = container.querySelector('#toggle-auth');
    if (toggleLink) {
      toggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        isLogin = !isLogin;
        render();
      });
    }



    const loginForm = container.querySelector('#login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = container.querySelector('#login-email').value;
        const password = container.querySelector('#login-password').value;
        console.log('Attempt login with', email, password);
        const res = await stateManager.login(email, password);
        if (res.success) {
          const userName = res.user?.name || 'Pengguna';
          showToast(`Selamat datang kembali, ${userName}!`, 'success');
          onAuthSuccess();
        } else {
          showToast(res.message, 'error');
        }
      });
    }

    const registerForm = container.querySelector('#register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = container.querySelector('#reg-name').value;
        const nim = container.querySelector('#reg-nim').value;
        const prodi = container.querySelector('#reg-prodi').value;
        const email = container.querySelector('#reg-email').value;
        const password = container.querySelector('#reg-password').value;

        const res = await stateManager.register(name, nim, prodi, email, password);
        if (res.success) {
          showToast('Registrasi berhasil! Silakan masuk menggunakan akun baru Anda.', 'success');
          isLogin = true;
          render();
        } else {
          showToast(res.message, 'error');
        }
      });
    }
  };

  render();
}
