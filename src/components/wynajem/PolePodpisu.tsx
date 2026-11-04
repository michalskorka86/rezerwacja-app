import { useEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { C, Fonts, Size } from '@/constants/theme';
import type { Podpis } from '@/logika/umowa';

import { usePrzewijanieArkusza } from '../ui/Arkusz';

type Punkt = { x: number; y: number };

/** Ścieżka SVG z kresek (do PDF-a umowy). */
export const sciezkaSvg = (kreski: Punkt[][]) =>
  kreski
    .filter((k) => k.length > 0)
    .map((k) => (k.length === 1 ? `M${k[0].x} ${k[0].y} l0.1 0.1` : 'M' + k.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L')))
    .join(' ');

/**
 * Pole do podpisu palcem lub rysikiem (bez dodatkowych modułów — kreski rysowane zwykłymi widokami,
 * więc działa w obecnym APK). Na czas rysowania ekran się nie przewija. „Wyczyść” zaczyna od nowa.
 */
export function PolePodpisu({ opis, onZmiana }: { opis: string; onZmiana: (p: Podpis | null) => void }) {
  const [kreski, setKreski] = useState<Punkt[][]>([]);
  const kreskiRef = useRef<Punkt[][]>([]);
  const rozmiar = useRef({ szer: 300, wys: 170 });
  const przewijanie = usePrzewijanieArkusza();
  // PanResponder powstaje raz — aktualne funkcje trzymamy w ref
  const cb = useRef({ przewijanie, onZmiana });
  useEffect(() => {
    cb.current = { przewijanie, onZmiana };
  });

  const ustaw = (k: Punkt[][]) => {
    kreskiRef.current = k;
    setKreski(k);
  };

  const zakoncz = () => {
    cb.current.przewijanie(true);
    const k = kreskiRef.current;
    const t = new Date();
    const dwa = (n: number) => String(n).padStart(2, '0');
    const czas = `${dwa(t.getDate())}.${dwa(t.getMonth() + 1)}.${t.getFullYear()}, ${dwa(t.getHours())}:${dwa(t.getMinutes())}`;
    cb.current.onZmiana(k.length ? { sciezka: sciezkaSvg(k), szer: rozmiar.current.szer, wys: rozmiar.current.wys, czas } : null);
  };

  // refy są czytane tylko w obsłudze dotyku (nie podczas rysowania ekranu)
  // eslint-disable-next-line react-hooks/refs
  const [obsluga] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (e) => {
        cb.current.przewijanie(false);
        ustaw([...kreskiRef.current, [{ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY }]]);
      },
      onPanResponderMove: (e) => {
        const p = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
        const k = kreskiRef.current;
        const kreska = k[k.length - 1] ?? [];
        const ost = kreska[kreska.length - 1];
        if (ost && Math.hypot(p.x - ost.x, p.y - ost.y) < 2) return;
        ustaw([...k.slice(0, -1), [...kreska, p]]);
      },
      onPanResponderRelease: zakoncz,
      onPanResponderTerminate: zakoncz,
    }),
  );

  const wyczysc = () => {
    ustaw([]);
    onZmiana(null);
  };

  const naRozmiar = (e: LayoutChangeEvent) => {
    rozmiar.current = { szer: Math.round(e.nativeEvent.layout.width), wys: Math.round(e.nativeEvent.layout.height) };
  };

  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.opis}>{opis.toUpperCase()}</Text>
      <View style={styles.pole} onLayout={naRozmiar} {...obsluga.panHandlers}>
        <View style={styles.linia} pointerEvents="none" />
        {kreski.length === 0 ? (
          <Text style={styles.podpowiedz} pointerEvents="none">
            Podpisz tutaj
          </Text>
        ) : null}
        {kreski.map((k, i) =>
          k.length === 1 ? (
            <View key={i} pointerEvents="none" style={[styles.kropka, { left: k[0].x - 1.5, top: k[0].y - 1.5 }]} />
          ) : (
            k.slice(1).map((p, j) => <Odcinek key={`${i}-${j}`} a={k[j]} b={p} />)
          ),
        )}
      </View>
      {kreski.length ? (
        <Pressable onPress={wyczysc} style={({ pressed }) => [styles.wyczysc, pressed && { opacity: 0.7 }]} accessibilityRole="button">
          <Text style={styles.wyczyscTxt}>Wyczyść podpis</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Odcinek kreski: cienki prostokąt obrócony między dwoma punktami. */
function Odcinek({ a, b }: { a: Punkt; b: Punkt }) {
  const dl = Math.hypot(b.x - a.x, b.y - a.y);
  const kat = Math.atan2(b.y - a.y, b.x - a.x);
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: (a.x + b.x) / 2 - dl / 2 - 0.5,
        top: (a.y + b.y) / 2 - 1.5,
        width: dl + 1,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: '#1A2A6C',
        transform: [{ rotate: `${kat}rad` }],
      }}
    />
  );
}

const styles = StyleSheet.create({
  opis: { fontFamily: Fonts.semibold, fontSize: 11, color: C.text2, letterSpacing: 0.6, paddingHorizontal: 4 },
  pole: { height: 170, backgroundColor: C.surface, borderWidth: 2, borderStyle: 'dashed', borderColor: C.border, borderRadius: Size.radius, overflow: 'hidden' },
  linia: { position: 'absolute', left: 20, right: 20, bottom: 34, borderTopWidth: 1, borderTopColor: C.border },
  podpowiedz: { position: 'absolute', left: 0, right: 0, top: 62, textAlign: 'center', fontFamily: Fonts.regular, fontSize: 14, color: C.text3 },
  kropka: { position: 'absolute', width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#1A2A6C' },
  wyczysc: { alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  wyczyscTxt: { fontFamily: Fonts.semibold, fontSize: 13, color: C.text2 },
});
