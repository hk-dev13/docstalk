-- Create user_usage table for monthly limits
CREATE TABLE IF NOT EXISTS user_usage (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
  query_count INTEGER DEFAULT 0,
  last_reset_date TIMESTAMP DEFAULT NOW()
);

-- Function to reset usage monthly
CREATE OR REPLACE FUNCTION check_and_reset_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- If last_reset_date is more than 30 days ago, reset count
  IF OLD.last_reset_date < NOW() - INTERVAL '30 days' THEN
    NEW.query_count = 0;
    NEW.last_reset_date = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check reset before update
CREATE TRIGGER trigger_reset_usage
  BEFORE UPDATE ON user_usage
  FOR EACH ROW
  EXECUTE FUNCTION check_and_reset_usage();

-- Function to handle new user creation (idempotent)
CREATE OR REPLACE FUNCTION handle_new_user(clerk_user_id TEXT, user_email TEXT)
RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Insert or get existing user
  INSERT INTO users (clerk_id, email)
  VALUES (clerk_user_id, user_email)
  ON CONFLICT (clerk_id) DO UPDATE SET email = EXCLUDED.email
  RETURNING id INTO new_user_id;

  -- Ensure usage record exists
  INSERT INTO user_usage (user_id)
  VALUES (new_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql;
