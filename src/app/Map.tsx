'use client';
import React, { useState, useEffect, useRef } from 'react';
import { DeckGL } from '@deck.gl/react';
import { ZoomWidget } from '@deck.gl/react';
import { Map } from 'react-map-gl/mapbox';
import { Layer, MapViewState } from 'deck.gl';
import { ScatterplotLayer, PathLayer } from 'deck.gl';
import { useBoolean } from '../hooks/useBoolean';
import { usePerformanceTestStore } from '../stores/performanceTestStore';

const INITIAL_VIEW_STATE: MapViewState = {
    longitude: -122.41669,
    latitude: 37.7853,
    zoom: 13,
    maxZoom: 20,
    minZoom: 2,
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
    dotCount: number;
}

function DebugToolbar({
    viewState,
    isVisible,
    onToggle,
    fps,
    frameTime,
    dotCount,
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
                                    {dotCount.toLocaleString()}
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
                                    {dotCount > 0 ? 2 : 0}
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
                                    Dot Count: {config.dotCount}
                                </label>
                                <input
                                    type="range"
                                    min="100"
                                    max="5000"
                                    step="100"
                                    value={config.dotCount}
                                    onChange={handleDotCountChange}
                                    disabled={isRunning}
                                    className="w-full"
                                />
                            </div>

                            <div>
                                <label className="block text-yellow-400 mb-1">
                                    Speed:{' '}
                                    {(config.maxSpeed * 10000).toFixed(1)}
                                </label>
                                <input
                                    type="range"
                                    min="0.00001"
                                    max="0.001"
                                    step="0.00001"
                                    value={config.maxSpeed}
                                    onChange={handleSpeedChange}
                                    disabled={isRunning}
                                    className="w-full"
                                />
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

interface MapComponentProps {
    // Remove car-related props - now only flight data
}

export function MapComponent({}: MapComponentProps) {
    const [viewState, setViewState] =
        useState<MapViewState>(INITIAL_VIEW_STATE);
    const { value: showFlights, toggle: toggleShowFlights } = useBoolean(true);
    const { value: showDebug, toggle: toggleDebug } = useBoolean(true);
    const { value: showTestControls, toggle: toggleTestControls } =
        useBoolean(false);

    // Performance test store
    const { dots, isRunning, config, updateDots, setBounds } =
        usePerformanceTestStore();

    // Performance monitoring
    const frameRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(performance.now());
    const fpsRef = useRef<number[]>([]);
    const [fps, setFps] = useState<number>(0);
    const [frameTime, setFrameTime] = useState<number>(0);

    // Update test bounds when view changes
    useEffect(() => {
        const latRange = 0.1; // degrees
        const lngRange = 0.1; // degrees

        setBounds({
            minLng: viewState.longitude - lngRange,
            maxLng: viewState.longitude + lngRange,
            minLat: viewState.latitude - latRange,
            maxLat: viewState.latitude + latRange,
        });
    }, [viewState.longitude, viewState.latitude, setBounds]);

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

    // Create performance test layers
    const createPerformanceTestLayers = (): Layer[] => {
        if (!isRunning || dots.length === 0) return [];

        const layers: Layer[] = [];

        // Trails layer (if enabled)
        if (config.enableTrails) {
            const trailData = dots.flatMap(dot =>
                dot.trail.length > 1
                    ? [
                          {
                              path: dot.trail,
                              color: [...dot.color, 100], // Semi-transparent
                              width: 1,
                          },
                      ]
                    : [],
            );

            if (trailData.length > 0) {
                layers.push(
                    new PathLayer({
                        id: 'performance-test-trails',
                        data: trailData,
                        pickable: false,
                        getPath: (d: any) => d.path,
                        getColor: (d: any) => d.color,
                        getWidth: (d: any) => d.width,
                        widthMinPixels: 1,
                        widthMaxPixels: 2,
                    }),
                );
            }
        }

        // Dots layer
        layers.push(
            new ScatterplotLayer({
                id: 'performance-test-dots',
                data: dots,
                pickable: false,
                opacity: 0.8,
                stroked: true,
                filled: true,
                radiusScale: 1,
                radiusMinPixels: 1,
                radiusMaxPixels: 10,
                lineWidthMinPixels: 1,
                getPosition: (d: any) => d.position,
                getRadius: (d: any) => d.size,
                getFillColor: (d: any) => d.color,
                getLineColor: (d: any) => [255, 255, 255, 100],
                updateTriggers: {
                    getPosition: dots.map(d => d.position).flat(),
                    getRadius: dots.map(d => d.size),
                    getFillColor: dots.map(d => d.color).flat(),
                },
            }),
        );

        return layers;
    };

    const layers: Layer[] = [...createPerformanceTestLayers()];

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
                dotCount={dots.length}
            />

            <PerformanceTestControls
                isVisible={showTestControls}
                onToggle={toggleTestControls}
            />
        </div>
    );
}
