
import { useEffect, useRef } from 'react';
import { LipSyncEngine, SVGMouthRenderer } from '../../lib/lipsync-engine/index.js';

interface CatAvatarProps {
  agentStream: MediaStream | null;
  agentState: 'idle' | 'connecting' | 'connected';
}

const CatAvatar = ({ agentStream, agentState }: CatAvatarProps) => {
  const mouthRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<InstanceType<typeof LipSyncEngine> | null>(null);
  const rendererRef = useRef<InstanceType<typeof SVGMouthRenderer> | null>(null);

  useEffect(() => {
    const container = mouthRef.current;
    if (!container) return;

    // Create engine + SVG renderer (like lipsync-engine demo)
    const engine = new LipSyncEngine({
      sampleRate: 48000,
      fftSize: 256,
      analyserSmoothing: 0.5,
      silenceThreshold: 0.015,
      smoothingFactor: 0.35,
      holdFrames: 2,
      disablePlayback: true,   // LiveKit plays audio, we only analyse
      analysisMode: 'raf',
    });

    const mouth = new SVGMouthRenderer(container, {
      width: 120,
      height: 80,
      lipColor: '#cc4444',
      innerColor: '#3a1111',
      teethColor: '#ffffff',
      showTeeth: true,
      lipThickness: 3,
    });

    engine.on('viseme', (frame: any) => {
      mouth.render(frame);
    });

    engineRef.current = engine;
    rendererRef.current = mouth;

    return () => {
      engine.destroy();
      mouth.destroy();
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
      {/* Face circle with CSS eyes + SVG mouth (like lipsync-engine demo) */}
      <div className="lipsync-face">
        <div className="lipsync-eyes">
          <div className="lipsync-eye" />
          <div className="lipsync-eye" />
        </div>
        <div className="lipsync-mouth" ref={mouthRef} />
      </div>
      <div className="cat-avatar-label">
        {agentState === 'connecting' && <span className="cat-avatar-status connecting">connecting…</span>}
        {agentState === 'connected'  && <span className="cat-avatar-status connected">● Aoife</span>}
      </div>
    </div>
  );
};

export default CatAvatar;
