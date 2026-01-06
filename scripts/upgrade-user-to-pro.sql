-- Upgrade User to Pro Plan
-- Run this in Supabase Dashboard → SQL Editor

-- Option 1: Update by email (replace with your email)
UPDATE profiles 
SET plan = 'pro', updated_at = now()
WHERE email = 'your-email@example.com';

-- Option 2: Update by user_id (get your user_id from Authentication → Users)
-- UPDATE profiles 
-- SET plan = 'pro', updated_at = now()
-- WHERE user_id = 'your-user-id-here';

-- Option 3: List all users to find your user_id
-- SELECT 
--   p.user_id,
--   p.email,
--   p.plan,
--   au.created_at as user_created_at
-- FROM profiles p
-- JOIN auth.users au ON p.user_id = au.id
-- ORDER BY au.created_at DESC;

-- Option 4: Update the most recently created user (use with caution)
-- UPDATE profiles 
-- SET plan = 'pro', updated_at = now()
-- WHERE user_id = (
--   SELECT id FROM auth.users 
--   ORDER BY created_at DESC 
--   LIMIT 1
-- );

-- Verify the update
SELECT email, plan, updated_at 
FROM profiles 
WHERE plan = 'pro';

