/**
 * Zadania dla zespołu — logika z renderZadania / zapiszZadanie w PWA.
 * Bez importów React Native — testy w Node.
 */

import type { Zadanie } from './typy';

export type Priorytet = 'pilne' | 'wazne' | 'normalne';

/** Kolory kart jak w PWA: pilne czerwone, ważne żółte, normalne szare. */
export function wygladPriorytetu(p: Priorytet): { tlo: string; ramka: string; tekst: string; znaczek: string; etykieta: string } {
  if (p === 'pilne') return { tlo: '#ffebee', ramka: '#ef9a9a', tekst: '#b71c1c', znaczek: '#e53935', etykieta: 'Pilne' };
  if (p === 'wazne') return { tlo: '#fff8e1', ramka: '#ffe082', tekst: '#e65100', znaczek: '#f9a825', etykieta: 'Ważne' };
  return { tlo: '#FFFFFF', ramka: '#E4E4DF', tekst: '#1A1A18', znaczek: '#888888', etykieta: 'Normalne' };
}

const KOLEJNOSC: Record<Priorytet, number> = { pilne: 0, wazne: 1, normalne: 2 };

/**
 * Podział jak w PWA: aktywne (pilne → ważne → normalne, potem termin, najnowsze), wykonane osobno na dole.
 */
export function podzielZadania(lista: Zadanie[]): { aktywne: Zadanie[]; wykonane: Zadanie[] } {
  const porzadek = (a: Zadanie, b: Zadanie) =>
    KOLEJNOSC[a.priorytet] - KOLEJNOSC[b.priorytet] ||
    (a.termin ?? '9999').localeCompare(b.termin ?? '9999') ||
    b.id - a.id;
  return {
    aktywne: lista.filter((z) => !z.wykonane).sort(porzadek),
    wykonane: lista.filter((z) => z.wykonane).sort((a, b) => b.id - a.id),
  };
}

/** Czy termin minął (do podświetlenia „⏰ Do:”). */
export const poTerminie = (z: Pick<Zadanie, 'termin' | 'wykonane'>, dzis: string) => !z.wykonane && !!z.termin && z.termin < dzis;

export type StanZadania = { dlaKogo: number | null; tytul: string; priorytet: Priorytet; termin: string | null; opis: string };

export const noweZadanie = (dlaKogo: number | null): StanZadania => ({ dlaKogo, tytul: '', priorytet: 'normalne', termin: null, opis: '' });

export function bladZadania(s: StanZadania): string | null {
  if (!s.dlaKogo) return 'Wybierz, dla kogo jest zadanie';
  if (!s.tytul.trim()) return 'Podaj tytuł zadania';
  return null;
}

export const daneZadania = (s: StanZadania) => ({
  dla_kogo: s.dlaKogo,
  tytul: s.tytul.trim(),
  priorytet: s.priorytet,
  termin: s.termin ?? '',
  opis: s.opis.trim(),
});
