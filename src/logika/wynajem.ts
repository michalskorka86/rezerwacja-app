/**
 * Wynajem sprzętu — logika z renderWynajemLista / renderWynajemForm / zapiszWynajem w PWA.
 * Bez importów React Native — testy w Node.
 */

import type { Marka, Wynajem } from './typy';

export type FiltrStatusu = 'aktywne' | 'zwrocone' | 'wszystkie';
export type FiltrMarki = 'wszystkie' | 'silt' | 'arsenal';

/** Filtry jak w PWA, liczone w telefonie (lista pobierana raz, działa też bez zasięgu). Najnowsze na górze. */
export function filtrujWynajmy(lista: Wynajem[], status: FiltrStatusu, marka: FiltrMarki): Wynajem[] {
  return lista
    .filter((w) => (status === 'aktywne' ? !w.zwrocono : status === 'zwrocone' ? w.zwrocono : true))
    .filter((w) => (marka === 'wszystkie' ? true : w.marka === marka))
    .sort((a, b) => (a.data_wynajmu === b.data_wynajmu ? b.id - a.id : a.data_wynajmu < b.data_wynajmu ? 1 : -1));
}

/** „10× Maska · 4× ASG” (lista) albo z przecinkami (obrazek). */
export function tekstSprzetu(sprzet: Record<string, number>, sep = ' · '): string {
  return Object.entries(sprzet ?? {})
    .filter(([, n]) => n > 0)
    .map(([nazwa, n]) => `${n}× ${nazwa}`)
    .join(sep);
}

/** Status jak w PWA: zwrócony (zielony), przeterminowany (różowy), niezwrócony (pomarańczowy). */
export function statusWynajmu(w: Pick<Wynajem, 'zwrocono' | 'przeterminowany'>): { tekst: string; tlo: string; kolor: string } {
  if (w.zwrocono) return { tekst: '✓ Zwrócony', tlo: '#e8f5e9', kolor: '#2C6E3F' };
  if (w.przeterminowany) return { tekst: '⚠ Przeterminowany', tlo: '#fce4ec', kolor: '#880e4f' };
  return { tekst: 'Niezwrócony', tlo: '#fff3e0', kolor: '#e65100' };
}

/** „350 zł” — kwota bez groszy jak w PWA (toFixed(0)). */
export const kwotaZl = (k: number) => `${Math.round(k)} zł`;

export type StanWynajmu = {
  imie: string;
  telefon: string;
  dataWynajmu: string | null;
  dataZwrotu: string | null;
  sprzet: Record<string, number>;
  /** z klawiatury aplikacji, przecinek dziesiętny */
  kwota: string;
  platnosc: 'Gotówka' | 'Przelew' | 'Karta';
  zaplacono: boolean;
  zwrocono: boolean;
  fakturaNazwa: string;
  fakturaNip: string;
  fakturaEmail: string;
  uwagi: string;
};

export function nowyWynajem(dzis: string): StanWynajmu {
  return {
    imie: '',
    telefon: '',
    dataWynajmu: dzis,
    dataZwrotu: null,
    sprzet: {},
    kwota: '',
    platnosc: 'Gotówka',
    zaplacono: false,
    zwrocono: false,
    fakturaNazwa: '',
    fakturaNip: '',
    fakturaEmail: '',
    uwagi: '',
  };
}

export function wynajemDoEdycji(w: Wynajem): StanWynajmu {
  return {
    imie: w.klient_imie_nazwisko ?? '',
    telefon: w.klient_telefon ?? '',
    dataWynajmu: w.data_wynajmu,
    dataZwrotu: w.data_zwrotu,
    sprzet: { ...(w.sprzet ?? {}) },
    kwota: w.kwota ? String(w.kwota).replace('.', ',') : '',
    platnosc: w.platnosc ?? 'Gotówka',
    zaplacono: w.zaplacono,
    zwrocono: w.zwrocono,
    fakturaNazwa: w.faktura_nazwa ?? '',
    fakturaNip: w.faktura_nip ?? '',
    fakturaEmail: w.faktura_email ?? '',
    uwagi: w.uwagi ?? '',
  };
}

/** − / + przy sprzęcie (nie mniej niż 0, zera usuwane). */
export function zmienIlosc(sprzet: Record<string, number>, nazwa: string, o: number): Record<string, number> {
  const n = Math.max(0, (sprzet[nazwa] ?? 0) + o);
  const wynik = { ...sprzet };
  if (n === 0) delete wynik[nazwa];
  else wynik[nazwa] = n;
  return wynik;
}

/** Pierwszy błąd (jak PWA: imię, telefon, data wynajmu wymagane) albo null. */
export function bladWynajmu(s: StanWynajmu): string | null {
  if (!s.imie.trim() || !s.telefon.trim() || !s.dataWynajmu) return 'Wypełnij wymagane pola';
  if (!/^\+?[0-9 \-]{6,20}$/.test(s.telefon.trim())) return 'Zły numer telefonu';
  if (s.dataZwrotu && s.dataZwrotu < s.dataWynajmu) return 'Zwrot nie może być przed datą wynajmu';
  if (s.kwota && !/^\d{1,6}(,\d{1,2})?$/.test(s.kwota)) return 'Zła kwota';
  const e = s.fakturaEmail.trim();
  if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return 'Zły e-mail do faktury';
  return null;
}

/** Dane do API (wynajem_dodaj / wynajem_edytuj). */
export function daneWynajmu(s: StanWynajmu, id?: number): Record<string, unknown> {
  return {
    ...(id ? { id } : {}),
    imie_nazwisko: s.imie.trim(),
    telefon: s.telefon.trim(),
    data_wynajmu: s.dataWynajmu ?? '',
    data_zwrotu: s.dataZwrotu ?? '',
    kwota: s.kwota ? s.kwota.replace(',', '.') : '0',
    platnosc: s.platnosc,
    zaplacono: s.zaplacono,
    zwrocono: s.zwrocono,
    sprzet: s.sprzet,
    faktura_nazwa: s.fakturaNazwa.trim(),
    faktura_nip: s.fakturaNip.trim(),
    faktura_email: s.fakturaEmail.trim(),
    uwagi: s.uwagi,
  };
}

/** Zmieniać można wynajmy swojej marki, nie w roli „podgląd” (serwer i tak to sprawdza). */
export const moznaZmieniacWynajem = (w: Wynajem, marka: Marka, rola: 'pelny' | 'podglad') => rola !== 'podglad' && w.marka === marka;
