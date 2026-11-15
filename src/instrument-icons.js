// Small, bundled illustrations: no font, image service or network request needed.
const drawings = {
  flute: `<circle cx="32" cy="32" r="29" fill="#e1eee8" stroke="none"/>
    <g transform="rotate(40 32 32)"><rect x="27" y="7" width="10" height="50" rx="4" fill="#d3e4e2"/>
    <path d="M27 17h10M27 48h10M31 10v4"/><ellipse cx="32" cy="21" rx="2" ry="1.5" fill="#55756c"/>
    <g fill="#fffdf6"><circle cx="35" cy="29" r="3"/><circle cx="35" cy="37" r="3"/><circle cx="35" cy="45" r="3"/></g></g>`,
  piano: `<circle cx="32" cy="32" r="29" fill="#ece5f2" stroke="none"/>
    <rect x="10" y="16" width="44" height="34" rx="6" fill="#83738f"/>
    <rect x="14" y="29" width="36" height="17" rx="2" fill="#fffdf6"/>
    <path d="M23 30v16m9-16v16m9-16v16"/><path d="M22 29v8m10-8v8m10-8v8" stroke="#514b5c" stroke-width="4"/>
    <path d="M17 23h9" stroke="#eee5f4"/>`,
  ukulele: `<circle cx="32" cy="32" r="29" fill="#f8e7d5" stroke="none"/>
    <g transform="rotate(28 32 32)"><path d="M25 29c-8-1-12 6-8 12-9 12 0 19 15 18 13 0 21-9 12-18 4-6 0-13-8-12Z" fill="#e9b880"/>
    <rect x="28" y="10" width="8" height="25" rx="2" fill="#b88b65"/><rect x="26" y="5" width="12" height="12" rx="3" fill="#d8aa79"/>
    <circle cx="32" cy="40" r="5" fill="#6e5b49"/><path d="M27 51h10m-6-34v33m3-33v33"/>
    <path d="M23 8h3m12 0h3m-18 6h3m12 0h3"/></g>`,
  ocarina: `<circle cx="32" cy="32" r="29" fill="#dfeaf5" stroke="none"/>
    <path d="M10 37c-1-11 10-18 23-16l11-10 7 5-6 14c12 15 0 23-15 22-11-1-19-6-20-15Z" fill="#94b8d4"/>
    <path d="m44 14 5 4M16 34c2-5 7-7 12-7" stroke="#f7fcff"/>
    <g fill="#4f7085"><circle cx="24" cy="36" r="2.5"/><circle cx="33" cy="33" r="2.5"/><circle cx="32" cy="43" r="2.5"/><circle cx="42" cy="40" r="2.5"/></g>`,
  kalimba: `<circle cx="32" cy="32" r="29" fill="#f4e2df" stroke="none"/>
    <rect x="15" y="11" width="34" height="44" rx="9" fill="#dba382"/>
    <circle cx="32" cy="41" r="7" fill="#916b55"/><path d="M21 17h22" stroke-width="3"/>
    <path d="M22 19v13m5-13v19m5-19v23m5-23v19m5-19v13" stroke="#fff8e9" stroke-width="3"/>
    <path d="M22 49h3m14 0h3" stroke="#f7d9b9"/>`
};

export function instrumentIcon(kind) {
  const drawing = Object.hasOwn(drawings, kind) ? drawings[kind] : drawings.flute;
  return `<svg class="instrument-icon" viewBox="0 0 64 64" fill="none" stroke="#52645a" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${drawing}</svg>`;
}
