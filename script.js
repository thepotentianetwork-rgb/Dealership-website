// ============================================================
// Live inventory config
// ------------------------------------------------------------
// Fill these in once this dealership's Supabase project + tenant
// are known, and the sample cards below get replaced automatically
// with live inventory from the CRM (adds/edits/sold status all
// reflect here with no manual re-entry):
//
//   SUPABASE_URL      Settings -> API -> Project URL
//   SUPABASE_ANON_KEY Settings -> API -> anon / public key
//   TENANT_ID         this dealership's row id in the `tenants` table
//
// Until all three are set, the page keeps showing the static sample
// cards already in the HTML.
// ============================================================
const SUPABASE_URL = "";
const SUPABASE_ANON_KEY = "";
const TENANT_ID = "";

const LIVE_INVENTORY_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && TENANT_ID);

async function fetchLiveInventory() {
  if (!LIVE_INVENTORY_ENABLED) return null;
  try {
    const url =
      `${SUPABASE_URL}/rest/v1/inventory_vehicles` +
      `?tenant_id=eq.${TENANT_ID}&status=eq.for_sale&order=created_at.desc`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Live inventory fetch failed, showing sample cards instead.", err);
    return null;
  }
}

function formatPrice(cents) {
  if (typeof cents !== "number") return "Call for price";
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

// No body-type column in inventory_vehicles yet, so filtering on live
// vehicles is a best-effort guess from make/model until one is added.
const TRUCK_MODELS = ["silverado", "f-150", "f150", "ram 1500", "sierra", "tacoma", "tundra", "ranger", "colorado", "frontier"];
const SUV_MODELS = ["outback", "cherokee", "explorer", "tahoe", "rav4", "rav-4", "cr-v", "crv", "highlander", "pilot", "wrangler", "blazer", "equinox", "traverse", "suburban", "4runner"];

function classifyBodyType(make, model) {
  const s = `${make ?? ""} ${model ?? ""}`.toLowerCase();
  if (TRUCK_MODELS.some((m) => s.includes(m))) return "truck";
  if (SUV_MODELS.some((m) => s.includes(m))) return "suv";
  return "sedan";
}

const PLACEHOLDER_ICON = `
  <svg class="car-icon" viewBox="0 0 120 60" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 40 L10 32 Q10 28 14 26 L28 26 L38 14 Q40 12 44 12 L78 12 Q82 12 84 15 L94 26 L108 26 Q112 26 112 32 L112 40"/>
    <line x1="4" y1="40" x2="116" y2="40"/>
    <circle cx="30" cy="40" r="7"/>
    <circle cx="92" cy="40" r="7"/>
    <line x1="44" y1="12" x2="44" y2="26" stroke-width="2"/>
    <line x1="78" y1="12" x2="78" y2="26" stroke-width="2"/>
  </svg>
  <span class="photo-label">Image Pending</span>`;

function vehicleCardHTML(v) {
  const title = `${v.year ?? ""} ${v.make ?? ""} ${v.model ?? ""}`.trim();
  const bodyType = classifyBodyType(v.make, v.model);
  const photoInner = v.photos && v.photos[0]
    ? `<img src="${v.photos[0]}" alt="${title}" class="sticker-img">`
    : PLACEHOLDER_ICON;
  const stock = v.vin ? `STK #${v.vin.slice(-6).toUpperCase()}` : "";

  return `
    <article class="sticker-card" data-type="${bodyType}">
      <div class="sticker-perf"><span></span><span></span><span></span><span></span><span></span><span></span></div>
      <div class="sticker-photo">
        <div class="corner-tag">${formatPrice(v.price_cents)}</div>
        <div class="frame-corner tl"></div>
        <div class="frame-corner tr"></div>
        <div class="frame-corner bl"></div>
        <div class="frame-corner br"></div>
        <div class="photo-placeholder">${photoInner}</div>
      </div>
      <div class="sticker-body">
        <h3>${title}</h3>
        <p class="sticker-trim">${v.trim ?? ""}</p>
        <dl class="spec-grid">
          <dt>Mileage</dt><dd>${v.mileage != null ? v.mileage.toLocaleString() + " mi" : "—"}</dd>
          <dt>Condition</dt><dd>${v.condition ?? "—"}</dd>
          <dt>Color</dt><dd>${v.exterior_color ?? "—"}</dd>
        </dl>
      </div>
      <div class="sticker-footer">
        <span class="sticker-stock">${stock}</span>
        <a href="inventory.html" class="sticker-link">Details →</a>
      </div>
    </article>`;
}

async function renderLiveInventoryIfAvailable() {
  const grid = document.getElementById("grid");
  const featured = document.getElementById("featured-grid");
  if (!grid && !featured) return;

  const vehicles = await fetchLiveInventory();
  if (!vehicles) return; // keep the sample cards already in the HTML

  if (grid) {
    grid.innerHTML = vehicles.length
      ? vehicles.map(vehicleCardHTML).join("")
      : `<p class="empty-inventory">No vehicles currently listed. Check back soon.</p>`;
    const countEl = document.getElementById("visible-count");
    if (countEl) countEl.textContent = vehicles.length;
  }

  if (featured) {
    featured.innerHTML = vehicles.slice(0, 3).map(vehicleCardHTML).join("");
  }
}

function initFilterChips() {
  const chips = document.querySelectorAll(".filter-chip");
  const countEl = document.getElementById("visible-count");
  if (!chips.length) return;

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      const filter = chip.dataset.filter;
      const cards = document.querySelectorAll("#grid .sticker-card");
      let visible = 0;
      cards.forEach((card) => {
        const match = filter === "all" || card.dataset.type === filter;
        card.style.display = match ? "" : "none";
        if (match) visible++;
      });
      if (countEl) countEl.textContent = visible;
    });
  });
}

function initOdometers() {
  const odometers = document.querySelectorAll(".odometer-value[data-target]");
  odometers.forEach((el) => {
    const target = parseInt(el.dataset.target, 10) || 0;
    const duration = 900;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(target * eased);
      el.textContent = String(value).padStart(String(target).length, "0");
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initFilterChips();
  initOdometers();
  renderLiveInventoryIfAvailable();
});
