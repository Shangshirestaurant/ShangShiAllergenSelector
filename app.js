
/* ---------- N8 / Shang Shi Allergen Filter (Patched) ----------
   - Bullet-proof “CONTAINS” filter for MI (Milk) and all others
   - Normalizes allergen codes: trim + UPPERCASE
   - Cleans data (drops blanks, dedupes, Fl -> FI)
   - Works with SAFE (does NOT contain any selected) vs CONTAINS (has ANY)
----------------------------------------------------------------- */

// ====== Config ======
const ALLERGENS = {
  CE: "Celery",
  GL: "Cereals (gluten)",
  CR: "Crustaceans",
  EG: "Eggs",
  FI: "Fish",
  GA: "Garlic",
  LU: "Lupin",
  MO: "Molluscs",
  MR: "Mushrooms",
  MI: "Milk",       // <- the troublemaker now handled correctly
  MU: "Mustard",
  NU: "Nuts",
  ON: "Onion",
  PE: "Peanuts",
  SE: "Sesame",
  SO: "Soya",
  SU: "Sulfites",
  HO: "Honey"       // present in your data
};

// These selectors are intentionally generic. If something isn’t found, the feature is skipped gracefully.
const SEL = {
  chips: '#allergen-chips, #chips, .chips, [data-role="chips"]',
  grid: '#menu-grid, #dishes, #menu, .menu-grid, [data-role="menu"]',
  search: '#search, #search-input, input[type="search"], [data-role="search"]',
  safeBtn: '#filter-safe, [data-filter="safe"]',
  containsBtn: '#filter-contains, [data-filter="contains"]',
  modeLabel: '#mode-label, [data-role="mode-label"]'
};

// ====== State ======
let MENU = [];                 // raw menu
let MENU_NORMALIZED = [];      // with _codes: Set([...])
let SELECTED = new Set();      // uppercase codes
let CONTAINS_MODE = false;     // false = SAFE (excludes), true = CONTAINS (includes)
let SEARCH = "";

// ====== Util ======
const normalizeCode = (c) => (c || "").trim().toUpperCase();
const fixKnownTypos = (code) => (code === "FL" ? "FI" : code); // unify Fl→FI

function normalizeDish(d) {
  const raw = Array.isArray(d.allergens) ? d.allergens : [];
  const cleaned = raw
    .map(normalizeCode)
    .map(fixKnownTypos)
    .filter(Boolean);

  // de-dupe quickly
  const codes = new Set(cleaned);

  return {
    ...d,
    _codes: codes
  };
}

function $(sel) { return document.querySelector(sel); }
function $any(sel) { return document.querySelector(sel) || document.querySelectorAll(sel)[0] || null; }
function pickOne(selectorList) {
  // try multiple selectors in priority order
  for (const s of selectorList.split(',')) {
    const el = document.querySelector(s.trim());
    if (el) return el;
  }
  return null;
}

// ====== Rendering ======
function renderChips() {
  const host = pickOne(SEL.chips);
  if (!host) return;

  host.innerHTML = "";
  const frag = document.createDocumentFragment();

  Object.entries(ALLERGENS).forEach(([code, label]) => {
    const chip = document.createElement('button');
    chip.className = `chip chip-${code.toLowerCase()}`;
    chip.type = 'button';
    chip.dataset.code = code;
    chip.setAttribute('aria-pressed', SELECTED.has(code) ? 'true' : 'false');
    chip.textContent = label; // visible label; CSS handles style

    chip.addEventListener('click', () => {
      if (SELECTED.has(code)) {
        SELECTED.delete(code);
      } else {
        SELECTED.add(code);
      }
      renderChips();    // refresh chip active state
      renderMenu();     // re-filter
    });

    frag.appendChild(chip);
  });

  host.appendChild(frag);
}

function dishMatches(d, selectedSet) {
  if (!selectedSet.size) return textMatches(d); // no allergen filter; apply search only
  const hasAny = [...selectedSet].some(code => d._codes.has(code));
  const allergenPass = CONTAINS_MODE ? hasAny : !hasAny;
  return allergenPass && textMatches(d);
}

