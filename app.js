const APP_BUILD="v-20250901-223929";

// ===== Shang Shi Menu (clean baseline) =====
const LEGEND = {
  CE:"Celery", GL:"Gluten", CR:"Crustaceans", EG:"Eggs", FI:"Fish", MO:"Molluscs", Mi:"Milk",
  MU:"Mustard", NU:"Nuts", SE:"Sesame", SO:"Soya", GA:"Garlic", ON:"Onion", MR:"Mushrooms"
};

let data = [];
let selectedAllergens = new Set();
let selectedCategory = null;

const els = {
  grid: document.getElementById('grid'),
  chips: document.getElementById('chips'),
  cat: document.getElementById('categories'),
  result: document.getElementById('resultCount'),
  active: document.getElementById('activeFilter'),
  filterPanel: document.getElementById('filterPanel'),
  categoryPanel: document.getElementById('categoryPanel'),
  filterToggle: document.getElementById('filterToggle'),
  categoryToggle: document.getElementById('categoryToggle'),
  resetBtn: document.getElementById('resetBtn')
};

// Load
async function loadMenu(){ const r = await fetch('./menu.json', {cache:'no-store'}); return r.ok ? r.json() : []; }

// Build chips
function renderAllergenChips(){
  els.chips.innerHTML = '';
  const codes = Array.from(Object.keys(LEGEND)).filter(c => data.some(d => (d.allergens||[]).includes(c)));
  codes.forEach(code => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.dataset.code = code;
    btn.innerHTML = `<b>${code}</b> ${LEGEND[code] || code}`; // Dock shows code + full name
    btn.addEventListener('click', () => {
      if (selectedAllergens.has(code)){ selectedAllergens.delete(code); btn.classList.remove('active'); }
      else { selectedAllergens.add(code); btn.classList.add('active'); }
      refresh();
    }, {passive:true});
    els.chips.appendChild(btn);
  });
}

function renderCategoryChips(){
  els.cat.innerHTML = '';
  const categories = Array.from(new Set(data.map(d => d.category))).filter(Boolean);
  categories.forEach(cat => {
    const key = cat.toLowerCase().replace(/\s+/g,'');
    const btn = document.createElement('button');
    btn.className = `chip category chip-${key}`;
    btn.textContent = cat;
    btn.addEventListener('click', () => {
      if (selectedCategory === cat){ selectedCategory = null; btn.classList.remove('active'); }
      else { selectedCategory = cat; [...els.cat.children].forEach(c=>c.classList.remove('active')); btn.classList.add('active'); }
      refresh();
    }, {passive:true});
    els.cat.appendChild(btn);
  });
}

// Cards
function card(item){
  const a = document.createElement('article');
  a.className = 'card';
  a.setAttribute('data-category', item.category||'');
  a.setAttribute('data-allergens', JSON.stringify(item.allergens||[]));

  const labels = document.createElement('div');
  labels.className = 'labels';

  const key = (item.category||'').toLowerCase().replace(/\s+/g,'');
  const cPill = document.createElement('span');
  cPill.className = `pill pill-${key || 'mains'}`;
  cPill.textContent = item.category || 'Dish';
  labels.appendChild(cPill);

  // SAFE only if allergens selected and dish safe
  if (selectedAllergens.size){
    const al = item.allergens || [];
    const ok = [...selectedAllergens].every(x => !al.includes(x));
    if (ok){
      const s = document.createElement('span');
      s.className = 'safe-pill';
      s.textContent = 'SAFE';
      labels.appendChild(s);
    }
  }

  const h = document.createElement('h3'); h.textContent = item.name;

  const p = document.createElement('p'); p.className = 'desc'; p.textContent = item.description || '';

  const badges = document.createElement('div'); badges.className = 'badges';
  (item.allergens || []).forEach(code => {
    const b = document.createElement('span'); b.className = 'badge';
    b.textContent = code;             // cards show code only
    b.title = LEGEND[code] || code;   // tooltip
    badges.appendChild(b);
  });

  a.append(labels, h, p, badges);
  return a;
}

// Filtering
function isSafe(item){
  const A = item.allergens || [];
  return !selectedAllergens.size || [...selectedAllergens].every(x => !A.includes(x));
}
function inCategory(item){ return !selectedCategory || item.category === selectedCategory; }

