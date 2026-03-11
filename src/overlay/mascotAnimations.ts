/**
 * Mascot path calculation for screen edge crawling animation.
 *
 * Path: top-left → top-right → bottom-right → bottom-left → top-left (clockwise)
 *
 * The mascot crawls along the screen edges. One full cycle = one focus session.
 * Progress (0→1) maps to position along the rectangular path.
 *
 * Progress bar: thin bar flush against screen hardware edge.
 * Mascot: head facing screen center, feet on the progress bar.
 */

export interface MascotPosition {
    x: number;
    y: number;
    rotation: number; // degrees — rotation to make head face screen center
    edge: 'top' | 'right' | 'bottom' | 'left';
}

/** Progress bar thickness in pixels */
export const BAR_THICKNESS = 4;

/** Mascot display size in pixels */
export const DEFAULT_MASCOT_SIZE = 30;

/**
 * Calculate mascot position along the screen edge path.
 *
 * Mascot orientation (head facing center):
 *   - Top edge:    rotation 180° (upside down, head pointing down)
 *   - Right edge:  rotation 270° (sideways, head pointing left)
 *   - Bottom edge: rotation 0°   (normal, head pointing up)
 *   - Left edge:   rotation 90°  (sideways, head pointing right)
 *
 * Mascot placement: center of mascot is offset inward from the edge
 * so its "feet" touch the progress bar.
 */
export function calculateMascotPosition(
    progress: number,
    screenWidth: number,
    screenHeight: number,
    mascotSize: number = DEFAULT_MASCOT_SIZE
): MascotPosition {
    const p = Math.max(0, Math.min(1, progress));

    const totalPerimeter = 2 * (screenWidth + screenHeight);
    const topLen = screenWidth / totalPerimeter;
    const rightLen = screenHeight / totalPerimeter;
    const bottomLen = screenWidth / totalPerimeter;
    // leftLen = remainder

    // Mascot center offset from the edge (bar + half mascot)
    const offset = BAR_THICKNESS + mascotSize / 2;

    if (p <= topLen) {
        // Top edge: left → right
        const seg = p / topLen;
        return {
            x: seg * screenWidth,
            y: offset,
            rotation: 180, // head pointing down (toward center)
            edge: 'top',
        };
    } else if (p <= topLen + rightLen) {
        // Right edge: top → bottom
        const seg = (p - topLen) / rightLen;
        return {
            x: screenWidth - offset,
            y: seg * screenHeight,
            rotation: 270, // head pointing left (toward center)
            edge: 'right',
        };
    } else if (p <= topLen + rightLen + bottomLen) {
        // Bottom edge: right → left
        const seg = (p - topLen - rightLen) / bottomLen;
        return {
            x: screenWidth - seg * screenWidth,
            y: screenHeight - offset,
            rotation: 0, // head pointing up (toward center)
            edge: 'bottom',
        };
    } else {
        // Left edge: bottom → top
        const leftLen = 1 - topLen - rightLen - bottomLen;
        const seg = (p - topLen - rightLen - bottomLen) / leftLen;
        return {
            x: offset,
            y: screenHeight - seg * screenHeight,
            rotation: 90, // head pointing right (toward center)
            edge: 'left',
        };
    }
}

/**
 * Calculate progress bar segment fills.
 * Returns the fill ratio (0→1) for each of the 4 edges.
 */
export interface ProgressBarSegments {
    top: number;    // fill ratio, left→right
    right: number;  // fill ratio, top→bottom
    bottom: number; // fill ratio, right→left
    left: number;   // fill ratio, bottom→top
}

export function calculateProgressSegments(
    progress: number,
    screenWidth: number,
    screenHeight: number
): ProgressBarSegments {
    const p = Math.max(0, Math.min(1, progress));
    const totalPerimeter = 2 * (screenWidth + screenHeight);
    const topLen = screenWidth / totalPerimeter;
    const rightLen = screenHeight / totalPerimeter;
    const bottomLen = screenWidth / totalPerimeter;

    let top = 0, right = 0, bottom = 0, left = 0;

    if (p <= topLen) {
        top = p / topLen;
    } else if (p <= topLen + rightLen) {
        top = 1;
        right = (p - topLen) / rightLen;
    } else if (p <= topLen + rightLen + bottomLen) {
        top = 1;
        right = 1;
        bottom = (p - topLen - rightLen) / bottomLen;
    } else {
        top = 1;
        right = 1;
        bottom = 1;
        const leftLen = 1 - topLen - rightLen - bottomLen;
        left = (p - topLen - rightLen - bottomLen) / leftLen;
    }

    return { top, right, bottom, left };
}
