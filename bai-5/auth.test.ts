import { describe, expect, it } from 'vitest'
import { validateEmail, validatePassword, validateRegistration } from './auth.js'

describe('Buổi 5 auth validation', () => {
  it('accepts a valid email and rejects malformed addresses', () => {
    expect(validateEmail('lenamkhanh07082007@gmail.com')).toBe(true)
    expect(validateEmail('not-an-email')).toBe(false)
  })

  it('enforces the eight-character password policy', () => {
    expect(validatePassword('Strong!9')).toEqual({ valid: true, message: '' })
    expect(validatePassword('weakpass')).toEqual({
      valid: false,
      message: 'Mật khẩu cần có ít nhất một chữ hoa, một chữ thường và một ký tự đặc biệt.',
    })
  })

  it('returns the first actionable registration error', () => {
    expect(
      validateRegistration({
        email: 'bad',
        password: 'weak',
        confirmPassword: 'weak',
      }),
    ).toBe('Email không đúng định dạng.')

    expect(
      validateRegistration({
        email: 'valid@example.com',
        password: 'Strong!9',
        confirmPassword: 'different',
      }),
    ).toBe('Mật khẩu xác nhận không trùng khớp.')

    expect(
      validateRegistration({
        email: 'valid@example.com',
        password: 'Strong!9',
        confirmPassword: 'Strong!9',
      }),
    ).toBe('')
  })
})
