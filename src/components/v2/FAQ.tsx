
import { useState } from "react";
import { Plus } from "lucide-react";

const FAQ = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const questions = [
        { q: "Do I need technical knowledge to use your AI solutions?", a: "Not at all. We handle everything — design, build, testing, and deployment. We also train your team so they can manage the system confidently. No coding required on your end." },
        { q: "How long does it take to go live?", a: "Most of our solutions are live within 2–4 weeks. Complex integrations may take longer, but we always set clear timelines upfront with no surprises." },
        { q: "What's the typical ROI for businesses like mine?", a: "Most clients recover their investment within 60–90 days through saved staff hours, increased lead capture, and reduced errors. We discuss expected outcomes during the discovery call before you commit to anything." },
        { q: "Do you provide ongoing support after launch?", a: "Yes. Every solution includes an initial support period and we offer ongoing maintenance packages. Our AI systems also improve over time with usage data." },
        { q: "What industries do you work with?", a: "We've worked with healthcare, hospitality, retail, property management, professional services, and more. If your business deals with repetitive customer queries, bookings, or paperwork — AI can help." },
        { q: "What AI technologies do you use — LLM, RAG, AI agents?", a: "We build solutions using the latest AI stack: Large Language Models (LLMs) for natural language understanding, Retrieval-Augmented Generation (RAG) for knowledge-grounded chatbots, AI voice agents for phone automation, and generative AI for content and video production. Every solution is custom-built for your business needs." },
        { q: "Can you build a website with AI features or help with AI-powered SEO?", a: "Yes. We build and enhance websites with integrated AI features — live chatbots, voice assistants, lead capture automation, and AI-powered content. We also help businesses leverage AI tools for SEO optimisation, content generation, and digital marketing — keeping you ahead of the competition." },
    ];

    const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

    return (
        <section className="v2-faq" id="faq">
            <div className="v2-faq-list">
                <div className="v2-section-header center">
                    <span className="v2-section-tag">Common Questions</span>
                    <h2 className="v2-section-title" style={{ animationDelay: "0.1s" }}>
                        Everything You <span className="accent">Want to Know</span>
                    </h2>
                </div>
                {questions.map((faq, i) => (
                    <div
                        key={i}
                        className={`v2-faq-item ${openIndex === i ? 'open' : ''}`}
                    >
                        <button onClick={() => toggle(i)} className="v2-faq-q">
                            {faq.q}
                            <span className="v2-faq-icon">
                                <Plus size={12} />
                            </span>
                        </button>
                        <div className="v2-faq-a">
                            {faq.a}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default FAQ;
