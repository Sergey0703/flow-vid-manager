import type { Metadata } from "next";
import Link from "next/link";
import Navigation from "@/components/v2/Navigation";
import FooterV2 from "@/components/v2/FooterV2";

export const metadata: Metadata = {
  title: "AI Chatbot Ireland | Website Chatbot for Irish Businesses | AIMediaFlow",
  description:
    "Custom AI chatbots for Irish businesses — captures leads 24/7, answers customer questions, books appointments. Kerry, Dublin, Cork and nationwide. Free discovery call.",
  keywords:
    "AI chatbot Ireland, website chatbot Ireland, AI chatbot Kerry, chatbot for Irish business, live chat automation Ireland",
  alternates: { canonical: "/ai-chatbot-ireland" },
  openGraph: {
    title: "AI Chatbot Ireland | AIMediaFlow",
    description:
      "Custom AI chatbots for Irish SMEs — captures leads 24/7, answers questions, integrates with your website. Serving Kerry and all of Ireland.",
    url: "https://aimediaflow.net/ai-chatbot-ireland",
    images: [{ url: "https://aimediaflow.net/og-image.png", width: 1200, height: 630 }],
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is an AI chatbot and how does it help Irish businesses?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "An AI chatbot is a software program that chats with your website visitors automatically, 24/7. It answers their questions, captures their contact details, qualifies leads, and can even book appointments — all without any staff involvement. For Irish businesses, this means never missing an enquiry, even outside business hours.",
      },
    },
    {
      "@type": "Question",
      name: "How is an AI chatbot different from a basic live chat widget?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A basic live chat requires a human to respond. Our AI chatbots use Large Language Models (LLMs) trained on your business knowledge — they understand natural language, handle complex questions, and respond instantly at any time of day with no human needed.",
      },
    },
    {
      "@type": "Question",
      name: "Can the AI chatbot be trained on my business information?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. We train the chatbot on your website content, FAQs, product catalogue, pricing, and policies using RAG (Retrieval-Augmented Generation) technology. It only answers based on your actual business information — no hallucinations.",
      },
    },
    {
      "@type": "Question",
      name: "How long does it take to add an AI chatbot to my Irish business website?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Most chatbot implementations go live within 2–3 weeks. We handle everything from setup and training to integration with your website. A single line of code is all that's needed on your end.",
      },
    },
  ],
};

