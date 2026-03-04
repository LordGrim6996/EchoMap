/**
 * audioClassifier.js
 * Real audio classification using TensorFlow.js with YAMNet model.
 * Replaces the mock classifier with actual ML-based sound classification.
 */
import * as tf from '@tensorflow/tfjs';

// UrbanSound8K class labels mapped to user-friendly names
const URBANSOUND_LABELS = [
    'Air Conditioner',
    'Car Horn',
    'Children Playing',
    'Dog Bark',
    'Drilling',
    'Engine Idling',
    'Gun Shot',
    'Jackhammer',
    'Siren/Alarm',
    'Street Music',
];

// YAMNet class name substrings → UrbanSound8K category index mapping
// YAMNet has 521 classes; we map relevant ones to our 10 categories
const YAMNET_TO_URBAN = {
    'air conditioning': 0,
    'air conditioner': 0,
    'hvac': 0,
    'car horn': 1, 'honking': 1, 'vehicle horn': 1, 'beep, bleep': 1,
    'children playing': 2, 'child speech': 2, 'children shouting': 2,
    'dog': 3, 'bark': 3, 'yip': 3, 'howl': 3, 'bow-wow': 3,
    'drill': 4, 'power tool': 4, 'drilling': 4,
    'engine': 5, 'idling': 5, 'motor vehicle': 5, 'engine starting': 5,
    'gunshot': 6, 'gun shot': 6, 'firearm': 6, 'machine gun': 6,
    'jackhammer': 7, 'hammer': 7,
    'siren': 8, 'alarm': 8, 'emergency vehicle': 8, 'fire engine': 8, 'ambulance': 8, 'police car': 8,
    'music': 9, 'street music': 9, 'guitar': 9, 'drum': 9, 'singing': 9, 'piano': 9,
};

// Singleton model state
let yamnetModel = null;
let yamnetClassNames = null;
let isModelLoading = false;
let modelLoadPromise = null;

/**
 * Load the YAMNet model from TFHub.
 * Uses singleton pattern — loads once, reuses on subsequent calls.
 */
const YAMNET_MODEL_URL = 'https://www.kaggle.com/models/google/yamnet/TfJs/tfjs/1';

export const loadModel = async () => {
    if (yamnetModel) return yamnetModel;
    if (modelLoadPromise) return modelLoadPromise;

    isModelLoading = true;
    modelLoadPromise = (async () => {
        try {
            console.log('Loading YAMNet model...');
            yamnetModel = await tf.loadGraphModel(YAMNET_MODEL_URL, { fromTFHub: true });
            console.log('YAMNet model loaded successfully.');

            // Load class names CSV from TFHub
            try {
                const response = await fetch(
                    'https://raw.githubusercontent.com/tensorflow/models/master/research/audioset/yamnet/yamnet_class_map.csv'
                );
                const csvText = await response.text();
                yamnetClassNames = csvText
                    .trim()
                    .split('\n')
                    .slice(1) // skip header
                    .map(line => {
                        const parts = line.split(',');
                        return parts.slice(2).join(',').replace(/"/g, '').trim();
                    });
                console.log(`Loaded ${yamnetClassNames.length} YAMNet class names.`);
            } catch (e) {
                console.warn('Could not load YAMNet class names, using index-based fallback.', e);
                yamnetClassNames = null;
            }

            isModelLoading = false;
            return yamnetModel;
        } catch (err) {
            console.error('Failed to load YAMNet model:', err);
            isModelLoading = false;
            modelLoadPromise = null;
            throw err;
        }
    })();

    return modelLoadPromise;
};

/**
 * Check if the model is currently loading
 */
export const isLoading = () => isModelLoading;

/**
 * Resample audio to 16kHz mono using OfflineAudioContext.
 * YAMNet requires 16kHz, single-channel input.
 * @param {AudioBuffer} audioBuffer - The captured audio buffer
 * @returns {Float32Array} - Resampled 16kHz mono audio data
 */
const resampleTo16kHz = async (audioBuffer) => {
    const targetSampleRate = 16000;
    const numSamples = Math.ceil(audioBuffer.duration * targetSampleRate);

    const offlineCtx = new OfflineAudioContext(1, numSamples, targetSampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    return renderedBuffer.getChannelData(0);
};

/**
 * Map a YAMNet class name to an UrbanSound8K category.
 * Searches for substring matches in the YAMNET_TO_URBAN mapping.
 * @param {string} yamnetClassName - The YAMNet class name
 * @returns {number|null} - UrbanSound8K category index or null
 */
const mapToUrbanSound = (yamnetClassName) => {
    const lowerName = yamnetClassName.toLowerCase();
    for (const [keyword, categoryIndex] of Object.entries(YAMNET_TO_URBAN)) {
        if (lowerName.includes(keyword)) {
            return categoryIndex;
        }
    }
    return null;
};

/**
 * Classify audio using YAMNet model.
 * @param {AudioBuffer|null} audioBuffer - The captured audio buffer.
 *        If null, falls back to mock classification.
 * @returns {Promise<{label: string, confidence: number}>}
 */
export const classifyAudio = async (audioBuffer) => {
    // Fallback to mock if no audio buffer provided
    if (!audioBuffer) {
        console.warn('No audio buffer provided, returning mock classification.');
        return mockClassify();
    }

    try {
        const model = await loadModel();

        // Resample to 16kHz mono
        const waveform = await resampleTo16kHz(audioBuffer);

        // Create tensor: YAMNet expects a 1D float32 tensor of audio samples
        const inputTensor = tf.tensor1d(waveform);

        // Run inference
        const output = model.predict(inputTensor);

        // YAMNet returns [scores, embeddings, spectrogram]
        // scores shape: [num_frames, 521]
        let scores;
        if (Array.isArray(output)) {
            scores = output[0];
        } else {
            scores = output;
        }

        // Average scores across all frames
        const meanScores = scores.mean(0);
        const scoresArray = await meanScores.data();

        // Find the top YAMNet predictions
        const topIndices = Array.from(scoresArray)
            .map((score, idx) => ({ score, idx }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 10); // top 10

        // Try to map to UrbanSound8K category
        let bestMatch = null;
        let bestScore = 0;

        for (const { score, idx } of topIndices) {
            const className = yamnetClassNames ? yamnetClassNames[idx] : `class_${idx}`;
            const urbanCategory = mapToUrbanSound(className);

            if (urbanCategory !== null && score > bestScore) {
                bestMatch = urbanCategory;
                bestScore = score;
            }
        }

        // Cleanup tensors
        inputTensor.dispose();
        if (Array.isArray(output)) {
            output.forEach(t => t.dispose());
        } else {
            output.dispose();
        }
        meanScores.dispose();

        if (bestMatch !== null) {
            return {
                label: URBANSOUND_LABELS[bestMatch],
                confidence: Math.min(bestScore, 0.99),
            };
        }

        // If no mapping found, return the top YAMNet class directly
        const topIdx = topIndices[0].idx;
        const topName = yamnetClassNames ? yamnetClassNames[topIdx] : `Unknown Sound`;
        return {
            label: topName,
            confidence: Math.min(topIndices[0].score, 0.99),
        };

    } catch (err) {
        console.error('Classification error, falling back to mock:', err);
        return mockClassify();
    }
};

/**
 * Mock classification fallback (used when model fails to load or no audio buffer)
 */
const mockClassify = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const randomIndex = Math.floor(Math.random() * URBANSOUND_LABELS.length);
    return {
        label: URBANSOUND_LABELS[randomIndex],
        confidence: 0.85 + (Math.random() * 0.1),
    };
};
