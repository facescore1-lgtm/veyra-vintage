(function () {
  const { api, $, qs, money, toast, Cart } = window.VD;

  let product = null;
  let imgIdx = 0;
  let selSize = "";
  let selColor = "";
  let qty = 1;

  function renderGallery() {
    const imgs = product.images || [];
    $("#thumbs").innerHTML = imgs.map((src, i) =>
      `<button class="${i === imgIdx ? "on" : ""}" data-i="${i}"><img src="${src}" alt=""></button>`).join("");
    $("#main-photo").src = imgs[imgIdx];
    $("#main-photo").alt = product.name;
    $("#img-idx").textContent = `${imgIdx + 1} / ${imgs.length}`;
  }

  function renderInfo() {
    $("#p-brand").textContent = `${product.brand} · ${product.id}`;
    $("#p-name").textContent = product.name;
    $("#p-fit").textContent = product.fit ? `Kalıp: ${product.fit}` : "";
    const off = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
    $("#p-price").innerHTML = `<span>${money(product.price)}</span>${product.oldPrice ? `<s>${money(product.oldPrice)}</s>` : ""}${off ? `<span class="off">-%${off}</span>` : ""}`;
    $("#p-desc").textContent = product.description || "";

    const colors = product.colors || [];
    selColor = colors.length ? colors[0].name : "";
    $("#p-colors").innerHTML = colors.length
      ? colors.map((c, i) => `<button class="color-dot ${i === 0 ? "on" : ""}" data-c="${c.name}" style="background:${c.hex}" title="${c.name}"></button>`).join("")
      : `<span class="muted" style="font-size:12px">Tek renk</span>`;
    $("#p-color-name").textContent = selColor;

    renderSizes();

    $("#p-features").innerHTML = (product.features || []).map((f) => `<li>${f}</li>`).join("") ||
      `<li>${product.description || "Ürün detayları yakında."}</li>`;

    const chart = product.sizeChart;
    if (chart && chart.rows && chart.rows.length) {
      $("#chart-table").innerHTML =
        `<thead><tr>${chart.columns.map((c) => `<th>${c}</th>`).join("")}</tr></thead>` +
        `<tbody>${chart.rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>`;
      $("#chart-note").textContent = chart.note || `Birim: ${chart.unit || "cm"}`;
    } else {
      $("#chart-details").classList.add("hide");
    }

    document.title = `${product.name} — VEYRA VINTAGE`;
  }

  function renderSizes() {
    const sizes = product.sizes || [];
    const stock = product.stock || {};
    $("#p-sizes").innerHTML = sizes.map((s) => {
      const q = typeof stock[s] === "number" ? stock[s] : null;
      const out = q === 0;
      return `<button class="size ${out ? "out" : ""} ${selSize === s ? "on" : ""}" data-s="${s}" ${out ? "disabled" : ""}>
        ${s}${q !== null && q > 0 && q <= 3 ? '<span class="low"></span>' : ""}</button>`;
    }).join("") || `<span class="muted" style="font-size:12px">Bedensiz ürün</span>`;
    if (!sizes.length) selSize = "";
    updateStock();
  }

  function updateStock() {
    const el = $("#p-stock");
    if (!selSize) { el.innerHTML = "Beden seç"; el.classList.remove("ok"); return; }
    const q = (product.stock || {})[selSize];
    if (typeof q !== "number") { el.innerHTML = "Stokta"; el.classList.add("ok"); return; }
    if (q <= 3) { el.innerHTML = `Son <b>${q}</b> adet!`; el.classList.remove("ok"); }
    else { el.innerHTML = `Stokta <b>${q}</b> adet`; el.classList.add("ok"); }
  }

  function bind() {
    $("#thumbs").addEventListener("click", (e) => {
      const b = e.target.closest("[data-i]");
      if (b) { imgIdx = +b.dataset.i; renderGallery(); }
    });
    $(".nav-btn.prev").onclick = () => { imgIdx = (imgIdx - 1 + product.images.length) % product.images.length; renderGallery(); };
    $(".nav-btn.next").onclick = () => { imgIdx = (imgIdx + 1) % product.images.length; renderGallery(); };
    $("#main-img").onmousemove = (e) => {
      const r = $("#main-img").getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      $("#main-photo").style.transformOrigin = `${x}% ${y}%`;
    };
    $("#main-img").onclick = () => $("#main-img").classList.toggle("zoom");

    $("#p-colors").addEventListener("click", (e) => {
      const d = e.target.closest(".color-dot");
      if (!d) return;
      selColor = d.dataset.c;
      $("#p-colors").querySelectorAll(".color-dot").forEach((x) => x.classList.toggle("on", x === d));
      $("#p-color-name").textContent = selColor;
    });

    $("#p-sizes").addEventListener("click", (e) => {
      const b = e.target.closest(".size");
      if (!b || b.disabled) return;
      selSize = b.dataset.s;
      renderSizes();
    });

    $("#open-chart").onclick = () => {
      const d = $("#chart-details");
      d.open = true;
      d.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    $("#q-minus").onclick = () => { qty = Math.max(1, qty - 1); $("#q-val").textContent = qty; };
    $("#q-plus").onclick = () => { qty = Math.min(10, qty + 1); $("#q-val").textContent = qty; };

    $("#add-btn").onclick = () => {
      if ((product.sizes || []).length && !selSize) { toast("Lütfen beden seç", "err"); return; }
      Cart.add({
        id: product.id, slug: product.slug, name: product.name, brand: product.brand,
        image: product.images[0], size: selSize, color: selColor, price: product.price
      }, qty);
      toast("Sepete eklendi ✓");
      document.querySelector(".js-cart-open").click();
    };
  }

  function relatedCard(p) {
    return `<a class="card" href="/product.html?id=${encodeURIComponent(p.slug)}">
      <div class="media"><img src="${p.images[0]}" alt="${p.name}" loading="lazy"></div>
      <div class="info">
        <div class="brand">${p.brand} · ${p.model}</div>
        <div class="name">${p.name}</div>
        <div class="price"><span>${money(p.price)}</span>${p.oldPrice ? `<s>${money(p.oldPrice)}</s>` : ""}</div>
      </div></a>`;
  }

  async function init() {
    const id = qs("id");
    if (!id) { location.href = "/shop.html"; return; }
    try {
      product = await api("/api/products/" + encodeURIComponent(id));
      renderGallery();
      renderInfo();
      bind();
      const { products } = await api("/api/products?category=" + encodeURIComponent(product.category));
      const rel = products.filter((p) => p.id !== product.id).slice(0, 4);
      if (!rel.length) $("#related-section").classList.add("hide");
      $("#related").innerHTML = rel.map(relatedCard).join("");
    } catch (e) {
      $("#pdp").innerHTML = `<div class="empty" style="grid-column:1/-1;width:100%">
        <div class="big">404</div><p>${e.message}</p>
        <a class="btn" href="/shop.html">Koleksiyona Dön</a></div>`;
    }
  }
  init();
})();
