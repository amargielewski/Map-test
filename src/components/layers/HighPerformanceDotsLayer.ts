import { ScatterplotLayer } from 'deck.gl';

interface HighPerformanceDotsLayerProps {
    binaryData: {
        positions: Float32Array | number[];
        colors: Uint8Array | number[];
        sizes: Float32Array | number[];
    };
    isRunning: boolean;
    updateInterval: number;
}

/**
 * Creates a high-performance dots layer using binary data
 * Optimized for large datasets with minimal overhead
 */
export function createHighPerformanceDotsLayer({
    binaryData,
    isRunning,
    updateInterval,
}: HighPerformanceDotsLayerProps): ScatterplotLayer {
    if (binaryData.positions.length === 0) {
        throw new Error('No binary data available for high-performance layer');
    }

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

    return new ScatterplotLayer({
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
                ? Math.floor(Date.now() / (updateInterval * 2))
                : 0,
        },
        // Performance optimizations
        extensions: [],
    });
}
