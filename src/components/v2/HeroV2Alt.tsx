
const HeroV2Alt = () => {
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

                {/* Right: graphic module */}
                <div className="v2-hero-alt-graphic">
                    <div className="v2-hero-alt-card v2-hero-alt-card-main">
                        <div className="v2-hero-alt-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
                                <path d="M12 6v6l4 2"/>
                            </svg>
                        </div>
                        <div className="v2-hero-alt-card-label">24/7 AI Systems</div>
                        <div className="v2-hero-alt-card-value">Always On</div>
                    </div>

                    <div className="v2-hero-alt-card v2-hero-alt-card-accent">
                        <div className="v2-hero-alt-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect x="2" y="3" width="20" height="14" rx="2"/>
                                <path d="M8 21h8M12 17v4"/>
                            </svg>
                        </div>
                        <div className="v2-hero-alt-card-label">Workflow Automation</div>
                        <div className="v2-hero-alt-card-value">Invoicing · Scheduling · Support</div>
                    </div>

                    <div className="v2-hero-alt-card v2-hero-alt-card-purple">
                        <div className="v2-hero-alt-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                        </div>
                        <div className="v2-hero-alt-card-label">AI Chatbots</div>
                        <div className="v2-hero-alt-card-value">Custom-Built · No Templates</div>
                    </div>

                    <div className="v2-hero-alt-badge-row">
                        <span className="v2-hero-alt-pill">Kerry, Ireland</span>
                        <span className="v2-hero-alt-pill">Wild Atlantic Way</span>
                        <span className="v2-hero-alt-pill">Global Clients</span>
                    </div>
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
