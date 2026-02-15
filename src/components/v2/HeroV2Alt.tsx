
import { useEffect, useRef } from "react";

const HeroV2Alt = () => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        video.currentTime = 0;
                        video.play();
                    } else {
                        video.pause();
                    }
                });
            },
            { threshold: 0.3 }
        );

        observer.observe(video);
        return () => observer.disconnect();
    }, []);

    return (
        <section className="v2-hero v2-hero-alt">
            <div className="v2-hero-bg">
                <div className="v2-orb v2-orb-1"></div>
                <div className="v2-orb v2-orb-2"></div>
                <div className="v2-orb v2-orb-3"></div>
            </div>

            <div className="v2-hero-alt-grid">
                {/* Left: text */}
                <div className="v2-hero-alt-text">
                    <div className="v2-hero-badge">
                        <span className="dot"></span>
                        Kerry's Leading AI Agency
                    </div>

                    <h1 className="v2-hero-alt-h1">
                        <span className="ai">AI</span>MediaFlow:<br />
                        <span className="v2-hero-alt-sub">Rooted in Kerry.<br />Global reach.</span>
                    </h1>

                    <p className="v2-hero-desc" style={{ maxWidth: '520px' }}>
                        AIMediaFlow is an AI agency born on the Wild Atlantic Way, bringing world-class
                        artificial intelligence and workflow automation to media businesses of every scale.
                        We combine deep technical expertise with a founder's understanding of what it takes
                        to produce great content at pace.
                    </p>

                    <div className="v2-hero-actions">
                        <a href="#contact" className="v2-btn v2-btn-primary">
                            Book a Demo
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                        </a>
                        <a href="#work" className="v2-btn v2-btn-ghost">
                            See Our Work
                        </a>
                    </div>
                </div>

                {/* Right: video */}
                <div className="v2-hero-alt-video-wrap">
                    <video
                        ref={videoRef}
                        src="/hero/hero3.mp4"
                        poster="/hero/hero.png"
                        muted
                        playsInline
                        className="v2-hero-alt-video"
                    />
                </div>
            </div>

            <div className="v2-scroll-hint">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
                Scroll to explore
            </div>
        </section>
    );
};

export default HeroV2Alt;
