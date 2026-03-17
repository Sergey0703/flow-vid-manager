
const Services = () => {
    return (
        <section className="v2-services" id="services">
            <div className="v2-container">
                <div className="v2-section-header center">
                    <span className="v2-section-tag">What We Build</span>
                    <h2 className="v2-section-title" style={{ animationDelay: "0.1s" }}>
                        AI Solutions That <span className="accent">Actually Work</span>
                    </h2>
                    <p className="v2-section-sub" style={{ animationDelay: "0.2s" }}>
                        Practical, deployable AI tools built for your real business problems — not demos.
                    </p>
                </div>
                <div className="v2-services-grid">
                    <div className="v2-service-card">
                        <div className="v2-service-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.05 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                        </div>
                        <h3>AI Phone Assistants</h3>
                        <p>Intelligent voice agents that answer, qualify, and handle customer calls around the clock — so you never miss a lead again.</p>
                        <a href="#contact" className="v2-service-link">Get started →</a>
                    </div>
                    <div className="v2-service-card" style={{ animationDelay: "0.1s" }}>
                        <div className="v2-service-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                        </div>
                        <h3>Smart Website Chatbots</h3>
                        <p>Conversational AI that qualifies visitors, answers FAQs, and books appointments — 24/7, on autopilot.</p>
                        <a href="#contact" className="v2-service-link">Get started →</a>
                    </div>
                    <div className="v2-service-card" style={{ animationDelay: "0.2s" }}>
                        <div className="v2-service-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                        </div>
                        <h3>Paperwork Automation</h3>
                        <p>Eliminate manual data entry and document processing with intelligent extraction and routing systems.</p>
                        <a href="#contact" className="v2-service-link">Get started →</a>
                    </div>
                    <div className="v2-service-card" style={{ animationDelay: "0.3s" }}>
                        <div className="v2-service-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
                        </div>
                        <h3>AI Marketing Videos</h3>
                        <p>Professional, conversion-focused marketing videos produced using AI — at a fraction of traditional cost and time.</p>
                        <a href="#contact" className="v2-service-link">Get started →</a>
                    </div>
                    <div className="v2-service-card" style={{ animationDelay: "0.4s" }}>
                        <div className="v2-service-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M8.46 8.46a5 5 0 0 0 0 7.07"/></svg>
                        </div>
                        <span className="v2-service-tag">LLM · RAG · Generative AI</span>
                        <h3>AI Strategy &amp; Consulting</h3>
                        <p>Not sure where to start? We assess your workflows, identify the highest-ROI opportunities, and build a custom AI roadmap — covering LLMs, RAG pipelines, AI agents, automation, and website AI integration.</p>
                        <a href="#contact" className="v2-service-link">Get started →</a>
                    </div>
                    <div className="v2-service-card" style={{ animationDelay: "0.5s" }}>
                        <div className="v2-service-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/><circle cx="7" cy="10" r="1" fill="currentColor"/><circle cx="12" cy="10" r="1" fill="currentColor"/><circle cx="17" cy="10" r="1" fill="currentColor"/><path d="M7 10h1m3 0h1m3 0h1" strokeWidth="0"/></svg>
                        </div>
                        <span className="v2-service-tag">n8n · Make · Zapier</span>
                        <h3>Workflow Automation</h3>
                        <p>Connect your apps, automate repetitive processes, and eliminate manual handoffs — using n8n, Make or Zapier. From lead routing to invoice processing, we build flows that run themselves.</p>
                        <a href="#contact" className="v2-service-link">Get started →</a>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Services;
