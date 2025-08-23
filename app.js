// Allergen legend (single source of truth)
const LEGEND = {
  "CE":"Celery","GL":"Gluten","CR":"Crustaceans","EG":"Eggs","FI":"Fish","MO":"Molluscs","Mi":"Milk","MU":"Mustard","NU":"Nuts",
  "SE":"Sesame","SO":"Soya","GA":"Garlic","ON":"Onion","MR":"Mushrooms"
};
const KNOWN_CODES = Object.keys(LEGEND);
const codeToLabel = c => LEGEND[c] || c;

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
  const rc = document.getElementById('resultCount');
  if (rc) rc.textContent = `${n} dish${n===1?'':'es'}`;
  const af = document.getElementById('activeFilter');
  if (af) af.textContent = sel.length ? `SAFE without: ${sel.join(', ')}` : 'No filters active';

  // Update the always-visible badge next to Filters
  const badge = document.getElementById('resultBadge');
  if (badge){
    badge.textContent = n;
    badge.setAttribute('aria-label', `${n} dishes shown`);
    badge.classList.remove('pulse');
    // micro-pulse to draw attention
    requestAnimationFrame(()=>{
      badge.classList.add('pulse');
      setTimeout(()=>badge.classList.remove('pulse'), 220);
    });
  }
} dish${n===1?'':'es'}`;
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
  const empty = document.getElementById('empty');

  const dishes = await loadMenu();

  const rerender = () => {
    const sel  = getActiveFilters();      // ALWAYS fresh from DOM
    const data = filterDishes(dishes, sel);
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
