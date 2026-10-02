const STR = {
  vi: {
    challenge: 'THỬ THÁCH',
    specialist: 'CHUYÊN GIA',
    hbBad: 'BẤT LỢI',
    hbGood: 'LỢI THẾ',
    ref: 'THAM KHẢO',
    vault: 'KÉT SẮT',
    alarm: 'BÁO ĐỘNG',
    base: 'Bộ gốc',
    hb: 'Homebrew',
    dlx: 'Deluxe',
    design: 'Thiết kế: ',
    ranks: 'Homebrew · Bảng hạng bài',
    vaultOpen: 'ĐÃ PHÁ KÉT',
    vaultOpenSub: 'Phi vụ thành công',
    vaultSub: 'Lật khi phi vụ thành công',
    alarmOn: 'BÁO ĐỘNG!',
    alarmOnSub: 'Phi vụ thất bại',
    alarmSub: 'Lật khi phi vụ thất bại',
  },
  en: {
    challenge: 'CHALLENGE',
    specialist: 'SPECIALIST',
    hbBad: 'DETRIMENTAL',
    hbGood: 'BENEFICIAL',
    ref: 'REFERENCE',
    vault: 'VAULT',
    alarm: 'ALARM',
    base: 'Base game',
    hb: 'Homebrew',
    dlx: 'Deluxe',
    design: 'Designed by: ',
    ranks: 'Homebrew · Hand ranks',
    vaultOpen: 'VAULT CRACKED',
    vaultOpenSub: 'Heist succeeded',
    vaultSub: 'Flip when a heist succeeds',
    alarmOn: 'ALARM!',
    alarmOnSub: 'Heist failed',
    alarmSub: 'Flip when a heist fails',
  },
};
let T = STR.vi;
export const setLang = (l) => {
  T = STR[l];
};
const lbl = (kind) => T[kind];

export const SETS = {
  base: { code: 'G', name: 'Bộ gốc' },
  hb: { code: 'HB', name: 'Homebrew' },
  dlx: { code: 'DLX', name: 'Deluxe' },
};

const KINDS = {
  challenge: { label: 'THỬ THÁCH', color: '#c8242b', dark: '#6e0f13' },
  specialist: { label: 'CHUYÊN GIA', color: '#13808a', dark: '#07434a' },
  hbBad: { label: 'BẤT LỢI', color: '#b8322a', dark: '#5e1410' },
  hbGood: { label: 'LỢI THẾ', color: '#2f8f3a', dark: '#14501b' },
  ref: { label: 'THAM KHẢO', color: '#5b5f6b', dark: '#2a2d35' },
  vault: { label: 'KÉT SẮT', color: '#d9a21b', dark: '#5c430a' },
  alarm: { label: 'BÁO ĐỘNG', color: '#e0402f', dark: '#3a0d09' },
};

export const CHIP_COLORS = {
  white: { fill: '#f4f4f2', ink: '#1b1b1b' },
  yellow: { fill: '#f6b81c', ink: '#1b1b1b' },
  orange: { fill: '#ee7a14', ink: '#1b1b1b' },
  red: { fill: '#d8262e', ink: '#1b1b1b' },
};

const esc = (s) =>
  String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

function starPath(cx, cy, r) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    return `${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`;
  });
  return `M${pts.join('L')}Z`;
}

function starsLayout(n) {
  if (n <= 0) return [];
  if (n === 1) return [[0, 0]];
  const r = n <= 3 ? 9 : 15;
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [r * Math.cos(a), r * Math.sin(a)];
  });
}

const starSize = (n) => (n <= 2 ? 8 : n <= 4 ? 6.5 : n <= 6 ? 5.5 : 4.2);

