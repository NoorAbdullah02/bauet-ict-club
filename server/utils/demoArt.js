// Small illustrated pictures for the demo data (SVG, ~2 KB each, no image host needed).
const uri = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const BG = [['#0A1A4A', '#1F4FD8'], ['#0E9F6E', '#17A2D8'], ['#6C4DF6', '#1F4FD8'], ['#E4572E', '#F5A524'], ['#17A2D8', '#18A957'], ['#1F4FD8', '#6C4DF6']];
const SKIN = ['#F1C9A5', '#E0AC83', '#C68642', '#8D5524', '#F5D6B8', '#D9A066'];
const HAIR = ['#1B1B1F', '#3B2A20', '#5A3825', '#0F0F12', '#7A4B2A', '#2B2B33'];
const SHIRT = ['#FFFFFF', '#E8EEFF', '#0A1A4A', '#17A2D8', '#18A957', '#F5A524', '#6C4DF6'];

/** A friendly head-and-shoulders portrait; the look is picked from the index so every person differs. */
function avatar(name, i = 0) {
  const [a, b] = BG[i % BG.length];
  const skin = SKIN[(i * 5 + 1) % SKIN.length];
  const hair = HAIR[(i * 3 + 2) % HAIR.length];
  const shirt = SHIRT[(i * 2 + 1) % SHIRT.length];
  const style = i % 4; // 0 short, 1 long, 2 bun, 3 side part
  const hairBack = style === 1 ? `<path d="M118 190 Q112 330 150 340 L250 340 Q290 330 282 190 Z" fill="${hair}"/>` : '';
  const hairTop = [
    `<path d="M128 178 Q132 98 200 96 Q270 98 272 178 Q250 138 200 140 Q150 138 128 178 Z" fill="${hair}"/>`,
    `<path d="M124 190 Q124 96 200 94 Q276 96 276 190 Q256 132 200 134 Q144 132 124 190 Z" fill="${hair}"/>`,
    `<circle cx="200" cy="88" r="26" fill="${hair}"/><path d="M130 176 Q136 104 200 104 Q264 104 270 176 Q248 140 200 142 Q152 140 130 176 Z" fill="${hair}"/>`,
    `<path d="M126 184 Q126 100 204 98 Q274 100 274 170 Q236 120 168 150 Q146 160 126 184 Z" fill="${hair}"/>`,
  ][style];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="400" height="400" fill="url(#g)"/><circle cx="330" cy="70" r="90" fill="#fff" fill-opacity=".10"/><circle cx="60" cy="360" r="120" fill="#fff" fill-opacity=".08"/>${hairBack}<path d="M50 400 Q56 300 140 286 L260 286 Q344 300 350 400 Z" fill="${shirt}"/><path d="M168 286 L200 330 L232 286 Z" fill="${skin}"/><rect x="176" y="240" width="48" height="56" rx="20" fill="${skin}"/><ellipse cx="200" cy="190" rx="66" ry="78" fill="${skin}"/>${hairTop}<circle cx="176" cy="196" r="6" fill="#2A2018"/><circle cx="224" cy="196" r="6" fill="#2A2018"/><path d="M176 232 Q200 252 224 232" stroke="#8A4B3A" stroke-width="5" fill="none" stroke-linecap="round"/><title>${esc(name)}</title></svg>`;
  return uri(svg);
}

const FRAME = (a, b, inner, label) => `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520" viewBox="0 0 800 520"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="800" height="520" fill="url(#g)"/><circle cx="700" cy="80" r="140" fill="#fff" fill-opacity=".09"/><circle cx="90" cy="470" r="170" fill="#fff" fill-opacity=".07"/>${inner}${label ? `<rect x="0" y="440" width="800" height="80" fill="#0A1A4A" fill-opacity=".55"/><text x="40" y="490" font-family="Arial,Helvetica,sans-serif" font-size="34" font-weight="700" fill="#fff">${esc(label)}</text>` : ''}</svg>`;

const people = (xs, y, scale = 1) => xs.map((x, k) => `<g transform="translate(${x} ${y}) scale(${scale})"><circle cx="0" cy="-34" r="20" fill="${SKIN[(k * 2 + 1) % SKIN.length]}"/><path d="M-30 0 Q-30 -22 0 -22 Q30 -22 30 0 Z" fill="${SHIRT[(k + 2) % SHIRT.length]}"/><path d="M-20 -44 Q0 -64 20 -44 Q10 -52 0 -52 Q-10 -52 -20 -44Z" fill="${HAIR[k % HAIR.length]}"/></g>`).join('');

const SCENES = {
  // laptop with code
  code: () => `<rect x="190" y="110" width="420" height="270" rx="16" fill="#0B1020"/><rect x="204" y="124" width="392" height="242" rx="8" fill="#10183A"/>${[0, 1, 2, 3, 4, 5, 6].map((k) => `<rect x="${226 + (k % 3) * 18}" y="${146 + k * 30}" width="${90 + ((k * 53) % 170)}" height="10" rx="5" fill="${['#17A2D8', '#18A957', '#F5A524', '#6C4DF6'][k % 4]}"/>`).join('')}<path d="M150 392 H650 L620 420 H180 Z" fill="#CBD5F5"/>`,
  // speaker on stage with audience
  stage: () => `<rect x="120" y="80" width="560" height="220" rx="10" fill="#0B1020"/><rect x="134" y="94" width="532" height="192" rx="6" fill="#1F4FD8" fill-opacity=".55"/><rect x="170" y="130" width="200" height="14" rx="7" fill="#fff"/><rect x="170" y="160" width="300" height="10" rx="5" fill="#fff" fill-opacity=".7"/><rect x="170" y="184" width="260" height="10" rx="5" fill="#fff" fill-opacity=".5"/>${people([560], 330, 1.5)}<rect x="0" y="352" width="800" height="90" fill="#0A1A4A" fill-opacity=".35"/>${people([120, 220, 320, 420, 520, 620, 700], 420, 1.1)}`,
  // trophy
  trophy: () => `<path d="M300 110 H500 V220 Q500 300 400 310 Q300 300 300 220 Z" fill="#F5C542"/><path d="M300 140 H250 Q240 220 310 236 M500 140 H550 Q560 220 490 236" stroke="#F5C542" stroke-width="16" fill="none" stroke-linecap="round"/><rect x="380" y="310" width="40" height="60" fill="#E0A82E"/><rect x="330" y="370" width="140" height="28" rx="8" fill="#E0A82E"/><path d="M360 150 L400 130 L440 150 L420 190 L380 190 Z" fill="#fff" fill-opacity=".35"/>`,
  // circuit board
  circuit: () => `<g stroke="#fff" stroke-opacity=".5" stroke-width="5" fill="none" stroke-linecap="round"><path d="M80 150 H260 V260 H420"/><path d="M80 330 H300 V210 H520 V120 H720"/><path d="M420 400 V300 H640 V200 H720"/><path d="M180 90 V200"/></g><g fill="#fff">${[[80, 150], [420, 260], [80, 330], [720, 120], [420, 400], [720, 200], [180, 90]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="12"/>`).join('')}</g><rect x="300" y="170" width="140" height="140" rx="16" fill="#0A1A4A" fill-opacity=".85" stroke="#fff" stroke-opacity=".6" stroke-width="4"/><text x="370" y="255" font-family="Arial" font-size="40" font-weight="700" fill="#fff" text-anchor="middle">ICT</text>`,
  // team standing together
  team: () => `${people([150, 270, 400, 530, 650], 400, 2)}`,
  // workshop: people at laptops
  workshop: () => `<rect x="80" y="300" width="640" height="26" rx="8" fill="#E7EDFB"/>${[160, 330, 500, 650].map((x, k) => `<g><rect x="${x - 55}" y="236" width="110" height="68" rx="6" fill="#0B1020"/><rect x="${x - 47}" y="244" width="94" height="52" rx="3" fill="${['#17A2D8', '#18A957', '#6C4DF6', '#F5A524'][k]}" fill-opacity=".8"/></g>`).join('')}${people([160, 330, 500, 650], 220, 1.4)}`,
  // app / phone
  app: () => `<rect x="300" y="60" width="200" height="380" rx="32" fill="#0B1020"/><rect x="314" y="84" width="172" height="332" rx="18" fill="#fff"/><rect x="330" y="104" width="140" height="70" rx="12" fill="#1F4FD8"/>${[0, 1, 2, 3].map((k) => `<rect x="330" y="${192 + k * 52}" width="140" height="38" rx="10" fill="${['#EEF3FF', '#E6F7F0', '#F3EEFF', '#FFF4E0'][k]}"/>`).join('')}`,
};

/** A wide illustration for events, gallery, posts, projects and achievements. */
function scene(kind, label, i = 0) {
  const [a, b] = BG[i % BG.length];
  return uri(FRAME(a, b, (SCENES[kind] || SCENES.code)(), label));
}

/** A square logo tile for sponsors. */
function logo(name, i = 0) {
  const [a, b] = BG[(i + 1) % BG.length];
  const ini = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return uri(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="400" height="200" rx="24" fill="#fff"/><rect x="36" y="48" width="104" height="104" rx="26" fill="url(#g)"/><text x="88" y="117" font-family="Arial,Helvetica,sans-serif" font-size="46" font-weight="800" fill="#fff" text-anchor="middle">${esc(ini)}</text><text x="160" y="112" font-family="Arial,Helvetica,sans-serif" font-size="34" font-weight="700" fill="#0A1A4A">${esc(name)}</text></svg>`);
}

module.exports = { avatar, scene, logo };
