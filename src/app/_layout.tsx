import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  useFonts,
} from '@expo-google-fonts/dm-sans';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Aktualizacje } from '@/components/Aktualizacje';
import { Logowanie } from '@/components/Logowanie';
import { KomunikatyProvider } from '@/components/ui/Komunikaty';
import { C, Fonts } from '@/constants/theme';
import { DB_NAME, migruj } from '@/db/baza';
import { DaneProvider, useDane } from '@/stan/DaneProvider';
import '@/stan/zadanieTla'; // zadanie w tle (odświeżanie) — definiowane przy starcie
import { zainstalujLapacz, zglos } from '@/stan/zglos';

SplashScreen.preventAutoHideAsync();
zainstalujLapacz();

/**
 * Gdy ekran się wysypie: zamiast zamknięcia aplikacji — komunikat po polsku i „Spróbuj ponownie”.
 * Opis błędu zapisuje się w telefonie i przy internecie trafia na serwer (bledy.php).
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    zglos(error, { dopisek: 'Ekran' });
  }, [error]);
  return (
    <View style={styles.blad}>
      <Text style={styles.bladIko}>😕</Text>
      <Text style={styles.bladTytul}>Coś poszło nie tak</Text>
      <Text style={styles.bladTekst}>Rezerwacje są bezpieczne na serwerze. Opis błędu zapisał się i sam trafi do Michała.</Text>
      <Pressable onPress={retry} style={({ pressed }) => [styles.bladBtn, pressed && { opacity: 0.8 }]}>
        <Text style={styles.bladBtnTxt}>🔄 Spróbuj ponownie</Text>
      </Pressable>
    </View>
  );
}

function Nawigacja() {
  const { zalogowany } = useDane();
  useEffect(() => {
    if (zalogowany !== null) SplashScreen.hideAsync();
  }, [zalogowany]);
  if (zalogowany === null) return null;
  return (
    <>
      <StatusBar style="dark" />
      {zalogowany ? <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} /> : <Logowanie />}
      <Aktualizacje />
    </>
  );
}

export default function RootLayout() {
  const [czcionki] = useFonts({ DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold });
  if (!czcionki) return null;
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName={DB_NAME} onInit={migruj}>
        <DaneProvider>
          <KomunikatyProvider>
            <Nawigacja />
          </KomunikatyProvider>
        </DaneProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  blad: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14, backgroundColor: C.bg },
  bladIko: { fontSize: 56 },
  bladTytul: { fontFamily: Fonts.bold, fontSize: 22, color: C.text },
  bladTekst: { fontFamily: Fonts.regular, fontSize: 15, textAlign: 'center', maxWidth: 420, lineHeight: 22, color: C.text2 },
  bladBtn: { marginTop: 10, paddingVertical: 16, paddingHorizontal: 28, borderRadius: 12, backgroundColor: C.text },
  bladBtnTxt: { color: '#fff', fontFamily: Fonts.bold, fontSize: 16 },
});
