(function () {
  const { api, $ } = window.VD;

  function cardHTML(p) {
    const off = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
    return `
<a class="card" href="/product.html?id=${encodeURIComponent(p.slug)}">
  <div class="media">
    <div class="badges">
      ${p.isNew ? '<span class="badge">Yeni</span>' : ""}
      ${off ? `<span class="badge sale">-%${off}</span>` : ""}
      ${p.featured ? '<span class="badge dark">Seçili</span>' : ""}
    </div>
    <img src="${p.images[0]}" alt="${p.name}" loading="lazy">
    <div class="quick">Hızlı Bak</div>
  </div>
  <div class="info">
    <div class="brand">${p.brand} · ${p.model}</div>
    <div class="name">${p.name}</div>
    <div class="price"><span>${window.VD.money(p.price)}</span>${p.oldPrice ? `<s>${window.VD.money(p.oldPrice)}</s>` : ""}</div>
  </div>
</a>`;
  }

  async function init() {
    try {
      const meta = await api("/api/meta");
      window.SHIPPING = meta.shipping;
      document.dispatchEvent(new CustomEvent("cart:change"));
    } catch {}
    try {
      const { products } = await api("/api/products?sort=featured");
      const grid = $("#featured-grid");
      const list = products.slice(0, 8);
      grid.innerHTML = list.length
        ? list.map(cardHTML).join("")
        : `<div class="empty" style="grid-column:1/-1">
             <div class="big">Henüz Ürün Yok</div>
             <p>Ürünleri admin panelinden ekleyin</p>
             <a class="btn" href="/admin.html">Admin Paneli</a>
           </div>`;
    } catch (e) {
      window.VD.toast(e.message, "err");
    }
  }
  init();
})();
