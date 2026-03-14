import { useEffect, useRef } from 'react';

interface SimliAvatarProps {
  agentStream: MediaStream | null;
  agentState: 'idle' | 'connecting' | 'connected';
  videoStream?: MediaStream | null;
}

const SimliAvatar = ({ agentState, videoStream }: SimliAvatarProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    if (videoStream && agentState === 'connected') {
      videoRef.current.srcObject = videoStream;
    } else {
      videoRef.current.srcObject = null;
    }
  }, [videoStream, agentState]);

  const showVideo = agentState === 'connected' && !!videoStream;

  return (
    <div className="simli-avatar-wrap">
      <img
        src="/simli-avatar.webp"
        alt="Sophie"
        style={{ display: showVideo ? 'none' : 'block' }}
      />
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ display: showVideo ? 'block' : 'none' }}
      />
    </div>
  );
};

export default SimliAvatar;
