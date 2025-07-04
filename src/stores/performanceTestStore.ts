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

// High-performance binary data structure for dots
class DotDataBuffer {
    // Data layout: [lng, lat, vx, vy, r, g, b, size] per dot
    private static FIELDS_PER_DOT = 8;
    private static TRAIL_FIELDS_PER_DOT = 2; // [lng, lat] per trail point

    public data: Float32Array;
    public trailData: Float32Array;
    public visibilityMask: Uint8Array;
    public count: number;
    public maxTrailLength: number;

    constructor(maxDots: number, maxTrailLength: number = 20) {
        this.count = 0;
        this.maxTrailLength = maxTrailLength;
        this.data = new Float32Array(maxDots * DotDataBuffer.FIELDS_PER_DOT);
        this.trailData = new Float32Array(
            maxDots * maxTrailLength * DotDataBuffer.TRAIL_FIELDS_PER_DOT,
        );
        this.visibilityMask = new Uint8Array(maxDots);
    }

    // Get dot data at index
    getDot(index: number): MovingDot {
        const offset = index * DotDataBuffer.FIELDS_PER_DOT;
        const trailOffset =
            index * this.maxTrailLength * DotDataBuffer.TRAIL_FIELDS_PER_DOT;

        // Extract trail points
        const trail: [number, number][] = [];
        for (let i = 0; i < this.maxTrailLength; i++) {
            const tOffset = trailOffset + i * 2;
            const lng = this.trailData[tOffset];
            const lat = this.trailData[tOffset + 1];
            if (lng !== 0 || lat !== 0) {
                // Skip empty trail points
                trail.push([lng, lat]);
            }
        }

        return {
            id: index.toString(),
            position: [this.data[offset], this.data[offset + 1]],
            velocity: [this.data[offset + 2], this.data[offset + 3]],
            color: [
                this.data[offset + 4],
                this.data[offset + 5],
                this.data[offset + 6],
            ],
            size: this.data[offset + 7],
            trail,
        };
    }

    // Set dot data at index
    setDot(index: number, dot: MovingDot): void {
        const offset = index * DotDataBuffer.FIELDS_PER_DOT;
        const trailOffset =
            index * this.maxTrailLength * DotDataBuffer.TRAIL_FIELDS_PER_DOT;

        // Set main data
        this.data[offset] = dot.position[0];
        this.data[offset + 1] = dot.position[1];
        this.data[offset + 2] = dot.velocity[0];
        this.data[offset + 3] = dot.velocity[1];
        this.data[offset + 4] = dot.color[0];
        this.data[offset + 5] = dot.color[1];
        this.data[offset + 6] = dot.color[2];
        this.data[offset + 7] = dot.size;

        // Set trail data (pad with zeros if needed)
        for (let i = 0; i < this.maxTrailLength; i++) {
            const tOffset = trailOffset + i * 2;
            if (i < dot.trail.length) {
                this.trailData[tOffset] = dot.trail[i][0];
                this.trailData[tOffset + 1] = dot.trail[i][1];
            } else {
                this.trailData[tOffset] = 0;
                this.trailData[tOffset + 1] = 0;
            }
        }
    }

    // Get position data for all dots (for Deck.gl ScatterplotLayer)
    getPositions(): Float32Array {
        const positions = new Float32Array(this.count * 3); // [x, y, z]
        for (let i = 0; i < this.count; i++) {
            const offset = i * DotDataBuffer.FIELDS_PER_DOT;
            positions[i * 3] = this.data[offset]; // longitude
            positions[i * 3 + 1] = this.data[offset + 1]; // latitude
            positions[i * 3 + 2] = 0; // elevation
        }
        return positions;
    }

    // Get colors for all dots
    getColors(): Uint8Array {
        const colors = new Uint8Array(this.count * 4); // [r, g, b, a]
        for (let i = 0; i < this.count; i++) {
            const offset = i * DotDataBuffer.FIELDS_PER_DOT;
            colors[i * 4] = this.data[offset + 4];
            colors[i * 4 + 1] = this.data[offset + 5];
            colors[i * 4 + 2] = this.data[offset + 6];
            colors[i * 4 + 3] = 255; // alpha
        }
        return colors;
    }

