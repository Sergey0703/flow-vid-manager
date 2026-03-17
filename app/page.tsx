import Navigation from "@/components/v2/Navigation";
import HeroV2Alt from "@/components/v2/HeroV2Alt";
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

export default async function HomePage() {
  const videos = await getVideos();

  return (
    <div className="v2-scope">
      <Navigation />
      <main>
        <HeroV2Alt agentName="aimediaflow-agent-local" />
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
