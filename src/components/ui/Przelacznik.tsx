import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C, Fonts, Size } from '@/constants/theme';

/** Suwak (.sw / .sw2): szary → zielony albo niebieski. */
export function Suwak({ wlaczony, kolor = 'zielony' }: { wlaczony: boolean; kolor?: 'zielony' | 'niebieski' }) {
  return (
    <View style={[styles.sw, wlaczony && { backgroundColor: kolor === 'zielony' ? C.green : C.blue }]}>
      <View style={[styles.kciuk, wlaczony && { transform: [{ translateX: 18 }] }]} />
    </View>
  );
}

/**
 * Wiersz z napisem i suwakiem — przełącznik zadatku / potwierdzenia ze szczegółów (.sw-btn)
 * i zadatku w formularzu (.zadatek-row).
 */
export function Przelacznik({
  wlaczony,
  napisWl,
  napisWyl,
  onPress,
  kolor = 'zielony',
  ikona,
  wylaczony,
}: {
  wlaczony: boolean;
  napisWl: string;
  napisWyl: string;
  onPress: () => void;
  kolor?: 'zielony' | 'niebieski';
  /** emoji przed napisem (💵 w formularzu) */
  ikona?: string;
  wylaczony?: boolean;
}) {
  const tlo = wlaczony ? (kolor === 'zielony' ? C.greenL : C.blueL) : C.bg;
  const ramka = wlaczony ? (kolor === 'zielony' ? C.green : C.blue) : C.border;
  return (
    <Pressable
      onPress={onPress}
      disabled={wylaczony}
      accessibilityRole="switch"
      accessibilityState={{ checked: wlaczony }}
      style={({ pressed }) => [styles.wiersz, { backgroundColor: tlo, borderColor: ramka, opacity: wylaczony ? 0.5 : pressed ? 0.8 : 1 }]}>
      <View style={styles.lewa}>
        {ikona ? <Text style={styles.ikona}>{ikona}</Text> : null}
        <Text style={styles.napis}>{wlaczony ? napisWl : napisWyl}</Text>
      </View>
      <Suwak wlaczony={wlaczony} kolor={kolor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sw: { width: 42, height: 24, borderRadius: 12, backgroundColor: C.border },
  kciuk: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    position: 'absolute',
    top: 3,
    left: 3,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  wiersz: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 50,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: Size.rs,
    borderWidth: 1.5,
  },
  lewa: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },
  ikona: { fontSize: 16 },
  napis: { fontFamily: Fonts.medium, fontSize: 14, color: C.text },
});
