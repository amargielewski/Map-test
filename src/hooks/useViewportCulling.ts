import { useEffect } from 'react';
import { MapViewState } from 'deck.gl';

interface ViewportBounds {
    minLng: number;
    maxLng: number;
    minLat: number;
    maxLat: number;
}

export function useViewportCulling(
    viewState: MapViewState,
    isRunning: boolean,
    enableViewportCulling: boolean,
    updateViewportCulling: (bounds: ViewportBounds) => void,
) {
    useEffect(() => {
        if (isRunning && enableViewportCulling) {
            // Calculate proper viewport bounds using Web Mercator projection
            // This accounts for the actual screen dimensions and aspect ratio

            // Get the container element to calculate screen dimensions
            const mapContainer = document.querySelector(
                '.w-full.h-full.relative',
            );
            const containerWidth =
                mapContainer?.clientWidth || window.innerWidth;
            const containerHeight =
                mapContainer?.clientHeight || window.innerHeight;

            // Calculate the map extent in degrees at the current zoom level
            // Web Mercator: 360 degrees spans the entire world at zoom 0
            const scale = Math.pow(2, viewState.zoom);
            const worldWidth = 360; // degrees longitude
            const worldHeight = 180; // degrees latitude (but adjusted for Mercator)

            // Calculate viewport size in degrees
            const degreesPerPixelX = worldWidth / (256 * scale);
            const degreesPerPixelY = worldHeight / (256 * scale);

            // Calculate the actual viewport bounds based on screen size
            const halfScreenWidth = (containerWidth / 2) * degreesPerPixelX;
            const halfScreenHeight = (containerHeight / 2) * degreesPerPixelY;

            // Apply Mercator projection correction for latitude
            const centerLatRad = (viewState.latitude * Math.PI) / 180;
            const latitudeCorrection = Math.cos(centerLatRad);
            const adjustedHalfScreenHeight =
                halfScreenHeight / latitudeCorrection;

            const viewportBounds = {
                minLng: viewState.longitude - halfScreenWidth,
                maxLng: viewState.longitude + halfScreenWidth,
                minLat: Math.max(
                    -85,
                    viewState.latitude - adjustedHalfScreenHeight,
                ),
                maxLat: Math.min(
                    85,
                    viewState.latitude + adjustedHalfScreenHeight,
                ),
            };

            updateViewportCulling(viewportBounds);
        }
    }, [
        viewState.longitude,
        viewState.latitude,
        viewState.zoom,
        isRunning,
        enableViewportCulling,
        updateViewportCulling,
    ]);
}
