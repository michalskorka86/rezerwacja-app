/**
 * Typy danych z API (server/lib/*.php). Nazwy pól = kolumny bazy, jak w PWA.
 * Bez importów React Native — używane też w testach Node.
 */

export type Marka = 'silt' | 'arsenal';
export type Lokalizacja = 'silt' | 'rembert' | 'wolomin';
export type StatusRezerwacji = 'oczekuje_na_platnosc' | 'oczekujaca' | 'potwierdzona' | 'anulowana';
export type StatusZadatku = 'brak' | 'oczekuje' | 'oplacony';
export type Filtr = 'all' | 'new' | 'niedoszle' | 'silt' | 'arsenal' | 'rembert' | 'wolomin';

export type Uzytkownik = {
  id: number;
  imie: string;
  login: string;
  marka: Marka;
  rola: 'pelny' | 'podglad';
  rola_nazwa: 'admin' | 'instruktor';
  haslo_reset: boolean;
};

export type UstawieniaAplikacji = {
  min_wersja: string;
  inny_kolor: string;
  logo: string;
  sprzet_wynajem: string[];
  platnosci: string[];
};

export type Atrakcja = { id: number; nazwa: string; kolor: string; kolejnosc: number; tylko_panel: boolean };
export type Dodatek = {
  id: number;
  nazwa: string;
  cena_typ: 'stala' | 'os' | 'szt';
  cena: number;
  min_osob: number | null;
  opis_ceny: string;
  kolejnosc: number;
};

export type Rezerwacja = {
  id: number;
  klient_imie_nazwisko: string;
  klient_telefon: string;
  klient_email: string | null;
  marka: Marka;
  lokalizacja: Lokalizacja;
  atrakcja_id: number;
  liczba_osob: number;
  /** RRRR-MM-DD */
  data_rezerwacji: string;
  /** GG:MM:SS */
  godzina_start: string;
  godzina_koniec: string | null;
  uwagi: string | null;
  instrukcje: string | null;
  status: StatusRezerwacji;
  zadatek_status: StatusZadatku;
  zadatek_kwota: number;
  zadatek_data_oplacenia: string | null;
  dodana_przez: number | null;
  zrodlo: 'panel' | 'formularz_www';
  utworzona: string | null;
  zaktualizowana: string | null;
  sms_wyslany: boolean;
  mail_zadatek_wyslany: boolean;
  mail_potw_wyslany: boolean;
  atrakcja_nazwa: string | null;
  atrakcja_kolor: string | null;
  dodatki: number[];
  kolor_karty: string;
  wlasna: boolean;
  nowa: boolean;
};

export type Wynajem = {
  id: number;
  klient_imie_nazwisko: string;
  klient_telefon: string;
  data_wynajmu: string;
  data_zwrotu: string | null;
  kwota: number;
  zaplacono: boolean;
  zwrocono: boolean;
  sprzet: Record<string, number>;
  uwagi: string | null;
  dodane_przez: number | null;
  marka: Marka;
  utworzona: string | null;
  platnosc: 'Gotówka' | 'Przelew' | 'Karta';
  faktura_nazwa: string | null;
  faktura_nip: string | null;
  faktura_email: string | null;
  przeterminowany: boolean;
};

export type Zadanie = {
  id: number;
  tytul: string;
  opis: string | null;
  priorytet: 'pilne' | 'wazne' | 'normalne';
  dla_kogo: number;
  dodane_przez: number;
  termin: string | null;
  wykonane: boolean;
  wykonane_kiedy: string | null;
  utworzone: string | null;
  dla_imie: string;
  od_imie: string;
};

export type Osoba = { id: number; imie: string; marka: Marka };
