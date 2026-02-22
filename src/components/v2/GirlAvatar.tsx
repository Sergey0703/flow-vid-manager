
import { useEffect, useRef } from 'react';
import { LipSyncEngine, CanvasRenderer } from '../../lib/lipsync-engine/index.js';

type AgentThinkingState = 'listening' | 'thinking' | 'speaking' | null;

interface GirlAvatarProps {
  agentStream: MediaStream | null;
  agentState: 'idle' | 'connecting' | 'connected';
  agentThinkingState?: AgentThinkingState;
}

/**
 * Sprite sheet: girl-sprite.png — 9 frames (928×1120 each, total 8352×1120)
 *
 * Speaking frames (lipsync):
 *   0 = Rest / sil
 *   1 = PP, nn
 *   2 = E, I, SS
 *   3 = aa, DD, kk
 *   4 = O, RR, CH
 *   5 = FF, TH, U
 *
 * State frames (manually rendered):
 *   6 = Listening (attentive face)
 *   7 = Blink
 *   8 = Thinking
 */
const VISEME_MAP: Record<string, number> = {
  sil: 0,
  PP: 1, nn: 1,
  E: 2, I: 2, SS: 2,
  aa: 3, DD: 3, kk: 3,
  O: 4, RR: 4, CH: 4,
  FF: 5, TH: 5, U: 5,
  // state frames
  listening: 6,
  blink: 7,
  thinking: 8,
};

const FRAME_W = 928;
const FRAME_H = 1120;
const TOTAL_COLS = 9;

// Minimum ms to hold the thinking frame before allowing speaking/listening to take over
const THINKING_MIN_MS = 1500;

