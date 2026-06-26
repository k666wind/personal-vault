import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// F-12: Enable Firestore offline persistence (IndexedDB).
// This allows reads and writes to work without network — changes sync
// automatically when connectivity is restored. Silently ignored if the
// browser doesn't support it or if multiple tabs are open simultaneously.
enableIndexedDbPersistence(db).catch((err: { code: string }) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open — persistence only works in one tab at a time
    console.warn('[Vault] Firestore offline persistence disabled (multiple tabs)')
  } else if (err.code === 'unimplemented') {
    // Browser doesn't support IndexedDB persistence
    console.warn('[Vault] Firestore offline persistence not supported in this browser')
  }
})

export default app
