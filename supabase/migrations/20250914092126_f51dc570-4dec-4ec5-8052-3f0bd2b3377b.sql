-- Fix security issue: Remove public access to user email addresses
-- Drop the overly permissive policy that exposes all profile data publicly
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Add policy for users to view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- The existing "Admins can view all profiles" policy already allows admin access
-- The existing "Users can update their own profile" and "Users can insert their own profile" policies remain unchanged