import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  bladFormularza,
  czyZmieniony,
  daneDoWyslania,
  godzinyDoWyboru,
  przelaczDodatek,
  pustyFormularz,
  stanPoczatkowy,
  tytulFormularza,
} from '../src/logika/formularz';
import type { Rezerwacja } from '../src/logika/typy';

const r: Rezerwacja = {
  id: 7,
  klient_imie_nazwisko: 'Jan Kowalski',
  klient_telefon: '501 234 567',
  klient_email: 'jan@example.com',
  marka: 'arsenal',
  lokalizacja: 'wolomin',
  atrakcja_id: 3,
  liczba_osob: 12,
  data_rezerwacji: '2026-10-10',
  godzina_start: '10:30:00',
  godzina_koniec: '13:00:00',
  uwagi: 'Tort',
  instrukcje: 'Gotówka',
  status: 'potwierdzona',
  zadatek_status: 'oplacony',
  zadatek_kwota: 100,
  zadatek_data_oplacenia: null,
  dodana_przez: 1,
  zrodlo: 'panel',
  utworzona: null,
  zaktualizowana: null,
  sms_wyslany: false,
  mail_zadatek_wyslany: false,
  mail_potw_wyslany: false,
  atrakcja_nazwa: 'ASG',
  atrakcja_kolor: '#000',
  dodatki: [1, 4],
  kolor_karty: '#000',
  wlasna: true,
  nowa: false,
};

test('nowa rezerwacja: SILT ma lokalizację od razu, Arsenał musi wybrać', () => {
  assert.equal(pustyFormularz('silt').lokalizacja, 'silt');
  assert.equal(pustyFormularz('arsenal').lokalizacja, null);
  assert.equal(bladFormularza(pustyFormularz('arsenal'), 'arsenal'), 'Wybierz lokalizację');
  assert.equal(bladFormularza(pustyFormularz('silt'), 'silt'), 'Wybierz datę');
});

test('edycja: wszystko z rezerwacji', () => {
  const s = stanPoczatkowy({ rodzaj: 'edycja', r }, 'arsenal');
  assert.equal(s.osoby, '12');
  assert.equal(s.data, '2026-10-10');
  assert.equal(s.od, '10:30');
  assert.equal(s.do, '13:00');
  assert.ok(s.potwierdzona);
  assert.ok(s.zadatek);
  assert.equal(s.lokalizacja, 'wolomin');
  assert.deepEqual(s.dodatki, [1, 4]);
  assert.equal(bladFormularza(s, 'arsenal'), null);
});

test('kopia: bez daty, godzin, zadatku i potwierdzenia (jak PWA)', () => {
  const s = stanPoczatkowy({ rodzaj: 'kopia', r }, 'arsenal');
  assert.equal(s.imie, 'Jan Kowalski');
  assert.equal(s.atrakcjaId, 3);
  assert.equal(s.data, null);
  assert.equal(s.od, null);
  assert.ok(!s.zadatek);
  assert.ok(!s.potwierdzona);
  assert.equal(s.lokalizacja, 'wolomin');
  assert.equal(tytulFormularza({ rodzaj: 'kopia', r }, 'wolomin'), '📋 Kopia rezerwacji');
});

test('sprawdzanie pól', () => {
  const ok = { ...pustyFormularz('silt'), data: '2026-10-10', od: '10:00' };
  assert.equal(bladFormularza(ok, 'silt'), null);
  assert.equal(bladFormularza({ ...ok, od: null }, 'silt'), 'Wybierz godzinę rozpoczęcia');
  assert.equal(bladFormularza({ ...ok, do: '09:30' }, 'silt'), 'Godzina zakończenia musi być późniejsza niż rozpoczęcia');
  assert.equal(bladFormularza({ ...ok, telefon: 'abc' }, 'silt'), 'Zły numer telefonu');
  assert.equal(bladFormularza({ ...ok, telefon: '+48 501-234-567' }, 'silt'), null);
  assert.equal(bladFormularza({ ...ok, email: 'jan@' }, 'silt'), 'Zły adres e-mail');
});

test('dane do API', () => {
  const s = { ...stanPoczatkowy({ rodzaj: 'edycja', r }, 'arsenal'), imie: '  Jan  ', do: null };
  const d = daneDoWyslania(s, 7);
  assert.equal(d.id, 7);
  assert.equal(d.imie_nazwisko, 'Jan');
  assert.equal(d.liczba_osob, 12);
  assert.equal(d.godzina_koniec, '');
  assert.equal(d.lokalizacja, 'wolomin');
  assert.equal(daneDoWyslania({ ...pustyFormularz('silt') }).liczba_osob, 0);
  assert.equal(daneDoWyslania({ ...pustyFormularz('silt') }).id, undefined);
});

test('godziny, dodatki, zmiany', () => {
  const g = godzinyDoWyboru();
  assert.equal(g[0], '07:00');
  assert.equal(g[g.length - 1], '22:30');
  assert.equal(g.length, 32);
  assert.deepEqual(przelaczDodatek([1, 2], 2), [1]);
  assert.deepEqual(przelaczDodatek([1], 3), [1, 3]);
  const p = pustyFormularz('silt');
  assert.ok(!czyZmieniony({ ...p }, p));
  assert.ok(czyZmieniony({ ...p, imie: 'x' }, p));
  assert.ok(!czyZmieniony({ ...p, lokalizacja: 'wolomin' }, p));
});
