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
      <main className="min-h-screen">
        <Hero />
        <section className="py-16">
          <div className="container mx-auto px-4 text-center">
            <div className="mx-auto max-w-md">
              <div className="mb-4 rounded-full bg-muted/50 p-4 inline-block">
                <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
              <p className="text-muted-foreground">Loading videos...</p>
            </div>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Hero />
      <VideoGrid videos={videos} />
      <Footer />
    </main>
  );
};

export default Index;
