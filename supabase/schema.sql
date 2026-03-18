-- ═══════════════════════════════════════════════════════════════
--  ColorcraftAI — Supabase Database Schema + Seed Data
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── CLIENTS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  slug           TEXT UNIQUE NOT NULL,
  business_type  TEXT,
  city           TEXT,
  contact_name   TEXT,
  contact_email  TEXT,
  contact_phone  TEXT,
  plan           TEXT DEFAULT 'starter' CHECK (plan IN ('starter','growth','pro','enterprise')),
  status         TEXT DEFAULT 'active'  CHECK (status IN ('active','paused','churned')),
  reputation_score NUMERIC(3,1) DEFAULT 0,
  monthly_fee    INTEGER DEFAULT 2999,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── PLATFORMS PER CLIENT ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_platforms (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id    UUID REFERENCES clients(id) ON DELETE CASCADE,
  platform     TEXT NOT NULL,
  rating       NUMERIC(2,1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  profile_url  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, platform)
);

-- ── REVIEWS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL,
  reviewer_name   TEXT,
  rating          INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text     TEXT NOT NULL,
  review_date     TIMESTAMPTZ DEFAULT NOW(),
  ai_response     TEXT,
  response_status TEXT DEFAULT 'pending' CHECK (response_status IN ('pending','approved','published','skipped')),
  is_urgent       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── CHAT MESSAGES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  client_id  UUID REFERENCES clients(id),
  role       TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── ALERTS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id   UUID REFERENCES clients(id) ON DELETE CASCADE,
  type        TEXT CHECK (type IN ('crisis','milestone','warning','info')),
  title       TEXT NOT NULL,
  description TEXT,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════
--  SEED DATA
-- ════════════════════════════════════════════════════════════════

-- ── Insert clients ───────────────────────────────────────────────
INSERT INTO clients (id, name, slug, business_type, city, contact_name, contact_email, contact_phone, plan, status, reputation_score, monthly_fee) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Sharma Dental',   'sharma-dental',   'Dental Clinic',     'Delhi',     'Dr. Anuj Sharma',   'anuj@sharmadental.in',    '+91-9811000001', 'growth',   'active', 4.4, 5999),
  ('11111111-0000-0000-0000-000000000002', 'The Grill House', 'the-grill-house',  'Restaurant',        'Mumbai',    'Rajan Mehta',        'rajan@grillhouse.in',     '+91-9822000002', 'growth',   'active', 4.2, 5999),
  ('11111111-0000-0000-0000-000000000003', 'Harbor Inn',      'harbor-inn',       'Hotel',             'Goa',       'Priya Fernandes',    'priya@harborinn.in',      '+91-9833000003', 'pro',      'active', 3.9, 9999),
  ('11111111-0000-0000-0000-000000000004', 'Apex Coaching',   'apex-coaching',    'Education Centre',  'Pune',      'Vikram Joshi',       'vikram@apexcoaching.in',  '+91-9844000004', 'starter',  'active', 4.7, 2999),
  ('11111111-0000-0000-0000-000000000005', 'Bliss Gym',       'bliss-gym',        'Fitness Centre',    'Bangalore', 'Anita Reddy',        'anita@blissgym.in',       '+91-9855000005', 'starter',  'active', 4.1, 2999),
  ('11111111-0000-0000-0000-000000000006', 'Spice Story',     'spice-story',      'Restaurant',        'Hyderabad', 'Karim Hussain',      'karim@spicestory.in',     '+91-9866000006', 'growth',   'active', 4.5, 5999),
  ('11111111-0000-0000-0000-000000000007', 'FitHub Yoga',     'fithub-yoga',      'Wellness Studio',   'Chennai',   'Meera Krishnan',     'meera@fithub.in',         '+91-9877000007', 'starter',  'active', 4.6, 2999)
ON CONFLICT (slug) DO NOTHING;

-- ── Insert platforms ─────────────────────────────────────────────
INSERT INTO client_platforms (client_id, platform, rating, review_count) VALUES
  -- Sharma Dental
  ('11111111-0000-0000-0000-000000000001', 'google',    4.4, 31),
  ('11111111-0000-0000-0000-000000000001', 'practo',    4.6, 18),
  ('11111111-0000-0000-0000-000000000001', 'justdial',  4.1,  9),
  -- The Grill House
  ('11111111-0000-0000-0000-000000000002', 'google',    4.1, 22),
  ('11111111-0000-0000-0000-000000000002', 'zomato',    4.3, 28),
  -- Harbor Inn
  ('11111111-0000-0000-0000-000000000003', 'google',    3.8, 44),
  ('11111111-0000-0000-0000-000000000003', 'tripadvisor', 4.0, 31),
  -- Apex Coaching
  ('11111111-0000-0000-0000-000000000004', 'google',    4.7, 19),
  -- Bliss Gym
  ('11111111-0000-0000-0000-000000000005', 'google',    4.1, 22),
  ('11111111-0000-0000-0000-000000000005', 'justdial',  3.9, 11),
  -- Spice Story
  ('11111111-0000-0000-0000-000000000006', 'google',    4.4, 37),
  ('11111111-0000-0000-0000-000000000006', 'zomato',    4.6, 29),
  -- FitHub Yoga
  ('11111111-0000-0000-0000-000000000007', 'google',    4.6, 15)
