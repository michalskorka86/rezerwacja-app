import assert from 'node:assert/strict';
import { test } from 'node:test';

import { dataPl, domyslneUmowy, htmlUmowy } from '../src/logika/umowa';

const wynajem = { klient_imie_nazwisko: 'Jan <Kowalski>', klient_telefon: '501 234 567', data_wynajmu: '2026-11-05', data_zwrotu: '2026-11-07', kwota: 600, sprzet: { Maska: 4, Marker: 0 } };

test('umowa: dane z wynajmu i domyślne kwoty', () => {
  const d = domyslneUmowy(wynajem, '2026-11-05');
  assert.equal(d.kwota, '600');
  assert.equal(d.dataZwrotu, '2026-11-07');
  assert.equal(d.zaDzienZwloki, '100');
  assert.equal(d.wartoscSprzetu, '6000');
  assert.equal(d.sprzet, '4× Maska');
  assert.equal(dataPl('2026-11-07'), '07.11.2026');
});

test('umowa: wypełnione pola, kropki zamiast pustych, znaki HTML zabezpieczone, podpisy', () => {
  const d = domyslneUmowy(wynajem, '2026-11-05');
  const html = htmlUmowy(d, { najemca: { sciezka: 'M1 1 L5 5', szer: 300, wys: 150, czas: '05.11.2026, 14:32' } });
  assert.ok(html.includes('<b>Jan &lt;Kowalski&gt;</b>'));
  assert.ok(html.includes('na kwotę <b>600 zł</b>'));
  assert.ok(html.includes('seria <span class="kropki">'), 'pusty dowód → kropki');
  assert.equal((html.match(/<b>07\.11\.2026<\/b>/g) ?? []).length, 5, 'do, płatność, zwrot i 2× odbiór');
  assert.ok(html.includes('d="M1 1 L5 5"'));
  assert.ok(html.includes('podpisano 05.11.2026, 14:32'));
  assert.ok(html.includes('SILT Jakub Czapliński NIP 113 123 52 47'));
});

test('umowa: nic nie jest obowiązkowe — pusta umowa też się tworzy', () => {
  const pusta = htmlUmowy({ ...domyslneUmowy({ ...wynajem, klient_imie_nazwisko: '', klient_telefon: '', data_zwrotu: null, kwota: 0, sprzet: {} }, ''), dataUmowy: null });
  assert.ok(pusta.includes('Zawarta w dniu <span class="kropki">'));
  assert.ok(!pusta.includes('undefined') && !pusta.includes('null'));
});
