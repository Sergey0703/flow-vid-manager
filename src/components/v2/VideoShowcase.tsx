
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

interface Video {
    id: string;
    title: string;
    description: string;
    url: string;
    thumbnail_url?: string;
}

interface VideoShowcaseProps {
    videos: Video[];
}

const VideoShowcase = ({ videos }: VideoShowcaseProps) => {
    return (
        <section className="v2-work" id="work">
            <div className="v2-container">
                <div className="v2-section-header center">
                    <span className="v2-section-tag">See It In Action</span>
                    <h2 className="v2-section-title" style={{ animationDelay: "0.1s" }}>
                        Real AI Solutions We <span className="accent">Already Built</span>
                    </h2>
                    <p className="v2-section-sub" style={{ animationDelay: "0.2s" }}>
                        Watch how we're using AI to transform the way businesses operate — from calls to contracts to accounting.
                    </p>
                </div>
                <div className="v2-work-grid">
                    {videos.map((video, index) => (
                        <Dialog key={video.id}>
                            <DialogTrigger asChild>
                                <div className="v2-work-card" style={{ animationDelay: `${index * 0.1}s` }}>
                                    <div className="v2-work-tag">AI Solution</div>
                                    {/* Added Thumbnail for User Feedback */}
                                    {video.thumbnail_url && (
                                        <div className="v2-work-thumb">
                                            <img src={video.thumbnail_url} alt={video.title} loading="lazy" />
                                        </div>
                                    )}
                                    <div className="v2-work-play">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                    </div>
                                    <div className="v2-work-title">{video.title}</div>
                                    <div className="v2-work-desc">{video.description}</div>
                                    <div className="v2-work-cta">Get something like this →</div>
                                </div>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl bg-black border-[var(--v2-border)] p-0 overflow-hidden sm:max-w-[90vw] lg:max-w-4xl">
                                <div className="aspect-video w-full bg-black">
                                    <video
                                        src={video.url}
                                        controls
                                        autoPlay
                                        className="w-full h-full"
                                        poster={video.thumbnail_url}
                                    >
                                        Your browser does not support the video tag.
                                    </video>
                                </div>
                            </DialogContent>
                        </Dialog>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default VideoShowcase;