function vaultSvg(stroke, fill, open = false) {
  const bolts = Array.from({ length: 24 }, (_, i) => {
    const a = (i * Math.PI) / 12;
    return `<circle cx="${50 + 38 * Math.cos(a)}" cy="${50 + 38 * Math.sin(a)}" r="1.6" fill="${stroke}"/>`;
  }).join('');
  const spokes = Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI) / 3;
    return `<line x1="${50 + 8 * Math.cos(a)}" y1="${50 + 8 * Math.sin(a)}" x2="${50 + 20 * Math.cos(a)}" y2="${50 + 20 * Math.sin(a)}" stroke="${stroke}" stroke-width="2.4" stroke-linecap="round"/>`;
  }).join('');
  if (open) {
    const gold = Array.from(
      { length: 9 },
      (_, i) =>
        `<rect x="${30 + (i % 3) * 13}" y="${38 + Math.floor(i / 3) * 9}" width="11" height="7" rx="1" fill="#f6c94a" stroke="${stroke}" stroke-width=".8"/>`,
    ).join('');
    return `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#1a1405" stroke="${stroke}" stroke-width="2"/>${gold}
    <ellipse cx="88" cy="50" rx="10" ry="40" fill="${fill}" stroke="${stroke}" stroke-width="2"/></svg>`;
  }
  return `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
  <circle cx="50" cy="50" r="42" fill="none" stroke="${stroke}" stroke-width="0.8" stroke-dasharray="3 2"/>${bolts}
  <circle cx="50" cy="50" r="33" fill="none" stroke="${stroke}" stroke-width="1.6"/>
  <circle cx="50" cy="50" r="24" fill="none" stroke="${stroke}" stroke-width="1"/>${spokes}
  <circle cx="50" cy="50" r="7" fill="none" stroke="${stroke}" stroke-width="2"/></svg>`;
}

function alarmSvg(on) {
  const rays = on
    ? Array.from({ length: 8 }, (_, i) => {
        const a = (-Math.PI * (i + 0.5)) / 8;
        return `<line x1="${50 + 30 * Math.cos(a)}" y1="${60 + 30 * Math.sin(a)}" x2="${50 + 44 * Math.cos(a)}" y2="${60 + 44 * Math.sin(a)}" stroke="#ffd34d" stroke-width="4" stroke-linecap="round"/>`;
      }).join('')
    : '';
  const dome = on ? '#ff3b25' : '#6b6b6b';
  return `<svg viewBox="0 0 100 100">${rays}<path d="M28 72 V58 a22 22 0 0 1 44 0 V72Z" fill="${dome}" stroke="#fff" stroke-width="2"/>
  <rect x="20" y="72" width="60" height="10" rx="2" fill="#222" stroke="#fff" stroke-width="2"/>
  <path d="M40 52 a10 10 0 0 1 10 -10" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/></svg>`;
}

const badge = (set, color) =>
  `<span class="badge" style="border-color:${color};color:${color}">${SETS[set].code}</span>`;

function shell(cls, k, inner) {
  return `<div class="card ${cls}" style="--c:${k.color};--d:${k.dark}"><div class="safe">${inner}</div></div>`;
}

export function missionFront(c) {
  const k = KINDS[c.kind];
  const diff =
    c.difficulty != null
      ? `<span class="diff" title="Độ khó">${c.difficulty > 0 ? '+' : ''}${c.difficulty}</span>`
      : '';
  const text = c.text_x
    .split(/<br\s*\/?>/i)
    .map((p) => `<p>${p}</p>`)
    .join('');
  const len = c.text_x.replace(/<[^>]+>/g, '').length;
  const fs = len > 260 ? 2.55 : len > 200 ? 2.75 : len > 140 ? 2.95 : 3.15;
  return shell(
    'front mission',
    k,
    `
    <div class="head"><span class="num">${esc(c.no)}</span><span class="kind">${lbl(c.kind)}</span>${diff}</div>
    <div class="title">${esc(c.title_x)}</div>
    <div class="orig">${esc(c.sub_x)}</div>
    <div class="art">${vaultSvg(k.color, 'none')}</div>
    <div class="text" style="font-size:${fs}mm">${text}</div>
    <div class="foot">${badge(c.set, k.color)}<span>${esc(c.credit ? T.design + c.credit : 'The Gang · Kosmos')}</span></div>`,
  );
}

