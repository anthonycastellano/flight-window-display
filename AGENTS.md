# Flight Tracker Agent Instructions

This repository contains a lightweight React application designed to track aircraft flying through a specific viewing corridor in Edgewater, Miami.

## Project Architecture

### Frontend
- **Framework**: React (via Vite)
- **Styling**: Tailwind CSS (Minimalist design language)
- **Map Visualization**: Leaflet.js with `react-leaflet`
- **Icons**: Lucide-React
- **State Management**: React Hooks (`useState`, `useEffect`)

### Data Layer
- **Source**: [OpenSky Network API](https://opensky-network.org/) (Real-time ADS-B flight data)
- **Service**: `src/services/openskyService.js` handles fetching and filtering.
- **Logic**:
    - **Geofencing**: Uses the Haversine formula to calculate distance from a fixed coordinate (Edgewater, Miami).
    - **Corridor Filtering**: Filters aircraft based on a specific heading range (North-facing window) and maximum distance.
    - **Polling**: The application polls the API every 30 seconds.

## Development Guidelines for Agents

### 1. Documentation & Research
- **IMPORTANT**: If you need to look up API specifics (e.g., OpenSky parameter structures) or library usage (e.g., Leaflet, React-Leaflet), use the **Context7 MCP tools** to retrieve up-to-date documentation. This is much more reliable than internal knowledge.

### 2. Coding Standards
- **Design**: Adhere to the "Minimalist" design language. Use neutral colors (`slate`, `gray`), large typography for readability, and plenty of whitespace.
- **Consistency**: Follow the existing implementation in `src/services/` when adding new services.
- **Safety**: Do not introduce heavy dependencies. The project aims to remain lightweight.

### 3. Running the Project
- Install dependencies: `npm install`
- Start dev server: `npm run dev`

### 4. Deployment
- The project is ready for deployment on Vercel or GitHub Pages.
- Ensure all environment-specific configs (like coordinates) are easily adjustable in the service layer.
