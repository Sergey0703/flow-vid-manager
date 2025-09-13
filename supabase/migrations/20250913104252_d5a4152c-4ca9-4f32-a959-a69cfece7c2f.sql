-- Set the first registered user as admin (useful for initial setup)
-- This should only be run once after the system is deployed
-- You can modify this to set a specific user as admin by changing the email

-- Comment this out if you don't want automatic first-user admin setup
-- UPDATE public.profiles 
-- SET is_approved = true, is_admin = true 
-- WHERE id = (
--   SELECT id FROM public.profiles 
--   ORDER BY created_at ASC 
--   LIMIT 1
-- );

-- Alternative: Set a specific user as admin by email
-- Replace 'your-email@example.com' with the actual admin email
-- UPDATE public.profiles 
-- SET is_approved = true, is_admin = true 
-- WHERE email = 'your-email@example.com';