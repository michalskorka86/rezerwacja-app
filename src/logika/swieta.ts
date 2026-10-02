/**
 * Święta w Polsce — jak SWIETA w kalendarz.php, ale dla każdego roku (PWA miało wpisane tylko 2023–2027).
 * Stałe + Wielkanoc i święta od niej zależne. Bez importów React Native — testy w Node.
 */

import { dStr } from './daty';

const STALE = ['01-01', '01-06', '05-01', '05-03', '08-15', '11-01', '11-11', '12-25', '12-26'];

/** Niedziela Wielkanocna (algorytm z PWA — Meeus/Jones/Butcher). */
export function wielkanoc(y: number): Date {
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const miesiac = Math.floor((h + l - 7 * m + 114) / 31);
  const dzien = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, miesiac - 1, dzien, 12);
}

const pamiec = new Map<number, Set<string>>();

function swietaRoku(y: number): Set<string> {
  let s = pamiec.get(y);
  if (s) return s;
  s = new Set(STALE.map((md) => `${y}-${md}`));
  if (y >= 2025) s.add(`${y}-12-24`); // Wigilia — dzień wolny od 2025 (w PWA jeszcze nie było)
  const w = wielkanoc(y);
  // Wielkanoc, Poniedziałek Wielkanocny (+1), Wniebowstąpienie (+39 — jak w PWA), Zesłanie Ducha (+49), Boże Ciało (+60)
  for (const plus of [0, 1, 39, 49, 60]) {
    const d = new Date(w);
    d.setDate(d.getDate() + plus);
    s.add(dStr(d));
  }
  pamiec.set(y, s);
  return s;
}

/** Czy 'RRRR-MM-DD' to święto (czerwony dzień w kalendarzu). */
export function czySwieto(ds: string): boolean {
  const y = parseInt(ds.slice(0, 4), 10);
  return Number.isFinite(y) && swietaRoku(y).has(ds);
}

