import { useEffect, useState } from 'react';
import {
    calculateMascotPosition,
    calculateProgressSegments,
    BAR_THICKNESS,
    DEFAULT_MASCOT_SIZE,
    type MascotPosition,
    type ProgressBarSegments,
} from './mascotAnimations';
import type { TimerState, AppSettings } from '../../shared/types';
import MascotVisual from '../components/MascotVisual';
import { getMascotSkin } from '../../shared/mascotSkins';

const COMPLETED_COLOR = 'rgba(74, 222, 128, 0.6)';  // green
const REMAINING_COLOR = 'rgba(116, 90, 72, 0.16)';
type ScreenEdge = 'top' | 'right' | 'bottom' | 'left';

/**
 * Progress bar segment component.
 * Renders a thin bar along one screen edge with green/gray fill.
 */
function EdgeBar({
    edge,
    fill,
    screenWidth,
    screenHeight,
}: {
    edge: ScreenEdge;
    fill: number;
    screenWidth: number;
    screenHeight: number;
}) {
    const t = BAR_THICKNESS;

    let barStyle: React.CSSProperties = { position: 'absolute', pointerEvents: 'none' };
    let fillStyle: React.CSSProperties = { position: 'absolute', pointerEvents: 'none', background: COMPLETED_COLOR };

    switch (edge) {
        case 'top':
            barStyle = { ...barStyle, top: 0, left: 0, width: screenWidth, height: t, background: REMAINING_COLOR };
            fillStyle = { ...fillStyle, top: 0, left: 0, width: screenWidth * fill, height: t };
            break;
        case 'right':
            barStyle = { ...barStyle, top: 0, right: 0, width: t, height: screenHeight, background: REMAINING_COLOR };
            fillStyle = { ...fillStyle, top: 0, right: 0, width: t, height: screenHeight * fill };
            break;
        case 'bottom':
            barStyle = { ...barStyle, bottom: 0, left: 0, width: screenWidth, height: t, background: REMAINING_COLOR };
            fillStyle = { ...fillStyle, bottom: 0, right: 0, width: screenWidth * fill, height: t };
            break;
        case 'left':
            barStyle = { ...barStyle, top: 0, left: 0, width: t, height: screenHeight, background: REMAINING_COLOR };
            fillStyle = { ...fillStyle, bottom: 0, left: 0, width: t, height: screenHeight * fill };
            break;
    }

    return (
        <>
            <div style={barStyle} />
            {fill > 0 && <div style={fillStyle} />}
        </>
    );
}

/**
 * Compute mascot div position so "feet" always touch the progress bar.
 *
 * The mascot moves along screen edges (top→right→bottom→left).
 * Its "feet" should be flush against the thin progress bar at the edge.
 * When enlarged, the mascot grows INWARD (toward screen center).
 *
 * @param pos       - center position & edge from calculateMascotPosition
 * @param displaySize - the actual rendered size of the mascot (normal or enlarged)
 * @param screenW   - screen width
 * @param screenH   - screen height
 */
function getMascotLayout(pos: MascotPosition, displaySize: number, screenW: number, screenH: number) {
    const half = displaySize / 2;

    switch (pos.edge) {
        case 'top':
            // Feet at top (touching bar at y=BAR_THICKNESS), grows downward
            return { left: pos.x - half, top: BAR_THICKNESS };
        case 'right':
            // Feet at right (touching bar), grows leftward
            return { left: screenW - BAR_THICKNESS - displaySize, top: pos.y - half };
        case 'bottom':
            // Feet at bottom (touching bar), grows upward
            return { left: pos.x - half, top: screenH - BAR_THICKNESS - displaySize };
        case 'left':
            // Feet at left (touching bar), grows rightward
            return { left: BAR_THICKNESS, top: pos.y - half };
    }
}

