
// ===== Shang Shi Menu UI (clean build) =====

// --- Allergen legend ---
const LEGEND = {
  "CE":"Celery","GL":"Gluten","CR":"Crustaceans","EG":"Eggs","FI":"Fish","MO":"Molluscs","Mi":"Milk",
  "MU":"Mustard","NU":"Nuts","SE":"Sesame","SO":"Soya","GA":"Garlic","ON":"Onion","MR":"Mushrooms","LU":"Lupin","PE":"Peanuts"
};
const ALLERGEN_CODES = Object.keys(LEGEND);

// --- State ---
let menuData = [];
let activeAllergens = new Set();
let activeCategory = null;

// --- Elements ---
const gridEl = document.getElementById('grid');
const chipsEl = document.getElementById('chips');
const categoriesEl = document.getElementById('categories');
const resultCountEl = document.getElementById('resultCount');
const activeFilterEl = document.getElementById('activeFilter');
const filterPanel = document.getElementById('filterPanel');
const categoryPanel = document.getElementById('categoryPanel');
const filterToggle = document.getElementById('filterToggle');
const categoryToggle = document.getElementById('categoryToggle');
const resetBtn = document.getElementById('resetBtn');

// --- Load data ---
async function loadMenu(){
  try{
    const res = await fetch('./menu.json', {cache:'no-store'});
    if(!res.ok) return [];
    return await res.json();
  }catch(e){
    console.error('Failed to load menu.json', e);
    return [];
  }
}

// --- Helpers ---
const codeToLabel = c => LEGEND[c] || c;
const categoryKey = c => (c||'').toLowerCase().replace(/\s+/g,'');

function updateDockIndicators(){
  if (filterToggle){
    if (activeAllergens.size) filterToggle.classList.add('has-active');
    else filterToggle.classList.remove('has-active');
  }
  if (categoryToggle){
    if (activeCategory) categoryToggle.classList.add('has-active');
    else categoryToggle.classList.remove('has-active');
  }
}

// --- Chips renderers ---
function renderAllergenChips(){
  chipsEl.innerHTML = '';
  ALLERGEN_CODES.forEach(code => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.setAttribute('data-code', code);
    // Show CODE + Full Name in dock presets
    btn.innerHTML = `<b>${code}</b> ${codeToLabel(code)}`;
    btn.addEventListener('click', () => {
      if (activeAllergens.has(code)) {
        activeAllergens.delete(code);
        btn.classList.remove('active');
      } else {
        activeAllergens.add(code);
        btn.classList.add('active');
      }
      renderGrid();
      updateMeta();
    }, {passive:true});
    chipsEl.appendChild(btn);
  });
}

function renderCategoryChips(){
  categoriesEl.innerHTML = '';
  ["Starters","Mains","Dim Sums","Desserts"].forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `chip category chip-${categoryKey(cat)}`;
    btn.textContent = cat;
    btn.addEventListener('click', () => {
      if (activeCategory === cat) {
        activeCategory = null;
        btn.classList.remove('active');
      } else {
        activeCategory = cat;
        [...categoriesEl.children].forEach(n => n.classList.remove('active'));
        btn.classList.add('active');
      }
      renderGrid();
      updateMeta();
    }, {passive:true});
    categoriesEl.appendChild(btn);
  });
}

