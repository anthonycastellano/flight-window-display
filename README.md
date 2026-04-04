# Flight Window Display

A minimalist React application designed to track aircraft flying through a specific viewing corridor in Edgewater, Miami. It uses real-time ADS-B data from the OpenSky Network.

## Features

- **Real-time Flight Tracking**: Fetches live aircraft data via OpenSky Network API.
- **Geofencing**: Filters aircraft based on a specific viewing corridor (latitude, longitude, and heading).
- **Adaptive UI**: Automatically switches between light and dark themes based on the time of today.
- **Interactive Map**: Uses Leaflet.js to visualize aircraft positions in real-time.
- **Minimalist Design**: Built with Tailwind CSS for a clean, unobtrusive interface.

## Tech Stack

- **Framework**: [React](https://react.dev/) (via Vite)
- **Styloring**: [Tailwind CSS](https://tailwindcss.com/)
- **Map**: [Leaflet.js](https://leafletjs.com/) & `react-leaflet`
- **Icons**: [Lucide React](https://lucide.dev/)
- **Data Source**: [OpenSky Network API](https://opensky-network.org/)

## Setup and Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd flight-window-display
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Variables**:
   Create a `.env` file in the root directory and add your OpenSky credentials:
   ```env
   VITE_OPMSKY_CLIENT_ID=your_client_id
   VITE_OPENSKY_CLIENT_SECRET=your_client_secret
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

## Configuration

You can adjust the tracking parameters in `src/config.js`:
- `WINDOW_COORDS`: The center point for tracking (your window location).
- `VIEW_CONFIG`: The heading range and maximum distance for aircraft to be considered "visible".
- `DAY_TIME_CONFIG`: The hours for light/dark mode switching.

## License

MIT
