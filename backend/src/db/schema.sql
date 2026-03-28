-- Kindred Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  age_range TEXT CHECK (age_range IN ('18-24','25-30','31-35','36-40','41-45','46+')),
  city TEXT,
  neighborhood TEXT,
  bio TEXT,
  photos TEXT[] DEFAULT '{}',
  quiz_answers JSONB DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',
  dealbreakers JSONB DEFAULT '{}',
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free','premium')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MATCHES
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  compatibility_score FLOAT DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','connected','rejected')),
  user_a_action TEXT CHECK (user_a_action IN ('connect','pass')),
  user_b_action TEXT CHECK (user_b_action IN ('connect','pass')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_a_id, user_b_id),
  CHECK (user_a_id != user_b_id)
);

-- MESSAGES
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text','voice','gif','system')),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HANGOUTS
CREATE TABLE IF NOT EXISTS hangouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  circle_id UUID,
  activity TEXT NOT NULL,
  location TEXT,
  location_url TEXT,
  datetime TIMESTAMPTZ,
  cost_tier TEXT CHECK (cost_tier IN ('free','low','medium','high')),
  status TEXT DEFAULT 'proposed' CHECK (status IN ('proposed','confirmed','completed','cancelled')),
  created_by UUID NOT NULL REFERENCES users(id),
  rating_a INT CHECK (rating_a BETWEEN 1 AND 3),
  rating_b INT CHECK (rating_b BETWEEN 1 AND 3),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CIRCLES
CREATE TABLE IF NOT EXISTS circles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  interest_tag TEXT NOT NULL,
  city TEXT NOT NULL,
  max_members INT DEFAULT 12,
  creator_id UUID NOT NULL REFERENCES users(id),
  is_public BOOLEAN DEFAULT TRUE,
  schedule TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CIRCLE MEMBERS
CREATE TABLE IF NOT EXISTS circle_members (
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (circle_id, user_id)
);

-- EVENTS
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  location_url TEXT,
  datetime TIMESTAMPTZ NOT NULL,
  creator_id UUID NOT NULL REFERENCES users(id),
  circle_id UUID REFERENCES circles(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT TRUE,
  cost_tier TEXT CHECK (cost_tier IN ('free','low','medium','high')),
  max_attendees INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EVENT ATTENDEES
CREATE TABLE IF NOT EXISTS event_attendees (
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rsvp_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

-- REPORTS
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES users(id),
  reported_id UUID NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','reviewed','actioned')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BLOCKS
CREATE TABLE IF NOT EXISTS blocks (
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id)
);

-- DAILY MATCH QUEUE (tracks which profiles a user has seen today)
CREATE TABLE IF NOT EXISTS daily_queue (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seen_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  PRIMARY KEY (user_id, seen_user_id, date)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_matches_user_a ON matches(user_a_id);
CREATE INDEX IF NOT EXISTS idx_matches_user_b ON matches(user_b_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_messages_match ON messages(match_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_circle_members_user ON circle_members(user_id);
CREATE INDEX IF NOT EXISTS idx_events_datetime ON events(datetime);
CREATE INDEX IF NOT EXISTS idx_daily_queue_user_date ON daily_queue(user_id, date);

-- AUTO-UPDATE updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER matches_updated_at BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER hangouts_updated_at BEFORE UPDATE ON hangouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
