<?php
// Rezerwacje — zadania dla zespołu i konta użytkowników (zmiana hasła, panel admina).

declare(strict_types=1);

// ── Zadania (jak w PWA: każdy zalogowany może dodawać i odhaczać) ──

function zadanie_dla_aplikacji(array $z): array
{
    foreach (['id', 'dla_kogo', 'dodane_przez'] as $k) $z[$k] = (int)$z[$k];
    $z['wykonane'] = !empty($z['wykonane']);
    return $z;
}

/** GET uzytkownicy → aktywni (imię, marka) — zakładki w Zadaniach. */
function akcja_uzytkownicy(): void
{
    $rows = baza()->query('SELECT id, imie, marka FROM uzytkownicy WHERE aktywny = 1 ORDER BY imie')->fetchAll();
    foreach ($rows as &$r) $r['id'] = (int)$r['id'];
    odpowiedz(['ok' => true, 'uzytkownicy' => $rows]);
}

/** GET zadania &dla_kogo=ID (0 = wszystkie) */
function akcja_zadania(): void
{
    $dla = (int)($_GET['dla_kogo'] ?? 0);
    $st = baza()->prepare(
        "SELECT z.*, u1.imie AS dla_imie, u2.imie AS od_imie FROM zadania z
         JOIN uzytkownicy u1 ON z.dla_kogo = u1.id
         JOIN uzytkownicy u2 ON z.dodane_przez = u2.id
         WHERE (? = 0 OR z.dla_kogo = ?)
         ORDER BY z.wykonane ASC, FIELD(z.priorytet, 'pilne', 'wazne', 'normalne'), z.termin ASC, z.id DESC"
    );
    $st->execute([$dla, $dla]);
    odpowiedz(['ok' => true, 'zadania' => array_map('zadanie_dla_aplikacji', $st->fetchAll())]);
}

function akcja_zadanie_dodaj(array $u, array $d): void
{
    $dla = liczba_calk($d, 'dla_kogo', 1, PHP_INT_MAX);
    $tytul = tekst($d, 'tytul', 200);
    if ($tytul === '') throw new BladApi('zle_dane', 'Podaj tytuł zadania');
    $st = baza()->prepare('SELECT COUNT(*) FROM uzytkownicy WHERE id = ? AND aktywny = 1');
    $st->execute([$dla]);
    if (!(int)$st->fetchColumn()) throw new BladApi('zle_dane', 'Wybierz osobę');
    $prio = tekst($d, 'priorytet', 10);
    if (!in_array($prio, ['pilne', 'wazne', 'normalne'], true)) $prio = 'normalne';
    baza()->prepare('INSERT INTO zadania (tytul, opis, priorytet, dla_kogo, dodane_przez, termin) VALUES (?,?,?,?,?,?)')
        ->execute([$tytul, tekst($d, 'opis', 5000), $prio, $dla, $u['id'], data_pole($d, 'termin', false)]);
    odpowiedz(['ok' => true, 'id' => (int)baza()->lastInsertId()]);
}

function akcja_zadanie_wykonane(array $d): void
{
    $id = liczba_calk($d, 'id', 1, PHP_INT_MAX);
    $wyk = prawda($d, 'wykonane');
    baza()->prepare('UPDATE zadania SET wykonane = ?, wykonane_kiedy = ? WHERE id = ?')
        ->execute([$wyk ? 1 : 0, $wyk ? date('Y-m-d H:i:s') : null, $id]);
    odpowiedz(['ok' => true]);
}

function akcja_zadanie_usun(array $d): void
{
    $id = liczba_calk($d, 'id', 1, PHP_INT_MAX);
    baza()->prepare('DELETE FROM zadania WHERE id = ?')->execute([$id]);
    odpowiedz(['ok' => true]);
}

// ── Konto ──

