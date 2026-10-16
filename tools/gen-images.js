const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "public", "img", "gen");
const products = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "products.json"), "utf8"));

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const W = 640, H = 800;

function wrap(inner, pal, defs = "") {
  const p = pal || { main: "#2e4370", dark: "#1b2a4a", light: "#48628f", stitch: "#e0913c" };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#17181d"/><stop offset="1" stop-color="#08080a"/>
</linearGradient>
<radialGradient id="spot" cx="0.5" cy="0.28" r="0.75">
<stop offset="0" stop-color="#ffffff" stop-opacity="0.10"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
</radialGradient>
<linearGradient id="fab" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${p.light}"/><stop offset="0.5" stop-color="${p.main}"/><stop offset="1" stop-color="${p.dark}"/>
</linearGradient>
<linearGradient id="fabFlat" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="${p.main}"/><stop offset="1" stop-color="${p.dark}"/>
</linearGradient>
<filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3"/><feColorMatrix type="saturate" values="0"/></filter>
<filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter>
${defs}
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<rect width="${W}" height="${H}" fill="url(#spot)"/>
${inner}
<rect width="${W}" height="${H}" filter="url(#noise)" opacity="0.05"/>
</svg>`;
}

function stitch(d, color, w = 2.4, dash = "9 7") {
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-dasharray="${dash}" stroke-linecap="round"/>`;
}

const JEANS_BODY = "M196,176 L190,300 Q174,530 150,742 L256,742 Q296,540 318,352 L322,352 Q344,540 384,742 L490,742 Q466,530 450,300 Q446,250 444,176 Z";

function weave(id, color) {
  return `<pattern id="${id}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
<line x1="0" y1="0" x2="0" y2="8" stroke="${color}" stroke-width="2.6" opacity="0.30"/>
<line x1="4" y1="0" x2="4" y2="8" stroke="#000" stroke-width="1.4" opacity="0.18"/>
</pattern>`;
}

function jeansFront(p) {
  const { main, dark, light, stitch: st } = p;
  const inner = `
<ellipse cx="320" cy="762" rx="185" ry="20" fill="#000" opacity="0.5" filter="url(#soft)"/>
<g>
<path d="${JEANS_BODY}" fill="url(#fabFlat)"/>
<path d="${JEANS_BODY}" fill="url(#weaveJ)" opacity="0.5"/>
<clipPath id="clipBody"><path d="${JEANS_BODY}"/></clipPath>
<g clip-path="url(#clipBody)">
<rect x="195" y="140" width="250" height="40" fill="${dark}"/>
<path d="M206,330 Q260,352 306,336" stroke="${light}" stroke-width="7" fill="none" opacity="0.35" stroke-linecap="round"/>
<path d="M334,336 Q382,352 434,330" stroke="${light}" stroke-width="7" fill="none" opacity="0.35" stroke-linecap="round"/>
<path d="M212,470 Q258,486 300,474" stroke="${light}" stroke-width="5" fill="none" opacity="0.22" stroke-linecap="round"/>
<path d="M340,474 Q384,486 428,470" stroke="${light}" stroke-width="5" fill="none" opacity="0.22" stroke-linecap="round"/>
<path d="M170,640 Q206,652 244,644" stroke="${light}" stroke-width="4" fill="none" opacity="0.16" stroke-linecap="round"/>
<path d="M396,644 Q436,652 470,640" stroke="${light}" stroke-width="4" fill="none" opacity="0.16" stroke-linecap="round"/>
<path d="M196,176 Q188,250 190,300 Q174,530 150,742 L256,742 Q296,540 318,352" fill="none" stroke="#000" stroke-width="3" opacity="0.35"/>
<path d="M444,176 Q452,250 450,300 Q466,530 490,742 L384,742 Q344,540 322,352" fill="none" stroke="#000" stroke-width="3" opacity="0.35"/>
<rect x="150" y="140" width="340" height="40" fill="${dark}"/>
</g>
<path d="M196,140 h248 a6,6 0 0 1 6,6 v34 a6,6 0 0 1 -6,6 h-248 a6,6 0 0 1 -6,-6 v-34 a6,6 0 0 1 6,-6 z" fill="${dark}"/>
${stitch("M192,152 H448", st)}
${stitch("M192,178 H448", st)}
${stitch("M316,182 Q306,252 300,304", st)}
${stitch("M196,196 Q246,272 296,254", st)}
${stitch("M444,196 Q394,272 344,254", st)}
${stitch("M262,266 h34 v22 h-36", st, 2, "6 5")}
${stitch("M168,718 H266", st, 2.4, "10 8")}
${stitch("M376,718 H474", st, 2.4, "10 8")}
<rect x="222" y="142" width="12" height="44" rx="3" fill="${main}" stroke="${st}" stroke-width="1.6"/>
<rect x="302" y="142" width="12" height="44" rx="3" fill="${main}" stroke="${st}" stroke-width="1.6"/>
<rect x="404" y="142" width="12" height="44" rx="3" fill="${main}" stroke="${st}" stroke-width="1.6"/>
<circle cx="320" cy="164" r="9" fill="#c9a24a" stroke="#8a6b28" stroke-width="2"/>
<circle cx="206" cy="206" r="4" fill="#c9a24a"/>
<circle cx="434" cy="206" r="4" fill="#c9a24a"/>
<text x="320" y="620" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="15" letter-spacing="7" fill="#ffffff" opacity="0.10">VEYRA VINTAGE</text>
</g>`;
  return wrap(inner, p, weave("weaveJ", light));
}

