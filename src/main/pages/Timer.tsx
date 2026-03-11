import { useAppStore } from '../store';
import { Play, Pause, Square, SkipForward } from 'lucide-react';
import MascotVisual from '../../components/MascotVisual';
import { getMascotSkin } from '../../../shared/mascotSkins';
import type { TimerState } from '../../../shared/types';
import '../styles/Timer.css';

const QUICK_DURATIONS = [15, 25, 45, 60];

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

function getPrimaryActionLabel(state: TimerState): string {
    if (state.phase === 'idle') return '开始专注';
    if (state.isRunning) return '暂停';
    if (isPendingBreakStart(state)) return '开始休息';
    if (state.phase === 'focusing') return '继续专注';
    return '继续休息';
}

export default function Timer() {
    const { timerState, settings } = useAppStore();
    const { phase, remainingSeconds, totalSeconds, currentRound, totalRounds, isRunning } = timerState;

    const isIdle = phase === 'idle';
    const isPendingBreak = isPendingBreakStart(timerState);

    // Progress ring
    const radius = 125;
    const circumference = 2 * Math.PI * radius;
    const progress = totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0;
    const dashOffset = circumference * (1 - progress);

    // Current mascot
    const currentSkin = getMascotSkin(settings.mascotSkin, settings.customSkins);
    const previewSize = Math.max(24, Math.min(42, Math.round(settings.mascotSize * 0.9)));

    const displayTime = isIdle ? formatTime(settings.focusDuration * 60) : formatTime(remainingSeconds);

    const handleStart = () => window.electronAPI.timerStart();
    const handlePause = () => window.electronAPI.timerPause();
    const handleResume = () => window.electronAPI.timerResume();
    const handleStop = () => window.electronAPI.timerStop();
    const handleSkip = () => window.electronAPI.timerSkip();

    const handleQuickDuration = async (minutes: number) => {
        if (!isIdle) return;
        await window.electronAPI.settingsUpdate({ focusDuration: minutes });
        const newSettings = await window.electronAPI.settingsGet();
        useAppStore.getState().setSettings(newSettings);
    };

    return (
        <div className="timer-page">
            {/* Circular Progress Ring */}
            <div className="timer-ring-container">
                <svg className="timer-ring-svg" viewBox="0 0 280 280">
                    <defs>
                        <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="var(--accent-primary)" />
                            <stop offset="100%" stopColor="var(--accent-secondary)" />
                        </linearGradient>
                    </defs>
                    <circle className="timer-ring-bg" cx="140" cy="140" r={radius} />
                    <circle
                        className="timer-ring-progress"
                        cx="140" cy="140" r={radius}
                        strokeDasharray={circumference}
                        strokeDashoffset={isIdle ? circumference : dashOffset}
                    />
                </svg>

                <div className="timer-center">
                    <div className="timer-time">{displayTime}</div>
                    <div className="timer-phase">{getPhaseLabel(timerState)}</div>
                    {!isIdle && (
                        <div className="timer-round">
                            第 {currentRound} / {totalRounds} 轮
                        </div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="timer-controls">
                {!isIdle && (
                    <button className="timer-btn-secondary" onClick={handleStop} title="停止">
                        <Square size={18} />
                    </button>
                )}

                {isIdle && (
                    <button className="timer-btn-main start" onClick={handleStart} title="开始专注">
                        <Play size={28} fill="white" color="white" />
                        <span className="timer-btn-label">{getPrimaryActionLabel(timerState)}</span>
                    </button>
                )}

                {!isIdle && isRunning && (
                    <button className="timer-btn-main pause" onClick={handlePause} title="暂停">
                        <Pause size={28} color="#f59e0b" />
                        <span className="timer-btn-label">{getPrimaryActionLabel(timerState)}</span>
                    </button>
                )}

                {!isIdle && !isRunning && (
                    <button className={`timer-btn-main resume ${isPendingBreak ? 'pending-break' : ''}`} onClick={handleResume} title={getPrimaryActionLabel(timerState)}>
                        <Play size={28} color="#10b981" />
                        <span className="timer-btn-label">{getPrimaryActionLabel(timerState)}</span>
                    </button>
                )}

                {!isIdle && (
                    <button className="timer-btn-secondary" onClick={handleSkip} title="跳过">
                        <SkipForward size={18} />
                    </button>
                )}
            </div>

            {/* Quick Duration */}
            {isIdle && (
                <div className="timer-quick-settings">
                    {QUICK_DURATIONS.map(d => (
                        <button
                            key={d}
                            className={`timer-duration-chip ${settings.focusDuration === d ? 'active' : ''}`}
                            onClick={() => handleQuickDuration(d)}
                        >
                            {d} 分钟
                        </button>
                    ))}
                </div>
            )}

            {/* Mascot Hint */}
            <div className="timer-mascot-preview">
                <MascotVisual
                    skin={currentSkin}
                    className="timer-mascot-image"
                    style={{ width: previewSize, height: previewSize, objectFit: 'contain' }}
                    emojiClassName="timer-mascot-emoji"
                    emojiStyle={{ fontSize: previewSize, animation: 'float 3s ease-in-out infinite' }}
                />
                <span>{currentSkin.name} 陪你专注</span>
            </div>
        </div>
    );
}
