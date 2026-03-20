/* ══════════════════════════════════════════════════════════
   PERRONG 13 – Spellogik
   ══════════════════════════════════════════════════════════ */

'use strict';

// ── Supabase-konfiguration ───────────────────────────────
const SUPABASE_URL = 'https://sqcoumpttwoeredmnzqn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7yTzrqJyg8sWJjvpp-dkKA_06Dldp7M';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Session-ID (unikt per webbläsarsession) ──────────────
function getSessionId() {
  let id = sessionStorage.getItem('p13_session');
  if (!id) {
    id = 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('p13_session', id);
  }
  return id;
}

// ── Spelstatus ────────────────────────────────────────────
const state = {
  sessionId:        getSessionId(),
  caseId:           null,
  progressId:       null,

  // Speldata från Supabase
  clues:            [],   // alla ledtrådar för detta fall
  insights:         [],   // alla insikter
  verdicts:         [],   // alla slutbeslut
  scenes:           [],   // rumsatmosfärer

  // Spelarens progress
  foundClues:       new Set(),   // etiketter: 'A', 'B', ...
  unlockedInsights: new Set(),   // insikts-uuid:n
  chosenVerdict:    null,

  // UI
  selectedClues:    new Set(),   // valda i kombinationen
  openClue:         null,        // aktuell ledtråd i modal
  visitedDecoys:    new Set(),   // besökta decoy-id:n
};

// ════════════════════════════════════════════════════════
// INITIERING
// ════════════════════════════════════════════════════════
async function init() {
  try {
    await loadCase();
    await loadProgress();
    renderIntro();
    setupEventListeners();
  } catch (err) {
    console.error('Init-fel:', err);
    showError('Kunde inte ladda spelet. Kontrollera nätverksanslutningen.');
  }
}

async function loadCase() {
  const { data: cases, error } = await db
    .from('cases')
    .select('*')
    .eq('is_active', true)
    .limit(1);

  if (error) throw error;
  if (!cases?.length) throw new Error('Inga aktiva fall hittades.');

  const c = cases[0];
  state.caseId = c.id;
  state.caseData = c;

  // Ladda all speldata parallellt
  const [cluesRes, insightsRes, verdictsRes, scenesRes] = await Promise.all([
    db.from('clues').select('*').eq('case_id', c.id),
    db.from('insights').select('*').eq('case_id', c.id),
    db.from('verdicts').select('*').eq('case_id', c.id),
    db.from('room_scenes').select('*').eq('case_id', c.id),
  ]);

  if (cluesRes.error)    throw cluesRes.error;
  if (insightsRes.error) throw insightsRes.error;
  if (verdictsRes.error) throw verdictsRes.error;

  state.clues    = cluesRes.data    || [];
  state.insights = insightsRes.data || [];
  state.verdicts = verdictsRes.data || [];
  state.scenes   = scenesRes.data   || [];
}

async function loadProgress() {
  const { data, error } = await db
    .from('player_progress')
    .select('*')
    .eq('session_id', state.sessionId)
    .eq('case_id', state.caseId)
    .maybeSingle();

  if (error) {
    console.warn('Kunde inte ladda progress:', error);
    return;
  }

  if (data) {
    state.progressId       = data.id;
    state.foundClues       = new Set(data.found_clues       || []);
    state.unlockedInsights = new Set(data.unlocked_insights || []);
    state.chosenVerdict    = data.chosen_verdict;
  }
}

async function saveProgress() {
  const payload = {
    session_id:        state.sessionId,
    case_id:           state.caseId,
    found_clues:       [...state.foundClues],
    unlocked_insights: [...state.unlockedInsights],
    chosen_verdict:    state.chosenVerdict,
    updated_at:        new Date().toISOString(),
  };

  if (state.progressId) {
    await db.from('player_progress').update(payload).eq('id', state.progressId);
  } else {
    const { data, error } = await db
      .from('player_progress')
      .insert(payload)
      .select('id')
      .single();
    if (!error && data) state.progressId = data.id;
  }
}

// ════════════════════════════════════════════════════════
// RENDERA INTRO
// ════════════════════════════════════════════════════════
function renderIntro() {
  const c = state.caseData;
  document.getElementById('case-info').innerHTML = `
    <p class="case-title">Fall: ${escHtml(c.title)}</p>
    <p class="case-desc">${escHtml(c.description)}</p>
  `;
  document.getElementById('topbar-case').textContent = c.title;
  document.getElementById('btn-start').disabled = false;
}