const GirlAvatar = ({ agentStream, agentState, agentThinkingState }: GirlAvatarProps) => {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const engineRef  = useRef<InstanceType<typeof LipSyncEngine> | null>(null);
  const rendererRef = useRef<InstanceType<typeof CanvasRenderer> | null>(null);
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // resolves when the sprite sheet image has loaded and renderer is ready
  const rendererReadyRef = useRef<Promise<void>>(Promise.resolve());
  // tracks when thinking started so we can enforce THINKING_MIN_MS
  const thinkingStartRef = useRef<number | null>(null);
  const thinkingHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // helper: render a named state frame — waits for renderer to be ready first
  const renderState = (viseme: string) => {
    rendererReadyRef.current.then(() => {
      const r = rendererRef.current as any;
      if (!r) return;
      const frameIndex = r.opts?.visemeMap?.[viseme] ?? '?';
      const ready = r._ready;
      console.log(`[GirlAvatar] render("${viseme}") → frameIndex=${frameIndex} _ready=${ready} cols=${r.opts?.columns}`);
      r.render({ viseme });
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Preload the sprite sheet so renderer._ready is true immediately on construction
    const img = new Image();
    const imageReady = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = '/girl-sprite.png';
    });
    rendererReadyRef.current = imageReady;

    const engine = new LipSyncEngine({
      sampleRate: 48000,
      fftSize: 256,
      analyserSmoothing: 0.5,
      silenceThreshold: 0.015,
      smoothingFactor: 0.35,
      holdFrames: 2,
      disablePlayback: true,
      analysisMode: 'raf',
    });

    // Pass the already-loaded HTMLImageElement so CanvasRenderer sets _ready=true synchronously
    imageReady.then(() => {
      const renderer = new CanvasRenderer(canvas, {
        spriteSheet: img,
        frameWidth: FRAME_W,
        frameHeight: FRAME_H,
        visemeMap: VISEME_MAP,
        columns: TOTAL_COLS,
      });

      engine.on('viseme', (frame: any) => {
        renderer.render(frame);
      });

      rendererRef.current = renderer;
    });

    engineRef.current = engine;

    return () => {
      engine.destroy();
      rendererRef.current?.destroy();
      engineRef.current = null;
      rendererRef.current = null;
    };
  }, []);

  // Stream attachment / lipsync start-stop
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !agentStream) return;

    (async () => {
      if (!engine.initialized) await engine.init();
      engine.attachStream(agentStream);
      engine.startAnalysis();
    })();

    return () => {
      if (engine.analyzing) engine.stopAnalysis();
    };
  }, [agentStream]);

  const startListening = () => {
    renderState('listening');
    const scheduleBlink = () => {
      blinkTimerRef.current = setTimeout(() => {
        renderState('blink');
        blinkTimerRef.current = setTimeout(() => {
          renderState('listening');
          scheduleBlink();
        }, 150);
      }, 4000 + Math.random() * 2000);
    };
    scheduleBlink();
  };

  // State-driven rendering (listening / thinking / speaking)
  useEffect(() => {
    console.log(`[GirlAvatar] state effect — agentState="${agentState}" agentThinkingState="${agentThinkingState}"`);

    if (blinkTimerRef.current) {
      clearTimeout(blinkTimerRef.current);
      blinkTimerRef.current = null;
    }

    if (agentThinkingState === 'thinking') {
      // Record when thinking started
      thinkingStartRef.current = Date.now();
      if (thinkingHoldTimerRef.current) {
        clearTimeout(thinkingHoldTimerRef.current);
        thinkingHoldTimerRef.current = null;
      }
      renderState('thinking');
      console.log('[GirlAvatar] thinking started');
    } else if (agentThinkingState === 'speaking') {
      // Hold thinking frame for THINKING_MIN_MS before letting lipsync take over
      const elapsed = thinkingStartRef.current ? Date.now() - thinkingStartRef.current : THINKING_MIN_MS;
      const remaining = Math.max(0, THINKING_MIN_MS - elapsed);
      console.log(`[GirlAvatar] speaking — thinking elapsed=${elapsed}ms remaining=${remaining}ms`);
      if (remaining > 0) {
        thinkingHoldTimerRef.current = setTimeout(() => {
          thinkingHoldTimerRef.current = null;
          thinkingStartRef.current = null;
          console.log('[GirlAvatar] thinking hold done — lipsync takes over');
        }, remaining);
      } else {
        thinkingStartRef.current = null;
        console.log('[GirlAvatar] speaking — lipsync takes over immediately');
      }
    } else if (agentThinkingState === 'listening' || agentState === 'connected') {
      // If we were thinking, wait out the hold timer before showing listening
      const elapsed = thinkingStartRef.current ? Date.now() - thinkingStartRef.current : THINKING_MIN_MS;
      const remaining = Math.max(0, THINKING_MIN_MS - elapsed);
      if (remaining > 0 && thinkingStartRef.current !== null) {
        console.log(`[GirlAvatar] listening but holding thinking for ${remaining}ms more`);
        thinkingHoldTimerRef.current = setTimeout(() => {
          thinkingHoldTimerRef.current = null;
          thinkingStartRef.current = null;
          startListening();
        }, remaining);
      } else {
        thinkingStartRef.current = null;
        startListening();
      }
    } else {
      // idle / disconnected
      thinkingStartRef.current = null;
      renderState('sil');
    }

    return () => {
      if (blinkTimerRef.current) {
        clearTimeout(blinkTimerRef.current);
        blinkTimerRef.current = null;
      }
      if (thinkingHoldTimerRef.current) {
        clearTimeout(thinkingHoldTimerRef.current);
        thinkingHoldTimerRef.current = null;
      }
    };
  }, [agentThinkingState, agentState]);

  return (
    <div className="cat-avatar-wrap">
      <canvas
        ref={canvasRef}
        width={FRAME_W}
        height={FRAME_H}
        className="cat-avatar-canvas"
      />
      <div className="cat-avatar-label">
        {agentState === 'connecting' && <span className="cat-avatar-status connecting">connecting…</span>}
        {agentState === 'connected'  && <span className="cat-avatar-status connected">● Aoife</span>}
      </div>
    </div>
  );
};

export default GirlAvatar;
