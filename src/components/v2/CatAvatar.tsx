
import { useLipsync } from '../../hooks/useLipsync';

interface CatAvatarProps {
  agentStream: MediaStream | null;
  agentState: 'idle' | 'connecting' | 'connected';
}

const FRAME_CLOSED = '/catOk1.png';
const FRAME_OPEN   = '/catOk2.png';

// Preload both frames so transitions are instant
if (typeof window !== 'undefined') {
  [FRAME_CLOSED, FRAME_OPEN].forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}

const CatAvatar = ({ agentStream, agentState }: CatAvatarProps) => {
  const mouth = useLipsync(agentStream);

  // mouth 0 = closed, 1+ = open
  const src = agentState === 'connected' && mouth > 0 ? FRAME_OPEN : FRAME_CLOSED;

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