// ════════════════════════════════════════════════════════
// HÄNDELSELYSSNARE
// ════════════════════════════════════════════════════════
function setupEventListeners() {
  // Start-knapp
  document.getElementById('btn-start').addEventListener('click', startGame);

  // Rumsnavigation
  document.querySelectorAll('.room-btn').forEach(btn => {
    btn.addEventListener('click', () => navigateToRoom(btn.dataset.room));
  });

  // Ledtrådsmodal
  document.getElementById('modal-close').addEventListener('click', closeClueModal);
  document.getElementById('modal-collect').addEventListener('click', collectCurrentClue);
  document.getElementById('clue-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeClueModal();
  });

  // Insiktsmodal
  document.getElementById('insight-modal-close').addEventListener('click', () => {
    document.getElementById('insight-modal').classList.add('hidden');
  });

  // Analysera-knapp
  document.getElementById('btn-analyze').addEventListener('click', analyzeSelection);

  // Restart
  document.getElementById('btn-restart').addEventListener('click', () => {
    sessionStorage.removeItem('p13_session');
    location.reload();
  });
}

// ════════════════════════════════════════════════════════
// SPEL – START
// ════════════════════════════════════════════════════════
function startGame() {
  showScreen('game');
  renderAllRooms();
  renderInventory();
  renderInsights();
  updateBadges();

  // Om spelets redan klart, visa slutskärmen direkt
  if (state.chosenVerdict) {
    const verdict = state.verdicts.find(v => v.id === state.chosenVerdict);
    if (verdict) setTimeout(() => showEnding(verdict), 400);
  }
}

// ════════════════════════════════════════════════════════
// RUMSNAVIGATION
// ════════════════════════════════════════════════════════
function navigateToRoom(roomKey) {
  document.querySelectorAll('.room-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.room').forEach(r => r.classList.remove('active'));

  document.querySelector(`.room-btn[data-room="${roomKey}"]`).classList.add('active');
  document.getElementById(`room-${roomKey}`).classList.add('active');
}

// ════════════════════════════════════════════════════════
// RENDERA RUM
// ════════════════════════════════════════════════════════
function renderAllRooms() {
  const c = state.caseData;

  // Lobby
  document.getElementById('lobby-case-card').innerHTML = `
    <p class="case-number">Aktiv utredning</p>
    <p class="case-name">${escHtml(c.title)}</p>
    <p class="case-text">${escHtml(c.description)}</p>
  `;

  // Rumsspecifika objekt
  renderRoomScene('Arkivrummet',  'clues-archive');
  renderRoomScene('Perrongen',    'clues-platform');
  renderRoomScene('Minnesrummet', 'clues-memory');
}

function renderRoomScene(location, containerId) {
  const container = document.getElementById(containerId);
  const roomObjects = state.clues.filter(c => c.location === location);
  const scene = state.scenes.find(s => s.location === location);

  const bgClass = scene?.bg_class ?? '';
  const atmo    = scene?.scene_desc ?? '';

  const objectsHtml = roomObjects.map(obj => {
    const collected     = !obj.is_decoy && state.foundClues.has(obj.label);
    const decoyVisited  = obj.is_decoy && state.visitedDecoys.has(obj.id);
    const clueVisited   = !obj.is_decoy && !collected; // seen but not collected shows dot as dim
    const dotState      = collected ? 'collected' : decoyVisited ? 'visited' : '';

    const emoji = escHtml(obj.object_emoji || '❓');
    const name  = escHtml(obj.object_name  || obj.label);

    return `
      <button class="obj-btn ${dotState}"
              data-clue-id="${escHtml(obj.id)}"
              aria-label="${name}"
              ${collected ? 'disabled' : ''}>
        <span class="obj-dot"></span>
        <span class="obj-emoji">${emoji}</span>
        <span class="obj-name">${name}</span>
      </button>
    `;
  }).join('');

  container.innerHTML = `
    <div class="scene-wrap">
      <div class="${bgClass}">
        ${atmo ? `<p class="scene-atmo">${escHtml(atmo)}</p>` : ''}
        <div class="object-grid">${objectsHtml}</div>
      </div>
    </div>
  `;

  container.querySelectorAll('.obj-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => handleObjectClick(btn.dataset.clueId));
  });
}

