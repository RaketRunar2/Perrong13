-- ============================================================
-- PERRONG 13 – Speldata: Fall 1 "Sångerskan utan ansikte"
-- Kör detta EFTER 01_schema.sql
-- ============================================================

-- Rensa befintlig data om du kör om (valfritt)
-- DELETE FROM player_progress; DELETE FROM verdicts; DELETE FROM insights; DELETE FROM clues; DELETE FROM cases;

-- ------------------------------------------------------------
-- FALL
-- ------------------------------------------------------------

INSERT INTO cases (id, title, description, is_active)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Sångerskan utan ansikte',
  'En kvinna anländer till Perrong 13 – men hennes berättelse stämmer inte. Vem är hon egentligen, och vad hände den natten?',
  true
);

-- ------------------------------------------------------------
-- LEDTRÅDAR
-- ------------------------------------------------------------

INSERT INTO clues (case_id, label, description, location) VALUES
  ('11111111-1111-1111-1111-111111111111', 'A',
   'Bränt programblad från en teater – elden har ätit upp namnet på huvudrollen, men ornamentiken avslöjar en specifik scen.',
   'Arkivrummet'),

  ('11111111-1111-1111-1111-111111111111', 'B',
   'En koffert märkt med initialer som inte tillhör henne – lädret är slitet på ett sätt som antyder lång förvaring, inte resor.',
   'Perrongen'),

  ('11111111-1111-1111-1111-111111111111', 'C',
   'Färjeloggen visar att sista båten avgick tre timmar tidigare än hon påstår – hennes alibi löser sig som dimma.',
   'Arkivrummet'),

  ('11111111-1111-1111-1111-111111111111', 'D',
   'Eko ur minnets korridorer: "Du lovade att ingen skulle känna igen mig" – en röst hon försökt glömma.',
   'Minnesrummet'),

  ('11111111-1111-1111-1111-111111111111', 'E',
   'Saltvatten i skorna – inte havsdimma, utan spår av ett vadande. Någon tog sig iland på ett okonventionellt sätt.',
   'Perrongen'),

  ('11111111-1111-1111-1111-111111111111', 'F',
   'En enkelbiljett utan namn, stämplad fel dag – antingen ett misstag eller ett medvetet spår av en ny identitet.',
   'Perrongen'),

  ('11111111-1111-1111-1111-111111111111', 'G',
   'En blomma från en begravning – men datumet på bandet är tre dagar efter det hon säger att hon lämnade.',
   'Minnesrummet'),

  ('11111111-1111-1111-1111-111111111111', 'H',
   'Ett telegram märkt "förstör efter läsning" – delvis bränt, men orden "möt mig" och ett klockslag syns fortfarande.',
   'Arkivrummet');

-- ------------------------------------------------------------
-- INSIKTER
-- Etikett lagras i description-prefixet för referens i koden
-- required_clues/required_insights pekar på etiketter
-- ------------------------------------------------------------

INSERT INTO insights (id, case_id, description, required_clues, required_insights) VALUES

  ('aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111',
   'INSIKT 1: Hon uppträdde under falsk identitet – programbladet och ekot avslöjar att hon spelat en roll långt innan hon kom hit.',
   ARRAY['A', 'D'], ARRAY[]::text[]),

  ('aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111',
   'INSIKT 2: Hennes berättelse om resvägen stämmer inte – färjeloggen och saltvattnet pekar på en hemlig landning.',
   ARRAY['C', 'E'], ARRAY[]::text[]),

  ('aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111',
   'INSIKT 3: Kofferten skickades i förväg för att stödja den falska identiteten – en noggrann planering avslöjas.',
   ARRAY['B'], ARRAY['aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa']),

  ('aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111',
   'INSIKT 4: Någon hjälpte henne resa obemärkt – biljetten och den falska resvägen tyder på en medbrottsling.',
   ARRAY['F'], ARRAY['aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa']),

  ('aaaaaaaa-0005-0005-0005-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111',
   'INSIKT 5: Hennes död kan ha varit planerad – eller iscensatt. Blomman och telegrammet talar om en koordinerad handling.',
   ARRAY['G', 'H'], ARRAY[]::text[]),

  ('aaaaaaaa-0006-0006-0006-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111',
   'SLUTINSIKT: Detta var ett iscensatt försvinnande – varje ledtråd var ett nödvändigt steg i hennes flykt undan ett liv hon inte längre kunde bära.',
   ARRAY[]::text[],
   ARRAY['aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa',
         'aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa',
         'aaaaaaaa-0005-0005-0005-aaaaaaaaaaaa']);

-- ------------------------------------------------------------
-- SLUTBESLUT
-- ------------------------------------------------------------

INSERT INTO verdicts (case_id, label, description, is_correct) VALUES

  ('11111111-1111-1111-1111-111111111111',
   'Olycka',
   'En tragisk olyckshändelse – inget brott, bara en öde natt och fel plats. Men varför stämmer ingenting?',
   false),

  ('11111111-1111-1111-1111-111111111111',
   'Mord',
   'Någon ville henne illa och fick sin vilja igenom – men vem, och varför lämna så många spår?',
   false),

  ('11111111-1111-1111-1111-111111111111',
   'Iscensatt försvinnande',
   'Hon planerade allt – en ny identitet, en hemlig flyktväg, en medbrottsling. Sångerskan utan ansikte valde att försvinna.',
   true);
