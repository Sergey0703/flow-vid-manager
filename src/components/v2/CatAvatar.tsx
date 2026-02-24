
import { useEffect, useRef } from 'react';
import { LipSyncEngine, CanvasRenderer } from '../../lib/lipsync-engine/index.js';

type AgentThinkingState = 'listening' | 'thinking' | 'speaking' | null;

interface CatAvatarProps {
  agentStream: MediaStream | null;
  agentState: 'idle' | 'connecting' | 'connected';
  agentThinkingState?: AgentThinkingState;
}

/**
 * Sprite sheet: cat-sprite.png — 9 frames (1024×1024 each, total 9216×1024)
 *
 * Lipsync frames:
 *   0 = catSimple  — sil / rest (mouth closed)
 *   1 = catBPM     — PP, nn (lips pressed: B, P, M)
 *   2 = catEIS     — E, I, SS (smile/teeth: E, I, S)
 *   3 = catADG     — aa, DD, kk (wide open: A, D, G)
 *   4 = catORC     — O, RR, CH (rounded: O, R, CH)
 *   5 = catFUV     — FF, TH, U (lip to teeth: F, U, V)
 *
 * State frames:
 *   6 = catListening — attentive, mouth slightly open
 *   7 = catBlink     — eyes closed
 *   8 = catThinking  — thinking expression
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

const FRAME_W = 1024;
const FRAME_H = 1024;
const TOTAL_COLS = 9;

const THINKING_MIN_MS = 1500;

const CatAvatar = ({ agentStream, agentState, agentThinkingState }: CatAvatarProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<InstanceType<typeof LipSyncEngine> | null>(null);
  const rendererRef = useRef<InstanceType<typeof CanvasRenderer> | null>(null);
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rendererReadyRef = useRef<Promise<void>>(Promise.resolve());
  const thinkingStartRef = useRef<number | null>(null);
  const thinkingHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lipsyncActiveRef = useRef<boolean>(false);

  const renderState = (viseme: string) => {
    rendererReadyRef.current.then(() => {
      rendererRef.current?.render({ viseme });
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    const imageReady = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = '/cat-sprite.png';
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

    imageReady.then(() => {
      const renderer = new CanvasRenderer(canvas, {
        spriteSheet: img,
        frameWidth: FRAME_W,
        frameHeight: FRAME_H,
        visemeMap: VISEME_MAP,
        columns: TOTAL_COLS,
      });

      engine.on('viseme', (frame: any) => {
        if (lipsyncActiveRef.current) renderer.render(frame);
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

  useEffect(() => {
    if (blinkTimerRef.current) {
      clearTimeout(blinkTimerRef.current);
      blinkTimerRef.current = null;
    }

    if (agentThinkingState === 'thinking') {
      lipsyncActiveRef.current = false;
      thinkingStartRef.current = Date.now();
      if (thinkingHoldTimerRef.current) {
        clearTimeout(thinkingHoldTimerRef.current);
        thinkingHoldTimerRef.current = null;
      }
      renderState('thinking');
    } else if (agentThinkingState === 'speaking') {
      const elapsed = thinkingStartRef.current ? Date.now() - thinkingStartRef.current : THINKING_MIN_MS;
      const remaining = Math.max(0, THINKING_MIN_MS - elapsed);
      if (remaining > 0) {
        thinkingHoldTimerRef.current = setTimeout(() => {
          thinkingHoldTimerRef.current = null;
          thinkingStartRef.current = null;
          lipsyncActiveRef.current = true;
        }, remaining);
      } else {
        thinkingStartRef.current = null;
        lipsyncActiveRef.current = true;
      }
    } else if (agentThinkingState === 'listening' || agentState === 'connected') {
      lipsyncActiveRef.current = false;
      const elapsed = thinkingStartRef.current ? Date.now() - thinkingStartRef.current : THINKING_MIN_MS;
      const remaining = Math.max(0, THINKING_MIN_MS - elapsed);
      if (remaining > 0 && thinkingStartRef.current !== null) {
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
      lipsyncActiveRef.current = false;
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
        {agentState === 'connected'  && <span className="cat-avatar-status connected">● Pixel</span>}
      </div>
    </div>
  );
};

export default CatAvatar;
