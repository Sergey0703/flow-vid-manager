
import { useState, useCallback, useEffect, useRef } from "react";

type VoiceState = 'idle' | 'connecting' | 'connected' | 'error';

const HeroV2Alt = () => {
    const [state, setState] = useState<VoiceState>('idle');
    const [error, setError] = useState('');
    const [duration, setDuration] = useState(0);
    const roomRef = useRef<any>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        return () => { disconnect(); };
    }, []);

    const startTimer = () => {
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    };

    const stopTimer = () => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        setDuration(0);
    };

    const disconnect = useCallback(async () => {
        stopTimer();
        if (roomRef.current) {
            await roomRef.current.disconnect();
            roomRef.current = null;
        }
        if (audioRef.current) {
            audioRef.current.srcObject = null;
        }
        setState('idle');
    }, []);

    const connect = useCallback(async () => {
        setState('connecting');
        setError('');
        try {
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            const { Room, RoomEvent, Track } = await import('livekit-client');
            const res = await fetch('/api/livekit-token', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) {
                micStream.getTracks().forEach(t => t.stop());
                throw new Error(data.error || 'Failed to get token');
            }
            const { wsUrl, token } = data;
            const room = new Room({ adaptiveStream: true, dynacast: true });
            roomRef.current = room;
            room.on(RoomEvent.TrackSubscribed, (track) => {
                if (track.kind === Track.Kind.Audio) {
                    const el = track.attach();
                    el.autoplay = true;
                    audioRef.current = el as HTMLAudioElement;
                    document.body.appendChild(el);
                }
            });
            room.on(RoomEvent.TrackUnsubscribed, (track) => { track.detach(); });
            room.on(RoomEvent.Disconnected, () => { disconnect(); });
            micStream.getTracks().forEach(t => t.stop());
            await room.connect(wsUrl, token);
            await room.localParticipant.setMicrophoneEnabled(true);
            setState('connected');
            startTimer();
        } catch (err: any) {
            setError(err.message || 'Connection failed');
            setState('error');
            roomRef.current = null;
        }
    }, [disconnect]);

    const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    return (
        <section className="v2-hero v2-hero-alt">
            <div className="v2-hero-bg">
                <div className="v2-orb v2-orb-1"></div>
                <div className="v2-orb v2-orb-2"></div>
                <div className="v2-orb v2-orb-3"></div>
            </div>

            <div className="v2-hero-alt-grid">
                {/* Left: text */}
                <div className="v2-hero-alt-text">
                    <div className="v2-hero-badge">
                        <span className="dot"></span>
                        Kerry's Leading AI Agency
                    </div>

                    <h1 className="v2-hero-alt-h1">
                        <span className="ai">AI</span>MediaFlow:<br />
                        <span className="v2-hero-alt-sub">Rooted in Kerry.<br />Global reach.</span>
                    </h1>

                    <p className="v2-hero-desc" style={{ maxWidth: '520px' }}>
                        AIMediaFlow is an AI agency born on the Wild Atlantic Way, bringing world-class
                        artificial intelligence and workflow automation to media businesses of every scale.
                        We combine deep technical expertise with a founder's understanding of what it takes
                        to produce great content at pace.
                    </p>

                    <div className="v2-hero-actions">
                        <a href="#contact" className="v2-btn v2-btn-primary">
                            Book a Demo
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                        </a>
                        <a href="#work" className="v2-btn v2-btn-ghost">
                            See Our Work
                        </a>
                    </div>
                </div>

                {/* Right: voice agent card */}
                <div className="v2-hero-alt-video-wrap hero-voice-card">
                    {/* Header */}
                    <div className="hvc-header">
                        <div className="hvc-avatar">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                                <line x1="12" y1="19" x2="12" y2="23"/>
                                <line x1="8" y1="23" x2="16" y2="23"/>
                            </svg>
                        </div>
                        <div className="hvc-header-info">
                            <span className="hvc-name">Aoife</span>
                            <span className="hvc-role">AIMediaFlow AI Assistant</span>
                        </div>
                        <div className={`hvc-status-dot ${state === 'connected' ? 'hvc-status-dot--active' : ''}`} />
                    </div>

                    {/* Waveform visual */}
                    <div className="hvc-wave-area">
                        {state === 'connected' ? (
                            <div className="hvc-wave-bars">
                                {[...Array(12)].map((_, i) => (
                                    <div key={i} className="hvc-bar" style={{ animationDelay: `${i * 0.08}s` }} />
                                ))}
                            </div>
                        ) : state === 'connecting' ? (
                            <div className="hvc-wave-bars hvc-wave-bars--slow">
                                {[...Array(12)].map((_, i) => (
                                    <div key={i} className="hvc-bar" style={{ animationDelay: `${i * 0.15}s` }} />
                                ))}
                            </div>
                        ) : (
                            <div className="hvc-idle-icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3">
                                    <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                                    <line x1="12" y1="19" x2="12" y2="23"/>
                                    <line x1="8" y1="23" x2="16" y2="23"/>
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Message / status */}
                    <div className="hvc-message">
                        {state === 'idle' && (
                            <p>"Hi! I'm Aoife. Ask me anything about how AI can help your business."</p>
                        )}
                        {state === 'connecting' && (
                            <p>Connecting to Aoife…</p>
                        )}
                        {state === 'connected' && (
                            <p>Connected · <span className="hvc-timer">{fmt(duration)}</span></p>
                        )}
                        {state === 'error' && (
                            <p className="hvc-error">⚠ {error}</p>
                        )}
                    </div>

                    {/* CTA button */}
                    <div className="hvc-actions">
                        {state === 'idle' && (
                            <button className="hvc-btn hvc-btn--start" onClick={connect}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                                    <line x1="12" y1="19" x2="12" y2="23"/>
                                    <line x1="8" y1="23" x2="16" y2="23"/>
                                </svg>
                                Talk to Aoife — free
                            </button>
                        )}
                        {state === 'connecting' && (
                            <button className="hvc-btn hvc-btn--connecting" disabled>
                                <HvcSpinner /> Connecting…
                            </button>
                        )}
                        {state === 'connected' && (
                            <button className="hvc-btn hvc-btn--end" onClick={disconnect}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07"/>
                                    <path d="M14.5 2.81a19.79 19.79 0 0 1 3.07 8.63"/>
                                    <line x1="2" y1="2" x2="22" y2="22"/>
                                    <path d="M6.05 6.05A19.79 19.79 0 0 0 2 14.5a2 2 0 0 0 2 2h3a2 2 0 0 0 2-1.72 12.84 12.84 0 0 1 .7-2.81 2 2 0 0 0-.45-2.11L7.98 8.59"/>
                                </svg>
                                End call
                            </button>
                        )}
                        {state === 'error' && (
                            <button className="hvc-btn hvc-btn--start" onClick={() => setState('idle')}>
                                Try again
                            </button>
                        )}
                    </div>

                    {/* Subtle glow ring when connected */}
                    {state === 'connected' && <div className="hvc-glow-ring" />}
                </div>
            </div>

            <div className="v2-scroll-hint">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
                Scroll to explore
            </div>
        </section>
    );
};

const HvcSpinner = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: 'voice-spin 1s linear infinite' }}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
);

export default HeroV2Alt;
