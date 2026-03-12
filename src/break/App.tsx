import { useEffect, useRef, useState } from 'react';
import type { BreakOverlayMode, BreakOverlayPayload, TimerState } from '../../shared/types';

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function Particles({ active }: { active: boolean }) {
    const [particles, setParticles] = useState<
        { id: number; x: number; y: number; emoji: string; delay: number }[]
    >([]);

    useEffect(() => {
        if (!active) return;
        const emojis = ['🎉', '✨', '⭐', '🌟', '💫', '🎊', '🎈', '🌈', '💪', '🔥'];
        const nextParticles = Array.from({ length: 20 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            emoji: emojis[i % emojis.length],
            delay: Math.random() * 0.5,
        }));
        setParticles(nextParticles);
    }, [active]);

    if (!active) return null;

    return (
        <>
            {particles.map((particle) => (
                <div
                    key={particle.id}
                    style={{
                        position: 'absolute',
                        left: `${particle.x}%`,
                        top: `${particle.y}%`,
                        fontSize: '24px',
                        animation: `particleFly 2s ease-out ${particle.delay}s both`,
                        pointerEvents: 'none',
                    }}
                >
                    {particle.emoji}
                </div>
            ))}
        </>
    );
}

export default function App() {
    const [visible, setVisible] = useState(false);
    const [timerState, setTimerState] = useState<TimerState | null>(null);
    const [overlayMode, setOverlayMode] = useState<BreakOverlayMode>('breakStart');
    const [message, setMessage] = useState('');
    const [isEnding, setIsEnding] = useState(false);
    const [showParticles, setShowParticles] = useState(false);
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const overlayModeRef = useRef<BreakOverlayMode>('breakStart');
    const isEndingRef = useRef(false);

    const clearHideTimeout = () => {
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }
    };

    const showOverlay = (payload: BreakOverlayPayload) => {
        clearHideTimeout();
        overlayModeRef.current = payload.mode;
        isEndingRef.current = payload.mode === 'focusReady';
        setOverlayMode(payload.mode);
        setMessage(payload.message);
        setIsEnding(payload.mode === 'focusReady');
        setShowParticles(payload.mode === 'focusReady');
        setVisible(true);

        // Auto-dismiss breakRunning after 5 seconds so it doesn't block the user
        if (payload.mode === 'breakRunning') {
            hideTimeoutRef.current = setTimeout(() => {
                setVisible(false);
                window.electronAPI.breakHide();
            }, 5000);
        }
    };

    useEffect(() => {
        const unsubBreak = window.electronAPI.onBreakShow((payload) => {
            showOverlay(payload);
        });

        const unsubTick = window.electronAPI.onTimerTick((state) => {
            setTimerState(state);

            if (
                overlayModeRef.current === 'breakRunning'
                && (state.phase === 'shortBreak' || state.phase === 'longBreak')
                && state.remainingSeconds <= 3
                && state.remainingSeconds > 0
                && !isEndingRef.current
            ) {
                isEndingRef.current = true;
                setIsEnding(true);
                setShowParticles(true);
                setMessage('休息快结束了，准备回到专注状态');
            }
        });

        const unsubPhase = window.electronAPI.onTimerPhaseChange((state) => {
            setTimerState(state);

            if (overlayModeRef.current === 'breakRunning' && state.phase === 'focusing') {
                clearHideTimeout();
                hideTimeoutRef.current = setTimeout(() => {
                    setVisible(false);
                }, 600);
            }
        });

        return () => {
            unsubBreak();
            unsubTick();
            unsubPhase();
            clearHideTimeout();
        };
    }, []);

    const handleDismiss = () => {
        clearHideTimeout();
        setVisible(false);
        window.electronAPI.breakHide();
    };

    const handleEndBreak = () => {
        isEndingRef.current = true;
        setShowParticles(true);
        setIsEnding(true);
        setMessage('休息结束，回到专注节奏');
        window.electronAPI.breakEnd();
    };

    const handlePrimaryAction = () => {
        if (overlayMode === 'breakStart') {
            setVisible(false);
            window.electronAPI.timerResume();
            return;
        }

        if (overlayMode === 'focusReady') {
            setVisible(false);
            window.electronAPI.timerStart();
            return;
        }

        handleEndBreak();
    };

    if (!visible) return null;

    const isBreak = timerState && (timerState.phase === 'shortBreak' || timerState.phase === 'longBreak');
    const breakLabel = timerState?.phase === 'longBreak' ? '长休息' : '短休息';
    const emoji = overlayMode === 'focusReady' ? '🎯' : (isEnding ? '🎉' : '☕');
    const description = overlayMode === 'focusReady'
        ? '休息已完成。你可以直接开始下一轮专注，或者先关闭回到控制面板。'
        : overlayMode === 'breakStart'
            ? '本轮专注已经结束。你可以开始休息，或者先关闭回到控制面板。'
            : '你可以继续休息计时，也可以先关闭提示层。';
    const primaryLabel = overlayMode === 'breakStart'
        ? '开始休息'
        : overlayMode === 'focusReady'
            ? '开始专注'
            : '结束休息，继续专注';

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: isEnding
                    ? 'radial-gradient(circle, rgba(103, 170, 115, 0.28) 0%, rgba(112, 79, 54, 0.2) 55%, rgba(247, 239, 228, 0.92) 100%)'
                    : 'radial-gradient(circle, rgba(240, 164, 95, 0.24) 0%, rgba(204, 100, 61, 0.16) 48%, rgba(247, 239, 228, 0.94) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'overlayFadeIn 0.5s ease',
                transition: 'background 0.5s ease',
            }}
        >
            <style>{`
        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes cardPop {
          from { opacity: 0; transform: scale(0.8) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        @keyframes particleFly {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-100px) scale(0) rotate(180deg); opacity: 0; }
        }
        @keyframes countPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>

            <Particles active={showParticles} />

            <div
                style={{
                    background: 'rgba(255, 248, 240, 0.84)',
                    backdropFilter: 'blur(30px)',
                    WebkitBackdropFilter: 'blur(30px)',
                    border: '1px solid rgba(125, 87, 58, 0.12)',
                    borderRadius: '24px',
                    padding: '48px 64px',
                    textAlign: 'center',
                    maxWidth: '520px',
                    animation: 'cardPop 0.5s ease',
                    boxShadow: '0 24px 60px rgba(120, 83, 54, 0.18)',
                }}
            >
                <div
                    style={{
                        fontSize: '64px',
                        marginBottom: '16px',
                        animation: 'breathe 3s ease-in-out infinite',
                    }}
                >
                    {emoji}
                </div>

                <div
                    style={{
                        fontSize: '24px',
                        fontWeight: 600,
                        color: '#2f231d',
                        marginBottom: '12px',
                        lineHeight: 1.4,
                    }}
                >
                    {message}
                </div>

                <div
                    style={{
                        fontSize: '14px',
                        color: '#755a49',
                        marginBottom: '18px',
                        lineHeight: 1.6,
                    }}
                >
                    {description}
                </div>

                {(overlayMode === 'breakStart' || overlayMode === 'breakRunning') && isBreak && (
                    <div style={{ fontSize: '14px', color: '#755a49', marginBottom: '24px' }}>
                        {breakLabel}
                    </div>
                )}

                {overlayMode !== 'focusReady' && isBreak && timerState && (
                    <div
                        style={{
                            fontSize: '48px',
                            fontWeight: 300,
                            fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
                            color: '#cc643d',
                            marginBottom: '32px',
                            animation: 'countPulse 2s ease-in-out infinite',
                            textShadow: '0 0 20px rgba(204, 100, 61, 0.22)',
                        }}
                    >
                        {formatTime(timerState.remainingSeconds)}
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                    <button
                        onClick={handleDismiss}
                        style={{
                            padding: '12px 24px',
                            borderRadius: '12px',
                            border: '1px solid rgba(125, 87, 58, 0.18)',
                            background: 'rgba(255, 255, 255, 0.55)',
                            color: '#755a49',
                            fontSize: '15px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            fontFamily: "'Avenir Next', 'PingFang SC', sans-serif",
                            boxShadow: '0 8px 18px rgba(120, 83, 54, 0.08)',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        关闭
                    </button>

                    <button
                        onClick={handlePrimaryAction}
                        style={{
                            padding: '12px 32px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #c45537, #ef9c57)',
                            color: 'white',
                            fontSize: '15px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: "'Avenir Next', 'PingFang SC', sans-serif",
                            boxShadow: '0 12px 28px rgba(204, 100, 61, 0.24)',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            (e.target as HTMLButtonElement).style.transform = 'scale(1.05)';
                            (e.target as HTMLButtonElement).style.boxShadow = '0 18px 36px rgba(204, 100, 61, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                            (e.target as HTMLButtonElement).style.transform = 'scale(1)';
                            (e.target as HTMLButtonElement).style.boxShadow = '0 12px 28px rgba(204, 100, 61, 0.24)';
                        }}
                    >
                        {primaryLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
