
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
        {/* Cover original mouth */}
        <ellipse cx="50" cy="50" rx="24" ry="14" fill="#c8855a" />

        {/* Animated mouth path */}
        <path
          ref={pathRef}
          d={getMouth(volume)}
          stroke="#5a2510"
          strokeWidth="3"
          strokeLinecap="round"
          fill={volume > 14 ? "#a03020" : "none"}
        />

        {/* Teeth — visible when mouth open */}
        {volume > 14 && (
          <ellipse cx="50" cy="55" rx="12" ry="5" fill="white" opacity={Math.min((volume - 14) / 66, 1)} />
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