/** POST zmien_haslo {stare, nowe}. Po resecie przez admina stare hasło nie jest wymagane (jak w PWA). */
function akcja_zmien_haslo(array $u, array $d): void
{
    $stare = (string)($d['stare'] ?? '');
    $nowe = (string)($d['nowe'] ?? '');
    if ($nowe === '' || (!$u['haslo_reset'] && $stare === '')) throw new BladApi('zle_dane', 'Wypełnij pola');
    if (mb_strlen($nowe) < 6) throw new BladApi('zle_dane', 'Hasło min. 6 znaków');
    if (empty($u['haslo_reset']) && !haslo_pasuje($u, $stare)) throw new BladApi('zle_haslo', 'Błędne stare hasło');
    baza()->prepare('UPDATE uzytkownicy SET haslo_hash = ?, haslo_reset = 0 WHERE id = ?')
        ->execute([password_hash($nowe, PASSWORD_DEFAULT), $u['id']]);
    wyloguj_wszedzie((int)$u['id'], (int)$u['token_id']);   // inne telefony muszą zalogować się nowym hasłem
    odpowiedz(['ok' => true]);
}

// ── Admin: użytkownicy ──

function akcja_uzytkownicy_admin(array $u): void
{
    wymagaj_admina($u);
    $rows = baza()->query('SELECT id, login, imie, marka, rola, rola_nazwa, aktywny, haslo_reset FROM uzytkownicy ORDER BY id')->fetchAll();
    foreach ($rows as &$r) {
        $r['id'] = (int)$r['id'];
        $r['aktywny'] = !empty($r['aktywny']);
        $r['haslo_reset'] = !empty($r['haslo_reset']);
    }
    odpowiedz(['ok' => true, 'uzytkownicy' => $rows]);
}

function akcja_uzytkownik_dodaj(array $u, array $d): void
{
    wymagaj_admina($u);
    $login = tekst($d, 'login', 50);
    $imie = tekst($d, 'imie', 50);
    $haslo = trim((string)($d['haslo'] ?? ''));
    if ($login === '' || $imie === '' || $haslo === '') throw new BladApi('zle_dane', 'Wypełnij wszystkie pola');
    if (mb_strlen($haslo) < 6) throw new BladApi('zle_dane', 'Hasło min. 6 znaków');
    $marka = tekst($d, 'marka', 10) === 'arsenal' ? 'arsenal' : 'silt';
    $rolaNazwa = tekst($d, 'rola_nazwa', 12) === 'instruktor' ? 'instruktor' : 'admin';
    $st = baza()->prepare('SELECT COUNT(*) FROM uzytkownicy WHERE login = ?');
    $st->execute([$login]);
    if ((int)$st->fetchColumn()) throw new BladApi('zle_dane', 'Login już istnieje');
    baza()->prepare('INSERT INTO uzytkownicy (login, haslo_hash, imie, marka, rola, rola_nazwa, aktywny) VALUES (?,?,?,?,?,?,1)')
        ->execute([$login, password_hash($haslo, PASSWORD_DEFAULT), $imie, $marka, $rolaNazwa === 'instruktor' ? 'podglad' : 'pelny', $rolaNazwa]);
    odpowiedz(['ok' => true, 'id' => (int)baza()->lastInsertId()]);
}

/** POST haslo_reset {id} — użytkownik przy następnym otwarciu aplikacji musi ustawić nowe hasło. */
function akcja_haslo_reset(array $u, array $d): void
{
    wymagaj_admina($u);
    $id = liczba_calk($d, 'id', 1, PHP_INT_MAX);
    if ($id === (int)$u['id']) throw new BladApi('zle_dane', 'Nie możesz zresetować własnego hasła');
    baza()->prepare('UPDATE uzytkownicy SET haslo_reset = 1 WHERE id = ?')->execute([$id]);
    odpowiedz(['ok' => true]);
}

/** POST uzytkownik_aktywny {id, aktywny}. Wyłączenie konta wylogowuje je ze wszystkich telefonów. */
function akcja_uzytkownik_aktywny(array $u, array $d): void
{
    wymagaj_admina($u);
    $id = liczba_calk($d, 'id', 1, PHP_INT_MAX);
    if ($id === (int)$u['id']) throw new BladApi('zle_dane', 'Nie możesz wyłączyć własnego konta');
    $akt = prawda($d, 'aktywny');
    baza()->prepare('UPDATE uzytkownicy SET aktywny = ? WHERE id = ?')->execute([$akt ? 1 : 0, $id]);
    if (!$akt) wyloguj_wszedzie($id);
    odpowiedz(['ok' => true]);
}