function handleObjectClick(clueId) {
  const obj = state.clues.find(c => c.id === clueId);
  if (!obj) return;

  if (obj.is_decoy) {
    state.visitedDecoys.add(obj.id);
    showDecoyFeedback(obj.decoy_text || 'Ingenting av intresse här.');
    // Uppdatera knappens utseende till "visited"
    const btn = document.querySelector(`.obj-btn[data-clue-id="${clueId}"]`);
    if (btn) btn.classList.add('visited');
  } else {
    openClueModal(clueId);
  }
}

function showDecoyFeedback(text) {
  const toast = document.getElementById('decoy-toast');
  if (!toast) return;
  toast.textContent = text;
  toast.classList.remove('show');
  void toast.offsetWidth; // trigga reflow för att återstarta animationen
  toast.classList.add('show');
}

// Renderera om alla rum (kallas efter insamling)
function rerenderRooms() {
  renderRoomScene('Arkivrummet',  'clues-archive');
  renderRoomScene('Perrongen',    'clues-platform');
  renderRoomScene('Minnesrummet', 'clues-memory');
}

// ════════════════════════════════════════════════════════
// LEDTRÅDSMODAL
// ════════════════════════════════════════════════════════
function openClueModal(clueId) {
  const clue = state.clues.find(c => c.id === clueId);
  if (!clue) return;

  state.openClue = clue;
  const collected = state.foundClues.has(clue.label);

  document.getElementById('modal-label').textContent    = clue.label;
  document.getElementById('modal-title').textContent    = `Ledtråd ${clue.label}`;
  document.getElementById('modal-body').textContent     = clue.description;
  document.getElementById('modal-location').textContent = `Plats: ${clue.location}`;

  const collectBtn = document.getElementById('modal-collect');
  if (collected) {
    collectBtn.textContent = 'Redan insamlad ✓';
    collectBtn.disabled    = true;
  } else {
    collectBtn.textContent = 'Lägg i inventariet';
    collectBtn.disabled    = false;
  }

  document.getElementById('clue-modal').classList.remove('hidden');
}

function closeClueModal() {
  document.getElementById('clue-modal').classList.add('hidden');
  state.openClue = null;
}

async function collectCurrentClue() {
  const clue = state.openClue;
  if (!clue || state.foundClues.has(clue.label)) return;

  state.foundClues.add(clue.label);
  closeClueModal();

  // Uppdatera UI
  rerenderRooms();
  renderInventory();
  updateBadges();

  await saveProgress();
}

