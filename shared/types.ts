// === Timer Types ===

export type TimerPhase = 'idle' | 'focusing' | 'shortBreak' | 'longBreak';
export type BreakOverlayMode = 'breakStart' | 'breakRunning' | 'focusReady';

export interface TimerState {
    phase: TimerPhase;
    remainingSeconds: number;
    totalSeconds: number;
    currentRound: number;
    totalRounds: number;
    isRunning: boolean;
    isAwayPaused?: boolean;
}

// === Record Types ===

export interface FocusRecord {
    id: string;
    startTime: number;       // Unix timestamp ms
    endTime: number;         // Unix timestamp ms
    duration: number;        // actual focus seconds
    plannedDuration: number; // planned focus seconds
    completed: boolean;      // completed full cycle
}

// === Settings Types ===

export interface AppSettings {
    focusDuration: number;         // minutes, default 25
    shortBreakDuration: number;    // minutes, default 5
    longBreakDuration: number;     // minutes, default 15
    roundsBeforeLongBreak: number; // default 4
    mascotSkin: string;            // skin ID
    mascotSize: number;            // overlay mascot size in px
    soundEnabled: boolean;
    autoStartBreak: boolean;
    autoStartFocus: boolean;
    showMascot: boolean;
    customSkins: MascotSkin[];
    globalShortcutEnabled: boolean; // whether the quick panel shortcut is enabled
    globalShortcut: string;         // the actual accelerator string (e.g. CommandOrControl+Shift+F)
    mascotEnlargeKey: string;       // single key for mascot enlarge while hovering (e.g. 'e')
    mascotEnlargeScale: number;     // scale factor when enlarged (e.g. 3)
}

// === IPC Channel Names ===

export const IPC_CHANNELS = {
    // Timer
    TIMER_START: 'timer:start',
    TIMER_PAUSE: 'timer:pause',
    TIMER_RESUME: 'timer:resume',
    TIMER_STOP: 'timer:stop',
    TIMER_SKIP: 'timer:skip',
    TIMER_TICK: 'timer:tick',
    TIMER_PHASE_CHANGE: 'timer:phase-change',
    TIMER_STATE: 'timer:state',
    TIMER_GET_STATE: 'timer:get-state',

    // Records
    RECORDS_GET_ALL: 'records:get-all',
    RECORDS_GET_BY_DATE: 'records:get-by-date',
    RECORDS_GET_RANGE: 'records:get-range',
    RECORDS_ADD: 'records:add',
    RECORDS_DELETE: 'records:delete',
    RECORDS_UPDATE: 'records:update',

    // Settings
    SETTINGS_GET: 'settings:get',
    SETTINGS_SET: 'settings:set',
    SETTINGS_UPDATE: 'settings:update',
    SETTINGS_SELECT_IMAGE: 'settings:select-image',

    // Window
    WINDOW_SHOW_MAIN: 'window:show-main',
    WINDOW_MINIMIZE: 'window:minimize',
    WINDOW_CLOSE: 'window:close',
    WINDOW_TOGGLE_QUICK: 'window:toggle-quick',

    // Break
    BREAK_SHOW: 'break:show',
    BREAK_HIDE: 'break:hide',
    BREAK_END: 'break:end',

    // Overlay
    OVERLAY_SET_INTERACTIVE: 'overlay:set-interactive',
    OVERLAY_TOGGLE_ENLARGE: 'overlay:toggle-enlarge',
} as const;

export interface BreakOverlayPayload {
    mode: BreakOverlayMode;
    message: string;
}

// === Mascot Skins ===

export interface MascotSkin {
    id: string;
    name: string;
    emoji?: string;
    image?: string;
    frameCount: number;
    frameWidth: number;
    frameHeight: number;
}

export const BUILT_IN_SKINS: MascotSkin[] = [
    { id: 'cat', name: '小猫咪', emoji: '🐱', frameCount: 4, frameWidth: 48, frameHeight: 48 },
    { id: 'dog', name: '小狗狗', emoji: '🐶', frameCount: 4, frameWidth: 48, frameHeight: 48 },
    { id: 'hamster', name: '小仓鼠', emoji: '🐹', frameCount: 4, frameWidth: 48, frameHeight: 48 },
];

// === Motivational Messages ===

export const BREAK_START_MESSAGES = [
    '辛苦了！休息一下吧 ☕',
    '做得很好！放松一下 🌟',
    '太棒了！该休息了 🎉',
    '专注完成！深呼吸 🧘',
    '你很努力！歇一歇 💤',
];

export const BREAK_END_MESSAGES = [
    '充满电了！继续加油 💪',
    '休息好了！冲鸭 🚀',
    '能量满满！再接再厉 ⚡',
    '状态回满！出发吧 🌈',
    '元气恢复！继续冲 🔥',
];

// === Default Settings ===

export const DEFAULT_SETTINGS: AppSettings = {
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    roundsBeforeLongBreak: 4,
    mascotSkin: 'cat',
    mascotSize: 30,
    soundEnabled: true,
    autoStartBreak: true,
    autoStartFocus: false,
    showMascot: true,
    customSkins: [],
    globalShortcutEnabled: true,
    globalShortcut: 'CommandOrControl+Shift+F',
    mascotEnlargeKey: 'e',
    mascotEnlargeScale: 3,
};
