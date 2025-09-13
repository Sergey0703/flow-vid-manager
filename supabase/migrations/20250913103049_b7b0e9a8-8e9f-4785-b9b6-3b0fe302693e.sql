-- Add approval and admin fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_approved BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

-- Update the handle_new_user function to ensure new users are unapproved by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_approved, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    false,  -- New users start as unapproved
    false   -- New users start as non-admin
  );
  RETURN NEW;
END;
$function$;

-- Create function to check if user is approved admin (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_approved_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id 
    AND is_approved = true 
    AND is_admin = true
  );
$$;

-- Create function to check if user is approved
CREATE OR REPLACE FUNCTION public.is_approved_user(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id 
    AND is_approved = true
  );
$$;

-- Update videos table policies to require approval
DROP POLICY IF EXISTS "Users can insert their own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can update their own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can delete their own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can view their own videos" ON public.videos;

-- Create new policies that require approval
CREATE POLICY "Approved users can insert their own videos" 
ON public.videos 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND public.is_approved_user(auth.uid()));

CREATE POLICY "Approved users can update their own videos" 
ON public.videos 
FOR UPDATE 
USING (auth.uid() = user_id AND public.is_approved_user(auth.uid()));

CREATE POLICY "Approved users can delete their own videos" 
ON public.videos 
FOR DELETE 
USING (auth.uid() = user_id AND public.is_approved_user(auth.uid()));

CREATE POLICY "Approved users can view their own videos" 
ON public.videos 
FOR SELECT 
USING (auth.uid() = user_id AND public.is_approved_user(auth.uid()));

-- Admins can view all videos for management
CREATE POLICY "Admins can view all videos" 
ON public.videos 
FOR SELECT 
USING (public.is_approved_admin(auth.uid()));

-- Add policy for admins to manage all videos
CREATE POLICY "Admins can manage all videos" 
ON public.videos 
FOR ALL 
USING (public.is_approved_admin(auth.uid()));

-- Update profiles policies for admin management
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_approved_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (public.is_approved_admin(auth.uid()));