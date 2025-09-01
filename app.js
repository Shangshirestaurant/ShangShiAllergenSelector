// === Shang Shi Allergen Tool — Rebuilt ===

// Map allergen codes to names
const LEGEND = {
  CE:"Celery", GL:"Gluten", CR:"Crustaceans", EG:"Eggs", FI:"Fish", MO:"Molluscs", Mi:"Milk",
  MU:"Mustard", NU:"Nuts", SE:"Sesame", SO:"Soya", GA:"Garlic", ON:"Onion", MR:"Mushrooms"
};

// Map allergen codes to glass tint classes
const allergenClassMap = {
  GL: "chip-gluten",
  Mi: "chip-dairy",
  CR: "chip-crustacean",
  EG: "chip-egg",
  NU: "chip-nuts",
  SO: "chip-soy",
  SE: "chip-sesame"
};

// State
let menuData = [];
const selectedAllergens = new Set();
let selectedCategory = null;

// Elements
const els = {
  grid: document.getElementById("grid"),
  chips: document.getElementById("chips"),
  cat: document.getElementById("categories"),
  resultCount: document.getElementById("resultCount"),
  activeFilter: document.getElementById("activeFilter"),
  empty: document.getElementById("empty"),
  filterToggle: document.getElementById("filterToggle"),
  categoryToggle: document.getElementById("categoryToggle"),
  filterPanel: document.getElementById("filterPanel"),
  categoryPanel: document.getElementById("categoryPanel"),
  resetBtn: document.getElementById("resetBtn"),
  themeToggle: document.getElementById("themeToggle")
};

// Render allergen chips (only those present in data)
function renderAllergenChips() {
  els.chips.innerHTML = "";
  const present = new Set();
  menuData.forEach(d => (d.allergens||[]).forEach(a => present.add(a)));
  Object.keys(LEGEND).forEach(code => {
    if (!present.has(code)) return;
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.dataset.code = code;
    if (allergenClassMap[code]) btn.classList.add(allergenClassMap[code]);
    btn.innerHTML = `<b>${code}</b> ${LEGEND[code] || code}`;
    btn.addEventListener("click", () => {
      if (selectedAllergens.has(code)) {
        selectedAllergens.delete(code); btn.classList.remove("active");
      } else {
        selectedAllergens.add(code); btn.classList.add("active");
      }
      refresh();
    }, {passive:true});
    els.chips.appendChild(btn);
  });
}

// Render category chips
function renderCategoryChips() {
  els.cat.innerHTML = "";
  const cats = Array.from(new Set(menuData.map(d => d.category))).filter(Boolean);
  cats.forEach(cat => {
    const key = String(cat).toLowerCase().replace(/\s+/g,"");
    const btn = document.createElement("button");
    btn.className = `chip category chip-${key}`;
    btn.textContent = cat;
    btn.addEventListener("click", () => {
      if (selectedCategory === cat) {
        selectedCategory = null; btn.classList.remove("active");
      } else {
        selectedCategory = cat;
        [...els.cat.children].forEach(c => c.classList.remove("active"));
        btn.classList.add("active");
      }
      refresh();
    }, {passive:true});
    els.cat.appendChild(btn);
  });
}

// Card builder
function buildCard(item) {
  const card = document.createElement("article");
  card.className = "card";
  card.setAttribute("tabindex","0");

  const labels = document.createElement("div");
  labels.className = "labels";

  if (item.category) {
    const key = String(item.category).toLowerCase().replace(/\s+/g,"");
    const pill = document.createElement("span");
    pill.className = `pill pill-${key}`;
    pill.textContent = item.category;
    labels.appendChild(pill);
  }

  // SAFE indicator if current selection is safe
  const A = item.allergens || [];
  const safeNow = selectedAllergens.size > 0 && [...selectedAllergens].every(x => !A.includes(x));
  if (safeNow) {
    const s = document.createElement("span");
    s.className = "safe-pill";
    s.textContent = "SAFE";
    labels.appendChild(s);
  }

  const h = document.createElement("h3");
  h.textContent = item.name;

  const p = document.createElement("p");
  p.className = "desc";
  p.textContent = item.description || "";

  const badges = document.createElement("div");
  badges.className = "badges";
  (item.allergens || []).forEach(code => {
    const b = document.createElement("span");
    b.className = "badge";
    b.textContent = code;
    b.title = LEGEND[code] || code;
    badges.appendChild(b);
  });

  card.append(labels, h, p, badges);
  return card;
}

