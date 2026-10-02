/**
 * Kalendarz rezerwacji — logika z kalendarz.php (renderSchedule, renderWeekNav, karty, szukanie, dodatki).
 * Bez importów React Native — testy w Node.
 */

import { dodajDni, dStr, zData } from './daty';
import type { Atrakcja, Dodatek, Lokalizacja, Marka, Rezerwacja } from './typy';

// ── Szukanie (matchesSearch) ─────────────────────────────────

/** Po nazwisku (bez wielkości liter) albo telefonie (bez spacji). */
export function pasujeDoSzukania(r: Rezerwacja, zapytanie: string): boolean {
  const q = zapytanie.trim().toLowerCase();
  if (!q) return true;
  const nazwa = (r.klient_imie_nazwisko || '').toLowerCase();
  const tel = (r.klient_telefon || '').toLowerCase().replace(/\s/g, '');
  return nazwa.includes(q) || tel.includes(q.replace(/\s/g, ''));
}

const poGodzinie = (a: Rezerwacja, b: Rezerwacja) => a.godzina_start.localeCompare(b.godzina_start);

// ── Harmonogram „Tydzień” (renderSchedule) ──────────────────

export type DzienHarmonogramu = { data: string; rezerwacje: Rezerwacja[] };

/**
 * Dni do pokazania w widoku „Tydzień”:
 * - bez szukania: każdy dzień od najstarszej do najnowszej rezerwacji (puste dni też — „Brak rezerwacji”),
 *   a gdy rezerwacji nie ma — od dziś do +1 miesiąca;
 * - przy szukaniu: tylko dni ze znalezionymi rezerwacjami.
 * Rezerwacje w dniu posortowane po godzinie.
 */
export function dniHarmonogramu(rezerwacje: Rezerwacja[], dzis: string, zapytanie = ''): DzienHarmonogramu[] {
  const szukanie = zapytanie.trim() !== '';
  const lista = szukanie ? rezerwacje.filter((r) => pasujeDoSzukania(r, zapytanie)) : rezerwacje;
  const mapa = new Map<string, Rezerwacja[]>();
  for (const r of lista) {
    const d = mapa.get(r.data_rezerwacji);
    if (d) d.push(r);
    else mapa.set(r.data_rezerwacji, [r]);
  }
  if (!szukanie) {
    const daty = [...mapa.keys()].sort();
    const min = daty.length ? daty[0] : dzis;
    const max = daty.length ? daty[daty.length - 1] : (() => {
      const d = zData(dzis);
      return dStr(new Date(d.getFullYear(), d.getMonth() + 1, d.getDate(), 12));
    })();
    for (let d = min; d <= max; d = dodajDni(d, 1)) {
      if (!mapa.has(d)) mapa.set(d, []);
    }
  }
  return [...mapa.keys()].sort().map((data) => ({ data, rezerwacje: [...mapa.get(data)!].sort(poGodzinie) }));
}

/** Rezerwacje jednego dnia, po godzinie (widok Dzień). */
export const rezerwacjeDnia = (rezerwacje: Rezerwacja[], ds: string) =>
  rezerwacje.filter((r) => r.data_rezerwacji === ds).sort(poGodzinie);

/** Pasek dni u góry: wczoraj … +13 dni, z kropką gdy są rezerwacje (renderWeekNav). */
export function pasekDni(rezerwacje: Rezerwacja[], dzis: string): { data: string; dzis: boolean; sa: boolean }[] {
  const zajete = new Set(rezerwacje.map((r) => r.data_rezerwacji));
  const wynik = [];
  for (let i = -1; i <= 13; i++) {
    const d = dodajDni(dzis, i);
    wynik.push({ data: d, dzis: i === 0, sa: zajete.has(d) });
  }
  return wynik;
}

// ── Teksty kart ─────────────────────────────────────────────

export const nazwaLokalizacji = (l: Lokalizacja) => (l === 'wolomin' ? 'Wołomin' : l === 'rembert' ? 'Rembertów' : 'SILT');

/** „Wołomin”/„Rembertów” dla Arsenału, „SILT” dla SILT (mini karta). */
export const etykietaMarki = (r: Pick<Rezerwacja, 'marka' | 'lokalizacja'>) =>
  r.marka === 'arsenal' ? (r.lokalizacja === 'wolomin' ? 'Wołomin' : 'Rembertów') : 'SILT';

/** Pierwsza linia karty: „P12 os · Jan Kowalski” (P = potwierdzona). Telefon dokleja ekran (jest klikalny). */
export const liniaKarty = (r: Rezerwacja) =>
  (r.status === 'potwierdzona' ? 'P' : '') + r.liczba_osob + ' os · ' + r.klient_imie_nazwisko;

