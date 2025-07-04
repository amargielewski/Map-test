'use client';
import React from 'react';
import { MapComponent } from './Map';

export function MapWrapper() {
    return (
        <div className="w-screen h-screen relative overflow-hidden">
            {/* Map Component - Always visible */}
            <div className="absolute inset-0">
                <MapComponent />
            </div>
        </div>
    );
}
