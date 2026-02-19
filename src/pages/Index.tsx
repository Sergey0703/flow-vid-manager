import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Import V2 Styles
import "../styles/v2-styles.css";

// Components
import Navigation from "../components/v2/Navigation";
import HeroV2Alt from "../components/v2/HeroV2Alt";
import Stats from "../components/v2/Stats";
import Services from "../components/v2/Services";
import HowItWorks from "../components/v2/HowItWorks";
import VideoShowcase from "../components/v2/VideoShowcase";
import FAQ from "../components/v2/FAQ";
import Contact from "../components/v2/Contact";
import FooterV2 from "../components/v2/FooterV2";
import Chatbot from "../components/v2/Chatbot";

interface Video {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnail_url?: string;
}

const Index = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const { data, error } = await supabase
          .from('videos')
          .select('id, title, description, video_url, is_published, sort_order, thumbnail_url')
          .order('sort_order', { ascending: true });

        if (error) throw error;

        const formattedVideos: Video[] = data.map(video => ({
          id: video.id,
          title: video.title,
          description: video.description || '',
          url: video.video_url || '',
          thumbnail_url: video.thumbnail_url || undefined
        }));

        setVideos(formattedVideos);
      } catch (error) {
        console.error('Error fetching videos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  if (loading) {
    return (
      <div className="v2-scope" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--v2-cyan)', fontSize: '1.25rem', fontWeight: 'bold' }}>Loading Experience...</div>
      </div>
    );
  }

  return (
    <div className="v2-scope">
      <Navigation />

      <main>
        <HeroV2Alt />
        <Stats />
        <VideoShowcase videos={videos} />
        <Services />
        <HowItWorks />
        <FAQ />
        <Contact />
      </main>

      <FooterV2 />
      <Chatbot />
    </div>
  );
};

export default Index;
