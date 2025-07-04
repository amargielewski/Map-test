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
