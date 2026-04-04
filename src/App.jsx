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
  const [flights, setFlights] = Lucide
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'

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
    const interval = setInterval(updateFlights, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 p-4 flex justify-between items-center sticky top-0 z-[1000]">
        <div>
          <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Plane className="w-5 h-5 text-blue-600" />
            Edgewater Skies
          </h1>
          <p className="text-[10px] uppercase tracking-widiter text-slate-400 font-medium">
            Live Tracking • {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={updateFlights}
            disabled={loading}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="h-4 w-[1px] bg-slate-200 mx-1" />
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('map')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'map' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
            >
              <MapIcon className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
            >
              <ListIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden">
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-red-50 text-red-600 px-4 py-2 rounded-full text-sm border border-red-100 shadow-sm">
            {error}
          </div>
        )}

        {viewMode === 'map' ? (
          <div className="h-full w-full">
            <MapContainer 
              center={EDW_COORDS} 
              zoom={13} 
              className="h-full w-full z-0"
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {flights.map((flight) => (
                <Marker 
                  key={flight.icao24} 
                  position={[flight.latitude, flight.longitude]}
                >
                  <Popup>
                    <div className="font-sans">
                      <p className="font-bold text-blue-600">{flight.callsign}</p>
                      <p className="text-xs text-slate-500">Alt: {Math.round(flight.altitude)}m</p>
                      <p className="text-xs text-slateslate-500">Speed: {Math.round(flight.velocity * 3.6)} km/h</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        ) : (
          <div className="p-4 max-w-2xl mx-auto overflow-y-auto h-full">
            <div className="space-y-3">
              {flights.length === 0 ? (
                <div className="text-center py-20 text-slate-400 italic">
                  No flights currently in your view.
                </div>
                  ) : (
                flights.map((flight) => (
                  <div 
                    key={flight.icao24}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center"
                  >
                    <div>
                      <h3 className="font-bold text-slate-800">{flight.callsign}</h3>
                      <p className="text-xs text-slate-500">{flight.country}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-blue-600">{Math.round(flight.altitude)}m</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">
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

      <footer className="bg-white border-t border-slate-200 p-3 text-center text-[10px] text-slate-400 uppercase tracking-widest">
        Visualizing airspace near Edgewater, Miami
      </footer>
    </div>
  );
}

export default App
