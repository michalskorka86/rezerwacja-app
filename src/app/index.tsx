import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PasekNowejWersji } from '@/components/Aktualizacje';
import { FormularzRezerwacji } from '@/components/formularz/FormularzRezerwacji';
import { GornyPasek, type Widok } from '@/components/kalendarz/GornyPasek';
import { Harmonogram, type HarmonogramRef } from '@/components/kalendarz/Harmonogram';
import { Legenda, PasekDni } from '@/components/kalendarz/PasekDni';
import { SzczegolyRezerwacji } from '@/components/kalendarz/SzczegolyRezerwacji';
import { WidokDnia } from '@/components/kalendarz/WidokDnia';
import { WidokMiesiaca } from '@/components/kalendarz/WidokMiesiaca';
import { Arkusz } from '@/components/ui/Arkusz';
import { useKomunikaty } from '@/components/ui/Komunikaty';
import { WBudowie } from '@/components/WBudowie';
import { WynajemSprzetu } from '@/components/wynajem/WynajemSprzetu';
import { Zadania } from '@/components/zadania/Zadania';
import { ZmianaHasla } from '@/components/ZmianaHasla';
import { C, cien, Fonts, Size } from '@/constants/theme';
import { dzisStr, miesiac } from '@/logika/daty';
import type { TrybFormularza } from '@/logika/formularz';
import { dniHarmonogramu, FILTRY, filtruj } from '@/logika/kalendarz';
import type { Filtr, Rezerwacja } from '@/logika/typy';
import { useDane } from '@/stan/DaneProvider';
import { ustawEkran } from '@/stan/zglos';

type Okno = null | 'wynajem' | 'zadania' | 'ustawienia' | 'rozpiski' | 'haslo';

