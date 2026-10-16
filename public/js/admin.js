(function () {
  const { api, $, $$, money, toast } = window.VD;

  const STATUS_LABEL = { yeni: "Yeni", hazirlaniyor: "Hazırlanıyor", kargoda: "Kargoda", teslim_edildi: "Teslim Edildi", iptal: "İptal" };
  let settings = null;
  let allOrders = [];
  let editingId = null;
  let editImages = [];

  /* ---------- auth ---------- */
  function showLogin() {
    $("#login-view").classList.remove("hide");
    $("#panel").classList.add("hide");
  }
  function showPanel() {
    $("#login-view").classList.add("hide");
    $("#panel").classList.remove("hide");
  }

  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const data = await api("/api/admin/login", { method: "POST", body: { password: e.target.password.value } });
      localStorage.setItem("vd_token", data.token);
      boot();
    } catch (err) {
      $("#login-err").style.display = "block";
      toast(err.message, "err");
    }
  });

  $("#logout").onclick = () => {
    localStorage.removeItem("vd_token");
    showLogin();
  };

  /* ---------- tabs ---------- */
  $$(".admin-tabs button").forEach((b) => {
    b.onclick = () => {
      $$(".admin-tabs button").forEach((x) => x.classList.toggle("on", x === b));
      ["orders", "products", "settings"].forEach((t) => $("#tab-" + t).classList.toggle("hide", t !== b.dataset.tab));
    };
  });

  /* ---------- stats ---------- */
  function renderStats() {
    const revenue = allOrders.filter((o) => o.status !== "iptal").reduce((s, o) => s + (o.totals?.total || 0), 0);
    const fresh = allOrders.filter((o) => o.status === "yeni").length;
    const waiting = allOrders.filter((o) => o.status === "hazirlaniyor" || o.status === "kargoda").length;
    $("#stats").innerHTML = `
      <div class="stat"><div class="k">Toplam Sipariş</div><div class="v">${allOrders.length}</div></div>
      <div class="stat"><div class="k">Yeni Sipariş</div><div class="v">${fresh}</div></div>
      <div class="stat"><div class="k">Kargo Bekleyen</div><div class="v">${waiting}</div></div>
      <div class="stat"><div class="k">Ciro</div><div class="v">${money(revenue)}</div></div>`;
  }

  /* ---------- orders ---------- */
  function statusOptions(cur) {
    const list = (settings && settings.orderStatuses) || ["yeni", "hazirlaniyor", "kargoda", "teslim_edildi", "iptal"];
    return list.map((s) => `<option value="${s}" ${s === cur ? "selected" : ""}>${STATUS_LABEL[s] || s}</option>`).join("");
  }

  function renderOrders() {
    const filter = $("#order-filter").value;
    const list = filter ? allOrders.filter((o) => o.status === filter) : allOrders;
    $("#orders-count").textContent = `${list.length} sipariş`;
    $("#orders-empty").classList.toggle("hide", list.length > 0);
    $("#orders-table").parentElement.classList.toggle("hide", list.length === 0);

    const companies = (settings.shipping && settings.shipping.companies) || [];
    $("#orders-table tbody").innerHTML = list.map((o) => {
      const d = new Date(o.createdAt);
      const items = (o.items || []).map((i) => `${i.name} · ${i.size || ""} × ${i.qty}`).join("<br>");
      return `<tr data-id="${o.id}">
        <td><b class="mono">${o.id}</b><div class="sub">${d.toLocaleDateString("tr-TR")} ${d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</div></td>
        <td class="sub"><b>${o.customer.name}</b><br>${o.customer.phone}<br>${o.customer.address}<br>${o.customer.district} / ${o.customer.city}${o.customer.note ? "<br>📝 " + o.customer.note : ""}</td>
        <td class="sub">${items}</td>
        <td class="sub"><b>${money(o.totals.total)}</b><br>kargo: ${o.totals.shipping ? money(o.totals.shipping) : "ücretsiz"}</td>
        <td class="sub">Shopier<br>${o.payment && o.payment.status ? o.payment.status : "bekliyor"}</td>
        <td>
          <select class="mini-select js-ship">
            <option value="">— seç —</option>
            ${companies.map((c) => `<option ${o.cargo && o.cargo.company === c ? "selected" : ""}>${c}</option>`).join("")}
          </select>
          <input class="mini-input js-track" style="margin-top:8px" placeholder="Takip no" value="${(o.cargo && o.cargo.tracking) || ""}">
          <button class="btn btn-ghost btn-sm js-save-cargo" style="margin-top:8px">Kaydet</button>
          ${o.cargo && o.cargo.tracking ? `<div class="sub" style="margin-top:6px">📦 ${o.cargo.company} · ${o.cargo.tracking}</div>` : ""}
        </td>
        <td>
          <select class="mini-select js-status">${statusOptions(o.status)}</select>
        </td>
      </tr>`;
    }).join("");
  }

  $("#order-filter").onchange = renderOrders;

  $("#orders-table").addEventListener("change", async (e) => {
    if (!e.target.classList.contains("js-status")) return;
    const id = e.target.closest("tr").dataset.id;
    try {
      await api("/api/admin/orders/" + encodeURIComponent(id), { method: "PATCH", body: { status: e.target.value } });
      toast("Durum güncellendi");
      await loadOrders();
    } catch (err) { toast(err.message, "err"); }
  });

  $("#orders-table").addEventListener("click", async (e) => {
    const btn = e.target.closest(".js-save-cargo");
    if (!btn) return;
    const tr = btn.closest("tr");
    try {
      await api("/api/admin/orders/" + encodeURIComponent(tr.dataset.id), {
        method: "PATCH",
        body: { cargo: { company: tr.querySelector(".js-ship").value, tracking: tr.querySelector(".js-track").value.trim() } }
      });
      toast("Kargo bilgisi kaydedildi");
      await loadOrders();
    } catch (err) { toast(err.message, "err"); }
  });

  async function loadOrders() {
    const data = await api("/api/admin/orders");
    allOrders = data.orders;
    renderStats();
    renderOrders();
  }

  /* ---------- products ---------- */
  function renderProducts(list) {
    $("#products-count").textContent = `${list.length} ürün`;
    $("#products-empty").classList.toggle("hide", list.length > 0);
    $("#products-table").parentElement.classList.toggle("hide", list.length === 0);
    $("#products-table tbody").innerHTML = list.map((p) => {
      const stockSum = Object.values(p.stock || {}).reduce((s, n) => s + (Number(n) || 0), 0);
      return `<tr data-id="${p.id}">
        <td><img src="${p.images[0]}" style="width:52px;height:65px;object-fit:cover;border:1px solid var(--line)"></td>
        <td class="sub"><b>${p.name}</b><br>${p.brand} · ${p.model}<br><span style="opacity:.6">${p.id}${p.featured ? " · öne çıkan" : ""}${p.isNew ? " · yeni" : ""}</span></td>
        <td class="sub"><b>${money(p.price)}</b>${p.oldPrice ? `<br><s>${money(p.oldPrice)}</s>` : ""}</td>
        <td class="sub">${(p.sizes || []).join("<br>") || "—"}</td>
        <td class="sub">${Object.keys(p.stock || {}).length ? stockSum : "∞"}</td>
        <td><div class="row-actions">
          <button class="btn btn-ghost btn-sm js-edit">Düzenle</button>
          <button class="btn btn-danger btn-sm js-del">Sil</button>
        </div></td>
      </tr>`;
    }).join("");
  }

  async function loadProducts() {
    const data = await api("/api/admin/products");
    renderProducts(data.products);
  }

  $("#products-table").addEventListener("click", async (e) => {
    const tr = e.target.closest("tr");
    if (!tr) return;
    const id = tr.dataset.id;
    if (e.target.closest(".js-del")) {
      if (!confirm("Ürün silinsin mi?")) return;
      try { await api("/api/admin/products/" + encodeURIComponent(id), { method: "DELETE" }); toast("Ürün silindi"); await loadProducts(); }
      catch (err) { toast(err.message, "err"); }
    }
    if (e.target.closest(".js-edit")) {
      const data = await api("/api/admin/products");
      const p = data.products.find((x) => x.id === id);
      if (p) openModal(p);
    }
  });

  /* ---------- product modal ---------- */
  function renderImageList() {
    $("#img-list").innerHTML = editImages.map((src, i) =>
      `<div class="it"><img src="${src}"><button type="button" data-i="${i}">✕</button></div>`).join("");
  }

  function openModal(p) {
    editingId = p ? p.id : null;
    const f = $("#product-form");
    f.reset();
    $("#modal-title").textContent = p ? "Ürünü Düzenle" : "Yeni Ürün";
    editImages = p ? [...(p.images || [])] : [];
    if (p) {
      f.name.value = p.name || "";
      f.id.value = p.id || "";
      f.brand.value = p.brand || "";
      f.model.value = p.model || "";
      f.category.value = p.category || "jean";
      f.price.value = p.price || "";
      f.oldPrice.value = p.oldPrice || "";
      f.fit.value = p.fit || "";
      f.sizes.value = (p.sizes || []).map((s) => (p.stock && p.stock[s] !== undefined ? `${s}=${p.stock[s]}` : s)).join("\n");
      f.colors.value = (p.colors || []).map((c) => `${c.name}|${c.hex}`).join("\n");
      f.description.value = p.description || "";
      f.features.value = (p.features || []).join("\n");
      f.garment.value = p.garment || "";
      f.featured.checked = !!p.featured;
      f.isNew.checked = !!p.isNew;
      if (p.sizeChart && p.sizeChart.rows) {
        f.chartColumns.value = (p.sizeChart.columns || []).join(", ");
        f.chartUnit.value = p.sizeChart.unit || "cm";
        f.chartNote.value = p.sizeChart.note || "";
        f.chartRows.value = p.sizeChart.rows.map((r) => r.join(" | ")).join("\n");
      }
      $("#form-hint").textContent = `ID: ${p.id}`;
    } else {
      $("#form-hint").textContent = "Yeni ürün kaydedilecek";
    }
    renderImageList();
    $("#product-modal").classList.add("on");
    document.body.classList.add("no-scroll");
  }

  function closeModal() {
    $("#product-modal").classList.remove("on");
    document.body.classList.remove("no-scroll");
  }
  $("#modal-close").onclick = closeModal;
  $("#modal-cancel").onclick = closeModal;
  $("#add-product").onclick = () => openModal(null);
  $("#product-modal").addEventListener("click", (e) => { if (e.target.id === "product-modal") closeModal(); });

  $("#add-url").onclick = () => {
    const f = $("#product-form");
    const url = f.imageUrl.value.trim();
    if (!url) return;
    editImages.push(url);
    f.imageUrl.value = "";
    renderImageList();
  };

  $("#img-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-i]");
    if (!b) return;
    editImages.splice(+b.dataset.i, 1);
    renderImageList();
  });

  $("#img-upload").addEventListener("change", async (e) => {
    for (const file of e.target.files) {
      try {
        const data = await api("/api/admin/upload", { method: "POST", body: file, headers: { "Content-Type": file.type } });
        editImages.push(data.url);
      } catch (err) { toast(err.message, "err"); }
    }
    e.target.value = "";
    renderImageList();
  });

  function parseProductForm() {
    const f = $("#product-form");
    const sizes = [];
    const stock = {};
    f.sizes.value.split("\n").map((l) => l.trim()).filter(Boolean).forEach((line) => {
      const [s, q] = line.split("=");
      const size = s.trim();
      sizes.push(size);
      if (q !== undefined && q.trim() !== "") stock[size] = Number(q) || 0;
    });
    const colors = f.colors.value.split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
      const [name, hex] = line.split("|");
      return { name: name.trim(), hex: (hex || "#222222").trim() };
    });
    const chartColumns = f.chartColumns.value.split(",").map((s) => s.trim()).filter(Boolean);
    const chartRows = f.chartRows.value.split("\n").map((l) => l.trim()).filter(Boolean)
      .map((line) => line.split("|").map((s) => s.trim()));
    const body = {
      id: f.id.value.trim() || undefined,
      name: f.name.value.trim(),
      brand: f.brand.value.trim(),
      model: f.model.value.trim(),
      category: f.category.value,
      price: Number(f.price.value),
      oldPrice: f.oldPrice.value ? Number(f.oldPrice.value) : null,
      fit: f.fit.value.trim(),
      sizes, stock, colors,
      description: f.description.value.trim(),
      features: f.features.value.split("\n").map((l) => l.trim()).filter(Boolean),
      garment: f.garment.value,
      featured: f.featured.checked,
      isNew: f.isNew.checked,
      images: editImages,
      sizeChart: chartColumns.length && chartRows.length
        ? { columns: chartColumns, rows: chartRows, unit: f.chartUnit.value.trim() || "cm", note: f.chartNote.value.trim() }
        : null
    };
    return body;
  }

  $("#product-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = parseProductForm();
    if (!body.name || !body.price) { toast("Ürün adı ve fiyat zorunlu", "err"); return; }
    try {
      if (editingId) {
        await api("/api/admin/products/" + encodeURIComponent(editingId), { method: "PUT", body });
        toast("Ürün güncellendi");
      } else {
        await api("/api/admin/products", { method: "POST", body });
        toast("Ürün eklendi ✓");
      }
      closeModal();
      await loadProducts();
    } catch (err) { toast(err.message, "err"); }
  });

  /* ---------- settings ---------- */
  function fillSettings() {
    const s = settings;
    $("#s-enabled").value = String(!!(s.shopier && s.shopier.enabled));
    $("#s-product-id").value = (s.shopier && s.shopier.productId) || "";
    $("#s-affiliate").value = (s.shopier && s.shopier.affiliateUsername) || "";
    $("#s-return").value = (s.shopier && s.shopier.returnUrl) || "";
    $("#s-freeover").value = (s.shipping && s.shipping.freeOver) || 0;
    $("#s-fee").value = (s.shipping && s.shipping.fee) || 0;
    $("#s-companies").value = ((s.shipping && s.shipping.companies) || []).join(", ");
    $("#s-password").value = (s.admin && s.admin.password) || "";
  }

  $("#save-shopier").onclick = async () => {
    try {
      const data = await api("/api/admin/settings", {
        method: "PUT",
        body: {
          shopier: {
            enabled: $("#s-enabled").value === "true",
            mode: "link",
            productId: $("#s-product-id").value.trim(),
            affiliateUsername: $("#s-affiliate").value.trim(),
            returnUrl: $("#s-return").value.trim()
          }
        }
      });
      settings = data.settings;
      toast("Shopier ayarları kaydedildi");
    } catch (err) { toast(err.message, "err"); }
  };

  $("#save-shipping").onclick = async () => {
    try {
      const data = await api("/api/admin/settings", {
        method: "PUT",
        body: {
          shipping: {
            freeOver: Number($("#s-freeover").value) || 0,
            fee: Number($("#s-fee").value) || 0,
            companies: $("#s-companies").value.split(",").map((s) => s.trim()).filter(Boolean)
          },
          admin: { password: $("#s-password").value || "denim2026" }
        }
      });
      settings = data.settings;
      toast("Ayarlar kaydedildi");
    } catch (err) { toast(err.message, "err"); }
  };

  /* ---------- boot ---------- */
  async function boot() {
    try {
      await api("/api/admin/orders");
    } catch (err) {
      if (/Yetkisiz|401/.test(err.message)) return showLogin();
      return showLogin();
    }
    showPanel();
    try {
      const s = await api("/api/admin/settings");
      settings = s.settings;
      fillSettings();
    } catch {}
    await loadOrders();
    await loadProducts();
  }

  boot();
})();
