import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Plane, RefreshCw, Map as MapIcon, List as ListIcon } from 'lucide-react';
import { fetchFlights, filterVisibleFlights } from './services/openskyService';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet marker icon issue in React
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const EDW_COORDS = [25.79, -80.18]; // Edgewater, Miami

function App() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [viewMode, setViewMode] = useState('split'); // 'map', 'list', or 'split'

  const updateFlights = async () => {
    setLoading(true);
    try {
      const rawFlights = await fetchFlights();
      const visible = filterVisibleFlights(rawFlights);
      setFlights(visible);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to update flights. API might be rate-limited.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    updateFlights();
    const interval = setInterval(updateFlights, 30000); 
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col text-slate-200 font-sans bg-[#0a0a0a]">
      {/* Floating HUD Header */}
      <header className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-4 px-4 py-2 glass rounded-full shadow-2xl">
        <div className="flex items-center gap-2 px-2">
          <Plane className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-bold tracking-tight uppercase">Edgewater Skies</span>
        </div>
        
        <div className="h-4 w-[1px] bg-white/10" />

        <div className="flex items-center gap-3 text-[10px] font-medium text-slate-400 uppercase tracking-widest">
          <span>{lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <div className={`h-1.5 w-1.5 rounded-full ${loading ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} />
        </div>

        <div className="h-4 w-[1px] bg-white/10" />

        <div className="flex items-center gap-1 p-1 bg-white/5 rounded-full border border-white/10">
          <button 
            onClick={() => setViewMode('map')}
            className={`p-1.5 rounded-full transition-all ${viewMode === 'map' || viewMode === 'split' ? 'bg-blue-500 text-white' : 'text-slate/400 hover:text-white'}`}
          >
            <MapIcon className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setViewMode('split')}
            className={`p-1.5 rounded-full transition-all ${viewMode === 'split' ? 'bg-blue-500 text-white' : 'text-slate/400 hover:text-white'}`}
          >
            <div className="w-4 h-4 border-2 border-current rounded-sm" />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-full transition-all ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-slate/400 hover:text-white'}`}
          >
            <ListIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="h-4 w-[1px] bg-white/10" />

        <button 
          onClick={updateFlights}
          disabled={loading}
          className="p-1.5 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {error && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] glass-card text-red-400 px-4 py-2 rounded-xl text-xs border-red-500/30 shadow-xl">
          {error}
        </div>
      )}

      <main className="flex-1 flex overflow-hidden">
        {/* Map Section */}
        {(viewMode === 'map' || viewMode === 'split') && (
          <div className={`flex-1 relative h-full transition-all duration-500 ${viewMode === 'split' ? 'w-2/3' : 'w-full'}`}>
<MapContainer 
              center={EDW_COORDS} 
              zoom={13} 
              className="h-full w-full z-0"
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              {flights.map((flight) => (
                <Marker 
                  key={flight.icao24} 
                  position={[flight.latitude, flight.longitude]}
                >
                  <Popup className="custom-popup">
                    <div className="text-slate-900 font-sans p-1">
                      <p className="font-bold text-blue-600">{flight.callsign}</p>
                      <p className="text-[10px] text-slate-500">Alt: {Math.round(flight.altitude)}m</p>
                      <p className="text-[10px] text-slate-500">Speed: {Math.round(flight.velocity * 3.6)} km/h</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}

        {/* List Section */}
        {(viewMode === 'list' || viewMode === 'split') && (
          <div className={`h-full transition-all duration-500 overflow-y-auto p-6 ${viewMode === 'split' ? 'w-1/3 border-l border-white/10' : 'w-full max-w-xl mx-auto'}`}>
            <div className="flex flex-col gap-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Active Flights</h2>
              {flights.length === 0 ? (
                <div className="text-center py-20 text-slate-600 italic text-sm">
                  No aircraft in corridor.
                </div>
              ) : (
                flights.map((flight) => (
                  <div 
                    key={flight.icao24}
                    className="glass-card p-4 rounded-2xl flex justify-between items-center hover:border-blue-500/50 transition-all group"
                  >
                    <div>
                      <h3 className="font-bold text-slate-100 group-hover:text-blue-400 transition-colors">{flight.callsign}</h3>
                      <p className="text-[10px] text-slate-500 uppercase tracking-tight">{flight.country}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono text-blue-400">{Math.round(flight.altitude)}m</p>
                      <p className="text-[10px] text-opacity-50 text-slate-500">
                        {Math.round(flight.velocity * 3.6)} km/h
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

