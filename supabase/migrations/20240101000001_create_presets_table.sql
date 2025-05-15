-- Create presets table
CREATE TABLE IF NOT EXISTS presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  preset_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  settings JSONB NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS presets_user_id_idx ON presets(user_id);
CREATE INDEX IF NOT EXISTS presets_preset_type_idx ON presets(preset_type);
CREATE INDEX IF NOT EXISTS presets_is_default_idx ON presets(is_default);

-- Enable RLS
ALTER TABLE presets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own presets"
  ON presets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own presets"
  ON presets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presets"
  ON presets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presets"
  ON presets FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_presets_updated_at
BEFORE UPDATE ON presets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