function jeansBack(p) {
  const { main, dark, light, stitch: st } = p;
  const pocket = (x) => `M${x},240 L${x + 86},240 L${x + 79},326 Q${x + 43},344 ${x + 7},326 Z`;
  const inner = `
<ellipse cx="320" cy="762" rx="185" ry="20" fill="#000" opacity="0.5" filter="url(#soft)"/>
<g>
<path d="${JEANS_BODY}" fill="url(#fabFlat)"/>
<path d="${JEANS_BODY}" fill="url(#weaveJ)" opacity="0.5"/>
<clipPath id="clipBody"><path d="${JEANS_BODY}"/></clipPath>
<g clip-path="url(#clipBody)">
<path d="M196,214 L320,250 L444,214" fill="${dark}"/>
<path d="M220,470 Q270,486 306,474" stroke="${light}" stroke-width="5" fill="none" opacity="0.2" stroke-linecap="round"/>
<path d="M336,474 Q382,486 424,470" stroke="${light}" stroke-width="5" fill="none" opacity="0.2" stroke-linecap="round"/>
<path d="M170,650 Q206,662 244,654" stroke="${light}" stroke-width="4" fill="none" opacity="0.16" stroke-linecap="round"/>
<path d="M396,654 Q436,662 470,650" stroke="${light}" stroke-width="4" fill="none" opacity="0.16" stroke-linecap="round"/>
</g>
<path d="M196,140 h248 a6,6 0 0 1 6,6 v34 a6,6 0 0 1 -6,6 h-248 a6,6 0 0 1 -6,-6 v-34 a6,6 0 0 1 6,-6 z" fill="${dark}"/>
${stitch("M192,152 H448", st)}
${stitch("M192,178 H448", st)}
${stitch("M196,214 L320,250 L444,214", st)}
${stitch(pocket(214), st, 2.4, "10 7")}
${stitch(pocket(340), st, 2.4, "10 7")}
${stitch("M226,252 Q257,300 290,262", st, 2, "7 6")}
${stitch("M352,252 Q383,300 416,262", st, 2, "7 6")}
${stitch("M168,718 H266", st, 2.4, "10 8")}
${stitch("M376,718 H474", st, 2.4, "10 8")}
<rect x="390" y="146" width="54" height="36" rx="4" fill="#b98a4d"/>
<path d="M396,156 H438 M396,164 H438 M396,172 H424" stroke="#7a5a2e" stroke-width="2.4"/>
<circle cx="302" cy="164" r="7" fill="#c9a24a" stroke="#8a6b28" stroke-width="2"/>
<text x="320" y="620" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="15" letter-spacing="7" fill="#ffffff" opacity="0.10">VEYRA VINTAGE</text>
</g>`;
  return wrap(inner, p, weave("weaveJ", light));
}