/** Ekran główny — kalendarz rezerwacji (kalendarz.php z PWA). */
export default function Kalendarz() {
  const dane = useDane();
  const { konto, slowniki, licznik, odswiezam, bladOdswiezania, pobrano, filtr, ustawFiltr, niedoszle } = dane;
  const { toast, zapytaj } = useKomunikaty();
  const insets = useSafeAreaInsets();
  const harmonogram = useRef<HarmonogramRef>(null);

  const [dzis, setDzis] = useState(dzisStr());
  const [widok, setWidok] = useState<Widok>('tydzien');
  const [miesiacWidoku, setMiesiacWidoku] = useState(miesiac(dzisStr()));
  const [dzien, setDzien] = useState<string | null>(null);
  const [szukanie, setSzukanie] = useState(false);
  const [zapytanie, setZapytanie] = useState('');
  const [menuFiltra, setMenuFiltra] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [wybrana, setWybrana] = useState<Rezerwacja | null>(null);
  const [okno, setOkno] = useState<Okno>(null);
  const [formularz, setFormularz] = useState<{ tryb: TrybFormularza; nr: number } | null>(null);
  const otworzFormularz = (tryb: TrybFormularza) => setFormularz((f) => ({ tryb, nr: (f?.nr ?? 0) + 1 }));

  const uzytkownik = konto?.uzytkownik;
  const ustawienia = konto?.ustawienia;

  // dzień zmienia się o północy — kalendarz ma to widzieć bez restartu
  useEffect(() => {
    ustawEkran('kalendarz');
    const t = setInterval(() => setDzis(dzisStr()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // po resecie hasła przez admina — od razu okno zmiany hasła (jak w PWA); „✕” odkłada je do następnego startu
  const [hasloOdlozone, setHasloOdlozone] = useState(false);
  const oknoHasla = okno === 'haslo' || (!!uzytkownik?.haslo_reset && !hasloOdlozone);

  const widoczne = useMemo(
    () => (filtr === 'niedoszle' ? (niedoszle ?? []) : filtruj(dane.rezerwacje, filtr)),
    [filtr, niedoszle, dane.rezerwacje],
  );
  const dni = useMemo(() => dniHarmonogramu(widoczne, dzis, szukanie ? zapytanie : ''), [widoczne, dzis, szukanie, zapytanie]);

  // po pierwszym wczytaniu i po zmianie filtra — przewiń do dzisiaj
  const przewinieto = useRef<string | null>(null);
  useEffect(() => {
    if (widok !== 'tydzien' || !dni.length || przewinieto.current === filtr) return;
    przewinieto.current = filtr;
    const t = setTimeout(() => harmonogram.current?.przewinDo(dzis, false), 150);
    return () => clearTimeout(t);
  }, [dni.length, dzis, filtr, widok]);

  const naRezerwacje = useCallback((r: Rezerwacja) => setWybrana(r), []);

  const naDzisiaj = () => {
    if (widok === 'miesiac') return setMiesiacWidoku(miesiac(dzis));
    if (!harmonogram.current?.przewinDo(dzis)) toast('Brak rezerwacji na dziś');
  };

  const naOdswiez = async () => {
    const ok = await dane.odswiez(true);
    toast(ok ? '✅ Odświeżono' : '⚠️ ' + (bladOdswiezania ?? 'Nie udało się odświeżyć'));
  };

  const naWidok = (w: Widok) => {
    setWidok(w);
    if (w === 'dzien') setDzien(dzis);
    if (w === 'miesiac') setMiesiacWidoku(miesiac(dzis));
    if (w === 'tydzien') przewinieto.current = null;
  };

  const naKonto = () =>
    zapytaj({ tytul: 'Wylogować się?', tekst: 'Dane rezerwacji zostaną usunięte z tego telefonu.', ok: 'Wyloguj', niebezpieczne: true, onOk: () => dane.wyloguj() });

  const wybierzFiltr = (f: Filtr) => {
    setMenuFiltra(null);
    przewinieto.current = null;
    ustawFiltr(f);
  };

  if (!uzytkownik || !ustawienia) {
    return (
      <SafeAreaView style={[styles.ekran, styles.srodek]}>
        <Text style={styles.ladowanie}>{bladOdswiezania ? '⚠️ ' + bladOdswiezania : 'Ładowanie...'}</Text>
        {bladOdswiezania ? (
          <Pressable onPress={() => dane.odswiez(true)} style={styles.ponow}>
            <Text style={styles.ponowTxt}>🔄 Spróbuj ponownie</Text>
          </Pressable>
        ) : null}
      </SafeAreaView>
    );
  }

  const offline = bladOdswiezania && pobrano;
  const czasDanych = pobrano ? new Date(pobrano).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <SafeAreaView style={styles.ekran} edges={['top', 'left', 'right']}>
      <GornyPasek
        logo={ustawienia.logo}
        imie={uzytkownik.imie}
        arsenal={uzytkownik.marka === 'arsenal'}
        filtr={filtr}
        ileNowych={licznik.nowe}
        ileZadan={licznik.zadania}
        widok={widok}
        szukanieOtwarte={szukanie}
        zapytanie={zapytanie}
        odswiezam={odswiezam}
        onFiltr={setMenuFiltra}
        onSzukaj={() => {
          setSzukanie((s) => !s);
          setZapytanie('');
        }}
        onZapytanie={setZapytanie}
        onDzisiaj={naDzisiaj}
        onOdswiez={naOdswiez}
        onRozpiski={() => setOkno('rozpiski')}
        onKonto={naKonto}
        onWynajem={() => setOkno('wynajem')}
        onZadania={() => setOkno('zadania')}
        onWidok={naWidok}
      />

      {offline ? (
        <Pressable onPress={() => dane.odswiez(true)} style={styles.offline}>
          <Text style={styles.offlineTxt}>⚠️ {bladOdswiezania} Pokazuję dane z godz. {czasDanych} — dotknij, aby odświeżyć.</Text>
        </Pressable>
      ) : null}

      {widok === 'miesiac' ? (
        <WidokMiesiaca
          pierwszy={miesiacWidoku}
          rezerwacje={widoczne}
          dzis={dzis}
          onZmienMiesiac={setMiesiacWidoku}
          onDzien={(ds) => {
            setWidok('tydzien');
            przewinieto.current = filtr;
            setDzien(ds);
          }}
          onRezerwacja={naRezerwacje}
        />
      ) : (
        <Harmonogram
          ref={harmonogram}
          dni={dni}
          dzis={dzis}
          nazwyDodatkow={slowniki?.nazwy_dodatkow ?? {}}
          onRezerwacja={naRezerwacje}
          pustyTekst={filtr === 'niedoszle' && niedoszle === null ? 'Ładowanie...' : szukanie && zapytanie ? 'Nic nie znaleziono' : 'Brak rezerwacji'}
          naglowek={
            <>
              <PasekNowejWersji />
              {!szukanie ? <PasekDni rezerwacje={widoczne} dzis={dzis} onDzien={(ds) => harmonogram.current?.przewinDo(ds)} /> : null}
              {!szukanie && slowniki ? <Legenda atrakcje={slowniki.atrakcje} marka={uzytkownik.marka} innyKolor={ustawienia.inny_kolor} /> : null}
            </>
          }
        />
      )}

      {uzytkownik.rola !== 'podglad' ? (
        <View style={[styles.fabWrap, { bottom: 20 + insets.bottom }]} pointerEvents="box-none">
          <Pressable onPress={() => otworzFormularz({ rodzaj: 'nowa' })} style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]} accessibilityRole="button">
            <Text style={styles.fabTxt}>＋ Dodaj rezerwację</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Lista filtra (.filter-dd) */}
      <Modal visible={!!menuFiltra} transparent animationType="fade" onRequestClose={() => setMenuFiltra(null)} statusBarTranslucent>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuFiltra(null)} />
        {menuFiltra ? (
          <View style={[styles.menu, { top: menuFiltra.y + menuFiltra.h + 6, left: Math.max(8, Math.min(menuFiltra.x, 9999)) }]}>
            {FILTRY.map((f) => (
              <Pressable key={f.filtr} onPress={() => wybierzFiltr(f.filtr)} style={({ pressed }) => [styles.opcja, pressed && { backgroundColor: C.bg }, filtr === f.filtr && { backgroundColor: C.bg }]}>
                <Text
                  style={[
                    styles.opcjaTxt,
                    f.filtr === 'new' && { color: C.alarm, fontFamily: Fonts.semibold },
                    f.filtr === 'niedoszle' && { color: C.pomarancz, fontFamily: Fonts.semibold },
                  ]}>
                  {f.opcja}
                  {f.filtr === 'new' && licznik.nowe > 0 ? ` (${licznik.nowe})` : ''}
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => {
                setMenuFiltra(null);
                setOkno('ustawienia');
              }}
              style={({ pressed }) => [styles.opcja, styles.opcjaUst, pressed && { backgroundColor: C.bg }]}>
              <Text style={[styles.opcjaTxt, { color: C.text2 }]}>⚙️ Ustawienia</Text>
            </Pressable>
          </View>
        ) : null}
      </Modal>

      <WidokDnia
        data={dzien}
        rezerwacje={widoczne}
        onZmienDzien={setDzien}
        onZamknij={() => {
          setDzien(null);
          if (widok === 'dzien') setWidok('tydzien');
        }}
        onRezerwacja={(r) => {
          setDzien(null);
          if (widok === 'dzien') setWidok('tydzien');
          setTimeout(() => setWybrana(r), 250);
        }}
      />

      <SzczegolyRezerwacji
        r={wybrana ? (dane.rezerwacje.find((x) => x.id === wybrana.id) ?? niedoszle?.find((x) => x.id === wybrana.id) ?? wybrana) : null}
        onZamknij={() => setWybrana(null)}
        onEdytuj={(r) => {
          setWybrana(null);
          setTimeout(() => otworzFormularz({ rodzaj: 'edycja', r }), 250);
        }}
        onKopiuj={(r) => {
          setWybrana(null);
          setTimeout(() => {
            otworzFormularz({ rodzaj: 'kopia', r });
            toast('📋 Dane skopiowane — wybierz nową datę');
          }, 250);
        }}
      />

      {formularz ? (
        <FormularzRezerwacji
          key={formularz.nr}
          tryb={formularz.tryb}
          onZamknij={() => setFormularz(null)}
          onZapisano={(r, nowa) => {
            setFormularz(null);
            dane.zastosuj(r);
            toast(nowa ? '✅ Rezerwacja dodana!' : '✅ Zmiany zapisane!');
            if (widok === 'tydzien') setTimeout(() => harmonogram.current?.przewinDo(r.data_rezerwacji), 300);
            dane.odswiez();
          }}
        />
      ) : null}

      <Arkusz widoczny={okno === 'wynajem'} onZamknij={() => setOkno(null)} tytul="📦 Wynajem sprzętu" nazwa="wynajem" wysokosc={0.98}>
        <WynajemSprzetu />
      </Arkusz>
      <Arkusz widoczny={okno === 'zadania'} onZamknij={() => setOkno(null)} tytul="📋 Zadania" nazwa="zadania" wysokosc={0.96} bezPaddingu>
        <Zadania />
      </Arkusz>
      <Arkusz widoczny={okno === 'ustawienia'} onZamknij={() => setOkno(null)} tytul="⚙️ Ustawienia" nazwa="ustawienia" wysokosc={0.98}>
        <WBudowie co="Ustawienia" />
      </Arkusz>
      <Arkusz widoczny={okno === 'rozpiski'} onZamknij={() => setOkno(null)} tytul="📄 Rozpiski dnia" nazwa="rozpiski">
        <WBudowie co="Rozpiski" />
      </Arkusz>
      <Arkusz
        widoczny={oknoHasla && okno !== 'wynajem' && okno !== 'zadania'}
        onZamknij={() => {
          setHasloOdlozone(true);
          setOkno(null);
        }}
        tytul="🔑 Zmień hasło"
        nazwa="haslo">
        <ZmianaHasla onGotowe={() => setOkno(null)} />
      </Arkusz>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1, backgroundColor: C.bg },
  srodek: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  ladowanie: { fontFamily: Fonts.regular, fontSize: 14, color: C.text3, textAlign: 'center' },
  ponow: { backgroundColor: C.text, borderRadius: Size.rs, paddingVertical: 14, paddingHorizontal: 22 },
  ponowTxt: { color: '#fff', fontFamily: Fonts.semibold, fontSize: 14 },
  offline: { backgroundColor: '#fff3e0', borderBottomWidth: 1, borderBottomColor: '#ffcc80', paddingVertical: 8, paddingHorizontal: 14 },
  offlineTxt: { fontFamily: Fonts.medium, fontSize: 12, color: C.pomarancz },
  fabWrap: { position: 'absolute', left: 14, right: 14, alignItems: 'center' },
  fab: { width: '100%', maxWidth: 400, backgroundColor: C.text, borderRadius: Size.radius, padding: 15, alignItems: 'center', ...cien(3) },
  fabTxt: { color: '#fff', fontFamily: Fonts.semibold, fontSize: 14 },
  menu: { position: 'absolute', minWidth: 190, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, overflow: 'hidden', ...cien(2) },
  opcja: { paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  opcjaUst: { borderBottomWidth: 0, borderTopWidth: 1, borderTopColor: C.border, marginTop: 4 },
  opcjaTxt: { fontFamily: Fonts.regular, fontSize: 13, color: C.text },
});
