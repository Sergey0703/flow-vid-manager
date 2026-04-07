import Navigation from "@/components/v2/Navigation";
import HeroSection from "@/components/v2/HeroSection";
import Stats from "@/components/v2/Stats";
import Services from "@/components/v2/Services";
import HowItWorks from "@/components/v2/HowItWorks";
import VideoShowcase from "@/components/v2/VideoShowcase";
import FAQ from "@/components/v2/FAQ";
import Contact from "@/components/v2/Contact";
import FooterV2 from "@/components/v2/FooterV2";
import { createClient } from "@supabase/supabase-js";

interface Video {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnail_url?: string;
}

async function getVideos(): Promise<Video[]> {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return [];

  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from("videos")
      .select("id, title, description, video_url, thumbnail_url")
      .order("sort_order", { ascending: true });

    if (error || !data) return [];

    return data.map((v) => ({
      id: v.id,
      title: v.title,
      description: v.description || "",
      url: v.video_url || "",
      thumbnail_url: v.thumbnail_url || undefined,
    }));
  } catch {
    return [];
  }
}

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "Do I need technical knowledge to use AI solutions from AIMediaFlow?", acceptedAnswer: { "@type": "Answer", text: "Not at all. We handle everything — design, build, testing, and deployment. We also train your team so they can manage the system confidently. No coding required on your end." } },
    { "@type": "Question", name: "How long does it take to go live with an AI phone assistant or chatbot?", acceptedAnswer: { "@type": "Answer", text: "Most of our solutions are live within 2–4 weeks. Complex integrations may take longer, but we always set clear timelines upfront with no surprises." } },
    { "@type": "Question", name: "What is the typical ROI for businesses using AI automation in Kerry?", acceptedAnswer: { "@type": "Answer", text: "Most clients recover their investment within 60–90 days through saved staff hours, increased lead capture, and reduced errors." } },
    { "@type": "Question", name: "Do you provide ongoing support after launch?", acceptedAnswer: { "@type": "Answer", text: "Yes. Every solution includes an initial support period and we offer ongoing maintenance packages." } },
    { "@type": "Question", name: "What industries do you work with in Kerry and Ireland?", acceptedAnswer: { "@type": "Answer", text: "We work with healthcare, hospitality, retail, property management, professional services, and more across Killarney, Tralee, Listowel, Dingle, Killorglin and all of Kerry." } },
    { "@type": "Question", name: "What is an AI phone assistant and how does it work for my Kerry business?", acceptedAnswer: { "@type": "Answer", text: "An AI phone assistant answers your business calls automatically, 24/7. It qualifies leads, books appointments, answers common questions and takes messages — like a human receptionist but at a fraction of the cost." } },
    { "@type": "Question", name: "What AI technologies do you use — LLM, RAG, AI agents?", acceptedAnswer: { "@type": "Answer", text: "We build solutions using Large Language Models (LLMs), Retrieval-Augmented Generation (RAG), AI voice agents, and generative AI. Every solution is custom-built for your business needs." } },
    { "@type": "Question", name: "Can you build a website with AI features or help with AI-powered SEO in Ireland?", acceptedAnswer: { "@type": "Answer", text: "Yes. We build and enhance websites with integrated AI features — live chatbots, voice assistants, lead capture automation, and AI-powered content." } },
  ],
};

export default async function HomePage() {
  const videos = await getVideos();

  return (
    <div className="v2-scope">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Navigation />
      <main>
        <HeroSection />
        <Stats />
        <VideoShowcase videos={videos} />
        <Services />
        <HowItWorks />
        <FAQ />
        <Contact />
      </main>
      <FooterV2 />
    </div>
  );
}
