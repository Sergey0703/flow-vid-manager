import type { Metadata } from "next";
import Link from "next/link";
import Navigation from "@/components/v2/Navigation";
import FooterV2 from "@/components/v2/FooterV2";
import ThemeScope from "@/components/v2/ThemeScope";

export const metadata: Metadata = {
  title: "WhatsApp Chatbot Ireland | AI WhatsApp Bot for Irish Businesses | AIMediaFlow",
  description:
    "WhatsApp chatbot for Irish businesses — automate customer replies, capture leads and book appointments on WhatsApp 24/7. Kerry-based AI agency. Free demo.",
  keywords:
    "WhatsApp chatbot Ireland, WhatsApp bot Ireland, AI WhatsApp Ireland, WhatsApp business chatbot Ireland, WhatsApp automation Ireland, chatbot Ireland",
  alternates: { canonical: "https://aimediaflow.net/whatsapp-chatbot-ireland" },
  openGraph: {
    title: "WhatsApp Chatbot Ireland | AIMediaFlow",
    description:
      "AI-powered WhatsApp chatbot for Irish businesses. Automate replies, capture leads and book appointments on WhatsApp 24/7. Kerry-based AI agency.",
    url: "https://aimediaflow.net/whatsapp-chatbot-ireland",
    images: [{ url: "https://aimediaflow.net/og-image.png", width: 1200, height: 630 }],
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How does a WhatsApp chatbot work for Irish businesses?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A WhatsApp chatbot connects to your WhatsApp Business account and automatically replies to customer messages 24/7. It can answer questions, capture leads, book appointments and send follow-ups — all through WhatsApp, which most Irish customers already use daily.",
      },
    },
    {
      "@type": "Question",
      name: "Is WhatsApp Business API available for small businesses in Ireland?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Any Irish business with a WhatsApp Business account can connect to the WhatsApp API and run an AI chatbot. We handle the full setup — API access, AI training and integration with your existing systems.",
      },
    },
    {
      "@type": "Question",
      name: "What types of Irish businesses benefit most from a WhatsApp chatbot?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Hotels, restaurants, dental clinics, estate agents, solicitors and any Irish SME that gets customer enquiries by phone or message. WhatsApp is the most popular messaging app in Ireland, so meeting customers there dramatically increases response rates.",
      },
    },
    {
      "@type": "Question",
      name: "How much does a WhatsApp chatbot cost for an Irish business?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Cost depends on message volume and integrations. Most Irish SMEs start from a one-off setup fee plus a small monthly fee. Contact us for a free quote — we are based in Killarney, Kerry and work with businesses across Ireland.",
      },
    },
  ],
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "AIMediaFlow",
  description: "WhatsApp chatbot and AI automation services for Irish businesses. Based in Killarney, Kerry.",
  url: "https://aimediaflow.net",
  telephone: "+353852007612",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Killarney",
    addressRegion: "Kerry",
    addressCountry: "IE",
  },
  areaServed: [
    { "@type": "Country", name: "Ireland" },
    { "@type": "AdministrativeArea", name: "Kerry" },
    { "@type": "City", name: "Dublin" },
    { "@type": "City", name: "Cork" },
    { "@type": "City", name: "Galway" },
    { "@type": "City", name: "Limerick" },
    { "@type": "City", name: "Killarney" },
  ],
};

