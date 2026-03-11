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

    // Base style: full-length bar in gray
    let barStyle: React.CSSProperties = { position: 'absolute', pointerEvents: 'none' };
    // Fill overlay: green portion
    let fillStyle: React.CSSProperties = { position: 'absolute', pointerEvents: 'none', background: COMPLETED_COLOR };

    switch (edge) {
        case 'top':
            barStyle = {
                ...barStyle,
                top: 0, left: 0,
                width: screenWidth, height: t,
                background: REMAINING_COLOR,
            };
            fillStyle = {
                ...fillStyle,
                top: 0, left: 0,
                width: screenWidth * fill, height: t,
            };
            break;
        case 'right':
            barStyle = {
                ...barStyle,
                top: 0, right: 0,
                width: t, height: screenHeight,
                background: REMAINING_COLOR,
            };
            fillStyle = {
                ...fillStyle,
                top: 0, right: 0,
                width: t, height: screenHeight * fill,
            };
            break;
        case 'bottom':
            barStyle = {
                ...barStyle,
                bottom: 0, left: 0,
                width: screenWidth, height: t,
                background: REMAINING_COLOR,
            };
            // Bottom fills right → left
            fillStyle = {
                ...fillStyle,
                bottom: 0, right: 0,
                width: screenWidth * fill, height: t,
            };
            break;
        case 'left':
            barStyle = {
                ...barStyle,
                top: 0, left: 0,
                width: t, height: screenHeight,
                background: REMAINING_COLOR,
            };
            // Left fills bottom → top
            fillStyle = {
                ...fillStyle,
                bottom: 0, left: 0,
                width: t, height: screenHeight * fill,
            };
            break;
    }

    return (
        <>
            <div style={barStyle} />
            {fill > 0 && <div style={fillStyle} />}
        </>
    );
}

export default function Mascot() {
    const [timerState, setTimerState] = useState<TimerState | null>(null);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [skinId, setSkinId] = useState('cat');

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

    if (!timerState || timerState.phase !== 'focusing') {
        return null;
    }

    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    // Calculate progress
    const progress = timerState.totalSeconds > 0
        ? (timerState.totalSeconds - timerState.remainingSeconds) / timerState.totalSeconds
        : 0;

    // Mascot position
    const mascotSize = settings?.mascotSize || DEFAULT_MASCOT_SIZE;
    const pos: MascotPosition = calculateMascotPosition(progress, screenW, screenH, mascotSize);

    // Progress bar segments
    const segments: ProgressBarSegments = calculateProgressSegments(progress, screenW, screenH);

    // Skin Data (merge built-in and custom)
    const skin = getMascotSkin(skinId, settings?.customSkins);

    // ... (rest kept below)
    const halfSize = mascotSize / 2;
    return (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            {/* Progress bars along all 4 edges */}
            <EdgeBar edge="top" fill={segments.top} screenWidth={screenW} screenHeight={screenH} />
            <EdgeBar edge="right" fill={segments.right} screenWidth={screenW} screenHeight={screenH} />
            <EdgeBar edge="bottom" fill={segments.bottom} screenWidth={screenW} screenHeight={screenH} />
            <EdgeBar edge="left" fill={segments.left} screenWidth={screenW} screenHeight={screenH} />

            {/* Mascot — head facing screen center */}
            <div
                style={{
                    position: 'absolute',
                    left: pos.x - halfSize,
                    top: pos.y - halfSize,
                    width: mascotSize,
                    height: mascotSize,
                    fontSize: mascotSize - 8,
                    lineHeight: `${mascotSize}px`,
                    textAlign: 'center',
                    transform: `rotate(${pos.rotation}deg)`,
                    filter: 'drop-shadow(0 0 6px rgba(74, 222, 128, 0.4))',
                    transition: 'left 0.95s linear, top 0.95s linear',
                    pointerEvents: 'none',
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
