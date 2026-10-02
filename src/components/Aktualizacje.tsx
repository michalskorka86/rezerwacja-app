import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { AppState, Linking, Pressable, StyleSheet, Text } from 'react-native';

import { APK_URL } from '@/constants/serwer';
import { C, Fonts, Size } from '@/constants/theme';

/** Po ilu minutach w tle wolno po cichu przeładować aplikację z nową wersją (nikt nie jest w trakcie wpisywania). */
const PO_PRZERWIE_MS = 10 * 60 * 1000;

/**
 * Aktualizacje „w powietrzu” (EAS Update): poprawki ekranów bez instalowania APK.
 * - przy starcie aplikacja sama pobiera nową wersję w tle (włączy się przy następnym starcie),
 * - po powrocie do aplikacji po co najmniej 10 min przerwy: sprawdza, pobiera i od razu przeładowuje.
 * Nowy APK jest potrzebny tylko przy zmianie modułów systemowych (wtedy pasek „Jest nowa wersja”).
 */
export function Aktualizacje() {
  useEffect(() => {
    if (!Updates.isEnabled) return;
    let wTle: number | null = null;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') wTle = Date.now();
      else if (s === 'active' && wTle !== null) {
        const przerwa = Date.now() - wTle;
        wTle = null;
        if (przerwa >= PO_PRZERWIE_MS) pobierzIPrzeladuj().catch(() => {});
      }
    });
    return () => sub.remove();
  }, []);
  return null;
}

/** Sprawdza i pobiera nową wersję. Zwraca: 'brak' | 'pobrano' (i przeładowuje) | 'niedostepne'. */
export async function pobierzIPrzeladuj(): Promise<'brak' | 'pobrano' | 'niedostepne'> {
  if (!Updates.isEnabled) return 'niedostepne';
  const s = await Updates.checkForUpdateAsync();
  if (!s.isAvailable) return 'brak';
  await Updates.fetchUpdateAsync();
  await Updates.reloadAsync();
  return 'pobrano';
}

/** „0.1.0 · aktualizacja z 2.10, 15:50” (albo „wersja z instalacji”). */
export function opisWersji(wersja: string): string {
  if (!Updates.isEnabled) return wersja;
  if (Updates.isEmbeddedLaunch || !Updates.createdAt) return `${wersja} · wersja z instalacji`;
  return `${wersja} · aktualizacja z ${Updates.createdAt.toLocaleString('pl-PL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
}

// ── Nowy APK (gdy doszły moduły systemowe) ──────────────────

type InfoApk = { runtimeVersion: string; numer: number; data: string; opis: string };

const CO_MS = 6 * 60 * 60 * 1000;
let ostatnio = 0;
let wynik: InfoApk | null = null;

/** Porównuje „odcisk” modułów zainstalowanej aplikacji z najnowszym APK na GitHubie (przez apk.php?info). */
async function sprawdzApk(): Promise<InfoApk | null> {
  if (!Updates.isEnabled || !Updates.runtimeVersion) return null;
  if (Date.now() - ostatnio < CO_MS) return wynik;
  try {
    const r = await fetch(`${APK_URL}?info`, { headers: { Accept: 'application/json' } });
    const j = (await r.json()) as InfoApk & { ok?: boolean };
    ostatnio = Date.now();
    wynik = j.ok && j.runtimeVersion && j.runtimeVersion !== Updates.runtimeVersion ? j : null;
  } catch {
    /* bez zasięgu — sprawdzimy następnym razem */
  }
  return wynik;
}

/** Pasek nad kalendarzem: „📥 Jest nowa wersja aplikacji” — dotknięcie pobiera APK. */
export function PasekNowejWersji() {
  const [info, setInfo] = useState<InfoApk | null>(wynik);
  useEffect(() => {
    let aktywny = true;
    const odswiez = () => {
      sprawdzApk().then((w) => aktywny && setInfo(w));
    };
    odswiez();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && odswiez());
    return () => {
      aktywny = false;
      sub.remove();
    };
  }, []);
  if (!info) return null;
  const kiedy = info.data ? ` z ${new Date(info.data).toLocaleDateString('pl-PL', { day: 'numeric', month: 'numeric' })}` : '';
  return (
    <Pressable onPress={() => Linking.openURL(APK_URL)} style={({ pressed }) => [styles.pasek, pressed && { opacity: 0.8 }]}>
      <Text style={styles.tytul}>📥 Jest nowa wersja aplikacji</Text>
      <Text style={styles.opis}>
        Wersja nr {info.numer}
        {kiedy}
        {info.opis ? ` — ${info.opis}` : ''}. Dotknij, aby pobrać, potem otwórz pobrany plik i wybierz „Zainstaluj”.
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pasek: { marginHorizontal: 8, marginTop: 8, borderWidth: 1.5, borderColor: C.green, backgroundColor: C.greenL, borderRadius: Size.rs, padding: 12, gap: 3 },
  tytul: { fontFamily: Fonts.bold, fontSize: 14, color: C.green },
  opis: { fontFamily: Fonts.regular, fontSize: 12, color: C.text2, lineHeight: 17 },
});
