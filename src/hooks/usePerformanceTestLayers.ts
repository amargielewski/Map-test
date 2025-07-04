import { useMemo } from 'react';
import { Layer } from 'deck.gl';
import { createHighPerformanceDotsLayer } from '../components/layers/HighPerformanceDotsLayer';
import { createTrailsLayer } from '../components/layers/TrailsLayer';
import { createLegacyDotsLayer } from '../components/layers/LegacyDotsLayer';

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

            // Create high-performance dots layer
            try {
                const highPerfLayer = createHighPerformanceDotsLayer({
                    binaryData,
                    isRunning,
                    updateInterval: config.updateInterval,
                });
                layers.push(highPerfLayer);
            } catch (error) {
                console.warn('Failed to create high-performance layer:', error);
                return [];
            }
        } else {
            // Legacy mode for smaller datasets
            const renderDots = config.enableViewportCulling
                ? visibleDots
                : dots;

            if (renderDots.length === 0) return [];

            // Trails layer (if enabled)
            if (config.enableTrails) {
                const trailsLayer = createTrailsLayer({
                    renderDots,
                    isRunning,
                });

                if (trailsLayer) {
                    layers.push(trailsLayer);
                }
            }

            // Legacy dots layer
            const legacyLayer = createLegacyDotsLayer({
                renderDots,
                isRunning,
            });
            layers.push(legacyLayer);
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
