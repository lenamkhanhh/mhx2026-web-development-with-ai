import { describe, expect, it } from 'vitest'
import {
  buildProfileDocument,
  mapFirebaseError,
  isValidFirebaseConfig,
  mergeUserProfile,
} from './firebaseClient.js'

describe('Firebase client helpers', () => {
  it('accepts a complete public web config', () => {
    expect(isValidFirebaseConfig({
      apiKey: 'public',
      authDomain: 'demo.firebaseapp.com',
      projectId: 'demo',
      storageBucket: 'demo.firebasestorage.app',
      messagingSenderId: '123',
      appId: '1:123:web:abc',
    })).toBe(true)
  })

  it('builds a profile payload from the authenticated user email', () => {
    expect(buildProfileDocument(
      { email: 'user@example.com' },
      { displayName: '  Nam Khánh  ', phone: ' 0900 ' },
    )).toMatchObject({
      displayName: 'Nam Khánh',
      phone: '0900',
      email: 'user@example.com',
    })
  })

  it('maps Firebase auth errors without exposing provider internals', () => {
    expect(mapFirebaseError({ code: 'auth/invalid-credential' })).toBe('Email hoặc mật khẩu không chính xác.')
  })

  it('merges Firestore fields over the authenticated user profile', () => {
    expect(mergeUserProfile(
      { displayName: 'Auth Name', email: 'user@example.com' },
      { displayName: 'Saved Name', phone: '0900000000' },
    )).toEqual({
      displayName: 'Saved Name',
      email: 'user@example.com',
      phone: '0900000000',
    })
  })
})