export default function AIChatbotIreland() {
  return (
    <div className="v2-scope">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Navigation />
      <main>
        {/* Hero */}
        <section style={{ padding: "120px 0 80px", background: "var(--v2-bg, #0a0a0f)" }}>
          <div className="v2-container" style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
            <span className="v2-section-tag">AI Chatbot Ireland</span>
            <h1 className="v2-section-title" style={{ fontSize: "clamp(2rem,5vw,3.2rem)", margin: "16px 0 24px" }}>
              Turn Website Visitors Into Customers.<br />
              <span className="accent">AI Chatbot for Irish Businesses</span>
            </h1>
            <p style={{ fontSize: "1.2rem", color: "var(--v2-text-muted, #aaa)", maxWidth: 680, margin: "0 auto 40px" }}>
              Our AI chatbots capture leads, answer questions and book appointments 24/7 — trained
              on your business knowledge. Trusted by businesses across Kerry and Ireland.
            </p>
            <Link href="/#contact" className="v2-btn-primary">
              Book a Free Discovery Call
            </Link>
          </div>
        </section>

        {/* Benefits */}
        <section style={{ padding: "80px 0", background: "var(--v2-surface, #111)" }}>
          <div className="v2-container" style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
            <div className="v2-section-header center" style={{ marginBottom: 48 }}>
              <h2 className="v2-section-title">
                What Our <span className="accent">AI Chatbots</span> Do for You
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 32 }}>
              {[
                {
                  icon: "💬",
                  title: "24/7 Lead Capture",
                  desc: "Engages every visitor the moment they land on your site — even at 2am on a Sunday. No lead left behind.",
                },
                {
                  icon: "🧠",
                  title: "Trained on Your Business",
                  desc: "Knows your products, prices, policies and FAQs. Answers accurately using your own content — no generic responses.",
                },
                {
                  icon: "📋",
                  title: "Qualifies Prospects",
                  desc: "Asks smart questions to identify serious buyers and passes hot leads directly to your sales team.",
                },
                {
                  icon: "🔗",
                  title: "Integrates with Your Tools",
                  desc: "Connects to your CRM, calendar, email and WhatsApp. Works with HubSpot, Salesforce, Google Calendar and more.",
                },
                {
                  icon: "📊",
                  title: "Full Analytics",
                  desc: "See exactly what your customers are asking, where they drop off, and how many leads the chatbot generates each week.",
                },
                {
                  icon: "🚀",
                  title: "One Line of Code to Install",
                  desc: "Paste a single snippet into your website and it's live. Works with WordPress, Shopify, Wix, custom sites and more.",
                },
              ].map((item) => (
                <div key={item.title} className="v2-service-card" style={{ padding: 32 }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>{item.icon}</div>
                  <h3 style={{ fontSize: "1.15rem", marginBottom: 12, color: "var(--v2-text, #fff)" }}>{item.title}</h3>
                  <p style={{ color: "var(--v2-text-muted, #aaa)", lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section style={{ padding: "80px 0", background: "var(--v2-bg, #0a0a0f)" }}>
          <div className="v2-container" style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
            <div className="v2-section-header center" style={{ marginBottom: 48 }}>
              <h2 className="v2-section-title">How We Build Your <span className="accent">AI Chatbot</span></h2>
            </div>
            {[
              { step: "01", title: "Discovery Call", desc: "We learn about your business, your customers' most common questions, and your goals." },
              { step: "02", title: "Knowledge Base Setup", desc: "We train the AI on your website, documents, product catalogue and FAQs using RAG technology." },
              { step: "03", title: "Design & Integration", desc: "We design the chat widget to match your brand and integrate it with your existing tools." },
              { step: "04", title: "Testing & Launch", desc: "Thorough testing, fine-tuning, and a live launch — usually within 2–3 weeks." },
              { step: "05", title: "Ongoing Optimisation", desc: "We monitor performance and keep the chatbot updated as your business evolves." },
            ].map((item) => (
              <div key={item.step} style={{ display: "flex", gap: 24, marginBottom: 40, alignItems: "flex-start" }}>
                <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--v2-accent, #44C8F5)", minWidth: 56 }}>{item.step}</div>
                <div>
                  <h3 style={{ fontSize: "1.1rem", marginBottom: 8, color: "var(--v2-text, #fff)" }}>{item.title}</h3>
                  <p style={{ color: "var(--v2-text-muted, #aaa)", lineHeight: 1.7 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section style={{ padding: "80px 0", background: "var(--v2-surface, #111)" }}>
          <div className="v2-container" style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
            <div className="v2-section-header center" style={{ marginBottom: 48 }}>
              <h2 className="v2-section-title">Frequently Asked <span className="accent">Questions</span></h2>
            </div>
            {faqSchema.mainEntity.map((item) => (
              <div key={item.name} style={{ marginBottom: 32, borderBottom: "1px solid var(--v2-border, #222)", paddingBottom: 32 }}>
                <h3 style={{ fontSize: "1.05rem", marginBottom: 12, color: "var(--v2-text, #fff)" }}>{item.name}</h3>
                <p style={{ color: "var(--v2-text-muted, #aaa)", lineHeight: 1.7 }}>{item.acceptedAnswer.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding: "80px 0", background: "var(--v2-bg, #0a0a0f)", textAlign: "center" }}>
          <div className="v2-container" style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px" }}>
            <h2 className="v2-section-title" style={{ marginBottom: 16 }}>
              Ready to Add an <span className="accent">AI Chatbot</span> to Your Website?
            </h2>
            <p style={{ color: "var(--v2-text-muted, #aaa)", marginBottom: 40, fontSize: "1.1rem" }}>
              Book a free 30-minute call and we'll show you a live demo of what an AI chatbot
              would look and work like on your Irish business website.
            </p>
            <Link href="/#contact" className="v2-btn-primary">
              Get a Free Demo
            </Link>
          </div>
        </section>
      </main>
      <FooterV2 />
    </div>
  );
}
