import Hero from "@/components/Hero";
import VideoGrid from "@/components/VideoGrid";
import Footer from "@/components/Footer";

// Mock video data - replace with Supabase integration
const mockVideos = [
  {
    id: "1",
    title: "AI Document Processing Revolution",
    description: "Discover how our intelligent document processing system transforms paper-based workflows into digital excellence. Watch as our AI handles complex documents with 99.9% accuracy, extracting key data points and routing information automatically.",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    is_published: true,
    sort_order: 1
  },
  {
    id: "2", 
    title: "Virtual Customer Support Excellence",
    description: "Meet your new 24/7 customer support team that never sleeps. Our AI-powered virtual assistants understand context, emotion, and intent to provide human-quality support at any scale. See real customer interactions and satisfaction scores.",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    is_published: true,
    sort_order: 2
  },
  {
    id: "3",
    title: "Automated Workflow Intelligence",
    description: "Experience the future of business process automation. Our AI team monitors, learns, and optimizes your workflows in real-time, identifying bottlenecks and implementing solutions faster than any human team could achieve.",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", 
    is_published: true,
    sort_order: 3
  }
];

const Index = () => {
  return (
    <main className="min-h-screen">
      <Hero />
      <VideoGrid videos={mockVideos} />
      <Footer />
    </main>
  );
};

export default Index;
