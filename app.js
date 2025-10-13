
/* N8 Menu — Minimal Fix (Normalize allergens + correct CONTAINS logic)
   This replaces app.js without changing visuals (chip text/badges untouched). */
(function() {
  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

  // === Normalization helpers (logic only) ===
  const NORM = s => (s || '').trim().toUpperCase();
  const normalizeList = arr => Array.from(new Set((arr || []).map(NORM).filter(Boolean)));

  // State
  let dishes = [];
  let selectedAllergens = new Set(); // normalized codes
  let selectedCategories = new Set();
  let unsafeMode = false; // false = SAFE (exclude), true = CONTAINS

  // Elements
  const grid = $('#grid');
  const chipsWrap = $('#chips');
  const catWrap = $('#categories');
  const resultCount = $('#resultCount');
  const activeFilter = $('#activeFilter');
  const empty = $('#empty');
  const unsafeToggle = $('#unsafeToggle');
  const filterToggle = $('#filterToggle');
  const filterPanel = $('#filterPanel');
  const categoryToggle = $('#categoryToggle');
  const categoryPanel = $('#categoryPanel');
  const resetBtn = $('#resetBtn');

  // Theme toggle (kept as-is)
  const themeToggle = $('#themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('light');
      themeToggle.textContent = document.body.classList.contains('light') ? '☀️' : '🌙';
    }, { passive: true });
  }

  // Load menu
  fetch('./menu.json', { cache: 'no-store' })
    .then(r => r.json())
    .then(data => {
      dishes = (data || []).map(d => ({
        ...d,
        allergensNorm: normalizeList(d.allergens), // <— normalized copy for logic
        category: (d.category || '').trim()
      }));
      buildAllergenChips(dishes);
      buildCategoryChips(dishes);
      render();
    })
    .catch(err => {
      console.error('Failed to load menu.json', err);
      grid.innerHTML = `<article class="card"><h3>Could not load menu.json</h3><p class="desc">Open console for details.</p></article>`;
    });

  // Build allergen chips (codes only to keep visuals unchanged)
  function buildAllergenChips(list) {
    const allCodes = new Set();
    list.forEach(d => d.allergensNorm.forEach(c => allCodes.add(c)));
    const codes = Array.from(allCodes).sort();
    chipsWrap.innerHTML = '';
    codes.forEach(code => {
      const btn = document.createElement('button');
      btn.className = 'chip chip-' + code.toLowerCase();
      btn.type = 'button';
      btn.setAttribute('role', 'switch');
      btn.setAttribute('aria-checked', 'false');
      btn.dataset.code = code;
      btn.innerHTML = `<b>${code}</b>`; // keep original look
      btn.addEventListener('click', () => toggleAllergen(code, btn));
      chipsWrap.appendChild(btn);
    });
  }

  function buildCategoryChips(list) {
    const cats = Array.from(new Set(list.map(d => d.category).filter(Boolean))).sort();
    catWrap.innerHTML = '';
    cats.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'chip category';
      btn.type = 'button';
      btn.dataset.cat = cat;
      btn.textContent = cat;
      btn.setAttribute('role', 'switch');
      btn.setAttribute('aria-checked', 'false');
      btn.addEventListener('click', () => toggleCategory(cat, btn));
      catWrap.appendChild(btn);
    });
  }

  // Interactions
  function toggleAllergen(code, el) {
    const C = NORM(code);
    if (selectedAllergens.has(C)) {
      selectedAllergens.delete(C);
      el && el.classList.remove('active');
      el && el.setAttribute('aria-checked', 'false');
    } else {
      selectedAllergens.add(C);
      el && el.classList.add('active');
      el && el.setAttribute('aria-checked', 'true');
    }
    render();
  }

  function toggleCategory(cat, el) {
    const key = (cat || '').trim();
    if (selectedCategories.has(key)) {
      selectedCategories.delete(key);
      el && el.classList.remove('active');
      el && el.setAttribute('aria-checked', 'false');
    } else {
      selectedCategories.add(key);
      el && el.classList.add('active');
      el && el.setAttribute('aria-checked', 'true');
    }
    render();
  }

  if (unsafeToggle) {
    unsafeToggle.addEventListener('click', () => {
      unsafeMode = !unsafeMode;
      unsafeToggle.setAttribute('aria-pressed', String(unsafeMode));
      render();
    }, { passive: true });
  }

  if (filterToggle && filterPanel) {
    filterToggle.addEventListener('click', () => {
      const open = filterPanel.classList.toggle('open');
      filterToggle.setAttribute('aria-expanded', String(open));
    }, { passive: true });
  }

  if (categoryToggle && categoryPanel) {
    categoryToggle.addEventListener('click', () => {
      const open = categoryPanel.classList.toggle('open');
      categoryToggle.setAttribute('aria-expanded', String(open));
    }, { passive: true });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      selectedAllergens.clear();
      selectedCategories.clear();
      unsafeMode = false;
      unsafeToggle && unsafeToggle.setAttribute('aria-pressed', 'false');
      $$('.chip', chipsWrap).forEach(b => { b.classList.remove('active'); b.setAttribute('aria-checked','false'); });
      $$('.chip', catWrap).forEach(b => { b.classList.remove('active'); b.setAttribute('aria-checked','false'); });
      render();
      resetBtn.classList.add('active');
      setTimeout(()=>resetBtn.classList.remove('active'), 1000);
    }, { passive: true });
  }

  // Filtering
  function dishMatches(d) {
    if (selectedCategories.size && !selectedCategories.has(d.category)) return false;
    if (!selectedAllergens.size) return true;

    const hasAnySelected = d.allergensNorm.some(a => selectedAllergens.has(a));
    // unsafeMode -> show dishes that CONTAIN any selected allergen(s)
    // !unsafeMode -> show dishes that contain NONE of selected allergen(s)
    return unsafeMode ? hasAnySelected : !hasAnySelected;
  }

  // Render
  function render() {
    const visible = dishes.filter(dishMatches);
    const n = visible.length;
    resultCount.textContent = `${n} ${n===1?'dish':'dishes'}`;

    const af = [];
    if (selectedAllergens.size) af.push(unsafeMode ? `Contains: ${Array.from(selectedAllergens).join(', ')}`
                                                   : `SAFE from: ${Array.from(selectedAllergens).join(', ')}`);
    if (selectedCategories.size) af.push(`Categories: ${Array.from(selectedCategories).join(', ')}`);
    activeFilter.textContent = af.length ? af.join(' · ') : 'No filters active';

    empty.classList.toggle('hidden', n !== 0);
    grid.innerHTML = visible.map(cardHTML).join('');
  }

  function cardHTML(d) {
    const desc = (d.description || '').trim();
    const chips = (d.allergensNorm || []).map(c => `<span class="badge chip-${c.toLowerCase()}">${c}</span>`).join('');
    const cat = d.category ? `<div class="labels"><span class="pill">${d.category}</span></div>` : '';
    return `
      <article class="card">
        ${cat}
        <h3>${escapeHtml(d.name || '')}</h3>
        ${desc ? `<p class="desc">${escapeHtml(desc)}</p>` : ''}
        <div class="badges">${chips}</div>
      </article>
    `;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[m]));
  }

  // Minimal modal support to avoid errors
  const addDishBtn = $('#addDishBtn');
  const addDishModal = $('#addDishModal');
  const addDishClose = $('#addDishClose');
  if (addDishBtn && addDishModal) {
    addDishBtn.addEventListener('click', () => addDishModal.classList.remove('hidden'), { passive: true });
  }
  if (addDishClose && addDishModal) {
    addDishClose.addEventListener('click', () => addDishModal.classList.add('hidden'), { passive: true });
  }
})();
