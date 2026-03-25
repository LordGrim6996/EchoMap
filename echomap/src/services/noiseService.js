/**
 * Noise reading service.
 * Uses Firestore when Firebase is enabled, falls back to localStorage.
 */
import { FIREBASE_ENABLED, db, currentUserId, collection, addDoc, getDocs, query, orderBy, limit } from './firebase';

const STORAGE_KEY = 'echomap_readings';

// Seed data for demo purposes (only used when no readings exist)
// Timestamps are set to specific hours so the Day/Night filter is demonstrable.
const todayAt = (hour, minutesAgo = 0) => {
    const d = new Date();
    d.setHours(hour, 0, 0, 0);
    return d.getTime() - minutesAgo * 60000;
};

const SEED_DATA = [
    // ── Daytime readings (06:00 – 21:59) ──────────────────────────────
    { id: 'seed1',  lat: 34.0522, lng: -118.2437, db: 72, type: 'City Traffic',   timestamp: todayAt(8)  },
    { id: 'seed2',  lat: 34.0530, lng: -118.2450, db: 85, type: 'Construction',   timestamp: todayAt(10) },
    { id: 'seed3',  lat: 34.0510, lng: -118.2410, db: 48, type: 'Nature/Birds',   timestamp: todayAt(7)  },
    { id: 'seed4',  lat: 34.0540, lng: -118.2430, db: 68, type: 'Street Music',   timestamp: todayAt(14) },
    { id: 'seed5',  lat: 34.0515, lng: -118.2455, db: 78, type: 'People/Crowd',   timestamp: todayAt(12) },
    // ── Nighttime readings (22:00 – 05:59) ────────────────────────────
    { id: 'seed6',  lat: 34.0525, lng: -118.2440, db: 55, type: 'City Traffic',   timestamp: todayAt(23) },
    { id: 'seed7',  lat: 34.0518, lng: -118.2462, db: 38, type: 'Quiet Background', timestamp: todayAt(2) },
    { id: 'seed8',  lat: 34.0535, lng: -118.2420, db: 62, type: 'Street Music',   timestamp: todayAt(22) },
    { id: 'seed9',  lat: 34.0506, lng: -118.2445, db: 45, type: 'Industrial Hum', timestamp: todayAt(3)  },
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
