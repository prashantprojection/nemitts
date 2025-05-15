-- Create theme settings table
CREATE TABLE IF NOT EXISTS theme_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  settings JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create voice settings table
CREATE TABLE IF NOT EXISTS voice_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  voiceName TEXT NOT NULL,
  rate FLOAT NOT NULL DEFAULT 1,
  pitch FLOAT NOT NULL DEFAULT 1,
  volume FLOAT NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create filter settings table
CREATE TABLE IF NOT EXISTS filter_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  minMessageLength INTEGER NOT NULL DEFAULT 0,
  maxMessageLength INTEGER NOT NULL DEFAULT 500,
  userCooldown INTEGER NOT NULL DEFAULT 0,
  speakUsernames BOOLEAN NOT NULL DEFAULT TRUE,
  skipEmojisInMessage BOOLEAN NOT NULL DEFAULT TRUE,
  skipLinksInMessage BOOLEAN NOT NULL DEFAULT TRUE,
  skipBotMessages BOOLEAN NOT NULL DEFAULT TRUE,
  excludedUsernames TEXT[] NOT NULL DEFAULT '{}',
  blacklistedUsers TEXT[] NOT NULL DEFAULT '{}',
  whitelistedUsers TEXT[] NOT NULL DEFAULT '{}',
  priorityUsers TEXT[] NOT NULL DEFAULT '{}',
  blacklistedWords TEXT[] NOT NULL DEFAULT '{}',
  whitelistedWords TEXT[] NOT NULL DEFAULT '{}',
  regexFilters JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies
ALTER TABLE theme_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE filter_settings ENABLE ROW LEVEL SECURITY;

-- Theme settings policies
CREATE POLICY "Users can view their own theme settings"
  ON theme_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own theme settings"
  ON theme_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own theme settings"
  ON theme_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own theme settings"
  ON theme_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Voice settings policies
CREATE POLICY "Users can view their own voice settings"
  ON voice_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own voice settings"
  ON voice_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice settings"
  ON voice_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voice settings"
  ON voice_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Filter settings policies
CREATE POLICY "Users can view their own filter settings"
  ON filter_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own filter settings"
  ON filter_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own filter settings"
  ON filter_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own filter settings"
  ON filter_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS theme_settings_user_id_idx ON theme_settings(user_id);
CREATE INDEX IF NOT EXISTS voice_settings_user_id_idx ON voice_settings(user_id);
CREATE INDEX IF NOT EXISTS filter_settings_user_id_idx ON filter_settings(user_id);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_theme_settings_updated_at
BEFORE UPDATE ON theme_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voice_settings_updated_at
BEFORE UPDATE ON voice_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_filter_settings_updated_at
BEFORE UPDATE ON filter_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
