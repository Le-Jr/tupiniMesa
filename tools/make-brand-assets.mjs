// Generates icon, adaptive foreground and splash from original vector art:
// a recipe card with a sprout, threaded by the orange lace.
// Requires rsvg-convert. Usage: node tools/make-brand-assets.mjs
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const out = "assets/images";
mkdirSync(out, { recursive: true });

const mark = (scale = 1) => {
  const t = (1 - scale) * 512;
  return `
  <g transform="translate(${t} ${t}) scale(${scale})">
    <path d="M150 250 C 60 520 240 700 330 560" fill="none" stroke="#F28C28" stroke-width="34" stroke-linecap="round"/>
    <g transform="rotate(-5 512 512)">
      <rect x="282" y="300" width="460" height="424" rx="56" fill="#F5F7EF"/>
      <rect x="282" y="300" width="46" height="424" rx="20" fill="#3FA34D"/>
      <rect x="486" y="640" width="150" height="34" fill="#0E3526"/>
      <path d="M561 640 V500" stroke="#0E3526" stroke-width="26" fill="none"/>
      <path d="M561 560 C492 560 452 520 444 448 C516 452 556 488 561 560 Z" fill="#00C653"/>
      <path d="M561 524 C563 444 611 404 694 396 C691 476 643 524 561 524 Z" fill="#00C653"/>
      <polyline points="386,560 446,607 386,654" fill="none" stroke="#0E3526" stroke-width="30" stroke-linecap="square"/>
      <circle cx="512" cy="336" r="24" fill="#071A14" stroke="#E9C46A" stroke-width="12"/>
      <circle cx="512" cy="688" r="24" fill="#071A14" stroke="#E9C46A" stroke-width="12"/>
    </g>
    <path d="M330 560 C 400 450 470 380 512 336" fill="none" stroke="#F28C28" stroke-width="34" stroke-linecap="round"/>
    <path d="M512 690 C 560 860 800 880 874 700" fill="none" stroke="#F28C28" stroke-width="34" stroke-linecap="round"/>
  </g>`;
};

const bg = `
  <defs><radialGradient id="bg" cx="50%" cy="38%" r="75%">
    <stop offset="0" stop-color="#0F3A2A"/><stop offset="0.6" stop-color="#071A14"/><stop offset="1" stop-color="#030C09"/>
  </radialGradient></defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>`;

const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${body}</svg>`;

const files = {
  icon: svg(bg + mark(1)),
  "adaptive-foreground": svg(mark(0.62)),
  "splash-icon": svg(mark(0.9)),
};
for (const [name, content] of Object.entries(files)) {
  const file = join(out, `${name}.svg`);
  writeFileSync(file, content);
  execFileSync("rsvg-convert", ["-w", "1024", "-h", "1024", file, "-o", join(out, `${name}.png`)]);
}
console.log("ok:", Object.keys(files).join(", "));
