import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Agency Kerry & Killarney, Ireland | AIMediaFlow",
  description:
    "Kerry's AI agency — AI phone assistants, chatbots and business automation for Irish SMEs in Killarney, Tralee, Listowel, Dingle and across Ireland. Book a free discovery call.",
  keywords:
    "AI agency Kerry, AI agency Ireland, AI Killarney, AI phone assistant Kerry, chatbot Ireland, business automation Kerry",
  authors: [{ name: "AIMediaFlow" }],
  metadataBase: new URL("https://aimediaflow.net"),
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  other: {
    "geo.region": "IE-KY",
    "geo.placename": "Killarney, Kerry, Ireland",
  },
  openGraph: {
    type: "website",
    url: "https://aimediaflow.net/",
    title: "AI Kerry & AI Killarney | Artificial Intelligence Agency | AIMediaFlow",
    description:
      "Kerry's leading AI agency. AI phone assistants, chatbots and automation for businesses in Killarney, Tralee, Listowel, Dingle and across Ireland.",
    images: [
      {
        url: "https://aimediaflow.net/og-image.png",
        width: 1200,
        height: 630,
        alt: "AIMediaFlow — Artificial Intelligence Agency Kerry, Ireland",
      },
    ],
    siteName: "AIMediaFlow",
    locale: "en_IE",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Agency Kerry & Killarney | AIMediaFlow",
    description:
      "Kerry's leading AI agency — AI phone assistants, chatbots and automation for businesses in Kerry and Killarney, Ireland.",
    images: {
      url: "https://aimediaflow.net/og-image.png",
      alt: "AIMediaFlow — Artificial Intelligence Agency Kerry, Ireland",
    },
  },
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "AIMediaFlow",
  description:
    "Artificial Intelligence agency providing AI phone assistants, chatbots, and business automation for small and medium businesses in Kerry and across Ireland.",
  url: "https://aimediaflow.net/",
  image: "https://aimediaflow.net/og-image.png",
  logo: "https://aimediaflow.net/favicon.svg",
  foundingDate: "2024",
  email: "info@aimediaflow.net",
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
    { "@type": "City", name: "Listowel" },
    { "@type": "City", name: "Dingle" },
    { "@type": "City", name: "Killorglin" },
    { "@type": "City", name: "Kenmare" },
    { "@type": "AdministrativeArea", name: "Kerry" },
    { "@type": "AdministrativeArea", name: "Munster" },
    { "@type": "Country", name: "Ireland" },
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "AI Services for Irish Businesses",
    itemListElement: [
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "AI Phone Assistants", description: "AI receptionist that answers every call 24/7, qualifies leads and books appointments automatically." } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Website Chatbots", description: "24/7 AI chatbot that captures leads, answers questions and qualifies prospects directly on your website." } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Business Process Automation", description: "Automate repetitive admin tasks, reduce errors and free up your team for higher-value work." } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "AI Marketing Videos", description: "Professional AI-generated marketing videos to promote your business online." } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "AI Strategy & Consulting", description: "Custom AI roadmap covering LLMs, RAG pipelines, AI agents, generative AI, workflow automation, and website AI integration for Irish businesses." } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Workflow Automation", description: "Business process automation using n8n, Make and Zapier for Irish businesses." } },
    ],
  },
  priceRange: "$$",
  openingHours: "Mo-Fr 09:00-18:00",
  sameAs: [
    "https://aimediaflow.net/",
    "https://killarneyadvertiser.ie/news/ukrainian-it-professionals-new-ai-venture/",
    "https://www.linkedin.com/company/aimediaflow/",
  ],
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        <meta name="theme-color" content="#44C8F5" />
        <link rel="preconnect" href="https://jfxxtyfuccwmfeyltype.supabase.co" />
        <link rel="dns-prefetch" href="https://realtime.supabase.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
