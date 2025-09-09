import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  Edit, 
  Trash2, 
  Video, 
  Plus, 
  Save,
  X,
  Eye,
  EyeOff,
  LogOut,
  Shield
} from "lucide-react";

// Mock data - replace with Supabase integration
const mockVideos = [
  {
    id: "1",
    title: "AI Document Processing Demo",
    description: "Learn how our AI solution automates document processing workflows, reducing manual effort by 90% while improving accuracy.",
    url: "https://example.com/video1.mp4",
    is_published: true,
    sort_order: 1,
    created_at: "2024-01-15"
  },
  {
    id: "2", 
    title: "Intelligent Customer Support System",
    description: "See our virtual team in action - handling customer inquiries 24/7 with human-like understanding and response quality.",
    url: "https://example.com/video2.mp4",
    is_published: false,
    sort_order: 2,
    created_at: "2024-01-16"
  }
];

interface Video {
  id: string;
  title: string;
  description: string;
  url: string;
  is_published: boolean;
  sort_order: number;
  created_at: string;
}

const Admin = () => {
  const [videos, setVideos] = useState<Video[]>(mockVideos);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Mock auth
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    file: null as File | null,
    sort_order: videos.length + 1
  });

  const handleLogin = () => {
    // Mock login - integrate with Supabase Auth
    setIsAuthenticated(true);
    toast({
      title: "Login Successful",
      description: "Welcome to AI MediaFlow Admin Panel",
    });
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out",
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith("video/")) {
        setFormData(prev => ({ ...prev, file }));
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please select a video file (MP4, MOV, AVI, etc.)",
          variant: "destructive"
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Mock upload process - integrate with Supabase Storage & Database
    const newVideo: Video = {
      id: Date.now().toString(),
      title: formData.title,
      description: formData.description,
      url: formData.file ? URL.createObjectURL(formData.file) : "",
      is_published: true,
      sort_order: formData.sort_order,
      created_at: new Date().toISOString().split('T')[0]
    };

    setVideos(prev => [...prev, newVideo]);
    setFormData({ title: "", description: "", file: null, sort_order: videos.length + 2 });
    setShowUploadForm(false);
    
    toast({
      title: "Video Uploaded Successfully",
      description: `"${newVideo.title}" has been added to your media library`,
    });
  };

  const togglePublished = (id: string) => {
    setVideos(prev => prev.map(video => 
      video.id === id 
        ? { ...video, is_published: !video.is_published }
        : video
    ));
    
    const video = videos.find(v => v.id === id);
    toast({
      title: video?.is_published ? "Video Unpublished" : "Video Published",
      description: video?.is_published 
        ? "Video is now hidden from public view"
        : "Video is now visible to all users",
    });
  };

  const handleDelete = (id: string) => {
    const video = videos.find(v => v.id === id);
    setVideos(prev => prev.filter(v => v.id !== id));
    
    toast({
      title: "Video Deleted",
      description: `"${video?.title}" has been removed from your library`,
      variant: "destructive"
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <Card className="w-full max-w-md card-gradient glow-effect">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Admin Access</CardTitle>
            <p className="text-muted-foreground">Sign in to manage your video content</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="admin@aimediaflow.com" />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" placeholder="••••••••" />
            </div>
            <Button onClick={handleLogin} className="w-full glow-effect">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage your AI MediaFlow content</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setShowUploadForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Video
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Upload Form */}
        {showUploadForm && (
          <Card className="mb-8 card-gradient glow-effect">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Upload New Video
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowUploadForm(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Video Title *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter video title"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sort Order</Label>
                    <Input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) }))}
                      min="1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter video description"
                    rows={3}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Video File *</Label>
                  <Input
                    type="file"
                    accept="video/*"
                    onChange={handleFileUpload}
                    required
                  />
                  {formData.file && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {formData.file.name} ({(formData.file.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
                <Button type="submit" className="glow-effect">
                  <Save className="mr-2 h-4 w-4" />
                  Upload Video
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Videos List */}
        <Card className="card-gradient glow-effect">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Video Library ({videos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {videos.length === 0 ? (
              <div className="text-center py-12">
                <Video className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No videos uploaded yet</h3>
                <p className="text-muted-foreground mb-4">Start building your content library by uploading your first video.</p>
                <Button onClick={() => setShowUploadForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Upload First Video
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {videos.map((video) => (
                  <div key={video.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{video.title}</h3>
                        <Badge variant={video.is_published ? "default" : "secondary"}>
                          {video.is_published ? "Published" : "Draft"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {video.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Order: {video.sort_order}</span>
                        <span>Created: {video.created_at}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={video.is_published}
                          onCheckedChange={() => togglePublished(video.id)}
                        />
                        {video.is_published ? (
                          <Eye className="h-4 w-4 text-success" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDelete(video.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;