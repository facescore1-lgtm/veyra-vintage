const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");
const imageGen = require("./tools/gen-images");

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const DATA = path.join(ROOT, "data");
const UPLOADS = path.join(PUBLIC, "img", "uploads");
const PORT = process.env.PORT || 3000;

if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });

const readJSON = (file, fallback) => {
  try { return JSON.parse(fs.readFileSync(path.join(DATA, file), "utf8")); }
  catch { return fallback; }
};
const writeJSON = (file, data) => {
  fs.writeFileSync(path.join(DATA, file), JSON.stringify(data, null, 2), "utf8");
};

const DEFAULT_SETTINGS = {
  shop: { brand: "VEYRA VINTAGE", tagline: "Vintage Denim & Streetwear", currency: "₺" },
  shopier: { enabled: false, mode: "link", productId: "", affiliateUsername: "", returnUrl: "" },
  shipping: { freeOver: 2500, fee: 89, companies: ["Yurtiçi Kargo", "Aras Kargo", "MNG Kargo", "PTT Kargo"] },
  orderStatuses: ["yeni", "hazirlaniyor", "kargoda", "teslim_edildi", "iptal"],
  admin: {}
};

let products = readJSON("products.json", []);
let orders = readJSON("orders.json", []);
let settings = { ...DEFAULT_SETTINGS, ...readJSON("settings.json", {}) };

function adminPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  if (settings.admin && settings.admin.password) return settings.admin.password;
  const generated = crypto.randomBytes(6).toString("hex");
  settings.admin = { ...settings.admin, password: generated };
  writeJSON("settings.json", settings);
  return generated;
}

const sessions = new Map();

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".gif": "image/gif", ".ico": "image/x-icon", ".woff2": "font/woff2"
};

function send(res, status, body, headers = {}) {
  const data = typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...headers });
  res.end(data);
}

