import React from 'react';
import { MapViewState } from 'deck.gl';
import { CURRENT_MAP_STYLE } from '../constants/mapConstants';

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

export function DebugToolbar({
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
