/* Shang Shi Menu — robust filtering (SAFE = excludes selected allergens)
   - Rebuilds active filter state from DOM on every toggle
   - Works after deselect → reselect (no stale arrays)
   - Updates result count and active filter summary
   - Keeps UI (chips, panel, theme toggle) in sync
*/

// ---------- Utilities
const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

// ---------- State (data only; no UI state stored here)
let MENU = [];

// ---------- Boot
document.addEventListener('DOMContentLoaded', async () => {
  await loadMenu();
  buildChipsFromMenu();
  renderMenu(MENU);
  wireFilterPanel();
  wireThemeToggle();
});

// ---------- Data loading
async function loadMenu(){
  try{
    const res = await fetch('./menu.json', {cache:'no-store'});
    MENU = await res.json();
  }catch(err){
    console.error('Failed to load menu.json', err);
    MENU = [];
  }
}

// ---------- Build filter chips (one per allergen code)
function buildChipsFromMenu(){
  const chipsWrap = $('#chips');
  chipsWrap.innerHTML = '';

  const codes = new Set();
  MENU.forEach(d => (d.allergens||[]).forEach(a => codes.add(a)));

  // Sort codes alphabetically but push common ones earlier
  const priority = ['GL','CR','Mi','EG','MR','ON','SO','GA','SE','NU','MU','FI','MO','LU','CE','PE','FL','CL'];
  const sorted = Array.from(codes).sort((a,b)=>{
    const ia = priority.indexOf(a), ib = priority.indexOf(b);
    if(ia===-1 && ib===-1) return a.localeCompare(b);
    if(ia===-1) return 1;
    if(ib===-1) return -1;
    return ia-ib;
  });

  sorted.forEach(code => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.type = 'button';
    chip.dataset.allergen = code;
    chip.innerHTML = `<b>${code}</b> SAFE`;
    chip.addEventListener('click', onChipToggle, {passive:true});
    chipsWrap.appendChild(chip);
  });
}

// ---------- Chip toggle handler
function onChipToggle(e){
  const chip = e.currentTarget;
  chip.classList.toggle('active');
  applyFilters(); // always recompute from DOM
}

// ---------- Apply filters (rebuild active list fresh each time)
function applyFilters(){
  const activeCodes = $$('.chip.active').map(c => c.dataset.allergen);

  // Update meta label
  const activeLabel = activeCodes.length ? `SAFE without: ${activeCodes.join(', ')}` : 'No filters active';
  $('#activeFilter').textContent = activeLabel;

  if(activeCodes.length === 0){
    renderMenu(MENU);
    return;
  }

  const filtered = MENU.filter(dish => {
    const has = (dish.allergens || []);
    return !has.some(a => activeCodes.includes(a));
  });

  renderMenu(filtered);
}

// ---------- Render grid
function renderMenu(list){
  const grid = $('#grid');
  const empty = $('#empty');

  // Clear
  grid.innerHTML = '';

  // Fill
  list.forEach(d => grid.appendChild(createCard(d)));

  // Meta
  $('#resultCount').textContent = `${list.length} ${list.length===1 ? 'dish' : 'dishes'}`;

  // Empty state
  empty.classList.toggle('hidden', list.length !== 0);
}

// ---------- Create a card
function createCard(dish){
  const card = document.createElement('article');
  card.className = 'card';
  card.setAttribute('role','region');
  card.setAttribute('aria-label', dish.name);

  const allergens = (dish.allergens || []).join(', ');

  card.innerHTML = `
    <div class="safe-badge" aria-hidden="true"></div>
    <h3>${escapeHTML(dish.name)}</h3>
    ${dish.description ? `<p class="desc">${escapeHTML(dish.description)}</p>` : ''}
    <div class="badges">
      ${(dish.allergens || []).map(a => `<span class="badge">${a}</span>`).join('')}
    </div>
  `;

  return card;
}

// ---------- Panels & theme
function wireFilterPanel(){
  const btn = $('#filterToggle');
  const panel = $('#filterPanel');

  if(!btn || !panel) return;

  const toggle = () => {
    const isOpen = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!isOpen));
    panel.classList.toggle('open', !isOpen);
  };

  btn.addEventListener('click', toggle, {passive:true});

  // Close if clicked outside the chips/panel area
  document.addEventListener('click', (e) => {
    const isInside = panel.contains(e.target) || btn.contains(e.target);
    if(!isInside && panel.classList.contains('open')){
      btn.setAttribute('aria-expanded','false');
      panel.classList.remove('open');
    }
  });
}

function wireThemeToggle(){
  const t = $('#themeToggle');
  if(!t) return;
  const applyIcon = () => { t.textContent = document.body.classList.contains('light') ? '☀️' : '🌙'; };
  t.addEventListener('click', ()=>{
    document.body.classList.toggle('light');
    applyIcon();
  }, {passive:true});
  applyIcon();
}

// ---------- Helpers
function escapeHTML(str){
  return String(str).replace(/[&<>"']/g, s => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[s]));
}
