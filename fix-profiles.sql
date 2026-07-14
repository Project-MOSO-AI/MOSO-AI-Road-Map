DROP TABLE IF EXISTS work_sessions CASCADE;
DROP TABLE IF EXISTS app_state CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'viewer')),
  display_name TEXT,
  avatar_url TEXT
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, display_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TABLE work_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id),
  date TEXT NOT NULL,
  start_time BIGINT NOT NULL,
  end_time BIGINT,
  duration INTEGER NOT NULL DEFAULT 0,
  node_id TEXT,
  techs TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE app_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles visible to all" ON profiles FOR SELECT USING (true);
CREATE POLICY "Owners can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Sessions visible to all" ON work_sessions FOR SELECT USING (true);
CREATE POLICY "Owners can manage sessions" ON work_sessions FOR ALL
  USING ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'owner');
CREATE POLICY "App state visible to all" ON app_state FOR SELECT USING (true);
CREATE POLICY "Owners can manage app_state" ON app_state FOR ALL
  USING ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'owner');
