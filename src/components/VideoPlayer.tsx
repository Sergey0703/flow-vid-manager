import { useState } from "react";

interface VideoPlayerProps {
  src: string;
  title: string;
  description: string;
  posterUrl?: string;
}

const VideoPlayer = ({ src, title, description, posterUrl }: VideoPlayerProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="group relative overflow-hidden rounded-xl card-gradient shadow-card glow-effect">
      {/* Video Container */}
      <div className="relative aspect-video overflow-hidden rounded-t-xl bg-muted">
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/50 backdrop-blur-sm z-10">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              <span className="text-sm text-muted-foreground">Loading video...</span>
            </div>
          </div>
        )}

        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/50 backdrop-blur-sm z-10">
            <div className="text-center">
              <div className="mb-2 text-destructive">⚠️</div>
              <span className="text-sm text-muted-foreground">Failed to load video</span>
            </div>
          </div>
        )}
        
        <video
          src={src}
          controls
          preload="metadata"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          onLoadStart={() => {
            setIsLoading(true);
            setHasError(false);
          }}
          onCanPlay={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          poster={posterUrl || "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyMCIgaGVpZ2h0PSIxMDgwIiB2aWV3Qm94PSIwIDAgMTkyMCAxMDgwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTkyMCIgaGVpZ2h0PSIxMDgwIiBmaWxsPSJoc2woMjIwIDI1JSAxMiUpIi8+CjxjaXJjbGUgY3g9Ijk2MCIgY3k9IjU0MCIgcj0iNjAiIGZpbGw9ImhzbCgxOTAgMTAwJSA1MCUpIiBmaWxsLW9wYWNpdHk9IjAuOCIvPgo8cGF0aCBkPSJNOTMwIDUwNUw5OTAgNTQwTDkzMCA1NzVWNTA1WiIgZmlsbD0iaHNsKDIyMCAyMCUgOCUpIi8+Cjwvc3ZnPgo="}
        />
      </div>
      
      {/* Content */}
      <div className="p-6">
        <h3 className="mb-3 text-xl font-bold text-foreground group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
};

export default VideoPlayer;