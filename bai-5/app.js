import {
  resolveSubmitForm,
  validateEmail,
  validatePassword,
  validateRegistration,
} from './auth.js'
import {
  configureFirebase,
  isFirebaseReady,
  loginUser,
  logoutUser,
  observeUser,
  registerUser,
  updateUserProfile,
} from './firebaseClient.js'

const storageKey = 'buoi5-demo-user'
const app = document.querySelector('#app')
const firebaseConfig = window.BUOI5_FIREBASE_CONFIG
let currentUser = null

const demoStore = {
  get() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || 'null')
    } catch {
      return null
    }
  },
  set(user) {
    localStorage.setItem(storageKey, JSON.stringify(user))
  },
  clear() {
    localStorage.removeItem(storageKey)
  },
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char])
}

function notice(message = '', kind = 'info') {
  const node = document.querySelector('[data-notice]')
  if (!node) return
  node.textContent = message
  node.dataset.kind = kind
  node.hidden = !message
}

function inputField({ id, label, type = 'text', value = '', autocomplete = '' }) {
  return `<label class="field" for="${id}"><span>${label}</span><input id="${id}" name="${id}" type="${type}" value="${escapeHtml(value)}" autocomplete="${autocomplete}" required /></label>`
}

function renderShell(content) {
  app.innerHTML = `
    <div class="app-shell">
      <aside class="brand-panel">
        <div class="brand-mark">WD<span>5</span></div>
        <p class="eyebrow">WEB DEVELOPMENT WITH AI</p>
        <h1>Build a safer way into the web.</h1>
        <p class="brand-copy">Một flow xác thực rõ ràng: đăng ký, đăng nhập và quản lý hồ sơ người dùng.</p>
        <div class="proof-list"><span>01 / AUTH</span><span>02 / PROFILE</span><span>03 / FIREBASE</span></div>
      </aside>
      <main class="auth-panel">
        <header class="topbar">
          <span class="status-dot"></span>
          <span>${isFirebaseReady() ? 'Firebase connected' : 'Local demo mode'}</span>
          <span class="topbar-meta">BUỔI 05 / 2026</span>
        </header>
        <section class="content-card">
          ${content}
          <p class="notice" data-notice hidden></p>
        </section>
        <footer>UIT · Web Development with AI · Đăng nhập an toàn, dữ liệu minh bạch.</footer>
      </main>
    </div>
  `
}

function renderLogin() {
  renderShell(`
    <div class="section-label">01 / WELCOME BACK</div>
    <h2>Đăng nhập vào<br /><em>workspace của bạn.</em></h2>
    <p class="lede">Tiếp tục từ nơi bạn đã dừng lại.</p>
    <form data-form="login" class="auth-form">
      ${inputField({ id: 'email', label: 'Email', type: 'email', autocomplete: 'email' })}
      ${inputField({ id: 'password', label: 'Mật khẩu', type: 'password', autocomplete: 'current-password' })}
      <button class="primary-button" type="submit">Đăng nhập <span>↗</span></button>
    </form>
    <button class="text-button" data-switch="register">Chưa có tài khoản? <strong>Tạo tài khoản</strong></button>
  `)
}

function renderRegister() {
  renderShell(`
    <div class="section-label">02 / CREATE ACCOUNT</div>
    <h2>Tạo một tài khoản<br /><em>để bắt đầu.</em></h2>
    <p class="lede">Mật khẩu cần có 8 ký tự, chữ hoa, chữ thường và ký tự đặc biệt.</p>
    <form data-form="register" class="auth-form">
      ${inputField({ id: 'displayName', label: 'Tên hiển thị', autocomplete: 'name' })}
      ${inputField({ id: 'email', label: 'Email', type: 'email', autocomplete: 'email' })}
      ${inputField({ id: 'password', label: 'Mật khẩu', type: 'password', autocomplete: 'new-password' })}
      ${inputField({ id: 'confirmPassword', label: 'Xác nhận mật khẩu', type: 'password', autocomplete: 'new-password' })}
      <button class="primary-button" type="submit">Đăng ký <span>↗</span></button>
    </form>
    <button class="text-button" data-switch="login">Đã có tài khoản? <strong>Đăng nhập</strong></button>
  `)
}

function renderProfile(user) {
  const profile = user.profile || user
  renderShell(`
    <div class="section-label">03 / PROFILE</div>
    <div class="profile-head"><div class="avatar">${escapeHtml((profile.displayName || profile.email || 'U').slice(0, 1).toUpperCase())}</div><div><p class="eyebrow">SIGNED IN</p><h2>${escapeHtml(profile.displayName || 'Your profile')}</h2></div></div>
    <p class="lede">Cập nhật thông tin cá nhân và đồng bộ lên Firebase.</p>
    <form data-form="profile" class="auth-form">
      ${inputField({ id: 'displayName', label: 'Tên hiển thị', value: profile.displayName || '', autocomplete: 'name' })}
      ${inputField({ id: 'phone', label: 'Số điện thoại (không bắt buộc)', value: profile.phone || '', type: 'tel', autocomplete: 'tel' })}
      <button class="primary-button" type="submit">Lưu thay đổi <span>↗</span></button>
    </form>
    <button class="text-button" data-action="logout">Đăng xuất</button>
  `)
}

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries())
}

async function handleSubmit(event) {
  event.preventDefault()
  const form = resolveSubmitForm(event)
  const values = formValues(form)
  notice('')
  try {
    if (form.dataset.form === 'register') {
      const error = validateRegistration(values)
      if (error) throw new Error(error)
      if (isFirebaseReady()) {
        currentUser = await registerUser(values)
      } else {
        currentUser = { email: values.email, profile: { displayName: values.displayName, email: values.email } }
        demoStore.set(currentUser)
      }
      notice('Successfully · Tài khoản đã được tạo.', 'success')
      setTimeout(renderLogin, 500)
      return
    }
    if (form.dataset.form === 'login') {
      if (!validateEmail(values.email)) throw new Error('Email không đúng định dạng.')
      if (!validatePassword(values.password).valid) throw new Error('Mật khẩu chưa đạt chính sách bảo mật.')
      if (isFirebaseReady()) {
        currentUser = await loginUser(values)
      } else {
        const stored = demoStore.get()
        if (!stored || stored.email !== values.email) throw new Error('Email hoặc mật khẩu không chính xác.')
        currentUser = stored
      }
      renderProfile(currentUser)
      return
    }
    if (form.dataset.form === 'profile') {
      if (!values.displayName.trim()) throw new Error('Tên hiển thị không được để trống.')
      if (isFirebaseReady()) await updateUserProfile(currentUser, values)
      currentUser = { ...currentUser, profile: { ...currentUser.profile, ...values } }
      demoStore.set(currentUser)
      notice('Đã lưu thay đổi hồ sơ.', 'success')
    }
  } catch (error) {
    notice(error.message || 'Có lỗi xảy ra, vui lòng thử lại.', 'error')
  }
}

document.addEventListener('click', async (event) => {
  const switchButton = event.target.closest('[data-switch]')
  if (switchButton) return switchButton.dataset.switch === 'register' ? renderRegister() : renderLogin()
  if (event.target.closest('[data-action="logout"]')) {
    await logoutUser()
    currentUser = null
    demoStore.clear()
    renderLogin()
  }
})

document.addEventListener('submit', handleSubmit)

try {
  if (firebaseConfig) await configureFirebase(firebaseConfig)
} catch {
  notice('Không thể kết nối Firebase, đang dùng local demo mode.', 'error')
}

observeUser((user) => {
  if (user) {
    currentUser = user
    renderProfile(user)
  }
})

renderLogin()
