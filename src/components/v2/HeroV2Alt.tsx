
import { useState, useCallback, useEffect, useRef } from "react";
import GirlAvatar from "./GirlAvatar";

type VoiceState = 'idle' | 'connecting' | 'connected' | 'ending' | 'error';
type AgentThinkingState = 'listening' | 'thinking' | 'speaking' | null;

const SILENCE_TIMEOUT_MS = 30_000; // auto-disconnect after 30s of no audio
const MAX_CALL_MS = 3 * 60_000;   // hard limit: 3 minutes per call

interface HeroV2AltProps {
    agentName?: string; // undefined = use server default (aimediaflow-agent)
}

const HeroV2Alt = ({ agentName }: HeroV2AltProps) => {
    const [state, setState] = useState<VoiceState>('idle');
    const [error, setError] = useState('');
    const [duration, setDuration] = useState(0);
    const [agentStream, setAgentStream] = useState<MediaStream | null>(null);
    const [agentThinkingState, setAgentThinkingState] = useState<AgentThinkingState>(null);
    const roomRef = useRef<any>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const maxCallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    const resetSilenceTimer = useCallback((disc: () => void) => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
            console.log('[silence-timeout] 30s of silence → auto disconnect');
            disc();
        }, SILENCE_TIMEOUT_MS);
    }, []);

    const clearSilenceTimer = () => {
        if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
        if (maxCallTimerRef.current) { clearTimeout(maxCallTimerRef.current); maxCallTimerRef.current = null; }
    };

    const disconnect = useCallback(async () => {
        stopTimer();
        clearSilenceTimer();
        if (roomRef.current) {
            await roomRef.current.disconnect();
            roomRef.current = null;
        }
        if (audioRef.current) {
            audioRef.current.srcObject = null;
        }
        setAgentStream(null);
        setAgentThinkingState(null);
        setState('idle');
    }, []);

    const connect = useCallback(async () => {
        setState('connecting');
        setError('');
        try {
            const micStream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                video: false,
            });
            const { Room, RoomEvent, Track } = await import('livekit-client');
            const res = await fetch('/api/livekit-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: agentName ? JSON.stringify({ agentName }) : undefined,
            });
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
                    const ms = (track as any).mediaStream as MediaStream | undefined;
                    if (ms) {
                        setAgentStream(ms);
                    } else if (el instanceof HTMLMediaElement && (el as any).captureStream) {
                        setAgentStream((el as any).captureStream());
                    }
                }
            });
            room.on(RoomEvent.TrackUnsubscribed, (track) => { track.detach(); });
            room.on(RoomEvent.Disconnected, () => { disconnect(); });
            room.on(RoomEvent.ActiveSpeakersChanged, (speakers: any[]) => {
                if (speakers.length > 0) resetSilenceTimer(disconnect);
            });
            room.on(RoomEvent.ParticipantAttributesChanged, (attrs: Record<string, string>, participant: any) => {
                console.log('[Hero] ParticipantAttributesChanged — all attrs:', JSON.stringify(attrs), 'from:', participant?.identity);
                const s = attrs['lk.agent.state'] ?? attrs['agent_state'] ?? attrs['livekit.agent_state'];
                console.log('[Hero] agent_state extracted:', s);
                if (s) setAgentThinkingState(s as AgentThinkingState);
            });
            micStream.getTracks().forEach(t => t.stop());
            await room.connect(wsUrl, token);

            // Register RPC so agent can hang up via Client Tool "end_call"
            room.registerRpcMethod('end_call', async (data: any) => {
                console.log('[end_call RPC] received from agent, payload:', data?.payload);
                setState('ending');
                stopTimer();
                setTimeout(() => disconnect(), 2000); // let agent finish speaking
                return JSON.stringify({ success: true });
            });

            await room.localParticipant.setMicrophoneEnabled(true);
            setState('connected');
            startTimer();
            resetSilenceTimer(disconnect); // start 30s silence watchdog
            // Hard 3-minute call limit
            maxCallTimerRef.current = setTimeout(() => {
                console.log('[max-call-limit] 3 min reached → auto disconnect');
                disconnect();
            }, MAX_CALL_MS);
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

                {/* Right: AI interface card */}
                <div className="v2-hero-alt-video-wrap hero-voice-card hero-voice-card--hud">

                    {/* Top bar */}
                    <div className="hud-topbar">
                        <span className="hud-topbar-dot" />
                        <span className="hud-topbar-title">AOIFE · AI ASSISTANT</span>
                        <span className="hud-topbar-sys">{state === 'connected' ? 'SYS:ONLINE' : state === 'connecting' ? 'SYS:INIT…' : 'SYS:STANDBY'}</span>
                    </div>

                    {/* Body: avatar + side panel */}
                    <div className="hud-body">

                        {/* Avatar with corner brackets */}
                        <div className="hud-avatar-wrap">
                            <GirlAvatar
                                agentStream={agentStream}
                                agentState={state === 'connecting' ? 'connecting' : state === 'connected' ? 'connected' : 'idle'}
                                agentThinkingState={agentThinkingState}
                            />
                            {/* Corner brackets */}
                            <span className="hud-corner hud-corner--tl" />
                            <span className="hud-corner hud-corner--tr" />
                            <span className="hud-corner hud-corner--bl" />
                            <span className="hud-corner hud-corner--br" />
                        </div>

                        {/* Side panel */}
                        <div className="hud-side">
                            <div className="hud-side-section">
                                <span className="hud-label">AGENT</span>
                                <span className="hud-value">Aoife</span>
                            </div>
                            <div className="hud-divider" />
                            <div className="hud-side-section">
                                <span className="hud-label">STATUS</span>
                                <div className={`hud-state hud-state--${agentThinkingState ?? (state === 'connected' ? 'ready' : 'off')}`}>
                                    <span className="hud-state-dot" />
                                    <span className="hud-state-text">
                                        {agentThinkingState === 'thinking'  && 'Thinking'}
                                        {agentThinkingState === 'speaking'  && 'Speaking'}
                                        {agentThinkingState === 'listening' && 'Listening'}
                                        {!agentThinkingState && state === 'connected'  && 'Ready'}
                                        {!agentThinkingState && state === 'connecting' && 'Init…'}
                                        {!agentThinkingState && state === 'idle'       && 'Standby'}
                                        {state === 'ending' && 'Ending…'}
                                    </span>
                                </div>
                            </div>
                            {state === 'connected' && <>
                                <div className="hud-divider" />
                                <div className="hud-side-section">
                                    <span className="hud-label">SESSION</span>
                                    <span className="hud-value hud-mono">{fmt(duration)}</span>
                                </div>
                            </>}
                            <div className="hud-divider" />
                            <div className="hud-side-section">
                                <span className="hud-label">NEURAL</span>
                                <span className="hud-value">v2.1</span>
                            </div>
                            <div className="hud-divider" />
                            <div className="hud-side-section">
                                <span className="hud-label">VOICE</span>
                                <span className={`hud-value ${state === 'connected' ? 'hud-ok' : 'hud-muted'}`}>
                                    {state === 'connected' ? 'ACTIVE' : 'IDLE'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom action */}
                    <div className="hud-footer">
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
                        {state === 'ending' && (
                            <button className="hvc-btn hvc-btn--connecting" disabled>
                                <HvcSpinner /> Ending…
                            </button>
                        )}
                        {state === 'error' && (
                            <button className="hvc-btn hvc-btn--start" onClick={() => setState('idle')}>
                                ⚠ {error} — retry
                            </button>
                        )}
                    </div>
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
