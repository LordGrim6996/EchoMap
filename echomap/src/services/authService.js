/**
 * authService.js
 * 
 * localStorage-based auth service.
 * Designed to be swappable with Firebase email/password auth:
 * just replace the signup/login/logout internals — no UI changes needed.
 */

const USERS_KEY = 'echomap_users';
const SESSION_KEY = 'echomap_session';

/** Simple encode — not cryptographic, FYP/demo only. */
function encode(str) {
  return btoa(encodeURIComponent(str));
}

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function generateUid() {
  return 'local_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Auth listeners ───────────────────────────────────────────────────────────
const listeners = new Set();

function notifyListeners(user) {
  listeners.forEach(cb => cb(user));
}

export function onAuthChange(callback) {
  listeners.add(callback);
  // Fire immediately with current state
  callback(getCurrentUser());
  return () => listeners.delete(callback); // unsubscribe fn
}

// ─── Core API ─────────────────────────────────────────────────────────────────

export function getCurrentUser() {
  try {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
  } catch {
    return null;
  }
}

/**
 * Create a new account.
 * @returns {{ user }} on success
 * @throws  {Error}   with a human-readable message on failure
 */
export function signup(name, email, password) {
  if (!name.trim()) throw new Error('Name is required.');
  if (!email.trim()) throw new Error('Email is required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  if (password.length < 6) throw new Error('Password must be at least 6 characters.');

  const users = getUsers();
  const key = email.toLowerCase();

  if (users[key]) throw new Error('An account with this email already exists.');

  const user = { uid: generateUid(), name: name.trim(), email: key };
  users[key] = { ...user, password: encode(password) };
  saveUsers(users);

  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  notifyListeners(user);
  return { user };
}

/**
 * Sign in with email + password.
 * @returns {{ user }} on success
 * @throws  {Error}   with a human-readable message on failure
 */
export function login(email, password) {
  if (!email.trim()) throw new Error('Email is required.');
  if (!password) throw new Error('Password is required.');

  const users = getUsers();
  const key = email.toLowerCase();
  const record = users[key];

  if (!record || record.password !== encode(password)) {
    throw new Error('Invalid email or password.');
  }

  const user = { uid: record.uid, name: record.name, email: record.email };
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  notifyListeners(user);
  return { user };
}

/** Sign out the current user. */
export function logout() {
  localStorage.removeItem(SESSION_KEY);
  notifyListeners(null);
}
