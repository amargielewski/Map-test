'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { DeckGL } from '@deck.gl/react';
import { ZoomWidget } from '@deck.gl/react';
import { Map } from 'react-map-gl/mapbox';
import { MapViewState } from 'deck.gl';
import { useBoolean } from '../hooks/useBoolean';
import { usePerformanceTestStore } from '../stores/performanceTestStore';
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring';
import { useViewportCulling } from '../hooks/useViewportCulling';
import { usePerformanceTestLayers } from '../hooks/usePerformanceTestLayers';
import { DebugToolbar } from '../components/DebugToolbar';
import { PerformanceTestControls } from '../components/PerformanceTestControls';
import {
    INITIAL_VIEW_STATE,
    getMapStyle,
    CURRENT_MAP_STYLE,
    TEST_CONFIG,
} from '../constants/mapConstants';

export function MapComponent() {
    const [viewState, setViewState] =
        useState<MapViewState>(INITIAL_VIEW_STATE);
    const { value: showDebug, toggle: toggleDebug } = useBoolean(true);
    const { value: showTestControls, toggle: toggleTestControls } =
        useBoolean(true);

    // Performance test store
    const {
        dots,
        visibleDots,
        isRunning,
        config,
        totalDots,
        visibleDotsCount,
        cullingEnabled,
        useHighPerformanceMode,
        updateTime,
        updateDots,
        setBounds,
        updateViewportCulling,
        getBinaryData,
    } = usePerformanceTestStore();

    // Performance monitoring hook
    const { fps, frameTime } = usePerformanceMonitoring();

    // Viewport culling hook
    useViewportCulling(
        viewState,
        isRunning,
        config.enableViewportCulling,
        updateViewportCulling,
    );

    // Set global bounds for dot generation (once on mount)
    useEffect(() => {
        setBounds({
            minLng: TEST_CONFIG.GLOBE_BOUNDS.MIN_LNG,
            maxLng: TEST_CONFIG.GLOBE_BOUNDS.MAX_LNG,
            minLat: TEST_CONFIG.GLOBE_BOUNDS.MIN_LAT,
            maxLat: TEST_CONFIG.GLOBE_BOUNDS.MAX_LAT,
        });
    }, [setBounds]);

    // Performance test animation loop
    useEffect(() => {
        if (!isRunning) return;

        const interval = setInterval(() => {
            updateDots();
        }, config.updateInterval);

        return () => clearInterval(interval);
    }, [isRunning, config.updateInterval, updateDots]);

    const handleViewStateChange = (e: any) => {
        setViewState(e.viewState as MapViewState);
    };

    // Tooltip handler for hovering over elements
    const getTooltip = (info: any) => {
        if (!info || !info.object) return null;

        const { object, coordinate } = info;
        // Use object's position if available, otherwise fall back to coordinate
        const [lng, lat] = object.position || coordinate || [0, 0];

        // Format position with appropriate precision
        const formattedLng = lng.toFixed(6);
        const formattedLat = lat.toFixed(6);

        // Build tooltip content based on layer type
        let content = `
            <div><strong>Position:</strong></div>
            <div>Lng: ${formattedLng}</div>
            <div>Lat: ${formattedLat}</div>
        `;

        if (object.size) {
            content += `<div>Size: ${object.size.toFixed(2)}</div>`;
        }

        if (object.text) {
            content += `<div>Text: ${object.text}</div>`;
        }

        if (object.icon) {
            content += `<div>Icon: ${object.icon}</div>`;
        }

        // Add color information
        if (object.color && Array.isArray(object.color)) {
            const [r, g, b, a] = object.color;
            content += `<div>Color: rgba(${r}, ${g}, ${b}, ${a || 255})</div>`;
        }

        return {
            html: `
                <div style="background: rgba(0, 0, 0, 0.8); color: white; padding: 8px; border-radius: 4px; font-size: 12px; font-family: monospace; max-width: 200px;">
                    ${content}
                </div>
            `,
            style: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace',
                pointerEvents: 'none',
                zIndex: '1000',
                maxWidth: '200px',
            },
        };
    };

    // Create performance test layers using the custom hook
    const layers = usePerformanceTestLayers({
        isRunning,
        useHighPerformanceMode,
        config,
        visibleDots,
        dots,
        getBinaryData,
    });

    return (
        <div className="w-full h-full relative">
            <DeckGL
                layers={layers}
                viewState={viewState}
                onViewStateChange={handleViewStateChange}
                controller
                getTooltip={getTooltip}
            >
                <Map
                    mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_API_TOKEN}
                    mapStyle={getMapStyle(CURRENT_MAP_STYLE)}
                />
                <ZoomWidget />
            </DeckGL>

            <DebugToolbar
                viewState={viewState}
                isVisible={showDebug}
                onToggle={toggleDebug}
                fps={fps}
                frameTime={frameTime}
                totalDots={totalDots}
                visibleDots={visibleDotsCount}
                cullingEnabled={cullingEnabled}
                useHighPerformanceMode={useHighPerformanceMode}
                updateTime={updateTime}
            />

            <PerformanceTestControls
                isVisible={showTestControls}
                onToggle={toggleTestControls}
            />
        </div>
    );
}
