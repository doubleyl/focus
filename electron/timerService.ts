import { type TimerState, type TimerPhase, type AppSettings, type BreakOverlayPayload, IPC_CHANNELS, DEFAULT_SETTINGS, BREAK_START_MESSAGES, BREAK_END_MESSAGES } from '../shared/types';
import { getAllWindows, showOverlay, hideOverlay, showBreakWindow, hideBreakWindow, getBreakWindow, getOverlayWindow } from './windowManager';
import { getSettings, addRecord } from './dataStore';

let timerInterval: ReturnType<typeof setInterval> | null = null;
let currentState: TimerState = {
    phase: 'idle',
    remainingSeconds: 0,
    totalSeconds: 0,
    currentRound: 1,
    totalRounds: 4,
    isRunning: false,
    isAwayPaused: false,
};

let focusStartTime: number = 0;       // Physical start time
let focusIntervalStart: number = 0;   // Start time of the current running interval
let totalFocusedSeconds: number = 0;  // Accumulated actual focus seconds
let settings: AppSettings = DEFAULT_SETTINGS;
const stateListeners = new Set<(state: TimerState) => void>();

function randomFrom<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
}

function showBreakPrompt(payload: BreakOverlayPayload) {
    showBreakWindow();
    getBreakWindow()?.webContents.send(IPC_CHANNELS.BREAK_SHOW, payload);
}

function broadcastToAll(channel: string, data: any) {
    getAllWindows().forEach(win => {
        if (!win.isDestroyed()) {
            win.webContents.send(channel, data);
        }
    });
}

function notifyStateChange() {
    const snapshot = { ...currentState };
    stateListeners.forEach((listener) => {
        listener(snapshot);
    });
}

function getPhaseSeconds(phase: TimerPhase): number {
    switch (phase) {
        case 'focusing': return settings.focusDuration * 60;
        case 'shortBreak': return settings.shortBreakDuration * 60;
        case 'longBreak': return settings.longBreakDuration * 60;
        default: return 0;
    }
}

function saveFocusRecord(completed: boolean) {
    const now = Date.now();

    // Accrue any currently running interval
    if (currentState.isRunning && currentState.phase === 'focusing') {
        const elapsed = Math.round((now - focusIntervalStart) / 1000);
        totalFocusedSeconds += elapsed;
        focusIntervalStart = now; // reset interval start in case we keep going (not typical for saving, but safe)
    }

    if (totalFocusedSeconds < 5) return; // ignore very short sessions

    addRecord({
        startTime: focusStartTime,
        endTime: now,
        duration: totalFocusedSeconds,
        plannedDuration: settings.focusDuration * 60,
        completed,
    });
}

function tick() {
    if (currentState.remainingSeconds <= 0) {
        onPhaseEnd();
        return;
    }

    currentState.remainingSeconds--;
    broadcastToAll(IPC_CHANNELS.TIMER_TICK, { ...currentState });
}

function onPhaseEnd() {
    stopInterval();

    if (currentState.phase === 'focusing') {
        saveFocusRecord(true);
        hideOverlay();

        // Determine break type
        const isLongBreak = currentState.currentRound >= currentState.totalRounds;
        const nextPhase: TimerPhase = isLongBreak ? 'longBreak' : 'shortBreak';
        const nextSeconds = getPhaseSeconds(nextPhase);

        currentState = {
            ...currentState,
            phase: nextPhase,
            remainingSeconds: nextSeconds,
            totalSeconds: nextSeconds,
            isRunning: false,
        };

        broadcastToAll(IPC_CHANNELS.TIMER_PHASE_CHANGE, { ...currentState });
        notifyStateChange();

        if (settings.autoStartBreak) {
            startInterval();
            currentState.isRunning = true;
            broadcastToAll(IPC_CHANNELS.TIMER_TICK, { ...currentState });
            notifyStateChange();
            showBreakPrompt({
                mode: 'breakRunning',
                message: randomFrom(BREAK_START_MESSAGES),
            });
        } else {
            showBreakPrompt({
                mode: 'breakStart',
                message: randomFrom(BREAK_START_MESSAGES),
            });
        }

    } else if (currentState.phase === 'shortBreak' || currentState.phase === 'longBreak') {
        const nextRound = currentState.phase === 'longBreak' ? 1 : currentState.currentRound + 1;

        currentState = {
            ...currentState,
            phase: 'idle',
            remainingSeconds: 0,
            totalSeconds: 0,
            currentRound: nextRound,
            isRunning: false,
            isAwayPaused: false,
        };

        broadcastToAll(IPC_CHANNELS.TIMER_PHASE_CHANGE, { ...currentState });
        notifyStateChange();

        if (settings.autoStartFocus) {
            hideBreakWindow();
            startFocus();
        } else {
            showBreakPrompt({
                mode: 'focusReady',
                message: randomFrom(BREAK_END_MESSAGES),
            });
        }
    }
}

