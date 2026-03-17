import type { Metadata } from "next";
import Link from "next/link";
import Navigation from "@/components/v2/Navigation";
import FooterV2 from "@/components/v2/FooterV2";

export const metadata: Metadata = {
  title: "AI Phone Assistant Kerry | 24/7 AI Receptionist for Kerry Businesses | AIMediaFlow",
  description:
    "AI phone assistant for Kerry businesses — answers every call 24/7, books appointments, qualifies leads. Serving Killarney, Tralee, Listowel, Dingle. Free discovery call.",
  keywords:
    "AI phone assistant Kerry, AI receptionist Kerry, AI answering service Killarney, automated phone system Kerry, AI voice agent Ireland",
  alternates: { canonical: "/ai-phone-assistant-kerry" },
  openGraph: {
    title: "AI Phone Assistant Kerry | AIMediaFlow",
    description:
      "Never miss a call again. AI phone assistant for Kerry businesses answers 24/7, books appointments and qualifies leads automatically.",
    url: "https://aimediaflow.net/ai-phone-assistant-kerry",
    images: [{ url: "https://aimediaflow.net/og-image.png", width: 1200, height: 630 }],
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is an AI phone assistant for Kerry businesses?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "An AI phone assistant answers your business calls automatically, 24/7. It qualifies leads, books appointments, answers common questions and takes messages — like a human receptionist but at a fraction of the cost. Perfect for Kerry SMEs in Killarney, Tralee, Listowel and Dingle.",
      },
    },
    {
      "@type": "Question",
      name: "How much does an AI phone assistant cost in Ireland?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Our AI phone assistant packages start from a one-time setup fee plus a monthly subscription. Most Kerry businesses recover their investment within 60–90 days through saved staff hours and increased lead capture. Contact us for a custom quote.",
      },
    },
    {
      "@type": "Question",
      name: "Can the AI phone assistant book appointments?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. The AI connects to your calendar and books appointments in real time during the call. It can also send confirmation SMS or emails to your customers automatically.",
      },
    },
    {
      "@type": "Question",
      name: "How long does it take to set up an AI phone assistant?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Most AI phone assistant implementations go live within 2–4 weeks. We handle all setup, training, and testing. No technical knowledge required from your side.",
      },
    },
  ],
};

export default function AIPhoneAssistantKerry() {
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
            <span className="v2-section-tag">AI Phone Assistant Kerry</span>
            <h1 className="v2-section-title" style={{ fontSize: "clamp(2rem,5vw,3.2rem)", margin: "16px 0 24px" }}>
              Never Miss a Call Again.<br />
              <span className="accent">AI Receptionist for Kerry Businesses</span>
            </h1>
            <p style={{ fontSize: "1.2rem", color: "var(--v2-text-muted, #aaa)", maxWidth: 680, margin: "0 auto 40px" }}>
              Our AI phone assistant answers every call 24/7 — qualifying leads, booking appointments
              and handling enquiries automatically. Serving businesses in Killarney, Tralee, Listowel,
              Dingle and across Kerry.
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
                Why Kerry Businesses Choose <span className="accent">AI Phone Assistants</span>
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 32 }}>
              {[
                {
                  icon: "📞",
                  title: "Answers Every Call, 24/7",
                  desc: "No more missed calls after hours or during busy periods. Every enquiry is captured and handled professionally.",
                },
                {
                  icon: "📅",
                  title: "Books Appointments Automatically",
                  desc: "The AI connects to your calendar and schedules appointments in real time during the call — no double-bookings.",
                },
                {
                  icon: "🎯",
                  title: "Qualifies Leads Instantly",
                  desc: "Asks the right questions to filter serious customers from casual enquiries, so your team focuses on what matters.",
                },
                {
                  icon: "💰",
                  title: "Costs Less Than a Receptionist",
                  desc: "A full-time receptionist in Kerry costs €28,000–€35,000/year. Our AI handles the same workload at a fraction of the cost.",
                },
                {
                  icon: "🌐",
                  title: "Works in Any Language",
                  desc: "Serve international tourists and customers in Kerry in English, Irish, or any other language.",
                },
                {
                  icon: "⚡",
                  title: "Live in 2–4 Weeks",
                  desc: "We handle all setup and training. Your AI phone assistant is live and taking calls within weeks, not months.",
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

        {/* Use Cases */}
        <section style={{ padding: "80px 0", background: "var(--v2-bg, #0a0a0f)" }}>
          <div className="v2-container" style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px" }}>
            <div className="v2-section-header center" style={{ marginBottom: 48 }}>
              <h2 className="v2-section-title">
                Perfect for Kerry <span className="accent">Businesses Like Yours</span>
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24 }}>
              {[
                { title: "Hotels & B&Bs", desc: "Handle booking enquiries and room availability queries 24/7 — vital during Kerry's busy tourist season." },
                { title: "Medical & Dental Clinics", desc: "Book appointments, handle repeat prescription requests, and reduce front desk workload." },
                { title: "Estate Agents", desc: "Qualify property buyers and tenants, schedule viewings automatically." },
                { title: "Restaurants & Cafés", desc: "Take table reservations and answer menu questions even when you're busy serving customers." },
                { title: "Tradespeople & Contractors", desc: "Never miss a job enquiry while on site — AI captures the lead and schedules a callback." },
                { title: "Professional Services", desc: "Law firms, accountants and consultants — qualify potential clients before they reach your team." },
              ].map((item) => (
                <div key={item.title} style={{ padding: "24px", border: "1px solid var(--v2-border, #222)", borderRadius: 12 }}>
                  <h3 style={{ fontSize: "1rem", marginBottom: 8, color: "var(--v2-accent, #44C8F5)" }}>{item.title}</h3>
                  <p style={{ color: "var(--v2-text-muted, #aaa)", fontSize: "0.9rem", lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              ))}
            </div>
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
              Ready to Stop <span className="accent">Missing Calls?</span>
            </h2>
            <p style={{ color: "var(--v2-text-muted, #aaa)", marginBottom: 40, fontSize: "1.1rem" }}>
              Book a free 30-minute discovery call. We'll show you exactly how an AI phone assistant
              would work for your Kerry business — no commitment required.
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
