
const HowItWorks = () => {
    return (
        <section className="v2-how" id="how">
            <div className="v2-container">
                <div className="v2-section-header center">
                    <span className="v2-section-tag">Our Process</span>
                    <h2 className="v2-section-title" style={{ animationDelay: "0.1s" }}>
                        From First Call to <span className="accent">Live in Weeks</span>
                    </h2>
                    <p className="v2-section-sub" style={{ animationDelay: "0.2s" }}>
                        A clear, fast process with no jargon — just results.
                    </p>
                </div>
                <div className="v2-how-steps">
                    <div className="v2-how-step">
                        <div className="v2-how-step-num">01</div>
                        <span className="v2-how-tag">Free · 30 min</span>
                        <h3>Discovery Call</h3>
                        <p>We learn about your business, your biggest bottlenecks, and where AI can have the fastest impact.</p>
                    </div>
                    <div className="v2-how-step" style={{ animationDelay: "0.1s" }}>
                        <div className="v2-how-step-num">02</div>
                        <span className="v2-how-tag">Week 1–2</span>
                        <h3>Custom AI Strategy</h3>
                        <p>We design a tailored solution specifically for your workflows — no off-the-shelf templates.</p>
                    </div>
                    <div className="v2-how-step" style={{ animationDelay: "0.2s" }}>
                        <div className="v2-how-step-num">03</div>
                        <span className="v2-how-tag">Week 2–4</span>
                        <h3>Build & Deploy</h3>
                        <p>Your AI system goes live, fully tested, with training for your team and ongoing support included.</p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HowItWorks;
