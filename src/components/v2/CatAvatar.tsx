
import { useLipsync, MouthState } from '../../hooks/useLipsync';

interface CatAvatarProps {
  agentStream: MediaStream | null;
  agentState: 'idle' | 'connecting' | 'connected';
}

/** Maps mouth state (0–3) to cat face image */
const MOUTH_FRAMES: Record<MouthState, string> = {
  0: '/cat_0.png', // closed
  1: '/cat_1.png', // slightly open
  2: '/cat_2.png', // open
  3: '/cat_3.png', // wide open / laughing
};

// Preload all 4 frames so transitions are instant
if (typeof window !== 'undefined') {
  Object.values(MOUTH_FRAMES).forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}

const CatAvatar = ({ agentStream, agentState }: CatAvatarProps) => {
  const mouth = useLipsync(agentStream);

  const src = agentState === 'connected' ? MOUTH_FRAMES[mouth] : MOUTH_FRAMES[0];

  return (
    <div className="cat-avatar-wrap">
      <img
        src={src}
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
