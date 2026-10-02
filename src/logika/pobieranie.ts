/**
 * Pobieranie danych z serwera do pamięci telefonu — używane przez ekran (przy starcie, co 30 s, po powrocie)
 * i przez zadanie w tle. Bez importów React Native — testy w Node.
 */

import { czytajPamiec, zapiszPamiec, type Baza } from '../db/baza';
import { dzisStr, zakresPobierania } from './daty';
import type { Klient } from './klient';
import type { Atrakcja, Dodatek, Rezerwacja, Uzytkownik, UstawieniaAplikacji } from './typy';

export type DaneSlownikowe = { atrakcje: Atrakcja[]; dodatki: Dodatek[]; nazwy_dodatkow: Record<string, string> };
export type DaneKonta = { uzytkownik: Uzytkownik; ustawienia: UstawieniaAplikacji };
export type Licznik = { nowe: number; zadania: number };

export type Stan = {
  konto: DaneKonta | null;
  slowniki: DaneSlownikowe | null;
  rezerwacje: Rezerwacja[];
  licznik: Licznik;
  /** kiedy ostatnio udało się pobrać rezerwacje (ISO) */
  pobrano: string | null;
};

export const PUSTY_STAN: Stan = { konto: null, slowniki: null, rezerwacje: [], licznik: { nowe: 0, zadania: 0 }, pobrano: null };

/** Stan z pamięci telefonu (od razu po starcie, bez czekania na internet). */
export async function wczytajZPamieci(db: Baza): Promise<Stan> {
  const [konto, slowniki, rez, licznik] = await Promise.all([
    czytajPamiec<DaneKonta>(db, 'konto'),
    czytajPamiec<DaneSlownikowe>(db, 'slowniki'),
    czytajPamiec<Rezerwacja[]>(db, 'rezerwacje'),
    czytajPamiec<Licznik>(db, 'licznik'),
  ]);
  return {
    konto: konto?.wartosc ?? null,
    slowniki: slowniki?.wartosc ?? null,
    rezerwacje: rez?.wartosc ?? [],
    licznik: licznik?.wartosc ?? { nowe: 0, zadania: 0 },
    pobrano: rez?.czas ?? null,
  };
}

/**
 * Pobiera wszystko z serwera i zapisuje w telefonie. Konto i słowniki rzadziej (pelne = true),
 * rezerwacje i licznik — przy każdym odświeżeniu. Rzuca BladApi (np. brak sieci) — stan w pamięci zostaje.
 */
export async function pobierzZSerwera(db: Baza, klient: Klient, pelne: boolean, dzis = dzisStr()): Promise<Partial<Stan>> {
  const { od, do: doDnia } = zakresPobierania(dzis);
  const [konto, slowniki, rez, licznik] = await Promise.all([
    pelne ? klient<DaneKonta & { ok: true }>('ja') : Promise.resolve(null),
    pelne ? klient<DaneSlownikowe & { ok: true }>('dane') : Promise.resolve(null),
    klient<{ rezerwacje: Rezerwacja[] }>('rezerwacje', { parametry: { od, do: doDnia } }),
    klient<Licznik & { ok: true }>('licznik'),
  ]);
  const wynik: Partial<Stan> = {
    rezerwacje: rez.rezerwacje,
    licznik: { nowe: licznik.nowe, zadania: licznik.zadania },
    pobrano: new Date().toISOString(),
  };
  await zapiszPamiec(db, 'rezerwacje', rez.rezerwacje);
  await zapiszPamiec(db, 'licznik', wynik.licznik);
  if (konto) {
    wynik.konto = { uzytkownik: konto.uzytkownik, ustawienia: konto.ustawienia };
    await zapiszPamiec(db, 'konto', wynik.konto);
  }
  if (slowniki) {
    wynik.slowniki = { atrakcje: slowniki.atrakcje, dodatki: slowniki.dodatki, nazwy_dodatkow: slowniki.nazwy_dodatkow };
    await zapiszPamiec(db, 'slowniki', wynik.slowniki);
  }
  return wynik;
}

/** Podmiana jednej rezerwacji po zmianie (zadatek, edycja…) — bez czekania na pełne odświeżenie. */
export function podmienRezerwacje(lista: Rezerwacja[], r: Rezerwacja): Rezerwacja[] {
  const i = lista.findIndex((x) => x.id === r.id);
  if (i < 0) return [...lista, r];
  const nowa = [...lista];
  nowa[i] = r;
  return nowa;
}