// ════════════════════════════════════════════════════════
// INVENTARIUM
// ════════════════════════════════════════════════════════
function renderInventory() {
  const list = document.getElementById('inventory-list');
  const slots = document.getElementById('combine-slots');

  const foundArr = [...state.foundClues].sort();

  if (!foundArr.length) {
    list.innerHTML  = '<p class="empty-state">Inga ledtrådar insamlade ännu.</p>';
    slots.innerHTML = '';
    return;
  }

  list.innerHTML = foundArr.map(label => {
    const clue     = state.clues.find(c => c.label === label);
    const selected = state.selectedClues.has(label);
    return `
      <div class="inv-chip ${selected ? 'selected' : ''}" data-label="${label}"
           role="checkbox" aria-checked="${selected}" tabindex="0">
        <span class="chip-badge">${escHtml(label)}</span>
        <span>${clue ? escHtml(clue.description).slice(0, 30) + '…' : ''}</span>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.inv-chip').forEach(chip => {
    chip.addEventListener('click', () => toggleClueSelection(chip.dataset.label));
    chip.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') toggleClueSelection(chip.dataset.label);
    });
  });

  // Combinationsslots
  const selectedArr = [...state.selectedClues].sort();
  if (!selectedArr.length) {
    slots.innerHTML = '<span style="color:var(--text-dim);font-size:.85rem;font-style:italic;">Välj ledtrådar ovan…</span>';
  } else {
    slots.innerHTML = selectedArr.map(label => `
      <div class="slot-chip" data-label="${label}" title="Klicka för att ta bort">
        ${escHtml(label)} <span style="opacity:.6">✕</span>
      </div>
    `).join('');

    slots.querySelectorAll('.slot-chip').forEach(chip => {
      chip.addEventListener('click', () => toggleClueSelection(chip.dataset.label));
    });
  }

  // Rensa analysresultat om urvalet ändrats
  const res = document.getElementById('analyze-result');
  res.classList.add('hidden');
  res.classList.remove('ok', 'fail');
}

function toggleClueSelection(label) {
  if (state.selectedClues.has(label)) {
    state.selectedClues.delete(label);
  } else {
    state.selectedClues.add(label);
  }
  renderInventory();
}

// ════════════════════════════════════════════════════════
// ANALYSERA KOMBINATIONER
// ════════════════════════════════════════════════════════
async function analyzeSelection() {
  const selected    = [...state.selectedClues].sort();
  const insightIds  = [...state.unlockedInsights];

  // Tillåt tomma ledtrådsval om det kan finnas insikt-till-insikt-kedjor
  const hasInsightOnlyCandidate = state.insights.some(insight =>
    !state.unlockedInsights.has(insight.id) &&
    (insight.required_clues?.length ?? 0) === 0 &&
    (insight.required_insights?.length ?? 0) > 0 &&
    (insight.required_insights || []).every(id => state.unlockedInsights.has(id))
  );
  if (!selected.length && !hasInsightOnlyCandidate) return;

  // Hitta matchande insikt
  const match = state.insights.find(insight => {
    if (state.unlockedInsights.has(insight.id)) return false; // redan upplåst

    const needsClues    = insight.required_clues    || [];
    const needsInsights = insight.required_insights || [];

    // Ledtrådar: de valda måste exakt matcha vad insikten kräver (och inget mer från ledtrådar)
    const cluesMatch = needsClues.length > 0 &&
      needsClues.every(l => selected.includes(l)) &&
      selected.every(l => needsClues.includes(l));

    // Insikter: alla krävda insikter måste vara upplåsta
    const insightsOk = needsInsights.every(id => insightIds.includes(id));

    // Specialfall: bara insikter krävs (inga ledtrådar) – välj 0 ledtrådar
    const insightOnly = needsClues.length === 0 && needsInsights.length > 0 && selected.length === 0;

    return (cluesMatch && insightsOk) || (insightOnly && insightsOk);
  });

  const resultEl = document.getElementById('analyze-result');
  resultEl.classList.remove('hidden', 'ok', 'fail');

  if (match) {
    // Lås upp insikten
    state.unlockedInsights.add(match.id);
    state.selectedClues.clear();
    renderInventory();
    renderInsights();
    updateBadges();
    await saveProgress();

    // Visa insiktsmodal
    showInsightModal(match);

    resultEl.classList.add('ok');
    resultEl.textContent = 'Ny insikt upplåst!';
  } else {
    resultEl.classList.add('fail');

    // Kontrollera om alla krävda ledtrådar finns men inte insikter
    const partialMatch = state.insights.find(insight => {
      if (state.unlockedInsights.has(insight.id)) return false;
      const needsClues = insight.required_clues || [];
      if (!needsClues.length) return false;
      return needsClues.every(l => selected.includes(l)) && selected.every(l => needsClues.includes(l));
    });

    if (partialMatch) {
      const missing = (partialMatch.required_insights || [])
        .filter(id => !state.unlockedInsights.has(id));
      resultEl.textContent = `Nästan – du saknar fortfarande ${missing.length} insikt(er) för den här kombinationen.`;
    } else {
      resultEl.textContent = 'Ingen insikt uppstod av den här kombinationen. Försök med andra ledtrådar.';
    }
  }
}

// ════════════════════════════════════════════════════════
// RENDERA INSIKTER
// ════════════════════════════════════════════════════════
function renderInsights() {
  const list = document.getElementById('insights-list');
  const unlocked = state.insights.filter(i => state.unlockedInsights.has(i.id));

  if (!unlocked.length) {
    list.innerHTML = '<p class="empty-state">Inga insikter upplåsta ännu.</p>';
  } else {
    // Sortera: slutinsikten sist
    const sorted = [...unlocked].sort((a, b) => {
      const aFinal = (a.required_clues?.length === 0 && (a.required_insights?.length ?? 0) > 0);
      const bFinal = (b.required_clues?.length === 0 && (b.required_insights?.length ?? 0) > 0);
      return aFinal ? 1 : bFinal ? -1 : 0;
    });

    list.innerHTML = sorted.map(insight => {
      const isFinal = (insight.required_clues?.length === 0 && (insight.required_insights?.length ?? 0) > 0);
      return `
        <div class="insight-card ${isFinal ? 'final' : ''}">
          <p>${escHtml(insight.description)}</p>
        </div>
      `;
    }).join('');
  }

  // Visa slutbeslut om slutinsikten är upplåst
  const finalInsight = state.insights.find(i =>
    i.required_clues?.length === 0 &&
    (i.required_insights?.length ?? 0) > 0 &&
    state.unlockedInsights.has(i.id)
  );

  const verdictSection = document.getElementById('verdict-section');
  if (finalInsight) {
    verdictSection.classList.remove('hidden');
    renderVerdicts();
  } else {
    verdictSection.classList.add('hidden');
  }
}

function renderVerdicts() {
  const container = document.getElementById('verdicts-list');
  container.innerHTML = state.verdicts.map(v => `
    <button class="verdict-btn" data-verdict-id="${escHtml(v.id)}">
      <span class="verdict-name">${escHtml(v.label)}</span>
      <span class="verdict-sub">${escHtml(v.description)}</span>
    </button>
  `).join('');

  container.querySelectorAll('.verdict-btn').forEach(btn => {
    btn.addEventListener('click', () => chooseVerdict(btn.dataset.verdictId));
  });
}

// ════════════════════════════════════════════════════════
// SLUTBESLUT
// ════════════════════════════════════════════════════════
async function chooseVerdict(verdictId) {
  const verdict = state.verdicts.find(v => v.id === verdictId);
  if (!verdict) return;

  state.chosenVerdict = verdictId;
  await saveProgress();
  showEnding(verdict);
}

function showEnding(verdict) {
  showScreen('ending');

  const icon    = verdict.is_correct ? '🕊️' : verdict.label === 'Mord' ? '🔪' : '🌫️';
  const cssClass = verdict.is_correct ? 'correct' : verdict.label === 'Mord' ? 'partial' : 'wrong';

  const flavors = {
    true:  'Själen vilar. Tåget på Perrong 13 avgår äntligen, och i fönstret skymtar du ett leende.',
    Mord:  'Tåget stannar. Något stämmer inte – ett av spåren pekar åt fel håll.',
    Olycka:'Tåget kör åt fel håll. Själen skickas vidare till ett ändlöst väntrum.',
  };

  const flavorKey = verdict.is_correct ? 'true' : verdict.label;

  document.getElementById('ending-icon').textContent  = icon;
  document.getElementById('ending-label').textContent = verdict.is_correct ? 'Rätt slutsats' : verdict.label === 'Mord' ? 'Delvis rätt' : 'Fel slutsats';
  document.getElementById('ending-title').textContent = verdict.label;
  document.getElementById('ending-title').className   = `ending-title ${cssClass}`;
  document.getElementById('ending-body').textContent  = verdict.description;
  document.getElementById('ending-flavor').textContent = flavors[flavorKey] || '';
}

// ════════════════════════════════════════════════════════
// INSIKTSMODAL
// ════════════════════════════════════════════════════════
function showInsightModal(insight) {
  document.getElementById('insight-modal-body').textContent = insight.description;
  document.getElementById('insight-modal').classList.remove('hidden');
}

// ════════════════════════════════════════════════════════
// BADGES
// ════════════════════════════════════════════════════════
function updateBadges() {
  document.getElementById('count-clues').textContent    = state.foundClues.size;
  document.getElementById('count-insights').textContent = state.unlockedInsights.size;
}

// ════════════════════════════════════════════════════════
// SKÄRMVISNING
// ════════════════════════════════════════════════════════
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${name}`).classList.add('active');
}

// ════════════════════════════════════════════════════════
// HJÄLPFUNKTIONER
// ════════════════════════════════════════════════════════
function escHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showError(msg) {
  document.getElementById('case-info').innerHTML =
    `<p style="color:#e08080;font-style:italic;">${escHtml(msg)}</p>`;
}

// ════════════════════════════════════════════════════════
// START
// ════════════════════════════════════════════════════════
init();