    // Get sizes for all dots
    getSizes(): Float32Array {
        const sizes = new Float32Array(this.count);
        for (let i = 0; i < this.count; i++) {
            const offset = i * DotDataBuffer.FIELDS_PER_DOT;
            sizes[i] = this.data[offset + 7];
        }
        return sizes;
    }

    // Update dot position and velocity (in-place for performance)
    updateDotPosition(
        index: number,
        bounds: ViewportBounds,
        maxSpeed: number,
    ): void {
        const offset = index * DotDataBuffer.FIELDS_PER_DOT;
        const trailOffset =
            index * this.maxTrailLength * DotDataBuffer.TRAIL_FIELDS_PER_DOT;

        let lng = this.data[offset];
        let lat = this.data[offset + 1];
        let vx = this.data[offset + 2];
        let vy = this.data[offset + 3];

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

        // Update data
        this.data[offset] = lng;
        this.data[offset + 1] = lat;
        this.data[offset + 2] = vx;
        this.data[offset + 3] = vy;

        // Update trail by shifting existing points and adding new position
        // Move existing trail points back
        for (let i = this.maxTrailLength - 1; i > 0; i--) {
            const currentOffset = trailOffset + i * 2;
            const prevOffset = trailOffset + (i - 1) * 2;
            this.trailData[currentOffset] = this.trailData[prevOffset];
            this.trailData[currentOffset + 1] = this.trailData[prevOffset + 1];
        }

        // Add new position at the front
        this.trailData[trailOffset] = lng;
        this.trailData[trailOffset + 1] = lat;
    }

    // Fast viewport culling using binary data
    updateVisibilityMask(
        viewportBounds: ViewportBounds,
        buffer: number = 0,
    ): number {
        const minLng = viewportBounds.minLng - buffer;
        const maxLng = viewportBounds.maxLng + buffer;
        const minLat = viewportBounds.minLat - buffer;
        const maxLat = viewportBounds.maxLat + buffer;

        let visibleCount = 0;

        for (let i = 0; i < this.count; i++) {
            const offset = i * DotDataBuffer.FIELDS_PER_DOT;
            const lng = this.data[offset];
            const lat = this.data[offset + 1];

            if (
                lng >= minLng &&
                lng <= maxLng &&
                lat >= minLat &&
                lat <= maxLat
            ) {
                this.visibilityMask[i] = 1;
                visibleCount++;
            } else {
                this.visibilityMask[i] = 0;
            }
        }

        return visibleCount;
    }

    // Get positions for only visible dots
    getVisiblePositions(): Float32Array {
        let visibleCount = 0;
        for (let i = 0; i < this.count; i++) {
            if (this.visibilityMask[i]) visibleCount++;
        }

        const positions = new Float32Array(visibleCount * 3);
        let writeIndex = 0;

        for (let i = 0; i < this.count; i++) {
            if (this.visibilityMask[i]) {
                const offset = i * DotDataBuffer.FIELDS_PER_DOT;
                positions[writeIndex * 3] = this.data[offset];
                positions[writeIndex * 3 + 1] = this.data[offset + 1];
                positions[writeIndex * 3 + 2] = 0;
                writeIndex++;
            }
        }

        return positions;
    }

    // Get colors for only visible dots
    getVisibleColors(): Uint8Array {
        let visibleCount = 0;
        for (let i = 0; i < this.count; i++) {
            if (this.visibilityMask[i]) visibleCount++;
        }

        const colors = new Uint8Array(visibleCount * 4);
        let writeIndex = 0;

        for (let i = 0; i < this.count; i++) {
            if (this.visibilityMask[i]) {
                const offset = i * DotDataBuffer.FIELDS_PER_DOT;
                colors[writeIndex * 4] = this.data[offset + 4];
                colors[writeIndex * 4 + 1] = this.data[offset + 5];
                colors[writeIndex * 4 + 2] = this.data[offset + 6];
                colors[writeIndex * 4 + 3] = 255;
                writeIndex++;
            }
        }

        return colors;
    }

