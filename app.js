
/* N8 Menu — Allergen Filter (normalized) */
/* This file replaces the previous app.js. It fixes the "CONTAINS Milk" toggle by
   normalizing allergen codes on BOTH sides before filtering.
   It also keeps the UI behavior used in menu.html (chips, categories, unsafe toggle, etc.). */

(function() {
  // ---------- Helpers ----------
  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

  const NORM = s => (s || '').trim().toUpperCase();
  const normalizeList = arr => Array.from(new Set((arr || []).map(NORM).filter(Boolean)));

  // State
  let dishes = [];
  let filtered = [];
  let selectedAllergens = new Set(); // normalized codes
  let selectedCategories = new Set(); // raw category strings
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

  // Theme toggle (keep existing behavior)
  const themeToggle = $('#themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('light');
      themeToggle.textContent = document.body.classList.contains('light') ? '☀️' : '🌙';
    }, { passive: true });
  }

  // ---------- Fetch & boot ----------
  fetch('./menu.json', { cache: 'no-store' })
    .then(r => r.json())
    .then(data => {
      dishes = (data || []).map(d => ({
        ...d,
        allergensNorm: normalizeList(d.allergens),
        category: (d.category || '').trim()
      }));

      buildAllergenChips(dishes);
      buildCategoryChips(dishes);
      render();
    })
    .catch(err => {
      console.error('Failed to load menu.json', err);
      grid.innerHTML = `<div class="card"><h3>Could not load menu.json</h3><p class="desc">Check console.</p></div>`;
    });

  // ---------- Build chips ----------
  function buildAllergenChips(list) {
    const allCodes = new Set();
    list.forEach(d => d.allergensNorm.forEach(c => allCodes.add(c)));

    // Keep stable order A..Z, but show common ones earlier if present
    const priority = ['GL','SO','CR','EG','MI','FI','SE','NU','MU','MR','GA','ON','CE','MO','LU','PE','HO'];
    const codes = Array.from(allCodes);
    codes.sort((a,b) => {
      const ia = priority.indexOf(a); const ib = priority.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });

    chipsWrap.innerHTML = '';
    codes.forEach(code => {
      const btn = document.createElement('button');
      btn.className = 'chip chip-' + code.toLowerCase();
      btn.type = 'button';
      btn.setAttribute('role', 'switch');
      btn.setAttribute('aria-checked', 'false');
      btn.dataset.code = code;
      btn.innerHTML = `<b>${code}</b> `;
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

  // ---------- Interactions ----------
  function toggleAllergen(code, el) {
    const C = NORM(code);
    if (selectedAllergens.has(C)) {
      selectedAllergens.delete(C);
      if (el) { el.classList.remove('active'); el.setAttribute('aria-checked','false'); }
    } else {
      selectedAllergens.add(C);
      if (el) { el.classList.add('active'); el.setAttribute('aria-checked','true'); }
    }
    render();
  }

  function toggleCategory(cat, el) {
    const key = (cat || '').trim();
    if (selectedCategories.has(key)) {
      selectedCategories.delete(key);
      if (el) { el.classList.remove('active'); el.setAttribute('aria-checked','false'); }
    } else {
      selectedCategories.add(key);
      if (el) { el.classList.add('active'); el.setAttribute('aria-checked','true'); }
    }
    render();
  }

  // Unsafe toggle = "Show dishes that CONTAIN selected allergen(s)"
  if (unsafeToggle) {
    unsafeToggle.addEventListener('click', () => {
      unsafeMode = !unsafeMode;
      unsafeToggle.setAttribute('aria-pressed', String(unsafeMode));
      unsafeToggle.dataset.active = unsafeMode ? 'true' : 'false';
      render();
    }, { passive: true });
  }

  // Filter panel toggles
  if (filterToggle && filterPanel) {
    filterToggle.addEventListener('click', () => {
      const open = filterPanel.classList.toggle('open');
      filterToggle.setAttribute('aria-expanded', String(open));
      filterToggle.dataset.active = open ? 'true' : 'false';
    }, { passive: true });
  }

  if (categoryToggle && categoryPanel) {
    categoryToggle.addEventListener('click', () => {
      const open = categoryPanel.classList.toggle('open');
      categoryToggle.setAttribute('aria-expanded', String(open));
      categoryToggle.dataset.active = open ? 'true' : 'false';
    }, { passive: true });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      // clear selections
      selectedAllergens.clear();
      selectedCategories.clear();
      unsafeMode = false;
      unsafeToggle && unsafeToggle.setAttribute('aria-pressed', 'false');
      // reset chip UI
      $$('.chip', chipsWrap).forEach(b => { b.classList.remove('active'); b.setAttribute('aria-checked','false'); });
      $$('.chip', catWrap).forEach(b => { b.classList.remove('active'); b.setAttribute('aria-checked','false'); });
      render();
      // subtle pulse class (optional)
      resetBtn.classList.add('active');
      setTimeout(()=>resetBtn.classList.remove('active'), 1200);
    }, { passive: true });
  }

  // ---------- Filtering ----------
  function dishMatches(d) {
    // Categories (AND: must be in any selected category set)
    if (selectedCategories.size) {
      if (!selectedCategories.has(d.category)) return false;
    }
    // Allergen logic
    if (!selectedAllergens.size) return true; // no allergen filters

    const hasAnySelected = d.allergensNorm.some(a => selectedAllergens.has(a));
    // unsafeMode -> show dishes that CONTAIN any selected allergens
    // !unsafeMode -> show dishes that contain NONE of selected allergens
    return unsafeMode ? hasAnySelected : !hasAnySelected;
  }

  // ---------- Render ----------
  function render() {
    filtered = dishes.filter(dishMatches);
    // Count + active filter text
    const n = filtered.length;
    resultCount.textContent = `${n} ${n === 1 ? 'dish' : 'dishes'}`;

    const afParts = [];
    if (selectedAllergens.size) {
      const arr = Array.from(selectedAllergens).join(', ');
      afParts.push(unsafeMode ? `Contains: ${arr}` : `SAFE from: ${arr}`);
    }
    if (selectedCategories.size) {
      afParts.push(`Categories: ${Array.from(selectedCategories).join(', ')}`);
    }
    activeFilter.textContent = afParts.length ? afParts.join(' · ') : 'No filters active';

    empty.classList.toggle('hidden', n !== 0);

    // Grid
    grid.innerHTML = filtered.map(cardHTML).join('');
  }

  function cardHTML(d) {
    const catPill = d.category ? `<div class="labels"><span class="pill">${d.category}</span></div>` : '';
    const desc = (d.description || '').trim();
    const descHTML = desc ? `<p class="desc">${escapeHtml(desc)}</p>` : '';
    const chips = d.allergensNorm.map(c => `<span class="badge chip-${c.toLowerCase()}">${c}</span>`).join('');
    return `
      <article class="card">
        ${catPill}
        <h3>${escapeHtml(d.name || '')}</h3>
        ${descHTML}
        <div class="badges">${chips}</div>
      </article>
    `;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[m]));
  }

  // ---------- Optional: Add Dish Modal (minimal, non-destructive) ----------
  // Keeps UI from breaking when buttons are clicked.
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
