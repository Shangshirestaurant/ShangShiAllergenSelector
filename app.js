// Map allergen codes to tint classes
const allergenClassMap = {
  "GL": "chip-gluten",
  "Mi": "chip-dairy",
  "CR": "chip-crustacean",
  "EG": "chip-egg",
  "NU": "chip-nuts",
  "SO": "chip-soy",
  "SE": "chip-sesame"
};

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


// === Modal logic ===
const modal = document.createElement("div");
modal.id = "dishModal";
modal.className = "modal hidden";
modal.innerHTML = `
  <div class="modal-content">
    <button class="modal-close" aria-label="Close">&times;</button>
    <h2 id="modalTitle"></h2>
    <p id="modalDesc"></p>
    <div id="modalAllergens" class="badges"></div>
  </div>`;
document.body.appendChild(modal);

const modalTitle = document.getElementById("modalTitle");
const modalDesc = document.getElementById("modalDesc");
const modalAllergens = document.getElementById("modalAllergens");
const modalClose = modal.querySelector(".modal-close");

function openModal(dish) {
  modalTitle.textContent = dish.name;
  modalDesc.textContent = dish.description || "No description available.";
  modalAllergens.innerHTML = "";
  dish.allergens.forEach(a => {
    const chip = document.createElement("span");
    chip.className = "chip";
    if (allergenClassMap[a]) chip.classList.add(allergenClassMap[a]);
    chip.textContent = a;
    modalAllergens.appendChild(chip);
  });
  modal.classList.remove("hidden");
}

modalClose.addEventListener("click", ()=> modal.classList.add("hidden"));
modal.addEventListener("click", (e)=> { if(e.target === modal) modal.classList.add("hidden"); });

// Hook into dish cards
document.addEventListener("click", (e) => {
  const card = e.target.closest(".card");
  if (!card) return;
  const name = card.querySelector("h3")?.textContent;
  const dish = menuData.find(d => d.name === name);
  if (dish) openModal(dish);
});