    // Get sizes for only visible dots
    getVisibleSizes(): Float32Array {
        let visibleCount = 0;
        for (let i = 0; i < this.count; i++) {
            if (this.visibilityMask[i]) visibleCount++;
        }

        const sizes = new Float32Array(visibleCount);
        let writeIndex = 0;

        for (let i = 0; i < this.count; i++) {
            if (this.visibilityMask[i]) {
                const offset = i * DotDataBuffer.FIELDS_PER_DOT;
                sizes[writeIndex] = this.data[offset + 7];
                writeIndex++;
            }
        }

        return sizes;
    }
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
    enableAdaptivePerformance: boolean; // Auto-disable features at high counts
    highPerformanceThreshold: number; // Dot count threshold for high perf mode
}

interface ViewportBounds {
    minLng: number;
    maxLng: number;
    minLat: number;
    maxLat: number;
}

interface PerformanceTestState {
    // Legacy array-based dots (kept for compatibility)
    dots: MovingDot[];
    visibleDots: MovingDot[]; // Cached viewport-culled dots

    // High-performance binary data
    dotBuffer: DotDataBuffer | null;
    useHighPerformanceMode: boolean;

    isRunning: boolean;
    config: TestConfig;
    bounds: ViewportBounds;
    lastViewportBounds: ViewportBounds | null;

    // Performance metrics
    totalDots: number;
    visibleDotsCount: number;
    cullingEnabled: boolean;
    updateTime: number; // Time taken for last update (ms)

    // Binary data accessors for Deck.gl
    positions: Float32Array | null;
    colors: Uint8Array | null;
    sizes: Float32Array | null;