/** Mini karta cudzej marki: „W10 os · ASG” (W = Wołomin). */
export const liniaMiniKarty = (r: Rezerwacja) =>
  (r.lokalizacja === 'wolomin' ? 'W' : '') + r.liczba_osob + ' os · ' + (r.atrakcja_nazwa ?? '');

/** Wpis w siatce miesiąca: „12os Jan” (imię = pierwsze słowo). */
export function wpisMiesiaca(r: Rezerwacja): string {
  const imie = r.klient_imie_nazwisko ? r.klient_imie_nazwisko.split(' ')[0] : '';
  return r.liczba_osob + 'os' + (imie ? ' ' + imie : '');
}

/** Nazwy dodatków rezerwacji (pomija nieznane id). */
export function nazwyDodatkow(ids: number[], nazwy: Record<string, string>): string[] {
  return ids.map((id) => nazwy[String(id)]).filter((n): n is string => !!n);
}

/**
 * Emoji dodatku na karcie — kolejność sprawdzania jak w PWA („kieł” przed „ognisk”, bo „Ognisko z kiełbaskami” = 🌭).
 * Nieznany dodatek → null (nie pokazujemy).
 */
export function emojiDodatku(nazwa: string): string | null {
  const n = nazwa.toLowerCase();
  if (n.includes('kieł') || n.includes('kielb')) return '🌭';
  if (n.includes('ognisk')) return '🔥';
  if (n.includes('wypoży') || n.includes('wypoz')) return '♨️';
  if (n.includes('catering')) return '🥩';
  if (n.includes('fotograficzna') || n.includes('foto')) return '📸';
  if (n.includes('nagło')) return '🔊';
  if (n.includes('dyplom')) return '📋';
  if (n.includes('puchar')) return '🏆';
  if (n.includes('gopro') || n.includes('kamery')) return '🎥';
  return null;
}

export const emojiDodatkow = (nazwy: string[]) => nazwy.map(emojiDodatku).filter(Boolean).join(' ');

/** Legenda: pierwsze dwa słowa nazwy atrakcji („Paintball Klasyczny 0,68 CAL” → „Paintball Klasyczny”). */
export const nazwaWLegendzie = (a: Atrakcja) => a.nazwa.split(' ').slice(0, 2).join(' ');

/** Ostatnia pozycja legendy: kolor cudzej marki. */
export const innaMarka = (marka: Marka) => (marka === 'silt' ? 'Arsenał' : 'SILT');

/** Ile nowych (z www, bez maila o zadatku) — znaczek przy filtrze. */
export const ileNowych = (rezerwacje: Rezerwacja[]) => rezerwacje.filter((r) => r.nowa).length;

/** Czy można zmieniać: własna marka i nie rola „podgląd” (canEdit z PWA). */
export const moznaEdytowac = (r: Rezerwacja, rola: 'pelny' | 'podglad') => r.wlasna && rola !== 'podglad';

// ── Filtr (lista w górnym pasku) ────────────────────────────

export const FILTRY = [
  { filtr: 'all', etykieta: 'Wszystkie', opcja: 'Wszystkie' },
  { filtr: 'new', etykieta: '🔔 Nowe', opcja: '🔔 Nowe rezerwacje' },
  { filtr: 'niedoszle', etykieta: '⚠ Niedoszłe', opcja: '⚠ Niedoszłe' },
  { filtr: 'silt', etykieta: 'SILT', opcja: 'Tylko SILT' },
  { filtr: 'arsenal', etykieta: 'ARSENAŁ', opcja: 'Tylko ARSENAŁ' },
  { filtr: 'rembert', etykieta: 'Rembertów', opcja: 'Arsenał · Rembertów' },
  { filtr: 'wolomin', etykieta: 'Wołomin', opcja: 'Arsenał · Wołomin' },
] as const;

/**
 * Filtr liczony w telefonie z pobranych danych (jak warunki w api.php) — zmiana filtra działa od razu, także bez zasięgu.
 * „Niedoszłe” to osobne pobranie z serwera (zwykła lista ich nie zawiera).
 */
export function filtruj(rezerwacje: Rezerwacja[], filtr: string): Rezerwacja[] {
  switch (filtr) {
    case 'silt':
      return rezerwacje.filter((r) => r.marka === 'silt');
    case 'arsenal':
      return rezerwacje.filter((r) => r.marka === 'arsenal');
    case 'rembert':
      return rezerwacje.filter((r) => r.marka === 'arsenal' && r.lokalizacja === 'rembert');
    case 'wolomin':
      return rezerwacje.filter((r) => r.marka === 'arsenal' && r.lokalizacja === 'wolomin');
    case 'new':
      return rezerwacje.filter((r) => r.nowa);
    default:
      return rezerwacje;
  }
}

// ── Dodatki (lista w formularzu) ────────────────────────────

export const dodatkiPoKolei = (d: Dodatek[]) => [...d].sort((a, b) => a.kolejnosc - b.kolejnosc);
