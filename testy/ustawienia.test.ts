import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bladHasla, bladUzytkownika, daneUzytkownika, nowyUzytkownik } from '../src/logika/ustawienia';

test('ustawienia: nowy użytkownik', () => {
  assert.equal(bladUzytkownika(nowyUzytkownik()), 'Wypełnij wszystkie pola');
  const s = { ...nowyUzytkownik(), imie: ' Marek ', login: 'marek', haslo: '12345' };
  assert.equal(bladUzytkownika(s), 'Hasło min. 6 znaków');
  const ok = { ...s, haslo: 'tajne12', rola: 'instruktor' as const, marka: 'arsenal' as const };
  assert.equal(bladUzytkownika(ok), null);
  assert.deepEqual(daneUzytkownika(ok), { imie: 'Marek', login: 'marek', haslo: 'tajne12', rola_nazwa: 'instruktor', marka: 'arsenal' });
});

test('ustawienia: zmiana hasła', () => {
  assert.equal(bladHasla({ stare: '', nowe: 'abcdef', nowe2: 'abcdef', reset: false }), 'Wypełnij wszystkie pola');
  assert.equal(bladHasla({ stare: '', nowe: 'abcdef', nowe2: 'abcdef', reset: true }), null);
  assert.equal(bladHasla({ stare: 'x', nowe: 'abcdef', nowe2: 'abcdeg', reset: false }), 'Hasła nie są identyczne');
  assert.equal(bladHasla({ stare: 'x', nowe: 'abc', nowe2: 'abc', reset: false }), 'Hasło min. 6 znaków');
});
