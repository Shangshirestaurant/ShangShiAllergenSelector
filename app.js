// Allergen legend (single source of truth)
const LEGEND = {
  "CE":"Celery","GL":"Gluten","CR":"Crustaceans","EG":"Eggs","FI":"Fish","MO":"Molluscs","Mi":"Milk","MU":"Mustard","NU":"Nuts",
  "SE":"Sesame","SO":"Soya","GA":"Garlic","ON":"Onion","MR":"Mushrooms"
};
const KNOWN_CODES = Object.keys(LEGEND);
const codeToLabel = c => LEGEND[c] || c;

// -------- Category classification (name-based heuristic + optional explicit field) --------
function deriveCategory(item){
  if (!item) return 'mains';
  if (item.category) {
    const c = String(item.category).toLowerCase();
    if (['dimsum','dim sum','dim sums','starters','mains','desserts'].includes(c)) {
      return c.replace(' ', '');
    }
  }
  const name = (item.name || '').toLowerCase();
  // Desserts keywords
  if (/(dessert|ice cream|sorbet|mousse|pudding|cake|tart|parfait|cheesecake)/.test(name)) return 'desserts';
  // Dim sum keywords
  if (/(dumpling|siew mai|siu mai|xiao long bao|bao|spring roll|roll|puff|toast|samosa|gyoza)/.test(name)) return 'dimsum';
  // Starters keywords
  if (/(starter|salad|soup|cold dish|appetizer|small plate)/.test(name)) return 'starters';
  // Default
  return 'mains';
}


// -------- Data --------
async function loadMenu(){
  try{
    const r = await fetch('./menu.json', { cache: 'no-store' });
    if(!r.ok) return [];
    return await r.json();
  }catch(e){
    console.error('menu load failed', e);
    return [];
  }
}

// -------- UI: chips --------
function buildChips(container, onChange){
  const frag = document.createDocumentFragment();
  KNOWN_CODES.forEach(code => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.dataset.code = code;              // keep uppercase consistently
    btn.innerHTML = `<b>${code}</b> ${codeToLabel(code)}`;
    btn.addEventListener('click', () => { // single handler
      btn.classList.toggle('active');
      onChange();
    }, {passive:true});
    frag.appendChild(btn);
  });
  container.innerHTML = '';
  container.appendChild(frag);
}

// ALWAYS derive from DOM
function getActiveFilters(){
  return Array.from(document.querySelectorAll('.chip.active'))
    .map(ch => ch.dataset.code); // uppercase
}

// Pure data filtering — NO DOM side-effects
function filterDishes(list, sel){
  if(!sel || sel.length === 0) return list.slice();
  return list.filter(item => {
    const a = item.allergens || [];
    return sel.every(code => !a.includes(code));
  });
}

// -------- Render --------
function renderGrid(el, list, sel){
  el.innerHTML = '';
  const frag = document.createDocumentFragment();

  list.forEach(item => {
    const card = document.createElement('article');
    card.className = 'card';
    // expose allergens only for debugging/optional usage
    card.dataset.allergens = JSON.stringify(item.allergens || []);

    const cat = deriveCategory(item);
    const clabel = document.createElement('span');
    clabel.className = 'cat-label cat-' + cat;
    clabel.textContent = (cat==='dimsum'?'Dim Sums':cat.charAt(0).toUpperCase()+cat.slice(1));
    card.appendChild(clabel);

    const h = document.createElement('h3');
    h.textContent = item.name || '';
    card.appendChild(h);

    if(item.description){
      const p = document.createElement('p');
      p.className = 'desc';
      p.textContent = item.description;
      card.appendChild(p);
    }

    const badges = document.createElement('div');
    badges.className = 'badges';
    (item.allergens || []).forEach(code => {
      const s = document.createElement('span');
      s.className = 'badge';
      s.title = codeToLabel(code);
      s.textContent = code;
      badges.appendChild(s);
    });
    card.appendChild(badges);

    if(sel && sel.length){
      const pass = sel.every(c => !(item.allergens || []).includes(c));
      if(pass){
        const safe = document.createElement('span');
        safe.className = 'safe-badge';
        safe.setAttribute('aria-hidden', 'true');
        safe.textContent = '✓'; // styled by CSS
        card.appendChild(safe);
      }
    }

    frag.appendChild(card);
  });

  el.appendChild(frag);
}