export default function WhatsAppChatbotIreland() {
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
            <span className="v2-section-tag">WhatsApp Chatbot Ireland — AI-Powered</span>
            <h1 className="v2-section-title" style={{ fontSize: "clamp(2rem,5vw,3.2rem)", margin: "16px 0 24px" }}>
              WhatsApp Chatbot for Irish Businesses.<br />
              <span className="accent">Reply Instantly. Convert More.</span>
            </h1>
            <p className="v2-seo-desc" style={{ fontSize: "1.2rem", maxWidth: 680, margin: "0 auto 40px" }}>
              Irish customers message on WhatsApp before they call. Our AI chatbot replies instantly,
              captures their details and books appointments — automatically, 24/7, no staff needed.
            </p>
            <Link href="/#contact" className="v2-btn-primary">
              Get a Free Demo
            </Link>
          </div>
        </section>

        {/* Why WhatsApp */}
        <section className="v2-seo-section-b" style={{ padding: "60px 0" }}>
          <div className="v2-container" style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
            <h2 className="v2-section-title" style={{ marginBottom: 24 }}>
              Why <span className="accent">WhatsApp</span> for Irish Businesses?
            </h2>
            <p className="v2-seo-desc" style={{ fontSize: "1.1rem", maxWidth: 720, margin: "0 auto 40px" }}>
              WhatsApp is the most widely used messaging app in Ireland. Customers expect fast replies —
              and if you don&apos;t respond within minutes, they move on to a competitor. An AI WhatsApp
              chatbot answers every message instantly, day and night.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24, marginTop: 16 }}>
              {[
                { stat: "98%", label: "WhatsApp message open rate" },
                { stat: "3 min", label: "Average reply time expected by Irish customers" },
                { stat: "24/7", label: "AI chatbot availability — no gaps" },
                { stat: "3×", label: "More leads captured vs phone-only" },
              ].map((item) => (
                <div key={item.label} className="v2-service-card" style={{ padding: 28, textAlign: "center" }}>
                  <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--accent)" }}>{item.stat}</div>
                  <div className="v2-seo-desc" style={{ fontSize: "0.95rem", marginTop: 8 }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Who we help */}
        <section className="v2-seo-section-a" style={{ padding: "80px 0" }}>
          <div className="v2-container" style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
            <div className="v2-section-header center" style={{ marginBottom: 48 }}>
              <h2 className="v2-section-title">
                Irish Businesses We <span className="accent">Help</span>
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 32 }}>
              {[
                { icon: "🏨", title: "Hotels & B&Bs", desc: "Handle availability questions, capture booking enquiries and direct guests to your reservation system — even during peak season when phones are busy." },
                { icon: "🍽️", title: "Restaurants & Cafés", desc: "Take table reservations, answer menu questions, handle event enquiries — all automatically on WhatsApp before customers look elsewhere." },
                { icon: "🦷", title: "Dental Clinics", desc: "Book appointments, answer questions about treatments and costs, capture new patient enquiries outside clinic hours." },
                { icon: "⚖️", title: "Solicitor Firms", desc: "Qualify new client enquiries on WhatsApp, answer common questions and schedule consultations without tying up reception." },
                { icon: "🏠", title: "Estate Agents", desc: "Respond instantly to property enquiries on WhatsApp, book viewings and qualify buyers and sellers 24/7." },
                { icon: "🛍️", title: "Retail & Services", desc: "Handle stock questions, opening hours, pricing and service bookings for any Irish retail or service business." },
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

        {/* Features */}
        <section className="v2-seo-section-b" style={{ padding: "80px 0" }}>
          <div className="v2-container" style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
            <div className="v2-section-header center" style={{ marginBottom: 48 }}>
              <h2 className="v2-section-title">
                What Our <span className="accent">WhatsApp Chatbot</span> Does
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 32 }}>
              {[
                { icon: "⚡", title: "Instant Replies", desc: "Responds to every WhatsApp message in seconds — no waiting, no missed enquiries, no lost customers." },
                { icon: "🧠", title: "Trained on Your Business", desc: "Knows your services, prices, opening hours and FAQs. Answers Irish customers accurately using your own content." },
                { icon: "📋", title: "Lead Capture", desc: "Collects name, contact details and enquiry type. Every WhatsApp lead goes straight to your CRM or email." },
                { icon: "📅", title: "Appointment Booking", desc: "Connects to your calendar and books appointments automatically — no back-and-forth messages needed." },
                { icon: "🔁", title: "Follow-up Sequences", desc: "Sends automated follow-up messages to enquiries that haven&apos;t converted — keeping your pipeline warm." },
                { icon: "🌐", title: "Web + WhatsApp Together", desc: "Same AI, two channels. Works on your website chatbot and WhatsApp — one consistent experience for customers." },
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
              More <span className="accent">AI Services</span> for Irish Businesses
            </h2>
            <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
              <Link href="/ai-chatbot-kerry" className="v2-btn-secondary">AI Chatbot Kerry</Link>
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
              Ready to Automate Your <span className="accent">WhatsApp</span>?
            </h2>
            <p className="v2-seo-desc" style={{ marginBottom: 40, fontSize: "1.1rem" }}>
              Book a free 30-minute call. We&apos;ll show you a live demo of a WhatsApp chatbot
              built for your specific Irish business — no commitment required.
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
