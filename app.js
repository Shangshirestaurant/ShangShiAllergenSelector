// === Clean filtering core + Presets + UI helpers ===

// Allergen legend
const LEGEND = {
  "CE":"Celery","GL":"Gluten","CR":"Crustaceans","EG":"Eggs","FI":"Fish","MO":"Molluscs","Mi":"Milk","MU":"Mustard","NU":"Nuts",
  "SE":"Sesame","SO":"Soya","GA":"Garlic","ON":"Onion","MR":"Mushrooms"
};
const KNOWN_CODES = Object.keys(LEGEND);
const codeToLabel = c => LEGEND[c] || c;

// Data
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

// Chips
function buildChips(container, onChange){
  const frag = document.createDocumentFragment();
  KNOWN_CODES.forEach(code => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.dataset.code = code;
    btn.innerHTML = `<b>${code}</b> ${codeToLabel(code)}`;
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      onChange();
    }, {passive:true});
    frag.appendChild(btn);
  });
  container.innerHTML = '';
  container.appendChild(frag);
}

// Presets
const PRESETS = [
  { id: 'gf',  label: 'Gluten-free',    codes: ['GL'] },
  { id: 'df',  label: 'Dairy-free',     codes: ['Mi'] },
  { id: 'sf',  label: 'Shellfish-free', codes: ['CR','MO'] },
  { id: 'egg', label: 'Egg-free',       codes: ['EG'] },
  { id: 'soy', label: 'Soy-free',       codes: ['SO'] },
];

function buildPresets(container, onChange){
  if(!container) return;
  container.innerHTML = '';
  const frag = document.createDocumentFragment();
  PRESETS.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.type = 'button';
    btn.dataset.preset = p.id;
    btn.innerHTML = `<small>★</small>${p.label}`;
    btn.addEventListener('click', () => {
      const makeActive = !btn.classList.contains('active');
      btn.classList.toggle('active', makeActive);
      p.codes.forEach(code => {
        const chip = document.querySelector(`.chip[data-code="${code}"]`);
        if(!chip) return;
        chip.classList.toggle('active', makeActive);
      });
      onChange();
    }, {passive:true});
    frag.appendChild(btn);
  });
  container.appendChild(frag);
}

function syncPresetsFromChips(){
  PRESETS.forEach(p => {
    const allOn = p.codes.every(code => {
      const chip = document.querySelector(`.chip[data-code="${code}"]`);
      return chip && chip.classList.contains('active');
    });
    const btn = document.querySelector(`.preset-btn[data-preset="${p.id}"]`);
    if(btn) btn.classList.toggle('active', allOn);
  });
}

// Active from DOM
function getActiveFilters(){
  return Array.from(document.querySelectorAll('.chip.active')).map(ch => ch.dataset.code);
}

// Pure data filtering
function filterDishes(list, sel){
  if(!sel || sel.length === 0) return list.slice();
  return list.filter(item => {
    const a = item.allergens || [];
    return sel.every(code => !a.includes(code));
  });
}

// Render
function renderGrid(el, list, sel){
  el.innerHTML = '';
  const frag = document.createDocumentFragment();
  list.forEach(item => {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.allergens = JSON.stringify(item.allergens || []);

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
        safe.textContent = '✓';
        card.appendChild(safe);
      }
    }

    frag.appendChild(card);
  });
  el.appendChild(frag);
}

// Meta + new UI bits
function updateMeta(n, sel){
  const rc = document.getElementById('resultCount');
  const af = document.getElementById('activeFilter');
  if(rc) rc.textContent = `${n} dish${n===1?'':'es'}`;
  if(af) af.textContent = sel.length ? `SAFE without: ${sel.join(', ')}` : 'No filters active';

  const bubble = document.getElementById('safeBubble');
  if (bubble){
    bubble.textContent = `${n} SAFE`;
    bubble.classList.toggle('hidden', sel.length === 0);
  }

  const bar = document.getElementById('activeBar');
  if (bar){
    if (sel.length === 0){
      bar.classList.add('hidden');
      bar.innerHTML = '';
    } else {
      bar.classList.remove('hidden');
      bar.innerHTML = sel.map(c => `<span class="chip active small"><b>${c}</b> ${c}</span>`).join('');
    }
  }
}

// Panel
function toggleFilterPanel(open){
  const panel = document.getElementById('filterPanel');
  const btn = document.getElementById('filterToggle');
  if(!panel || !btn) return;
  const willOpen = (open !== undefined) ? open : !panel.classList.contains('open');
  panel.classList.toggle('open', willOpen);
  btn.setAttribute('aria-expanded', String(willOpen));
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('filterToggle');
  if(btn) btn.addEventListener('click', () => toggleFilterPanel(), {passive:true});
});

// Init
(async function init(){
  const chips = document.getElementById('chips');
  const grid  = document.getElementById('grid');
  const empty = document.getElementById('empty');
  const presetsWrap = document.getElementById('presets');

  const dishes = await loadMenu();

  const rerender = () => {
    const sel  = getActiveFilters();
    const data = filterDishes(dishes, sel);
    renderGrid(grid, data, sel);
    updateMeta(data.length, sel);
    empty.classList.toggle('hidden', data.length !== 0);
    syncPresetsFromChips();
  };

  buildPresets(presetsWrap, rerender);
  buildChips(chips, rerender);
  renderGrid(grid, dishes, []);
  updateMeta(dishes.length, []);
  empty.classList.add('hidden');

  // Safe bubble scroll-to-top
  const bubble = document.getElementById('safeBubble');
  if(bubble){
    bubble.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }), {passive:true});
  }
})();

// Theme toggle
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
