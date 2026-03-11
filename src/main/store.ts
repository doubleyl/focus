import { create } from 'zustand';
import type { TimerState, FocusRecord, AppSettings } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/types';

interface AppStore {
    // Navigation
    currentPage: 'timer' | 'statistics' | 'records' | 'settings';
    setCurrentPage: (page: AppStore['currentPage']) => void;

    // Timer
    timerState: TimerState;
    setTimerState: (state: TimerState) => void;

    // Records
    records: FocusRecord[];
    setRecords: (records: FocusRecord[]) => void;

    // Settings
    settings: AppSettings;
    setSettings: (settings: AppSettings) => void;
}

export const useAppStore = create<AppStore>((set) => ({
    currentPage: 'timer',
    setCurrentPage: (page) => set({ currentPage: page }),

    timerState: {
        phase: 'idle',
        remainingSeconds: 0,
        totalSeconds: 0,
        currentRound: 1,
        totalRounds: 4,
        isRunning: false,
    },
    setTimerState: (timerState) => set({ timerState }),

    records: [],
    setRecords: (records) => set({ records }),

    settings: DEFAULT_SETTINGS,
    setSettings: (settings) => set({ settings }),
}));
