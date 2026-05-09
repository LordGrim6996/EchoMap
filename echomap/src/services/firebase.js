/**
 * Firebase Configuration
 *
 * Setup steps:
 * 1. Go to https://console.firebase.google.com
 * 2. Create a project, enable Email/Password Auth + Firestore
 * 3. Paste your firebaseConfig values below
 * 4. Set FIREBASE_ENABLED to true
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';

// ─── ⬇️ STEP 1: Paste your Firebase config here (done)───────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCHkP-fiU5FCgXVQgvceG_FfUJqRYhCy7A",
  authDomain: "echomap-dd69a.firebaseapp.com",
  projectId: "echomap-dd69a",
  storageBucket: "echomap-dd69a.firebasestorage.app",
  messagingSenderId: "114078551522",
  appId: "1:114078551522:web:33bf8a068d2535f16cbdbb",
  measurementId: "G-S0673HHT37"
};

// ─── ⬇️ STEP 2: Set this to true after pasting config (done)─────────────────────────
export const FIREBASE_ENABLED = true;

// ──────────────────────────────────────────────────────────────────────────────

let app = null;
let db = null;
let auth = null;

if (FIREBASE_ENABLED) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log('Firebase initialized successfully.');
  } catch (err) {
    console.error('Firebase initialization failed:', err);
  }
}

export {
  db,
  auth,
  // Firestore helpers
  collection, addDoc, getDocs, query, orderBy, limit,
  // Auth helpers — used by authService.js
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
};