export function missionBack(c) {
  const k = KINDS[c.kind];
  return shell(
    'back',
    k,
    `<div class="frame"><div class="dial">${vaultSvg('#ffffff', k.dark)}</div>
    <div class="blabel">${lbl(c.kind)}</div><div class="bset">${badge(c.set, '#ffffff')}<span>${T[c.set]}</span></div></div>`,
  );
}

export function termsFront(t) {
  const k = KINDS.ref;
  return shell(
    'front terms',
    k,
    `<div class="head"><span class="num">${esc(t.no)}</span><span class="kind">${lbl('ref')}</span></div>
    <div class="title small">${esc(t.title_x)}</div><div class="orig">${esc(t.sub_x)}</div>
    <ul>${t.items_x.map((i) => `<li>${i}</li>`).join('')}</ul>
    <div class="foot">${badge('hb', k.color)}<span>Homebrew · Andrew Nathenson</span></div>`,
  );
}

export function imageFront(src, no) {
  return `<div class="card front image"><img src="${src}"><div class="imgbadge"><b>${no}</b>${badge('hb', KINDS.ref.color)}<span>${T.ranks}</span></div></div>`;
}

export function vaultSide(open, no) {
  const k = KINDS.vault;
  return shell(
    'back token-card',
    k,
    `<div class="frame"><div class="dial big">${vaultSvg('#ffffff', k.dark, open)}</div>
    <div class="blabel">${open ? T.vaultOpen : T.vault}</div><div class="sub">${open ? T.vaultOpenSub : T.vaultSub}</div>
    <div class="bset"><b>${no}</b>${badge('base', '#ffffff')}</div></div>`,
  );
}

export function alarmSide(on, no) {
  const k = KINDS.alarm;
  return shell(
    'back token-card',
    k,
    `<div class="frame"><div class="dial big">${alarmSvg(on)}</div>
    <div class="blabel">${on ? T.alarmOn : T.alarm}</div><div class="sub">${on ? T.alarmOnSub : T.alarmSub}</div>
    <div class="bset"><b>${no}</b>${badge('base', '#ffffff')}</div></div>`,
  );
}

export function chip({ color, stars = 0, label = '', dark = false, set = 'base' }) {
  const p = CHIP_COLORS[color];
  const fill = dark ? '#2a2a2a' : p.fill;
  const ink = dark ? p.fill : p.ink;
  const notches = Array.from(
    { length: 6 },
    (_, i) =>
      `<rect x="-6" y="-46" width="12" height="11" fill="${ink}" transform="rotate(${i * 60})"/>`,
  ).join('');
  const center = label
    ? `<text x="0" y="${label.length > 2 ? 6 : 9}" text-anchor="middle" font-size="${label.length > 2 ? 16 : 26}" font-weight="700" fill="${ink}" font-family="Oswald">${label}</text>`
    : starsLayout(stars)
        .map(([x, y]) => `<path d="${starPath(x, y, starSize(stars))}" fill="${ink}"/>`)
        .join('');
  const mark =
    set !== 'base'
      ? `<text x="0" y="28" text-anchor="middle" font-size="7" font-weight="700" fill="${ink}" font-family="Oswald">${SETS[set].code}</text>`
      : '';
  // Outer circle at r=57 is the 3mm bleed ring for a 32mm chip (viewBox 100 = 32mm).
  return `<div class="chip"><svg viewBox="-60 -60 120 120"><circle r="57" fill="${dark ? '#2a2a2a' : p.fill}"/>
  <circle r="48" fill="${fill}" stroke="${ink}" stroke-width="2"/>${notches}<circle r="31" fill="none" stroke="${ink}" stroke-width="2"/>${center}${mark}</svg></div>`;
}