function renderGrid(){
  els.grid.innerHTML = '';
  const items = data.filter(d => isSafe(d) && inCategory(d));
  items.forEach(d => els.grid.appendChild(card(d)));
  els.result.textContent = `${items.length} dishes`;
}

function updateMeta(){
  const parts = [];
  if (selectedAllergens.size) parts.push(`SAFE from: ${[...selectedAllergens].join(', ')}`);
  if (selectedCategory) parts.push(selectedCategory);
  els.active && (els.active.textContent = parts.length ? parts.join(' • ') : 'No filters active');
  // dock highlight
  if (els.filterToggle) els.filterToggle.dataset.active = selectedAllergens.size ? 'true' : 'false';
  if (els.categoryToggle) els.categoryToggle.dataset.active = selectedCategory ? 'true' : 'false';
}

function toggle(panelBtn, panelEl){
  const open = panelEl.classList.toggle('open');
  panelBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  // Close the other
  if (panelEl === els.filterPanel && els.categoryPanel){ els.categoryPanel.classList.remove('open'); els.categoryToggle && els.categoryToggle.setAttribute('aria-expanded','false'); }
  if (panelEl === els.categoryPanel && els.filterPanel){ els.filterPanel.classList.remove('open'); els.filterToggle && els.filterToggle.setAttribute('aria-expanded','false'); }
}

function clearAll(){
  selectedAllergens.clear();
  selectedCategory = null;
  // clear chip actives
  [...(els.chips?.children || [])].forEach(c => c.classList.remove('active'));
  [...(els.cat?.children || [])].forEach(c => c.classList.remove('active'));
  // spin icon briefly
  if (els.resetBtn){
    els.resetBtn.classList.add('spin');
    setTimeout(()=> els.resetBtn.classList.remove('spin'), 420);
  }
  refresh();
  // close panels
  els.filterPanel && els.filterPanel.classList.remove('open');
  els.categoryPanel && els.categoryPanel.classList.remove('open');
  els.filterToggle && els.filterToggle.setAttribute('aria-expanded','false');
  els.categoryToggle && els.categoryToggle.setAttribute('aria-expanded','false');
}

function refresh(){ renderGrid(); updateMeta(); }

// Theme toggle kept minimal
(function theme(){
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  if (localStorage.getItem('theme') === 'light'){ document.body.classList.add('light'); btn.textContent = '☀️'; }
  btn.addEventListener('click', () => {
    document.body.classList.toggle('light');
    const L = document.body.classList.contains('light');
    localStorage.setItem('theme', L ? 'light' : 'dark');
    btn.textContent = L ? '☀️' : '🌙';
  }, {passive:true});
})();

// Init
(async function(){
  data = await loadMenu();
  renderAllergenChips();
  renderCategoryChips();
  refresh();

  if (els.filterToggle && els.filterPanel) els.filterToggle.addEventListener('click', () => toggle(els.filterToggle, els.filterPanel), {passive:true});
  if (els.categoryToggle && els.categoryPanel) els.categoryToggle.addEventListener('click', () => toggle(els.categoryToggle, els.categoryPanel), {passive:true});
  if (els.resetBtn) els.resetBtn.addEventListener('click', clearAll, {passive:true});
})();


