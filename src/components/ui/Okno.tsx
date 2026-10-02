import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions } from 'react-native';

import { C, cien, Fonts, Size } from '@/constants/theme';

import { WarstwaKomunikatow } from './Komunikaty';

/** Okno na środku ekranu (klawiatura liczb, wybór daty i godziny): przyciemnione tło, dotknięcie tła albo Wstecz = zamknij. */
export function Okno({
  widoczne,
  onZamknij,
  tytul,
  children,
  szerokosc = 380,
}: {
  widoczne: boolean;
  onZamknij: () => void;
  tytul?: string;
  children: ReactNode;
  szerokosc?: number;
}) {
  const { height } = useWindowDimensions();
  // tworzone dopiero przy pokazaniu — wtedy zawsze ląduje NAD otwartymi arkuszami
  if (!widoczne) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onZamknij} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <Pressable style={styles.tlo} onPress={onZamknij}>
          <Pressable onPress={() => {}} style={[styles.okno, { maxWidth: szerokosc, maxHeight: height - 48 }]}>
            <ScrollView contentContainerStyle={styles.tresc} keyboardShouldPersistTaps="handled" bounces={false}>
              {tytul ? <Text style={styles.tytul}>{tytul}</Text> : null}
              {children}
            </ScrollView>
          </Pressable>
        </Pressable>
        <WarstwaKomunikatow />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tlo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  okno: { width: '100%', backgroundColor: C.surface, borderRadius: Size.radius, overflow: 'hidden', ...cien(3) },
  tresc: { padding: 18 },
  tytul: { fontFamily: Fonts.semibold, fontSize: 16, color: C.text, letterSpacing: -0.3, marginBottom: 14 },
});