// === Modal + Glassy Chips Enhancer ===
document.addEventListener("DOMContentLoaded", () => {
  // Inject modal scaffold
  if (!document.getElementById("dishModal")) {
    const modal = document.createElement("div");
    modal.id = "dishModal";
    modal.className = "modal hidden";
    modal.innerHTML = `
      <div class="modal-content">
        <button class="modal-close" aria-label="Close">&times;</button>
        <h2 id="modalTitle"></h2>
        <p id="modalDesc"></p>
        <div id="modalAllergens" class="badges"></div>
      </div>`;
    document.body.appendChild(modal);
  }

  const modal = document.getElementById("dishModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalDesc = document.getElementById("modalDesc");
  const modalAllergens = document.getElementById("modalAllergens");
  const modalClose = modal.querySelector(".modal-close");

  function openModal(dish){
    modalTitle.textContent = dish.name;
    modalDesc.textContent = dish.description || "No description available.";
    modalAllergens.innerHTML = "";
    (dish.allergens||[]).forEach(a=>{
      const chip = document.createElement("span");
      chip.className = "chip";
      if (allergenClassMap[a]) chip.classList.add(allergenClassMap[a]);
      chip.textContent = a;
      modalAllergens.appendChild(chip);
    });
    modal.classList.remove("hidden");
  }

  modalClose.addEventListener("click", ()=> modal.classList.add("hidden"));
  modal.addEventListener("click", (e)=>{ if(e.target===modal) modal.classList.add("hidden"); });

  // Delegated listener for dish cards
  const grid = document.getElementById("grid");
  if (grid){
    grid.addEventListener("click", (e)=>{
      const card = e.target.closest(".card");
      if (!card) return;
      const title = card.querySelector("h3");
      if (!title) return;
      const dishName = title.textContent;
      if (typeof menuData!=="undefined"){
        const dish = menuData.find(d => d.name===dishName);
        if (dish) openModal(dish);
      }
    });
  }

  // Re-color chips after render (safety net)
  function tintChips(){
    document.querySelectorAll(".chip").forEach(chip=>{
      const txt = chip.textContent.trim();
      if (allergenClassMap[txt]) chip.classList.add(allergenClassMap[txt]);
    });
  }
  tintChips();
  // Observe DOM for changes
  const observer = new MutationObserver(tintChips);
  observer.observe(document.body,{childList:true,subtree:true});
});


// *__GLASS_MODAL_HOOK__*
document.addEventListener("DOMContentLoaded", function(){
  // 1) Inject modal container once
  if (!document.getElementById("dishModal")) {
    const modal = document.createElement("div");
    modal.id = "dishModal";
    modal.className = "modal hidden";
    modal.innerHTML = '<div class="modal-content"><button class="modal-close" aria-label="Close">&times;</button><h2 id="modalTitle"></h2><p id="modalDesc"></p><div id="modalAllergens" class="badges"></div></div>';
    document.body.appendChild(modal);
  }
  const modal = document.getElementById("dishModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalDesc = document.getElementById("modalDesc");
  const modalAllergens = document.getElementById("modalAllergens");
  const closeBtn = modal.querySelector(".modal-close");
  function openModal(dish){
    if (!dish) return;
    modalTitle.textContent = dish.name || "Dish";
    modalDesc.textContent = dish.description || "No description available.";
    modalAllergens.innerHTML = "";
    (dish.allergens || []).forEach(code => {
      const span = document.createElement("span");
      span.className = "chip";
      const cls = allergenClassMap[code];
      if (cls) span.classList.add(cls);
      span.textContent = code;
      modalAllergens.appendChild(span);
    });
    modal.classList.remove("hidden");
  }
  // Close handlers
  closeBtn.addEventListener("click", ()=> modal.classList.add("hidden"));
  modal.addEventListener("click", (e)=>{ if(e.target === modal) modal.classList.add("hidden"); });

  // 2) Delegated click on grid for any card
  const grid = document.getElementById("grid") || document;
  grid.addEventListener("click", function(e){
    const card = e.target.closest && e.target.closest(".card");
    if (!card) return;
    const nameEl = card.querySelector && card.querySelector("h3");
    const name = nameEl ? nameEl.textContent : null;
    let dish = null;
    try {
      if (typeof menuData !== "undefined" && Array.isArray(menuData) && name) {
        dish = menuData.find(d => d.name === name) || null;
      }
    } catch(_) {}
    if (!dish) {
      // attempt from data attributes
      const n = card.getAttribute("data-name");
      const a = (card.getAttribute("data-allergens")||"").split(",").map(x=>x.trim()).filter(Boolean);
      dish = { name: n || name || "Dish", description: card.getAttribute("data-desc")||"", allergens: a };
    }
    openModal(dish);
  }, {passive:true});

  // 3) Tint allergen chips in the floating panel, no matter how they were rendered
  function tintChips() {
    const panel = document.getElementById("chips");
    if (!panel) return;
    panel.querySelectorAll(".chip").forEach(ch => {
      const txt = (ch.textContent || "").trim();
      // Prefer leading code before space, otherwise whole text
      const code = (txt.split(/\s+/)[0] || "").replace(/[^\w]/g,'').toUpperCase();
      let cls = null;
      if (allergenClassMap[code]) cls = allergenClassMap[code];
      // allow mixed-case keys like 'Mi'
      if (!cls) {
        const key = Object.keys(allergenClassMap).find(k => k.toUpperCase() === code);
        if (key) cls = allergenClassMap[key];
      }
      if (cls && !ch.classList.contains(cls)) ch.classList.add(cls);
    });
  }
  tintChips();
  // Observe changes to #chips for dynamic updates
  const chipsPanel = document.getElementById("chips");
  if (chipsPanel) {
    const obs = new MutationObserver(() => tintChips());
    obs.observe(chipsPanel, { childList: true, subtree: true });
  }
});
