/**
 * Utility functions for handling custom icons in deck.gl layers
 */

export interface IconConfig {
    url: string;
    width: number;
    height: number;
    mask?: boolean;
}

/**
 * Creates an icon atlas from an SVG file by converting it to a data URL
 */
export async function createIconAtlasFromSVG(
    svgPath: string,
    width: number = 24,
    height: number = 24,
): Promise<string> {
    try {
        // For SVG files, we can use them directly as data URLs
        const response = await fetch(svgPath);
        const svgText = await response.text();

        // Create a data URL from the SVG
        const dataUrl = `data:image/svg+xml;base64,${btoa(svgText)}`;
        return dataUrl;
    } catch (error) {
        console.warn(
            'Failed to load SVG icon, falling back to default:',
            error,
        );
        // Fallback to a simple circle SVG
        const fallbackSvg = `
            <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
                <circle cx="${width / 2}" cy="${height / 2}" r="${
            width / 2 - 2
        }" fill="#78ffc4" stroke="#333" stroke-width="2"/>
            </svg>
        `;
        return `data:image/svg+xml;base64,${btoa(fallbackSvg)}`;
    }
}

/**
 * Creates an icon atlas using Canvas for better performance
 */
export async function createIconAtlasCanvas(
    svgPath: string,
    width: number = 24,
    height: number = 24,
): Promise<string> {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
        }

        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/png');
            resolve(dataUrl);
        };

        img.onerror = () => {
            // Fallback to simple circle
            ctx.fillStyle = '#78ffc4';
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, width / 2 - 2, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.stroke();
            const dataUrl = canvas.toDataURL('image/png');
            resolve(dataUrl);
        };

        img.src = svgPath;
    });
}

/**
 * Default icon configurations
 */
export const ICON_CONFIGS: Record<string, IconConfig> = {
    'test-icon': {
        url: '/test-icon.svg',
        width: 24,
        height: 24,
        mask: false,
    },
    marker: {
        url: '/test-icon.svg',
        width: 24,
        height: 24,
        mask: false,
    },
};
