import { create } from 'zustand';

// Interface for a moving dot
interface MovingDot {
    id: string;
    position: [number, number]; // [longitude, latitude]
    velocity: [number, number]; // [dx, dy] per frame
    color: [number, number, number]; // RGB color
    size: number;
    trail: [number, number][]; // Position history for trails
}

// Test configuration
interface TestConfig {
    dotCount: number;
    maxSpeed: number;
    updateInterval: number; // milliseconds
    enableTrails: boolean;
    trailLength: number;
    dotSizeMin: number;
    dotSizeMax: number;
}

interface PerformanceTestState {
    dots: MovingDot[];
    isRunning: boolean;
    config: TestConfig;
    bounds: {
        minLng: number;
        maxLng: number;
        minLat: number;
        maxLat: number;
    };

    // Actions
    startTest: () => void;
    stopTest: () => void;
    updateDots: () => void;
    generateDots: (count: number) => void;
    updateConfig: (config: Partial<TestConfig>) => void;
    setBounds: (bounds: {
        minLng: number;
        maxLng: number;
        minLat: number;
        maxLat: number;
    }) => void;
}

// Default configuration
const DEFAULT_CONFIG: TestConfig = {
    dotCount: 1000,
    maxSpeed: 0.0001, // degrees per frame
    updateInterval: 16, // ~60 FPS
    enableTrails: true,
    trailLength: 20,
    dotSizeMin: 2,
    dotSizeMax: 8,
};

// Default bounds (San Francisco area)
const DEFAULT_BOUNDS = {
    minLng: -122.5,
    maxLng: -122.3,
    minLat: 37.7,
    maxLat: 37.85,
};

// Utility functions
const randomInRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
};

const randomColor = (): [number, number, number] => {
    return [
        Math.floor(Math.random() * 256),
        Math.floor(Math.random() * 256),
        Math.floor(Math.random() * 256),
    ];
};

const generateRandomDot = (
    bounds: typeof DEFAULT_BOUNDS,
    config: TestConfig,
): MovingDot => {
    const position: [number, number] = [
        randomInRange(bounds.minLng, bounds.maxLng),
        randomInRange(bounds.minLat, bounds.maxLat),
    ];

    const velocity: [number, number] = [
        randomInRange(-config.maxSpeed, config.maxSpeed),
        randomInRange(-config.maxSpeed, config.maxSpeed),
    ];

    return {
        id: Math.random().toString(36).substr(2, 9),
        position,
        velocity,
        color: randomColor(),
        size: randomInRange(config.dotSizeMin, config.dotSizeMax),
        trail: [position],
    };
};

const updateDotPosition = (
    dot: MovingDot,
    bounds: typeof DEFAULT_BOUNDS,
    config: TestConfig,
): MovingDot => {
    let [lng, lat] = dot.position;
    let [vx, vy] = dot.velocity;

    // Update position
    lng += vx;
    lat += vy;

    // Bounce off boundaries
    if (lng <= bounds.minLng || lng >= bounds.maxLng) {
        vx = -vx;
        lng = Math.max(bounds.minLng, Math.min(bounds.maxLng, lng));
    }

    if (lat <= bounds.minLat || lat >= bounds.maxLat) {
        vy = -vy;
        lat = Math.max(bounds.minLat, Math.min(bounds.maxLat, lat));
    }

    const newPosition: [number, number] = [lng, lat];

    // Update trail
    const newTrail = config.enableTrails
        ? [...dot.trail, newPosition].slice(-config.trailLength)
        : [newPosition];

    return {
        ...dot,
        position: newPosition,
        velocity: [vx, vy],
        trail: newTrail,
    };
};

export const usePerformanceTestStore = create<PerformanceTestState>(
    (set, get) => ({
        dots: [],
        isRunning: false,
        config: DEFAULT_CONFIG,
        bounds: DEFAULT_BOUNDS,

        startTest: () => {
            const { config, generateDots } = get();
            generateDots(config.dotCount);
            set({ isRunning: true });
        },

        stopTest: () => {
            set({ isRunning: false, dots: [] });
        },

        updateDots: () => {
            const { dots, bounds, config } = get();
            const updatedDots = dots.map(dot =>
                updateDotPosition(dot, bounds, config),
            );
            set({ dots: updatedDots });
        },

        generateDots: (count: number) => {
            const { bounds, config } = get();
            const newDots = Array.from({ length: count }, () =>
                generateRandomDot(bounds, config),
            );
            set({ dots: newDots });
        },

        updateConfig: (newConfig: Partial<TestConfig>) => {
            const { config } = get();
            const updatedConfig = { ...config, ...newConfig };
            set({ config: updatedConfig });
        },

        setBounds: newBounds => {
            set({ bounds: newBounds });
        },
    }),
);
