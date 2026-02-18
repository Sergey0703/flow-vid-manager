
import { useEffect, useRef } from 'react';

interface CatAvatarProps {
  /** 0–255 volume level from AudioAnalyser */
  volume: number;
  /** 'idle' | 'connecting' | 'connected' */
  agentState: 'idle' | 'connecting' | 'connected';
}

// Mouth shapes in viewBox 0 0 100 100 (SVG covers mouth area)
const MOUTH_CLOSED = "M 30 50 Q 50 55 70 50";
const MOUTH_SMALL  = "M 30 47 Q 50 65 70 47";
const MOUTH_OPEN   = "M 28 44 Q 50 78 72 44";

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
        {/* Cover original mouth with fur color */}
        <ellipse cx="50" cy="50" rx="30" ry="20" fill="#d4915f" />

        {/* Mouth interior when open */}
        {volume > 14 && (
          <ellipse cx="50" cy="54" rx="18" ry={Math.min(4 + (volume / 255) * 14, 18)} fill="#7a1a0a" />
        )}

        {/* Teeth */}
        {volume > 14 && (
          <ellipse cx="50" cy="50" rx="12" ry="4" fill="white" opacity={Math.min((volume - 14) / 80, 1)} />
        )}

        {/* Mouth outline — always visible */}
        <path
          ref={pathRef}
          d={getMouth(volume)}
          stroke="#4a1a08"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
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
