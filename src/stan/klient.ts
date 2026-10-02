/**
 * Klient API z tokenem tego telefonu — jeden dla ekranów i zadania w tle.
 */

import * as Updates from 'expo-updates';

import { API_URL } from '@/constants/serwer';
import { BladApi, utworzKlienta, type Klient } from '@/logika/klient';

import { token, WERSJA_APLIKACJI } from './sesja';

let naWylogowanie: () => void = () => {};

/** DaneProvider ustawia, co zrobić, gdy serwer każe zalogować się ponownie. */
export const ustawWylogowanie = (f: () => void) => {
  naWylogowanie = f;
};

const zwykly = utworzKlienta({
  url: API_URL,
  wersja: WERSJA_APLIKACJI,
  token,
  naWylogowanie: () => naWylogowanie(),
});

let aktualizujeSie = false;

/**
 * Serwer zablokował tę wersję (min. wersja w ustawieniach): pobierz aktualizację w powietrzu i przeładuj.
 * Gdy potrzebny jest nowy APK, pokazuje się pasek „📥 Jest nowa wersja aplikacji”; komunikat błędu mówi „Zaktualizuj aplikację”.
 */
async function zaktualizujPoBlokadzie() {
  if (aktualizujeSie || !Updates.isEnabled) return;
  aktualizujeSie = true;
  try {
    const s = await Updates.checkForUpdateAsync();
    if (s.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    }
  } catch {
    /* spróbujemy przy następnym zapisie */
  } finally {
    aktualizujeSie = false;
  }
}

export const klient: Klient = async (akcja, opcje) => {
  try {
    return await zwykly(akcja, opcje);
  } catch (e) {
    if (e instanceof BladApi && e.kod === 'stara_wersja') zaktualizujPoBlokadzie();
    throw e;
  }
};
