import { IconLayer } from 'deck.gl';
import { createIconAtlasCanvas, ICON_CONFIGS } from '../../utils/iconUtils';

interface HighPerformanceIconLayerProps {
    binaryData: {
        positions: Float32Array | number[];
        colors: Uint8Array | number[];
        sizes: Float32Array | number[];
    };
    isRunning: boolean;
    updateInterval: number;
}

/**
 * Creates a high-performance icon layer using binary data
 * Optimized for large datasets with minimal overhead
 */
export async function createHighPerformanceIconLayer({
    binaryData,
    isRunning,
    updateInterval,
}: HighPerformanceIconLayerProps): Promise<IconLayer> {
    if (binaryData.positions.length === 0) {
        throw new Error(
            'No binary data available for high-performance icon layer',
        );
    }

    // Create icon atlas from your custom SVG
    const iconAtlas = await createIconAtlasCanvas('/test-icon.svg', 32, 32);

    // Convert binary data to format expected by IconLayer
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
            icon: 'test-icon', // Use your custom icon
        };
    }

    return new IconLayer({
        id: 'performance-test-icons-binary',
        data: data,
        pickable: false, // Disable picking for better performance
        opacity: 0.8,
        // Use your custom icon atlas
        iconAtlas: iconAtlas,
        iconMapping: {
            'test-icon': {
                x: 0,
                y: 0,
                width: 32,
                height: 32,
                mask: false, // Set to false for colored SVG
            },
        },
        getIcon: (d: any) => d.icon,
        getPosition: (d: any) => d.position,
        getSize: (d: any) => d.size * 5, // Scale up for visibility
        getColor: (d: any) => [255, 255, 255, 255], // White color since SVG has its own colors
        sizeScale: 1,
        sizeMinPixels: 32,
        sizeMaxPixels: 32,
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
