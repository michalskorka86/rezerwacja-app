import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BladApi, toBrakSieci, utworzKlienta } from '../src/logika/klient';

/** Atrapa fetch: zapamiętuje zapytanie i zwraca podaną odpowiedź. */
function atrapa(status: number, cialo: unknown, zapis: { url?: string; init?: RequestInit } = {}): typeof fetch {
  return (async (url: string, init: RequestInit) => {
    zapis.url = url;
    zapis.init = init;
    return new Response(typeof cialo === 'string' ? cialo : JSON.stringify(cialo), { status });
  }) as unknown as typeof fetch;
}

test('klient: GET z parametrami, token i wersja w nagłówkach', async () => {
  const z: { url?: string; init?: RequestInit } = {};
  const k = utworzKlienta({ url: 'https://x/api.php', wersja: '1.2.3', token: () => 'abc', fetchFn: atrapa(200, { ok: true, n: 1 }, z) });
  const j = await k<{ n: number }>('rezerwacje', { parametry: { od: '2026-10-01', do: '2026-10-31' } });
  assert.equal(j.n, 1);
  assert.equal(z.url, 'https://x/api.php?akcja=rezerwacje&od=2026-10-01&do=2026-10-31');
  assert.equal(z.init?.method, 'GET');
  const h = z.init?.headers as Record<string, string>;
  assert.equal(h['X-Token'], 'abc');
  assert.equal(h['X-App-Wersja'], '1.2.3');
});

test('klient: POST z JSON', async () => {
  const z: { url?: string; init?: RequestInit } = {};
  const k = utworzKlienta({ url: 'https://x/api.php', wersja: '1', token: () => null, fetchFn: atrapa(200, { ok: true }, z) });
  await k('zadatek', { body: { id: 5, oplacony: true } });
  assert.equal(z.init?.method, 'POST');
  assert.equal(z.init?.body, '{"id":5,"oplacony":true}');
  assert.equal((z.init?.headers as Record<string, string>)['X-Token'], undefined);
});

test('klient: błąd serwera → komunikat po polsku', async () => {
  const k = utworzKlienta({ url: 'u', wersja: '1', token: () => 't', fetchFn: atrapa(403, { ok: false, kod: 'uprawnienia', msg: 'Brak uprawnień' }) });
  await assert.rejects(k('zadatek', { body: {} }), (e: unknown) => e instanceof BladApi && e.kod === 'uprawnienia' && e.message === 'Brak uprawnień' && e.http === 403);
});

test('klient: „zaloguj” wylogowuje', async () => {
  let wylogowano = false;
  const k = utworzKlienta({ url: 'u', wersja: '1', token: () => 't', naWylogowanie: () => (wylogowano = true), fetchFn: atrapa(401, { ok: false, kod: 'zaloguj', msg: 'Zaloguj się' }) });
  await assert.rejects(k('ja'));
  assert.ok(wylogowano);
});

test('klient: brak sieci i nieczytelna odpowiedź', async () => {
  const bezSieci = (async () => {
    throw new TypeError('Network request failed');
  }) as unknown as typeof fetch;
  const k = utworzKlienta({ url: 'u', wersja: '1', token: () => null, fetchFn: bezSieci });
  await assert.rejects(k('ja'), (e: unknown) => toBrakSieci(e) && (e as Error).message.startsWith('Brak połączenia'));
  const k2 = utworzKlienta({ url: 'u', wersja: '1', token: () => null, fetchFn: atrapa(500, '<html>Fatal error</html>') });
  await assert.rejects(k2('ja'), (e: unknown) => e instanceof BladApi && e.kod === 'serwer' && e.message.includes('500'));
});

// ── Z prawdziwym serwerem PHP (GitHub „Sprawdź kod”, lokalnie: REZ_API=http://127.0.0.1:8765/api.php) ──
const API = process.env.REZ_API;

test('klient + serwer PHP: logowanie i rezerwacje', { skip: !API && 'bez REZ_API' }, async () => {
  let token: string | null = null;
  const k = utworzKlienta({ url: API!, wersja: '1.0.0', token: () => token });
  const z = await k<{ token: string; uzytkownik: { imie: string } }>('zaloguj', { body: { login: 'pawel', haslo: 'arsenal1', urzadzenie: 'node-test' } });
  token = z.token;
  assert.equal(z.uzytkownik.imie, 'Paweł');
  const r = await k<{ rezerwacje: { id: number; wlasna: boolean }[] }>('rezerwacje', { parametry: { od: '2020-01-01', do: '2020-12-31' } });
  assert.ok(Array.isArray(r.rezerwacje));
  await assert.rejects(k('rezerwacja_dodaj', { body: {} }), (e: unknown) => e instanceof BladApi && e.message.startsWith('Wybierz lokalizację'));
});

test('klient: zawieszone połączenie kończy się po limicie czasu (nie blokuje odświeżania)', async () => {
  // serwer przysłał nagłówki, ale treść nigdy nie dochodzi
  const wiszacy = (async () => ({ ok: true, status: 200, text: () => new Promise<string>(() => {}) })) as unknown as typeof fetch;
  const k = utworzKlienta({ url: 'http://x/api.php', wersja: '1', token: () => null, fetchFn: wiszacy });
  const start = Date.now();
  await assert.rejects(k('ja', { czasMs: 300 }), (e: unknown) => e instanceof BladApi && e.kod === 'siec');
  assert.ok(Date.now() - start < 3000);
});
