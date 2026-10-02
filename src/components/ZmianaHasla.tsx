import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { C, Fonts } from '@/constants/theme';
import { komunikatBledu } from '@/logika/klient';
import { klient } from '@/stan/klient';
import { useDane } from '@/stan/DaneProvider';

import { useKomunikaty } from './ui/Komunikaty';
import { PrzyciskGlowny } from './ui/Przyciski';

/**
 * Zmiana hasła (renderZmienHaslo z PWA). Po resecie przez admina: stare hasło niepotrzebne, ostrzeżenie na górze.
 * Po zmianie inne telefony tego użytkownika są wylogowane.
 */
export function ZmianaHasla({ onGotowe }: { onGotowe: () => void }) {
  const { konto, ustawKonto } = useDane();
  const { toast } = useKomunikaty();
  const reset = !!konto?.uzytkownik.haslo_reset;
  const [stare, setStare] = useState('');
  const [nowe, setNowe] = useState('');
  const [nowe2, setNowe2] = useState('');
  const [blad, setBlad] = useState('');
  const [trwa, setTrwa] = useState(false);

  const zapisz = async () => {
    if ((!reset && !stare) || !nowe || !nowe2) return setBlad('Wypełnij wszystkie pola');
    if (nowe !== nowe2) return setBlad('Hasła nie są identyczne');
    if (nowe.length < 6) return setBlad('Hasło min. 6 znaków');
    setTrwa(true);
    setBlad('');
    try {
      await klient('zmien_haslo', { body: { stare, nowe } });
      if (konto) ustawKonto({ ...konto, uzytkownik: { ...konto.uzytkownik, haslo_reset: false } });
      toast('✅ Hasło zmienione!');
      onGotowe();
    } catch (e) {
      setBlad(komunikatBledu(e));
    } finally {
      setTrwa(false);
    }
  };

  return (
    <View>
      {reset ? <Text style={styles.ostrzezenie}>⚠️ Admin zresetował Twoje hasło — ustaw nowe.</Text> : null}
      {!reset ? <Pole etykieta="Stare hasło" value={stare} onChange={setStare} /> : null}
      <Pole etykieta="Nowe hasło" value={nowe} onChange={setNowe} placeholder="min. 6 znaków" />
      <Pole etykieta="Powtórz nowe hasło" value={nowe2} onChange={setNowe2} />
      {blad ? <Text style={styles.blad}>{blad}</Text> : null}
      <PrzyciskGlowny tekst="Zapisz hasło" onPress={zapisz} trwa={trwa} style={{ backgroundColor: C.green, marginTop: 6 }} />
    </View>
  );
}

function Pole({ etykieta, value, onChange, placeholder }: { etykieta: string; value: string; onChange: (t: string) => void; placeholder?: string }) {
  return (
    <View style={styles.pole}>
      <Text style={styles.lbl}>{etykieta.toUpperCase()}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={placeholder}
        placeholderTextColor={C.text3}
        style={styles.inp}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ostrzezenie: { backgroundColor: '#fff3e0', borderWidth: 0.5, borderColor: '#ffcc80', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 14, fontSize: 13, color: C.pomarancz, fontFamily: Fonts.medium, overflow: 'hidden' },
  pole: { marginBottom: 14 },
  lbl: { fontFamily: Fonts.bold, fontSize: 11, color: C.text2, letterSpacing: 0.5, marginBottom: 6 },
  inp: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 15, fontSize: 15, fontFamily: Fonts.regular, color: C.text },
  blad: { color: C.red, fontFamily: Fonts.medium, fontSize: 13, marginBottom: 8 },
});

