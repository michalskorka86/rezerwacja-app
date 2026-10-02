import { useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { C, Fonts } from '@/constants/theme';
import { godziny, krotkiCzas } from '@/logika/daty';
import { moznaEdytowac, nazwyDodatkow } from '@/logika/kalendarz';
import { komunikatBledu } from '@/logika/klient';
import type { Rezerwacja } from '@/logika/typy';
import { klient } from '@/stan/klient';
import { useDane } from '@/stan/DaneProvider';
import { zglos } from '@/stan/zglos';

import { Arkusz } from '../ui/Arkusz';
import { useKomunikaty } from '../ui/Komunikaty';
import { Przelacznik } from '../ui/Przelacznik';
import { PrzyciskAkcji, RzadAkcji } from '../ui/Przyciski';
import { ObrazekRezerwacji, type ObrazekRef } from './ObrazekRezerwacji';

type Trwa = null | 'zadatek' | 'potw' | 'mail_zadatek' | 'mail_potw' | 'usun' | 'obrazek';

/**
 * Szczegóły rezerwacji (arkusz sh-detail) — 1:1 z openDetail() w PWA.
 * Własna marka: przełączniki zadatku i potwierdzenia, maile do klienta, Edytuj / Kopiuj / Usuń.
 * Wszyscy: zadzwoń (dotknięcie telefonu) i 📤 Udostępnij (obrazek).
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

  const zadzwon = () => {
    if (r.klient_telefon) Linking.openURL('tel:' + r.klient_telefon.replace(/\s/g, ''));
  };

  return (
    <Arkusz widoczny={!!rez} onZamknij={onZamknij} nazwa="szczegoly" bezPaddingu>
      <View style={[styles.hdr, { backgroundColor: r.kolor_karty }]}>
        <Text style={styles.zrodlo}>
          {(r.atrakcja_nazwa ?? '') + lok + (r.zrodlo === 'formularz_www' ? ' 🌐 WWW' : '')}
        </Text>
        <Text style={styles.nazwa}>{(potwOn ? '✓ ' : '') + r.klient_imie_nazwisko}</Text>
        <Text style={styles.czas}>
          {r.data_rezerwacji} · {godziny(r.godzina_start, r.godzina_koniec, ' – ')}
        </Text>
      </View>

      <View style={styles.body}>
        <Wiersz ikona="👥" tekst={`${r.liczba_osob} osób`} />
        <Wiersz ikona="📞" tekst={r.klient_telefon ? r.klient_telefon + ' 📲' : '—'} pogrubiony onPress={r.klient_telefon ? zadzwon : undefined} />
        {r.klient_email ? <Wiersz ikona="📧" tekst={r.klient_email} /> : null}
        <Wiersz ikona="💵" tekst={zadatekOn ? '✅ Zadatek opłacony' : '❌ Brak zadatku'} />
        {dodatki.length ? <Wiersz ikona="🎁" tekst={dodatki.join('\n')} /> : null}
        {r.uwagi ? <Wiersz ikona="💬" tekst={r.uwagi} /> : null}
        {r.instrukcje ? (
          <View style={styles.instrukcje}>
            <Text style={styles.ikona}>⚙️</Text>
            <Text style={[styles.wartosc, { color: C.pomarancz }]}>
              <Text style={{ fontFamily: Fonts.bold }}>Instruktor: </Text>
              {r.instrukcje}
            </Text>
          </View>
        ) : null}
        <View style={styles.kreska}>
          <Wiersz ikona="🕐" tekst={'Dodano: ' + krotkiCzas(r.utworzona)} maly />
        </View>

        {edycja ? (
          <>
            <View style={styles.wierszIkony}>
              <Text style={styles.ikona}>💵</Text>
              <View style={{ flex: 1 }}>
                <Przelacznik
                  wlaczony={zadatekOn}
                  napisWl={trwa === 'zadatek' ? 'Zapisywanie…' : 'Zadatek opłacony'}
                  napisWyl={trwa === 'zadatek' ? 'Zapisywanie…' : 'Zadatek nie opłacony'}
                  wylaczony={!!trwa}
                  onPress={() => akcja('zadatek', 'zadatek', { oplacony: !zadatekOn }, !zadatekOn ? '✅ Zadatek oznaczony jako opłacony' : 'Zadatek cofnięty')}
                />
              </View>
            </View>
            <RzadAkcji>
              <PrzyciskAkcji
                rodzaj={r.mail_zadatek_wyslany ? 'wyslany' : 'mail'}
                tekst={r.mail_zadatek_wyslany ? '✅ Potwierdzenie zadatku wysłane — wyślij ponownie' : '📧 Potwierdzenie otrzymania zadatku'}
                wylaczony={!r.klient_email || (!!trwa && trwa !== 'mail_zadatek')}
                trwa={trwa === 'mail_zadatek'}
                onPress={() => akcja('mail_zadatek', 'mail_zadatek', {}, '✅ Mail wysłany!')}
              />
            </RzadAkcji>

            <View style={[styles.wierszIkony, { marginTop: 4 }]}>
              <Text style={styles.ikona}>✅</Text>
              <View style={{ flex: 1 }}>
                <Przelacznik
                  kolor="niebieski"
                  wlaczony={potwOn}
                  napisWl={trwa === 'potw' ? 'Zapisywanie…' : 'Rezerwacja potwierdzona'}
                  napisWyl={trwa === 'potw' ? 'Zapisywanie…' : 'Niepotwierdzona'}
                  wylaczony={!!trwa}
                  onPress={() => akcja('potw', 'potwierdzenie', { potwierdzona: !potwOn }, !potwOn ? '✅ Rezerwacja potwierdzona' : 'Status cofnięty')}
                />
              </View>
            </View>
            <RzadAkcji>
              <PrzyciskAkcji
                rodzaj={r.mail_potw_wyslany ? 'wyslany' : 'mail'}
                tekst={r.mail_potw_wyslany ? '✅ Potwierdzenie wysłane — wyślij ponownie' : '📧 Wyślij potwierdzenie'}
                wylaczony={!r.klient_email || (!!trwa && trwa !== 'mail_potw')}
                trwa={trwa === 'mail_potw'}
                onPress={() => akcja('mail_potw', 'mail_potwierdzenie', {}, '✅ Potwierdzenie wysłane!')}
              />
            </RzadAkcji>
            {!r.klient_email ? <Text style={styles.podpowiedz}>Brak e-maila klienta — maile są wyłączone.</Text> : null}

            <RzadAkcji style={{ marginTop: 4 }}>
              <PrzyciskAkcji tekst="✏️ Edytuj" onPress={() => onEdytuj(r)} wylaczony={!!trwa} style={styles.trzy} />
              <PrzyciskAkcji tekst="📋 Kopiuj" rodzaj="zielony" onPress={() => onKopiuj(r)} wylaczony={!!trwa} style={styles.trzy} />
              <PrzyciskAkcji tekst="🗑 Usuń" rodzaj="usun" onPress={usun} wylaczony={!!trwa && trwa !== 'usun'} trwa={trwa === 'usun'} style={styles.trzy} />
            </RzadAkcji>
          </>
        ) : (
          <Text style={styles.podpowiedz}>{r.wlasna ? 'Tryb tylko do podglądu' : 'Możesz edytować tylko własne rezerwacje'}</Text>
        )}

        <RzadAkcji style={{ marginTop: 4 }}>
          <PrzyciskAkcji tekst="📤 Udostępnij rezerwację" rodzaj="niebieski" onPress={udostepnij} trwa={trwa === 'obrazek'} wylaczony={!!trwa && trwa !== 'obrazek'} />
        </RzadAkcji>
      </View>
      <ObrazekRezerwacji ref={obrazek} r={r} nazwy={nazwy} />
    </Arkusz>
  );
}

function Wiersz({ ikona, tekst, pogrubiony, maly, onPress }: { ikona: string; tekst: string; pogrubiony?: boolean; maly?: boolean; onPress?: () => void }) {
  return (
    <View style={styles.wierszIkony}>
      <Text style={[styles.ikona, maly && { fontSize: 15 }]}>{ikona}</Text>
      <Text
        onPress={onPress}
        suppressHighlighting
        style={[styles.wartosc, pogrubiony && { fontFamily: Fonts.semibold }, maly && { fontSize: 12, color: C.text3 }]}>
        {tekst}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hdr: { paddingTop: 18, paddingHorizontal: 16, paddingBottom: 14 },
  zrodlo: { fontFamily: Fonts.medium, fontSize: 11, color: 'rgba(255,255,255,0.8)', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 3 },
  nazwa: { fontFamily: Fonts.bold, fontSize: 20, color: '#fff', letterSpacing: -0.4, marginBottom: 2 },
  czas: { fontFamily: Fonts.regular, fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  body: { paddingTop: 14, paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  wierszIkony: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  ikona: { fontSize: 18, width: 26, textAlign: 'center' },
  wartosc: { flex: 1, fontFamily: Fonts.regular, fontSize: 14, color: C.text },
  instrukcje: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#fff8e1', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8, marginVertical: 2 },
  kreska: { borderTopWidth: 0.5, borderTopColor: C.border, marginTop: 6, paddingTop: 10 },
  podpowiedz: { fontFamily: Fonts.regular, fontSize: 12, color: C.text3, textAlign: 'center', paddingTop: 4 },
  trzy: { flexBasis: 90 },
});
