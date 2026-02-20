
import { useLipsync, MouthState } from '../../hooks/useLipsync';

interface CatAvatarProps {
  agentStream: MediaStream | null;
  agentState: 'idle' | 'connecting' | 'connected';
}

const MOUTH_FRAMES: Record<MouthState, string> = {
  0: '/catOk1.png',  // closed — silence, M/B/P
  1: '/catOk2.png',  // slightly open — soft consonants
  2: '/cat3Ok.png',  // open + teeth — vowels A/E
  3: '/cat4Ok.png',  // wide open round — loud O, open vowels
};

// Preload all frames so transitions are instant
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
