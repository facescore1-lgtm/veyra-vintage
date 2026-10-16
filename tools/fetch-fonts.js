const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const FONT_DIR = path.join(ROOT, "public", "fonts");
const OUT_CSS = path.join(ROOT, "public", "css", "fonts.css");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const API = "https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;700;900&family=Space+Mono:wght@400;700&display=swap";

if (!fs.existsSync(FONT_DIR)) fs.mkdirSync(FONT_DIR, { recursive: true });

async function main() {
  const res = await fetch(API, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error("Google Fonts CSS alınamadı: " + res.status);
  let css = await res.text();
  const urls = [...new Set([...css.matchAll(/https:\/\/fonts\.gstatic\.com\/[^)]+/g)].map((m) => m[0]))];
  let i = 0;
  for (const url of urls) {
    const name = "f" + (++i) + "-" + url.split("/").pop();
    const buf = Buffer.from(await (await fetch(url, { headers: { "User-Agent": UA } })).arrayBuffer());
    fs.writeFileSync(path.join(FONT_DIR, name), buf);
    css = css.split(url).join("/fonts/" + name);
  }
  const header = "/* Ücretsiz fontlar: Archivo + Space Mono — SIL Open Font License 1.1 (Google Fonts) */\n";
  fs.writeFileSync(OUT_CSS, header + css, "utf8");
  console.log(`${urls.length} font dosyası indirildi → public/fonts (css: public/css/fonts.css)`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
