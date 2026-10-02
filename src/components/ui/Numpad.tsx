import { useEffect, useEffectEvent, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C, Fonts, Size } from '@/constants/theme';

import { Okno } from './Okno';

export type NumpadUstawienia = {
  tytul: string;
  wartosc?: string;
  /** czy wolno wpisać przecinek (kwoty) — przy osobach i sztukach nie */
  ulamki?: boolean;
  /** najwięcej cyfr */
  maksCyfr?: number;
  onOk: (tekst: string) => void;
};

/**
 * Klawiatura liczb aplikacji (jak w SILT Lista): 7-8-9 / 4-5-6 / 1-2-3 / , 0 ⌫ / OK.
 * Duże klawisze, bez klawiatury systemowej. Kolory z PWA.
 */
export function Numpad({ ustawienia, onZamknij }: { ustawienia: NumpadUstawienia | null; onZamknij: () => void }) {
  return (
    <Okno widoczne={!!ustawienia} onZamknij={onZamknij} tytul={ustawienia?.tytul} szerokosc={360}>
      {ustawienia ? <Klawiatura ustawienia={ustawienia} onZamknij={onZamknij} /> : null}
    </Okno>
  );
}

function Klawiatura({ ustawienia, onZamknij }: { ustawienia: NumpadUstawienia; onZamknij: () => void }) {
  const [val, setVal] = useState(ustawienia.wartosc ?? '');
  const maks = ustawienia.maksCyfr ?? (ustawienia.ulamki ? 9 : 4);

  const klawisz = (k: string) => {
    if (k === 'del') setVal((v) => v.slice(0, -1));
    else if (k === 'ok') {
      onZamknij();
      ustawienia.onOk(val.replace(/,$/, ''));
    } else if (k === ',') setVal((v) => (v.includes(',') ? v : (v || '0') + ','));
    else setVal((v) => (v.replace(',', '').length >= maks ? v : (v === '0' ? '' : v) + k));
  };

  return (
    <>
      <View style={styles.wyswietlacz}>
        <Text style={styles.wyswietlaczTxt}>{val || '0'}</Text>
      </View>
      <View style={styles.siatka}>
        {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((k) => (
          <Klawisz key={k} k={k} onPress={klawisz} />
        ))}
        {ustawienia.ulamki ? <Klawisz k="," onPress={klawisz} /> : <Klawisz k="C" label="C" onPress={() => setVal('')} />}
        <Klawisz k="0" onPress={klawisz} />
        <Klawisz k="del" label="⌫" styl="del" onPress={klawisz} />
      </View>
      <View style={styles.dol}>
        <Pressable onPress={onZamknij} style={({ pressed }) => [styles.btn, styles.anuluj, pressed && { opacity: 0.75 }]} accessibilityRole="button">
          <Text style={[styles.btnTxt, { color: C.text }]}>Anuluj</Text>
        </Pressable>
        <Pressable onPress={() => klawisz('ok')} style={({ pressed }) => [styles.btn, styles.ok, pressed && { opacity: 0.8 }]} accessibilityRole="button">
          <Text style={[styles.btnTxt, { color: '#fff' }]}>OK</Text>
        </Pressable>
      </View>
    </>
  );
}

function Klawisz({ k, label, styl, onPress }: { k: string; label?: string; styl?: 'del'; onPress: (k: string) => void }) {
  return (
    <Pressable
      onPress={() => onPress(k)}
      accessibilityLabel={k === 'del' ? 'Usuń cyfrę' : label ?? k}
      style={({ pressed }) => [styles.klawisz, styl === 'del' && styles.del, pressed && { transform: [{ scale: 0.95 }], backgroundColor: C.border }]}>
      <Text style={[styles.klawiszTxt, styl === 'del' && { color: C.red }]}>{label ?? k}</Text>
    </Pressable>
  );
}

/**
 * Pole liczby (wygląda jak .finp z PWA) — dotknięcie otwiera klawiaturę aplikacji zamiast systemowej.
 */
export function PoleLiczby({
  value,
  onChange,
  placeholder = '0',
  tytul,
  ulamki,
  autoOtworz,
  bledne,
}: {
  value: string;
  onChange: (t: string) => void;
  placeholder?: string;
  tytul: string;
  ulamki?: boolean;
  autoOtworz?: boolean;
  bledne?: boolean;
}) {
  const [np, setNp] = useState<NumpadUstawienia | null>(null);
  const otworz = () => setNp({ tytul, wartosc: value, ulamki, onOk: onChange });
  const otworzNaStart = useEffectEvent(otworz);
  useEffect(() => {
    if (!autoOtworz) return;
    const t = setTimeout(() => otworzNaStart(), 350);
    return () => clearTimeout(t);
  }, [autoOtworz]);

  return (
    <>
      <Pressable
        onPress={otworz}
        accessibilityRole="button"
        accessibilityLabel={tytul}
        style={({ pressed }) => [styles.pole, (pressed || np) && { borderColor: C.text }, bledne && styles.poleBlad]}>
        <Text style={[styles.poleTxt, !value && { color: C.text3 }]}>{value || placeholder}</Text>
      </Pressable>
      <Numpad ustawienia={np} onZamknij={() => setNp(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  wyswietlacz: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: Size.rs, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 12, minHeight: 58, justifyContent: 'center' },
  wyswietlaczTxt: { fontFamily: Fonts.bold, fontSize: 30, color: C.text, textAlign: 'right' },
  siatka: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  klawisz: { flexGrow: 1, flexBasis: '30%', minHeight: 58, borderRadius: Size.rs, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  del: { backgroundColor: C.redL, borderColor: '#f5c0bb' },
  klawiszTxt: { fontFamily: Fonts.semibold, fontSize: 22, color: C.text },
  dol: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: { flex: 1, minHeight: 52, borderRadius: Size.rs, alignItems: 'center', justifyContent: 'center' },
  anuluj: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border },
  ok: { backgroundColor: C.text },
  btnTxt: { fontFamily: Fonts.semibold, fontSize: 15 },
  pole: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: Size.rs, paddingVertical: 12, paddingHorizontal: 13, minHeight: 46, justifyContent: 'center' },
  poleBlad: { borderColor: C.red, backgroundColor: '#fff8f8' },
  poleTxt: { fontFamily: Fonts.regular, fontSize: 15, color: C.text },
});
