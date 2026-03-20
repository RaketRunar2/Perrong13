-- ============================================================
-- PERRONG 13 – Databasschema
-- Kör detta i Supabase SQL Editor
-- ============================================================

-- Aktivera UUID-tillägg (brukar redan vara aktiverat i Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------
-- TABELLER
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cases (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text,
  is_active   boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS clues (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     uuid REFERENCES cases(id) ON DELETE CASCADE,
  label       text NOT NULL,        -- t.ex. "A", "B", "C"
  description text NOT NULL,
  location    text NOT NULL         -- t.ex. "Arkivrummet"
);

CREATE TABLE IF NOT EXISTS insights (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id           uuid REFERENCES cases(id) ON DELETE CASCADE,
  description       text NOT NULL,
  required_clues    text[],         -- ledtrådsetiketter, t.ex. ARRAY['A','D']
  required_insights text[]          -- insiktsetiketter, t.ex. ARRAY['insikt1']
);

CREATE TABLE IF NOT EXISTS verdicts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     uuid REFERENCES cases(id) ON DELETE CASCADE,
  label       text NOT NULL,
  description text NOT NULL,
  is_correct  boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS player_progress (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        text NOT NULL,
  case_id           uuid REFERENCES cases(id) ON DELETE CASCADE,
  found_clues       text[] DEFAULT '{}',
  unlocked_insights text[] DEFAULT '{}',
  chosen_verdict    uuid,
  created_at        timestamp DEFAULT now(),
  updated_at        timestamp DEFAULT now()
);

-- Index för snabbare uppslagning
CREATE INDEX IF NOT EXISTS idx_clues_case_id        ON clues(case_id);
CREATE INDEX IF NOT EXISTS idx_insights_case_id     ON insights(case_id);
CREATE INDEX IF NOT EXISTS idx_verdicts_case_id     ON verdicts(case_id);
CREATE INDEX IF NOT EXISTS idx_progress_session     ON player_progress(session_id);
CREATE INDEX IF NOT EXISTS idx_progress_case        ON player_progress(case_id);

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- Tillåter anonym läsning av speldata och skrivning av progress
-- ------------------------------------------------------------

ALTER TABLE cases           ENABLE ROW LEVEL SECURITY;
ALTER TABLE clues           ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights        ENABLE ROW LEVEL SECURITY;
ALTER TABLE verdicts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_progress ENABLE ROW LEVEL SECURITY;

-- Speldata: alla kan läsa
CREATE POLICY "Public read cases"    ON cases    FOR SELECT USING (true);
CREATE POLICY "Public read clues"    ON clues    FOR SELECT USING (true);
CREATE POLICY "Public read insights" ON insights FOR SELECT USING (true);
CREATE POLICY "Public read verdicts" ON verdicts FOR SELECT USING (true);

-- Player progress: alla kan skapa och uppdatera sin egen session
CREATE POLICY "Insert own progress"  ON player_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Select own progress"  ON player_progress FOR SELECT USING (true);
CREATE POLICY "Update own progress"  ON player_progress FOR UPDATE USING (true);
