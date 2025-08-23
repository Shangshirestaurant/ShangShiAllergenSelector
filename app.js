// Allergen legend
const LEGEND = {
  "CE":"Celery","GL":"Gluten","CR":"Crustaceans","EG":"Eggs","FI":"Fish","MO":"Molluscs","Mi":"Milk","MU":"Mustard","NU":"Nuts",
  "SE":"Sesame","SO":"Soya","GA":"Garlic","ON":"Onion","MR":"Mushrooms"
};
function codeToLabel(c){ return LEGEND[c]||c; }
async function loadMenu(){
  try{
    const r = await fetch('./menu.json',{cache:'no-store'});
    if(!r.ok) return [];
    return await r.json();
  }catch(e){ return []; }
}
function buildChips(container,onChange){
  const frag=document.createDocumentFragment();
  Object.keys(LEGEND).forEach(code=>{
    const btn=document.createElement('button');
    btn.className='chip'; btn.dataset.code=code;
    btn.innerHTML=`<b>${code}</b> ${codeToLabel(code)}`;
    btn.addEventListener('click',()=>{btn.classList.toggle('active'); onChange();});
    frag.appendChild(btn);
  });
  container.innerHTML=''; container.appendChild(frag);
}
function getActiveFilters(){ return [...document.querySelectorAll('.chip.active')].map(ch=>ch.dataset.code); }
function filterDishes(list, sel){ return list.filter(item => (sel||[]).every(c => !(item.allergens||[]).includes(c))); }
function renderGrid(el, list, sel){
  el.innerHTML=''; const frag=document.createDocumentFragment();
  list.forEach(item=>{
    const card=document.createElement('article'); card.className='card';
    const h=document.createElement('h3'); h.textContent=item.name||''; card.appendChild(h);
    if(item.description){ const p=document.createElement('p'); p.className='desc'; p.textContent=item.description; card.appendChild(p); }
    const badges=document.createElement('div'); badges.className='badges';
    (item.allergens||[]).forEach(code=>{ const s=document.createElement('span'); s.className='badge'; s.title=codeToLabel(code); s.textContent=code; badges.appendChild(s); });
    card.appendChild(badges);
    if(sel && sel.length){
      const pass = sel.every(c => !(item.allergens||[]).includes(c));
      if(pass){
        const safe = document.createElement('span');
        safe.className = 'safe-badge';
        safe.innerHTML = '<svg viewBox="0 0 16 16" width="16" height="16" fill="#28a745" aria-hidden="true"><path d="M6.003 10.803l-3.147-3.15-1.06 1.06 4.207 4.21 8-8-1.06-1.06z"/></svg> Safe';
        card.appendChild(safe);
      }
    }
    frag.appendChild(card);
  });
  el.appendChild(frag);
}
function updateMeta(n, sel){
  document.getElementById('resultCount').textContent = `${n} dish${n===1?'':'es'}`;
  document.getElementById('activeFilter').textContent = sel.length ? `Safe for: ${sel.join(', ')}` : 'No filters active';
}
function toggleFilterPanel(open){
  const panel = document.getElementById('filterPanel');
  const btn = document.getElementById('filterToggle');
  if(!panel || !btn) return;
  const willOpen = (open !== undefined) ? open : !panel.classList.contains('open');
  panel.classList.toggle('open', willOpen);
  btn.setAttribute('aria-expanded', String(willOpen));
}
document.addEventListener('DOMContentLoaded', ()=>{
  const btn = document.getElementById('filterToggle');
  if(btn) btn.addEventListener('click', ()=> toggleFilterPanel());
});
(async function init(){
  const chips = document.getElementById('chips');
  const grid = document.getElementById('grid');
  const empty = document.getElementById('empty');
  const dishes = await loadMenu();
  const rerender = ()=>{
    const sel = getActiveFilters();
    const data = filterDishes(dishes, sel);
    renderGrid(grid, data, sel);
    updateMeta(data.length, sel);
    empty.classList.toggle('hidden', data.length !== 0);
  };
  buildChips(chips, rerender);
  renderGrid(grid, dishes, []);
  updateMeta(dishes.length, []);
  empty.classList.add('hidden');
})();