function jeansDetail(p) {
  const { main, dark, light, stitch: st } = p;
  const pocket = "M170,300 L470,286 L462,560 Q316,616 178,556 Z";
  const inner = `
<g transform="translate(0,40) scale(1.06) translate(-18,-10)">
<rect x="-20" y="-20" width="700" height="860" fill="url(#fabFlat)"/>
<rect x="-20" y="-20" width="700" height="860" fill="url(#weaveD)" opacity="0.6"/>
<path d="${pocket}" fill="${dark}"/>
<path d="${pocket}" fill="url(#weaveD)" opacity="0.45"/>
${stitch(pocket, st, 4, "16 12")}
${stitch("M196,330 Q318,394 444,322", st, 3, "12 9")}
${stitch("M230,362 Q320,420 410,352", st, 2.6, "9 8")}
<circle cx="188" cy="312" r="15" fill="#c9a24a" stroke="#8a6b28" stroke-width="3"/>
<circle cx="458" cy="300" r="15" fill="#c9a24a" stroke="#8a6b28" stroke-width="3"/>
<rect x="330" y="618" width="220" height="96" rx="8" fill="#b98a4d" transform="rotate(-3 440 666)"/>
<g transform="rotate(-3 440 666)">
<text x="440" y="654" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="16" letter-spacing="1" fill="#4a3416">VEYRA VINTAGE</text>
<text x="440" y="684" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="15" letter-spacing="5" fill="#6b4f26">EST. 1998</text>
</g>
<text x="60" y="740" font-family="Arial, Helvetica, sans-serif" font-size="17" letter-spacing="6" fill="#ffffff" opacity="0.35">13.5 OZ DENIM — RAW</text>
</g>`;
  return wrap(inner, p, weave("weaveD", light));
}

function torsoTee(color, dark) {
  return `
<path d="M246,214 Q320,198 394,214 L408,336 Q402,376 396,384 L244,384 Q238,376 232,336 Z" fill="${color}"/>
<path d="M246,214 L206,246 L224,308 L262,296 Z" fill="${color}"/>
<path d="M394,214 L434,246 L416,308 L378,296 Z" fill="${color}"/>
<path d="M296,210 Q320,232 344,210" fill="none" stroke="${dark}" stroke-width="6" stroke-linecap="round"/>
<path d="M246,384 L394,384" stroke="${dark}" stroke-width="5" opacity="0.5"/>`;
}

function torsoJacket(color, dark, st) {
  return `
<path d="M246,212 Q320,196 394,212 L410,340 Q404,378 398,386 L242,386 Q236,378 230,340 Z" fill="${color}"/>
<path d="M246,212 L204,248 L224,314 L264,300 Z" fill="${color}"/>
<path d="M394,212 L436,248 L416,314 L376,300 Z" fill="${color}"/>
<path d="M292,208 L320,252 L348,208 L344,236 L296,236 Z" fill="${dark}"/>
<path d="M320,252 L320,386" stroke="${dark}" stroke-width="5"/>
<path d="M320,252 L320,386" stroke="${st}" stroke-width="2" stroke-dasharray="8 7"/>
<rect x="264" y="262" width="52" height="44" rx="5" fill="${dark}"/>
<rect x="326" y="262" width="52" height="44" rx="5" fill="${dark}"/>
<circle cx="320" cy="300" r="6" fill="#c9a24a"/><circle cx="320" cy="340" r="6" fill="#c9a24a"/>
<circle cx="290" cy="272" r="4" fill="#c9a24a"/><circle cx="352" cy="272" r="4" fill="#c9a24a"/>`;
}

function torsoHoodie(color, dark, light) {
  return `
<path d="M274,158 Q320,124 366,158 Q378,214 320,226 Q262,214 274,158 Z" fill="${dark}"/>
<path d="M248,218 Q320,202 392,218 L410,344 Q404,382 398,392 L242,392 Q236,382 230,344 Z" fill="${color}"/>
<path d="M248,218 L202,254 L224,330 L266,314 Z" fill="${color}"/>
<path d="M392,218 L438,254 L416,330 L374,314 Z" fill="${color}"/>
<path d="M300,226 L296,290 M340,226 L344,290" stroke="${light}" stroke-width="5" stroke-linecap="round"/>
<path d="M276,340 L364,340 L356,384 L284,384 Z" fill="${dark}" opacity="0.75"/>
<path d="M248,392 L392,392" stroke="${dark}" stroke-width="8" opacity="0.6"/>`;
}

