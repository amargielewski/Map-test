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
    enableViewportCulling: boolean;
    cullingBuffer: number; // Extra margin for culling
}

interface ViewportBounds {
    minLng: number;
    maxLng: number;
    minLat: number;
    maxLat: number;
}

interface PerformanceTestState {
    dots: MovingDot[];
    visibleDots: MovingDot[]; // Cached viewport-culled dots
    isRunning: boolean;
    config: TestConfig;
    bounds: ViewportBounds;
    lastViewportBounds: ViewportBounds | null;

    // Performance metrics
    totalDots: number;
    visibleDotsCount: number;
    cullingEnabled: boolean;

    // Actions
    startTest: () => void;
    stopTest: () => void;
    updateDots: () => void;
    generateDots: (count: number) => void;
    updateConfig: (config: Partial<TestConfig>) => void;
    setBounds: (bounds: ViewportBounds) => void;
    updateViewportCulling: (viewportBounds: ViewportBounds) => void;
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
    enableViewportCulling: true,
    cullingBuffer: 0.01, // Extra margin for culling in degrees
};

// Global bounds for worldwide dot distribution
const DEFAULT_BOUNDS = {
    minLng: -180,
    maxLng: 180,
    minLat: -85, // Mercator projection limits
    maxLat: 85,
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

// Viewport culling utility
const isPointInViewport = (
    point: [number, number],
    viewport: ViewportBounds,
    buffer: number = 0,
): boolean => {
    const [lng, lat] = point;
    return (
        lng >= viewport.minLng - buffer &&
        lng <= viewport.maxLng + buffer &&
        lat >= viewport.minLat - buffer &&
        lat <= viewport.maxLat + buffer
    );
};

// Efficient viewport culling that only recalculates when needed
const updateViewportCulling = (
    dots: MovingDot[],
    viewportBounds: ViewportBounds,
    lastViewportBounds: ViewportBounds | null,
    config: TestConfig,
    forceUpdate: boolean = false,
): { visibleDots: MovingDot[]; shouldUpdate: boolean } => {
    if (!config.enableViewportCulling) {
        return { visibleDots: dots, shouldUpdate: false };
    }

    // Check if viewport bounds changed significantly
    const boundsChanged =
        forceUpdate ||
        !lastViewportBounds ||
        Math.abs(viewportBounds.minLng - lastViewportBounds.minLng) > 0.001 ||
        Math.abs(viewportBounds.maxLng - lastViewportBounds.maxLng) > 0.001 ||
        Math.abs(viewportBounds.minLat - lastViewportBounds.minLat) > 0.001 ||
        Math.abs(viewportBounds.maxLat - lastViewportBounds.maxLat) > 0.001;

    if (!boundsChanged) {
        return { visibleDots: [], shouldUpdate: false };
    }

    // Only cull if we have more than 500 dots (avoid overhead for small datasets)
    if (dots.length < 500) {
        return { visibleDots: dots, shouldUpdate: true };
    }

    // Use a more efficient filtering approach
    const visibleDots: MovingDot[] = [];
    const buffer = config.cullingBuffer;
    const minLng = viewportBounds.minLng - buffer;
    const maxLng = viewportBounds.maxLng + buffer;
    const minLat = viewportBounds.minLat - buffer;
    const maxLat = viewportBounds.maxLat + buffer;

    for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        const [lng, lat] = dot.position;

        if (lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat) {
            visibleDots.push(dot);
        }
    }

    return { visibleDots, shouldUpdate: true };
};

export const usePerformanceTestStore = create<PerformanceTestState>(
    (set, get) => ({
        dots: [],
        visibleDots: [],
        isRunning: false,
        config: DEFAULT_CONFIG,
        bounds: DEFAULT_BOUNDS,
        lastViewportBounds: null,
        totalDots: 0,
        visibleDotsCount: 0,
        cullingEnabled: true,

        startTest: () => {
            const { config, generateDots } = get();
            generateDots(config.dotCount);
            set({ isRunning: true });
        },

        stopTest: () => {
            set({
                isRunning: false,
                dots: [],
                visibleDots: [],
                totalDots: 0,
                visibleDotsCount: 0,
                lastViewportBounds: null,
            });
        },

        updateDots: () => {
            const { dots, bounds, config, lastViewportBounds } = get();
            const updatedDots = dots.map(dot =>
                updateDotPosition(dot, bounds, config),
            );

            // If culling is enabled and we have viewport bounds, update visible dots
            let newVisibleDots = updatedDots;
            let newVisibleDotsCount = updatedDots.length;

            if (config.enableViewportCulling && lastViewportBounds) {
                const { visibleDots } = updateViewportCulling(
                    updatedDots,
                    lastViewportBounds,
                    lastViewportBounds,
                    config,
                    true, // Force update since dots have moved
                );
                newVisibleDots = visibleDots;
                newVisibleDotsCount = visibleDots.length;
            }

            set({
                dots: updatedDots,
                totalDots: updatedDots.length,
                visibleDots: newVisibleDots,
                visibleDotsCount: newVisibleDotsCount,
            });
        },

        generateDots: (count: number) => {
            const { bounds, config } = get();
            const newDots = Array.from({ length: count }, () =>
                generateRandomDot(bounds, config),
            );
            set({
                dots: newDots,
                totalDots: newDots.length,
                visibleDots: newDots,
                visibleDotsCount: newDots.length,
            });
        },

        updateConfig: (newConfig: Partial<TestConfig>) => {
            const { config } = get();
            const updatedConfig = { ...config, ...newConfig };
            set({ config: updatedConfig });
        },

        setBounds: (newBounds: ViewportBounds) => {
            set({ bounds: newBounds });
        },

        updateViewportCulling: (viewportBounds: ViewportBounds) => {
            const { dots, lastViewportBounds, config } = get();

            const { visibleDots, shouldUpdate } = updateViewportCulling(
                dots,
                viewportBounds,
                lastViewportBounds,
                config,
                false, // Don't force update for viewport changes
            );

            if (shouldUpdate) {
                set({
                    visibleDots,
                    visibleDotsCount: visibleDots.length,
                    lastViewportBounds: viewportBounds,
                });
            }
        },
    }),
);