    // Actions
    startTest: () => void;
    stopTest: () => void;
    updateDots: () => void;
    generateDots: (count: number) => void;
    updateConfig: (config: Partial<TestConfig>) => void;
    setBounds: (bounds: ViewportBounds) => void;
    updateViewportCulling: (viewportBounds: ViewportBounds) => void;
    getBinaryData: () => {
        positions: Float32Array;
        colors: Uint8Array;
        sizes: Float32Array;
    };
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
    enableAdaptivePerformance: true,
    highPerformanceThreshold: 10000, // Switch to high perf mode above 10k dots
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

// High-performance dot generation directly to buffer
const generateDotsToBuffer = (
    count: number,
    bounds: typeof DEFAULT_BOUNDS,
    config: TestConfig,
    buffer: DotDataBuffer,
): void => {
    buffer.count = count;

    for (let i = 0; i < count; i++) {
        const dot = generateRandomDot(bounds, config);
        buffer.setDot(i, dot);
    }
};

export const usePerformanceTestStore = create<PerformanceTestState>(
    (set, get) => ({
        // Legacy array-based data
        dots: [],
        visibleDots: [],

        // High-performance binary data
        dotBuffer: null,
        useHighPerformanceMode: false,

        isRunning: false,
        config: DEFAULT_CONFIG,
        bounds: DEFAULT_BOUNDS,
        lastViewportBounds: null,
        totalDots: 0,
        visibleDotsCount: 0,
        cullingEnabled: true,
        updateTime: 0,

        // Binary data accessors
        positions: null,
        colors: null,
        sizes: null,

        startTest: () => {
            const { config } = get();
            const useHighPerf =
                config.enableAdaptivePerformance &&
                config.dotCount >= config.highPerformanceThreshold;

            set({
                isRunning: true,
                useHighPerformanceMode: useHighPerf,
                dotBuffer: useHighPerf
                    ? new DotDataBuffer(
                          config.dotCount,
                          config.enableTrails ? config.trailLength : 1,
                      )
                    : null,
            });

            // Generate dots using appropriate method
            if (useHighPerf) {
                const { dotBuffer, bounds, config: currentConfig } = get();
                if (dotBuffer) {
                    generateDotsToBuffer(
                        currentConfig.dotCount,
                        bounds,
                        currentConfig,
                        dotBuffer,
                    );
                    set({
                        totalDots: dotBuffer.count,
                        visibleDotsCount: dotBuffer.count,
                    });
                }
            } else {
                // Use legacy method for smaller dot counts
                const { generateDots } = get();
                generateDots(config.dotCount);
            }
        },

        stopTest: () => {
            set({
                isRunning: false,
                dots: [],
                visibleDots: [],
                dotBuffer: null,
                useHighPerformanceMode: false,
                totalDots: 0,
                visibleDotsCount: 0,
                lastViewportBounds: null,
                positions: null,
                colors: null,
                sizes: null,
                updateTime: 0,
            });
        },

        updateDots: () => {
            const startTime = performance.now();
            const {
                useHighPerformanceMode,
                dotBuffer,
                dots,
                bounds,
                config,
                lastViewportBounds,
            } = get();

            if (useHighPerformanceMode && dotBuffer) {
                // High-performance update using binary data
                for (let i = 0; i < dotBuffer.count; i++) {
                    dotBuffer.updateDotPosition(i, bounds, config.maxSpeed);
                }

                // Update viewport culling if enabled
                let newVisibleDotsCount = dotBuffer.count;
                if (config.enableViewportCulling && lastViewportBounds) {
                    newVisibleDotsCount = dotBuffer.updateVisibilityMask(
                        lastViewportBounds,
                        config.cullingBuffer,
                    );
                }

                const endTime = performance.now();
                set({
                    totalDots: dotBuffer.count,
                    visibleDotsCount: newVisibleDotsCount,
                    updateTime: endTime - startTime,
                });
            } else {
                // Legacy update for smaller dot counts
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

                const endTime = performance.now();
                set({
                    dots: updatedDots,
                    totalDots: updatedDots.length,
                    visibleDots: newVisibleDots,
                    visibleDotsCount: newVisibleDotsCount,
                    updateTime: endTime - startTime,
                });
            }
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
            const {
                useHighPerformanceMode,
                dotBuffer,
                dots,
                lastViewportBounds,
                config,
            } = get();

            if (useHighPerformanceMode && dotBuffer) {
                // High-performance culling using binary data
                const visibleCount = dotBuffer.updateVisibilityMask(
                    viewportBounds,
                    config.cullingBuffer,
                );
                set({
                    visibleDotsCount: visibleCount,
                    lastViewportBounds: viewportBounds,
                });
            } else {
                // Legacy culling
                const { visibleDots, shouldUpdate } = updateViewportCulling(
                    dots,
                    viewportBounds,
                    lastViewportBounds,
                    config,
                    false,
                );

                if (shouldUpdate) {
                    set({
                        visibleDots,
                        visibleDotsCount: visibleDots.length,
                        lastViewportBounds: viewportBounds,
                    });
                }
            }
        },

        getBinaryData: () => {
            const { useHighPerformanceMode, dotBuffer, config } = get();

            if (useHighPerformanceMode && dotBuffer) {
                if (config.enableViewportCulling) {
                    return {
                        positions: dotBuffer.getVisiblePositions(),
                        colors: dotBuffer.getVisibleColors(),
                        sizes: dotBuffer.getVisibleSizes(),
                    };
                } else {
                    return {
                        positions: dotBuffer.getPositions(),
                        colors: dotBuffer.getColors(),
                        sizes: dotBuffer.getSizes(),
                    };
                }
            } else {
                // Return empty arrays for non-high-performance mode
                return {
                    positions: new Float32Array(0),
                    colors: new Uint8Array(0),
                    sizes: new Float32Array(0),
                };
            }
        },
    }),
);
