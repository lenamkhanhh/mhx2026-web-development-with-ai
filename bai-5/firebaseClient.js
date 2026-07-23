const FIREBASE_SDK = 'https://www.gstatic.com/firebasejs/11.10.0'

let firebaseAuth = null
let firebaseModules = null

export async function configureFirebase(config) {
  if (!config?.apiKey || !config?.projectId) return false
  const [{ initializeApp }, auth, firestore] = await Promise.all([
    import(`${FIREBASE_SDK}/firebase-app.js`),
    import(`${FIREBASE_SDK}/firebase-auth.js`),
    import(`${FIREBASE_SDK}/firebase-firestore.js`),
  ])
  const app = initializeApp(config)
  firebaseAuth = auth.getAuth(app)
  firebaseModules = { auth, firestore }
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
    firebaseModules.firestore.doc(firebaseModules.firestore.getFirestore(credential.user.app), 'users', credential.user.uid),
    { displayName, email, updatedAt: new Date().toISOString() },
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
    firebaseModules.firestore.doc(firebaseModules.firestore.getFirestore(user.app), 'users', user.uid),
    { ...profile, email: user.email, updatedAt: new Date().toISOString() },
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
