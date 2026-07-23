const FIREBASE_SDK = 'https://www.gstatic.com/firebasejs/11.10.0'
const CONFIG_KEYS = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId']

let firebaseAuth = null
let firebaseModules = null

export function isValidFirebaseConfig(config) {
  return CONFIG_KEYS.every((key) => typeof config?.[key] === 'string' && config[key].trim().length > 0)
}

export function buildProfileDocument(user, profile = {}) {
  return {
    displayName: String(profile.displayName || '').trim(),
    phone: String(profile.phone || '').trim(),
    email: user?.email || '',
  }
}

export function mapFirebaseError(error) {
  const messages = {
    'auth/invalid-credential': 'Email hoặc mật khẩu không chính xác.',
    'auth/invalid-email': 'Email không đúng định dạng.',
    'auth/email-already-in-use': 'Email này đã được đăng ký.',
    'auth/weak-password': 'Mật khẩu chưa đạt chính sách bảo mật.',
    'auth/network-request-failed': 'Không kết nối được Firebase. Hãy thử lại.',
    'permission-denied': 'Tài khoản không có quyền lưu hồ sơ này.',
  }
  return messages[error?.code] || 'Có lỗi Firebase xảy ra. Vui lòng thử lại.'
}

export async function configureFirebase(config) {
  if (!isValidFirebaseConfig(config)) return false
  const [{ initializeApp }, auth, firestore] = await Promise.all([
    import(`${FIREBASE_SDK}/firebase-app.js`),
    import(`${FIREBASE_SDK}/firebase-auth.js`),
    import(`${FIREBASE_SDK}/firebase-firestore.js`),
  ])
  const app = initializeApp(config)
  firebaseAuth = auth.getAuth(app)
  firebaseModules = { auth, firestore, db: firestore.getFirestore(app) }
  return true
}

export function isFirebaseReady() {
  return Boolean(firebaseAuth && firebaseModules)
}

export async function registerUser({ email, password, displayName }) {
  if (!isFirebaseReady()) throw new Error('Firebase chưa được cấu hình.')
  const credential = await firebaseModules.auth.createUserWithEmailAndPassword(firebaseAuth, email, password)
  await firebaseModules.auth.updateProfile(credential.user, { displayName })
  await firebaseModules.firestore.setDoc(
    firebaseModules.firestore.doc(firebaseModules.db, 'users', credential.user.uid),
    { ...buildProfileDocument(credential.user, { displayName }), updatedAt: new Date().toISOString() },
  )
  return credential.user
}

export async function loginUser({ email, password }) {
  if (!isFirebaseReady()) throw new Error('Firebase chưa được cấu hình.')
  const credential = await firebaseModules.auth.signInWithEmailAndPassword(firebaseAuth, email, password)
  return credential.user
}

export async function updateUserProfile(user, profile) {
  if (!isFirebaseReady()) throw new Error('Firebase chưa được cấu hình.')
  await firebaseModules.auth.updateProfile(user, { displayName: profile.displayName })
  await firebaseModules.firestore.setDoc(
    firebaseModules.firestore.doc(firebaseModules.db, 'users', user.uid),
    { ...buildProfileDocument(user, profile), updatedAt: new Date().toISOString() },
    { merge: true },
  )
}

export function observeUser(callback) {
  if (!isFirebaseReady()) return () => {}
  return firebaseModules.auth.onAuthStateChanged(firebaseAuth, callback)
}

export async function logoutUser() {
  if (isFirebaseReady()) await firebaseModules.auth.signOut(firebaseAuth)
}
