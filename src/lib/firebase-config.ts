import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Debug log before initialization
console.log('Environment:', {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY?.substring(0, 5) + '...',
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID
});

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
let app;
let auth;
let db;
let storage;
let googleProvider;

try {
  app = initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully');
  
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  googleProvider = new GoogleAuthProvider();
} catch (error) {
  console.error('Firebase initialization error', error);
  throw new Error('Failed to initialize Firebase');
}

export { auth, db, storage, googleProvider };
