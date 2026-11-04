import { useEffect, useState } from 'react';
import { Animated, Easing, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, cien, Fonts, Size } from '@/constants/theme';

import { Ikona, type NazwaIkony } from '../ui/Ikona';

export type PozycjaMenu = 'kalendarz' | 'wynajem' | 'zadania' | 'rozpiski' | 'odswiez' | 'ustawienia';

type Props = {
  otwarte: boolean;
  /** która strona jest teraz na ekranie (podświetlona) */
  aktywna: 'kalendarz' | 'wynajem' | 'zadania' | 'ustawienia';
  logo: string | null;
  imie: string;
  opis: string;
  ileZadan: number;
  arsenal: boolean;
  onWybierz: (p: PozycjaMenu) => void;
  onZamknij: () => void;
};

/**
 * Menu z lewej (☰): Kalendarz, Wynajem, Zadania, Rozpiski (Arsenał), Odśwież, Ustawienia (tam zmiana hasła i Wyloguj).
 * Zamykanie: ✕ Zamknij, dotknięcie tła albo Wstecz w telefonie.
 * `MenuBoczne` = osobne okno (nad kalendarzem); `WarstwaMenu` = to samo jako warstwa wewnątrz pełnego ekranu
 * (Wynajem / Zadania są już osobnym oknem — drugie okno nad nim nie zawsze pokazuje się na iPhonie).
 */
export function MenuBoczne(props: Props) {
  if (!props.otwarte) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={props.onZamknij} statusBarTranslucent navigationBarTranslucent>
      <WarstwaMenu {...props} />
    </Modal>
  );
}

export function WarstwaMenu({ otwarte, aktywna, logo, imie, opis, ileZadan, arsenal, onWybierz, onZamknij }: Props) {
  const insets = useSafeAreaInsets();
  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (otwarte) Animated.timing(anim, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    else anim.setValue(0);
  }, [otwarte, anim]);
  if (!otwarte) return null;
  const przesun = anim.interpolate({ inputRange: [0, 1], outputRange: [-300, 0] });

  const poz = (p: PozycjaMenu, ikona: NazwaIkony, tekst: string, ile = 0) => {
    const on = p === aktywna;
    return (
      <Pressable
        key={p}
        onPress={() => onWybierz(p)}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        style={({ pressed }) => [styles.poz, on && styles.pozOn, pressed && { backgroundColor: C.bg }]}>
        <Ikona nazwa={ikona} rozmiar={20} kolor={on ? C.green : C.text2} />
        <Text style={[styles.pozTxt, on && styles.pozTxtOn]} numberOfLines={1}>
          {tekst}
        </Text>
        {ile > 0 ? (
          <View style={styles.licznik}>
            <Text style={styles.licznikTxt}>{ile > 99 ? '99+' : ile}</Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.tlo, { opacity: anim }]}>
        <Pressable style={{ flex: 1 }} onPress={onZamknij} accessibilityLabel="Zamknij menu" />
      </Animated.View>
      <Animated.View style={[styles.panel, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 14, transform: [{ translateX: przesun }] }]}>
        <ScrollView contentContainerStyle={styles.tresc} bounces={false}>
          {logo ? <Image source={{ uri: logo }} style={styles.logo} resizeMode="contain" accessibilityLabel="Logo" /> : null}
          <Text style={styles.imie} numberOfLines={1}>
            {imie}
          </Text>
          <Text style={styles.opis} numberOfLines={1}>
            {opis}
          </Text>
          {poz('kalendarz', 'calendar-outline', 'Kalendarz')}
          {poz('wynajem', 'cube-outline', 'Wynajem')}
          {poz('zadania', 'clipboard-outline', 'Zadania', ileZadan)}
          {arsenal ? poz('rozpiski', 'document-text-outline', 'Rozpiski') : null}
          <View style={styles.kreska} />
          {poz('odswiez', 'refresh', 'Odśwież')}
          {poz('ustawienia', 'settings-outline', 'Ustawienia')}
        </ScrollView>
        <Pressable onPress={onZamknij} style={({ pressed }) => [styles.zamknij, pressed && { opacity: 0.7 }]} accessibilityRole="button">
          <Text style={styles.zamknijTxt}>✕ Zamknij</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  tlo: { backgroundColor: 'rgba(0,0,0,0.35)' },
  panel: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 280, maxWidth: '82%', backgroundColor: C.surface, paddingHorizontal: 14, ...cien(3) },
  tresc: { gap: 4, paddingBottom: 10 },
  logo: { height: 30, width: 110, marginBottom: 8 },
  imie: { fontFamily: Fonts.semibold, fontSize: 15, color: C.text },
  opis: { fontFamily: Fonts.regular, fontSize: 13, color: C.text2, marginBottom: 14 },
  poz: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 12, borderRadius: 10 },
  pozOn: { backgroundColor: C.greenL },
  pozTxt: { flex: 1, fontFamily: Fonts.medium, fontSize: 15, color: C.text },
  pozTxtOn: { fontFamily: Fonts.semibold, color: C.green },
  licznik: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: C.alarm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  licznikTxt: { color: '#fff', fontFamily: Fonts.bold, fontSize: 11 },
  kreska: { height: 1, backgroundColor: C.border, marginVertical: 8 },
  zamknij: { borderWidth: 1.5, borderColor: C.border, borderRadius: Size.rs, paddingVertical: 13, alignItems: 'center', marginTop: 8 },
  zamknijTxt: { fontFamily: Fonts.semibold, fontSize: 14, color: C.text },
});
