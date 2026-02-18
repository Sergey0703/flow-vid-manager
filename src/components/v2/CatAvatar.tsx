
import { useEffect, useRef } from 'react';

interface CatAvatarProps {
  /** 0–255 volume level from AudioAnalyser */
  volume: number;
  /** 'idle' | 'connecting' | 'connected' */
  agentState: 'idle' | 'connecting' | 'connected';
}

// Mouth shapes in viewBox 0 0 100 100 (SVG covers mouth area)
const MOUTH_CLOSED = "M 20 50 Q 50 58 80 50";
const MOUTH_SMALL  = "M 20 46 Q 50 70 80 46";
const MOUTH_OPEN   = "M 18 42 Q 50 85 82 42";

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
        <ellipse cx="50" cy="50" rx="38" ry="24" fill="#d4915f" />

        {/* Mouth interior when open */}
        {volume > 14 && (
          <ellipse cx="50" cy="56" rx="24" ry={Math.min(6 + (volume / 255) * 18, 22)} fill="#7a1a0a" />
        )}

        {/* Teeth */}
        {volume > 14 && (
          <ellipse cx="50" cy="50" rx="16" ry="5" fill="white" opacity={Math.min((volume - 14) / 80, 1)} />
        )}

        {/* Mouth outline — always visible */}
        <path
          ref={pathRef}
          d={getMouth(volume)}
          stroke="#4a1a08"
          strokeWidth="3"
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