export default function Mascot() {
    const [timerState, setTimerState] = useState<TimerState | null>(null);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [skinId, setSkinId] = useState('cat');
    const [isHovered, setIsHovered] = useState(false);
    const [isKeyHeld, setIsKeyHeld] = useState(false);

    useEffect(() => {
        window.electronAPI.timerGetState().then(setTimerState);
        window.electronAPI.settingsGet().then(s => {
            setSettings(s);
            setSkinId(s.mascotSkin);
        });

        const unsubTick = window.electronAPI.onTimerTick(setTimerState);
        const unsubPhase = window.electronAPI.onTimerPhaseChange(setTimerState);
        const unsubSettings = window.electronAPI.onSettingsUpdate(s => {
            setSettings(s);
            setSkinId(s.mascotSkin);
        });

        return () => {
            unsubTick();
            unsubPhase();
            unsubSettings();
        };
    }, []);

    // Single-key listener — works because overlay is focused when mouse enters mascot
    useEffect(() => {
        const enlargeKey = (settings?.mascotEnlargeKey || 'e').toLowerCase();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === enlargeKey) {
                setIsKeyHeld(true);
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === enlargeKey) {
                setIsKeyHeld(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
        };
    }, [settings?.mascotEnlargeKey]);

    const handleMouseEnter = () => {
        setIsHovered(true);
        window.electronAPI.overlaySetInteractive(true);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        setIsKeyHeld(false);
        window.electronAPI.overlaySetInteractive(false);
    };

    if (!timerState || timerState.phase !== 'focusing') {
        return null;
    }

    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    const progress = timerState.totalSeconds > 0
        ? (timerState.totalSeconds - timerState.remainingSeconds) / timerState.totalSeconds
        : 0;

    const mascotSize = settings?.mascotSize || DEFAULT_MASCOT_SIZE;
    const enlargeScale = settings?.mascotEnlargeScale || 3;
    const pos: MascotPosition = calculateMascotPosition(progress, screenW, screenH, mascotSize);
    const segments: ProgressBarSegments = calculateProgressSegments(progress, screenW, screenH);
    const skin = getMascotSkin(skinId, settings?.customSkins);

    // Visual state
    const isEnlarged = isHovered && isKeyHeld;
    const isTransparent = isHovered && !isKeyHeld;
    const mascotOpacity = isEnlarged ? 1 : isTransparent ? 0.2 : 1;

    // Compute actual display size (no CSS scale — we size the div directly)
    const displaySize = isEnlarged ? mascotSize * enlargeScale : mascotSize;

    // Position: feet always touching the progress bar
    const layout = getMascotLayout(pos, displaySize, screenW, screenH);

    return (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            <EdgeBar edge="top" fill={segments.top} screenWidth={screenW} screenHeight={screenH} />
            <EdgeBar edge="right" fill={segments.right} screenWidth={screenW} screenHeight={screenH} />
            <EdgeBar edge="bottom" fill={segments.bottom} screenWidth={screenW} screenHeight={screenH} />
            <EdgeBar edge="left" fill={segments.left} screenWidth={screenW} screenHeight={screenH} />

            {/* Mascot — feet pinned to progress bar, head faces screen center */}
            <div
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                style={{
                    position: 'absolute',
                    left: layout.left,
                    top: layout.top,
                    width: displaySize,
                    height: displaySize,
                    fontSize: displaySize - 8,
                    lineHeight: `${displaySize}px`,
                    textAlign: 'center',
                    transform: `rotate(${pos.rotation}deg)`,
                    opacity: mascotOpacity,
                    filter: isEnlarged
                        ? 'drop-shadow(0 0 12px rgba(74, 222, 128, 0.6))'
                        : 'drop-shadow(0 0 6px rgba(74, 222, 128, 0.4))',
                    transition: 'opacity 0.3s ease, width 0.3s ease, height 0.3s ease, left 0.3s ease, top 0.3s ease, filter 0.3s ease',
                    pointerEvents: 'auto',
                    cursor: isHovered ? 'pointer' : 'default',
                    zIndex: 10,
                }}
            >
                <MascotVisual
                    skin={skin}
                    className="overlay-mascot-image"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    emojiStyle={{ display: 'inline-block', width: '100%', height: '100%' }}
                />
            </div>
        </div>
    );
}
