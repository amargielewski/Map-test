import React from 'react';
import { usePerformanceTestStore } from '../stores/performanceTestStore';
import { TEST_CONFIG } from '../constants/mapConstants';

interface PerformanceTestControlsProps {
    isVisible: boolean;
    onToggle: () => void;
}

export function PerformanceTestControls({
    isVisible,
    onToggle,
}: PerformanceTestControlsProps) {
    const { isRunning, config, dots, startTest, stopTest, updateConfig } =
        usePerformanceTestStore();

    const handleDotCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const count = parseInt(e.target.value);
        updateConfig({ dotCount: count });
    };

    const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const speed = parseFloat(e.target.value);
        updateConfig({ maxSpeed: speed });
    };

    const handleTrailToggle = () => {
        updateConfig({ enableTrails: !config.enableTrails });
    };

    const handleCullingToggle = () => {
        updateConfig({ enableViewportCulling: !config.enableViewportCulling });
    };

    return (
        <>
            {/* Toggle button */}
            <button
                onClick={onToggle}
                className="absolute bottom-4 right-4 z-10 bg-blue-600 bg-opacity-70 text-white px-3 py-2 rounded-md text-sm font-mono hover:bg-opacity-90 transition-all"
            >
                {isVisible ? 'Hide Test' : 'Show Test'}
            </button>

            {/* Control panel */}
            {isVisible && (
                <div className="absolute bottom-4 left-4 z-10 bg-blue-900 bg-opacity-90 text-white p-4 rounded-lg font-mono text-sm max-w-md">
                    <h3 className="text-lg font-bold mb-3 text-blue-400">
                        Performance Test
                    </h3>

                    {/* Test controls */}
                    <div className="mb-4">
                        <div className="flex gap-2 mb-3">
                            <button
                                onClick={startTest}
                                disabled={isRunning}
                                className={`px-3 py-1 rounded text-xs font-semibold ${
                                    isRunning
                                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                        : 'bg-green-600 hover:bg-green-700 text-white'
                                }`}
                            >
                                Start Test
                            </button>
                            <button
                                onClick={stopTest}
                                disabled={!isRunning}
                                className={`px-3 py-1 rounded text-xs font-semibold ${
                                    !isRunning
                                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                        : 'bg-red-600 hover:bg-red-700 text-white'
                                }`}
                            >
                                Stop Test
                            </button>
                        </div>

                        <div className="space-y-2 text-xs">
                            <div>
                                <label className="block text-yellow-400 mb-1">
                                    Dot Count:{' '}
                                    {config.dotCount.toLocaleString()}
                                </label>
                                <input
                                    type="range"
                                    min={TEST_CONFIG.DOT_COUNT.MIN}
                                    max={TEST_CONFIG.DOT_COUNT.MAX}
                                    step={TEST_CONFIG.DOT_COUNT.STEP}
                                    value={config.dotCount}
                                    onChange={handleDotCountChange}
                                    disabled={isRunning}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-gray-400 mt-1">
                                    <span>
                                        {TEST_CONFIG.DOT_COUNT.MIN.toLocaleString()}
                                    </span>
                                    <span>
                                        {TEST_CONFIG.DOT_COUNT.MAX.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-yellow-400 mb-1">
                                    Speed:{' '}
                                    {(config.maxSpeed * 10000).toFixed(1)}
                                </label>
                                <input
                                    type="range"
                                    min={TEST_CONFIG.SPEED.MIN}
                                    max={TEST_CONFIG.SPEED.MAX}
                                    step={TEST_CONFIG.SPEED.STEP}
                                    value={config.maxSpeed}
                                    onChange={handleSpeedChange}
                                    disabled={isRunning}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-gray-400 mt-1">
                                    <span>
                                        {(
                                            TEST_CONFIG.SPEED.MIN * 10000
                                        ).toFixed(1)}
                                    </span>
                                    <span>
                                        {(
                                            TEST_CONFIG.SPEED.MAX * 10000
                                        ).toFixed(1)}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-yellow-400">
                                    <input
                                        type="checkbox"
                                        checked={config.enableTrails}
                                        onChange={handleTrailToggle}
                                        disabled={isRunning}
                                    />
                                    Enable Trails
                                </label>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-yellow-400">
                                    <input
                                        type="checkbox"
                                        checked={config.enableViewportCulling}
                                        onChange={handleCullingToggle}
                                        disabled={isRunning}
                                    />
                                    Enable Viewport Culling
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Test status */}
                    <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                            <span>Status:</span>
                            <span
                                className={
                                    isRunning
                                        ? 'text-green-400'
                                        : 'text-red-400'
                                }
                            >
                                {isRunning ? 'Running' : 'Stopped'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>Active Dots:</span>
                            <span className="text-cyan-400">
                                {dots.length.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
