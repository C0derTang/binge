-- Run this in Supabase SQL Editor to add profile picture column

ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Update the profile update route to handle profile_picture
UPDATE users SET profile_picture = NULL WHERE profile_picture IS NULL;