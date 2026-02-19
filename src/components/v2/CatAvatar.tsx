
import { useEffect, useRef, useState } from 'react';

interface CatAvatarProps {
  volume: number;
  agentState: 'idle' | 'connecting' | 'connected';
}

const TOTAL_FRAMES = 30;
const SILENT_FRAME = 7; // frame_007 — mouth closed, stable position

// fps based on volume: 4fps when quiet, up to 24fps when loud
const getFps = (volume: number): number => {
  if (volume < 15) return 0;
  return 4 + Math.round((volume / 255) * 20);
};

const pad = (n: number) => String(n).padStart(3, '0');

const CatAvatar = ({ volume, agentState }: CatAvatarProps) => {
  const [frame, setFrame] = useState(SILENT_FRAME);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const frameRef = useRef<number>(SILENT_FRAME);
  const volumeRef = useRef<number>(volume);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    const tick = (now: number) => {
      rafRef.current = requestAnimationFrame(tick);
      const fps = getFps(volumeRef.current);

      if (fps === 0) {
        // silent — freeze on closed-mouth frame
        if (frameRef.current !== SILENT_FRAME) {
          frameRef.current = SILENT_FRAME;
          setFrame(SILENT_FRAME);
        }
        return;
      }

      const interval = 1000 / fps;
      if (now - lastTimeRef.current < interval) return;
      lastTimeRef.current = now;

      frameRef.current = (frameRef.current % TOTAL_FRAMES) + 1;
      setFrame(frameRef.current);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="cat-avatar-wrap">
      <img
        src={`/cat_frame_${pad(frame)}.png`}
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
