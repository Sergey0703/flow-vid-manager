
import { useState, useCallback, useEffect, useRef } from 'react';
import CatAvatar from './CatAvatar';
import GirlAvatar from './GirlAvatar';

type DemoState = 'idle' | 'connecting' | 'connected' | 'error';

const SILENCE_TIMEOUT_MS = 30_000;
const MAX_CALL_MS = 3 * 60_000;

type AgentThinkingState = 'listening' | 'thinking' | 'speaking' | null;

// ── Shared voice-agent logic ──────────────────────────────────────────────────
function useDemoAgent(agentName?: string) {
  const [state, setState] = useState<DemoState>('idle');
  const [error, setError] = useState('');
  const [duration, setDuration] = useState(0);
  const [agentStream, setAgentStream] = useState<MediaStream | null>(null);
  const [agentThinkingState, setAgentThinkingState] = useState<AgentThinkingState>(null);

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
    setState('idle');
  }, []);

  const resetSilenceTimer = useCallback((disc: () => void) => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => disc(), SILENCE_TIMEOUT_MS);
  }, []);

  const connect = useCallback(async () => {
    setState('connecting');
    setError('');
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const { Room, RoomEvent, Track } = await import('livekit-client');

      const res = await fetch('/api/livekit-token', {
        method: 'POST',
        headers: agentName ? { 'Content-Type': 'application/json' } : undefined,
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
        console.log('[Demo] ParticipantAttributesChanged — all attrs:', JSON.stringify(attrs), 'from:', participant?.identity);
        const s = attrs['lk.agent.state'] ?? attrs['agent_state'] ?? attrs['livekit.agent_state'];
        console.log('[Demo] agent_state extracted:', s);
        if (s) setAgentThinkingState(s as AgentThinkingState);
      });

      micStream.getTracks().forEach(t => t.stop());
      await room.connect(wsUrl, token);

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
  }, [disconnect, resetSilenceTimer]);

  useEffect(() => { return () => { disconnect(); }; }, []);

  return { state, error, duration, agentStream, agentThinkingState, connect, disconnect };
}

// ── Shared card UI ────────────────────────────────────────────────────────────
function DemoCardShell({
  title, description, state, error, duration, connect, disconnect, avatar,
}: {
  title: string; description: string;
  state: DemoState; error: string; duration: number;
  connect: () => void; disconnect: () => void;
  avatar: React.ReactNode;
}) {
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return (
    <div className="lipsync-demo-card lipsync-demo-card--active">
      <div className="lipsync-card-preview">{avatar}</div>
      <div className="lipsync-card-body">
        <h3 className="lipsync-card-title">{title}</h3>
        <p className="lipsync-card-desc">{description}</p>
        <div className="lipsync-card-actions">
          {(state === 'idle' || state === 'error') && (
            <>
              <button className="lipsync-start-btn" onClick={connect}>
                <MicIcon />
                <span>{state === 'error' ? 'Retry' : 'Start Demo'}</span>
              </button>
              {state === 'error' && <span className="lipsync-card-error">{error}</span>}
            </>
          )}
          {(state === 'connecting' || state === 'connected') && (
            <>
              <div className="lipsync-card-status">
                {state === 'connected' && <div className="lipsync-card-pulse" />}
                <span style={{ color: state === 'connected' ? 'var(--v2-cyan)' : 'var(--v2-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
                  {state === 'connecting' ? 'Connecting…' : 'Aoife · AIMediaFlow'}
                </span>
                {state === 'connected' && <span className="lipsync-card-timer">{fmt(duration)}</span>}
              </div>
              {state === 'connected' && (
                <button className="lipsync-end-btn" onClick={disconnect} title="End call">
                  <PhoneOffIcon />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Cat variant ───────────────────────────────────────────────────────────────
const CatDemoContent = ({ title, description, agentName }: { title: string; description: string; agentName?: string }) => {
  const { state, error, duration, agentStream, connect, disconnect } = useDemoAgent(agentName);
  const avatarState = state === 'connecting' ? 'connecting' : state === 'connected' ? 'connected' : 'idle';
  return (
    <DemoCardShell
      title={title} description={description}
      state={state} error={error} duration={duration}
      connect={connect} disconnect={disconnect}
      avatar={<CatAvatar agentStream={agentStream} agentState={avatarState} />}
    />
  );
};

// ── Girl variant ──────────────────────────────────────────────────────────────
const GirlDemoContent = ({ title, description, agentName }: { title: string; description: string; agentName?: string }) => {
  const { state, error, duration, agentStream, agentThinkingState, connect, disconnect } = useDemoAgent(agentName);
  const avatarState = state === 'connecting' ? 'connecting' : state === 'connected' ? 'connected' : 'idle';
  return (
    <DemoCardShell
      title={title} description={description}
      state={state} error={error} duration={duration}
      connect={connect} disconnect={disconnect}
      avatar={<GirlAvatar agentStream={agentStream} agentState={avatarState} agentThinkingState={agentThinkingState} />}
    />
  );
};

// ── Coming Soon variant ───────────────────────────────────────────────────────
const ComingSoonCard = ({
  title,
  description,
  placeholderIcon,
}: {
  title: string;
  description: string;
  placeholderIcon?: React.ReactNode;
}) => (
  <div className="lipsync-demo-card lipsync-demo-card--soon">
    <div className="lipsync-card-preview">
      <div className="lipsync-card-placeholder">
        {placeholderIcon ?? <DefaultPlaceholderIcon />}
      </div>
    </div>
    <div className="lipsync-card-body">
      <span className="lipsync-soon-badge">Coming Soon</span>
      <h3 className="lipsync-card-title">{title}</h3>
      <p className="lipsync-card-desc">{description}</p>
    </div>
  </div>
);

// ── Public component ──────────────────────────────────────────────────────────
interface LipsyncDemoCardProps {
  type: 'cat' | 'girl' | 'coming-soon';
  title: string;
  description: string;
  placeholderIcon?: React.ReactNode;
  agentName?: string;
}

const LipsyncDemoCard = ({ type, title, description, placeholderIcon, agentName }: LipsyncDemoCardProps) => {
  if (type === 'cat')  return <CatDemoContent  title={title} description={description} agentName={agentName} />;
  if (type === 'girl') return <GirlDemoContent title={title} description={description} agentName={agentName} />;
  return <ComingSoonCard title={title} description={description} placeholderIcon={placeholderIcon} />;
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const MicIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const PhoneOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07" />
    <path d="M14.5 2.81a19.79 19.79 0 0 1 3.07 8.63" />
    <line x1="2" y1="2" x2="22" y2="22" />
    <path d="M6.05 6.05A19.79 19.79 0 0 0 2 14.5a2 2 0 0 0 2 2h3a2 2 0 0 0 2-1.72 12.84 12.84 0 0 1 .7-2.81 2 2 0 0 0-.45-2.11L7.98 8.59" />
  </svg>
);

const DefaultPlaceholderIcon = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
  </svg>
);

export default LipsyncDemoCard;
