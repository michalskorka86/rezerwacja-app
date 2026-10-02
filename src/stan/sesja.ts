/**
 * Sesja telefonu: token logowania w bezpiecznym schowku (SecureStore — nie w zwykłej pamięci),
 * stały identyfikator urządzenia i model (do zgłoszeń błędów i listy zalogowanych telefonów).
 */

import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KLUCZ_TOKEN = 'rez_token';
const KLUCZ_URZADZENIE = 'rez_urzadzenie';

export const WERSJA_APLIKACJI = Constants.expoConfig?.version ?? '0.0.0';

export const MODEL =
  Platform.OS === 'android'
    ? `${(Platform.constants as { Brand?: string }).Brand ?? ''} ${(Platform.constants as { Model?: string }).Model ?? ''}`.trim()
    : Platform.OS;

// SecureStore nie działa w przeglądarce (podgląd na komputerze) — tam zwykły localStorage
const web = Platform.OS === 'web';
const czytaj = async (k: string) => (web ? globalThis.localStorage?.getItem(k) ?? null : SecureStore.getItemAsync(k));
const zapisz = async (k: string, v: string) => (web ? globalThis.localStorage?.setItem(k, v) : SecureStore.setItemAsync(k, v));
const usun = async (k: string) => (web ? globalThis.localStorage?.removeItem(k) : SecureStore.deleteItemAsync(k));

let tokenWPamieci: string | null | undefined;

export async function token(): Promise<string | null> {
  if (tokenWPamieci === undefined) tokenWPamieci = await czytaj(KLUCZ_TOKEN);
  return tokenWPamieci;
}

export async function ustawToken(t: string | null): Promise<void> {
  tokenWPamieci = t;
  if (t) await zapisz(KLUCZ_TOKEN, t);
  else await usun(KLUCZ_TOKEN);
}

let urzadzenieWPamieci: string | null = null;

/** Losowy identyfikator telefonu, nadany przy pierwszym uruchomieniu. */
export async function idUrzadzenia(): Promise<string> {
  if (urzadzenieWPamieci) return urzadzenieWPamieci;
  let id = await czytaj(KLUCZ_URZADZENIE);
  if (!id) {
    id = 'tel-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    await zapisz(KLUCZ_URZADZENIE, id);
  }
  urzadzenieWPamieci = id;
  return id;
}
