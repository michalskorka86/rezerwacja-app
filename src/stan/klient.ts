/**
 * Klient API z tokenem tego telefonu — jeden dla ekranów i zadania w tle.
 */

import { API_URL } from '@/constants/serwer';
import { utworzKlienta, type Klient } from '@/logika/klient';

import { token, WERSJA_APLIKACJI } from './sesja';

let naWylogowanie: () => void = () => {};

/** DaneProvider ustawia, co zrobić, gdy serwer każe zalogować się ponownie. */
export const ustawWylogowanie = (f: () => void) => {
  naWylogowanie = f;
};

export const klient: Klient = utworzKlienta({
  url: API_URL,
  wersja: WERSJA_APLIKACJI,
  token,
  naWylogowanie: () => naWylogowanie(),
});
