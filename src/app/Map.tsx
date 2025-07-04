'use client';
import React, {
    useState,
    useEffect,
    useRef,
    useMemo,
    useCallback,
} from 'react';
import { DeckGL } from '@deck.gl/react';
import { ZoomWidget } from '@deck.gl/react';
import { Map } from 'react-map-gl/mapbox';
import { Layer, MapViewState } from 'deck.gl';
import { ScatterplotLayer, PathLayer } from 'deck.gl';
import { useBoolean } from '../hooks/useBoolean';
import { usePerformanceTestStore } from '../stores/performanceTestStore';

// Test configuration constants
const TEST_CONFIG = {
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

const INITIAL_VIEW_STATE: MapViewState = {
    longitude: 0, // Center on prime meridian
    latitude: 20, // Slightly north to show more land
    zoom: 2, // Global view
    maxZoom: 20,
    minZoom: 1,
};

// Map styles configuration
const MAP_STYLES = {
    satellite: 'mapbox://styles/mapbox/satellite-v9',
    streets: 'mapbox://styles/mapbox/streets-v11',
    light: 'mapbox://styles/mapbox/light-v9',
    dark: 'mapbox://styles/mapbox/dark-v10',
    outdoors: 'mapbox://styles/mapbox/outdoors-v11',
    navigationDay: 'mapbox://styles/mapbox/navigation-day-v1',
    navigationNight: 'mapbox://styles/mapbox/navigation-night-v1',
} as const;

type MapStyleKey = keyof typeof MAP_STYLES;

// Function to get map style by key
const getMapStyle = (styleKey: MapStyleKey): string => {
    return MAP_STYLES[styleKey];
};

// Current map style - change this to switch styles easily
const CURRENT_MAP_STYLE: MapStyleKey = 'satellite';

// Debug toolbar component
interface DebugToolbarProps {
    viewState: MapViewState;
    isVisible: boolean;
    onToggle: () => void;
    fps: number;
    frameTime: number;
    totalDots: number;
    visibleDots: number;
    cullingEnabled: boolean;
    useHighPerformanceMode: boolean;
    updateTime: number;
}

function DebugToolbar({
    viewState,
    isVisible,
    onToggle,
    fps,
    frameTime,
    totalDots,
    visibleDots,
    cullingEnabled,
    useHighPerformanceMode,
    updateTime,
}: DebugToolbarProps) {
    const { longitude, latitude, zoom, bearing = 0, pitch = 0 } = viewState;

    // Calculate viewport bounds
    const latRange = 180 / Math.pow(2, zoom);
    const lngRange = 360 / Math.pow(2, zoom);

    const bounds = {
        north: latitude + latRange / 2,
        south: latitude - latRange / 2,
        east: longitude + lngRange / 2,
        west: longitude - lngRange / 2,
    };

    return (
        <>
            {/* Toggle button */}
            <button
                onClick={onToggle}
                className="absolute top-4 right-4 z-10 bg-black bg-opacity-70 text-white px-3 py-2 rounded-md text-sm font-mono hover:bg-opacity-90 transition-all"
            >
                {isVisible ? 'Hide Debug' : 'Show Debug'}
            </button>

            {/* Debug panel */}
            {isVisible && (
                <div className="absolute top-4 left-4 z-10 bg-black bg-opacity-90 text-white p-4 rounded-lg font-mono text-sm max-w-md">
                    <h3 className="text-lg font-bold mb-3 text-green-400">
                        Map Debug Info
                    </h3>

                    {/* Performance metrics */}
                    <div className="mb-4">
                        <h4 className="text-yellow-400 font-semibold mb-2">
                            Performance
                        </h4>
                        <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                                <span>FPS:</span>
                                <span
                                    className={
                                        fps < 30
                                            ? 'text-red-400'
                                            : fps < 50
                                            ? 'text-yellow-400'
                                            : 'text-green-400'
                                    }
                                >
                                    {fps.toFixed(1)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Frame Time:</span>
                                <span
                                    className={
                                        frameTime > 33
                                            ? 'text-red-400'
                                            : frameTime > 20
                                            ? 'text-yellow-400'
                                            : 'text-green-400'
                                    }
                                >
                                    {frameTime.toFixed(2)}ms
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Active Dots:</span>
                                <span className="text-cyan-400">
                                    {totalDots.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Visible Dots:</span>
                                <span className="text-cyan-400">
                                    {visibleDots.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Culling:</span>
                                <span
                                    className={
                                        cullingEnabled
                                            ? 'text-green-400'
                                            : 'text-red-400'
                                    }
                                >
                                    {cullingEnabled ? 'ON' : 'OFF'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Mode:</span>
                                <span
                                    className={
                                        useHighPerformanceMode
                                            ? 'text-green-400'
                                            : 'text-blue-400'
                                    }
                                >
                                    {useHighPerformanceMode
                                        ? 'HIGH-PERF'
                                        : 'LEGACY'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Update Time:</span>
                                <span
                                    className={
                                        updateTime > 16
                                            ? 'text-red-400'
                                            : updateTime > 8
                                            ? 'text-yellow-400'
                                            : 'text-green-400'
                                    }
                                >
                                    {updateTime.toFixed(2)}ms
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Position info */}
                    <div className="mb-4">
                        <h4 className="text-yellow-400 font-semibold mb-2">
                            Current Position
                        </h4>
                        <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                                <span>Longitude:</span>
                                <span className="text-blue-400">
                                    {longitude.toFixed(6)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Latitude:</span>
                                <span className="text-blue-400">
                                    {latitude.toFixed(6)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Zoom:</span>
                                <span className="text-blue-400">
                                    {zoom.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Bearing:</span>
                                <span className="text-blue-400">
                                    {bearing.toFixed(2)}°
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Pitch:</span>
                                <span className="text-blue-400">
                                    {pitch.toFixed(2)}°
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Viewport bounds */}
                    <div className="mb-4">
                        <h4 className="text-yellow-400 font-semibold mb-2">
                            Viewport Bounds
                        </h4>
                        <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                                <span>North:</span>
                                <span className="text-purple-400">
                                    {bounds.north.toFixed(6)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>South:</span>
                                <span className="text-purple-400">
                                    {bounds.south.toFixed(6)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>East:</span>
                                <span className="text-purple-400">
                                    {bounds.east.toFixed(6)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>West:</span>
                                <span className="text-purple-400">
                                    {bounds.west.toFixed(6)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Map info */}
                    <div>
                        <h4 className="text-yellow-400 font-semibold mb-2">
                            Map Info
                        </h4>
                        <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                                <span>Style:</span>
                                <span className="text-orange-400">
                                    {CURRENT_MAP_STYLE}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Layers:</span>
                                <span className="text-orange-400">
                                    {totalDots > 0 ? 2 : 0}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// Performance Test Control Panel
interface PerformanceTestControlsProps {
    isVisible: boolean;
    onToggle: () => void;
}

function PerformanceTestControls({
    isVisible,
    onToggle,
}: PerformanceTestControlsProps) {
    const { isRunning, config, dots, startTest, stopTest, updateConfig } =
        usePerformanceTestStore();

    const handleDotCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const count = parseInt(e.target.value);
        updateConfig({ dotCount: count });
    };

    const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const speed = parseFloat(e.target.value);
        updateConfig({ maxSpeed: speed });
    };

    const handleTrailToggle = () => {
        updateConfig({ enableTrails: !config.enableTrails });
    };

    const handleCullingToggle = () => {
        updateConfig({ enableViewportCulling: !config.enableViewportCulling });
    };

    return (
        <>
            {/* Toggle button */}
            <button
                onClick={onToggle}
                className="absolute bottom-4 right-4 z-10 bg-blue-600 bg-opacity-70 text-white px-3 py-2 rounded-md text-sm font-mono hover:bg-opacity-90 transition-all"
            >
                {isVisible ? 'Hide Test' : 'Show Test'}
            </button>

            {/* Control panel */}
            {isVisible && (
                <div className="absolute bottom-4 left-4 z-10 bg-blue-900 bg-opacity-90 text-white p-4 rounded-lg font-mono text-sm max-w-md">
                    <h3 className="text-lg font-bold mb-3 text-blue-400">
                        Performance Test
                    </h3>

                    {/* Test controls */}
                    <div className="mb-4">
                        <div className="flex gap-2 mb-3">
                            <button
                                onClick={startTest}
                                disabled={isRunning}
                                className={`px-3 py-1 rounded text-xs font-semibold ${
                                    isRunning
                                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                        : 'bg-green-600 hover:bg-green-700 text-white'
                                }`}
                            >
                                Start Test
                            </button>
                            <button
                                onClick={stopTest}
                                disabled={!isRunning}
                                className={`px-3 py-1 rounded text-xs font-semibold ${
                                    !isRunning
                                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                        : 'bg-red-600 hover:bg-red-700 text-white'
                                }`}
                            >
                                Stop Test
                            </button>
                        </div>

                        <div className="space-y-2 text-xs">
                            <div>
                                <label className="block text-yellow-400 mb-1">
                                    Dot Count:{' '}
                                    {config.dotCount.toLocaleString()}
                                </label>
                                <input
                                    type="range"
                                    min={TEST_CONFIG.DOT_COUNT.MIN}
                                    max={TEST_CONFIG.DOT_COUNT.MAX}
                                    step={TEST_CONFIG.DOT_COUNT.STEP}
                                    value={config.dotCount}
                                    onChange={handleDotCountChange}
                                    disabled={isRunning}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-gray-400 mt-1">
                                    <span>
                                        {TEST_CONFIG.DOT_COUNT.MIN.toLocaleString()}
                                    </span>
                                    <span>
                                        {TEST_CONFIG.DOT_COUNT.MAX.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-yellow-400 mb-1">
                                    Speed:{' '}
                                    {(config.maxSpeed * 10000).toFixed(1)}
                                </label>
                                <input
                                    type="range"
                                    min={TEST_CONFIG.SPEED.MIN}
                                    max={TEST_CONFIG.SPEED.MAX}
                                    step={TEST_CONFIG.SPEED.STEP}
                                    value={config.maxSpeed}
                                    onChange={handleSpeedChange}
                                    disabled={isRunning}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-gray-400 mt-1">
                                    <span>
                                        {(
                                            TEST_CONFIG.SPEED.MIN * 10000
                                        ).toFixed(1)}
                                    </span>
                                    <span>
                                        {(
                                            TEST_CONFIG.SPEED.MAX * 10000
                                        ).toFixed(1)}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-yellow-400">
                                    <input
                                        type="checkbox"
                                        checked={config.enableTrails}
                                        onChange={handleTrailToggle}
                                        disabled={isRunning}
                                    />
                                    Enable Trails
                                </label>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-yellow-400">
                                    <input
                                        type="checkbox"
                                        checked={config.enableViewportCulling}
                                        onChange={handleCullingToggle}
                                        disabled={isRunning}
                                    />
                                    Enable Viewport Culling
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Test status */}
                    <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                            <span>Status:</span>
                            <span
                                className={
                                    isRunning
                                        ? 'text-green-400'
                                        : 'text-red-400'
                                }
                            >
                                {isRunning ? 'Running' : 'Stopped'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>Active Dots:</span>
                            <span className="text-cyan-400">
                                {dots.length.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export function MapComponent() {
    const [viewState, setViewState] =
        useState<MapViewState>(INITIAL_VIEW_STATE);
    const { value: showFlights, toggle: toggleShowFlights } = useBoolean(true);
    const { value: showDebug, toggle: toggleDebug } = useBoolean(true);
    const { value: showTestControls, toggle: toggleTestControls } =
        useBoolean(true);

    // Performance test store
    const {
        dots,
        visibleDots,
        isRunning,
        config,
        totalDots,
        visibleDotsCount,
        cullingEnabled,
        useHighPerformanceMode,
        updateTime,
        updateDots,
        setBounds,
        updateViewportCulling,
        getBinaryData,
    } = usePerformanceTestStore();

    // Performance monitoring
    const frameRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(performance.now());
    const fpsRef = useRef<number[]>([]);
    const [fps, setFps] = useState<number>(0);
    const [frameTime, setFrameTime] = useState<number>(0);

    // Update viewport culling when view changes
    useEffect(() => {
        if (isRunning && config.enableViewportCulling) {
            // Calculate proper viewport bounds using Web Mercator projection
            // This accounts for the actual screen dimensions and aspect ratio

            // Get the container element to calculate screen dimensions
            const mapContainer = document.querySelector(
                '.w-full.h-full.relative',
            );
            const containerWidth =
                mapContainer?.clientWidth || window.innerWidth;
            const containerHeight =
                mapContainer?.clientHeight || window.innerHeight;

            // Calculate the map extent in degrees at the current zoom level
            // Web Mercator: 360 degrees spans the entire world at zoom 0
            const scale = Math.pow(2, viewState.zoom);
            const worldWidth = 360; // degrees longitude
            const worldHeight = 180; // degrees latitude (but adjusted for Mercator)

            // Calculate viewport size in degrees
            const degreesPerPixelX = worldWidth / (256 * scale);
            const degreesPerPixelY = worldHeight / (256 * scale);

            // Calculate the actual viewport bounds based on screen size
            const halfScreenWidth = (containerWidth / 2) * degreesPerPixelX;
            const halfScreenHeight = (containerHeight / 2) * degreesPerPixelY;

            // Apply Mercator projection correction for latitude
            const centerLatRad = (viewState.latitude * Math.PI) / 180;
            const latitudeCorrection = Math.cos(centerLatRad);
            const adjustedHalfScreenHeight =
                halfScreenHeight / latitudeCorrection;

            const viewportBounds = {
                minLng: viewState.longitude - halfScreenWidth,
                maxLng: viewState.longitude + halfScreenWidth,
                minLat: Math.max(
                    -85,
                    viewState.latitude - adjustedHalfScreenHeight,
                ),
                maxLat: Math.min(
                    85,
                    viewState.latitude + adjustedHalfScreenHeight,
                ),
            };

            updateViewportCulling(viewportBounds);
        }
    }, [
        viewState.longitude,
        viewState.latitude,
        viewState.zoom,
        isRunning,
        config.enableViewportCulling,
        updateViewportCulling,
    ]);

    // Set global bounds for dot generation (once on mount)
    useEffect(() => {
        setBounds({
            minLng: TEST_CONFIG.GLOBE_BOUNDS.MIN_LNG,
            maxLng: TEST_CONFIG.GLOBE_BOUNDS.MAX_LNG,
            minLat: TEST_CONFIG.GLOBE_BOUNDS.MIN_LAT,
            maxLat: TEST_CONFIG.GLOBE_BOUNDS.MAX_LAT,
        });
    }, [setBounds]);

    // Performance test animation loop
    useEffect(() => {
        if (!isRunning) return;

        const interval = setInterval(() => {
            updateDots();
        }, config.updateInterval);

        return () => clearInterval(interval);
    }, [isRunning, config.updateInterval, updateDots]);

    // Performance monitoring effect
    useEffect(() => {
        let animationId: number;

        const updatePerformance = () => {
            const now = performance.now();
            const delta = now - lastTimeRef.current;

            // Calculate FPS
            fpsRef.current.push(1000 / delta);
            if (fpsRef.current.length > 60) {
                fpsRef.current.shift();
            }

            // Update metrics every 10 frames
            if (frameRef.current % 10 === 0) {
                const avgFps =
                    fpsRef.current.reduce((a, b) => a + b, 0) /
                    fpsRef.current.length;
                setFps(avgFps);
                setFrameTime(delta);
            }

            frameRef.current++;
            lastTimeRef.current = now;
            animationId = requestAnimationFrame(updatePerformance);
        };

        animationId = requestAnimationFrame(updatePerformance);

        return () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        };
    }, []);

    const handleViewStateChange = (e: any) => {
        setViewState(e.viewState as MapViewState);
    };

    // Create performance test layers with optimization and memoization
    const performanceTestLayers = useMemo((): Layer[] => {
        if (!isRunning) return [];

        const layers: Layer[] = [];

        if (useHighPerformanceMode) {
            // High-performance mode using binary data
            const binaryData = getBinaryData();

            if (binaryData.positions.length === 0) return [];

            // Convert binary data to format expected by ScatterplotLayer
            const numPoints = binaryData.positions.length / 3;
            const data = new Array(numPoints);

            for (let i = 0; i < numPoints; i++) {
                data[i] = {
                    position: [
                        binaryData.positions[i * 3],
                        binaryData.positions[i * 3 + 1],
                        binaryData.positions[i * 3 + 2],
                    ],
                    color: [
                        binaryData.colors[i * 4],
                        binaryData.colors[i * 4 + 1],
                        binaryData.colors[i * 4 + 2],
                        binaryData.colors[i * 4 + 3],
                    ],
                    size: binaryData.sizes[i],
                };
            }

            // High-performance dots layer - optimized for large datasets
            layers.push(
                new ScatterplotLayer({
                    id: 'performance-test-dots-binary',
                    data: data,
                    pickable: false, // Disable picking for better performance
                    opacity: 0.8,
                    stroked: false, // Disable stroke for better performance
                    filled: true,
                    radiusScale: 1,
                    radiusMinPixels: 1,
                    radiusMaxPixels: 10,
                    getPosition: (d: any) => d.position,
                    getRadius: (d: any) => d.size,
                    getFillColor: (d: any) => d.color,
                    // Minimal updateTriggers for high performance
                    updateTriggers: {
                        getPosition: isRunning
                            ? Math.floor(
                                  Date.now() / (config.updateInterval * 2),
                              )
                            : 0,
                    },
                    // Performance optimizations
                    extensions: [],
                }),
            );
        } else {
            // Legacy mode for smaller datasets
            const renderDots = config.enableViewportCulling
                ? visibleDots
                : dots;

            if (renderDots.length === 0) return [];

            // Trails layer (if enabled) - optimized with constant values where possible
            if (config.enableTrails) {
                const trailData = renderDots.flatMap(dot =>
                    dot.trail.length > 1
                        ? [
                              {
                                  path: dot.trail,
                                  color: [...dot.color, 100], // Semi-transparent
                              },
                          ]
                        : [],
                );

                if (trailData.length > 0) {
                    layers.push(
                        new PathLayer({
                            id: 'performance-test-trails',
                            data: trailData,
                            pickable: false, // Disable picking for better performance
                            getPath: (d: any) => d.path,
                            getColor: (d: any) => d.color,
                            getWidth: 1, // Use constant instead of accessor
                            widthMinPixels: 1,
                            widthMaxPixels: 2,
                            // Use simplified updateTriggers for optimal performance
                            updateTriggers: {
                                getPath: renderDots.length, // Simple trigger based on count
                                getColor: renderDots.length,
                            },
                        }),
                    );
                }
            }

            // Dots layer - heavily optimized following deck.gl best practices
            layers.push(
                new ScatterplotLayer({
                    id: 'performance-test-dots',
                    data: renderDots,
                    pickable: false, // Disable picking for better performance
                    opacity: 0.8,
                    stroked: false, // Disable stroke for better performance
                    filled: true,
                    radiusScale: 1,
                    radiusMinPixels: 1,
                    radiusMaxPixels: 10,
                    getPosition: (d: any) => d.position,
                    getRadius: (d: any) => d.size,
                    getFillColor: (d: any) => d.color,
                    // Optimized updateTriggers - use simplified triggers
                    updateTriggers: {
                        getPosition: isRunning ? performance.now() : 0, // Use timestamp for animation
                        getRadius: renderDots.length, // Only update when data size changes
                        getFillColor: renderDots.length, // Only update when data size changes
                    },
                    // Performance optimizations
                    extensions: [],
                }),
            );
        }

        return layers;
    }, [
        isRunning,
        useHighPerformanceMode,
        config.enableTrails,
        config.enableViewportCulling,
        config.updateInterval,
        visibleDots.length, // Use length instead of full array
        dots.length, // Use length instead of full array
        getBinaryData, // Include binary data function
        // Add a dependency that changes on animation frames when running
        isRunning ? Math.floor(Date.now() / (config.updateInterval * 5)) : 0, // Update every 5 frames
    ]);

    // Memoize the layers array to prevent unnecessary re-renders
    const layers: Layer[] = useMemo(
        () => performanceTestLayers,
        [performanceTestLayers],
    );

    return (
        <div className="w-full h-full relative">
            <DeckGL
                layers={layers}
                viewState={viewState}
                onViewStateChange={handleViewStateChange}
                controller
            >
                <Map
                    mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_API_TOKEN}
                    mapStyle={getMapStyle(CURRENT_MAP_STYLE)}
                />
                <ZoomWidget />
            </DeckGL>

            <DebugToolbar
                viewState={viewState}
                isVisible={showDebug}
                onToggle={toggleDebug}
                fps={fps}
                frameTime={frameTime}
                totalDots={totalDots}
                visibleDots={visibleDotsCount}
                cullingEnabled={cullingEnabled}
                useHighPerformanceMode={useHighPerformanceMode}
                updateTime={updateTime}
            />

            <PerformanceTestControls
                isVisible={showTestControls}
                onToggle={toggleTestControls}
            />
        </div>
    );
}
