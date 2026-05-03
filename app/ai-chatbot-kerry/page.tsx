import type { Metadata } from "next";
import Link from "next/link";
import Navigation from "@/components/v2/Navigation";
import FooterV2 from "@/components/v2/FooterV2";
import ThemeScope from "@/components/v2/ThemeScope";

export const metadata: Metadata = {
  title: "AI Chatbot Kerry | Website Chatbot for Kerry Businesses | AIMediaFlow",
  description:
    "AI chatbot for Kerry businesses — captures leads 24/7, answers customer questions, books appointments automatically. Based in Killarney, serving Kerry businesses. Free demo.",
  keywords:
    "AI chatbot Kerry, chatbot Killarney, AI chatbot Kerry business, website chatbot Kerry, AI assistant Kerry, chatbot Tralee, chatbot Kenmare",
  alternates: { canonical: "/ai-chatbot-kerry" },
  openGraph: {
    title: "AI Chatbot Kerry | AIMediaFlow — Killarney",
    description:
      "Kerry-based AI chatbot service. Captures leads 24/7, books appointments, answers questions — trained on your business. Serving Killarney, Tralee, Kenmare and all of Kerry.",
    url: "https://aimediaflow.net/ai-chatbot-kerry",
    images: [{ url: "https://aimediaflow.net/og-image.png", width: 1200, height: 630 }],
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Do you offer AI chatbots for small businesses in Kerry?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. We are based in Killarney, Kerry and specialise in AI chatbots for small and medium businesses across Kerry — including hotels, restaurants, dental clinics, legal firms and retail shops. We offer a free discovery call to show you exactly what a chatbot would look like on your website.",
      },
    },
    {
      "@type": "Question",
      name: "How much does an AI chatbot cost for a Kerry business?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Pricing depends on the complexity of your business and integrations needed. Most Kerry SMEs start from a one-off setup fee plus a small monthly maintenance cost. Contact us for a free quote tailored to your specific business.",
      },
    },
    {
      "@type": "Question",
      name: "Can the chatbot handle bookings for Kerry hotels and restaurants?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Our AI chatbots integrate with booking systems and calendars to handle reservations automatically. For hotels, restaurants and B&Bs in Kerry, this means capturing bookings 24/7 — even when staff are unavailable.",
      },
    },
    {
      "@type": "Question",
      name: "How quickly can you set up a chatbot for my Kerry business?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Most Kerry business chatbots go live within 2–3 weeks. We handle everything — setup, training on your content, design and integration. Being based in Killarney means we can meet in person if needed.",
      },
    },
  ],
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "AIMediaFlow",
  description: "AI chatbot and automation services for Kerry businesses. Based in Killarney.",
  url: "https://aimediaflow.net",
  telephone: "+353852007612",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Killarney",
    addressRegion: "Kerry",
    addressCountry: "IE",
  },
  areaServed: [
    { "@type": "City", name: "Killarney" },
    { "@type": "City", name: "Tralee" },
    { "@type": "City", name: "Kenmare" },
    { "@type": "City", name: "Killorglin" },
    { "@type": "City", name: "Listowel" },
    { "@type": "City", name: "Dingle" },
    { "@type": "AdministrativeArea", name: "Kerry" },
  ],
};