function startInterval() {
    stopInterval();
    timerInterval = setInterval(tick, 1000);
}

function stopInterval() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// ── Public API ──

export function startFocus() {
    settings = getSettings();
    const seconds = settings.focusDuration * 60;
    hideBreakWindow();

    currentState = {
        phase: 'focusing',
        remainingSeconds: seconds,
        totalSeconds: seconds,
        currentRound: currentState.currentRound,
        totalRounds: settings.roundsBeforeLongBreak,
        isRunning: true,
        isAwayPaused: false,
    };

    focusStartTime = Date.now();
    focusIntervalStart = Date.now();
    totalFocusedSeconds = 0;
    startInterval();

    if (settings.showMascot) {
        showOverlay();
    }

    // Auto-hide main panel when starting focus
    const wins = getAllWindows();
    wins.forEach(w => {
        if (w !== getOverlayWindow() && w !== getBreakWindow() && !w.isDestroyed()) {
            w.hide();
        }
    });

    broadcastToAll(IPC_CHANNELS.TIMER_PHASE_CHANGE, { ...currentState });
    notifyStateChange();
}

export function pauseTimer(isAway: boolean = false) {
    if (!currentState.isRunning) return;

    // Accrue elapsed time for this interval
    if (currentState.phase === 'focusing') {
        const elapsed = Math.round((Date.now() - focusIntervalStart) / 1000);
        totalFocusedSeconds += elapsed;
    }

    stopInterval();
    currentState.isRunning = false;
    currentState.isAwayPaused = isAway;
    broadcastToAll(IPC_CHANNELS.TIMER_TICK, { ...currentState });
    notifyStateChange();
}

export function resumeTimer(fromAway: boolean = false) {
    if (currentState.isRunning || currentState.phase === 'idle') return;

    // If it was manually paused, and this is an automatic away resume, ignore it.
    if (fromAway && !currentState.isAwayPaused) return;

    currentState.isRunning = true;
    currentState.isAwayPaused = false;

    if (currentState.phase === 'focusing') {
        focusIntervalStart = Date.now();
    }

    startInterval();

    if (currentState.phase === 'shortBreak' || currentState.phase === 'longBreak') {
        hideBreakWindow();
    }

    broadcastToAll(IPC_CHANNELS.TIMER_TICK, { ...currentState });
    notifyStateChange();
}

export function stopTimer() {
    stopInterval();
    if (currentState.phase === 'focusing') {
        saveFocusRecord(false);
    }
    hideOverlay();
    hideBreakWindow();
    currentState = {
        phase: 'idle',
        remainingSeconds: 0,
        totalSeconds: 0,
        currentRound: currentState.currentRound,
        totalRounds: currentState.totalRounds,
        isRunning: false,
        isAwayPaused: false,
    };
    broadcastToAll(IPC_CHANNELS.TIMER_PHASE_CHANGE, { ...currentState });
    notifyStateChange();
}

export function skipPhase() {
    currentState.remainingSeconds = 0;
    onPhaseEnd();
}

export function getTimerState(): TimerState {
    return { ...currentState };
}

export function endBreak() {
    if (currentState.phase === 'shortBreak' || currentState.phase === 'longBreak') {
        currentState.remainingSeconds = 0;
        onPhaseEnd();
    }
}

export function onTimerStateChange(listener: (state: TimerState) => void) {
    stateListeners.add(listener);
    return () => stateListeners.delete(listener);
}
