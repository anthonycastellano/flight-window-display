import { WINDOW_COORDS, VIEW_CONFIG, OPENSKY_URL, AUTH_URL } from '../config';
import { getDistance, calculateBearing } from '../utils/geoUtils';

const CLIENT_ID = import.meta.env.VITE_OPENSKY_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_OPENSKY_CLIENT_SECRET;

let accessToken = null;
let tokenExpiry = null;

/**
 * Fetches a new access token using client credentials.
 */
const fetchAccessToken = async () => {
  try {
    const response = await fetch(AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch token: ${response.statusText}`);
    }

    const data = await response.json();
    accessToken = data.access_token;
    // Set expiry with a 30-second margin
    tokenExpiry = Date.now() + (data.expires_in * 1000) - 30000;
    return accessToken;
  } catch (error) {
    console.error('Error fetching OpenSky token:', error);
    return null;
  }
};

/**
 * Ensures we have a valid access token.
 */
const getValidToken = async () => {
  if (!accessToken || !tokenExpiry || Date.now() > tokenExpiry) {
    return await fetchAccessToken();
  }
  return accessToken;
};

/**
 * Fetches all aircraft states from OpenSky Network.
 */
export const fetchFlights = async () => {
  try {
    const token = await getValidToken();
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    const params = new URLSearchParams({
      lamin: (WINDOW_COORDS.lat - 0.1).toString(),
      lomin: (WINDOW_COORDS.lng - 0.1).toString(),
      lamax: (WINDOW_COORDS.lat + 0.1).toString(),
      lomax: (WINDOW_COORDS.lng + 0.1).toString(),
    });

    const response = await fetch(`${OPENSKY_URL}?${params.toString()}`, { headers });
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token might have expired unexpectedly
        accessToken = null;
        return await fetchFlights();
      }
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.states || [];
  } catch (error) {
    console.error('Error fetching flights from OpenSky:', error);
    return [];
  }
};

/**
 * Maps a raw flight state array from OpenSky to a cleaner object.
 * @param {Array} flight - A single flight state array from OpenSky
 * @returns {Object}
 */
const mapFlightState = (flight) => {
  const [
    icao24, 
    callsign, 
    country, 
    _time_position, 
    last_contact, 
    longitude, 
    latitude, 
    baro_altitude, 
    on_ground, 
    velocity, 
    true_track, 
    vertical_rate, 
    sensors, 
    geo_altitude,
    squawk,
    spi,
    position_source,
    category
  ] = flight;

  return {
    icao24,
    callsign: callsign?.trim() || 'Unknown',
    country,
    latitude,
    longitude,
    altitude: baro_altitude,
    velocity,
    heading: true_track,
    on_ground
  };
};

/**
 * Filters flights based on the viewing window configuration.
 * @param {Array} flights - Array of raw flight state arrays from OpenSky
 * @returns {Array} - Filtered and mapped flights
 */
export const filterVisibleFlights = (flights) => {
  return flights
    .map(mapFlightState)
    .filter(flight => {
      if (!flight.latitude || flight.on_ground) return false;
      
      // 1. Check distance
      const dist = getDistance(
        WINDOW_COORDS.lat, 
        WINDOW_COORDS.lng, 
        flight.latitude, 
        flight.longitude
      );
      
      if (dist > VIEW_CONFIG.maxDistanceKm) return false;
      
      // 2. Check if plane is within the window's angular sector (bearing from window)
      const bearingFromWindow = calculateBearing(
        WINDOW_COORDS.lat,
        WINDOW_COORDS.lng,
        flight.latitude,
        flight.longitude
      );

      const isWithinSector =
        (bearingFromWindow >= VIEW_CONFIG.headingRange[0] && bearingFromWindow <= 360) ||
        (bearingFromWindow >= 0 && bearingFromWindow <= VIEW_CONFIG.headingRange[1]);

      return isWithinSector;
    });
};
