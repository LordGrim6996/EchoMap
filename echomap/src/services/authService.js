/**
 * authService.js
 *
 * Dual-mode auth service:
 * - When FIREBASE_ENABLED = false → uses localStorage (demo/offline mode)
 * - When FIREBASE_ENABLED = true  → uses Firebase Email/Password Auth
 *
 * The public API is identical in both modes, so no UI components change.
 */

import {
  FIREBASE_ENABLED,
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from './firebase';

// ─── Firebase Auth implementation ────────────────────────────────────────────

const firebaseOnAuthChange = (callback) => {
  const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      callback({
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
        email: firebaseUser.email,
      });
    } else {
      callback(null);
    }
  });
  return unsubscribe;
};

const firebaseSignup = async (name, email, password) => {
  if (!name.trim()) throw new Error('Name is required.');
  if (!email.trim()) throw new Error('Email is required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  if (password.length < 6) throw new Error('Password must be at least 6 characters.');

  const credential = await createUserWithEmailAndPassword(auth, email, password);
  // Store display name on the Firebase profile
  await updateProfile(credential.user, { displayName: name.trim() });
  return {
    user: {
      uid: credential.user.uid,
      name: name.trim(),
      email: credential.user.email,
    },
  };
};

const firebaseLogin = async (email, password) => {
  if (!email.trim()) throw new Error('Email is required.');
  if (!password) throw new Error('Password is required.');

  const credential = await signInWithEmailAndPassword(auth, email, password);
  return {
    user: {
      uid: credential.user.uid,
      name: credential.user.displayName || credential.user.email.split('@')[0],
      email: credential.user.email,
    },
  };
};

const firebaseLogout = () => signOut(auth);

const firebaseGetCurrentUser = () => {
  const u = auth?.currentUser;
  if (!u) return null;
  return {
    uid: u.uid,
    name: u.displayName || u.email.split('@')[0],
    email: u.email,
  };
};

// ─── LocalStorage Auth implementation (offline / demo fallback) ───────────────

const USERS_KEY   = 'echomap_users';
const SESSION_KEY = 'echomap_session';

function encode(str) { return btoa(encodeURIComponent(str)); }
function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '{}'); } catch { return {}; }
}
function saveUsers(u) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }
function generateUid() { return 'local_' + Math.random().toString(36).slice(2) + Date.now().toString(36); }

const localListeners = new Set();
function notifyListeners(user) { localListeners.forEach(cb => cb(user)); }

const localOnAuthChange = (callback) => {
  localListeners.add(callback);
  callback(localGetCurrentUser());
  return () => localListeners.delete(callback);
};

function localGetCurrentUser() {
  try {
    const s = localStorage.getItem(SESSION_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

const localSignup = (name, email, password) => {
  if (!name.trim()) throw new Error('Name is required.');
  if (!email.trim()) throw new Error('Email is required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  if (password.length < 6) throw new Error('Password must be at least 6 characters.');

  const users = getUsers();
  const key   = email.toLowerCase();
  if (users[key]) throw new Error('An account with this email already exists.');

  const user = { uid: generateUid(), name: name.trim(), email: key };
  users[key] = { ...user, password: encode(password) };
  saveUsers(users);

  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  notifyListeners(user);
  return { user };
};

const localLogin = (email, password) => {
  if (!email.trim()) throw new Error('Email is required.');
  if (!password) throw new Error('Password is required.');

  const users  = getUsers();
  const key    = email.toLowerCase();
  const record = users[key];

  if (!record || record.password !== encode(password)) {
    throw new Error('Invalid email or password.');
  }

  const user = { uid: record.uid, name: record.name, email: record.email };
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  notifyListeners(user);
  return { user };
};

const localLogout = () => {
  localStorage.removeItem(SESSION_KEY);
  notifyListeners(null);
};

// ─── Public API — same interface regardless of mode ───────────────────────────

export const onAuthChange     = FIREBASE_ENABLED ? firebaseOnAuthChange     : localOnAuthChange;
export const signup           = FIREBASE_ENABLED ? firebaseSignup           : localSignup;
export const login            = FIREBASE_ENABLED ? firebaseLogin            : localLogin;
export const logout           = FIREBASE_ENABLED ? firebaseLogout           : localLogout;
export const getCurrentUser   = FIREBASE_ENABLED ? firebaseGetCurrentUser   : localGetCurrentUser;
