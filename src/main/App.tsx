import { useEffect } from 'react';
import { useAppStore } from './store';
import Timer from './pages/Timer';
import Statistics from './pages/Statistics';
import Records from './pages/Records';
import Settings from './pages/Settings';
import { Timer as TimerIcon, BarChart3, History, Settings as SettingsIcon } from 'lucide-react';
import type { TimerState } from '../../shared/types';
import './styles/App.css';

const NAV_ITEMS = [
    { id: 'timer' as const, label: '专注', icon: TimerIcon },
    { id: 'statistics' as const, label: '统计', icon: BarChart3 },
    { id: 'records' as const, label: '记录', icon: History },
    { id: 'settings' as const, label: '设置', icon: SettingsIcon },
];

function isPendingBreakStart(state: TimerState) {
    return (state.phase === 'shortBreak' || state.phase === 'longBreak')
        && !state.isRunning
        && state.totalSeconds > 0
        && state.remainingSeconds === state.totalSeconds;
}

function getStatusLabel(state: TimerState) {
    if (state.phase === 'focusing') {
        return state.isRunning ? '专注中' : '专注已暂停';
    }

    if (state.phase === 'shortBreak') {
        return isPendingBreakStart(state) ? '待开始休息' : (state.isRunning ? '短休息中' : '短休息已暂停');
    }

    if (state.phase === 'longBreak') {
        return isPendingBreakStart(state) ? '待开始长休' : (state.isRunning ? '长休息中' : '长休息已暂停');
    }

    return '空闲';
}

function getStatusClass(phase: string) {
    if (phase === 'focusing') return 'focusing';
    if (phase === 'shortBreak' || phase === 'longBreak') return 'break';
    return 'idle';
}

export default function App() {
    const { currentPage, setCurrentPage, timerState, setTimerState, setSettings } = useAppStore();

    useEffect(() => {
        // Load initial data
        window.electronAPI.settingsGet().then(setSettings);
        window.electronAPI.timerGetState().then(setTimerState);

        // Subscribe to timer updates
        const unsubTick = window.electronAPI.onTimerTick(setTimerState);
        const unsubPhase = window.electronAPI.onTimerPhaseChange(setTimerState);

        return () => {
            unsubTick();
            unsubPhase();
        };
    }, []);

    const renderPage = () => {
        switch (currentPage) {
            case 'timer': return <Timer />;
            case 'statistics': return <Statistics />;
            case 'records': return <Records />;
            case 'settings': return <Settings />;
        }
    };

    const statusClass = getStatusClass(timerState.phase);

    return (
        <div className="app-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-brand">
                    <div className="sidebar-brand-icon">🍅</div>
                    <span className="sidebar-brand-name">Focus</span>
                </div>

                <nav className="sidebar-nav">
                    {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            className={`sidebar-nav-item ${currentPage === id ? 'active' : ''}`}
                            onClick={() => setCurrentPage(id)}
                        >
                            <Icon className="sidebar-nav-icon" />
                            {label}
                        </button>
                    ))}
                </nav>

                <div className="sidebar-status">
                    <div className={`sidebar-status-badge ${statusClass}`}>
                        <span className={`sidebar-status-dot ${statusClass}`} />
                        {getStatusLabel(timerState)}
                    </div>
                </div>
            </aside>

            {/* Page Content */}
            <main className="page-content" key={currentPage}>
                {renderPage()}
            </main>
        </div>
    );
}
