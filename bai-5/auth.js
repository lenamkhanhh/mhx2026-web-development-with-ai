const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(email) {
  return EMAIL_PATTERN.test(String(email).trim())
}

export function validatePassword(password) {
  const value = String(password)
  if (value.length < 8) {
    return { valid: false, message: 'Mật khẩu phải có ít nhất 8 ký tự.' }
  }
  if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
    return {
      valid: false,
      message: 'Mật khẩu cần có ít nhất một chữ hoa, một chữ thường và một ký tự đặc biệt.',
    }
  }
  return { valid: true, message: '' }
}

export function validateRegistration({ email, password, confirmPassword }) {
  if (!validateEmail(email)) return 'Email không đúng định dạng.'
  const passwordResult = validatePassword(password)
  if (!passwordResult.valid) return passwordResult.message
  if (password !== confirmPassword) return 'Mật khẩu xác nhận không trùng khớp.'
  return ''
}
