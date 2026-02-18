
import { useEffect, useRef } from 'react';

interface CatAvatarProps {
  /** 0–255 volume level from AudioAnalyser */
  volume: number;
  /** 'idle' | 'connecting' | 'connected' */
  agentState: 'idle' | 'connecting' | 'connected';
}

// Mouth shapes: closed / small / open
const MOUTH_CLOSED = "M 44 72 Q 50 74 56 72";
const MOUTH_SMALL  = "M 43 71 Q 50 77 57 71";
const MOUTH_OPEN   = "M 42 70 Q 50 82 58 70";

const getMouth = (volume: number) => {
  if (volume < 15)  return MOUTH_CLOSED;
  if (volume < 80)  return MOUTH_SMALL;
  return MOUTH_OPEN;
};

const CatAvatar = ({ volume, agentState }: CatAvatarProps) => {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (pathRef.current) {
      pathRef.current.setAttribute('d', getMouth(volume));
    }
  }, [volume]);

  return (
    <div className="cat-avatar-wrap">
      {/* Cat image */}
      <img
        src="/cat2.png"
        alt="Aoife AI"
        className="cat-avatar-img"
      />

      {/* SVG mouth overlay — positioned over cat's mouth */}
      <svg
        className="cat-avatar-mouth"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Cover original mouth with skin-tone ellipse */}
        <ellipse cx="50" cy="73" rx="10" ry="6" fill="#d9956a" />

        {/* Animated mouth path */}
        <path
          ref={pathRef}
          d={getMouth(volume)}
          stroke="#7a3b1e"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill={volume > 14 ? "#c0503a" : "none"}
          style={{ transition: 'd 0.08s ease' }}
        />

        {/* Teeth — visible when mouth open */}
        {volume > 14 && (
          <ellipse cx="50" cy="74" rx="5" ry="2.5" fill="white" opacity={Math.min((volume - 14) / 66, 1)} />
        )}
      </svg>

      {/* State indicator */}
      <div className="cat-avatar-label">
        {agentState === 'connecting' && <span className="cat-avatar-status connecting">connecting…</span>}
        {agentState === 'connected'  && <span className="cat-avatar-status connected">● Aoife</span>}
      </div>
    </div>
  );
};

export default CatAvatar;
