-- Create the user_redemptions table
CREATE TABLE IF NOT EXISTS public.user_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  twitch_username TEXT NOT NULL,
  redemption_type TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  messages_remaining INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, twitch_username)
);

-- Add RLS policies
ALTER TABLE public.user_redemptions ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own redemptions
CREATE POLICY "Users can read their own redemptions"
  ON public.user_redemptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own redemptions
CREATE POLICY "Users can insert their own redemptions"
  ON public.user_redemptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own redemptions
CREATE POLICY "Users can update their own redemptions"
  ON public.user_redemptions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow users to delete their own redemptions
CREATE POLICY "Users can delete their own redemptions"
  ON public.user_redemptions
  FOR DELETE
  USING (auth.uid() = user_id);
