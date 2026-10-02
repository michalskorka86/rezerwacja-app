import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, Fonts } from '@/constants/theme';
import { ustawEkran } from '@/stan/zglos';

import { WarstwaKomunikatow } from './Komunikaty';

type ArkuszApi = { naGore: () => void; ustawWstecz: (f: (() => void) | null) => void };
const ArkuszKontekst = createContext<ArkuszApi | null>(null);

/**
 * Dla ekranów wewnątrz arkusza (np. formularz wynajmu na miejscu listy): po otwarciu przewija arkusz na górę,
 * a przycisk Wstecz w telefonie woła `wstecz` (np. „← wróć do listy”) zamiast zamykać cały arkusz.
 */
export function usePodstronaArkusza(wstecz: () => void) {
  const api = useContext(ArkuszKontekst);
  useEffect(() => {
    api?.naGore();
  }, [api]);
  useEffect(() => {
    api?.ustawWstecz(wstecz);
    return () => api?.ustawWstecz(null);
  }, [api, wstecz]);
}

/**
 * Arkusz od dołu jak .sheet w PWA: przyciemnione tło, zaokrąglona góra, nagłówek z tytułem i ✕.
 * Zamykanie: ✕, dotknięcie tła albo Wstecz w telefonie — BEZ przeciągania w dół (tak ustalono w PWA).
 */
export function Arkusz({
  widoczny,
  onZamknij,
  tytul,
  nazwa,
  children,
  zamknijTekst = '✕',
  bezPaddingu,
  wysokosc = 0.92,
  stopka,
  bezNaglowka,
}: {
  widoczny: boolean;
  onZamknij: () => void;
  tytul?: ReactNode;
  /** nazwa okna do zgłoszeń błędów (np. 'szczegoly') */
  nazwa?: string;
  children: ReactNode;
  /** tekst przycisku zamknięcia (np. „Gotowe” w dodatkach) */
  zamknijTekst?: string;
  bezPaddingu?: boolean;
  /** największa wysokość jako część ekranu (92vh w PWA, 96–98vh przy Wynajmie/Zadaniach) */
  wysokosc?: number;
  /** stały pasek na dole (np. przycisk Zapisz) */
  stopka?: ReactNode;
  bezNaglowka?: boolean;
}) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [pokaz, setPokaz] = useState(widoczny);
  const [anim] = useState(() => new Animated.Value(0));
  // otwarcie: od razu w tym samym renderze (zamknięcie czeka na koniec animacji)
  if (widoczny && !pokaz) setPokaz(true);
  const przewijanie = useRef<ScrollView>(null);
  const wstecz = useRef<(() => void) | null>(null);
  const [api] = useState<ArkuszApi>(() => ({
    naGore: () => przewijanie.current?.scrollTo({ y: 0, animated: false }),
    ustawWstecz: (f) => {
      wstecz.current = f;
    },
  }));

  useEffect(() => {
    if (widoczny) {
      if (nazwa) ustawEkran(nazwa);
      Animated.timing(anim, { toValue: 1, duration: 300, easing: Easing.bezier(0.32, 0.72, 0, 1), useNativeDriver: true }).start();
    } else {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setPokaz(false));
    }
  }, [widoczny, anim, nazwa]);

  if (!pokaz) return null;
  const przesun = anim.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });

  return (
    <Modal visible transparent animationType="none" onRequestClose={() => (wstecz.current ? wstecz.current() : onZamknij())} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.tlo, { opacity: anim }]}>
          <Pressable style={styles.flex} onPress={onZamknij} accessibilityLabel="Zamknij" />
        </Animated.View>
        <Animated.View
          style={[styles.arkusz, { maxHeight: height * wysokosc, transform: [{ translateY: przesun }], paddingBottom: stopka ? 0 : insets.bottom }]}>
          {bezNaglowka ? null : (
            <View style={styles.hdr}>
              {typeof tytul === 'string' || tytul === undefined ? (
                <Text style={styles.tytul} numberOfLines={1}>
                  {tytul}
                </Text>
              ) : (
                <View style={styles.flex}>{tytul}</View>
              )}
              <Zamknij tekst={zamknijTekst} onPress={onZamknij} />
            </View>
          )}
          <ScrollView
            ref={przewijanie}
            style={styles.scroll}
            contentContainerStyle={bezPaddingu ? { paddingBottom: 40 } : styles.body}
            keyboardShouldPersistTaps="handled">
            <ArkuszKontekst.Provider value={api}>{children}</ArkuszKontekst.Provider>
          </ScrollView>
          {stopka ? <View style={[styles.stopka, { paddingBottom: 10 + insets.bottom }]}>{stopka}</View> : null}
        </Animated.View>
        <WarstwaKomunikatow />
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Okrągły przycisk ✕ (.sheet-close) albo tekstowy („Gotowe”). */
export function Zamknij({ tekst = '✕', onPress, style }: { tekst?: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const okragly = tekst === '✕';
  return (
    <Pressable
      onPress={onPress}
      hitSlop={14}
      accessibilityRole="button"
      accessibilityLabel={okragly ? 'Zamknij' : tekst}
      style={({ pressed }) => [okragly ? styles.zamknij : styles.zamknijTekst, pressed && { opacity: 0.6 }, style]}>
      <Text style={[styles.zamknijTxt, !okragly && { color: C.text, fontFamily: Fonts.semibold }]}>{tekst}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tlo: { backgroundColor: 'rgba(0,0,0,0.35)' },
  arkusz: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
  },
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tytul: { flex: 1, fontFamily: Fonts.semibold, fontSize: 16, letterSpacing: -0.3, color: C.text },
  scroll: { flexGrow: 0 },
  body: { paddingTop: 14, paddingHorizontal: 16, paddingBottom: 80 },
  stopka: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.surface },
  zamknij: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  zamknijTekst: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, backgroundColor: C.bg },
  zamknijTxt: { fontSize: 15, color: C.text2, fontFamily: Fonts.medium },
});
