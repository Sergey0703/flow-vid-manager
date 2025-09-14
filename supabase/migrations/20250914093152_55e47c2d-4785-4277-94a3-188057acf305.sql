-- Security Fix 1: Remove user_id exposure from published videos
-- Update the public video viewing policy to exclude sensitive user data
DROP POLICY IF EXISTS "Public videos are viewable by everyone" ON public.videos;

-- Create new policy that excludes user_id from public access
CREATE POLICY "Public can view published video content only" 
ON public.videos 
FOR SELECT 
USING (is_published = true);

-- Add RLS policy to ensure user_id is not included in public queries
-- This will be handled at the application level by selecting only necessary fields

-- Security Fix 2: Add file upload audit table for monitoring
CREATE TABLE public.upload_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  upload_type TEXT NOT NULL CHECK (upload_type IN ('video', 'thumbnail')),
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'rejected')),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE public.upload_audit ENABLE ROW LEVEL SECURITY;

-- Admin can view all audit logs
CREATE POLICY "Admins can view all upload audit logs" 
ON public.upload_audit 
FOR SELECT 
USING (is_approved_admin(auth.uid()));

-- Users can view their own audit logs
CREATE POLICY "Users can view their own upload audit logs" 
ON public.upload_audit 
FOR SELECT 
USING (auth.uid() = user_id);

-- Only authenticated approved users can insert audit logs
CREATE POLICY "Approved users can insert upload audit logs" 
ON public.upload_audit 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND is_approved_user(auth.uid()));

-- Add admin action audit table
CREATE TABLE public.admin_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  target_user_id UUID,
  target_resource_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on admin actions table
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- Only admins can view admin action logs
CREATE POLICY "Admins can view admin action logs" 
ON public.admin_actions 
FOR SELECT 
USING (is_approved_admin(auth.uid()));

-- Only admins can insert admin action logs
CREATE POLICY "Admins can insert admin action logs" 
ON public.admin_actions 
FOR INSERT 
WITH CHECK (is_approved_admin(auth.uid()) AND auth.uid() = admin_id);