// === Patch: case-insensitive filtering ===
(function(){
  function toLowerArray(arr){ try { return (arr||[]).map(x => String(x).toLowerCase()); } catch(e){ return []; } }
  function getActiveFilters(){
    return Array.from(document.querySelectorAll('.chip.active')).map(ch => String(ch.dataset.code||'').toLowerCase());
  }
  // If a global applyFilters exists, wrap it; otherwise provide one.
  const _apply = (typeof applyFilters === 'function') ? applyFilters : null;
  window.applyFilters = function(){
    const active = getActiveFilters();
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
      let allergens = [];
      try { allergens = JSON.parse(card.dataset.allergens || "[]"); } catch(e){ allergens = []; }
      const low = toLowerArray(allergens);
      const visible = active.every(code => !low.includes(code));
      card.style.display = visible ? "" : "none";
    });
    if (_apply && _apply !== window.applyFilters) { try { _apply(); } catch(e){} }
  };
  // Ensure chips mark use lowercase codes when toggling
  document.addEventListener('click', function(e){
    const el = e.target.closest && e.target.closest('.chip');
    if (!el) return;
    // force dataset code to lowercase once
    if (el.dataset && el.dataset.code) el.dataset.code = String(el.dataset.code).toLowerCase();
    setTimeout(() => { if (window.applyFilters) window.applyFilters(); }, 0);
  }, {passive:true});
})();    


// === Theme toggle logic ===
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("themeToggle");
  if (!btn) return;

  // Restore saved theme if any
  if (localStorage.getItem("theme") === "light") {
    document.body.classList.add("light");
    btn.textContent = "☀️";
  }

  btn.addEventListener("click", () => {
    document.body.classList.toggle("light");
    const isLight = document.body.classList.contains("light");
    btn.textContent = isLight ? "☀️" : "🌙";
    localStorage.setItem("theme", isLight ? "light" : "dark");
  });
});

// === Case-insensitive allergen matching (FI, Fi, fi, etc.) ===
(function(){
  function toLowerArray(arr){
    try { return (arr || []).map(x => String(x).toLowerCase()); } catch(e){ return []; }
  }
  function getActiveFilters(){
    return Array.from(document.querySelectorAll('.chip.active'))
      .map(ch => String(ch.dataset.code || '').toLowerCase());
  }
  // Normalize any existing chip dataset codes on click
  document.addEventListener('click', function(e){
    const chip = e.target.closest && e.target.closest('.chip');
    if (!chip) return;
    if (chip.dataset && chip.dataset.code) chip.dataset.code = String(chip.dataset.code).toLowerCase();
    setTimeout(() => { if (window.applyFilters) window.applyFilters(); }, 0);
  }, {passive:true});

  // Wrap/define applyFilters to compare in lowercase
  const _apply = (typeof window.applyFilters === 'function') ? window.applyFilters : null;
  window.applyFilters = function(){
    const active = getActiveFilters(); // lowercase filters
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
      let allergens = [];
      try { allergens = JSON.parse(card.dataset.allergens || "[]"); } catch(e){ allergens = []; }
      const low = toLowerArray(allergens);
      const visible = active.every(code => !low.includes(code));
      card.style.display = visible ? "" : "none";
    });
    if (_apply && _apply !== window.applyFilters) { try { _apply(); } catch(e){} }
  };

  // Normalize card datasets on load
  function normalizeCardDatasets(){
    document.querySelectorAll('.card').forEach(card => {
      try {
        const arr = JSON.parse(card.dataset.allergens || "[]");
        const low = toLowerArray(arr);
        card.dataset.allergens = JSON.stringify(low);
      } catch(e){}
    });
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', normalizeCardDatasets);
  } else {
    normalizeCardDatasets();
  }
})();
