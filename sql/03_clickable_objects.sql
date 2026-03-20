-- ============================================================
-- PERRONG 13 – Migration 03: Klickbara objekt + mer innehåll
-- ============================================================

-- ------------------------------------------------------------
-- 1. Lägg till kolumner på clues-tabellen
-- ------------------------------------------------------------
ALTER TABLE clues ADD COLUMN IF NOT EXISTS object_name text;
ALTER TABLE clues ADD COLUMN IF NOT EXISTS object_emoji text;
ALTER TABLE clues ADD COLUMN IF NOT EXISTS is_decoy boolean DEFAULT false;
ALTER TABLE clues ADD COLUMN IF NOT EXISTS decoy_text text;

-- ------------------------------------------------------------
-- 2. Ny tabell: room_scenes (atmosfär per rum)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS room_scenes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id    uuid REFERENCES cases(id) ON DELETE CASCADE,
  location   text NOT NULL,
  scene_desc text,
  bg_class   text
);

-- ------------------------------------------------------------
-- 3. Uppdatera befintliga ledtrådar A–H med objekt-info
-- ------------------------------------------------------------
UPDATE clues SET object_name = 'Protokollhyllan', object_emoji = '📚'
  WHERE label = 'A' AND case_id = '11111111-1111-1111-1111-111111111111';

UPDATE clues SET object_name = 'Resväskan', object_emoji = '🧳'
  WHERE label = 'B' AND case_id = '11111111-1111-1111-1111-111111111111';

UPDATE clues SET object_name = 'Färjeloggen', object_emoji = '📋'
  WHERE label = 'C' AND case_id = '11111111-1111-1111-1111-111111111111';

UPDATE clues SET object_name = 'Grammofonen', object_emoji = '🎵'
  WHERE label = 'D' AND case_id = '11111111-1111-1111-1111-111111111111';

UPDATE clues SET object_name = 'Det våta spåret', object_emoji = '👟'
  WHERE label = 'E' AND case_id = '11111111-1111-1111-1111-111111111111';

UPDATE clues SET object_name = 'Biljettluckan', object_emoji = '🎫'
  WHERE label = 'F' AND case_id = '11111111-1111-1111-1111-111111111111';

UPDATE clues SET object_name = 'Blomkransen', object_emoji = '💐'
  WHERE label = 'G' AND case_id = '11111111-1111-1111-1111-111111111111';

UPDATE clues SET object_name = 'Eldstaden', object_emoji = '🔥'
  WHERE label = 'H' AND case_id = '11111111-1111-1111-1111-111111111111';

-- ------------------------------------------------------------
-- 4. Nya decoy-objekt (I, J, K)
-- ------------------------------------------------------------
INSERT INTO clues (case_id, label, description, location, object_name, object_emoji, is_decoy, decoy_text) VALUES

  ('11111111-1111-1111-1111-111111111111', 'I',
   '', 'Perrongen',
   'Bänken', '🪑', true,
   'Kall järn och slitet trä. Ingenting mer.'),

  ('11111111-1111-1111-1111-111111111111', 'J',
   '', 'Arkivrummet',
   'Spindelnätet', '🕸️', true,
   'Bara åren som samlat sig i hörnet.'),

  ('11111111-1111-1111-1111-111111111111', 'K',
   '', 'Minnesrummet',
   'Fönstret', '🪟', true,
   'Dimman utanför avslöjar ingenting.');

-- ------------------------------------------------------------
-- 5. Nya riktiga ledtrådar (L, M, N)
-- ------------------------------------------------------------
INSERT INTO clues (case_id, label, description, location, object_name, object_emoji, is_decoy) VALUES

  ('11111111-1111-1111-1111-111111111111', 'L',
   'Stationsuren stannade exakt 23:47 – en minut efter att sista tåget avgick utan henne. Någon stängde av det med avsikt.',
   'Perrongen',
   'Stationsuret', '🕰️', false),

  ('11111111-1111-1111-1111-111111111111', 'M',
   'Hennes namn saknas i passagerarlistan, men en handskriven notering i marginalen avslöjar ett alias: "Mme. Laurent".',
   'Arkivrummet',
   'Passagerarlistan', '📜', false),

  ('11111111-1111-1111-1111-111111111111', 'N',
   'Inristat i spegelns lackerade baksida: ett datum tre år tillbaka och orden "nu är det klart".',
   'Minnesrummet',
   'Spegelns baksida', '🪞', false);

-- ------------------------------------------------------------
-- 6. Nya insikter (7–9) som bygger på L, M, N
-- ------------------------------------------------------------
INSERT INTO insights (id, case_id, description, required_clues, required_insights) VALUES

  ('bbbbbbbb-0007-0007-0007-bbbbbbbbbbbb',
   '11111111-1111-1111-1111-111111111111',
   'INSIKT 7: Klockan stannade med avsikt – tidslinjen är manipulerad och hennes alibi om sista tåget faller samman.',
   ARRAY['L'],
   ARRAY['aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa']),

  ('bbbbbbbb-0008-0008-0008-bbbbbbbbbbbb',
   '11111111-1111-1111-1111-111111111111',
   'INSIKT 8: Aliaset "Mme. Laurent" i officiella dokument bekräftar att identitetsbedrägeriet var planerat i förväg.',
   ARRAY['M'],
   ARRAY['aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa']),

  ('bbbbbbbb-0009-0009-0009-bbbbbbbbbbbb',
   '11111111-1111-1111-1111-111111111111',
   'INSIKT 9: Spegelns inskrift visar att beslutet att försvinna fattades tre år tidigare – detta var inget impulsbeslut.',
   ARRAY['N'],
   ARRAY['aaaaaaaa-0005-0005-0005-aaaaaaaaaaaa']);

-- ------------------------------------------------------------
-- 7. Nya slutbeslut (fel spår)
-- ------------------------------------------------------------
INSERT INTO verdicts (case_id, label, description, is_correct) VALUES

  ('11111111-1111-1111-1111-111111111111',
   'Kidnappning',
   'Någon tvingade henne att försvinna – men varje ledtråd pekar mot ett eget, välplanerat beslut. Bevisningen håller inte.',
   false),

  ('11111111-1111-1111-1111-111111111111',
   'Vittnesskydd',
   'Staten gömde henne – men inga officiella spår, inga dokument, inget stöder teorin. Allt är hennes eget verk.',
   false);

-- ------------------------------------------------------------
-- 8. Rumsatmosfärer
-- ------------------------------------------------------------
INSERT INTO room_scenes (case_id, location, scene_desc, bg_class) VALUES

  ('11111111-1111-1111-1111-111111111111',
   'Perrongen',
   'Dimman hänger tung över stenläggningen. Gaslyktorna sprider ett sjukt gult sken och kastar långa skuggor mot spåren. Långt borta, ute i mörkret, ekar ett tågs visselpipa – och sedan, ingenting.',
   'scene-platform'),

  ('11111111-1111-1111-1111-111111111111',
   'Arkivrummet',
   'Hyllorna tornar sig mot taket i mörka kolonner. Lukten av damm och gamla hemligheter blandar sig med kall rök. Stearinet i ljusstaken har brunnit ned – men inte länge sedan.',
   'scene-archive'),

  ('11111111-1111-1111-1111-111111111111',
   'Minnesrummet',
   'Allt är mjukt här inne, som om rummet själv drömmde. Minnena rör sig som dimma – vad som var verkligt och vad som är inbillning är svårt att skilja åt.',
   'scene-memory');
