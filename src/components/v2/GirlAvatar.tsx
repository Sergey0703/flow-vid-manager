
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

const GirlAvatar = ({ agentStream, agentState, agentThinkingState }: GirlAvatarProps) => {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const engineRef  = useRef<InstanceType<typeof LipSyncEngine> | null>(null);
  const rendererRef = useRef<InstanceType<typeof CanvasRenderer> | null>(null);
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // resolves when the sprite sheet image has loaded and renderer is ready
  const rendererReadyRef = useRef<Promise<void>>(Promise.resolve());

  // helper: render a named state frame — waits for renderer to be ready first
  const renderState = (viseme: string) => {
    console.log(`[GirlAvatar] renderState("${viseme}") called — renderer=${rendererRef.current ? 'exists' : 'null'}`);
    rendererReadyRef.current.then(() => {
      console.log(`[GirlAvatar] renderState("${viseme}") → render() — renderer=${rendererRef.current ? 'exists' : 'null'}`);
      rendererRef.current?.render({ viseme });
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

  // State-driven rendering (listening / thinking / speaking)
  useEffect(() => {
    console.log(`[GirlAvatar] state effect — agentState="${agentState}" agentThinkingState="${agentThinkingState}"`);

    if (blinkTimerRef.current) {
      clearTimeout(blinkTimerRef.current);
      blinkTimerRef.current = null;
    }

    if (agentThinkingState === 'thinking') {
      renderState('thinking');
    } else if (agentThinkingState === 'listening' || (agentState === 'connected' && agentThinkingState !== 'speaking')) {
      // Show listening face + periodic blink
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
    } else if (!agentThinkingState && agentState !== 'connected') {
      renderState('sil');
    }

    return () => {
      if (blinkTimerRef.current) {
        clearTimeout(blinkTimerRef.current);
        blinkTimerRef.current = null;
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
