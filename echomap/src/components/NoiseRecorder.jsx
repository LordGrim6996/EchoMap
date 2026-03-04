import { useState, useRef, useEffect } from 'react'
import { classifyAudio, loadModel } from '../utils/audioClassifier'
import { useToast } from './Toast'

const NoiseRecorder = () => {
    const [isRecording, setIsRecording] = useState(false)
    const [decibels, setDecibels] = useState(0)
    const [avgDecibels, setAvgDecibels] = useState(0)
    const [maxDecibels, setMaxDecibels] = useState(0)
    const [duration, setDuration] = useState(0)
    const [classification, setClassification] = useState(null)
    const [isClassifying, setIsClassifying] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [modelStatus, setModelStatus] = useState('idle') // 'idle' | 'loading' | 'ready' | 'error'

    const toast = useToast()

    const audioContextRef = useRef(null)
    const analyserRef = useRef(null)
    const dataArrayRef = useRef(null)
    const sourceRef = useRef(null)
    const rafId = useRef(null)
    const startTimeRef = useRef(null)
    const readingsRef = useRef([])
    const streamRef = useRef(null)

    // Audio capture refs for real classification
    const mediaRecorderRef = useRef(null)
    const audioChunksRef = useRef([])

    // Preload the ML model on component mount
    useEffect(() => {
        setModelStatus('loading')
        loadModel()
            .then(() => {
                setModelStatus('ready')
                toast.success('AI model loaded and ready!')
            })
            .catch(() => {
                setModelStatus('error')
                toast.warning('AI model unavailable — using fallback classification')
            })
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const startRecording = async () => {
        try {
            setClassification(null)
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            streamRef.current = stream

            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
            analyserRef.current = audioContextRef.current.createAnalyser()
            analyserRef.current.fftSize = 256

            sourceRef.current = audioContextRef.current.createMediaStreamSource(stream)
            sourceRef.current.connect(analyserRef.current)

            const bufferLength = analyserRef.current.frequencyBinCount
            dataArrayRef.current = new Uint8Array(bufferLength)

            // Set up MediaRecorder to capture audio for classification
            audioChunksRef.current = []
            try {
                const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                    ? 'audio/webm;codecs=opus'
                    : 'audio/webm'
                mediaRecorderRef.current = new MediaRecorder(stream, { mimeType })
                mediaRecorderRef.current.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        audioChunksRef.current.push(event.data)
                    }
                }
                mediaRecorderRef.current.start(500) // collect chunks every 500ms
            } catch (recorderErr) {
                console.warn('MediaRecorder not available, will use mock classification:', recorderErr)
            }

            setIsRecording(true)
            startTimeRef.current = Date.now()
            readingsRef.current = []
            setMaxDecibels(0)

            updateMeter()
        } catch (err) {
            console.error("Error accessing microphone:", err)
            toast.error("Could not access microphone. Please enable permissions.")
        }
    }

    const stopRecording = async () => {
        if (rafId.current) cancelAnimationFrame(rafId.current)

        setIsRecording(false)
        setIsClassifying(true)

        // Calculate final stats
        const sum = readingsRef.current.reduce((a, b) => a + b, 0)
        const avg = readingsRef.current.length ? sum / readingsRef.current.length : 0
        const finalAvg = parseFloat(avg.toFixed(1))
        setAvgDecibels(finalAvg)

        // Stop MediaRecorder and get audio buffer for classification
        let audioBuffer = null
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            audioBuffer = await new Promise((resolve) => {
                mediaRecorderRef.current.onstop = async () => {
                    try {
                        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
                        const arrayBuffer = await blob.arrayBuffer()
                        const ctx = new (window.AudioContext || window.webkitAudioContext)()
                        const decoded = await ctx.decodeAudioData(arrayBuffer)
                        ctx.close()
                        resolve(decoded)
                    } catch (err) {
                        console.error('Error decoding audio for classification:', err)
                        resolve(null)
                    }
                }
                mediaRecorderRef.current.stop()
            })
        }

        // Close audio context and stop stream tracks
        if (audioContextRef.current) {
            audioContextRef.current.close()
            audioContextRef.current = null
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }

        // Classify the audio
        const result = await classifyAudio(audioBuffer)
        setClassification(result)
        setIsClassifying(false)
        toast.info(`Detected: ${result.label} (${Math.round(result.confidence * 100)}% confidence)`)
    }

    const getLocation = () => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                console.warn('Geolocation not supported, using fallback.');
                resolve(null);
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    });
                },
                (error) => {
                    console.warn('Geolocation error:', error.message);
                    resolve(null);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
            );
        });
    };

    const handleSave = async () => {
        if (!classification) return;

        setIsSaving(true);

        // Get real location
        const location = await getLocation();

        const reading = {
            db: avgDecibels,
            type: classification.label,
            ...(location && { lat: location.lat, lng: location.lng }),
        };

        try {
            await import('../services/noiseService').then(m => m.addReading(reading));
            if (location) {
                toast.success('Noise reading saved with your location!');
            } else {
                toast.warning('Saved with approximate location (GPS unavailable)');
            }
            // Reset
            setClassification(null);
            setDecibels(0);
            setAvgDecibels(0);
            setMaxDecibels(0);
        } catch (e) {
            console.error(e);
            toast.error('Failed to save reading. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const updateMeter = () => {
        if (!analyserRef.current) return

        analyserRef.current.getByteFrequencyData(dataArrayRef.current)

        // Calculate RMS
        let sum = 0
        const data = dataArrayRef.current
        for (let i = 0; i < data.length; i++) {
            sum += data[i] * data[i]
        }
        const rms = Math.sqrt(sum / data.length)

        const value = Math.max(0, 20 * Math.log10(rms || 1))
        const calibration = 30
        const dB = Math.min(120, Math.round(value + calibration))

        setDecibels(dB)
        readingsRef.current.push(dB)
        if (dB > maxDecibels) setMaxDecibels(dB)

        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))

        rafId.current = requestAnimationFrame(updateMeter)
    }

    useEffect(() => {
        return () => {
            cancelAnimationFrame(rafId.current)
            if (audioContextRef.current) audioContextRef.current.close()
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop())
            }
        }
    }, [])

    const getNoiseColor = (db) => {
        if (db < 50) return 'text-green-400'
        if (db < 70) return 'text-yellow-400'
        if (db < 85) return 'text-orange-400'
        return 'text-red-500'
    }

    const getNoiseLevel = (db) => {
        if (db < 30) return 'Quiet'
        if (db < 50) return 'Moderate'
        if (db < 70) return 'Loud'
        if (db < 85) return 'Very Loud'
        return 'Dangerous'
    }

    // Meter ring progress (0-120dB mapped to 0-100%)
    const meterProgress = Math.min(100, (decibels / 120) * 100)
    const circumference = 2 * Math.PI * 88 // radius 88
    const strokeDashoffset = circumference - (meterProgress / 100) * circumference

    return (
        <div className="flex flex-col items-center">
            {/* Model loading status indicator */}
            {modelStatus === 'loading' && (
                <div className="w-full mb-4 bg-blue-900/50 border border-blue-500/30 p-3 rounded-xl text-center">
                    <div className="text-sm text-blue-300 flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Loading AI model...
                    </div>
                </div>
            )}
            {modelStatus === 'error' && (
                <div className="w-full mb-4 bg-amber-900/50 border border-amber-500/30 p-3 rounded-xl text-center">
                    <div className="text-sm text-amber-300">⚠️ AI model unavailable — using fallback classification</div>
                </div>
            )}

            {/* Circular dB Meter with SVG ring */}
            <div className="relative w-48 h-48 flex items-center justify-center mb-6">
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 200 200">
                    {/* Background ring */}
                    <circle cx="100" cy="100" r="88" stroke="rgba(100,116,139,0.2)" strokeWidth="8" fill="none" />
                    {/* Progress ring */}
                    <circle
                        cx="100" cy="100" r="88"
                        stroke={decibels < 50 ? '#22c55e' : decibels < 70 ? '#eab308' : decibels < 85 ? '#f97316' : '#ef4444'}
                        strokeWidth="8"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-150"
                    />
                </svg>
                <div className="flex flex-col items-center">
                    <div className={`text-5xl font-mono font-bold transition-colors ${getNoiseColor(decibels)}`}>
                        {decibels}
                    </div>
                    <div className="text-sm text-slate-500">dB</div>
                    {isRecording && (
                        <div className={`text-xs font-semibold mt-1 ${getNoiseColor(decibels)}`}>
                            {getNoiseLevel(decibels)}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3 w-full mb-6">
                <div className="bg-slate-700/50 p-3 rounded-xl text-center border border-white/5">
                    <div className="text-xs text-slate-400 uppercase tracking-wider">Avg</div>
                    <div className="font-bold text-lg">{isRecording ? '--' : avgDecibels}</div>
                </div>
                <div className="bg-slate-700/50 p-3 rounded-xl text-center border border-white/5">
                    <div className="text-xs text-slate-400 uppercase tracking-wider">Max</div>
                    <div className="font-bold text-lg text-orange-400">{maxDecibels || '--'}</div>
                </div>
                <div className="bg-slate-700/50 p-3 rounded-xl text-center border border-white/5">
                    <div className="text-xs text-slate-400 uppercase tracking-wider">Time</div>
                    <div className="font-bold text-lg">{isRecording ? `${duration}s` : '--'}</div>
                </div>
            </div>

            {/* Classifying indicator */}
            {isClassifying && (
                <div className="w-full mb-6 bg-violet-900/50 border border-violet-500/30 p-4 rounded-xl text-center">
                    <div className="text-sm text-violet-300 flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Classifying noise source...
                    </div>
                </div>
            )}

            {classification && (
                <div className="w-full mb-6 bg-slate-700/50 p-4 rounded-xl border border-blue-500/30 backdrop-blur-sm">
                    <div className="text-xs text-slate-400 uppercase mb-1 tracking-wider">Detected Noise Source</div>
                    <div className="flex justify-between items-center">
                        <span className="text-xl font-bold text-white">{classification.label}</span>
                        <span className="text-sm bg-blue-900/80 text-blue-200 px-2.5 py-1 rounded-full font-semibold">
                            {Math.round(classification.confidence * 100)}%
                        </span>
                    </div>
                </div>
            )}

            {!isRecording ? (
                <button
                    onClick={startRecording}
                    disabled={isClassifying}
                    className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all duration-200 ${isClassifying
                        ? 'bg-slate-600 cursor-not-allowed opacity-50'
                        : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:brightness-110 hover:shadow-green-500/20 hover:shadow-xl active:scale-[0.98]'
                        }`}
                >
                    {classification ? '🔄 Record Again' : '🎙️ Start Recording'}
                </button>
            ) : (
                <button
                    onClick={stopRecording}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 font-bold text-lg shadow-lg hover:brightness-110 active:scale-[0.98] transition-all duration-200"
                >
                    <span className="flex items-center justify-center gap-2">
                        <span className="w-3 h-3 bg-white rounded-sm animate-pulse" />
                        Stop & Analyze
                    </span>
                </button>
            )}

            {classification && !isRecording && (
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`w-full mt-4 py-3 rounded-xl font-bold text-lg shadow-lg transition-all duration-200 ${isSaving
                            ? 'bg-slate-600 cursor-not-allowed opacity-50'
                            : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:brightness-110 hover:shadow-blue-500/20 hover:shadow-xl active:scale-[0.98]'
                        }`}
                >
                    {isSaving ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Saving...
                        </span>
                    ) : (
                        '📍 Save to Map'
                    )}
                </button>
            )}
        </div>
    )
}

export default NoiseRecorder
