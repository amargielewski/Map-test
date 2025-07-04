import { useState, useEffect, useRef } from 'react';

interface PerformanceMetrics {
    fps: number;
    frameTime: number;
}

export function usePerformanceMonitoring(): PerformanceMetrics {
    const frameRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(performance.now());
    const fpsRef = useRef<number[]>([]);
    const [fps, setFps] = useState<number>(0);
    const [frameTime, setFrameTime] = useState<number>(0);

    useEffect(() => {
        let animationId: number;

        const updatePerformance = () => {
            const now = performance.now();
            const delta = now - lastTimeRef.current;

            // Calculate FPS
            fpsRef.current.push(1000 / delta);
            if (fpsRef.current.length > 60) {
                fpsRef.current.shift();
            }

            // Update metrics every 10 frames
            if (frameRef.current % 10 === 0) {
                const avgFps =
                    fpsRef.current.reduce((a, b) => a + b, 0) /
                    fpsRef.current.length;
                setFps(avgFps);
                setFrameTime(delta);
            }

            frameRef.current++;
            lastTimeRef.current = now;
            animationId = requestAnimationFrame(updatePerformance);
        };

        animationId = requestAnimationFrame(updatePerformance);

        return () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        };
    }, []);

    return { fps, frameTime };
}
