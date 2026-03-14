import { useEffect, useRef } from 'react';

interface SimliAvatarProps {
  agentStream: MediaStream | null;
  agentState: 'idle' | 'connecting' | 'connected';
  videoStream?: MediaStream | null;
}

/**
 * SimliAvatar — shows a static preview image in idle state,
 * switches to live Simli video stream when connected.
 * The video track comes from LiveKit as a regular video track
 * published by the Simli avatar participant.
 */
const SimliAvatar = ({ agentStream, agentState, videoStream }: SimliAvatarProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    const stream = videoStream ?? null;
    if (stream && agentState === 'connected') {
      videoRef.current.srcObject = stream;
    } else {
      videoRef.current.srcObject = null;
    }
  }, [videoStream, agentState]);

  const showVideo = agentState === 'connected' && !!videoStream;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Static preview — visible in idle/connecting */}
      <img
        src="/simli-avatar.webp"
        alt="Sophie avatar"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: showVideo ? 'none' : 'block',
          borderRadius: 'inherit',
        }}
      />
      {/* Live video — visible when connected and stream available */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: showVideo ? 'block' : 'none',
          borderRadius: 'inherit',
        }}
      />
    </div>
  );
};

export default SimliAvatar;
