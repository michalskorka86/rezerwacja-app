import assert from 'node:assert/strict';
import { test } from 'node:test';

import { dodajDni, formatGodz, godziny, krotkaData, siatkaMiesiaca, tytulDnia, zakresPobierania } from '../src/logika/daty';
import {
  dniHarmonogramu,
  emojiDodatkow,
  emojiDodatku,
  filtruj,
  liniaKarty,
  liniaMiniKarty,
  pasekDni,
  pasujeDoSzukania,
  wpisMiesiaca,
} from '../src/logika/kalendarz';
import { htmlRozpiski, obliczSprzet, rezerwacjeRozpiski, uwagiBezTelefonow } from '../src/logika/rozpiska';
import { czySwieto, wielkanoc } from '../src/logika/swieta';
import type { Rezerwacja } from '../src/logika/typy';

let nastepneId = 1;
function rez(z: Partial<Rezerwacja>): Rezerwacja {
  return {
    id: nastepneId++,
    klient_imie_nazwisko: 'Jan Kowalski',
    klient_telefon: '501 234 567',
    klient_email: null,
    marka: 'silt',
    lokalizacja: 'silt',
    atrakcja_id: 1,
    liczba_osob: 10,
    data_rezerwacji: '2026-10-05',
    godzina_start: '10:00:00',
    godzina_koniec: null,
    uwagi: null,
    instrukcje: null,
    status: 'oczekujaca',
    zadatek_status: 'brak',
    zadatek_kwota: 100,
    zadatek_data_oplacenia: null,
    dodana_przez: null,
    zrodlo: 'panel',
    utworzona: null,
    zaktualizowana: null,
    sms_wyslany: false,
    mail_zadatek_wyslany: false,
    mail_potw_wyslany: false,
    atrakcja_nazwa: 'Paintball Klasyczny',
    atrakcja_kolor: '#8B6355',
    dodatki: [],
    kolor_karty: '#8B6355',
    wlasna: true,
    nowa: false,
    ...z,
  };
}

test('daty', () => {
  assert.equal(dodajDni('2026-03-28', 2), '2026-03-30'); // przez zmianę czasu
  assert.equal(dodajDni('2026-12-31', 1), '2027-01-01');
  assert.equal(formatGodz('9:5:00'), '09:05');
  assert.equal(formatGodz(null), '');
  assert.equal(godziny('10:00:00', '13:30:00'), '10:00–13:30');
  assert.equal(godziny('10:00:00', null), '10:00');
  assert.equal(krotkaData('2026-10-02'), '2 paź');
  assert.equal(tytulDnia('2026-10-02'), 'Piątek 2 paź');
  assert.deepEqual(zakresPobierania('2026-10-02'), { od: '2026-09-01', do: '2027-04-10' });
});

