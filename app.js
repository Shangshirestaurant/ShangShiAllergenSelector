
// ===== Shang Shi Menu UI (with SAFE mark only if dish is safe) =====

// --- Allergen Legend ---
const LEGEND = {
  "CE":"Celery","GL":"Gluten","CR":"Crustaceans","EG":"Eggs","FI":"Fish","MO":"Molluscs","Mi":"Milk",
  "MU":"Mustard","NU":"Nuts","SE":"Sesame","SO":"Soya","GA":"Garlic","ON":"Onion","MR":"Mushrooms","LU":"Lupin","PE":"Peanuts"
};
const KNOWN_CODES = Object.keys(LEGEND);

// --- State ---
let menuData = [];
let activeAllergens = new Set();   // selected allergens (SAFE logic)
let activeCategory = null;         // one of "Starters", "Mains", "Dim Sums", "Desserts"

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

// --- Load ---
async function loadMenu() {
  const res = await fetch('./menu.json', {cache: 'no-store'});
  if (!res.ok) return [];
  return await res.json();
}

// --- Rendering ---
function renderChips() {
  // Allergen chips
  chipsEl.innerHTML = '';
  KNOWN_CODES.forEach(code => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.innerHTML = `<b>${code}</b> ${LEGEND[code] || code}`;
    btn.setAttribute('data-code', code);
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

  // Category chips
  const cats = ["Starters","Mains","Dim Sums","Desserts"];
  categoriesEl.innerHTML = '';
  cats.forEach(cat => {
    const btn = document.createElement('button');
    const key = cat.toLowerCase().replace(/\s+/g,'');
    btn.className = `chip category chip-${key}`;
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


function makeCard(item){
  const card = document.createElement('article');
  card.className = 'card';
  card.setAttribute('data-category', item.category || '');
  card.setAttribute('data-allergens', JSON.stringify(item.allergens || []));

  // Labels row (category + conditional SAFE)
  const labels = document.createElement('div');
  labels.className = 'labels';

  // Category pill
  const key = (item.category || '').toLowerCase().replace(/\s+/g,'');
  const pill = document.createElement('span');
  pill.className = `pill pill-${key || 'mains'}`;
  pill.textContent = item.category || 'Dish';
  labels.appendChild(pill);

  // SAFE pill appears only when at least one allergen is selected AND dish passes SAFE check
  if (activeAllergens.size) {
    const allergens = item.allergens || [];
    const isSafe = [...activeAllergens].every(a => !allergens.includes(a));
    if (isSafe) {
      const safe = document.createElement('span');
      safe.className = 'safe-pill';
      safe.textContent = 'SAFE';
      labels.appendChild(safe);
    }
  }

  const h3 = document.createElement('h3');
  h3.textContent = item.name;

  const desc = document.createElement('p');
  desc.className = 'desc';
  desc.textContent = item.description || '';

  const badges = document.createElement('div');
  badges.className = 'badges';
  (item.allergens || []).forEach(code => {
    const b = document.createElement('span');
    b.className = 'badge';
    b.textContent = code;   // show only code
    b.title = codeToLabel(code); // tooltip shows full name
    badges.appendChild(b);
  });

  card.append(labels, h3, desc, badges);
  return card;
}
function codeToLabel(code){ return LEGEND[code] || code; }

function passesFilters(item){
  const allergens = item.allergens || [];
  const safeAllergen = !activeAllergens.size || [...activeAllergens].every(a => !allergens.includes(a));
  const safeCategory = !activeCategory || (item.category === activeCategory);
  return safeAllergen && safeCategory;
}

function renderGrid(){
  gridEl.innerHTML = '';
  const filtered = menuData.filter(passesFilters);
  filtered.forEach(item => gridEl.appendChild(makeCard(item)));
  resultCountEl.textContent = `${filtered.length} dishes`;
}

function updateMeta(){
  const parts = [];
  if (activeAllergens.size) parts.push(`SAFE from: ${[...activeAllergens].join(', ')}`);
  if (activeCategory) parts.push(`${activeCategory}`);
  activeFilterEl.textContent = parts.length ? parts.join(' • ') : 'No filters active';
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
  renderChips();
  menuData = await loadMenu();
  renderGrid();
  updateMeta();
})();
