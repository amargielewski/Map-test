import { useMemo, useState, useEffect } from 'react';
import { Layer } from 'deck.gl';
import { createHighPerformanceDotsLayer } from '../components/layers/HighPerformanceDotsLayer';
import { createHighPerformanceIconLayer } from '../components/layers/HighPerformanceIconLayer';
import { createHighPerformanceTextLayer } from '../components/layers/HighPerformanceTextLayer';
import { createTrailsLayer } from '../components/layers/TrailsLayer';

export type LayerType = 'dots' | 'icons' | 'text';

interface PerformanceTestConfig {
    enableTrails: boolean;
    enableViewportCulling: boolean;
    updateInterval: number;
    layerType: LayerType;
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
    const [iconLayer, setIconLayer] = useState<Layer | null>(null);

    // Handle async icon layer creation
    useEffect(() => {
        if (
            config.layerType === 'icons' &&
            isRunning &&
            useHighPerformanceMode
        ) {
            const binaryData = getBinaryData();
            if (binaryData.positions.length > 0) {
                createHighPerformanceIconLayer({
                    binaryData,
                    isRunning,
                    updateInterval: config.updateInterval,
                })
                    .then(layer => {
                        setIconLayer(layer);
                    })
                    .catch(error => {
                        console.warn('Failed to create icon layer:', error);
                        setIconLayer(null);
                    });
            }
        } else {
            setIconLayer(null);
        }
    }, [
        config.layerType,
        isRunning,
        useHighPerformanceMode,
        config.updateInterval,
        getBinaryData,
    ]);

    return useMemo((): Layer[] => {
        if (!isRunning) return [];

        const layers: Layer[] = [];

        if (useHighPerformanceMode) {
            // High-performance mode using binary data
            const binaryData = getBinaryData();

            if (binaryData.positions.length === 0) return [];

            // Create high-performance layer based on selected type
            try {
                let highPerfLayer: Layer | null = null;

                switch (config.layerType) {
                    case 'icons':
                        // Use the async-loaded icon layer
                        if (iconLayer) {
                            highPerfLayer = iconLayer;
                        }
                        break;
                    case 'text':
                        highPerfLayer = createHighPerformanceTextLayer({
                            binaryData,
                            isRunning,
                            updateInterval: config.updateInterval,
                        });
                        break;
                    case 'dots':
                    default:
                        highPerfLayer = createHighPerformanceDotsLayer({
                            binaryData,
                            isRunning,
                            updateInterval: config.updateInterval,
                        });
                        break;
                }

                if (highPerfLayer) {
                    layers.push(highPerfLayer);
                }
            } catch (error) {
                console.warn('Failed to create high-performance layer:', error);
                return [];
            }
        }

        return layers;
    }, [
        isRunning,
        useHighPerformanceMode,
        config.enableTrails,
        config.enableViewportCulling,
        config.updateInterval,
        config.layerType, // Add layer type to dependencies
        visibleDots.length, // Use length instead of full array
        dots.length, // Use length instead of full array
        getBinaryData, // Include binary data function
        iconLayer, // Include the async icon layer
        // Add a dependency that changes on animation frames when running
        isRunning ? Math.floor(Date.now() / (config.updateInterval * 5)) : 0, // Update every 5 frames
    ]);
}
