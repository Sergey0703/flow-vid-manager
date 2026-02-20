
import { useEffect, useRef, useState } from 'react';
import { LipSyncEngine } from '../../lib/lipsync-engine/index.js';
import type { SimpleViseme } from '../../lib/lipsync-engine/index.js';

interface CatAvatarProps {
  agentStream: MediaStream | null;
  agentState: 'idle' | 'connecting' | 'connected';
}

/**
 * Simple viseme (A–F) → cat image mapping.
 *   A (rest/sil)       → catOk1  closed
 *   B (M/B/P), C (EE/S) → catOk2  slightly open
 *   D (AH wide)        → cat3Ok  open + teeth
 *   E (OH round), F (OO/F/V) → cat4Ok  wide open
 */
const VISEME_TO_IMAGE: Record<SimpleViseme, string> = {
  A: '/catOk1.png',
  B: '/catOk2.png',
  C: '/catOk2.png',
  D: '/cat3Ok.png',
  E: '/cat4Ok.png',
  F: '/cat4Ok.png',
};

// Preload all unique frames
if (typeof window !== 'undefined') {
  const seen = new Set<string>();
  Object.values(VISEME_TO_IMAGE).forEach((src) => {
    if (!seen.has(src)) {
      seen.add(src);
      const img = new Image();
      img.src = src;
    }
  });
}

const CatAvatar = ({ agentStream, agentState }: CatAvatarProps) => {
  const [frame, setFrame] = useState('/catOk1.png');
  const engineRef = useRef<InstanceType<typeof LipSyncEngine> | null>(null);

  // Create engine once
  useEffect(() => {
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

    engine.on('viseme', (f: any) => {
      const simple: SimpleViseme = f.simpleViseme || 'A';
      setFrame(VISEME_TO_IMAGE[simple] || '/catOk1.png');
    });

    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
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

  // Reset to closed when not connected
  useEffect(() => {
    if (agentState !== 'connected') setFrame('/catOk1.png');
  }, [agentState]);

  return (
    <div className="cat-avatar-wrap">
      <img
        src={frame}
        alt="Aoife AI"
        className="cat-avatar-img"
      />
      <div className="cat-avatar-label">
        {agentState === 'connecting' && <span className="cat-avatar-status connecting">connecting…</span>}
        {agentState === 'connected'  && <span className="cat-avatar-status connected">● Aoife</span>}
      </div>
    </div>
  );
};

export default CatAvatar;
