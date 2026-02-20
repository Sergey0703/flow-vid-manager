
import { useEffect, useRef } from 'react';
import { LipSyncEngine, CanvasRenderer } from '../../lib/lipsync-engine/index.js';

interface CatAvatarProps {
  agentStream: MediaStream | null;
  agentState: 'idle' | 'connecting' | 'connected';
}

/**
 * Extended viseme → sprite frame index (4 frames).
 *   0 = catOk1 (closed)       — sil
 *   1 = catOk2 (slightly open) — PP, SS, nn, E, I
 *   2 = cat3Ok (open + teeth)  — aa, DD, kk
 *   3 = cat4Ok (wide open)     — O, FF, TH, U, CH, RR
 */
const VISEME_MAP: Record<string, number> = {
  sil: 0,
  PP: 1, SS: 1, nn: 1, E: 1, I: 1,
  aa: 2, DD: 2, kk: 2,
  O: 3, FF: 3, TH: 3, U: 3, CH: 3, RR: 3,
};

const FRAME_SIZE = 400;

const CatAvatar = ({ agentStream, agentState }: CatAvatarProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<InstanceType<typeof LipSyncEngine> | null>(null);
  const rendererRef = useRef<InstanceType<typeof CanvasRenderer> | null>(null);

  // Create engine + canvas renderer once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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

    const renderer = new CanvasRenderer(canvas, {
      spriteSheet: '/cat-sprite.png',
      frameWidth: FRAME_SIZE,
      frameHeight: FRAME_SIZE,
      visemeMap: VISEME_MAP,
      columns: 4,
    });

    engine.on('viseme', (frame: any) => {
      renderer.render(frame);
    });

    engineRef.current = engine;
    rendererRef.current = renderer;

    return () => {
      engine.destroy();
      renderer.destroy();
      engineRef.current = null;
      rendererRef.current = null;
    };
  }, []);

  // Attach/detach agent audio stream
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !agentStream) return;

    (async () => {
      if (!engine.initialized) {
        await engine.init();
      }
      engine.attachStream(agentStream);
      engine.startAnalysis();
    })();

    return () => {
      if (engine.analyzing) engine.stopAnalysis();
    };
  }, [agentStream]);

  return (
    <div className="cat-avatar-wrap">
      <canvas
        ref={canvasRef}
        width={FRAME_SIZE}
        height={FRAME_SIZE}
        className="cat-avatar-canvas"
      />
      <div className="cat-avatar-label">
        {agentState === 'connecting' && <span className="cat-avatar-status connecting">connecting…</span>}
        {agentState === 'connected'  && <span className="cat-avatar-status connected">● Aoife</span>}
      </div>
    </div>
  );
};

export default CatAvatar;
