import { MapViewState } from 'deck.gl';

// Test configuration constants
export const TEST_CONFIG = {
    DOT_COUNT: {
        MIN: 100,
        MAX: 50000,
        STEP: 100,
        DEFAULT: 1000,
    },
    SPEED: {
        MIN: 0.00001,
        MAX: 0.01,
        STEP: 0.00001,
        DEFAULT: 0.0001,
    },
    GLOBE_BOUNDS: {
        MIN_LNG: -180,
        MAX_LNG: 180,
        MIN_LAT: -85, // Mercator projection limits
        MAX_LAT: 85,
    },
} as const;

export const INITIAL_VIEW_STATE: MapViewState = {
    longitude: 0, // Center on prime meridian
    latitude: 20, // Slightly north to show more land
    zoom: 2, // Global view
    maxZoom: 20,
    minZoom: 1,
};

// Map styles configuration
export const MAP_STYLES = {
    satellite: 'mapbox://styles/mapbox/satellite-v9',
    streets: 'mapbox://styles/mapbox/streets-v11',
    light: 'mapbox://styles/mapbox/light-v9',
    dark: 'mapbox://styles/mapbox/dark-v10',
    outdoors: 'mapbox://styles/mapbox/outdoors-v11',
    navigationDay: 'mapbox://styles/mapbox/navigation-day-v1',
    navigationNight: 'mapbox://styles/mapbox/navigation-night-v1',
} as const;

export type MapStyleKey = keyof typeof MAP_STYLES;

// Function to get map style by key
export const getMapStyle = (styleKey: MapStyleKey): string => {
    return MAP_STYLES[styleKey];
};

// Current map style - change this to switch styles easily
export const CURRENT_MAP_STYLE: MapStyleKey = 'satellite';
