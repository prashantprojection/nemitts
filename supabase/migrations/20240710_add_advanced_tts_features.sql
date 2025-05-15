-- Add new columns to user_settings table for advanced TTS features
ALTER TABLE IF EXISTS public.user_settings
ADD COLUMN IF NOT EXISTS filter_settings JSONB,
ADD COLUMN IF NOT EXISTS user_voice_assignments JSONB,
ADD COLUMN IF NOT EXISTS external_tts_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS external_tts_api_key TEXT;

-- Create RLS policies for the new columns
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Only allow users to see and modify their own settings
CREATE POLICY "Users can view their own settings"
  ON public.user_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON public.user_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.user_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_name ON public.chat_messages (channel_name);
