-- Create the twitch_integration_settings table
CREATE TABLE IF NOT EXISTS public.twitch_integration_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_points_enabled BOOLEAN DEFAULT FALSE,
  channel_points_reward_id TEXT,
  channel_points_message TEXT,
  channel_points_redemption_type TEXT DEFAULT 'time',
  channel_points_time_amount INTEGER DEFAULT 1,
  channel_points_time_unit TEXT DEFAULT 'hours',
  channel_points_message_count INTEGER DEFAULT 10,
  channel_points_stack_redemptions BOOLEAN DEFAULT TRUE,
  bits_enabled BOOLEAN DEFAULT FALSE,
  bits_minimum INTEGER DEFAULT 100,
  bits_message TEXT,
  bits_redemption_type TEXT DEFAULT 'time',
  bits_time_amount INTEGER DEFAULT 1,
  bits_time_unit TEXT DEFAULT 'hours',
  bits_message_count INTEGER DEFAULT 10,
  bits_stack_redemptions BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id)
);

-- Set up RLS policies
ALTER TABLE public.twitch_integration_settings ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own settings
CREATE POLICY "Users can read their own twitch integration settings"
  ON public.twitch_integration_settings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy for users to insert their own settings
CREATE POLICY "Users can insert their own twitch integration settings"
  ON public.twitch_integration_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own settings
CREATE POLICY "Users can update their own twitch integration settings"
  ON public.twitch_integration_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy for users to delete their own settings
CREATE POLICY "Users can delete their own twitch integration settings"
  ON public.twitch_integration_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create a trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_twitch_integration_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_twitch_integration_settings_updated_at
BEFORE UPDATE ON public.twitch_integration_settings
FOR EACH ROW
EXECUTE FUNCTION update_twitch_integration_settings_updated_at();
