import React, { useMemo, useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { fetchFlights, filterVisibleFlights } from './services/openskyService';
import { WINDOW_COORDS } from './config';
import { calculateBearing, getDistance } from './utils/geoUtils';

const POLL_INTERVAL_MS = 10000;
const ENTER_SETUP_MS = 80;
const EXIT_ANIMATION_MS = 700;
const EARTH_RADIUS_KM = 6371;
const CLOCK_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});
const CLOCK_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

const toRadians = (degrees) => (degrees * Math.PI) / 180;
const toDegrees = (radians) => (radians * 180) / Math.PI;

const destinationPoint = (latitude, longitude, bearingDegrees, distanceKm) => {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(bearingDegrees) ||
    !Number.isFinite(distanceKm) ||
    distanceKm <= 0
  ) {
    return { latitude, longitude };
  }

  const angularDistance = distanceKm / EARTH_RADIUS_KM;
  const bearing = toRadians(bearingDegrees);
  const startLatitude = toRadians(latitude);
  const startLongitude = toRadians(longitude);

  const nextLatitude = Math.asin(
    Math.sin(startLatitude) * Math.cos(angularDistance) +
      Math.cos(startLatitude) * Math.sin(angularDistance) * Math.cos(bearing)
  );
  const nextLongitude =
    startLongitude +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(startLatitude),
      Math.cos(angularDistance) - Math.sin(startLatitude) * Math.sin(nextLatitude)
    );

  const normalizedLongitude = ((((toDegrees(nextLongitude) + 540) % 360) + 360) % 360) - 180;

  return {
    latitude: toDegrees(nextLatitude),
    longitude: normalizedLongitude,
  };
};

const reconcileFlightStates = (previousStates, incomingFlights, now) => {
  const nextStates = { ...previousStates };
  const incomingIds = new Set();

  incomingFlights.forEach((flight) => {
    const id = flight.icao24;
    if (!id) return;

    incomingIds.add(id);

    const existing = nextStates[id];
    const isReturning = existing?.presence === 'exiting';
    nextStates[id] = {
      ...existing,
      ...flight,
      baseLatitude: flight.latitude,
      baseLongitude: flight.longitude,
      lastSeenAt: now,
      presence: existing ? (isReturning ? 'entering' : existing.presence) : 'entering',
      presenceSince: isReturning || !existing ? now : existing.presenceSince,
      removeAfter: null,
    };
  });

  Object.values(nextStates).forEach((flight) => {
    if (!incomingIds.has(flight.icao24) && flight.presence !== 'exiting') {
      nextStates[flight.icao24] = {
        ...flight,
        presence: 'exiting',
        presenceSince: now,
        removeAfter: now + EXIT_ANIMATION_MS,
      };
    }
  });

  return nextStates;
};

const projectFlightPosition = (flight, now) => {
  if (!Number.isFinite(flight.baseLatitude) || !Number.isFinite(flight.baseLongitude)) {
    return { latitude: flight.baseLatitude, longitude: flight.baseLongitude };
  }

  const heading = Number.isFinite(flight.heading) ? flight.heading : null;
  const velocity = Number.isFinite(flight.velocity) ? flight.velocity : null;

  if (heading === null || velocity === null || velocity <= 0) {
    return { latitude: flight.baseLatitude, longitude: flight.baseLongitude };
  }

  const secondsSinceSeen = Math.max(0, (now - flight.lastSeenAt) / 1000);
  const projectedDistanceKm = (velocity * secondsSinceSeen) / 1000;

  return destinationPoint(
    flight.baseLatitude,
    flight.baseLongitude,
    heading,
    projectedDistanceKm
  );
};

