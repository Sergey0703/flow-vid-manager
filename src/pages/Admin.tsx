import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import UserManagement from "@/components/UserManagement";
import { 
  validateFile, 
  logUploadAudit, 
  logAdminAction, 
  sanitizeFileName, 
  getUserAgent 
} from "@/lib/security";
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

interface Video {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  is_published: boolean;
  sort_order: number;
  user_id: string;
  duration: number | null;
  file_size: number | null;
  created_at: string;
  updated_at: string;
}

const Admin = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    file: null as File | null,
    thumbnail: null as File | null,
    sort_order: 1
  });

  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    sort_order: 1,
    file: null as File | null,
    thumbnail: null as File | null
  });

  // Authentication state management
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check user approval and admin status
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("is_approved, is_admin, email, full_name")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        navigate("/auth");
        return;
      }

      if (!profile.is_approved) {
        navigate("/pending-approval");
        return;
      }

      if (!profile.is_admin) {
        navigate("/");
        return;
      }

      setUser(session.user);
      setSession(session);
      setUserProfile(profile);
      setIsLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          navigate("/auth");
        } else {
          // Re-check permissions on auth state change
          setTimeout(() => checkAuth(), 0);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Load videos from database
  useEffect(() => {
    if (session?.user) {
      fetchVideos();
    }
  }, [session?.user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !session) {
      navigate("/auth");
    }
  }, [session, isLoading, navigate]);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', session?.user?.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast({
        title: "Error",
        description: "Failed to load videos. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
      navigate("/auth");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateFile(file, 'video');
      if (validation.isValid) {
        setFormData(prev => ({ ...prev, file }));
      } else {
        toast({
          title: "Invalid File",
          description: validation.error,
          variant: "destructive"
        });
        // Log failed upload attempt
        if (session?.user) {
          logUploadAudit({
            user_id: session.user.id,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            upload_type: 'video',
            status: 'rejected',
            user_agent: getUserAgent()
          });
        }
      }
    }
  };

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateFile(file, 'image');
      if (validation.isValid) {
        setFormData(prev => ({ ...prev, thumbnail: file }));
      } else {
        toast({
          title: "Invalid File",
          description: validation.error,
          variant: "destructive"
        });
        // Log failed upload attempt
        if (session?.user) {
          logUploadAudit({
            user_id: session.user.id,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            upload_type: 'thumbnail',
            status: 'rejected',
            user_agent: getUserAgent()
          });
        }
      }
    }
  };

  const handleEditFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateFile(file, 'video');
      if (validation.isValid) {
        setEditFormData(prev => ({ ...prev, file }));
      } else {
        toast({
          title: "Invalid File",
          description: validation.error,
          variant: "destructive"
        });
        // Log failed upload attempt
        if (session?.user) {
          logUploadAudit({
            user_id: session.user.id,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            upload_type: 'video',
            status: 'rejected',
            user_agent: getUserAgent()
          });
        }
      }
    }
  };

  const handleEditThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateFile(file, 'image');
      if (validation.isValid) {
        setEditFormData(prev => ({ ...prev, thumbnail: file }));
      } else {
        toast({
          title: "Invalid File",
          description: validation.error,
          variant: "destructive"
        });
        // Log failed upload attempt
        if (session?.user) {
          logUploadAudit({
            user_id: session.user.id,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            upload_type: 'thumbnail',
            status: 'rejected',
            user_agent: getUserAgent()
          });
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.file || !session?.user) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      // Upload video file to storage with sanitized filename
      const sanitizedFileName = sanitizeFileName(formData.file.name);
      const fileName = `${session.user.id}/${Date.now()}-${sanitizedFileName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, formData.file);

      if (uploadError) throw uploadError;

      // Log successful video upload
      await logUploadAudit({
        user_id: session.user.id,
        file_name: formData.file.name,
        file_size: formData.file.size,
        file_type: formData.file.type,
        upload_type: 'video',
        status: 'success',
        user_agent: getUserAgent()
      });

      // Get public URL for the uploaded video
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(fileName);

      // Upload thumbnail if provided
      let thumbnailUrl = null;
      if (formData.thumbnail) {
        const sanitizedThumbnailName = sanitizeFileName(formData.thumbnail.name);
        const thumbnailFileName = `${session.user.id}/${Date.now()}-${sanitizedThumbnailName}`;
        const { data: thumbnailUploadData, error: thumbnailUploadError } = await supabase.storage
          .from('thumbnails')
          .upload(thumbnailFileName, formData.thumbnail);

        if (thumbnailUploadError) throw thumbnailUploadError;

        // Log successful thumbnail upload
        await logUploadAudit({
          user_id: session.user.id,
          file_name: formData.thumbnail.name,
          file_size: formData.thumbnail.size,
          file_type: formData.thumbnail.type,
          upload_type: 'thumbnail',
          status: 'success',
          user_agent: getUserAgent()
        });

        // Get public URL for the uploaded thumbnail
        const { data: { publicUrl: thumbnailPublicUrl } } = supabase.storage
          .from('thumbnails')
          .getPublicUrl(thumbnailFileName);

        thumbnailUrl = thumbnailPublicUrl;
      }

      // Save video metadata to database
      const { data: videoData, error: dbError } = await supabase
        .from('videos')
        .insert({
          title: formData.title,
          description: formData.description,
          video_url: publicUrl,
          thumbnail_url: thumbnailUrl,
          user_id: session.user.id,
          sort_order: formData.sort_order,
          file_size: formData.file.size,
          is_published: false
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Refresh videos list
      await fetchVideos();
      
      setFormData({ title: "", description: "", file: null, thumbnail: null, sort_order: videos.length + 1 });
      setShowUploadForm(false);
      
      // Log admin action
      await logAdminAction({
        admin_id: session.user.id,
        action_type: 'video_upload',
        target_resource_id: videoData.id,
        details: { 
          title: formData.title, 
          file_size: formData.file.size,
          has_thumbnail: !!formData.thumbnail
        }
      });

      toast({
        title: "Video Uploaded Successfully",
        description: `"${formData.title}" has been added to your media library`,
      });
    } catch (error) {
      console.error('Error uploading video:', error);
      
      // Log failed upload
      if (session?.user && formData.file) {
        await logUploadAudit({
          user_id: session.user.id,
          file_name: formData.file.name,
          file_size: formData.file.size,
          file_type: formData.file.type,
          upload_type: 'video',
          status: 'failed',
          user_agent: getUserAgent()
        });
      }

      toast({
        title: "Upload Failed",
        description: "Failed to upload video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const togglePublished = async (id: string) => {
    const video = videos.find(v => v.id === id);
    if (!video) return;

    try {
      const { error } = await supabase
        .from('videos')
        .update({ is_published: !video.is_published })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setVideos(prev => prev.map(v => 
        v.id === id 
          ? { ...v, is_published: !v.is_published }
          : v
      ));

      // Log admin action
      if (session?.user) {
        await logAdminAction({
          admin_id: session.user.id,
          action_type: !video.is_published ? 'video_publish' : 'video_unpublish',
          target_resource_id: id,
          details: { title: video.title }
        });
      }
      
      toast({
        title: !video.is_published ? "Video Published" : "Video Unpublished",
        description: !video.is_published 
          ? "Video is now visible to all users"
          : "Video is now hidden from public view",
      });
    } catch (error) {
      console.error('Error updating video:', error);
      toast({
        title: "Error",
        description: "Failed to update video status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    const video = videos.find(v => v.id === id);
    if (!video) return;

    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from('videos')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      // Delete file from storage if it exists
      if (video.video_url) {
        const fileName = video.video_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('videos')
            .remove([`${video.user_id}/${fileName}`]);
        }
      }

      // Update local state
      setVideos(prev => prev.filter(v => v.id !== id));

      // Log admin action
      if (session?.user) {
        await logAdminAction({
          admin_id: session.user.id,
          action_type: 'video_delete',
          target_resource_id: id,
          details: { title: video.title }
        });
      }
      
      toast({
        title: "Video Deleted",
        description: `"${video.title}" has been removed from your library`,
        variant: "destructive"
      });
    } catch (error) {
      console.error('Error deleting video:', error);
      toast({
        title: "Error",
        description: "Failed to delete video. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditStart = (video: Video) => {
    setEditingVideo(video);
    setEditFormData({
      title: video.title,
      description: video.description || "",
      sort_order: video.sort_order,
      file: null,
      thumbnail: null
    });
  };

  const handleEditCancel = () => {
    setEditingVideo(null);
    setEditFormData({ title: "", description: "", sort_order: 1, file: null, thumbnail: null });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingVideo || !editFormData.title || !editFormData.description || !session?.user) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      let updatedData: any = {
        title: editFormData.title,
        description: editFormData.description,
        sort_order: editFormData.sort_order
      };

      // Handle video file upload if new file is selected
      if (editFormData.file) {
        // Delete old video file if exists
        if (editingVideo.video_url) {
          const oldFileName = editingVideo.video_url.split('/').pop();
          if (oldFileName) {
            await supabase.storage
              .from('videos')
              .remove([`${editingVideo.user_id}/${oldFileName}`]);
          }
        }

        // Upload new video file
        const fileName = `${session.user.id}/${Date.now()}-${editFormData.file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('videos')
          .upload(fileName, editFormData.file);

        if (uploadError) throw uploadError;

        // Get public URL for the uploaded video
        const { data: { publicUrl } } = supabase.storage
          .from('videos')
          .getPublicUrl(fileName);

        updatedData.video_url = publicUrl;
        updatedData.file_size = editFormData.file.size;
      }

      // Handle thumbnail upload if new thumbnail is selected
      if (editFormData.thumbnail) {
        // Delete old thumbnail if exists
        if (editingVideo.thumbnail_url) {
          const oldThumbnailFileName = editingVideo.thumbnail_url.split('/').pop();
          if (oldThumbnailFileName) {
            await supabase.storage
              .from('thumbnails')
              .remove([`${editingVideo.user_id}/${oldThumbnailFileName}`]);
          }
        }

        // Upload new thumbnail
        const thumbnailFileName = `${session.user.id}/${Date.now()}-${editFormData.thumbnail.name}`;
        const { data: thumbnailUploadData, error: thumbnailUploadError } = await supabase.storage
          .from('thumbnails')
          .upload(thumbnailFileName, editFormData.thumbnail);

        if (thumbnailUploadError) throw thumbnailUploadError;

        // Get public URL for the uploaded thumbnail
        const { data: { publicUrl: thumbnailPublicUrl } } = supabase.storage
          .from('thumbnails')
          .getPublicUrl(thumbnailFileName);

        updatedData.thumbnail_url = thumbnailPublicUrl;
      }

      const { error } = await supabase
        .from('videos')
        .update(updatedData)
        .eq('id', editingVideo.id);

      if (error) throw error;

      // Update local state
      setVideos(prev => prev.map(v => 
        v.id === editingVideo.id 
          ? { ...v, ...updatedData }
          : v
      ));
      
      handleEditCancel();
      
      toast({
        title: "Video Updated",
        description: `"${editFormData.title}" has been updated successfully`,
      });
    } catch (error) {
      console.error('Error updating video:', error);
      toast({
        title: "Error",
        description: "Failed to update video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect will happen via useEffect if not authenticated
  if (!session || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Admin Dashboard</h1>
            <p className="text-muted-foreground">Welcome, {userProfile?.full_name || user?.email}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              {user.email}
            </div>
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

        <Tabs defaultValue="videos" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="videos">Video Management</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
          </TabsList>
          
          <TabsContent value="videos" className="space-y-6">
            {/* Upload Form */}
            {showUploadForm && (
              <Card className="card-gradient glow-effect">
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
                    <div className="space-y-2">
                      <Label>Thumbnail/Poster (Optional)</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailUpload}
                      />
                      {formData.thumbnail && (
                        <p className="text-sm text-muted-foreground">
                          Selected: {formData.thumbnail.name} ({(formData.thumbnail.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      )}
                    </div>
                    <Button type="submit" className="glow-effect" disabled={uploading}>
                      <Save className="mr-2 h-4 w-4" />
                      {uploading ? "Uploading..." : "Upload Video"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Edit Form */}
            {editingVideo && (
              <Card className="card-gradient glow-effect">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Edit className="h-5 w-5 text-primary" />
                      Edit Video: {editingVideo.title}
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleEditCancel}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleEditSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Video Title *</Label>
                        <Input
                          value={editFormData.title}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Enter video title"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Sort Order</Label>
                        <Input
                          type="number"
                          value={editFormData.sort_order}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) }))}
                          min="1"
                        />
                      </div>
                    </div>
                     <div className="space-y-2">
                       <Label>Description *</Label>
                       <Textarea
                         value={editFormData.description}
                         onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                         placeholder="Enter video description"
                         rows={3}
                         required
                       />
                     </div>
                     <div className="space-y-2">
                       <Label>Replace Video File (Optional)</Label>
                       <Input
                         type="file"
                         accept="video/*"
                         onChange={handleEditFileUpload}
                       />
                       {editFormData.file && (
                         <p className="text-sm text-muted-foreground">
                           Selected: {editFormData.file.name} ({(editFormData.file.size / 1024 / 1024).toFixed(2)} MB)
                         </p>
                       )}
                     </div>
                     <div className="space-y-2">
                       <Label>Replace Thumbnail/Poster (Optional)</Label>
                       <Input
                         type="file"
                         accept="image/*"
                         onChange={handleEditThumbnailUpload}
                       />
                       {editFormData.thumbnail && (
                         <p className="text-sm text-muted-foreground">
                           Selected: {editFormData.thumbnail.name} ({(editFormData.thumbnail.size / 1024 / 1024).toFixed(2)} MB)
                         </p>
                       )}
                     </div>
                     <div className="flex gap-2">
                       <Button type="submit" className="glow-effect" disabled={uploading}>
                         <Save className="mr-2 h-4 w-4" />
                         {uploading ? "Updating..." : "Save Changes"}
                       </Button>
                      <Button type="button" variant="outline" onClick={handleEditCancel}>
                        Cancel
                      </Button>
                    </div>
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
                            <span>Created: {new Date(video.created_at).toLocaleDateString()}</span>
                            {video.file_size && (
                              <span>Size: {(video.file_size / 1024 / 1024).toFixed(1)} MB</span>
                            )}
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
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditStart(video)}
                          >
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
          </TabsContent>
          
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;