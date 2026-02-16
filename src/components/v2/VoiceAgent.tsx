import { useState, useCallback, useEffect, useRef } from 'react';

type State = 'idle' | 'connecting' | 'connected' | 'error';

const VoiceAgent = () => {
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState('');
  const [duration, setDuration] = useState(0);
  const roomRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      // Dynamically import LiveKit only when user clicks — avoids auto-init
      const { Room, RoomEvent, Track, createLocalTracks } = await import('livekit-client');

      // Get token from our Vercel function
      const res = await fetch('/api/livekit-token', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get token');
      }
      const { wsUrl, token } = data;

      // Create room
      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      // Play agent audio
      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach();
          el.autoplay = true;
          audioRef.current = el as HTMLAudioElement;
          document.body.appendChild(el);
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach();
      });

      room.on(RoomEvent.Disconnected, () => {
        disconnect();
      });

      // Connect first, then request mic permission and publish
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
    <div className="voice-agent-widget">
      {/* Main button */}
      {state === 'idle' && (
        <button className="voice-agent-btn" onClick={connect} title="Talk to Aoife — AIMediaFlow AI">
          <MicIcon />
          <span>Talk to AI</span>
        </button>
      )}

      {state === 'connecting' && (
        <button className="voice-agent-btn voice-agent-btn--connecting" disabled>
          <SpinnerIcon />
          <span>Connecting…</span>
        </button>
      )}

      {state === 'connected' && (
        <div className="voice-agent-active">
          <div className="voice-agent-info">
            <div className="voice-agent-pulse" />
            <span className="voice-agent-name">Aoife · AIMediaFlow</span>
            <span className="voice-agent-timer">{fmt(duration)}</span>
          </div>
          <button className="voice-agent-end" onClick={disconnect} title="End call">
            <PhoneOffIcon />
          </button>
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
