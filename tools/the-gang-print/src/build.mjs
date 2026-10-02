import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import * as R from './render.js';

const DATA = resolve('../data');
const load = (f) => JSON.parse(readFileSync(`${DATA}/${f}`, 'utf8'));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = resolve('..');
const TMP = resolve('.tmp');
mkdirSync(TMP, { recursive: true });

const EN = load('cards.en.json');
const VI = load('cards.vi.json');
const pair = (front, back) => ({ front, back });
const bold = (s) => s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

// Primary language is shown large; the other language's title sits underneath for cross-reference.
function localize(no, lang) {
  const en = EN[no],
    vi = VI[no];
  const [main, other] = lang === 'vi' ? [vi, en] : [en, vi];
  return {
    ...en,
    no,
    title_x: main.title,
    sub_x: other.title,
    text_x: main.text,
    items_x: main.items && (lang === 'vi' ? main.items : main.items.map(bold)),
  };
}

function buildCards(lang) {
  const codes = Object.keys(EN);
  const of = (pred) => codes.filter((no) => pred(EN[no])).map((no) => localize(no, lang));
  const mission = (c) => pair(R.missionFront(c), R.missionBack(c));
  const refBack = R.missionBack({ kind: 'ref', set: 'hb' });
  return [
    ...of((c) => c.kind === 'challenge').map(mission),
    ...of((c) => c.kind === 'specialist').map(mission),
    ...[1, 2, 3].map((i) => pair(R.vaultSide(false, `V${i}`), R.vaultSide(true, `V${i}`))),
    ...[1, 2, 3].map((i) => pair(R.alarmSide(false, `A${i}`), R.alarmSide(true, `A${i}`))),
    ...of((c) => c.kind === 'hbBad').map(mission),
    ...of((c) => c.kind === 'hbGood').map(mission),
    pair(R.termsFront(localize('R1', lang)), refBack),
    ...['hand-ranks', 'small-flush', 'tiny-straight', '6card'].map((n, i) =>
      pair(R.imageFront(`img/ref-${n}.png`, `R${i + 2}`), refBack),
    ),
  ];
}

const colors = ['white', 'yellow', 'orange', 'red'];
const chipSpecs = [
  ...colors.flatMap((color) => [1, 2, 3, 4, 5, 6].map((stars) => ({ color, stars }))),
  ...colors.flatMap((color) => [7, 8, 9, 10].map((stars) => ({ color, stars, set: 'dlx' }))),
  ...colors.flatMap((color) => [0, 0].map(() => ({ color, label: '0', set: 'dlx' }))),
  ...[1, 2, 3].map(() => ({ color: 'red', label: 'EXIT', set: 'dlx' })),
];
const chips = chipSpecs.map((s) => pair(R.chip(s), R.chip({ ...s, dark: true })));

function cropMarks(cols, rows, x0, y0, w, h, bleed) {
  const m = [];
  const xs = [],
    ys = [];
  for (let c = 0; c < cols; c++) xs.push(x0 + c * w + bleed, x0 + (c + 1) * w - bleed);
  for (let r = 0; r < rows; r++) ys.push(y0 + r * h + bleed, y0 + (r + 1) * h - bleed);
  const gridB = y0 + rows * h,
    gridR = x0 + cols * w;
  for (const x of xs) {
    m.push(`<i class="mark" style="left:${x - 0.05}mm;top:0;width:.1mm;height:${y0 - 0.8}mm"></i>`);
    m.push(
      `<i class="mark" style="left:${x - 0.05}mm;top:${gridB + 0.8}mm;width:.1mm;height:${297 - gridB}mm"></i>`,
    );
  }
  for (const y of ys) {
    m.push(
      `<i class="mark" style="top:${y - 0.05}mm;left:0;height:.1mm;width:${Math.max(x0 - 0.5, 0.8)}mm"></i>`,
    );
    m.push(
      `<i class="mark" style="top:${y - 0.05}mm;left:${gridR + 0.5}mm;height:.1mm;width:${210 - gridR}mm"></i>`,
    );
  }
  return m.join('');
}

// Backs mirror columns so a long-edge duplex print lines up with the fronts.
function impose(items, { cols, rows, w, h, bleed, title, sides = ['front', 'back'] }) {
  const per = cols * rows;
  const x0 = (210 - cols * w) / 2,
    y0 = (297 - rows * h) / 2;
  const marks = cropMarks(cols, rows, x0, y0, w, h, bleed);
  const pages = [];
  for (let p = 0; p * per < items.length; p++) {
    const chunk = items.slice(p * per, (p + 1) * per);
    for (const side of sides) {
      const slots = chunk
        .map((it, i) => {
          const r = Math.floor(i / cols),
            c = i % cols;
          const cc = side === 'back' ? cols - 1 - c : c;
          return `<div class="slot" style="left:${x0 + cc * w}mm;top:${y0 + r * h}mm">${it[side]}</div>`;
        })
        .join('');
      const label = `${title} · tờ ${p + 1} · ${side === 'front' ? 'MẶT TRƯỚC' : 'MẶT SAU (in 2 mặt, lật cạnh dài)'}`;
      pages.push(
        `<section class="sheet">${slots}${marks}<div class="sheet-label">${label}</div></section>`,
      );
    }
  }
  return pages.join('');
}

function toPdf(name, body) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><base href="../"><link rel="stylesheet" href="cards.css"></head><body>${body}</body></html>`;
  writeFileSync(`${TMP}/${name}.html`, html);
  execFileSync(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-pdf-header-footer',
      '--virtual-time-budget=8000',
      `--print-to-pdf=${OUT}/${name}.pdf`,
      `file://${TMP}/${name}.html`,
    ],
    { stdio: 'ignore' },
  );
}

for (const lang of ['en']) {
  R.setLang(lang);
  const cards = buildCards(lang);
  const L = lang.toUpperCase();
  toPdf(
    `the-gang-${L}-cards`,
    impose(cards, {
      cols: 3,
      rows: 3,
      w: 69,
      h: 94,
      bleed: 3,
      title: `The Gang ${L} – 63×88mm (bleed 3mm)`,
    }),
  );
  console.log(lang, cards.length);
}
toPdf(
  'the-gang-chips',
  impose(chips, {
    cols: 5,
    rows: 7,
    w: 38,
    h: 38,
    bleed: 3,
    title: 'The Gang – Chip Ø32mm (bleed 3mm)',
  }),
);
