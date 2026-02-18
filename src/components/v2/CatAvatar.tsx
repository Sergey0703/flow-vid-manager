
interface CatAvatarProps {
  /** 0–255 volume level */
  volume: number;
  /** 'idle' | 'connecting' | 'connected' */
  agentState: 'idle' | 'connecting' | 'connected';
}

// 4 sprite frames: cat_0=closed, cat_1=slight, cat_2=open, cat_3=wide
const getFrame = (volume: number): number => {
  if (volume < 15)  return 0;
  if (volume < 60)  return 1;
  if (volume < 130) return 2;
  return 3;
};

const CatAvatar = ({ volume, agentState }: CatAvatarProps) => {
  const frame = getFrame(volume);

  return (
    <div className="cat-avatar-wrap">
      <img
        src={`/cat_${frame}.png`}
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