export default function AIChatbotKerry() {
  return (
    <ThemeScope>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <Navigation />
      <main>
        {/* Hero */}
        <section className="v2-seo-section-a" style={{ padding: "120px 0 80px" }}>
          <div className="v2-container" style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
            <span className="v2-section-tag">AI Chatbot Kerry — Based in Killarney</span>
            <h1 className="v2-section-title" style={{ fontSize: "clamp(2rem,5vw,3.2rem)", margin: "16px 0 24px" }}>
              AI Chatbot for Kerry Businesses.<br />
              <span className="accent">Built Local. Works 24/7.</span>
            </h1>
            <p className="v2-seo-desc" style={{ fontSize: "1.2rem", maxWidth: 680, margin: "0 auto 40px" }}>
              We are a Killarney-based AI agency helping Kerry businesses capture more leads,
              answer customer questions automatically and book appointments around the clock —
              no extra staff needed.
            </p>
            <Link href="/#contact" className="v2-btn-primary">
              Get a Free Demo
            </Link>
          </div>
        </section>

        {/* Local trust section */}
        <section className="v2-seo-section-b" style={{ padding: "60px 0" }}>
          <div className="v2-container" style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
            <h2 className="v2-section-title" style={{ marginBottom: 24 }}>
              Kerry&rsquo;s Local <span className="accent">AI Chatbot</span> Specialists
            </h2>
            <p className="v2-seo-desc" style={{ fontSize: "1.1rem", maxWidth: 720, margin: "0 auto 32px" }}>
              Unlike generic chatbot providers, we are based in Killarney and understand Kerry
              businesses. We work with hotels in Killarney, restaurants in Kenmare, dental clinics
              in Tralee and solicitor firms across the county. When you work with us, you get a
              local team that knows your market — and an AI chatbot trained specifically on your
              business.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
              {["Killarney", "Tralee", "Kenmare", "Killorglin", "Listowel", "Dingle", "Cahersiveen"].map((city) => (
                <span key={city} className="v2-section-tag" style={{ margin: 0 }}>{city}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Who we help */}
        <section className="v2-seo-section-a" style={{ padding: "80px 0" }}>
          <div className="v2-container" style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
            <div className="v2-section-header center" style={{ marginBottom: 48 }}>
              <h2 className="v2-section-title">
                Kerry Businesses We <span className="accent">Help</span>
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 32 }}>
              {[
                { icon: "🏨", title: "Hotels & B&Bs", desc: "Handle room availability questions, capture booking enquiries and direct guests to your reservation system — 24/7, even during peak tourist season." },
                { icon: "🍽️", title: "Restaurants & Cafés", desc: "Take table reservation requests, answer menu and allergy questions, and handle event enquiries automatically." },
                { icon: "🦷", title: "Dental Clinics", desc: "Book appointments, answer questions about treatments and prices, and capture new patient enquiries outside clinic hours." },
                { icon: "⚖️", title: "Solicitor Firms", desc: "Qualify new client enquiries, answer common legal questions and book consultations — without your staff lifting a finger." },
                { icon: "🏠", title: "Estate Agents", desc: "Answer property questions, book viewings and capture buyer and seller leads around the clock." },
                { icon: "🛍️", title: "Retail & Services", desc: "Handle stock questions, opening hours, pricing and bookings for any Kerry retail or service business." },
              ].map((item) => (
                <div key={item.title} className="v2-service-card" style={{ padding: 32 }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>{item.icon}</div>
                  <h3 className="v2-seo-card-title" style={{ fontSize: "1.15rem", marginBottom: 12 }}>{item.title}</h3>
                  <p className="v2-seo-desc">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="v2-seo-section-b" style={{ padding: "80px 0" }}>
          <div className="v2-container" style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
            <div className="v2-section-header center" style={{ marginBottom: 48 }}>
              <h2 className="v2-section-title">
                What Our <span className="accent">AI Chatbots</span> Do for Kerry Businesses
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 32 }}>
              {[
                { icon: "💬", title: "24/7 Lead Capture", desc: "Engages every visitor the moment they land on your site — even at 2am during busy Kerry tourist season. No lead left behind." },
                { icon: "🧠", title: "Trained on Your Business", desc: "Knows your specific services, prices, policies and FAQs. Answers Kerry customers accurately using your own content." },
                { icon: "📋", title: "Qualifies Enquiries", desc: "Asks smart questions to identify serious buyers and passes hot leads directly to you or your team." },
                { icon: "📅", title: "Books Appointments", desc: "Connects to your calendar and books appointments automatically — no back-and-forth emails or missed calls." },
                { icon: "📱", title: "WhatsApp & Web", desc: "Works on your website and WhatsApp — meet Kerry customers where they already are." },
                { icon: "🚀", title: "Quick Setup", desc: "Most Kerry business chatbots go live in 2–3 weeks. One line of code on your website is all it takes." },
              ].map((item) => (
                <div key={item.title} className="v2-service-card" style={{ padding: 32 }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>{item.icon}</div>
                  <h3 className="v2-seo-card-title" style={{ fontSize: "1.15rem", marginBottom: 12 }}>{item.title}</h3>
                  <p className="v2-seo-desc">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="v2-seo-section-a" style={{ padding: "80px 0" }}>
          <div className="v2-container" style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
            <div className="v2-section-header center" style={{ marginBottom: 48 }}>
              <h2 className="v2-section-title">Frequently Asked <span className="accent">Questions</span></h2>
            </div>
            {faqSchema.mainEntity.map((item) => (
              <div key={item.name} className="v2-seo-faq-item">
                <h3 className="v2-seo-card-title" style={{ fontSize: "1.05rem", marginBottom: 12 }}>{item.name}</h3>
                <p className="v2-seo-desc" style={{ lineHeight: 1.7 }}>{item.acceptedAnswer.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Internal links */}
        <section className="v2-seo-section-b" style={{ padding: "60px 0" }}>
          <div className="v2-container" style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
            <h2 className="v2-section-title" style={{ marginBottom: 32 }}>
              More <span className="accent">AI Services</span> for Kerry Businesses
            </h2>
            <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
              <Link href="/ai-chatbot-ireland" className="v2-btn-secondary">AI Chatbot Ireland</Link>
              <Link href="/business-automation-killarney" className="v2-btn-secondary">Business Automation Killarney</Link>
              <Link href="/ai-phone-assistant-kerry" className="v2-btn-secondary">AI Phone Assistant Kerry</Link>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="v2-seo-section-a" style={{ padding: "80px 0", textAlign: "center" }}>
          <div className="v2-container" style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px" }}>
            <h2 className="v2-section-title" style={{ marginBottom: 16 }}>
              Ready to Grow Your <span className="accent">Kerry Business</span> with AI?
            </h2>
            <p className="v2-seo-desc" style={{ marginBottom: 40, fontSize: "1.1rem" }}>
              Book a free 30-minute call with our Killarney team. We&apos;ll show you a live demo
              of what an AI chatbot would look and work like on your Kerry business website.
            </p>
            <Link href="/#contact" className="v2-btn-primary">
              Book a Free Call
            </Link>
          </div>
        </section>
      </main>
      <FooterV2 />
    </ThemeScope>
  );
}
