/**
 * Formularz rezerwacji (dodaj / edytuj / kopiuj) — logika z renderAddForm, openEdit, kopiujRez i saveRez w PWA.
 * Bez importów React Native — testy w Node.
 */

import { formatGodz } from './daty';
import type { Lokalizacja, Marka, Rezerwacja } from './typy';

export type TrybFormularza = { rodzaj: 'nowa' } | { rodzaj: 'edycja'; r: Rezerwacja } | { rodzaj: 'kopia'; r: Rezerwacja };

export type StanFormularza = {
  /** liczba osób jako tekst z klawiatury aplikacji ('' = nie wpisano) */
  osoby: string;
  potwierdzona: boolean;
  imie: string;
  telefon: string;
  email: string;
  /** RRRR-MM-DD albo null */
  data: string | null;
  /** GG:MM albo null */
  od: string | null;
  do: string | null;
  atrakcjaId: number | null;
  dodatki: number[];
  zadatek: boolean;
  uwagi: string;
  instrukcje: string;
  /** Arsenał: rembert / wolomin; SILT: silt */
  lokalizacja: Lokalizacja | null;
};

export function pustyFormularz(marka: Marka): StanFormularza {
  return {
    osoby: '',
    potwierdzona: false,
    imie: '',
    telefon: '',
    email: '',
    data: null,
    od: null,
    do: null,
    atrakcjaId: null,
    dodatki: [],
    zadatek: false,
    uwagi: '',
    instrukcje: '',
    lokalizacja: marka === 'silt' ? 'silt' : null,
  };
}

/**
 * Stan na start: nowa — pusty; edycja — wszystko z rezerwacji;
 * kopia — jak PWA: dane klienta, osoby, atrakcja, dodatki, uwagi i instrukcje, ale BEZ daty i zadatku (do wybrania na nowo).
 */
export function stanPoczatkowy(tryb: TrybFormularza, marka: Marka): StanFormularza {
  if (tryb.rodzaj === 'nowa') return pustyFormularz(marka);
  const r = tryb.r;
  const wspolne = {
    osoby: r.liczba_osob ? String(r.liczba_osob) : '',
    imie: r.klient_imie_nazwisko ?? '',
    telefon: r.klient_telefon ?? '',
    email: r.klient_email ?? '',
    atrakcjaId: r.atrakcja_id || null,
    dodatki: [...r.dodatki],
    uwagi: r.uwagi ?? '',
    instrukcje: r.instrukcje ?? '',
    lokalizacja: (r.marka === 'silt' ? 'silt' : r.lokalizacja === 'wolomin' ? 'wolomin' : 'rembert') as Lokalizacja,
  };
  if (tryb.rodzaj === 'kopia') {
    return { ...pustyFormularz(marka), ...wspolne };
  }
  return {
    ...wspolne,
    potwierdzona: r.status === 'potwierdzona',
    data: r.data_rezerwacji,
    od: r.godzina_start ? formatGodz(r.godzina_start) : null,
    do: r.godzina_koniec ? formatGodz(r.godzina_koniec) : null,
    zadatek: r.zadatek_status === 'oplacony',
  };
}

/** Tytuł arkusza jak w PWA. */
export function tytulFormularza(tryb: TrybFormularza, lok: Lokalizacja | null): string {
  if (tryb.rodzaj === 'edycja') return 'Edytuj rezerwację';
  if (tryb.rodzaj === 'kopia') return '📋 Kopia rezerwacji';
  if (lok === 'wolomin') return 'Nowa rezerwacja · Wołomin';
  if (lok === 'rembert') return 'Nowa rezerwacja · Rembertów';
  return 'Nowa rezerwacja · SILT';
}

/** Godziny do wyboru: 7:00 … 22:30 co pół godziny (siatka z PWA). */
export function godzinyDoWyboru(): string[] {
  const w: string[] = [];
  for (let h = 7; h <= 22; h++) for (const m of ['00', '30']) w.push(`${h < 10 ? '0' + h : h}:${m}`);
  return w;
}

/** Przełączenie dodatku na liście (dodaj / usuń). */
export const przelaczDodatek = (lista: number[], id: number) => (lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]);

/**
 * Sprawdzenie przed wysłaniem — pierwszy błąd jako komunikat po polsku (albo null).
 * Jak PWA: data wymagana; dodatkowo godzina rozpoczęcia (serwer jej wymaga) i lokalizacja dla Arsenału.
 * Godzina końca nie wcześniej niż początek.
 */
export function bladFormularza(s: StanFormularza, marka: Marka): string | null {
  if (marka === 'arsenal' && s.lokalizacja !== 'rembert' && s.lokalizacja !== 'wolomin') return 'Wybierz lokalizację';
  if (!s.data) return 'Wybierz datę';
  if (!s.od) return 'Wybierz godzinę rozpoczęcia';
  if (s.do && s.do <= s.od) return 'Godzina zakończenia musi być późniejsza niż rozpoczęcia';
  if (s.osoby && !/^\d{1,4}$/.test(s.osoby)) return 'Zła liczba osób';
  const tel = s.telefon.trim();
  if (tel && !/^\+?[0-9 \-]{6,20}$/.test(tel)) return 'Zły numer telefonu';
  const email = s.email.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Zły adres e-mail';
  return null;
}

/** Dane do API (rezerwacja_dodaj / rezerwacja_edytuj) — nazwy pól jak w PWA. */
export function daneDoWyslania(s: StanFormularza, id?: number): Record<string, unknown> {
  return {
    ...(id ? { id } : {}),
    imie_nazwisko: s.imie.trim(),
    telefon: s.telefon.trim(),
    email: s.email.trim(),
    data: s.data ?? '',
    godzina_start: s.od ?? '',
    godzina_koniec: s.do ?? '',
    liczba_osob: s.osoby ? parseInt(s.osoby, 10) : 0,
    atrakcja_id: s.atrakcjaId ?? 0,
    dodatki: s.dodatki,
    uwagi: s.uwagi,
    instrukcje: s.instrukcje,
    potwierdzona: s.potwierdzona,
    zadatek: s.zadatek,
    lokalizacja: s.lokalizacja ?? '',
  };
}

/** Czy coś wpisano — wtedy zamknięcie pyta „Zamknąć bez zapisywania?”. Sam wybór lokalizacji się nie liczy. */
export function czyZmieniony(s: StanFormularza, poczatek: StanFormularza): boolean {
  return JSON.stringify({ ...s, lokalizacja: null }) !== JSON.stringify({ ...poczatek, lokalizacja: null });
}