test('siatka miesiąca od poniedziałku', () => {
  const s = siatkaMiesiaca('2026-10-01'); // 1.10.2026 = czwartek
  assert.deepEqual(s[0], [null, null, null, '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
  assert.equal(s.length, 5);
  assert.equal(s[4][5], '2026-10-31');
  assert.equal(s[4][6], null);
  assert.equal(siatkaMiesiaca('2026-02-01').length, 4 + 1); // luty 2026 zaczyna się w niedzielę
});

test('święta', () => {
  assert.equal(wielkanoc(2026).getDate(), 5); // 5 kwietnia 2026
  assert.equal(wielkanoc(2027).getMonth(), 2); // 28 marca 2027
  assert.ok(czySwieto('2026-04-06')); // Poniedziałek Wielkanocny
  assert.ok(czySwieto('2026-06-04')); // Boże Ciało
  assert.ok(czySwieto('2026-11-11'));
  assert.ok(czySwieto('2030-05-03')); // dalsze lata też (PWA miało tylko do 2027)
  assert.ok(czySwieto('2026-12-24')); // Wigilia od 2025
  assert.ok(!czySwieto('2024-12-24'));
  assert.ok(!czySwieto('2026-10-02'));
});

test('szukanie po nazwisku i telefonie', () => {
  const r = rez({ klient_imie_nazwisko: 'Óla Źdźbło', klient_telefon: '501 234 567' });
  assert.ok(pasujeDoSzukania(r, 'źdź'));
  assert.ok(pasujeDoSzukania(r, '234567'));
  assert.ok(pasujeDoSzukania(r, '501 23'));
  assert.ok(!pasujeDoSzukania(r, 'kowal'));
  assert.ok(pasujeDoSzukania(r, '  '));
});

test('harmonogram: puste dni od najstarszej do najnowszej, sortowanie po godzinie', () => {
  const a = rez({ data_rezerwacji: '2026-10-05', godzina_start: '14:00:00' });
  const b = rez({ data_rezerwacji: '2026-10-05', godzina_start: '09:30:00' });
  const c = rez({ data_rezerwacji: '2026-10-08', klient_imie_nazwisko: 'Anna Nowak' });
  const dni = dniHarmonogramu([a, c, b], '2026-10-02');
  assert.deepEqual(dni.map((d) => d.data), ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08']);
  assert.deepEqual(dni[0].rezerwacje.map((r) => r.id), [b.id, a.id]);
  assert.equal(dni[1].rezerwacje.length, 0);
  const szukane = dniHarmonogramu([a, c, b], '2026-10-02', 'nowak');
  assert.deepEqual(szukane.map((d) => d.data), ['2026-10-08']);
  const puste = dniHarmonogramu([], '2026-10-02');
  assert.equal(puste[0].data, '2026-10-02');
  assert.equal(puste[puste.length - 1].data, '2026-11-02');
});

test('pasek dni: wczoraj … +13', () => {
  const p = pasekDni([rez({ data_rezerwacji: '2026-10-03' })], '2026-10-02');
  assert.equal(p.length, 15);
  assert.equal(p[0].data, '2026-10-01');
  assert.ok(p[1].dzis);
  assert.ok(p[2].sa);
  assert.ok(!p[1].sa);
});

test('teksty kart', () => {
  assert.equal(liniaKarty(rez({ status: 'potwierdzona', liczba_osob: 12 })), 'P12 os · Jan Kowalski');
  assert.equal(liniaKarty(rez({ liczba_osob: 8 })), '8 os · Jan Kowalski');
  assert.equal(liniaMiniKarty(rez({ marka: 'arsenal', lokalizacja: 'wolomin', atrakcja_nazwa: 'ASG' })), 'W10 os · ASG');
  assert.equal(wpisMiesiaca(rez({ liczba_osob: 12 })), '12os Jan');
});

test('emoji dodatków — „kiełbaski” przed „ogniskiem”, jak w PWA', () => {
  assert.equal(emojiDodatku('Ognisko z kiełbaskami'), '🌭');
  assert.equal(emojiDodatku('Ognisko'), '🔥');
  assert.equal(emojiDodatku('Puchar dla zwycięzców'), '🏆');
  assert.equal(emojiDodatku('Quady'), null);
  assert.equal(emojiDodatkow(['Ognisko', 'Quady', 'GoPro']), '🔥 🎥');
});

test('filtr w telefonie', () => {
  const s = rez({ marka: 'silt' });
  const w = rez({ marka: 'arsenal', lokalizacja: 'wolomin' });
  const rb = rez({ marka: 'arsenal', lokalizacja: 'rembert', nowa: true });
  const lista = [s, w, rb];
  assert.deepEqual(filtruj(lista, 'all').length, 3);
  assert.deepEqual(filtruj(lista, 'silt'), [s]);
  assert.deepEqual(filtruj(lista, 'arsenal'), [w, rb]);
  assert.deepEqual(filtruj(lista, 'wolomin'), [w]);
  assert.deepEqual(filtruj(lista, 'rembert'), [rb]);
  assert.deepEqual(filtruj(lista, 'new'), [rb]);
});

test('rozpiski: sprzęt na raz (gra 3 h), jak pdf_dzien.php', () => {
  const lista = [
    rez({ marka: 'arsenal', lokalizacja: 'rembert', data_rezerwacji: '2026-10-10', godzina_start: '10:00:00', liczba_osob: 10, atrakcja_id: 1, atrakcja_nazwa: 'Paintball' }),
    rez({ marka: 'arsenal', lokalizacja: 'rembert', data_rezerwacji: '2026-10-10', godzina_start: '12:00:00', liczba_osob: 8, atrakcja_id: 1, atrakcja_nazwa: 'Paintball' }),
    rez({ marka: 'arsenal', lokalizacja: 'wolomin', data_rezerwacji: '2026-10-10', godzina_start: '13:00:00', liczba_osob: 6, atrakcja_id: 1, atrakcja_nazwa: 'Paintball' }), // start = koniec pierwszej
    rez({ marka: 'arsenal', lokalizacja: 'wolomin', data_rezerwacji: '2026-10-10', godzina_start: '11:00:00', liczba_osob: 12, atrakcja_id: 2, atrakcja_nazwa: 'ASG' }),
    rez({ marka: 'silt', data_rezerwacji: '2026-10-10', godzina_start: '11:00:00', liczba_osob: 30 }),
  ];
  const dzien = rezerwacjeRozpiski(lista, '2026-10-10', 'all');
  assert.equal(dzien.length, 4);
  assert.deepEqual(obliczSprzet(dzien), [
    { atrakcja: 'ASG', grup: 1, max_osob: 12, osob_lacznie: 12 },
    { atrakcja: 'Paintball', grup: 3, max_osob: 18, osob_lacznie: 24 },
  ]);
  assert.equal(rezerwacjeRozpiski(lista, '2026-10-10', 'wolomin').length, 2);
});

test('rozpiski: bez anulowanych, uwagi bez telefonów, HTML do druku', () => {
  const lista = [
    rez({ id: 1, marka: 'arsenal', lokalizacja: 'wolomin', data_rezerwacji: '2026-10-10', godzina_start: '10:00:00', liczba_osob: 10, atrakcja_id: 1, atrakcja_nazwa: 'Paintball', dodatki: [5], uwagi: 'Tel 501234567  urodziny <Kasi>', zadatek_status: 'oplacony', klient_imie_nazwisko: 'Jan & syn' }),
    rez({ id: 2, marka: 'arsenal', lokalizacja: 'rembert', data_rezerwacji: '2026-10-10', godzina_start: '09:00:00', status: 'anulowana' }),
  ];
  const dzien = rezerwacjeRozpiski(lista, '2026-10-10', 'all');
  assert.deepEqual(dzien.map((r) => r.id), [1]);
  assert.equal(uwagiBezTelefonow('Tel +48 501234567  urodziny'), 'Tel urodziny');
  const html = htmlRozpiski(dzien, '2026-10-10', 'all', { '5': 'Ognisko' });
  assert.ok(html.includes('Sobota, 10.10.2026'));
  assert.ok(html.includes('Rembertów + Wołomin'));
  assert.ok(html.includes('✅ Ognisko'));
  assert.ok(html.includes('urodziny &lt;Kasi&gt;') && !html.includes('501234567'));
  assert.ok(html.includes('Jan &amp; syn'));
  assert.ok(html.includes('10 szt.'));
  assert.ok(htmlRozpiski([], '2026-10-11', 'rembert', {}).includes('Brak rezerwacji na 11.10.2026 (Rembertów)'));
});
