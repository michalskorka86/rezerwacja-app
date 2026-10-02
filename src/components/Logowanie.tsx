import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, Fonts, Size } from '@/constants/theme';
import { komunikatBledu } from '@/logika/klient';
import { useDane } from '@/stan/DaneProvider';

import { PrzyciskGlowny } from './ui/Przyciski';

/** Ekran logowania jak index.php PWA: 🎯, „Panel Rezerwacji”, login, hasło, „Zaloguj się”. */
export function Logowanie() {
  const { zaloguj } = useDane();
  const [login, setLogin] = useState('');
  const [haslo, setHaslo] = useState('');
  const [pokazHaslo, setPokazHaslo] = useState(false);
  const [blad, setBlad] = useState('');
  const [trwa, setTrwa] = useState(false);

  const wyslij = async () => {
    if (!login.trim() || !haslo) {
      setBlad('Wpisz login i hasło.');
      return;
    }
    setTrwa(true);
    setBlad('');
    try {
      await zaloguj(login, haslo);
    } catch (e) {
      setBlad(komunikatBledu(e));
      setTrwa(false);
    }
  };

  return (
    <SafeAreaView style={styles.ekran}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <View style={styles.logo}>
            <Text style={styles.logoIkona}>🎯</Text>
            <Text style={styles.logoTekst}>Panel Rezerwacji</Text>
            <Text style={styles.logoPod}>SILT · ARSENAŁ Paintball</Text>
          </View>

          {blad ? <Text style={styles.alert}>{blad}</Text> : null}

          <View style={styles.form}>
            <View style={styles.pole}>
              <Text style={styles.lbl}>LOGIN</Text>
              <TextInput
                value={login}
                onChangeText={setLogin}
                placeholder="np. kuba"
                placeholderTextColor={C.text3}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                textContentType="username"
                returnKeyType="next"
                style={[styles.inp, !!blad && styles.inpBlad]}
              />
            </View>
            <View style={styles.pole}>
              <Text style={styles.lbl}>HASŁO</Text>
              <View>
                <TextInput
                  value={haslo}
                  onChangeText={setHaslo}
                  placeholder="••••••••"
                  placeholderTextColor={C.text3}
                  secureTextEntry={!pokazHaslo}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="current-password"
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={wyslij}
                  style={[styles.inp, styles.inpHaslo, !!blad && styles.inpBlad]}
                />
                <Pressable onPress={() => setPokazHaslo((p) => !p)} style={styles.oko} hitSlop={8} accessibilityLabel={pokazHaslo ? 'Ukryj hasło' : 'Pokaż hasło'}>
                  <Text style={styles.okoTxt}>{pokazHaslo ? '🙈' : '👁'}</Text>
                </Pressable>
              </View>
            </View>
            <PrzyciskGlowny tekst="Zaloguj się" onPress={wyslij} trwa={trwa} style={{ marginTop: 4 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1, backgroundColor: C.surface },
  flex: { flex: 1 },
  wrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 28, gap: 20 },
  logo: { alignItems: 'center' },
  logoIkona: { fontSize: 48, marginBottom: 8 },
  logoTekst: { fontFamily: Fonts.bold, fontSize: 22, letterSpacing: -0.3, color: C.text },
  logoPod: { fontFamily: Fonts.regular, fontSize: 13, color: C.text2, marginTop: 3 },
  alert: {
    alignSelf: 'stretch',
    maxWidth: 380,
    borderRadius: Size.rs,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 13,
    fontFamily: Fonts.medium,
    backgroundColor: C.redL,
    borderWidth: 1.5,
    borderColor: '#f5c0bb',
    color: C.red,
    overflow: 'hidden',
  },
  form: { alignSelf: 'stretch', maxWidth: 380, gap: 12 },
  pole: { gap: 5 },
  lbl: { fontFamily: Fonts.semibold, fontSize: 11, color: C.text2, letterSpacing: 0.5 },
  inp: {
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: Size.rs,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: C.text,
  },
  inpHaslo: { paddingRight: 52 },
  inpBlad: { borderColor: C.red, backgroundColor: '#fff8f8' },
  oko: { position: 'absolute', right: 6, top: 0, bottom: 0, width: 44, alignItems: 'center', justifyContent: 'center' },
  okoTxt: { fontSize: 18 },
});
