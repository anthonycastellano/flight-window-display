/**
 * OpenSky Network API service for fetching and filtering flight data.
 */

const OPENSKY_URL = '/api/flights';

// Coordinates for Edgewater, Miami (approx window location)
// Adjust these to your exact window location
const WINDOW_COORDS = {
  lat: 25.79, 
  lng: -80.18
};

/**
 * Define the viewing corridor.
 * For a north-facing window, we look at planes within a certain heading range
 * and within a certain distance.
 */
const VIEW_CONFIG = {
  headingRange: [300, 60], // North-ish: 300 to 360, and 0 to 60
  maxDistanceKm: 10,       // Distance from window to look at
};

/**
 * Fetches all aircraft states from OpenSky Network.
 * Note: This can be heavy. In a real app, you'd use a bounding box.
 */
export const fetchFlights = async () => {
  try {
    const response = await fetch(OPENSKY_URL);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    return data.states || [];
  } catch (error) {
    console.error('Error fetching flights from OpenSky:', error);
    return [];
  }
};

/**
 * Filters flights based on the viewing window configuration.
 * @param {Array} flights - Array of flight state arrays from OpenSky
 * @returns {Array} - Filtered flights
 */
export const filterVisibleFlights = (flights) => {
  return flights.filter(flight => {
    const [
      icao24, 
      callsign, 
      country, 
      time_position, 
      last_contact, 
      longitude, 
      latitude, 
      baro_altitude, 
      on_ground, 
      velocity, 
      true_track, 
      vertical_rate, 
      geo_altitude
    ] = flight;

    if (!latitude || !longitude) return false;

    // 1. Check distance (simplified approximation)
    const dist = getDistance(
      WINDOW_COORDS.lat, 
      WINDOW_COORDS.lng, 
      latitude, 
      longitude
    );
    
    if (dist > VIEW_CONFIG.maxDistanceKm) return false;

    // 2. Check heading (true_track)
    // true_track is the direction the plane is moving
    const heading = true_track;
    const isHeadingCorrect = 
      (heading >= VIEW_CONFIG.headingRange[0] && heading <= 360) ||
      (heading >= 0 && heading <= VIEW_CONFIG.headingRange[1]);

    if (!isHeadingCorrect) return false;

    // 3. Filter out ground aircraft
    if (on_ground) return false;

    return true;
  }).map(flight => ({
    icao24: flight[0],
    callsign: flight[1]?.trim() || 'Unknown',
    country: flight[2],
    latitude: flight[6],
    longitude: flight[7],
    altitude: flight[8],
    velocity: flight[9],
    heading: flight[10]
  }));
};

/**
 * Haversine formula to calculate distance between two points in km.
 */
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