function textMatches(d) {
  if (!SEARCH) return true;
  const t = SEARCH.toLowerCase();
  return (
    (d.name || "").toLowerCase().includes(t) ||
    (d.description || "").toLowerCase().includes(t)
  );
}

function renderMenu() {
  const host = pickOne(SEL.grid);
  if (!host) return;

  host.innerHTML = "";
  const frag = document.createDocumentFragment();

  const items = MENU_NORMALIZED.filter(d => dishMatches(d, SELECTED));

  items.forEach(d => {
    const card = document.createElement('div');
    card.className = 'dish-card';

    const title = document.createElement('div');
    title.className = 'dish-title';
    title.textContent = d.name || '';

    const desc = document.createElement('div');
    desc.className = 'dish-desc';
    desc.textContent = d.description || '';

    const meta = document.createElement('div');
    meta.className = 'dish-meta';

    const price = document.createElement('span');
    price.className = 'dish-price';
    price.textContent = d.price ? `${d.price}` : '';

    const tags = document.createElement('div');
    tags.className = 'dish-tags';
    d._codes.forEach(c => {
      const tag = document.createElement('span');
      tag.className = `tag tag-${c.toLowerCase()}`;
      tag.textContent = ALLERGENS[c] || c;
      tags.appendChild(tag);
    });

    meta.appendChild(price);
    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(meta);
    card.appendChild(tags);
    frag.appendChild(card);
  });

  host.appendChild(frag);
}

function renderModeLabel() {
  const el = pickOne(SEL.modeLabel);
  if (!el) return;
  el.textContent = CONTAINS_MODE ? "CONTAINS (show dishes that CONTAIN selected allergens)" :
                                   "SAFE (hide dishes that CONTAIN selected allergens)";
}

// ====== Wiring ======
function wireModeButtons() {
  const safeBtn = pickOne(SEL.safeBtn);
  const contBtn = pickOne(SEL.containsBtn);

  if (safeBtn) {
    safeBtn.addEventListener('click', () => {
      CONTAINS_MODE = false;
      if (safeBtn.blur) safeBtn.blur();
      renderModeLabel();
      renderMenu();
    });
  }
  if (contBtn) {
    contBtn.addEventListener('click', () => {
      CONTAINS_MODE = true;
      if (contBtn.blur) contBtn.blur();
      renderModeLabel();
      renderMenu();
    });
  }
}

function wireSearch() {
  const input = pickOne(SEL.search);
  if (!input) return;
  input.addEventListener('input', () => {
    SEARCH = String(input.value || "").trim();
    renderMenu();
  });
}

// ====== Init ======
async function loadMenu() {
  const res = await fetch('menu.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load menu.json: ${res.status}`);
  MENU = await res.json();

  MENU_NORMALIZED = (Array.isArray(MENU) ? MENU : []).map(normalizeDish);
}

async function start() {
  // Parse URL mode (?mode=contains)
  try {
    const url = new URL(window.location.href);
    const m = (url.searchParams.get('mode') || "").toLowerCase();
    CONTAINS_MODE = m === "contains";
  } catch (_) {}

  try {
    await loadMenu();
  } catch (e) {
    console.error(e);
  }

  wireModeButtons();
  wireSearch();
  renderModeLabel();
  renderChips();
  renderMenu();

  // Expose a tiny debug API if needed in console
  window.__allergen = {
    select: (...codes) => { codes.map(normalizeCode).forEach(c => SELECTED.add(c)); renderChips(); renderMenu(); },
    clear: () => { SELECTED.clear(); renderChips(); renderMenu(); },
    mode: (contains = false) => { CONTAINS_MODE = !!contains; renderModeLabel(); renderMenu(); },
    selected: () => new Set(SELECTED),
    dish: (name) => MENU_NORMALIZED.find(d => (d.name||"").toLowerCase().includes((name||"").toLowerCase()))
  };
}

document.addEventListener('DOMContentLoaded', start);