ON CONFLICT (client_id, platform) DO NOTHING;

-- ── Insert reviews ───────────────────────────────────────────────
INSERT INTO reviews (client_id, platform, reviewer_name, rating, review_text, review_date, response_status, is_urgent) VALUES
  -- Sharma Dental — pending, urgent
  ('11111111-0000-0000-0000-000000000001', 'Google',   'Rahul K.',      2, 'Waited 45 minutes past my appointment. No apology from staff. Very disappointing experience overall.',                         NOW() - INTERVAL '2 hours',  'pending', true),
  ('11111111-0000-0000-0000-000000000001', 'Practo',   'Meena S.',      5, 'Dr. Sharma is absolutely brilliant! Root canal was completely painless. Best dental clinic in South Delhi without doubt.',     NOW() - INTERVAL '5 hours',  'pending', false),
  ('11111111-0000-0000-0000-000000000001', 'Google',   'Vikash P.',     4, 'Good clinic overall. The staff is friendly and the treatment is thorough. Only gripe is the waiting time can be long.',       NOW() - INTERVAL '1 day',   'published', false),

  -- The Grill House — pending
  ('11111111-0000-0000-0000-000000000002', 'Zomato',   'Ananya M.',     4, 'Good food and nice ambience. Service was a bit slow on Friday night but overall a pleasant experience. Will return.',         NOW() - INTERVAL '5 hours',  'pending', false),
  ('11111111-0000-0000-0000-000000000002', 'Google',   'Saurabh D.',    5, 'Best biryani in Mumbai hands down. The butter chicken is divine. A must visit for non-veg lovers.',                          NOW() - INTERVAL '3 days',  'published', false),

  -- Harbor Inn — CRISIS
  ('11111111-0000-0000-0000-000000000003', 'Google',   'Pradeep N.',    1, 'Room was dirty and AC not working. Staff refused to change room. Never staying here again. Total disappointment.',            NOW() - INTERVAL '1 hour',  'pending', true),
  ('11111111-0000-0000-0000-000000000003', 'TripAdvisor','Deepa R.',    3, 'Average stay. Location is great but the rooms need renovation. Breakfast was decent. Would not call it value for money.',    NOW() - INTERVAL '2 days',  'pending', false),

  -- Apex Coaching — positive
  ('11111111-0000-0000-0000-000000000004', 'Google',   'Kavita J.',     5, 'My son got into IIT after coaching here. The faculty is exceptional and the study material is very well structured.',          NOW() - INTERVAL '8 hours',  'pending', false),

  -- Bliss Gym
  ('11111111-0000-0000-0000-000000000005', 'Google',   'Rohit T.',      4, 'Great trainers and well-maintained equipment. The nutrition guidance they provide is excellent. Good value for money.',       NOW() - INTERVAL '12 hours', 'pending', false),

  -- Spice Story
  ('11111111-0000-0000-0000-000000000006', 'Zomato',   'Fatima K.',     5, 'The Hyderabadi biryani here is authentic and absolutely delicious. Generous portions and great service. Highly recommended!', NOW() - INTERVAL '6 hours',  'pending', false);

-- ── Insert alerts ────────────────────────────────────────────────
INSERT INTO alerts (client_id, type, title, description, is_read) VALUES
  ('11111111-0000-0000-0000-000000000003', 'crisis',    '1-star review — Harbor Inn',         '"Room dirty and AC broken..." — respond within 48 hrs',          false),
  ('11111111-0000-0000-0000-000000000004', 'milestone', 'Milestone — Apex Coaching',          'Crossed 4.5 stars on Google for the first time',                 false),
  ('11111111-0000-0000-0000-000000000001', 'warning',   'Response pending — Sharma Dental',   '2-star review has been pending for 3+ hours',                    false),
  ('11111111-0000-0000-0000-000000000006', 'info',      'New 5-star review — Spice Story',    'Fatima K. left a 5-star review on Zomato',                       true);

-- ── Enable Row Level Security (RLS) — open for now, restrict later ──
ALTER TABLE clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews          ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts           ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (safe for server-side API calls)
CREATE POLICY "service_all_clients"          ON clients          FOR ALL USING (true);
CREATE POLICY "service_all_platforms"        ON client_platforms FOR ALL USING (true);
CREATE POLICY "service_all_reviews"          ON reviews          FOR ALL USING (true);
CREATE POLICY "service_all_chat_messages"    ON chat_messages    FOR ALL USING (true);
CREATE POLICY "service_all_alerts"           ON alerts           FOR ALL USING (true);
