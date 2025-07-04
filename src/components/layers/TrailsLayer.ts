import { PathLayer } from 'deck.gl';

interface TrailsLayerProps {
    renderDots: any[];
    isRunning: boolean;
}

/**
 * Creates a trails layer for showing dot movement paths
 * Optimized for performance with simplified update triggers
 */
export function createTrailsLayer({
    renderDots,
    isRunning,
}: TrailsLayerProps): PathLayer | null {
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

    if (trailData.length === 0) return null;

    return new PathLayer({
        id: 'performance-test-trails',
        data: trailData,
        pickable: true, // Enable picking for tooltips
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
    });
}
