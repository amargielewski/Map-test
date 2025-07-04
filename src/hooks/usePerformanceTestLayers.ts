import { useMemo } from 'react';
import { Layer } from 'deck.gl';
import { ScatterplotLayer, PathLayer } from 'deck.gl';

interface PerformanceTestConfig {
    enableTrails: boolean;
    enableViewportCulling: boolean;
    updateInterval: number;
}

interface UsePerformanceTestLayersProps {
    isRunning: boolean;
    useHighPerformanceMode: boolean;
    config: PerformanceTestConfig;
    visibleDots: any[];
    dots: any[];
    getBinaryData: () => {
        positions: Float32Array | number[];
        colors: Uint8Array | number[];
        sizes: Float32Array | number[];
    };
}

export function usePerformanceTestLayers({
    isRunning,
    useHighPerformanceMode,
    config,
    visibleDots,
    dots,
    getBinaryData,
}: UsePerformanceTestLayersProps): Layer[] {
    return useMemo((): Layer[] => {
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
}
