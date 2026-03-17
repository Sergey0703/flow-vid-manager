
import { useState, useCallback, useEffect, useRef } from 'react';
import CatAvatar from './CatAvatar';

type State = 'idle' | 'connecting' | 'connected' | 'error';

const SILENCE_TIMEOUT_MS = 30_000;
const MAX_CALL_MS = 3 * 60_000;

const VoiceAgent = () => {
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState('');
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0);
  const [agentStream, setAgentStream] = useState<MediaStream | null>(null);

  const roomRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxCallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  // Cleanup on unmount
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

  const clearAllTimers = () => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (maxCallTimerRef.current) { clearTimeout(maxCallTimerRef.current); maxCallTimerRef.current = null; }
  };

  const stopAnalyser = () => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    analyserRef.current = null;
    setVolume(0);
  };

  // Start polling audioLevel from room participants via rAF
  const startAnalyser = () => {
    const tick = () => {
      const room = roomRef.current;
      if (!room) return;
      let maxLevel = 0;
      room.remoteParticipants.forEach((p: any) => {
        if (typeof p.audioLevel === 'number' && p.audioLevel > maxLevel) {
          maxLevel = p.audioLevel;
        }
      });
      // audioLevel is 0.0–1.0, convert to 0–255
      setVolume(Math.round(maxLevel * 255));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const resetSilenceTimer = useCallback((disc: () => void) => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      console.log('[silence-timeout] 30s → auto disconnect');
      disc();
    }, SILENCE_TIMEOUT_MS);
  }, []);

  const disconnect = useCallback(async () => {
    stopTimer();
    clearAllTimers();
    stopAnalyser();
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }
    setAgentStream(null);
    setState('idle');
  }, []);

  const connect = useCallback(async () => {
    setState('connecting');
    setError('');

    try {
      // Ask for mic permission immediately — must be in the user-gesture call stack
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

      // Dynamically import LiveKit only when user clicks — avoids auto-init
      const { Room, RoomEvent, Track } = await import('livekit-client');

      // Get token from our Vercel function
      const res = await fetch('/api/livekit-token', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        micStream.getTracks().forEach(t => t.stop());
        throw new Error(data.error || 'Failed to get token');
      }
      const { wsUrl, token } = data;

      // Create room
      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      // Play agent audio + capture MediaStream for lip-sync
      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach();
          el.autoplay = true;
          audioRef.current = el as HTMLAudioElement;
          document.body.appendChild(el);

          // Extract MediaStream for lip-sync analysis
          const ms = (track as any).mediaStream as MediaStream | undefined;
          if (ms) {
            setAgentStream(ms);
          } else if (el instanceof HTMLMediaElement && (el as any).captureStream) {
            setAgentStream((el as any).captureStream());
          }
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach();
      });

      room.on(RoomEvent.Disconnected, () => {
        disconnect();
      });

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers: any[]) => {
        if (speakers.length > 0) resetSilenceTimer(disconnect);
      });

      // Release pre-check stream — LiveKit will open its own
      micStream.getTracks().forEach(t => t.stop());

      // Connect and enable mic (permission already granted above)
      await room.connect(wsUrl, token);

      // RPC: agent can hang up via end_call tool
      room.registerRpcMethod('end_call', async (data: any) => {
        console.log('[end_call RPC] received, payload:', data?.payload);
        setTimeout(() => disconnect(), 2000);
        return JSON.stringify({ success: true });
      });

      await room.localParticipant.setMicrophoneEnabled(true);

      setState('connected');
      startTimer();
      startAnalyser();
      resetSilenceTimer(disconnect);
      maxCallTimerRef.current = setTimeout(() => {
        console.log('[max-call-limit] 3 min → auto disconnect');
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
    <div className="voice-agent-widget">

      {/* Idle: simple button */}
      {state === 'idle' && (
        <button className="voice-agent-btn" onClick={connect} title="Talk to Aoife — AIMediaFlow AI">
          <MicIcon />
          <span>Talk to AI</span>
        </button>
      )}

      {/* Connecting: show avatar + spinner */}
      {state === 'connecting' && (
        <div className="voice-agent-panel">
          <CatAvatar agentStream={null} agentState="connecting" />
        </div>
      )}

      {/* Connected: avatar with lip-sync + controls */}
      {state === 'connected' && (
        <div className="voice-agent-panel">
          <CatAvatar agentStream={agentStream} agentState="connected" />
          <div className="voice-agent-controls">
            <div className="voice-agent-info">
              <div className="voice-agent-pulse" />
              <span className="voice-agent-name">Aoife · AIMediaFlow</span>
              <span className="voice-agent-timer">{fmt(duration)}</span>
            </div>
            <button className="voice-agent-end" onClick={disconnect} title="End call">
              <PhoneOffIcon />
            </button>
          </div>
        </div>
      )}

      {state === 'error' && (
        <button className="voice-agent-btn voice-agent-btn--error" onClick={() => setState('idle')}>
          <span>⚠ {error} — tap to retry</span>
        </button>
      )}
    </div>
  );
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const MicIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

const PhoneOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07"/>
    <path d="M14.5 2.81a19.79 19.79 0 0 1 3.07 8.63"/>
    <line x1="2" y1="2" x2="22" y2="22"/>
    <path d="M6.05 6.05A19.79 19.79 0 0 0 2 14.5a2 2 0 0 0 2 2h3a2 2 0 0 0 2-1.72 12.84 12.84 0 0 1 .7-2.81 2 2 0 0 0-.45-2.11L7.98 8.59"/>
  </svg>
);

const SpinnerIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: 'voice-spin 1s linear infinite' }}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);

export default VoiceAgent;
