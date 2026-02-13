
const HeroV2 = () => {
    return (
        <section className="v2-hero">
            <div className="v2-hero-bg">
                <div className="v2-orb v2-orb-1"></div>
                <div className="v2-orb v2-orb-2"></div>
                <div className="v2-orb v2-orb-3"></div>
            </div>

            <div className="v2-hero-img">
                <img src="/lovable-uploads/futuristic-team-banner.webp" alt="" aria-hidden="true" />
            </div>

            <div className="v2-hero-overlay"></div>

            <div className="v2-hero-content">
                <div className="v2-hero-badge">
                    <span className="dot"></span>
                    Kerry's Leading AI Agency
                </div>

                <h1>
                    <span className="ai">AI</span>MediaFlow
                </h1>

                <p className="v2-hero-tagline">
                    AI-Staff for Your Operations: <span className="highlight">Automate Invoicing, Scheduling and Support Instantly</span>
                </p>

                <p className="v2-hero-desc">
                    Stop manual work. We deploy intelligent AI systems that handle your repetitive tasks,
                    so your team can focus on growth.
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

            <div className="v2-scroll-hint">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
                Scroll to explore
            </div>
        </section>
    );
};

export default HeroV2;