function onModel(product, garment) {
  const pal = product.palette || { main: "#2e4370", dark: "#1b2a4a", light: "#48628f", stitch: "#e0913c" };
  const { main, dark, light, stitch: st } = pal;
  let top = torsoTee("#2b2c33", "#17181c");
  let legs = `<path d="M246,392 L394,392 L404,470 L396,700 L330,700 L320,520 L310,700 L244,700 L236,470 Z" fill="#1d1f25"/>`;
  let headExtra = "";

  if (garment === "jeans") {
    legs = `
<path d="M244,386 L396,386 L406,464 L394,706 L330,706 L320,524 L310,706 L246,706 L234,464 Z" fill="url(#fabFlat)"/>
<path d="M320,392 L320,524" stroke="${st}" stroke-width="2.4" stroke-dasharray="9 7"/>
<path d="M268,470 Q292,480 310,472" stroke="${light}" stroke-width="5" fill="none" opacity="0.4" stroke-linecap="round"/>
<path d="M332,472 Q356,482 380,470" stroke="${light}" stroke-width="5" fill="none" opacity="0.4" stroke-linecap="round"/>
<path d="M250,690 L396,690" stroke="${st}" stroke-width="2.4" stroke-dasharray="9 7" opacity="0.8"/>`;
  } else if (garment === "jacket") {
    top = torsoJacket(main, dark, st);
  } else if (garment === "hoodie") {
    top = torsoHoodie(main, dark, light);
    headExtra = `<path d="M276,156 Q320,120 364,156 Q374,196 320,208 Q266,196 276,156 Z" fill="${dark}" opacity="0.9"/>`;
  } else if (garment === "tee") {
    top = torsoTee(main, dark);
  } else if (garment === "cap") {
    headExtra = `
<path d="M280,104 Q320,58 360,104 Q362,120 356,126 L284,126 Q278,120 280,104 Z" fill="${main}"/>
<path d="M284,124 L362,124 Q400,130 406,146 Q344,162 276,142 Q276,130 284,124 Z" fill="${dark}"/>
<path d="M320,64 L320,124" stroke="${st}" stroke-width="2" stroke-dasharray="7 6"/>`;
  }

  const inner = `
<ellipse cx="320" cy="756" rx="150" ry="18" fill="#000" opacity="0.55" filter="url(#soft)"/>
<g>
<circle cx="320" cy="126" r="44" fill="#2a2b32"/>
<path d="M306,168 h28 v34 h-28 z" fill="#2a2b32"/>
${headExtra}
${top}
<path d="M232,306 L222,446" stroke="#2a2b32" stroke-width="27" stroke-linecap="round"/>
<path d="M408,306 L418,446" stroke="#2a2b32" stroke-width="27" stroke-linecap="round"/>
${legs}
<rect x="242" y="700" width="70" height="28" rx="12" fill="#e9e7e2"/>
<rect x="330" y="700" width="70" height="28" rx="12" fill="#e9e7e2"/>
<rect x="242" y="720" width="70" height="8" rx="4" fill="#bcb9b2"/>
<rect x="330" y="720" width="70" height="8" rx="4" fill="#bcb9b2"/>
<text x="320" y="60" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" letter-spacing="8" fill="#ffffff" opacity="0.14">ON MODEL</text>
</g>`;
  return wrap(inner, pal, weave("weaveM", light));
}

function placeholder() {
  const inner = `
<g opacity="0.9">
<path d="M320,236 L206,320 L434,320 Z" fill="none" stroke="#3a3d46" stroke-width="6" stroke-linejoin="round"/>
<path d="M206,320 L188,556 Q320,600 452,556 L434,320" fill="#17181d" stroke="#3a3d46" stroke-width="6"/>
<circle cx="320" cy="212" r="16" fill="none" stroke="#3a3d46" stroke-width="6"/>
<text x="320" y="668" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" letter-spacing="8" fill="#5b606c">GÖRSEL YOK</text>
</g>`;
  return wrap(inner, null);
}

function ensurePlaceholder() {
  fs.writeFileSync(path.join(OUT, "placeholder.svg"), placeholder(), "utf8");
}

function generateFor(p) {
  if (!p || !p.garment) return 0;
  if (Array.isArray(p.images) && p.images.length) return 0;
  const palette = p.palette || { main: "#2e4370", dark: "#1b2a4a", light: "#48628f", stitch: "#e0913c" };
  const makers = [jeansFront, jeansBack, jeansDetail];
  const views = makers.map((fn) => fn(palette));
  views.push(onModel({ ...p, palette }, p.garment));
  views.forEach((svg, i) => {
    fs.writeFileSync(path.join(OUT, `${p.id}-${i + 1}.svg`), svg, "utf8");
  });
  return views.length;
}

function generateAll(list) {
  ensurePlaceholder();
  let count = 0;
  for (const p of list) count += generateFor(p);
  return count;
}

module.exports = { generateFor, generateAll, ensurePlaceholder };

if (require.main === module) {
  const n = generateAll(products);
  console.log(`${n} görsel üretildi → public/img/gen`);
}
