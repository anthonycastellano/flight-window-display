import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { ArrowUp } from 'lucide-react';
import { fetchFlights, filterVisibleFlights } from './services/openskyService';
import { WINDOW_COORDS, DAY_TIME_CONFIG } from './config';
import { calculateBearing } from './utils/geoUtils';
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

const EDT_COORDS = [WINDOW_COORDS.lat, WINDOW_COORDS.lng];

function App() {
  const [flights, setFlights] = useState([]);
  const [error, setError] = useState(null);
  const [isDayTime, setIsDayTime] = useState(true);

  const checkDayTime = () => {
    const hour = new Date().getHours();
    return hour >= DAY_TIME_CONFIG.startHour && hour < DAY_TIME_CONFIG.endHour;
  };

  useEffect(() => {
    const initialDayTime = checkDayTime();
    setIsDayTime(initialDayTime);
    const timeCheckInterval = setInterval(() => {
      setIsDayTime(checkDayTime());
    }, 60000);
    return () => clearInterval(timeCheckInterval);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const performUpdate = async () => {
      if (isMounted) await updateFlights();
    };

    performUpdate();
    const interval = setInterval(performUpdate, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);


  const updateFlights = async () => {
    try {
      const rawFlights = await fetchFlights();
      const visible = filterVisibleFlights(rawFlights);
      setFlights(visible);
      setError(null);
    } catch (err) {
      setError('Failed to update flights. API might be rate-limited.');
      console.error(err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const performUpdate = async () => {
      if (isMounted) await updateFlights();
    };

    performUpdate();
    const interval = setInterval(performUpdate, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);


  return (
    <div className={`h-screen w-screen overflow-hidden flex flex-col font-sans transition-colors duration-1000 ${isDayTime ? 'bg-slate-50 text-slate-900' : 'bg-zinc-950 text-slate-100'}`}>
      <main className="relative flex-1 flex flex-col">
        <div className="flex-1 relative">
          <MapContainer
            center={EDT_COORDS}
            zoom={13}
            className="h-full w-full z-0"
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url={isDayTime ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"}
            />
            {flights.map((flight) => (
              <Marker
                key={flight.icao24}
                position={[flight.latitude, flight.longitude]}
              >
                <Popup className="custom-popup">
                  <div className="font-sans p-1">
                    <p className="font-bold text-blue-600">{flight.callsign}</p>
                    <p className="text-[10px] text-slate-500">Alt: {Math.round(flight.altitude)}m</p>
                    <p className="text-[10px] text-slate-500">Speed: {Math.round(flight.velocity * 3.6)} km/h</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <FlightList flights={flights} isDayTime={isDayTime} windowCoords={WINDOW_COORDS} />

        {error && (
          <div className={`absolute top-6 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 rounded-xl text-xs border shadow-xl ${isDayTime ? 'bg-red-50 border-red-200 text-red-600' : 'bg-red-950/80 border-red-800 text-red-400'}`}>
            {error}
          </div>
        )}
      </main>
    </div>
  );
}

function FlightList({ flights, isDayTime, windowCoords }) {
  return (
    <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-xl max-h-[40%] overflow-y-auto p-4 rounded-3xl shadow-2xl backdrop-blur-md border transition-colors duration-1000 ${isDayTime ? 'bg-white/70 border-slate-200 text-slate-900' : 'bg-zinc-900/70 border-zinc-800 text-slate-100'}`}>
      <div className="flex flex-col gap-3">
        {flights.length === 0 ? (
          <div className="text-center py-10 opacity-50 italic text-sm">
            No aircraft in corridor.
          </div>
        ) : (
          flights.map((flight) => (
            <FlightItem key={flight.icao24} flight={flight} isDayTime={isDayTime} windowCoords={windowCoords} />
          ))
        )}
      </div>
    </div>
  );
}

function FlightItem({ flight, isDayTime, windowCoords }) {
  const bearing = calculateBearing(windowCoords.lat, windowCoords.lng, flight.latitude, flight.longitude);
  
  return (
      <div
        className={`p-4 rounded-2xl flex justify-between items-center transition-all group ${isDayTime ? 'bg-white/50 hover:bg-white/80' : 'bg-white/5 hover:bg-white/10'}`}
      >

      <div className="flex items-center gap-4">
        <div
          className="w-8 h-8 flex items-center justify-center transition-transform duration-500"
          style={{ transform: `rotate(${bearing}deg)` }}
        >
          <ArrowUp className={`w-5 h-5 ${isDayTime ? 'text-blue-600' : 'text-blue-400'}`} />
        </div>
        <div>
          <h3 className="font-bold leading-tight">{flight.callsign}</h3>
          <p className={`text-[10px] uppercase tracking-tight ${isDayTime ? 'text-slate-500' : 'text-slate-400'}`}>{flight.country}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-mono font-bold text-blue-500/80">{Math.round(flight.altitude)}m</p>
        <p className={`text-[10px] opacity-60 ${isDayTime ? 'text-slate-500' : 'text-slate-400'}`}>
          {Math.round(flight.velocity * 3.6)} km/h
        </p>
      </div>
    </div>
  );
}

export default App;