/*__CARD_DELEGATE_V2__*/
document.addEventListener("DOMContentLoaded", () => {
  // Ensure modal exists
  if (!document.getElementById("dishModal")) {
    const m = document.createElement("div");
    m.id = "dishModal";
    m.className = "modal hidden";
    m.innerHTML = '<div class="modal-content"><button class="modal-close" aria-label="Close">×</button><div class="modal-head"><h2 id="modalTitle"></h2><span id="modalCat" class="pill-category"></span></div><p id="modalDesc"></p><div id="modalAllergens" class="badges"></div></div>';
    document.body.appendChild(m);
  }

  const modal = document.getElementById("dishModal");
  const titleEl = document.getElementById("modalTitle");
  const descEl  = document.getElementById("modalDesc");
  const catEl   = document.getElementById("modalCat");
  const tagsEl  = document.getElementById("modalAllergens");

  function openModal(dish){
    if (!dish) return;
    titleEl.textContent = dish.name || "Dish";
    descEl.textContent  = dish.description || "No description available.";
    if (dish.category) { catEl.textContent = dish.category; catEl.style.display = "inline-block"; } else { catEl.style.display = "none"; }
    tagsEl.innerHTML = "";
    (dish.allergens || []).forEach(code => {
      const chip = document.createElement("span");
      chip.className = "chip";
      const cls = (typeof allergenClassMap !== "undefined") ? (allergenClassMap[code] || null) : null;
      if (cls) chip.classList.add(cls);
      chip.textContent = code;
      tagsEl.appendChild(chip);
    });
    modal.classList.remove("hidden");
  }

  // Helpers to parse card DOM if data not available in JS
  function text(el){ return (el && el.textContent || "").trim(); }
  function query(el, sel){ return el ? el.querySelector(sel) : null; }
  function queryAllText(el, sels){
    const out = new Set();
    sels.split(",").forEach(sel => {
      el.querySelectorAll(sel.trim()).forEach(n => {
        const t = text(n);
        if (t) out.add(t);
      });
    });
    return Array.from(out);
  }
  function extractDishFromCard(card){
    const name = text(query(card, "h1, h2, h3, .title, [data-name]")) || card.getAttribute("data-name") || "Dish";
    const description = text(query(card, ".desc, .description, [data-desc]")) || card.getAttribute("data-desc") || "";
    const category = text(query(card, ".pill, .pill-category, .label, [data-category]")) || card.getAttribute("data-category") || "";
    // Collect allergens from common badge containers
    let allergensRaw = queryAllText(card, ".badge, .chip, .tag, .allergen, .allergens span");
    // Try to normalize tokens like "GL • Gluten" to "GL"
    const codes = [];
    const seen = new Set();
    for (const t of allergensRaw){
      const code = t.split("•")[0].trim().replace(/[\[\]\(\)\"']/g,"").split(/\s+/)[0].toUpperCase();
      if (code && code.length <= 3 && !seen.has(code)){
        seen.add(code); codes.push(code)
      }
    }
    // Fallback: try data-allergens attribute
    if (!codes.length){
      const data = card.getAttribute("data-allergens") || "";
      data.split(",").forEach(s => {
        const c = s.trim().toUpperCase();
        if (c) codes.push(c);
      });
    }
    return { name, description, category, allergens: codes };
  }

  const grid = document.getElementById("grid") || document;
  grid.addEventListener("click", (e) => {
    const card = e.target.closest && e.target.closest(".card");
    if (!card) return;
    let dish = null;

    try {
      if (typeof menuData !== "undefined" && Array.isArray(menuData)) {
        const nameNode = card.querySelector && card.querySelector("h1, h2, h3, .title");
        const name = nameNode ? nameNode.textContent.trim() : card.getAttribute("data-name");
        if (name) dish = menuData.find(d => d.name === name) || null;
      }
    } catch(_) {}

    if (!dish) dish = extractDishFromCard(card);
    openModal(dish);
  }, {passive:true});

  // Close actions
  document.addEventListener("click", (e)=>{
    if (e.target.matches(".modal-close") || e.target.id === "dishModal") {
      modal.classList.add("hidden");
    }
  }, {passive:true});
});


/*__TINT_PRESET_CHIPS__*/
document.addEventListener("DOMContentLoaded", () => {
  function sanitizeAllergen(x){
    if (x == null) return "";
    let s = String(x).trim();
    s = s.replace(/^[\[\\"']+|[\]\\"']+$/g, "");
    s = s.replace(/[,]/g, "").trim();
    return s;
  }
  function tintPresets(){
    const panel = document.getElementById("chips");
    if (!panel) return;
    panel.querySelectorAll(".chip").forEach(ch => {
      const raw = (ch.textContent || "").trim();
      const code = sanitizeAllergen((raw.split(/\s+/)[0] || raw)).toUpperCase();
      let key = (typeof allergenClassMap !== "undefined") ? Object.keys(allergenClassMap).find(k => k.toUpperCase() == code) : null;
      if (key) ch.classList.add(allergenClassMap[key]);
    });
  }
  tintPresets();
  const panel = document.getElementById("chips");
  if (panel) new MutationObserver(tintPresets).observe(panel, {childList:true, subtree:true});
});
