(function () {
  const CART_KEY = "vd_cart";
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => [...(el || document).querySelectorAll(s)];

  const money = (n) => "₺" + Number(n || 0).toLocaleString("tr-TR", { maximumFractionDigits: 0 });
  const qs = (k, d = "") => new URLSearchParams(location.search).get(k) || d;

  async function api(path, opts = {}) {
    const token = localStorage.getItem("vd_token");
    const headers = { ...(opts.headers || {}) };
    if (opts.body && !(opts.body instanceof Blob)) {
      headers["Content-Type"] = "application/json";
      opts = { ...opts, body: JSON.stringify(opts.body) };
    }
    if (token) headers["Authorization"] = "Bearer " + token;
    const res = await fetch(path, { ...opts, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Bir hata oluştu");
    return data;
  }

  function toast(msg, type) {
    let box = $(".toasts");
    if (!box) { box = document.createElement("div"); box.className = "toasts"; document.body.appendChild(box); }
    const t = document.createElement("div");
    t.className = "toast" + (type === "err" ? " err" : "");
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  const Cart = {
    list() {
      try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
    },
    save(items) {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
      document.dispatchEvent(new CustomEvent("cart:change"));
      renderDrawer();
    },
    add(item, qty = 1) {
      const items = Cart.list();
      const found = items.find((i) => i.id === item.id && i.size === item.size && i.color === item.color);
      if (found) found.qty += qty;
      else items.push({ ...item, qty });
      Cart.save(items);
    },
    setQty(idx, qty) {
      const items = Cart.list();
      if (!items[idx]) return;
      if (qty < 1) items.splice(idx, 1);
      else items[idx].qty = qty;
      Cart.save(items);
    },
    remove(idx) {
      const items = Cart.list();
      items.splice(idx, 1);
      Cart.save(items);
    },
    clear() { Cart.save([]); },
    count() { return Cart.list().reduce((s, i) => s + i.qty, 0); },
    subtotal() { return Cart.list().reduce((s, i) => s + i.price * i.qty, 0); }
  };

  const NAV = [
    { href: "/shop.html?category=jean", label: "Jean", key: "jean" },
    { href: "/shop.html?category=ust-giyim", label: "Üst Giyim", key: "ust-giyim" },
    { href: "/shop.html?category=dis-giyim", label: "Dış Giyim", key: "dis-giyim" },
    { href: "/shop.html?category=aksesuar", label: "Aksesuar", key: "aksesuar" },
    { href: "/shop.html", label: "Tümü", key: "shop" }
  ];

  function headerHTML(active) {
    const links = NAV.map((n) => `<a href="${n.href}" class="${active === n.key ? "active" : ""}">${n.label}</a>`).join("");
    const mLinks = NAV.map((n) => `<a href="${n.href}">${n.label}</a>`).join("");
    return `
<div class="announce"><div class="track">
<span>2500 ₺ üzeri ücretsiz kargo</span><span>—</span><span>Yeni sezon vintage denim düştü</span><span>—</span><span>Aynı gün kargo (16:00'ya kadar)</span><span>—</span><span>2500 ₺ üzeri ücretsiz kargo</span><span>—</span><span>Yeni sezon vintage denim düştü</span><span>—</span><span>Aynı gün kargo (16:00'ya kadar)</span><span>—</span>
</div></div>
<header class="header"><div class="container inner">
  <button class="burger" aria-label="Menü"><span></span><span></span><span></span></button>
  <a href="/" class="logo">VEYRA<i>VINTAGE</i></a>
  <nav class="nav">${links}</nav>
  <div class="header-actions">
    <a class="icon-btn" href="/admin.html">Admin</a>
    <button class="icon-btn js-cart-open">Sepet<span class="cart-count">0</span></button>
  </div>
</div></header>
<nav class="mobile-nav">${mLinks}<a href="/admin.html">Admin</a></nav>
<div class="overlay js-overlay"></div>
<aside class="drawer js-drawer">
  <div class="drawer-head"><span>Sepet (<span class="js-drawer-count">0</span>)</span><button class="icon-btn js-cart-close">Kapat ✕</button></div>
  <div class="drawer-body js-drawer-body"></div>
  <div class="drawer-foot">
    <div class="totals">
      <div><span>Ara toplam</span><span class="js-drawer-sub">₺0</span></div>
      <div class="js-drawer-ship"><span>Kargo</span><span>—</span></div>
      <div class="grand"><span>Toplam</span><span class="js-drawer-total">₺0</span></div>
    </div>
    <a href="/checkout.html" class="btn btn-block" style="margin-top:16px">Ödemeye Geç</a>
    <button class="btn btn-ghost btn-block btn-sm js-cart-close" style="margin-top:10px">Alışverişe devam</button>
  </div>
</aside>`;
  }

  function footerHTML() {
    return `
<footer class="footer"><div class="container">
  <div class="cols">
    <div>
      <div class="logo">VEYRA<i>VINTAGE</i></div>
      <p class="about">Vintage denim ve sokak giyimi arşivinden çıkan parçalar. Koyu tema, net kalıp, dürüst kumaş.</p>
    </div>
    <div><h4>Kategoriler</h4>
      <a href="/shop.html?category=jean">Jean</a>
      <a href="/shop.html?category=ust-giyim">Üst Giyim</a>
      <a href="/shop.html?category=dis-giyim">Dış Giyim</a>
      <a href="/shop.html?category=aksesuar">Aksesuar</a>
    </div>
    <div><h4>Yardım</h4>
      <a href="/shop.html">Beden Rehberi</a>
      <a href="/checkout.html">Kargo & Teslimat</a>
      <a href="/checkout.html">İade & Değişim</a>
      <a href="/admin.html">Sipariş Takibi</a>
    </div>
    <div><h4>İletişim</h4>
      <li>destek@VEYRA VINTAGE.com</li>
      <li>+90 (212) 000 00 00</li>
      <li>İstanbul, TR</li>
      <a href="/admin.html">Instagram</a>
    </div>
  </div>
  <div class="word">VEYRA VINTAGE</div>
  <div class="bottom"><span>© 2026 VEYRA VINTAGE — Tüm hakları saklıdır</span><span>Ödemeler Shopier ile güvende</span><span>Görseller: Rawpixel · Flickr · WP Photo Directory (CC0) · Font: Archivo & Space Mono (OFL)</span></div>
</div></footer>`;
  }

  function renderDrawer() {
    const items = Cart.list();
    const body = $(".js-drawer-body");
    if (!body) return;
    $$(".cart-count").forEach((el) => (el.textContent = Cart.count()));
    const c = $(".js-drawer-count"); if (c) c.textContent = Cart.count();

    if (!items.length) {
      body.innerHTML = `<div class="empty" style="border:0;background:none;padding:70px 10px">
        <div class="big" style="font-size:52px">BOŞ</div>
        <p>Sepetinde henüz ürün yok</p></div>`;
    } else {
      body.innerHTML = items.map((i, idx) => `
        <div class="cart-row">
          <img src="${i.image}" alt="${i.name}">
          <div>
            <div class="n">${i.name}</div>
            <div class="m">${i.brand || ""} · ${i.size}${i.color ? " · " + i.color : ""}</div>
            <div class="p">${money(i.price)} × ${i.qty}</div>
            <div class="qty" style="margin-top:9px;width:fit-content">
              <button data-q="-" data-i="${idx}">−</button><span>${i.qty}</span><button data-q="+" data-i="${idx}">+</button>
            </div>
          </div>
          <button class="rm" data-rm="${idx}">Kaldır</button>
        </div>`).join("");
    }
    const sub = Cart.subtotal();
    const shipCfg = window.SHIPPING || { freeOver: 2500, fee: 89 };
    const ship = sub === 0 ? 0 : sub >= shipCfg.freeOver ? 0 : shipCfg.fee;
    $(".js-drawer-sub").textContent = money(sub);
    const shipEl = $(".js-drawer-ship");
    shipEl.innerHTML = `<span>Kargo</span><span class="${ship === 0 && sub > 0 ? "free" : ""}">${sub === 0 ? "—" : ship === 0 ? "Ücretsiz" : money(ship)}</span>`;
    $(".js-drawer-total").textContent = money(sub + ship);

    body.onclick = (e) => {
      const rm = e.target.closest("[data-rm]");
      const q = e.target.closest("[data-q]");
      if (rm) Cart.remove(+rm.dataset.rm);
      if (q) {
        const idx = +q.dataset.i;
        Cart.setQty(idx, Cart.list()[idx].qty + (q.dataset.q === "+" ? 1 : -1));
      }
    };
  }

  function openDrawer(on) {
    $(".js-drawer").classList.toggle("on", on);
    $(".js-overlay").classList.toggle("on", on);
    document.body.classList.toggle("no-scroll", on);
  }

  function initChrome() {
    const active = document.body.dataset.nav || "";
    const h = document.createElement("div");
    h.innerHTML = headerHTML(active);
    while (h.firstChild) document.body.insertBefore(h.firstChild, document.body.firstChild);

    const f = document.createElement("div");
    f.innerHTML = footerHTML();
    document.body.appendChild(f.firstChild);

    document.addEventListener("click", (e) => {
      if (e.target.closest(".js-cart-open")) openDrawer(true);
      if (e.target.closest(".js-cart-close") || e.target.closest(".js-overlay")) openDrawer(false);
      if (e.target.closest(".burger")) $(".mobile-nav").classList.toggle("on");
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") openDrawer(false); });
    document.addEventListener("cart:change", renderDrawer);
    renderDrawer();
  }

  window.VD = { api, money, qs, toast, Cart, $, $$ };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initChrome);
  else initChrome();
})();
