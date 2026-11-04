import { useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { C, Fonts } from '@/constants/theme';
import { godziny, krotkiCzas } from '@/logika/daty';
import { moznaEdytowac, nazwyDodatkow } from '@/logika/kalendarz';
import { komunikatBledu } from '@/logika/klient';
import type { Rezerwacja } from '@/logika/typy';
import { klient } from '@/stan/klient';
import { adresSms, trescSmsPotwierdzenia } from '@/logika/sms';
import { useDane } from '@/stan/DaneProvider';
import { zglos } from '@/stan/zglos';

import { Arkusz } from '../ui/Arkusz';
import { Ikona, type NazwaIkony } from '../ui/Ikona';
import { useKomunikaty } from '../ui/Komunikaty';
import { Przelacznik } from '../ui/Przelacznik';
import { PrzyciskAkcji, RzadAkcji } from '../ui/Przyciski';
import { ObrazekRezerwacji, type ObrazekRef } from './ObrazekRezerwacji';

type Trwa = null | 'zadatek' | 'potw' | 'mail_zadatek' | 'mail_potw' | 'usun' | 'obrazek';

/**
 * Szczegóły rezerwacji (arkusz sh-detail) — 1:1 z openDetail() w PWA.
 * Własna marka: przełączniki zadatku i potwierdzenia, maile do klienta, Edytuj / Kopiuj / Usuń.
 * Wszyscy: szybkie akcje Zadzwoń · SMS · E-mail · Udostępnij (obrazek) — układ uzgodniony z Michałem 04.11.
 */
export function SzczegolyRezerwacji({
  r: rez,
  onZamknij,
  onEdytuj,
  onKopiuj,
}: {
  /** null = zamknięte */
  r: Rezerwacja | null;
  onZamknij: () => void;
  onEdytuj: (r: Rezerwacja) => void;
  onKopiuj: (r: Rezerwacja) => void;
}) {
  const { konto, slowniki, zastosuj, usunLokalnie, odswiez } = useDane();
  const { toast, zapytaj } = useKomunikaty();
  const [trwa, setTrwa] = useState<Trwa>(null);
  const obrazek = useRef<ObrazekRef>(null);
  // ostatnia pokazana rezerwacja — żeby arkusz mógł się płynnie zamknąć
  const [ostatnia, setOstatnia] = useState<Rezerwacja | null>(rez);
  if (rez && rez !== ostatnia) setOstatnia(rez);
  const r = rez ?? ostatnia;
  const nazwy = slowniki?.nazwy_dodatkow ?? {};

  if (!r) return null;

  const rola = konto?.uzytkownik.rola ?? 'podglad';
  const edycja = moznaEdytowac(r, rola);
  const lok = r.marka === 'arsenal' ? ' · ' + (r.lokalizacja === 'wolomin' ? 'Wołomin' : 'Rembertów') : '';
  const zadatekOn = r.zadatek_status === 'oplacony';
  const potwOn = r.status === 'potwierdzona';
  const dodatki = nazwyDodatkow(r.dodatki, nazwy);

  /** Wspólna obsługa akcji: blokada przycisku, wynik od razu w kalendarzu, komunikat po polsku. */
  const akcja = async (rodzaj: Exclude<Trwa, null>, nazwaApi: string, body: object, ok: string) => {
    setTrwa(rodzaj);
    try {
      const j = await klient<{ rezerwacja: Rezerwacja }>(nazwaApi, { body: { id: r.id, ...body } });
      zastosuj(j.rezerwacja);
      toast(ok);
      if (rodzaj === 'mail_zadatek') odswiez(); // licznik „Nowe” się zmienił
    } catch (e) {
      toast('❌ ' + komunikatBledu(e));
    } finally {
      setTrwa(null);
    }
  };

  const usun = () =>
    zapytaj({
      tytul: 'Na pewno usunąć rezerwację?',
      tekst: `${r.klient_imie_nazwisko || 'Bez nazwy'} · ${r.data_rezerwacji} ${godziny(r.godzina_start, null)}. Tego nie da się cofnąć.`,
      ok: '🗑 Usuń',
      niebezpieczne: true,
      onOk: async () => {
        setTrwa('usun');
        try {
          await klient('rezerwacja_usun', { body: { id: r.id } });
          usunLokalnie(r.id);
          onZamknij();
          toast('Rezerwacja usunięta');
        } catch (e) {
          toast('❌ ' + komunikatBledu(e));
        } finally {
          setTrwa(null);
        }
      },
    });

  const udostepnij = async () => {
    setTrwa('obrazek');
    toast('⏳ Generowanie obrazu...');
    try {
      await obrazek.current?.udostepnij();
    } catch (e) {
      zglos(e, { dopisek: 'Udostępnianie' });
      toast('❌ Nie udało się przygotować obrazka');
    } finally {
      setTrwa(null);
    }
  };

  // SMS z telefonu pracownika: otwiera aplikację SMS z numerem klienta i gotową treścią — wystarczy „Wyślij”
  const smsPotwierdzenia = () => {
    const adres = adresSms(r.klient_telefon, trescSmsPotwierdzenia(r), Platform.OS === 'ios');
    if (adres) Linking.openURL(adres).catch(() => toast('❌ Nie udało się otworzyć wiadomości SMS'));
  };

  const zadzwon = () => {
    if (r.klient_telefon) Linking.openURL('tel:' + r.klient_telefon.replace(/\s/g, ''));
  };

  const email = () => {
    if (r.klient_email) Linking.openURL('mailto:' + r.klient_email).catch(() => toast('❌ Nie udało się otworzyć poczty'));
  };
  const sms = () => {
    if (r.klient_telefon) Linking.openURL('sms:' + r.klient_telefon.replace(/[^\d+]/g, '')).catch(() => toast('❌ Nie udało się otworzyć wiadomości SMS'));
  };

  return (
    <Arkusz widoczny={!!rez} onZamknij={onZamknij} nazwa="szczegoly" bezPaddingu bezNaglowka>
      <View style={[styles.hdr, { backgroundColor: r.kolor_karty }]}>
        <Pressable onPress={onZamknij} hitSlop={12} style={styles.zamknij} accessibilityRole="button" accessibilityLabel="Zamknij">
          <Ikona nazwa="close" rozmiar={18} kolor="#fff" />
        </Pressable>
        <Text style={styles.zrodlo}>{(r.atrakcja_nazwa ?? '') + lok + (r.zrodlo === 'formularz_www' ? ' · WWW' : '')}</Text>
        <Text style={styles.nazwa}>{r.klient_imie_nazwisko || 'Bez nazwy'}</Text>
        <Text style={styles.czas}>
          {r.data_rezerwacji} · {godziny(r.godzina_start, r.godzina_koniec, ' – ')} · {r.liczba_osob} osób
        </Text>
        <View style={styles.plakietki}>
          <Text style={styles.plakietka}>{potwOn ? '✓ Potwierdzona' : 'Niepotwierdzona'}</Text>
          <Text style={styles.plakietka}>{zadatekOn ? 'Zadatek opłacony' : 'Brak zadatku'}</Text>
        </View>
      </View>

      <View style={styles.szybkie}>
        <SzybkaAkcja ikona="call-outline" tekst="Zadzwoń" onPress={zadzwon} wylaczona={!r.klient_telefon} />
        <SzybkaAkcja ikona="chatbubble-outline" tekst="SMS" onPress={sms} wylaczona={!r.klient_telefon} />
        <SzybkaAkcja ikona="mail-outline" tekst="E-mail" onPress={email} wylaczona={!r.klient_email} />
        <SzybkaAkcja ikona="share-outline" tekst={trwa === 'obrazek' ? 'Chwila…' : 'Udostępnij'} onPress={udostepnij} wylaczona={!!trwa} />
      </View>

      <View style={styles.body}>
        <View>
          <Wiersz ikona="call-outline" tekst={r.klient_telefon || '—'} pogrubiony onPress={r.klient_telefon ? zadzwon : undefined} />
          {r.klient_email ? <Wiersz ikona="mail-outline" tekst={r.klient_email} /> : null}
          {dodatki.length ? <Wiersz ikona="gift-outline" tekst={dodatki.join('\n')} /> : null}
          {r.uwagi ? <Wiersz ikona="chatbox-ellipses-outline" tekst={r.uwagi} /> : null}
          {r.instrukcje ? (
            <View style={[styles.wiersz, styles.instrukcje]}>
              <Ikona nazwa="construct-outline" rozmiar={18} kolor={C.pomarancz} />
              <Text style={[styles.wartosc, { color: C.pomarancz }]}>
                <Text style={{ fontFamily: Fonts.bold }}>Instruktor: </Text>
                {r.instrukcje}
              </Text>
            </View>
          ) : null}
        </View>

        {edycja ? (
          <>
            <View style={styles.statusy}>
              <Przelacznik
                wlaczony={zadatekOn}
                napisWl={trwa === 'zadatek' ? 'Zapisywanie…' : 'Zadatek opłacony'}
                napisWyl={trwa === 'zadatek' ? 'Zapisywanie…' : 'Zadatek nie opłacony'}
                wylaczony={!!trwa}
                onPress={() => akcja('zadatek', 'zadatek', { oplacony: !zadatekOn }, !zadatekOn ? '✅ Zadatek oznaczony jako opłacony' : 'Zadatek cofnięty')}
              />
              <Pressable
                onPress={() => akcja('mail_zadatek', 'mail_zadatek', {}, '✅ Mail wysłany!')}
                disabled={!r.klient_email || !!trwa}
                style={({ pressed }) => [styles.link, pressed && { opacity: 0.6 }]}
                accessibilityRole="button">
                <Text style={[styles.linkTxt, !r.klient_email && { color: C.text3 }]}>
                  {trwa === 'mail_zadatek'
                    ? '⏳ Wysyłam…'
                    : r.mail_zadatek_wyslany
                      ? '✓ Mail o zadatku wysłany · wyślij ponownie'
                      : 'Wyślij klientowi potwierdzenie otrzymania zadatku ›'}
                </Text>
              </Pressable>
              <View style={styles.statusyKreska} />
              <Przelacznik
                kolor="niebieski"
                wlaczony={potwOn}
                napisWl={trwa === 'potw' ? 'Zapisywanie…' : 'Rezerwacja potwierdzona'}
                napisWyl={trwa === 'potw' ? 'Zapisywanie…' : 'Niepotwierdzona'}
                wylaczony={!!trwa}
                onPress={() => akcja('potw', 'potwierdzenie', { potwierdzona: !potwOn }, !potwOn ? '✅ Rezerwacja potwierdzona' : 'Status cofnięty')}
              />
              <RzadAkcji>
                <PrzyciskAkcji
                  rodzaj={r.mail_potw_wyslany ? 'wyslany' : 'mail'}
                  tekst={r.mail_potw_wyslany ? '✓ E-mail wysłany' : 'Potwierdzenie e-mail'}
                  wylaczony={!r.klient_email || (!!trwa && trwa !== 'mail_potw')}
                  trwa={trwa === 'mail_potw'}
                  onPress={() => akcja('mail_potw', 'mail_potwierdzenie', {}, '✅ Potwierdzenie wysłane!')}
                  style={styles.pol}
                />
                <PrzyciskAkcji
                  rodzaj="mail"
                  tekst="Potwierdzenie SMS"
                  wylaczony={!adresSms(r.klient_telefon, trescSmsPotwierdzenia(r), Platform.OS === 'ios')}
                  onPress={smsPotwierdzenia}
                  style={styles.pol}
                />
              </RzadAkcji>
              {!r.klient_email ? <Text style={styles.podpowiedz}>Brak e-maila klienta — maile są wyłączone.</Text> : null}
            </View>

            <View style={styles.dolne}>
              <PrzyciskDolny ikona="create-outline" tekst="Edytuj" onPress={() => onEdytuj(r)} wylaczony={!!trwa} />
              <PrzyciskDolny ikona="copy-outline" tekst="Kopiuj" onPress={() => onKopiuj(r)} wylaczony={!!trwa} />
              <PrzyciskDolny ikona="trash-outline" tekst={trwa === 'usun' ? 'Usuwam…' : 'Usuń'} czerwony onPress={usun} wylaczony={!!trwa} />
            </View>
          </>
        ) : (
          <Text style={styles.podpowiedz}>{r.wlasna ? 'Tryb tylko do podglądu' : 'Możesz edytować tylko własne rezerwacje'}</Text>
        )}

        <Text style={styles.dodano}>
          Dodano: {krotkiCzas(r.utworzona)}
          {r.zrodlo === 'formularz_www' ? ' · z formularza www' : ''}
        </Text>
      </View>
      <ObrazekRezerwacji ref={obrazek} r={r} nazwy={nazwy} />
    </Arkusz>
  );
}

/** Okrągły przycisk szybkiej akcji (jak w kontaktach telefonu): Zadzwoń, SMS, E-mail, Udostępnij. */
function SzybkaAkcja({ ikona, tekst, onPress, wylaczona }: { ikona: NazwaIkony; tekst: string; onPress: () => void; wylaczona?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={wylaczona} accessibilityRole="button" accessibilityLabel={tekst} style={({ pressed }) => [styles.szybka, (pressed || wylaczona) && { opacity: wylaczona ? 0.35 : 0.7 }]}>
      <View style={styles.szybkaKolko}>
        <Ikona nazwa={ikona} rozmiar={22} kolor={C.green} />
      </View>
      <Text style={styles.szybkaTxt}>{tekst}</Text>
    </Pressable>
  );
}

function PrzyciskDolny({ ikona, tekst, onPress, czerwony, wylaczony }: { ikona: NazwaIkony; tekst: string; onPress: () => void; czerwony?: boolean; wylaczony?: boolean }) {
  const kolor = czerwony ? C.red : C.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={wylaczony}
      accessibilityRole="button"
      style={({ pressed }) => [styles.dolny, czerwony && { borderColor: '#f5c0bb' }, (pressed || wylaczony) && { opacity: 0.6 }]}>
      <Ikona nazwa={ikona} rozmiar={17} kolor={kolor} />
      <Text style={[styles.dolnyTxt, { color: kolor }]}>{tekst}</Text>
    </Pressable>
  );
}

