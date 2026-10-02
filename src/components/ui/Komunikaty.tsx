import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, cien, Fonts, Size } from '@/constants/theme';

type Pytanie = {
  tytul: string;
  tekst?: string;
  /** napis na przycisku działania, np. „Usuń” */
  ok: string;
  /** czerwony przycisk przy usuwaniu / wylogowaniu */
  niebezpieczne?: boolean;
  onOk: () => void;
};

type Ctx = {
  /** Krótki komunikat na dole (toast z PWA), znika sam po 2,5 s. */
  toast: (tekst: string) => void;
  /** Okno „Na pewno?” z dużymi przyciskami Anuluj / działanie (zamiast confirm() z PWA). */
  zapytaj: (p: Pytanie) => void;
  /** Czerwony pasek błędu nad przyciskiem dodawania (showErrorBar z PWA); null = ukryj. */
  pasekBledu: (tekst: string | null) => void;
};

const Kontekst = createContext<Ctx>({
  toast: () => {},
  zapytaj: () => {},
  pasekBledu: () => {},
});
export const useKomunikaty = () => useContext(Kontekst);

/** Treść toastu i paska błędu — osobno, żeby otwarte arkusze (osobne okna) też mogły je pokazać. */
const Warstwa = createContext<{
  tekst: string;
  op: Animated.Value | null;
  blad: string | null;
}>({ tekst: '', op: null, blad: null });

/**
 * Toast i pasek błędu. Jest w głównym oknie i w każdym arkuszu — inaczej komunikat chowałby się pod otwartym arkuszem.
 */
export function WarstwaKomunikatow() {
  const { tekst, op, blad } = useContext(Warstwa);
  const insets = useSafeAreaInsets();
  if (!op) return null;
  return (
    <>
      {blad ? (
        <View pointerEvents="none" style={[styles.bladWrap, { bottom: 80 + insets.bottom }]}>
          <Text style={styles.blad}>{blad}</Text>
        </View>
      ) : null}
      <View pointerEvents="none" style={[styles.toastWrap, { bottom: 90 + insets.bottom }]}>
        <Animated.View style={[styles.toast, { opacity: op }]}>
          <Text style={styles.toastTxt}>{tekst}</Text>
        </Animated.View>
      </View>
    </>
  );
}

export function KomunikatyProvider({ children }: { children: ReactNode }) {
  const [tekst, setTekst] = useState('');
  const [pytanie, setPytanie] = useState<Pytanie | null>(null);
  const [blad, setBlad] = useState<string | null>(null);
  const [op] = useState(() => new Animated.Value(0));
  const zegar = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback(
    (t: string) => {
      setTekst(t);
      if (zegar.current) clearTimeout(zegar.current);
      Animated.timing(op, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      zegar.current = setTimeout(
        () =>
          Animated.timing(op, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(),
        2500,
      );
    },
    [op],
  );

  return (
    <Kontekst.Provider value={{ toast, zapytaj: setPytanie, pasekBledu: setBlad }}>
      <Warstwa.Provider value={{ tekst, op, blad }}>
        {children}
        {/* tworzone dopiero przy pytaniu — wtedy zawsze NAD otwartymi arkuszami */}
        {pytanie ? (
          <Modal visible transparent animationType="fade" onRequestClose={() => setPytanie(null)} statusBarTranslucent>
            <Pressable style={styles.tlo} onPress={() => setPytanie(null)}>
              <Pressable style={styles.okno} onPress={() => {}}>
                <Text style={styles.tytul}>{pytanie?.tytul}</Text>
                {pytanie?.tekst ? <Text style={styles.tekst}>{pytanie.tekst}</Text> : null}
                <View style={styles.przyciski}>
                  <Pressable
                    onPress={() => setPytanie(null)}
                    style={({ pressed }) => [styles.btn, styles.anuluj, pressed && styles.wcisniety]}>
                    <Text style={[styles.btnTxt, { color: C.text }]}>Anuluj</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      const f = pytanie?.onOk;
                      setPytanie(null);
                      f?.();
                    }}
                    style={({ pressed }) => [
                      styles.btn,
                      {
                        backgroundColor: pytanie?.niebezpieczne ? C.red : C.text,
                      },
                      pressed && styles.wcisniety,
                    ]}>
                    <Text style={[styles.btnTxt, { color: '#fff' }]}>{pytanie?.ok}</Text>
                  </Pressable>
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        ) : null}
        <WarstwaKomunikatow />
      </Warstwa.Provider>
    </Kontekst.Provider>
  );
}

const styles = StyleSheet.create({
  tlo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  okno: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: C.surface,
    borderRadius: Size.radius,
    padding: 20,
    ...cien(3),
  },
  tytul: {
    fontFamily: Fonts.semibold,
    fontSize: 17,
    color: C.text,
    letterSpacing: -0.3,
  },
  tekst: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: C.text2,
    marginTop: 8,
    lineHeight: 20,
  },
  przyciski: { flexDirection: 'row', gap: 10, marginTop: 20 },
  btn: {
    flex: 1,
    minHeight: 50,
    borderRadius: Size.rs,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  anuluj: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border },
  btnTxt: { fontFamily: Fonts.semibold, fontSize: 15, textAlign: 'center' },
  wcisniety: { opacity: 0.75 },
  toastWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  toast: {
    backgroundColor: C.text,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  toastTxt: {
    color: '#fff',
    fontFamily: Fonts.medium,
    fontSize: 13,
    textAlign: 'center',
  },
  bladWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  blad: {
    backgroundColor: '#b71c1c',
    color: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    fontSize: 13,
    fontFamily: Fonts.medium,
    textAlign: 'center',
    maxWidth: 360,
    overflow: 'hidden',
    ...cien(2),
  },
});
