/**
 * Noise reading service.
 * Uses Firestore when Firebase is enabled, falls back to localStorage.
 */
import { FIREBASE_ENABLED, db, currentUserId, collection, addDoc, getDocs, query, orderBy, limit } from './firebase';

const STORAGE_KEY = 'echomap_readings';

// Seed data for demo purposes (only used when no readings exist)
const SEED_DATA = [
    { id: 'seed1', lat: 34.0522, lng: -118.2437, db: 65, type: 'City Traffic', timestamp: Date.now() - 3600000 },
    { id: 'seed2', lat: 34.0530, lng: -118.2450, db: 80, type: 'Construction', timestamp: Date.now() - 7200000 },
    { id: 'seed3', lat: 34.0510, lng: -118.2410, db: 45, type: 'Nature/Birds', timestamp: Date.now() - 1800000 },
];

// ─── Firestore Operations ───────────────────────────────────────────

const firestoreGetReadings = async () => {
    try {
        const q = query(
            collection(db, 'readings'),
            orderBy('timestamp', 'desc'),
            limit(500)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
    } catch (err) {
        console.error('Firestore read error, falling back to localStorage:', err);
        return localGetReadings();
    }
};

const firestoreAddReading = async (reading) => {
    try {
        const docData = {
            ...reading,
            timestamp: Date.now(),
            userId: currentUserId || 'anonymous',
            lat: reading.lat || (34.0522 + (Math.random() - 0.5) * 0.01),
            lng: reading.lng || (-118.2437 + (Math.random() - 0.5) * 0.01),
        };
        const docRef = await addDoc(collection(db, 'readings'), docData);
        console.log('Saved to Firestore with ID:', docRef.id);

        // Also cache locally for offline access
        localAddReading({ ...docData, id: docRef.id });

        return { id: docRef.id, ...docData };
    } catch (err) {
        console.error('Firestore write error, falling back to localStorage:', err);
        return localAddReading(reading);
    }
};

// ─── LocalStorage Operations ────────────────────────────────────────

const localGetReadings = async () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const localReadings = stored ? JSON.parse(stored) : [];

    // Show seed data if no readings exist
    if (localReadings.length === 0) {
        return [...SEED_DATA];
    }
    return localReadings;
};

const localAddReading = async (reading) => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const localReadings = stored ? JSON.parse(stored) : [];

    const newReading = {
        ...reading,
        id: reading.id || `local_${Date.now()}`,
        timestamp: reading.timestamp || Date.now(),
        lat: reading.lat || (34.0522 + (Math.random() - 0.5) * 0.01),
        lng: reading.lng || (-118.2437 + (Math.random() - 0.5) * 0.01),
    };

    localReadings.push(newReading);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localReadings));

    return newReading;
};

// ─── Public API ─────────────────────────────────────────────────────

export const getReadings = FIREBASE_ENABLED ? firestoreGetReadings : localGetReadings;
export const addReading = FIREBASE_ENABLED ? firestoreAddReading : localAddReading;
