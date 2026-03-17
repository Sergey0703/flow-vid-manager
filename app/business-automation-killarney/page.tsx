import type { Metadata } from "next";
import Link from "next/link";
import Navigation from "@/components/v2/Navigation";
import FooterV2 from "@/components/v2/FooterV2";

export const metadata: Metadata = {
  title: "Business Automation Killarney & Kerry | AI Process Automation | AIMediaFlow",
  description:
    "Business process automation for Killarney & Kerry businesses — automate admin, invoicing, bookings, emails. Save 10+ hours per week. Free discovery call with AIMediaFlow.",
  keywords:
    "business automation Killarney, business automation Kerry, AI automation Ireland, process automation Kerry, workflow automation Killarney, n8n automation Ireland",
  alternates: { canonical: "/business-automation-killarney" },
  openGraph: {
    title: "Business Automation Killarney & Kerry | AIMediaFlow",
    description:
      "Automate repetitive admin tasks for your Killarney or Kerry business. Save hours every week with AI-powered workflow automation.",
    url: "https://aimediaflow.net/business-automation-killarney",
    images: [{ url: "https://aimediaflow.net/og-image.png", width: 1200, height: 630 }],
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What business processes can be automated in Killarney?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We can automate invoice processing, appointment reminders, customer follow-up emails, stock updates, social media posting, data entry, report generation, and much more. If your team does the same task repeatedly, it can almost certainly be automated.",
      },
    },
    {
      "@type": "Question",
      name: "What automation tools do you use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We use n8n, Make (formerly Integromat), and Zapier to connect your existing tools — accounting software, CRM, booking systems, email, WhatsApp, and more. We also build custom AI agents for more complex automation needs.",
      },
    },
    {
      "@type": "Question",
      name: "How much time will automation save my Kerry business?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Most of our Kerry clients save between 10 and 25 hours per week after implementing business automation. The exact saving depends on your current processes, but we calculate expected ROI during our free discovery call before you commit.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need to change my existing software to use automation?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. We connect to your existing tools — whatever accounting, booking, or CRM software you already use. Our automation works alongside your current setup without requiring you to switch platforms.",
      },
    },
  ],
};

export default function BusinessAutomationKillarney() {
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
            <span className="v2-section-tag">Business Automation Killarney & Kerry</span>
            <h1 className="v2-section-title" style={{ fontSize: "clamp(2rem,5vw,3.2rem)", margin: "16px 0 24px" }}>
              Stop Doing Repetitive Tasks.<br />
              <span className="accent">Automate Your Kerry Business</span>
            </h1>
            <p style={{ fontSize: "1.2rem", color: "var(--v2-text-muted, #aaa)", maxWidth: 680, margin: "0 auto 40px" }}>
              We automate time-consuming admin tasks so you and your team can focus on growing your
              business. Kerry and Killarney SMEs save 10–25 hours every week with our AI automation solutions.
            </p>
            <Link href="/#contact" className="v2-btn-primary">
              Book a Free Discovery Call
            </Link>
          </div>
        </section>

        {/* What We Automate */}
        <section style={{ padding: "80px 0", background: "var(--v2-surface, #111)" }}>
          <div className="v2-container" style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
            <div className="v2-section-header center" style={{ marginBottom: 48 }}>
              <h2 className="v2-section-title">
                Tasks We <span className="accent">Automate</span> for Kerry Businesses
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 32 }}>
              {[
                {
                  icon: "🧾",
                  title: "Invoice & Payments",
                  desc: "Auto-generate invoices, send payment reminders, and reconcile payments — directly from your accounting software.",
                },
                {
                  icon: "📅",
                  title: "Appointment Reminders",
                  desc: "Automatically send SMS and email reminders to reduce no-shows. Works with any booking system.",
                },
                {
                  icon: "📧",
                  title: "Customer Follow-Ups",
                  desc: "Trigger personalised follow-up emails after enquiries, purchases or appointments — without lifting a finger.",
                },
                {
                  icon: "📦",
                  title: "Stock & Inventory",
                  desc: "Auto-update stock levels, trigger reorder alerts, and sync inventory across your systems.",
                },
                {
                  icon: "📱",
                  title: "Social Media Posting",
                  desc: "Schedule and publish content across Facebook, Instagram and LinkedIn automatically.",
                },
                {
                  icon: "📊",
                  title: "Reporting & Analytics",
                  desc: "Generate weekly business performance reports automatically and receive them in your inbox every Monday morning.",
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

        {/* ROI Section */}
        <section style={{ padding: "80px 0", background: "var(--v2-bg, #0a0a0f)" }}>
          <div className="v2-container" style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
            <div className="v2-section-header center" style={{ marginBottom: 48 }}>
              <h2 className="v2-section-title">The <span className="accent">Real Cost</span> of Manual Work in Kerry</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 32, marginBottom: 48 }}>
              {[
                { value: "10–25h", label: "Saved per week on average" },
                { value: "60–90", label: "Days to full ROI for most clients" },
                { value: "€0", label: "Extra hires needed" },
                { value: "24/7", label: "Automation never takes a day off" },
              ].map((stat) => (
                <div key={stat.label} style={{ padding: 32, border: "1px solid var(--v2-border, #222)", borderRadius: 12 }}>
                  <div style={{ fontSize: "2.5rem", fontWeight: 700, color: "var(--v2-accent, #44C8F5)", marginBottom: 8 }}>{stat.value}</div>
                  <div style={{ color: "var(--v2-text-muted, #aaa)", fontSize: "0.95rem" }}>{stat.label}</div>
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
              Ready to Automate Your <span className="accent">Killarney Business?</span>
            </h2>
            <p style={{ color: "var(--v2-text-muted, #aaa)", marginBottom: 40, fontSize: "1.1rem" }}>
              Book a free 30-minute discovery call. We'll map out exactly which tasks in your business
              can be automated and estimate the time and cost savings — no commitment required.
            </p>
            <Link href="/#contact" className="v2-btn-primary">
              Get a Free Automation Audit
            </Link>
          </div>
        </section>
      </main>
      <FooterV2 />
    </div>
  );
}
