import { TextLayer } from 'deck.gl';

interface HighPerformanceTextLayerProps {
    binaryData: {
        positions: Float32Array | number[];
        colors: Uint8Array | number[];
        sizes: Float32Array | number[];
    };
    isRunning: boolean;
    updateInterval: number;
}

/**
 * Creates a high-performance text layer using binary data
 * Optimized for large datasets with minimal overhead
 */
export function createHighPerformanceTextLayer({
    binaryData,
    isRunning,
    updateInterval,
}: HighPerformanceTextLayerProps): TextLayer {
    if (binaryData.positions.length === 0) {
        throw new Error(
            'No binary data available for high-performance text layer',
        );
    }

    // Convert binary data to format expected by TextLayer
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
            text: (i + 1).toString(), // Simple text content
        };
    }

    return new TextLayer({
        id: 'performance-test-text-binary',
        data: data,
        pickable: false, // Disable picking for better performance
        opacity: 0.8,
        getText: (d: any) => d.text,
        getPosition: (d: any) => d.position,
        getSize: (d: any) => Math.max(8, d.size * 2), // Scale up for visibility
        getColor: (d: any) => d.color,
        getAngle: 0,
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'center',
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        sizeScale: 1,
        sizeMinPixels: 8,
        sizeMaxPixels: 24,
        // Minimal updateTriggers for high performance
        updateTriggers: {
            getPosition: isRunning
                ? Math.floor(Date.now() / (updateInterval * 2))
                : 0,
            getText: 0, // Static text, no need to update
        },
        // Performance optimizations
        extensions: [],
    });
}
