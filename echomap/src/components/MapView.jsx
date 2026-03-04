import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { getReadings } from '../services/noiseService'

// Fix for default marker icon in Leaflet with Vite/Webpack
import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Default fallback center (Los Angeles)
const DEFAULT_CENTER = [34.0522, -118.2437];

// Component to programmatically fly the map to a new center
const FlyToLocation = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, 15, { duration: 1.5 });
        }
    }, [center, map]);
    return null;
};

// Noise type filter options
const NOISE_TYPES = [
    'All',
    'Air Conditioner', 'Car Horn', 'Children Playing', 'Dog Bark',
    'Drilling', 'Engine Idling', 'Gun Shot', 'Jackhammer',
    'Siren/Alarm', 'Street Music',
    // Legacy labels from mock data
    'City Traffic', 'Construction', 'Nature/Birds', 'People/Crowd',
    'Quiet Background', 'Industrial Hum',
];

const MapView = () => {
    const [readings, setReadings] = useState([])
    const [loading, setLoading] = useState(true)
    const [userLocation, setUserLocation] = useState(null)
    const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER)
    const [activeFilter, setActiveFilter] = useState('All')
    const [locatingUser, setLocatingUser] = useState(false)

    // Get user location on mount
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const loc = [position.coords.latitude, position.coords.longitude];
                    setUserLocation(loc);
                    setMapCenter(loc);
                },
                (error) => {
                    console.warn('Geolocation error on mount:', error.message);
                    // Keep default center
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
            );
        }
    }, []);

    // Load readings
    useEffect(() => {
        getReadings().then(data => {
            setReadings(data)
            setLoading(false)
        })
    }, [])

    const handleMyLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.');
            return;
        }
        setLocatingUser(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const loc = [position.coords.latitude, position.coords.longitude];
                setUserLocation(loc);
                setMapCenter(loc);
                setLocatingUser(false);
            },
            (error) => {
                console.warn('Geolocation error:', error.message);
                alert('Could not get your location. Please enable location permissions.');
                setLocatingUser(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const getColor = (db) => {
        if (db < 50) return '#22c55e'  // green
        if (db < 70) return '#eab308'  // yellow
        if (db < 85) return '#f97316'  // orange
        return '#ef4444'               // red
    }

    const getRadius = (db) => {
        if (db < 50) return 8
        if (db < 70) return 11
        if (db < 85) return 14
        return 17
    }

    // Get unique noise types present in readings
    const availableTypes = ['All', ...new Set(readings.map(r => r.type))];

    // Filter readings
    const filteredReadings = activeFilter === 'All'
        ? readings
        : readings.filter(r => r.type === activeFilter);

    return (
        <div className="flex flex-col gap-3">
            {/* Filter bar */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {availableTypes.map(type => (
                    <button
                        key={type}
                        onClick={() => setActiveFilter(type)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 border ${activeFilter === type
                                ? 'bg-brand-accent text-white border-brand-accent shadow-md shadow-brand-accent/20'
                                : 'bg-slate-700/50 text-slate-300 border-white/10 hover:bg-slate-600/50 hover:text-white'
                            }`}
                    >
                        {type}
                        {type !== 'All' && (
                            <span className="ml-1 opacity-60">
                                ({readings.filter(r => r.type === type).length})
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Map container */}
            <div className="h-[400px] w-full rounded-xl overflow-hidden border border-white/20 relative z-0">
                {loading ? (
                    <div className="h-full w-full flex items-center justify-center bg-slate-800">
                        <div className="flex flex-col items-center gap-3">
                            <svg className="animate-spin h-8 w-8 text-brand-accent" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span className="text-slate-400 text-sm">Loading map data...</span>
                        </div>
                    </div>
                ) : (
                    <MapContainer center={mapCenter} zoom={15} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        />
                        <FlyToLocation center={mapCenter} />

                        {/* User location marker */}
                        {userLocation && (
                            <CircleMarker
                                center={userLocation}
                                pathOptions={{
                                    color: '#3b82f6',
                                    fillColor: '#3b82f6',
                                    fillOpacity: 0.9,
                                    weight: 3,
                                }}
                                radius={8}
                            >
                                <Popup>
                                    <div className="text-slate-900 font-sans">
                                        <strong className="text-blue-600 text-xs uppercase tracking-wider">📍 You are here</strong>
                                    </div>
                                </Popup>
                            </CircleMarker>
                        )}

                        {/* Noise reading markers */}
                        {filteredReadings.map(point => (
                            <CircleMarker
                                key={point.id}
                                center={[point.lat, point.lng]}
                                pathOptions={{
                                    color: getColor(point.db),
                                    fillColor: getColor(point.db),
                                    fillOpacity: 0.6,
                                    weight: 2,
                                }}
                                radius={getRadius(point.db)}
                            >
                                <Popup>
                                    <div className="text-slate-900 font-sans min-w-[120px]">
                                        <strong className="text-violet-600 uppercase text-xs tracking-wider block mb-1">
                                            {point.type}
                                        </strong>
                                        <span className="font-bold text-lg">{point.db} dB</span>
                                        {point.timestamp && (
                                            <div className="text-xs text-slate-500 mt-1">
                                                {new Date(point.timestamp).toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                </Popup>
                            </CircleMarker>
                        ))}
                    </MapContainer>
                )}

                {/* My Location button */}
                <button
                    onClick={handleMyLocation}
                    disabled={locatingUser}
                    className="absolute bottom-4 right-4 z-[1000] bg-white/90 backdrop-blur-sm hover:bg-white text-slate-800 p-2.5 rounded-full shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 border border-slate-200"
                    title="Go to my location"
                >
                    {locatingUser ? (
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Reading count */}
            <div className="text-center text-xs text-slate-500">
                Showing {filteredReadings.length} of {readings.length} readings
                {activeFilter !== 'All' && (
                    <button
                        onClick={() => setActiveFilter('All')}
                        className="ml-2 text-brand-accent hover:underline"
                    >
                        Clear filter
                    </button>
                )}
            </div>
        </div>
    )
}

export default MapView