// --- Cards ---
function makeCard(item){
  const card = document.createElement('article');
  card.className = 'card';
  card.setAttribute('data-category', item.category || '');
  card.setAttribute('data-allergens', JSON.stringify(item.allergens || []));

  const labels = document.createElement('div');
  labels.className = 'labels';

  const pill = document.createElement('span');
  pill.className = `pill pill-${categoryKey(item.category) || 'mains'}`;
  pill.textContent = item.category || 'Dish';
  labels.appendChild(pill);

  // SAFE pill only when at least one allergen selected AND dish passes
  if (activeAllergens.size) {
    const a = item.allergens || [];
    const isSafe = [...activeAllergens].every(code => !a.includes(code));
    if (isSafe) {
      const safe = document.createElement('span');
      safe.className = 'safe-pill';
      safe.textContent = 'SAFE';
      labels.appendChild(safe);
    }
  }

  const h3 = document.createElement('h3');
  h3.textContent = item.name;

  if (item.description) {
    const descEl = document.createElement('p');
    descEl.className = 'desc';
    descEl.textContent = item.description;
    card.appendChild(descEl); // wait: we add description before badges or after? We'll add after header below...
  }

  // restructure elements: append labels then h3 then optional desc then badges
  const badges = document.createElement('div');
  badges.className = 'badges';
  (item.allergens || []).forEach(code => {
    const b = document.createElement('span');
    b.className = 'badge';
    b.textContent = code;          // codes only on the card
    b.title = codeToLabel(code);   // tooltip for full name
    badges.appendChild(b);
  });

  // Compose
  card.innerHTML = ''; // ensure empty
  card.append(labels, h3);
  if (item.description) {
    const descEl2 = document.createElement('p');
    descEl2.className = 'desc';
    descEl2.textContent = item.description;
    card.appendChild(descEl2);
  }
  card.appendChild(badges);
  return card;
}

// --- Filtering ---
function passesFilters(item){
  const a = item.allergens || [];
  const safeFromAllergens = !activeAllergens.size || [...activeAllergens].every(code => !a.includes(code));
  const inCategory = !activeCategory || item.category === activeCategory;
  return safeFromAllergens && inCategory;
}

function renderGrid(){
  gridEl.innerHTML = '';
  const filtered = menuData.filter(passesFilters);
  filtered.forEach(d => gridEl.appendChild(makeCard(d)));
  resultCountEl.textContent = `${filtered.length} dishes`;
}

function updateMeta(){
  const parts = [];
  if (activeAllergens.size) parts.push(`SAFE from: ${[...activeAllergens].join(', ')}`);
  if (activeCategory) parts.push(activeCategory);
  activeFilterEl.textContent = parts.length ? parts.join(' • ') : 'No filters active';
  updateDockIndicators();
}

// --- Dock behaviour ---
function setupDock(){
  const togglePanel = (btn, panel) => {
    const isOpen = panel.classList.toggle('open');
    btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    // close the other panel
    if (panel === filterPanel && categoryPanel) {
      categoryPanel.classList.remove('open');
      if (categoryToggle) categoryToggle.setAttribute('aria-expanded','false');
    }
    if (panel === categoryPanel && filterPanel) {
      filterPanel.classList.remove('open');
      if (filterToggle) filterToggle.setAttribute('aria-expanded','false');
    }
  };
  if (filterToggle && filterPanel) filterToggle.addEventListener('click', () => togglePanel(filterToggle, filterPanel), {passive:true});
  if (categoryToggle && categoryPanel) categoryToggle.addEventListener('click', () => togglePanel(categoryToggle, categoryPanel), {passive:true});
  if (resetBtn) resetBtn.addEventListener('click', () => {
    activeAllergens.clear();
    activeCategory = null;
    // clear UI active states
    if (chipsEl) [...chipsEl.children].forEach(n => n.classList.remove('active'));
    if (categoriesEl) [...categoriesEl.children].forEach(n => n.classList.remove('active'));
    renderGrid();
    updateMeta();
  }, {passive:true});
}

// --- Theme toggle ---
(function setupTheme(){
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const cur = localStorage.getItem('theme');
  if (cur === 'light') { document.body.classList.add('light'); btn.textContent = '☀️'; }
  btn.addEventListener('click', () => {
    document.body.classList.toggle('light');
    const light = document.body.classList.contains('light');
    localStorage.setItem('theme', light ? 'light' : 'dark');
    btn.textContent = light ? '☀️' : '🌙';
  }, {passive:true});
})();

// --- Init ---
(async function init(){
  setupDock();
  renderAllergenChips();
  renderCategoryChips();
  menuData = await loadMenu();
  renderGrid();
  updateMeta();
})();
