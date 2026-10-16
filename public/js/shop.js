(function () {
  const { api, $, $$, qs, money, toast } = window.VD;

  const CAT_LABELS = { jean: "Jean", "ust-giyim": "Üst Giyim", "dis-giyim": "Dış Giyim", aksesuar: "Aksesuar" };

  const state = {
    category: qs("category", ""),
    sizes: (qs("sizes") || "").split(",").filter(Boolean),
    brands: (qs("brands") || "").split(",").filter(Boolean),
    models: (qs("models") || "").split(",").filter(Boolean),
    sort: qs("sort", "featured")
  };

  function syncURL() {
    const p = new URLSearchParams();
    if (state.category) p.set("category", state.category);
    if (state.sizes.length) p.set("sizes", state.sizes.join(","));
    if (state.brands.length) p.set("brands", state.brands.join(","));
    if (state.models.length) p.set("models", state.models.join(","));
    if (state.sort !== "featured") p.set("sort", state.sort);
    history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : ""));
  }

  function toggle(arr, v) {
    const i = arr.indexOf(v);
    if (i === -1) arr.push(v); else arr.splice(i, 1);
    return arr;
  }

  function cardHTML(p) {
    const off = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
    return `
<a class="card" href="/product.html?id=${encodeURIComponent(p.slug)}">
  <div class="media">
    <div class="badges">
      ${p.isNew ? '<span class="badge">Yeni</span>' : ""}
      ${off ? `<span class="badge sale">-%${off}</span>` : ""}
    </div>
    <img src="${p.images[0]}" alt="${p.name}" loading="lazy">
    <div class="quick">Hızlı Bak</div>
  </div>
  <div class="info">
    <div class="brand">${p.brand} · ${p.model}</div>
    <div class="name">${p.name}</div>
    <div class="price"><span>${money(p.price)}</span>${p.oldPrice ? `<s>${money(p.oldPrice)}</s>` : ""}</div>
  </div>
</a>`;
  }

  let meta = { categories: [], brands: [], models: [], sizes: [] };

  function buildFilters() {
    $("#f-category").innerHTML = meta.categories.map((c) =>
      `<button class="chip ${state.category === c ? "on" : ""}" data-cat="${c}">${CAT_LABELS[c] || c}</button>`).join("");

    const order = ["Tek Beden", "S", "M", "L", "XL", "XXL"];
    const sizes = [...meta.sizes].sort((a, b) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return a.localeCompare(b, "tr");
    });
    $("#f-size").innerHTML = sizes.map((s) =>
      `<button class="chip ${state.sizes.includes(s) ? "on" : ""}" data-size="${s}">${s}</button>`).join("") ||
      `<span class="muted" style="font-size:12px">Henüz beden yok</span>`;

    $("#f-brand").innerHTML = meta.brands.map((b) =>
      `<label class="check ${state.brands.includes(b) ? "on" : ""}"><input type="checkbox" data-brand="${b}" ${state.brands.includes(b) ? "checked" : ""}>${b}</label>`).join("") ||
      `<span class="muted" style="font-size:12px">Henüz marka yok</span>`;

    $("#f-model").innerHTML = meta.models.map((m) =>
      `<label class="check ${state.models.includes(m) ? "on" : ""}"><input type="checkbox" data-model="${m}" ${state.models.includes(m) ? "checked" : ""}>${m}</label>`).join("") ||
      `<span class="muted" style="font-size:12px">Henüz model yok</span>`;
  }

  function renderActive() {
    const chips = [];
    if (state.category) chips.push(`<button class="chip" data-x="category" data-v="">${CAT_LABELS[state.category] || state.category}</button>`);
    state.sizes.forEach((s) => chips.push(`<button class="chip" data-x="sizes" data-v="${s}">${s}</button>`));
    state.brands.forEach((b) => chips.push(`<button class="chip" data-x="brands" data-v="${b}">${b}</button>`));
    state.models.forEach((m) => chips.push(`<button class="chip" data-x="models" data-v="${m}">${m}</button>`));
    $("#active-filters").innerHTML = chips.join("");
    $("#page-title").textContent = state.category ? (CAT_LABELS[state.category] || state.category) : "Tüm Ürünler";
  }

  async function apply() {
    syncURL();
    renderActive();
    buildFilters();
    const p = new URLSearchParams();
    if (state.category) p.set("category", state.category);
    if (state.sizes.length) p.set("sizes", state.sizes.join(","));
    if (state.brands.length) p.set("brands", state.brands.join(","));
    if (state.models.length) p.set("models", state.models.join(","));
    p.set("sort", state.sort);
    try {
      const data = await api("/api/products?" + p);
      $("#result-count").textContent = `${data.total} ürün`;
      $("#grid").innerHTML = data.products.length
        ? data.products.map(cardHTML).join("")
        : `<div class="empty" style="grid-column:1/-1">
             <div class="big">Sonuç Yok</div>
             <p>Filtreleri gevşeyip tekrar dene</p>
             <button class="btn" id="empty-clear">Filtreleri Temizle</button>
           </div>`;
      const ec = $("#empty-clear");
      if (ec) ec.onclick = clearAll;
    } catch (e) { toast(e.message, "err"); }
  }

  function clearAll() {
    state.category = ""; state.sizes = []; state.brands = []; state.models = [];
    apply();
  }

  function bind() {
    $("#filters").addEventListener("click", (e) => {
      const cat = e.target.closest("[data-cat]");
      const size = e.target.closest("[data-size]");
      if (cat) { state.category = state.category === cat.dataset.cat ? "" : cat.dataset.cat; apply(); }
      if (size) { toggle(state.sizes, size.dataset.size); apply(); }
    });
    $("#filters").addEventListener("change", (e) => {
      if (e.target.dataset.brand) { toggle(state.brands, e.target.dataset.brand); apply(); }
      if (e.target.dataset.model) { toggle(state.models, e.target.dataset.model); apply(); }
    });
    $("#active-filters").addEventListener("click", (e) => {
      const c = e.target.closest("[data-x]");
      if (!c) return;
      const k = c.dataset.x, v = c.dataset.v;
      if (k === "category") state.category = "";
      else toggle(state[k], v);
      apply();
    });
    $("#clear-filters").onclick = clearAll;
    $("#sort").value = state.sort;
    $("#sort").onchange = (e) => { state.sort = e.target.value; apply(); };
    $("#filters-toggle").onclick = () => $("#filters").classList.toggle("open");
  }

  async function init() {
    try {
      meta = await api("/api/meta");
      window.SHIPPING = meta.shipping;
      buildFilters();
    } catch {}
    bind();
    apply();
  }
  init();
})();
