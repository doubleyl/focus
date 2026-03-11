import { useEffect, useMemo, useState } from 'react';
import type { TimerState } from '../../shared/types';

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function isPendingBreakStart(state: TimerState): boolean {
    return (state.phase === 'shortBreak' || state.phase === 'longBreak')
        && !state.isRunning
        && state.totalSeconds > 0
        && state.remainingSeconds === state.totalSeconds;
}

function getPhaseLabel(state: TimerState): string {
    if (state.phase === 'focusing') {
        return state.isRunning ? '专注中' : '专注已暂停';
    }

    if (state.phase === 'shortBreak') {
        return isPendingBreakStart(state) ? '待开始短休息' : (state.isRunning ? '短休息中' : '短休息已暂停');
    }

    if (state.phase === 'longBreak') {
        return isPendingBreakStart(state) ? '待开始长休息' : (state.isRunning ? '长休息中' : '长休息已暂停');
    }

    return '准备开始';
}

function getPrimaryAction(state: TimerState): { label: string; action: () => void } {
    if (state.phase === 'idle') {
        return { label: '开始专注', action: () => window.electronAPI.timerStart() };
    }

    if (state.isRunning) {
        return { label: '暂停', action: () => window.electronAPI.timerPause() };
    }

    if (isPendingBreakStart(state)) {
        return { label: '开始休息', action: () => window.electronAPI.timerResume() };
    }

    if (state.phase === 'focusing') {
        return { label: '继续专注', action: () => window.electronAPI.timerResume() };
    }

    return { label: '继续休息', action: () => window.electronAPI.timerResume() };
}

export default function App() {
    const [timerState, setTimerState] = useState<TimerState | null>(null);
    const [focusSeconds, setFocusSeconds] = useState(25 * 60);

    useEffect(() => {
        window.electronAPI.timerGetState().then(setTimerState);
        window.electronAPI.settingsGet().then((s) => setFocusSeconds(s.focusDuration * 60));

        const unsubTick = window.electronAPI.onTimerTick(setTimerState);
        const unsubPhase = window.electronAPI.onTimerPhaseChange(setTimerState);
        const unsubSettings = window.electronAPI.onSettingsUpdate((s) => setFocusSeconds(s.focusDuration * 60));

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                window.electronAPI.windowToggleQuick();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            unsubTick();
            unsubPhase();
            unsubSettings();
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const state: TimerState = timerState ?? {
        phase: 'idle',
        remainingSeconds: 0,
        totalSeconds: 0,
        currentRound: 1,
        totalRounds: 4,
        isRunning: false,
    };

    const displayTime = state.phase === 'idle' ? formatTime(focusSeconds) : formatTime(state.remainingSeconds);
    const primary = useMemo(() => getPrimaryAction(state), [state]);

    return (
        <div className="quick-root">
            <div className="quick-card">
                <div className="quick-header">
                    <div className="quick-title">Focus</div>
                    <button className="quick-close" onClick={() => window.electronAPI.windowToggleQuick()} aria-label="关闭">
                        ×
                    </button>
                </div>

                <div className="quick-status">{getPhaseLabel(state)}</div>
                <div className="quick-time">{displayTime}</div>

                <div className="quick-actions">
                    <button className="quick-btn primary" onClick={primary.action}>
                        {primary.label}
                    </button>

                    {state.phase !== 'idle' && (
                        <>
                            <button className="quick-btn ghost" onClick={() => window.electronAPI.timerStop()}>
                                停止
                            </button>
                            <button className="quick-btn ghost" onClick={() => window.electronAPI.timerSkip()}>
                                跳过
                            </button>
                        </>
                    )}
                </div>

                <div className="quick-footer">
                    <button className="quick-link" onClick={() => window.electronAPI.windowShowMain()}>
                        打开主面板
                    </button>
                </div>
            </div>
        </div>
    );
}
