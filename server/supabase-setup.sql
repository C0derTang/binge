CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  interests TEXT[] NOT NULL DEFAULT '{}',
  humor_type TEXT,
  profile_picture TEXT
);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_picture TEXT;
