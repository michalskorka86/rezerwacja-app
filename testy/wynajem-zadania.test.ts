import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Wynajem, Zadanie } from '../src/logika/typy';
import {
  bladWynajmu,
  daneWynajmu,
  filtrujWynajmy,
  kwotaZl,
  moznaZmieniacWynajem,
  nowyWynajem,
  statusWynajmu,
  tekstSprzetu,
  wynajemDoEdycji,
  zmienIlosc,
} from '../src/logika/wynajem';
import { bladZadania, daneZadania, noweZadanie, podzielZadania, poTerminie, wygladPriorytetu } from '../src/logika/zadania';

const w = (z: Partial<Wynajem>): Wynajem => ({
  id: 1,
  klient_imie_nazwisko: 'Firma',
  klient_telefon: '512 000 111',
  data_wynajmu: '2026-10-01',
  data_zwrotu: null,
  kwota: 350.5,
  zaplacono: false,
  zwrocono: false,
  sprzet: { Maska: 10 },
  uwagi: null,
  dodane_przez: 1,
  marka: 'silt',
  utworzona: null,
  platnosc: 'Gotówka',
  faktura_nazwa: null,
  faktura_nip: null,
  faktura_email: null,
  przeterminowany: false,
  ...z,
});

test('wynajem: filtry i kolejność', () => {
  const lista = [
    w({ id: 1, data_wynajmu: '2026-09-01' }),
    w({ id: 2, data_wynajmu: '2026-10-01', zwrocono: true }),
    w({ id: 3, data_wynajmu: '2026-10-01', marka: 'arsenal' }),
  ];
  assert.deepEqual(filtrujWynajmy(lista, 'aktywne', 'wszystkie').map((x) => x.id), [3, 1]);
  assert.deepEqual(filtrujWynajmy(lista, 'zwrocone', 'wszystkie').map((x) => x.id), [2]);
  assert.deepEqual(filtrujWynajmy(lista, 'wszystkie', 'silt').map((x) => x.id), [2, 1]);
  assert.deepEqual(filtrujWynajmy(lista, 'wszystkie', 'arsenal').map((x) => x.id), [3]);
});

test('wynajem: teksty i status', () => {
  assert.equal(tekstSprzetu({ Maska: 10, ASG: 4 }), '10× Maska · 4× ASG');
  assert.equal(tekstSprzetu({}), '');
  assert.equal(kwotaZl(350.5), '351 zł');
  assert.equal(statusWynajmu({ zwrocono: true, przeterminowany: false }).tekst, '✓ Zwrócony');
  assert.equal(statusWynajmu({ zwrocono: false, przeterminowany: true }).tekst, '⚠ Przeterminowany');
  assert.equal(statusWynajmu({ zwrocono: false, przeterminowany: false }).tekst, 'Niezwrócony');
});

test('wynajem: − / + sprzętu', () => {
  let s = zmienIlosc({}, 'Maska', 1);
  s = zmienIlosc(s, 'Maska', 1);
  assert.deepEqual(s, { Maska: 2 });
  s = zmienIlosc(s, 'Maska', -5);
  assert.deepEqual(s, {});
});

test('wynajem: sprawdzanie i dane do API', () => {
  const n = nowyWynajem('2026-10-02');
  assert.equal(bladWynajmu(n), 'Wypełnij wymagane pola');
  const ok = { ...n, imie: 'Jan', telefon: '501 234 567', kwota: '350,50', sprzet: { Maska: 2 } };
  assert.equal(bladWynajmu(ok), null);
  assert.equal(bladWynajmu({ ...ok, dataZwrotu: '2026-10-01' }), 'Zwrot nie może być przed datą wynajmu');
  assert.equal(bladWynajmu({ ...ok, kwota: '12,345' }), 'Zła kwota');
  const d = daneWynajmu(ok, 9);
  assert.equal(d.kwota, '350.50');
  assert.equal(d.id, 9);
  assert.deepEqual(d.sprzet, { Maska: 2 });
  const e = wynajemDoEdycji(w({ kwota: 400, platnosc: 'Karta' }));
  assert.equal(e.kwota, '400');
  assert.equal(e.platnosc, 'Karta');
});

test('wynajem: zmieniać tylko swoją markę', () => {
  assert.ok(moznaZmieniacWynajem(w({ marka: 'silt' }), 'silt', 'pelny'));
  assert.ok(!moznaZmieniacWynajem(w({ marka: 'arsenal' }), 'silt', 'pelny'));
  assert.ok(!moznaZmieniacWynajem(w({ marka: 'silt' }), 'silt', 'podglad'));
});

const z = (x: Partial<Zadanie>): Zadanie => ({
  id: 1,
  tytul: 'X',
  opis: null,
  priorytet: 'normalne',
  dla_kogo: 2,
  dodane_przez: 1,
  termin: null,
  wykonane: false,
  wykonane_kiedy: null,
  utworzone: null,
  dla_imie: 'Paweł',
  od_imie: 'Michał',
  ...x,
});

test('zadania: kolejność jak w PWA', () => {
  const { aktywne, wykonane } = podzielZadania([
    z({ id: 1, priorytet: 'normalne' }),
    z({ id: 2, priorytet: 'pilne', termin: '2026-10-10' }),
    z({ id: 3, priorytet: 'pilne', termin: '2026-10-05' }),
    z({ id: 4, wykonane: true }),
    z({ id: 5, priorytet: 'wazne' }),
  ]);
  assert.deepEqual(aktywne.map((x) => x.id), [3, 2, 5, 1]);
  assert.deepEqual(wykonane.map((x) => x.id), [4]);
  assert.equal(wygladPriorytetu('pilne').etykieta, 'Pilne');
  assert.ok(poTerminie(z({ termin: '2026-10-01' }), '2026-10-02'));
  assert.ok(!poTerminie(z({ termin: '2026-10-01', wykonane: true }), '2026-10-02'));
});

test('zadania: sprawdzanie', () => {
  assert.equal(bladZadania(noweZadanie(null)), 'Wybierz, dla kogo jest zadanie');
  assert.equal(bladZadania(noweZadanie(2)), 'Podaj tytuł zadania');
  const s = { ...noweZadanie(2), tytul: ' Kulki ' };
  assert.equal(bladZadania(s), null);
  assert.deepEqual(daneZadania(s), { dla_kogo: 2, tytul: 'Kulki', priorytet: 'normalne', termin: '', opis: '' });
});
