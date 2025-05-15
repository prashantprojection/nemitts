-- Add external TTS voice ID to user_settings table
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS external_tts_voice_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS user_settings_external_tts_voice_id_idx ON user_settings(external_tts_voice_id);

-- Update RLS policies to include the new column
CREATE OR REPLACE POLICY "Users can view their own user settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE POLICY "Users can insert their own user settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE POLICY "Users can update their own user settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE OR REPLACE POLICY "Users can delete their own user settings"
  ON user_settings FOR DELETE
  USING (auth.uid() = user_id);
