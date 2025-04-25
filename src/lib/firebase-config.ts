import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  onAuthStateChanged 
} from "firebase/auth";
import { 
  getFirestore, 
  enableMultiTabIndexedDbPersistence,
  setLogLevel
} from "firebase/firestore";

// Debug mode
setLogLevel('debug');

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Enable persistence with multi-tab support
enableMultiTabIndexedDbPersistence(db)
  .then(() => console.log('Firestore persistence enabled'))
  .catch(err => {
    if (err.code == 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab');
    } else if (err.code == 'unimplemented') {
      console.warn('The current browser does not support all features required for persistence');
    }
  });

// Auth state persistence check
onAuthStateChanged(auth, user => {
  console.log('Auth state changed:', user ? user.uid : 'no user');
});

export { auth, db };
