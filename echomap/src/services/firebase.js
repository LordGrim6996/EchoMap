/**
 * Firebase Configuration
 * 
 * To enable cloud storage:
 * 1. Create a project at https://console.firebase.google.com
 * 2. Enable Firestore Database and Anonymous Authentication
 * 3. Replace the placeholder values below with your Firebase config
 * 4. Set FIREBASE_ENABLED to true
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// ⬇️ Set to true after entering your Firebase config
export const FIREBASE_ENABLED = false;

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

let app = null;
let db = null;
let auth = null;
let currentUserId = null;

if (FIREBASE_ENABLED) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    // Sign in anonymously for frictionless use
    signInAnonymously(auth).catch(err => {
      console.warn('Anonymous auth failed:', err);
    });

    onAuthStateChanged(auth, (user) => {
      if (user) {
        currentUserId = user.uid;
        console.log('Signed in anonymously as:', user.uid);
      }
    });
  } catch (err) {
    console.error('Firebase initialization failed:', err);
  }
}

export { db, auth, currentUserId, collection, addDoc, getDocs, query, orderBy, limit };
