import type { Metadata } from "next";
import Link from "next/link";
import Navigation from "@/components/v2/Navigation";
import FooterV2 from "@/components/v2/FooterV2";
import ThemeScope from "@/components/v2/ThemeScope";

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

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "AIMediaFlow",
  description: "Business automation and AI services for Killarney and Kerry businesses.",
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
    { "@type": "AdministrativeArea", name: "Kerry" },
  ],
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
            <span className="v2-section-tag">Business Automation Killarney & Kerry</span>
            <h1 className="v2-section-title" style={{ fontSize: "clamp(2rem,5vw,3.2rem)", margin: "16px 0 24px" }}>
              Stop Doing Repetitive Tasks.<br />
              <span className="accent">Automate Your Kerry Business</span>
            </h1>
            <p className="v2-seo-desc" style={{ fontSize: "1.2rem", maxWidth: 680, margin: "0 auto 40px" }}>
              We automate time-consuming admin tasks so you and your team can focus on growing your
              business. Kerry and Killarney SMEs save 10–25 hours every week with our AI automation solutions.
            </p>
            <Link href="/#contact" className="v2-btn-primary">
              Book a Free Discovery Call
            </Link>
          </div>
        </section>

        {/* What We Automate */}
        <section className="v2-seo-section-b" style={{ padding: "80px 0" }}>
          <div className="v2-container" style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
            <div className="v2-section-header center" style={{ marginBottom: 48 }}>
              <h2 className="v2-section-title">
                Tasks We <span className="accent">Automate</span> for Kerry Businesses
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 32 }}>
              {[
                { icon: "🧾", title: "Invoice & Payments", desc: "Auto-generate invoices, send payment reminders, and reconcile payments — directly from your accounting software." },
                { icon: "📅", title: "Appointment Reminders", desc: "Automatically send SMS and email reminders to reduce no-shows. Works with any booking system." },
                { icon: "📧", title: "Customer Follow-Ups", desc: "Trigger personalised follow-up emails after enquiries, purchases or appointments — without lifting a finger." },
                { icon: "📦", title: "Stock & Inventory", desc: "Auto-update stock levels, trigger reorder alerts, and sync inventory across your systems." },
                { icon: "📱", title: "Social Media Posting", desc: "Schedule and publish content across Facebook, Instagram and LinkedIn automatically." },
                { icon: "📊", title: "Reporting & Analytics", desc: "Generate weekly business performance reports automatically and receive them in your inbox every Monday morning." },
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

        {/* ROI Section */}
        <section className="v2-seo-section-a" style={{ padding: "80px 0" }}>
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
                <div key={stat.label} className="v2-seo-stat-card">
                  <div className="v2-seo-stat-value">{stat.value}</div>
                  <div className="v2-seo-desc" style={{ fontSize: "0.95rem" }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="v2-seo-section-b" style={{ padding: "80px 0" }}>
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

        {/* Local trust */}
        <section className="v2-seo-section-a" style={{ padding: "60px 0" }}>
          <div className="v2-container" style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
            <h2 className="v2-section-title" style={{ marginBottom: 24 }}>
              Killarney-Based. <span className="accent">Kerry-Focused.</span>
            </h2>
            <p className="v2-seo-desc" style={{ fontSize: "1.1rem", maxWidth: 720, margin: "0 auto 32px" }}>
              We are an AI agency based in Killarney, County Kerry. We work with hotels, restaurants,
              dental clinics, solicitor firms and retail businesses across Kerry — and we understand
              the challenges local SMEs face. When you automate with us, you get a local team that
              is available to meet in person, not a faceless overseas provider.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
              {["Killarney", "Tralee", "Kenmare", "Killorglin", "Listowel", "Dingle"].map((city) => (
                <span key={city} className="v2-section-tag" style={{ margin: 0 }}>{city}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Internal links */}
        <section className="v2-seo-section-b" style={{ padding: "60px 0" }}>
          <div className="v2-container" style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
            <h2 className="v2-section-title" style={{ marginBottom: 32 }}>
              More <span className="accent">AI Services</span> for Kerry Businesses
            </h2>
            <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
              <Link href="/ai-chatbot-kerry" className="v2-btn-secondary">AI Chatbot Kerry</Link>
              <Link href="/ai-chatbot-ireland" className="v2-btn-secondary">AI Chatbot Ireland</Link>
              <Link href="/ai-phone-assistant-kerry" className="v2-btn-secondary">AI Phone Assistant Kerry</Link>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="v2-seo-section-a" style={{ padding: "80px 0", textAlign: "center" }}>
          <div className="v2-container" style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px" }}>
            <h2 className="v2-section-title" style={{ marginBottom: 16 }}>
              Ready to Automate Your <span className="accent">Killarney Business?</span>
            </h2>
            <p className="v2-seo-desc" style={{ marginBottom: 40, fontSize: "1.1rem" }}>
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
    </ThemeScope>
  );
}
