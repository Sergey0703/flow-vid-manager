import { useState, useCallback, useEffect, useRef } from 'react';
import CatAvatar from '../v2/CatAvatar';

type DemoState = 'idle' | 'connecting' | 'connected' | 'error';
type AgentThinkingState = 'listening' | 'thinking' | 'speaking' | null;

const SILENCE_TIMEOUT_MS = 30_000;
const MAX_CALL_MS = 3 * 60_000;

interface ShopPixelWidgetProps {
  onHighlight: (ids: string[]) => void;
}

export default function ShopPixelWidget({ onHighlight }: ShopPixelWidgetProps) {
  const [state, setState] = useState<DemoState>('idle');
  const [error, setError] = useState('');
  const [duration, setDuration] = useState(0);
  const [agentStream, setAgentStream] = useState<MediaStream | null>(null);
  const [agentThinkingState, setAgentThinkingState] = useState<AgentThinkingState>(null);
  const [expanded, setExpanded] = useState(false); // mobile sheet open

  const roomRef         = useRef<any>(null);
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef        = useRef<HTMLAudioElement | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxCallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setDuration(0);
  };

  const clearAllTimers = () => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (maxCallTimerRef.current) { clearTimeout(maxCallTimerRef.current); maxCallTimerRef.current = null; }
  };

  const disconnect = useCallback(async () => {
    stopTimer();
    clearAllTimers();
    if (roomRef.current) { await roomRef.current.disconnect(); roomRef.current = null; }
    if (audioRef.current) { audioRef.current.srcObject = null; }
    setAgentStream(null);
    setAgentThinkingState(null);
    setState('idle');
    onHighlight([]);
  }, [onHighlight]);

  const resetSilenceTimer = useCallback((disc: () => void) => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => disc(), SILENCE_TIMEOUT_MS);
  }, []);

  const connect = useCallback(async () => {
    setState('connecting');
    setError('');
    setExpanded(true);
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const { Room, RoomEvent, Track } = await import('livekit-client');

      const res = await fetch('/api/livekit-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName: 'aimediaflow-salesmanager' }),
      });
      const data = await res.json();
      if (!res.ok) {
        micStream.getTracks().forEach(t => t.stop());
        throw new Error(data.error || 'Failed to get token');
      }

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach();
          el.autoplay = true;
          audioRef.current = el as HTMLAudioElement;
          document.body.appendChild(el);
          const ms = (track as any).mediaStream as MediaStream | undefined;
          if (ms) setAgentStream(ms);
          else if (el instanceof HTMLMediaElement && (el as any).captureStream) {
            setAgentStream((el as any).captureStream());
          }
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => { track.detach(); });
      room.on(RoomEvent.Disconnected, () => { disconnect(); });
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers: any[]) => {
        if (speakers.length > 0) resetSilenceTimer(disconnect);
      });
      room.on(RoomEvent.ParticipantAttributesChanged, (attrs: Record<string, string>) => {
        const s = attrs['lk.agent.state'] ?? attrs['agent_state'] ?? attrs['livekit.agent_state'];
        if (s) setAgentThinkingState(s as AgentThinkingState);

        // Product highlight from agent
        if ('highlighted_ids' in attrs) {
          const ids = attrs['highlighted_ids'];
          onHighlight(ids ? ids.split(',').filter(Boolean) : []);
        }
      });

      micStream.getTracks().forEach(t => t.stop());
      await room.connect(data.wsUrl, data.token);

      room.registerRpcMethod('end_call', async () => {
        setTimeout(() => disconnect(), 2000);
        return JSON.stringify({ success: true });
      });

      await room.localParticipant.setMicrophoneEnabled(true);

      setState('connected');
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      resetSilenceTimer(disconnect);
      maxCallTimerRef.current = setTimeout(() => disconnect(), MAX_CALL_MS);

    } catch (err: any) {
      setError(err.message || 'Connection failed');
      setState('error');
      roomRef.current = null;
    }
  }, [disconnect, resetSilenceTimer, onHighlight]);

  useEffect(() => { return () => { disconnect(); }; }, []);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const avatarState = state === 'connecting' ? 'connecting' : state === 'connected' ? 'connected' : 'idle';

  return (
    <>
      {/* ── Desktop floating widget ──────────────────────────────────────── */}
      <div className="shop-pixel-widget">
        <div className="shop-pixel-avatar-wrap">
          <CatAvatar agentStream={agentStream} agentState={avatarState} agentThinkingState={agentThinkingState} />
        </div>
        <div className="shop-pixel-controls">
          {(state === 'idle' || state === 'error') && (
            <>
              <button className="shop-pixel-btn shop-pixel-btn--start" onClick={connect}>
                <MicIcon /> Ask Pixel
              </button>
              {state === 'error' && <span className="shop-pixel-error">{error}</span>}
            </>
          )}
          {state === 'connecting' && (
            <span className="shop-pixel-status">Connecting…</span>
          )}
          {state === 'connected' && (
            <div className="shop-pixel-connected">
              <div className="shop-pixel-status-row">
                <span className="shop-pixel-pulse" />
                <span className="shop-pixel-status">Pixel · {fmt(duration)}</span>
              </div>
              <button className="shop-pixel-btn shop-pixel-btn--end" onClick={disconnect}>
                <PhoneOffIcon /> End
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile tab bar + sheet ────────────────────────────────────────── */}
      <div className="shop-pixel-tab" onClick={() => {
        if (state === 'idle' || state === 'error') connect();
        else setExpanded(e => !e);
      }}>
        <span className="shop-pixel-tab-icon">🐱</span>
        <span className="shop-pixel-tab-label">
          {state === 'idle' ? 'Ask Pixel' : state === 'connecting' ? 'Connecting…' : `Pixel · ${fmt(duration)}`}
        </span>
        {state === 'connected' && <span className="shop-pixel-tab-pulse" />}
      </div>

      {expanded && state === 'connected' && (
        <div className="shop-pixel-sheet">
          <div className="shop-pixel-sheet-header">
            <span>Pixel</span>
            <button className="shop-pixel-sheet-close" onClick={() => setExpanded(false)}>✕</button>
          </div>
          <div className="shop-pixel-sheet-avatar">
            <CatAvatar agentStream={agentStream} agentState={avatarState} agentThinkingState={agentThinkingState} />
          </div>
          <button className="shop-pixel-btn shop-pixel-btn--end" onClick={disconnect} style={{ margin: '0 1rem 1rem' }}>
            <PhoneOffIcon /> End call
          </button>
        </div>
      )}
    </>
  );
}

const MicIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const PhoneOffIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="2" y1="2" x2="22" y2="22" />
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07" />
    <path d="M6.05 6.05A19.79 19.79 0 0 0 2 14.5a2 2 0 0 0 2 2h3a2 2 0 0 0 2-1.72 12.84 12.84 0 0 1 .7-2.81 2 2 0 0 0-.45-2.11L7.98 8.59" />
  </svg>
);
