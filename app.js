// Allergen legend
const LEGEND = {
  "CE":"Celery","GL":"Cereals (Gluten)","CR":"Crustaceans","EG":"Eggs","FI":"Fish",
  "LU":"Lupin","MO":"Molluscs","Mi":"Milk","MU":"Mustard","NU":"Nuts","PE":"Peanuts",
  "SE":"Sesame","SO":"Soya","SU":"Sulfites","GA":"Garlic","ON":"Onion","MR":"Mushrooms","CI":"Awaiting completion"
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