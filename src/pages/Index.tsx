import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Hero from "@/components/Hero";
import VideoGrid from "@/components/VideoGrid";
import Footer from "@/components/Footer";

interface Video {
  id: string;
  title: string;
  description: string;
  url: string;
  is_published: boolean;
  sort_order: number;
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
          .eq('is_published', true)
          .order('sort_order', { ascending: true });

        if (error) {
          console.error('Error fetching videos:', error);
          return;
        }

        const formattedVideos: Video[] = data.map(video => ({
          id: video.id,
          title: video.title,
          description: video.description || '',
          url: video.video_url || '',
          is_published: video.is_published,
          sort_order: video.sort_order,
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
      <main className="min-h-screen bg-background">
        {/* Hero Section with Loading State */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Fallback gradient background while loading */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30"></div>
          
          <div className="relative z-10 container mx-auto px-4 text-center">
            <div className="max-w-5xl mx-auto space-y-8">
              <h1 className="text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-bold leading-tight">
                <span className="text-red-500 drop-shadow-2xl">AI</span>{" "}
                <span className="text-white drop-shadow-2xl">MediaFlow</span>
              </h1>
              <div className="text-white/80">
                <div className="h-12 w-12 animate-spin rounded-full border-2 border-white border-t-transparent mx-auto mb-4"></div>
                <p>Loading your AI-powered experience...</p>
              </div>
            </div>
          </div>
        </section>

        {/* Videos Loading Section */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 text-center">
            <div className="mx-auto max-w-md">
              <div className="mb-4 rounded-full bg-muted/50 p-4 inline-block">
                <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
              <p className="text-muted-foreground">Loading AI solutions showcase...</p>
            </div>
          </div>
        </section>
        
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section - New Futuristic Banner */}
      <Hero />
      
      {/* Videos Section */}
      <VideoGrid videos={videos} />
      
      {/* Footer */}
      <Footer />
    </main>
  );
};

export default Index;