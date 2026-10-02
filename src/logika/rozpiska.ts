/**
 * Rozpiski dnia dla Arsenału — port oblicz_sprzet() z pdf_dzien.php.
 * Liczone w telefonie z pobranych rezerwacji (działa też bez zasięgu). Bez importów React Native — testy w Node.
 */

import type { Rezerwacja } from './typy';

export type PozycjaSprzetu = { atrakcja: string; grup: number; max_osob: number; osob_lacznie: number };

const minuty = (t: string) => {
  const [h, m] = t.split(':');
  return (parseInt(h || '0', 10) || 0) * 60 + (parseInt(m || '0', 10) || 0);
};

/**
 * Sprzęt na dzień: dla każdej atrakcji największa liczba graczy NA RAZ (gra trwa 3 h od startu, jak w PWA),
 * liczba grup i osób łącznie. Koniec jednej gry o tej samej minucie co start następnej — sprzęt już wolny.
 * Posortowane po nazwie atrakcji.
 */
export function obliczSprzet(rezerwacje: Rezerwacja[]): PozycjaSprzetu[] {
  const grupy = new Map<number, Rezerwacja[]>();
  for (const r of rezerwacje) {
    const g = grupy.get(r.atrakcja_id);
    if (g) g.push(r);
    else grupy.set(r.atrakcja_id, [r]);
  }
  const wynik: PozycjaSprzetu[] = [];
  for (const lista of grupy.values()) {
    const zdarzenia: { t: number; os: number; start: boolean }[] = [];
    for (const r of lista) {
      const t = minuty(r.godzina_start);
      zdarzenia.push({ t, os: r.liczba_osob, start: true }, { t: t + 180, os: r.liczba_osob, start: false });
    }
    zdarzenia.sort((a, b) => (a.t !== b.t ? a.t - b.t : a.start === b.start ? 0 : a.start ? 1 : -1));
    let teraz = 0;
    let max = 0;
    for (const z of zdarzenia) {
      teraz += z.start ? z.os : -z.os;
      if (teraz > max) max = teraz;
    }
    wynik.push({
      atrakcja: lista[0].atrakcja_nazwa ?? 'Nieznana',
      grup: lista.length,
      max_osob: max,
      osob_lacznie: lista.reduce((s, r) => s + r.liczba_osob, 0),
    });
  }
  return wynik.sort((a, b) => (a.atrakcja < b.atrakcja ? -1 : a.atrakcja > b.atrakcja ? 1 : 0));
}

/** Rezerwacje Arsenału na dzień do rozpiski: lokalizacja 'all' | 'rembert' | 'wolomin'. */
export function rezerwacjeRozpiski(rezerwacje: Rezerwacja[], data: string, lok: 'all' | 'rembert' | 'wolomin'): Rezerwacja[] {
  return rezerwacje
    .filter((r) => r.marka === 'arsenal' && r.data_rezerwacji === data && (lok === 'all' || r.lokalizacja === lok))
    .sort((a, b) => a.godzina_start.localeCompare(b.godzina_start));
}