function Wiersz({ ikona, tekst, pogrubiony, onPress }: { ikona: NazwaIkony; tekst: string; pogrubiony?: boolean; onPress?: () => void }) {
  return (
    <View style={styles.wiersz}>
      <Ikona nazwa={ikona} rozmiar={18} kolor={C.text2} />
      <Text onPress={onPress} suppressHighlighting style={[styles.wartosc, pogrubiony && { fontFamily: Fonts.semibold }]}>
        {tekst}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hdr: { paddingTop: 18, paddingHorizontal: 16, paddingBottom: 16 },
  zamknij: { position: 'absolute', right: 14, top: 14, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  zrodlo: { fontFamily: Fonts.medium, fontSize: 11, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 3, marginRight: 40 },
  nazwa: { fontFamily: Fonts.bold, fontSize: 21, color: '#fff', letterSpacing: -0.4, marginBottom: 2, marginRight: 40 },
  czas: { fontFamily: Fonts.regular, fontSize: 14, color: 'rgba(255,255,255,0.92)' },
  plakietki: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  plakietka: { fontFamily: Fonts.semibold, fontSize: 12, color: '#fff', backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10, overflow: 'hidden' },
  szybkie: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 14, paddingBottom: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  szybka: { alignItems: 'center', gap: 5, minWidth: 64 },
  szybkaKolko: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.greenL, alignItems: 'center', justifyContent: 'center' },
  szybkaTxt: { fontFamily: Fonts.medium, fontSize: 12, color: C.green },
  body: { paddingTop: 6, paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  wiersz: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F0F0EC' },
  wartosc: { flex: 1, fontFamily: Fonts.regular, fontSize: 14, color: C.text },
  instrukcje: { borderBottomWidth: 0 },
  statusy: { backgroundColor: C.bg, borderRadius: 12, padding: 12, gap: 8 },
  statusyKreska: { height: 1, backgroundColor: C.border, marginVertical: 2 },
  link: { paddingVertical: 4, paddingHorizontal: 2 },
  linkTxt: { fontFamily: Fonts.medium, fontSize: 13, color: C.green },
  dolne: { flexDirection: 'row', gap: 8 },
  dolny: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 48, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, backgroundColor: C.surface },
  dolnyTxt: { fontFamily: Fonts.semibold, fontSize: 14 },
  podpowiedz: { fontFamily: Fonts.regular, fontSize: 12, color: C.text3, textAlign: 'center', paddingTop: 4 },
  dodano: { fontFamily: Fonts.regular, fontSize: 12, color: C.text3, textAlign: 'center' },
  pol: { flex: 1, flexBasis: 0 },
});
