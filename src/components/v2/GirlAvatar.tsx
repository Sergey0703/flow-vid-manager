
import { useEffect, useRef } from 'react';
import { LipSyncEngine, CanvasRenderer } from '../../lib/lipsync-engine/index.js';

type AgentThinkingState = 'listening' | 'thinking' | 'speaking' | null;

interface GirlAvatarProps {
  agentStream: MediaStream | null;
  agentState: 'idle' | 'connecting' | 'connected';
  agentThinkingState?: AgentThinkingState;
}

/**
 * Preston Blair viseme → sprite frame index (6 frames, girl-sprite.png)
 *   0 = Rest / closed     — sil
 *   1 = Lips pressed      — PP, nn
 *   2 = Smile, slight open — E, I, SS
 *   3 = Wide open         — aa, DD, kk
 *   4 = Rounded           — O, RR, CH
 *   5 = Teeth on lip      — FF, TH, U
 */
const VISEME_MAP: Record<string, number> = {
  sil: 0,
  PP: 1, nn: 1,
  E: 2, I: 2, SS: 2,
  aa: 3, DD: 3, kk: 3,
  O: 4, RR: 4, CH: 4,
  FF: 5, TH: 5, U: 5,
};

const FRAME_W = 928;
const FRAME_H = 1120;

const GirlAvatar = ({ agentStream, agentState, agentThinkingState }: GirlAvatarProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<InstanceType<typeof LipSyncEngine> | null>(null);
  const rendererRef = useRef<InstanceType<typeof CanvasRenderer> | null>(null);

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
      spriteSheet: '/girl-sprite.png',
      frameWidth: FRAME_W,
      frameHeight: FRAME_H,
      visemeMap: VISEME_MAP,
      columns: 6,
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

  const isSpeaking = agentThinkingState === 'speaking';
  const isThinking = agentThinkingState === 'thinking';
  const isConnected = agentState === 'connected';

  return (
    <div className="cat-avatar-wrap">
      {/* Lipsync canvas — always mounted so engine can attach; hidden when not speaking */}
      <canvas
        ref={canvasRef}
        width={FRAME_W}
        height={FRAME_H}
        className="cat-avatar-canvas"
        style={{ display: isConnected && isSpeaking ? 'block' : isConnected ? 'none' : 'block' }}
      />

      {/* State images — listening / thinking / blink */}
      {isConnected && !isSpeaking && (
        <div className="girl-state-wrap">
          <img
            src={isThinking ? '/girlThinking.png' : '/girlListening.png'}
            width={FRAME_W}
            height={FRAME_H}
            className="girl-state-base"
            alt=""
          />
          {!isThinking && (
            <img
              src="/girlBlink.png"
              width={FRAME_W}
              height={FRAME_H}
              className="girl-state-blink"
              alt=""
            />
          )}
        </div>
      )}

      <div className="cat-avatar-label">
        {agentState === 'connecting' && <span className="cat-avatar-status connecting">connecting…</span>}
        {agentState === 'connected'  && <span className="cat-avatar-status connected">● Aoife</span>}
      </div>
    </div>
  );
};

export default GirlAvatar;