function readBody(req, limit = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) { reject(new Error("body_too_large")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function readJSONBody(req) {
  const buf = await readBody(req);
  try { return buf.length ? JSON.parse(buf.toString("utf8")) : {}; }
  catch { throw new Error("invalid_json"); }
}

function isAdmin(req) {
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  const s = sessions.get(token);
  if (!s) return false;
  if (s.expires < Date.now()) { sessions.delete(token); return false; }
  return true;
}

function shopierPaymentUrl(order) {
  const cfg = settings.shopier || {};
  if (!cfg.enabled || cfg.mode !== "link" || !cfg.productId || cfg.productId === "0000000") return null;
  return `https://www.shopier.com/ShowProductNew/products.php?id=${encodeURIComponent(cfg.productId)}&affiliate_username=${encodeURIComponent(cfg.affiliateUsername || "")}`;
}

function publicOrder(order) {
  const { id, createdAt, status, items, totals, customer, payment } = order;
  return { id, createdAt, status, items, totals, customer: { name: customer.name }, payment };
}

function nextId(prefix) {
  return `${prefix}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function filterProducts(query) {
  let list = [...products];
  const cat = query.get("category");
  if (cat && cat !== "all") list = list.filter((p) => p.category === cat);
  const q = (query.get("q") || "").trim().toLocaleLowerCase("tr");
  if (q) list = list.filter((p) => `${p.name} ${p.brand} ${p.model}`.toLocaleLowerCase("tr").includes(q));
  const brands = (query.get("brands") || "").split(",").filter(Boolean);
  if (brands.length) list = list.filter((p) => brands.includes(p.brand));
  const models = (query.get("models") || "").split(",").filter(Boolean);
  if (models.length) list = list.filter((p) => models.includes(p.model));
  const sizes = (query.get("sizes") || "").split(",").filter(Boolean);
  if (sizes.length) list = list.filter((p) => (p.sizes || []).some((s) => sizes.includes(s)));
  const sort = query.get("sort") || "featured";
  const price = (p) => p.price || 0;
  if (sort === "price_asc") list.sort((a, b) => price(a) - price(b));
  else if (sort === "price_desc") list.sort((a, b) => price(b) - price(a));
  else if (sort === "new") list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
  else list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  return list;
}

function productImages(p) {
  if (Array.isArray(p.images) && p.images.length) return p.images;
  if (p.garment) return [1, 2, 3, 4].map((n) => `/img/gen/${p.id}-${n}.svg`);
  return ["/img/gen/placeholder.svg"];
}

function serializeProduct(p) {
  return { ...p, images: productImages(p) };
}

function validateStock(items) {
  for (const it of items) {
    const p = products.find((x) => x.id === it.id || x.slug === it.id);
    if (!p) return `Ürün bulunamadı: ${it.id}`;
    const qty = Number(it.qty) || 0;
    if (qty < 1) return "Geçersiz adet";
    const stock = (p.stock || {})[it.size];
    if (typeof stock === "number" && stock < qty) return `${p.name} — ${it.size} bedeni stokta yok`;
  }
  return null;
}

function calcTotals(items) {
  let subtotal = 0;
  const lines = items.map((it) => {
    const p = products.find((x) => x.id === it.id || x.slug === it.id);
    const qty = Number(it.qty) || 1;
    const price = p.price || 0;
    subtotal += price * qty;
    return {
      id: p.id, slug: p.slug, name: p.name, brand: p.brand,
      size: it.size, color: it.color || "", qty, price, image: productImages(p)[0]
    };
  });
  const shipCfg = settings.shipping || {};
  const shipping = subtotal >= (shipCfg.freeOver || Infinity) ? 0 : (shipCfg.fee || 0);
  return { lines, subtotal, shipping, total: subtotal + shipping };
}

function decrementStock(items) {
  for (const it of items) {
    const p = products.find((x) => x.id === it.id);
    if (p && p.stock && typeof p.stock[it.size] === "number") p.stock[it.size] = Math.max(0, p.stock[it.size] - (it.qty || 1));
  }
  writeJSON("products.json", products);
}

function restoreStock(items) {
  for (const it of items) {
    const p = products.find((x) => x.id === it.id);
    if (p && p.stock && typeof p.stock[it.size] === "number") p.stock[it.size] += (it.qty || 1);
  }
  writeJSON("products.json", products);
}

function normalizeProduct(input, existing) {
  const base = existing || {};
  const p = { ...base, ...input };
  p.id = (input.id || base.id || nextId("VD")).trim();
  p.slug = (input.slug || base.slug || p.name).toLowerCase()
    .replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  p.name = String(input.name || base.name || "").trim();
  p.brand = String(input.brand || base.brand || "VEYRA VINTAGE Original").trim();
  p.model = String(input.model || base.model || "").trim();
  p.category = String(input.category || base.category || "jean");
  p.price = Number(input.price) || 0;
  p.oldPrice = input.oldPrice ? Number(input.oldPrice) : null;
  p.sizes = Array.isArray(input.sizes) ? input.sizes.map(String) : (base.sizes || []);
  p.stock = input.stock && typeof input.stock === "object" ? input.stock : (base.stock || {});
  p.colors = Array.isArray(input.colors) ? input.colors : (base.colors || []);
  p.images = Array.isArray(input.images) ? input.images : (base.images || []);
  p.description = String(input.description || base.description || "");
  p.features = Array.isArray(input.features) ? input.features : [];
  p.sizeChart = input.sizeChart && Array.isArray(input.sizeChart.rows) ? input.sizeChart : (base.sizeChart || null);
  p.fit = String(input.fit || base.fit || "");
  p.featured = !!input.featured;
  p.isNew = !!input.isNew;
  p.updatedAt = new Date().toISOString();
  return p;
}

async function handleApi(req, res, parsed) {
  const method = req.method;
  const pathName = parsed.pathname;
  const q = parsed.searchParams;

  if (method === "GET" && pathName === "/api/health") return send(res, 200, { ok: true });

  if (method === "GET" && pathName === "/api/meta") {
    const brands = [...new Set(products.map((p) => p.brand).filter(Boolean))].sort();
    const models = [...new Set(products.map((p) => p.model).filter(Boolean))].sort();
    const sizes = [...new Set(products.flatMap((p) => p.sizes || []))];
    return send(res, 200, {
      categories: ["jean", "ust-giyim", "dis-giyim", "aksesuar"],
      brands, models, sizes,
      shop: settings.shop,
      shipping: settings.shipping,
      shopierEnabled: !!(settings.shopier && settings.shopier.enabled),
      counts: products.length
    });
  }

  if (method === "GET" && pathName === "/api/products") {
    const list = filterProducts(q).map(serializeProduct);
    return send(res, 200, { total: list.length, products: list });
  }

  if (method === "GET" && pathName.startsWith("/api/products/")) {
    const key = decodeURIComponent(pathName.slice("/api/products/".length));
    const p = products.find((x) => x.id === key || x.slug === key);
    if (!p) return send(res, 404, { error: "Ürün bulunamadı" });
    return send(res, 200, serializeProduct(p));
  }

  if (method === "POST" && pathName === "/api/orders") {
    const body = await readJSONBody(req);
    const c = body.customer || {};
    if (!c.name || !c.phone || !c.address || !c.city || !c.district)
      return send(res, 400, { error: "Lütfen tüm teslimat bilgilerini doldurun" });
    if (!/^[0-9 ()+-]{10,}$/.test(String(c.phone).trim()))
      return send(res, 400, { error: "Geçerli bir telefon numarası girin" });
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) return send(res, 400, { error: "Sepet boş" });
    const stockErr = validateStock(items);
    if (stockErr) return send(res, 400, { error: stockErr });
    const totals = calcTotals(items);
    const order = {
      id: nextId("SIP"),
      createdAt: new Date().toISOString(),
      status: "yeni",
      customer: {
        name: String(c.name).slice(0, 120),
        phone: String(c.phone).slice(0, 30),
        address: String(c.address).slice(0, 400),
        city: String(c.city).slice(0, 60),
        district: String(c.district).slice(0, 60),
        note: String(c.note || "").slice(0, 400)
      },
      items: totals.lines,
      totals: { subtotal: totals.subtotal, shipping: totals.shipping, total: totals.total },
      payment: { method: "shopier", status: "bekliyor", url: shopierPaymentUrl(null) },
      cargo: { company: "", tracking: "" }
    };
    orders.unshift(order);
    writeJSON("orders.json", orders);
    decrementStock(items);
    return send(res, 201, { order: publicOrder(order), paymentUrl: order.payment.url });
  }

  if (method === "GET" && pathName.startsWith("/api/orders/")) {
    const id = decodeURIComponent(pathName.slice("/api/orders/".length));
    const order = orders.find((o) => o.id === id);
    if (!order) return send(res, 404, { error: "Sipariş bulunamadı" });
    return send(res, 200, publicOrder(order));
  }

  if (method === "POST" && pathName === "/api/admin/login") {
    const body = await readJSONBody(req);
    const pass = adminPassword();
    if (String(body.password || "") !== pass) return send(res, 401, { error: "Hatalı şifre" });
    const token = crypto.randomBytes(24).toString("hex");
    sessions.set(token, { expires: Date.now() + 12 * 60 * 60 * 1000 });
    return send(res, 200, { token });
  }

  const admin = pathName.startsWith("/api/admin");
  if (admin && !isAdmin(req)) return send(res, 401, { error: "Yetkisiz" });

  if (method === "GET" && pathName === "/api/admin/orders") {
    return send(res, 200, { orders });
  }

  if (method === "PATCH" && pathName.startsWith("/api/admin/orders/")) {
    const id = decodeURIComponent(pathName.slice("/api/admin/orders/".length));
    const order = orders.find((o) => o.id === id);
    if (!order) return send(res, 404, { error: "Sipariş bulunamadı" });
    const body = await readJSONBody(req);
    const prev = order.status;
    if (body.status && (settings.orderStatuses || []).includes(body.status)) {
      order.status = body.status;
      if (body.status === "iptal" && prev !== "iptal") restoreStock(order.items);
      if (prev === "iptal" && body.status !== "iptal") decrementStock(order.items);
    }
    if (body.paymentStatus) order.payment.status = String(body.paymentStatus);
    if (body.cargo) order.cargo = { ...order.cargo, ...body.cargo };
    order.updatedAt = new Date().toISOString();
    writeJSON("orders.json", orders);
    return send(res, 200, { order });
  }

  if (method === "GET" && pathName === "/api/admin/products") {
    return send(res, 200, { products: products.map(serializeProduct) });
  }

  if (method === "POST" && pathName === "/api/admin/products") {
    const body = await readJSONBody(req);
    const p = normalizeProduct(body, null);
    if (!p.name) return send(res, 400, { error: "Ürün adı zorunlu" });
    if (products.some((x) => x.id === p.id)) return send(res, 400, { error: "Bu ID zaten kullanımda" });
    products.push(p);
    writeJSON("products.json", products);
    try { imageGen.generateFor(p); } catch {}
    return send(res, 201, { product: serializeProduct(p) });
  }

  if (method === "PUT" && pathName.startsWith("/api/admin/products/")) {
    const id = decodeURIComponent(pathName.slice("/api/admin/products/".length));
    const idx = products.findIndex((x) => x.id === id || x.slug === id);
    if (idx === -1) return send(res, 404, { error: "Ürün bulunamadı" });
    const body = await readJSONBody(req);
    const p = normalizeProduct(body, products[idx]);
    products[idx] = p;
    writeJSON("products.json", products);
    try { imageGen.generateFor(p); } catch {}
    return send(res, 200, { product: serializeProduct(p) });
  }

  if (method === "DELETE" && pathName.startsWith("/api/admin/products/")) {
    const id = decodeURIComponent(pathName.slice("/api/admin/products/".length));
    const idx = products.findIndex((x) => x.id === id || x.slug === id);
    if (idx === -1) return send(res, 404, { error: "Ürün bulunamadı" });
    products.splice(idx, 1);
    writeJSON("products.json", products);
    return send(res, 200, { ok: true });
  }

  if (method === "POST" && pathName === "/api/admin/upload") {
    const buf = await readBody(req, 6 * 1024 * 1024);
    const type = (req.headers["content-type"] || "").split(";")[0];
    const ext = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg" }[type];
    if (!ext) return send(res, 400, { error: "Desteklenmeyen dosya türü (png/jpg/webp/svg)" });
    if (!buf.length) return send(res, 400, { error: "Dosya boş" });
    const name = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}.${ext}`;
    fs.writeFileSync(path.join(UPLOADS, name), buf);
    return send(res, 201, { url: `/img/uploads/${name}` });
  }

  if (method === "GET" && pathName === "/api/admin/settings") {
    return send(res, 200, { settings });
  }

  if (method === "PUT" && pathName === "/api/admin/settings") {
    const body = await readJSONBody(req);
    const prevAdmin = settings.admin || {};
    settings = { ...settings, ...body };
    const incomingAdmin = body.admin || {};
    if (!incomingAdmin.password && prevAdmin.password) settings.admin = { ...prevAdmin, ...incomingAdmin, password: prevAdmin.password };
    writeJSON("settings.json", settings);
    return send(res, 200, { settings });
  }

  return send(res, 404, { error: "Bulunamadı" });
}

function serveStatic(req, res, parsed) {
  let filePath = path.join(PUBLIC, decodeURIComponent(parsed.pathname));
  if (parsed.pathname === "/") filePath = path.join(PUBLIC, "index.html");
  if (!filePath.startsWith(PUBLIC)) return send(res, 403, { error: "Yasak" });
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    const pretty = path.join(PUBLIC, decodeURIComponent(parsed.pathname).replace(/\/$/, "") + ".html");
    if (fs.existsSync(pretty)) filePath = pretty;
    else return send(res, 404, "Sayfa bulunamadı", { "Content-Type": "text/plain; charset=utf-8" });
  }
  const ext = path.extname(filePath).toLowerCase();
  const headers = { "Content-Type": MIME[ext] || "application/octet-stream" };
  if (ext !== ".html") headers["Cache-Control"] = "public, max-age=300";
  res.writeHead(200, headers);
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const parsed = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (parsed.pathname.startsWith("/api/")) {
      if (req.method === "OPTIONS") {
        return send(res, 204, "", { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" });
      }
      return await handleApi(req, res, parsed);
    }
    if (req.method !== "GET") return send(res, 405, { error: "Metod izinli değil" });
    return serveStatic(req, res, parsed);
  } catch (err) {
    const msg = err && err.message === "invalid_json" ? "Geçersiz JSON" :
      err && err.message === "body_too_large" ? "Dosya çok büyük" : "Sunucu hatası";
    return send(res, 500, { error: msg });
  }
});

server.listen(PORT, () => {
  try { imageGen.generateAll(products); } catch (e) { console.error("Görsel üretim hatası:", e.message); }
  const pw = process.env.ADMIN_PASSWORD ? "[ADMIN_PASSWORD env değişkeni]" : adminPassword();
  console.log(`VEYRA VINTAGE      → http://localhost:${PORT}`);
  console.log(`Admin paneli       → http://localhost:${PORT}/admin.html`);
  console.log(`Admin şifresi      → ${pw}`);
});
