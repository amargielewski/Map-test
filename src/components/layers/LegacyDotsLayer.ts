import { ScatterplotLayer } from 'deck.gl';

interface LegacyDotsLayerProps {
    renderDots: any[];
    isRunning: boolean;
}

/**
 * Creates a legacy dots layer for smaller datasets
 * Uses traditional array-based data structure
 */
export function createLegacyDotsLayer({
    renderDots,
    isRunning,
}: LegacyDotsLayerProps): ScatterplotLayer {
    return new ScatterplotLayer({
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
    });
}