function updateMeta(n, sel){
  document.getElementById('resultCount').textContent = `${n} dish${n===1?'':'es'}`;
  document.getElementById('activeFilter').textContent = sel.length ? `SAFE without: ${sel.join(', ')}` : 'No filters active';
}

// -------- Filter panel --------
function toggleFilterPanel(open){
  const panel = document.getElementById('filterPanel');
  const btn = document.getElementById('filterToggle');
  if(!panel || !btn) return;
  const willOpen = (open !== undefined) ? open : !panel.classList.contains('open');
  panel.classList.toggle('open', willOpen);
  btn.setAttribute('aria-expanded', String(willOpen));
}

// Boot small handlers
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('filterToggle');
  if(btn) btn.addEventListener('click', () => toggleFilterPanel(), {passive:true});
});

// -------- App init --------
(async function init(){
  const chips = document.getElementById('chips');
  const grid  = document.getElementById('grid');
  const catTabs = document.getElementById('catTabs');
  let currentCategory = 'all';
  const empty = document.getElementById('empty');

  const dishes = await loadMenu();
  // Apply category map from localStorage if present
  const catMapRaw = localStorage.getItem('categoryMap');
  let categoryMap = {};
  if (catMapRaw){ try{ categoryMap = JSON.parse(catMapRaw)||{}; }catch(e){} }
  const applyCategoryMap = (arr) => {
    const norm = s => (s||'').toLowerCase().replace(/\([^)]*\)/g,'').replace(/[^\w\s]/g,' ').replace(/\s+/g,' ').trim();
    arr.forEach(it => {
      const key = norm(it.name);
      const val = categoryMap[key];
      if (val){ it.category = val; }
    });
  };
  applyCategoryMap(dishes);

  const rerender = () => {
    const sel  = getActiveFilters();      // ALWAYS fresh from DOM
    let data = filterDishes(dishes, sel);
    if (currentCategory !== 'all') {
      data = data.filter(item => deriveCategory(item) === currentCategory);
    }
    renderGrid(grid, data, sel);
    updateMeta(data.length, sel);
    empty.classList.toggle('hidden', data.length !== 0);
    // DEBUG (leave while testing; remove later)
    console.log('Active filters:', sel, 'Shown:', data.length);
  };

  buildChips(chips, rerender);
  renderGrid(grid, dishes, []);
  updateMeta(dishes.length, []);
  empty.classList.add('hidden');

  // Import categories CSV
  const importBtn = document.getElementById('importCatsBtn');
  const importInput = document.getElementById('importCatsInput');
  function parseCSV(text){
    const rows = text.split(/\r?\n/).filter(Boolean);
    const out = {};
    // expect headers: Name,Category
    const header = rows.shift();
    const idxName = header.toLowerCase().split(',').indexOf('name');
    const idxCat  = header.toLowerCase().split(',').indexOf('category');
    const norm = s => (s||'').toLowerCase().replace(/\([^)]*\)/g,'').replace(/[^\w\s]/g,' ').replace(/\s+/g,' ').trim();
    for(const row of rows){
      const cols = row.split(',');
      const name = (cols[idxName]||'').trim();
      const cat  = (cols[idxCat]||'').trim();
      if(!name || !cat) continue;
      const key = norm(name);
      const val = normalizeCategory(cat) || cat.toLowerCase();
      out[key] = val;
    }
    return out;
  }
  if(importBtn && importInput){
    importBtn.addEventListener('click', ()=> importInput.click(), {passive:true});
    importInput.addEventListener('change', (e)=>{
      const file = e.target.files && e.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try{
          const map = parseCSV(String(reader.result||''));
          localStorage.setItem('categoryMap', JSON.stringify(map));
          categoryMap = map; applyCategoryMap(dishes); rerender();
          alert('Categories imported.');
        }catch(err){ alert('Failed to parse CSV'); }
      };
      reader.readAsText(file);
    }, {passive:true});
  }


  // Category tabs behavior
  if (catTabs){
    catTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.cat-tab');
      if(!btn) return;
      currentCategory = btn.dataset.cat || 'all';
      // update aria/active styles
      catTabs.querySelectorAll('.cat-tab').forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', String(b === btn));
      });
      rerender();
    }, {passive:true});
  }

})();

// -------- Theme toggle (unchanged) --------
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light');
    btn.textContent = '☀️';
  }
  btn.addEventListener('click', () => {
    document.body.classList.toggle('light');
    const isLight = document.body.classList.contains('light');
    btn.textContent = isLight ? '☀️' : '🌙';
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
  }, {passive:true});
});
