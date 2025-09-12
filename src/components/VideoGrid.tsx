import VideoPlayer from "./VideoPlayer";

interface Video {
  id: string;
  title: string;
  description: string;
  url: string;
  is_published: boolean;
  sort_order: number;
  thumbnail_url?: string;
}

interface VideoGridProps {
  videos: Video[];
}

const VideoGrid = ({ videos }: VideoGridProps) => {
  // Filter and sort videos
  const publishedVideos = videos
    .filter(video => video.is_published)
    .sort((a, b) => a.sort_order - b.sort_order);

  if (publishedVideos.length === 0) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-md text-center">
            <div className="mb-4 rounded-full bg-muted/50 p-4 inline-block">
              <svg className="h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-semibold text-foreground">No Videos Available</h3>
            <p className="text-muted-foreground">
              Videos will appear here once they are published. Check back soon!
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold lg:text-4xl">
            Our <span className="gradient-text">AI Solutions</span> in Action
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Discover how our AI-powered solutions transform business processes and drive efficiency.
          </p>
        </div>
        
        <div className="grid gap-8 md:grid-cols-2">
          {publishedVideos.map((video) => (
            <VideoPlayer
              key={video.id}
              src={video.url}
              title={video.title}
              description={video.description}
              posterUrl={video.thumbnail_url}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default VideoGrid;