function App() {
  const [flightStates, setFlightStates] = useState({});
  const [error, setError] = useState(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const performUpdate = async () => {
      if (!isMounted) return;

      try {
        const rawFlights = await fetchFlights();
        const visible = filterVisibleFlights(rawFlights);
        const timestamp = Date.now();

        setFlightStates((previous) => reconcileFlightStates(previous, visible, timestamp));
        setError(null);
      } catch (err) {
        setError('Failed to update flights. API might be rate-limited.');
        console.error(err);
      }
    };

    performUpdate();
    const interval = setInterval(performUpdate, POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let rafId;
    const animate = () => {
      setNow(Date.now());
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(rafId);
  }, []);

  const cleanupTick = Math.floor(now / 500);
  useEffect(() => {
    setFlightStates((previous) => {
      let changed = false;
      const nextStates = {};

      Object.values(previous).forEach((flight) => {
        const cleanupNow = cleanupTick * 500;
        if (
          flight.presence === 'exiting' &&
          Number.isFinite(flight.removeAfter) &&
          cleanupNow >= flight.removeAfter
        ) {
          changed = true;
          return;
        }
        nextStates[flight.icao24] = flight;
      });

      return changed ? nextStates : previous;
    });
  }, [cleanupTick]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      <main className="relative h-full w-full p-4 md:p-8">
        <FlightList flightStates={flightStates} windowCoords={WINDOW_COORDS} now={now} />
        {error && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 rounded-xl text-base border shadow-xl bg-red-950/80 border-red-800 text-red-300">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}

function FlightList({ flightStates, windowCoords, now }) {
  const visibleFlights = useMemo(() => {
    return Object.values(flightStates)
      .filter((flight) => !(flight.presence === 'exiting' && now - flight.presenceSince > EXIT_ANIMATION_MS))
      .map((flight) => {
        const projected = projectFlightPosition(flight, now);

        const projectedDistanceKm =
          Number.isFinite(projected.latitude) && Number.isFinite(projected.longitude)
            ? getDistance(windowCoords.lat, windowCoords.lng, projected.latitude, projected.longitude)
            : Number.POSITIVE_INFINITY;

        const bearing =
          Number.isFinite(projected.latitude) && Number.isFinite(projected.longitude)
            ? calculateBearing(windowCoords.lat, windowCoords.lng, projected.latitude, projected.longitude)
            : 0;

        const presenceAge = Math.max(0, now - flight.presenceSince);

        return {
          ...flight,
          projectedLatitude: projected.latitude,
          projectedLongitude: projected.longitude,
          bearing,
          presenceAge,
          resolvedDistanceKm: Number.isFinite(projectedDistanceKm)
            ? projectedDistanceKm
            : Number.isFinite(flight.distanceKm)
              ? flight.distanceKm
              : Number.POSITIVE_INFINITY,
        };
      })
      .sort((a, b) => a.resolvedDistanceKm - b.resolvedDistanceKm);
  }, [flightStates, now, windowCoords.lat, windowCoords.lng]);

  return (
    <div className="h-full grid content-center gap-4 md:gap-5">
      {visibleFlights.length === 0 ? (
        <div className="py-24 text-center">
          <DigitalClock now={now} />
          <p className="mt-4 text-2xl font-light text-slate-300/90">No aircraft in corridor.</p>
        </div>
      ) : (
        visibleFlights.map((flight) => (
          <FlightItem key={flight.icao24} flight={flight} />
        ))
      )}
    </div>
  );
}

function DigitalClock({ now }) {
  const date = new Date(now);

  return (
    <div>
      <p className="text-6xl md:text-8xl font-light tracking-tight tabular-nums text-slate-100">
        {CLOCK_TIME_FORMATTER.format(date)}
      </p>
      <p className="mt-3 text-base md:text-xl font-light tracking-[0.08em] uppercase text-slate-400">
        {CLOCK_DATE_FORMATTER.format(date)}
      </p>
    </div>
  );
}

function FlightItem({ flight }) {
  const country = flight.country || 'Unknown';
  const callsign = flight.callsign || 'Unknown';
  const heightFeet = Number.isFinite(flight.altitude)
    ? `${Math.round(flight.altitude * 3.28084).toLocaleString()} ft`
    : 'N/A';
  const speedMph = Number.isFinite(flight.velocity)
    ? `${Math.round(flight.velocity * 2.23694)} mph`
    : 'N/A';
  const distanceMiles = Number.isFinite(flight.resolvedDistanceKm)
    ? `${(flight.resolvedDistanceKm * 0.621371).toFixed(flight.resolvedDistanceKm < 10 ? 1 : 0)} mi`
    : 'N/A';

  const arrowRotation = flight.bearing;

  const isEntering = flight.presence === 'entering' && flight.presenceAge < ENTER_SETUP_MS;
  const isExiting = flight.presence === 'exiting';

  const animationClass = isEntering
    ? 'opacity-0 translate-y-5 scale-[0.97] blur-[1px]'
    : isExiting
      ? 'opacity-0 -translate-y-4 scale-[0.96] blur-[1px]'
      : 'opacity-100 translate-y-0 scale-100 blur-0';

  return (
    <article
      className={`px-5 py-6 md:px-8 md:py-8 transition-all duration-700 ease-out will-change-transform ${animationClass}`}
    >
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-4 md:gap-6 min-w-0">
          <div
            className="w-24 h-24 md:w-28 md:h-28 flex items-center justify-center shrink-0"
            style={{ transform: `rotate(${arrowRotation}deg)` }}
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
          <p className="text-3xl md:text-5xl font-mono font-semibold text-sky-300">
            {distanceMiles}
          </p>
          <p className="mt-2 text-lg md:text-2xl text-slate-300">Altitude: {heightFeet}</p>
          <p className="mt-1 text-lg md:text-2xl text-slate-400">Speed: {speedMph}</p>
        </div>
      </div>
    </article>
  );
}

export default App;