// Filtering
function isSafe(item) {
  const A = item.allergens || [];
  return !selectedAllergens.size || [...selectedAllergens].every(x => !A.includes(x));
}
function inCategory(item) {
  return !selectedCategory || item.category === selectedCategory;
}

// Render grid
function renderGrid(list) {
  els.grid.innerHTML = "";
  if (!list.length) {
    els.empty.classList.remove("hidden");
    return;
  }
  els.empty.classList.add("hidden");
  const frag = document.createDocumentFragment();
  list.forEach(item => frag.appendChild(buildCard(item)));
  els.grid.appendChild(frag);
}

// Refresh all UI
function refresh() {
  const filtered = menuData.filter(d => isSafe(d) && inCategory(d));
  renderGrid(filtered);
  els.resultCount.textContent = `${filtered.length} dish${filtered.length===1?"":"es"}`;
  if (!selectedAllergens.size && !selectedCategory) {
    els.activeFilter.textContent = "No filters active";
  } else {
    const A = [...selectedAllergens].join(", ") || "All";
    const C = selectedCategory || "All";
    els.activeFilter.textContent = `Allergens: ${A} • Category: ${C}`;
  }
}

// Toggle helpers
function toggle(btn, panel) {
  const open = btn.getAttribute("aria-expanded") === "true";
  btn.setAttribute("aria-expanded", String(!open));
  panel.classList.toggle("open", !open);
  btn.dataset.active = String(!open);
}

// Reset
function clearAll() {
  selectedAllergens.clear();
  selectedCategory = null;
  // clear chip states
  [...els.chips.children].forEach(c => c.classList.remove("active"));
  [...els.cat.children].forEach(c => c.classList.remove("active"));
  refresh();
  // UI feedback on reset button
  const rb = els.resetBtn;
  rb.classList.add("spin");
  setTimeout(()=>rb.classList.remove("spin"), 400);
}

// Theme toggle
if (els.themeToggle) {
  els.themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light");
  }, {passive:true});
}

// Event delegation: open modal on card click
const modal = document.getElementById("dishModal");
const modalTitle = document.getElementById("modalTitle");
const modalDesc = document.getElementById("modalDesc");
const modalAllergens = document.getElementById("modalAllergens");
const modalClose = document.querySelector(".modal-close");

function openModal(dish) {
  modalTitle.textContent = dish.name;
  modalDesc.textContent = dish.description || "No description available.";
  modalAllergens.innerHTML = "";
  (dish.allergens || []).forEach(allergen => {
    const chip = document.createElement("span");
    chip.className = "chip";
    if (allergenClassMap[allergen]) chip.classList.add(allergenClassMap[allergen]);
    chip.textContent = allergen;
    modalAllergens.appendChild(chip);
  });
  modal.classList.remove("hidden");
}
if (modalClose) modalClose.addEventListener("click", () => modal.classList.add("hidden"));
if (modal) modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.add("hidden"); });

els.grid.addEventListener("click", (e) => {
  const card = e.target.closest(".card");
  if (!card) return;
  const name = card.querySelector("h3")?.textContent;
  const dish = menuData.find(d => d.name === name);
  if (dish) openModal(dish);
});

// Initialize
async function init() {
  try {
    const res = await fetch("./menu.json", {cache:"no-store"});
    menuData = await res.json();
  } catch (e) {
    console.error("Failed to load menu.json", e);
    menuData = [];
  }
  renderAllergenChips();
  renderCategoryChips();
  refresh();

  if (els.filterToggle && els.filterPanel) els.filterToggle.addEventListener("click", () => toggle(els.filterToggle, els.filterPanel), {passive:true});
  if (els.categoryToggle && els.categoryPanel) els.categoryToggle.addEventListener("click", () => toggle(els.categoryToggle, els.categoryPanel), {passive:true});
  if (els.resetBtn) els.resetBtn.addEventListener("click", clearAll, {passive:true});
}

document.addEventListener("DOMContentLoaded", init);
