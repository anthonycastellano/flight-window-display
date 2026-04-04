import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { fetchFlights, filterVisibleFlights } from './services/openskyService';
import { WINDOW_COORDS } from './config';
import { calculateBearing, getDistance } from './utils/geoUtils';

function App() {
  const [flights, setFlights] = useState([]);
  const [error, setError] = useState(null);

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

  return (
    <div className="h-screen w-screen overflow-hidden bg-zinc-950 text-slate-100">
      <main className="relative h-full w-full p-4 md:p-8">
        <section className="h-full w-full rounded-3xl border border-zinc-800/80 bg-zinc-900/40 p-4 md:p-7 shadow-2xl">
          <FlightList flights={flights} windowCoords={WINDOW_COORDS} />
        </section>
        {error && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 rounded-xl text-base border shadow-xl bg-red-950/80 border-red-800 text-red-300">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}

function FlightList({ flights, windowCoords }) {
  const closestFlights = flights
    .map((flight) => {
      const resolvedDistanceKm = Number.isFinite(flight.distanceKm)
        ? flight.distanceKm
        : (Number.isFinite(flight.latitude) && Number.isFinite(flight.longitude)
          ? getDistance(windowCoords.lat, windowCoords.lng, flight.latitude, flight.longitude)
          : Number.POSITIVE_INFINITY);

      return { ...flight, resolvedDistanceKm };
    })
    .sort((a, b) => a.resolvedDistanceKm - b.resolvedDistanceKm)
    .slice(0, 3);

  return (
    <div className="h-full grid content-center gap-4 md:gap-5">
      {closestFlights.length === 0 ? (
        <div className="rounded-3xl border border-zinc-800/80 bg-zinc-950/40 py-24 text-center opacity-70 text-2xl italic">
          No aircraft in corridor.
        </div>
      ) : (
        closestFlights.map((flight) => (
          <FlightItem key={flight.icao24} flight={flight} windowCoords={windowCoords} />
        ))
      )}
    </div>
  );
}

function FlightItem({ flight, windowCoords }) {
  const bearing = Number.isFinite(flight.latitude) && Number.isFinite(flight.longitude)
    ? calculateBearing(windowCoords.lat, windowCoords.lng, flight.latitude, flight.longitude)
    : 0;
  const country = flight.country || 'Unknown';
  const callsign = flight.callsign || 'Unknown';
  const heightFeet = Number.isFinite(flight.altitude)
    ? `${Math.round(flight.altitude * 3.28084).toLocaleString()} ft`
    : 'N/A';
  const speedMph = Number.isFinite(flight.velocity)
    ? `${Math.round(flight.velocity * 2.23694)} mph`
    : 'N/A';
  const distanceKm = Number.isFinite(flight.resolvedDistanceKm)
    ? flight.resolvedDistanceKm
    : null;
  const distanceMiles = Number.isFinite(distanceKm)
    ? `${(distanceKm * 0.621371).toFixed(distanceKm < 10 ? 1 : 0)} mi`
    : 'N/A';

  return (
    <article className="rounded-3xl border border-zinc-800/80 bg-zinc-950/55 px-5 py-6 md:px-8 md:py-8">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-4 md:gap-6 min-w-0">
          <div
            className="w-24 h-24 md:w-28 md:h-28 flex items-center justify-center shrink-0"
            style={{ transform: `rotate(${bearing}deg)` }}
          >
            <ArrowUp className="w-20 h-20 md:w-24 md:h-24 text-sky-400" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <h2 className="text-4xl md:text-6xl font-semibold leading-none tracking-tight truncate">
              {callsign}
            </h2>
            <p className="mt-2 text-lg md:text-2xl text-slate-400 truncate">Country: {country}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-3xl md:text-5xl font-mono font-semibold text-sky-300">{
            distanceMiles
          }</p>
          <p className="mt-2 text-lg md:text-2xl text-slate-300">Altitude: {heightFeet}</p>
          <p className="mt-1 text-lg md:text-2xl text-slate-400">Speed: {speedMph}</p>
        </div>
      </div>
    </article>
  );
}

export default App;
