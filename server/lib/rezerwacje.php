<?php
// Rezerwacje — kalendarz: pobieranie, dodawanie, edycja, usuwanie, zadatek, potwierdzenie, maile do klienta.
// Logika 1:1 z api.php PWA; różnice opisane przy funkcjach („Poprawka:”).

declare(strict_types=1);

/** Kolumny rezerwacji wysyłane do aplikacji (bez tokenów płatności). */
const KOLUMNY_REZERWACJI = 'r.id, r.klient_imie_nazwisko, r.klient_telefon, r.klient_email, r.marka, r.lokalizacja,
    r.atrakcja_id, r.liczba_osob, r.data_rezerwacji, r.godzina_start, r.godzina_koniec, r.uwagi, r.instrukcje,
    r.dodatki_json, r.status, r.zadatek_status, r.zadatek_kwota, r.zadatek_data_oplacenia, r.dodana_przez,
    r.zrodlo, r.utworzona, r.zaktualizowana, r.sms_wyslany, r.mail_zadatek_wyslany, r.mail_potw_wyslany';

/** Wiersz z bazy → rezerwacja dla aplikacji (typy liczbowe + pola wyliczane jak w PWA). */
function rezerwacja_dla_aplikacji(array $r, array $u): array
{
    $wlasna = $r['marka'] === $u['marka'];
    $dodatki = json_decode((string)($r['dodatki_json'] ?? '[]'), true);
    foreach (['id', 'atrakcja_id', 'liczba_osob', 'dodana_przez'] as $k) {
        if ($r[$k] !== null) $r[$k] = (int)$r[$k];
    }
    foreach (['sms_wyslany', 'mail_zadatek_wyslany', 'mail_potw_wyslany'] as $k) $r[$k] = !empty($r[$k]);
    $r['zadatek_kwota'] = (float)$r['zadatek_kwota'];
    unset($r['dodatki_json']);
    $r['dodatki'] = is_array($dodatki) ? array_values(array_map('intval', $dodatki)) : [];
    $r['kolor_karty'] = $wlasna ? ($r['atrakcja_kolor'] ?? '#888') : OTHER_COLOR;
    $r['wlasna'] = $wlasna;
    $r['nowa'] = $r['zrodlo'] === 'formularz_www' && $r['status'] === 'oczekujaca' && !$r['mail_zadatek_wyslany'];
    return $r;
}

function wczytaj_rezerwacje(int $id): ?array
{
    $st = baza()->prepare('SELECT ' . KOLUMNY_REZERWACJI . ', a.nazwa AS atrakcja_nazwa, a.kolor AS atrakcja_kolor
        FROM rezerwacje r LEFT JOIN atrakcje a ON r.atrakcja_id = a.id WHERE r.id = ?');
    $st->execute([$id]);
    $r = $st->fetch();
    return $r ?: null;
}

/** Rezerwacja do zmiany: musi istnieć i być własnej marki (jak w PWA). */
function wlasna_rezerwacja(array $u, int $id): array
{
    $r = wczytaj_rezerwacje($id);
    if (!$r) throw new BladApi('nie_ma', 'Tej rezerwacji już nie ma — odśwież kalendarz', 404);
    if ($r['marka'] !== $u['marka']) throw new BladApi('uprawnienia', 'Możesz zmieniać tylko własne rezerwacje', 403);
    return $r;
}

/**
 * GET rezerwacje &od=RRRR-MM-DD &do=RRRR-MM-DD &filtr=all|new|niedoszle|silt|arsenal|rembert|wolomin
 * Poprawka: zakres dat (PWA pobiera całą historię) i działający filtr „niedoszle”
 * (w PWA zapytanie zawsze wykluczało status oczekuje_na_platnosc, więc filtr był pusty).
 */
function akcja_rezerwacje(array $u): void
{
    $od = data_pole($_GET, 'od');
    $do = data_pole($_GET, 'do');
    if ($od > $do) throw new BladApi('zle_dane', 'Zły zakres dat');
    if ((strtotime($do) - strtotime($od)) > 400 * 86400) throw new BladApi('zle_dane', 'Za duży zakres dat');

    $filtr = (string)($_GET['filtr'] ?? 'all');
    $warunki = [
        'all' => '1=1',
        'silt' => "r.marka = 'silt'",
        'arsenal' => "r.marka = 'arsenal'",
        'rembert' => "r.marka = 'arsenal' AND r.lokalizacja = 'rembert'",
        'wolomin' => "r.marka = 'arsenal' AND r.lokalizacja = 'wolomin'",
        'new' => "r.zrodlo = 'formularz_www' AND r.status = 'oczekujaca' AND r.mail_zadatek_wyslany = 0",
        'niedoszle' => "r.zrodlo = 'formularz_www' AND r.status = 'oczekuje_na_platnosc'",
    ];
    if (!isset($warunki[$filtr])) throw new BladApi('zle_dane', 'Nieznany filtr');
    $statusy = $filtr === 'niedoszle'
        ? "r.status <> 'anulowana'"
        : "r.status NOT IN ('oczekuje_na_platnosc', 'anulowana')";

    $st = baza()->prepare('SELECT ' . KOLUMNY_REZERWACJI . ', a.nazwa AS atrakcja_nazwa, a.kolor AS atrakcja_kolor
        FROM rezerwacje r LEFT JOIN atrakcje a ON r.atrakcja_id = a.id
        WHERE r.data_rezerwacji BETWEEN ? AND ? AND ' . $warunki[$filtr] . ' AND ' . $statusy . '
        ORDER BY r.data_rezerwacji ASC, r.godzina_start ASC');
    $st->execute([$od, $do]);
    $wynik = [];
    foreach ($st->fetchAll() as $r) $wynik[] = rezerwacja_dla_aplikacji($r, $u);
    odpowiedz(['ok' => true, 'od' => $od, 'do' => $do, 'filtr' => $filtr, 'rezerwacje' => $wynik, 'teraz' => date('c')]);
}

/** GET dane → atrakcje i dodatki do formularza i legendy (jak get_formdata). */
function akcja_dane(): void
{
    $atrakcje = baza()->query('SELECT id, nazwa, kolor, kolejnosc, tylko_panel FROM atrakcje WHERE aktywna = 1 ORDER BY kolejnosc')->fetchAll();
    $dodatki = baza()->query('SELECT id, nazwa, cena_typ, cena, min_osob, opis_ceny, kolejnosc FROM dodatki WHERE aktywny = 1 ORDER BY kolejnosc')->fetchAll();
    // nazwy dodatków nieaktywnych też — stare rezerwacje mogą je mieć
    $wszystkieDodatki = baza()->query('SELECT id, nazwa FROM dodatki')->fetchAll();
    foreach ($atrakcje as &$a) {
        $a['id'] = (int)$a['id'];
        $a['kolejnosc'] = (int)$a['kolejnosc'];
        $a['tylko_panel'] = !empty($a['tylko_panel']);
    }
    unset($a);
    foreach ($dodatki as &$d) {
        $d['id'] = (int)$d['id'];
        $d['cena'] = (float)$d['cena'];
        $d['min_osob'] = $d['min_osob'] === null ? null : (int)$d['min_osob'];
        $d['kolejnosc'] = (int)$d['kolejnosc'];
        $d['opis_ceny'] = (string)($d['opis_ceny'] ?? '');
    }
    unset($d);
    $nazwy = [];
    foreach ($wszystkieDodatki as $d) $nazwy[(string)$d['id']] = $d['nazwa'];
    odpowiedz(['ok' => true, 'atrakcje' => $atrakcje, 'dodatki' => $dodatki, 'nazwy_dodatkow' => $nazwy]);
}

/** GET licznik → nowe rezerwacje z www i moje niewykonane zadania. Poprawka: bez wysyłania SMS (robi to cron). */
function akcja_licznik(array $u): void
{
    $nowe = (int)baza()->query("SELECT COUNT(*) FROM rezerwacje WHERE zrodlo = 'formularz_www' AND status = 'oczekujaca' AND mail_zadatek_wyslany = 0")->fetchColumn();
    $st = baza()->prepare('SELECT COUNT(*) FROM zadania WHERE dla_kogo = ? AND wykonane = 0');
    $st->execute([$u['id']]);
    odpowiedz(['ok' => true, 'nowe' => $nowe, 'zadania' => (int)$st->fetchColumn()]);
}

/** Pola formularza dodaj/edytuj — wspólne sprawdzanie. */
function pola_rezerwacji(array $d, string $marka): array
{
    $lok = tekst($d, 'lokalizacja', 10);
    if ($marka === 'arsenal') {
        if (!in_array($lok, ['rembert', 'wolomin'], true)) throw new BladApi('zle_dane', 'Wybierz lokalizację (Rembertów lub Wołomin)');
    } else {
        $lok = 'silt';
    }
    $start = godzina_pole($d, 'godzina_start');
    $koniec = godzina_pole($d, 'godzina_koniec', false);

    $atrId = liczba_calk($d, 'atrakcja_id', 0);
    if ($atrId === 0) {   // jak PWA: brak atrakcji = pierwsza aktywna
        $atrId = (int)baza()->query('SELECT id FROM atrakcje WHERE aktywna = 1 ORDER BY kolejnosc LIMIT 1')->fetchColumn();
    }
    $st = baza()->prepare('SELECT id, nazwa FROM atrakcje WHERE id = ?');
    $st->execute([$atrId]);
    $atr = $st->fetch();
    if (!$atr) throw new BladApi('zle_dane', 'Wybierz atrakcję');

    $dodatki = $d['dodatki'] ?? [];
    if (!is_array($dodatki)) throw new BladApi('zle_dane', 'Złe dodatki');
    $dodatki = array_values(array_unique(array_filter(array_map('intval', $dodatki), function ($x) { return $x > 0; })));

    return [
        'klient_imie_nazwisko' => tekst($d, 'imie_nazwisko', 150),
        'klient_telefon' => telefon_pole($d, 'telefon'),
        'klient_email' => email_pole($d, 'email'),
        'lokalizacja' => $lok,
        'atrakcja_id' => (int)$atr['id'],
        'atrakcja_nazwa' => (string)$atr['nazwa'],
        'liczba_osob' => liczba_calk($d, 'liczba_osob', 0, 5000),
        'data_rezerwacji' => data_pole($d, 'data'),
        'godzina_start' => $start,
        'godzina_koniec' => $koniec,
        'uwagi' => tekst($d, 'uwagi', 5000),
        'instrukcje' => tekst($d, 'instrukcje', 5000),
        'dodatki_json' => json_encode($dodatki),
        'status' => prawda($d, 'potwierdzona') ? 'potwierdzona' : 'oczekujaca',
        'zadatek_status' => prawda($d, 'zadatek') ? 'oplacony' : 'brak',
    ];
}

/** POST rezerwacja_dodaj — jak „dodaj” w PWA (marka = marka użytkownika, SMS do zespołu wg ustawień). */
function akcja_rezerwacja_dodaj(array $u, array $d): void
{
    wymagaj_pelnej_roli($u);
    $marka = (string)$u['marka'];
    $p = pola_rezerwacji($d, $marka);

    $pdo = baza();
    $pdo->prepare(
        "INSERT INTO rezerwacje
         (klient_imie_nazwisko, klient_telefon, klient_email, marka, lokalizacja, atrakcja_id, liczba_osob,
          data_rezerwacji, godzina_start, godzina_koniec, uwagi, instrukcje, dodatki_json, status, zadatek_status,
          zadatek_data_oplacenia, zrodlo, dodana_przez)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'panel',?)"
    )->execute([
        $p['klient_imie_nazwisko'], $p['klient_telefon'], $p['klient_email'], $marka, $p['lokalizacja'],
        $p['atrakcja_id'], $p['liczba_osob'], $p['data_rezerwacji'], $p['godzina_start'], $p['godzina_koniec'],
        $p['uwagi'], $p['instrukcje'], $p['dodatki_json'], $p['status'], $p['zadatek_status'],
        $p['zadatek_status'] === 'oplacony' ? date('Y-m-d H:i:s') : null,
        $u['id'],
    ]);
    $id = (int)$pdo->lastInsertId();

    if (sms_dla_marki($marka)) {
        $lokTxt = $marka === 'arsenal' ? ($p['lokalizacja'] === 'wolomin' ? ' [Arsenal Wolomin]' : ' [Arsenal Rembert]') : ' [SILT]';
        wyslij_sms_zespol("Nowa rezerwacja #{$id}\n"
            . 'Klient: ' . $p['klient_imie_nazwisko'] . "\n"
            . 'Tel: ' . $p['klient_telefon'] . "\n"
            . 'Data: ' . date('d.m.Y', strtotime($p['data_rezerwacji'])) . ' godz. ' . substr($p['godzina_start'], 0, 5) . "\n"
            . 'Osob: ' . $p['liczba_osob'] . ' os. / ' . $p['atrakcja_nazwa'] . $lokTxt . "\n"
            . 'Zadatek: ' . ($p['zadatek_status'] === 'oplacony' ? 'Oplacony' : 'Brak'));
    }
    $nowa = wczytaj_rezerwacje($id);
    push_nowa_z_aplikacji($u, $nowa);   // Arsenał: pozostałe telefony marki dostają „🆕 Nowa rezerwacja”
    odpowiedz(['ok' => true, 'id' => $id, 'rezerwacja' => rezerwacja_dla_aplikacji($nowa, $u)]);
}

/** POST rezerwacja_edytuj {id, …} — tylko własna marka. */
function akcja_rezerwacja_edytuj(array $u, array $d): void
{
    wymagaj_pelnej_roli($u);
    $id = liczba_calk($d, 'id', 1, PHP_INT_MAX);
    $stara = wlasna_rezerwacja($u, $id);
    $p = pola_rezerwacji($d, (string)$stara['marka']);

    $dataOplacenia = $stara['zadatek_data_oplacenia'];
    if ($p['zadatek_status'] === 'oplacony' && $stara['zadatek_status'] !== 'oplacony') $dataOplacenia = date('Y-m-d H:i:s');
    if ($p['zadatek_status'] !== 'oplacony') $dataOplacenia = null;
    // status „oczekuje_na_platnosc” z www zostaje, dopóki ktoś nie potwierdzi
    $status = $p['status'] === 'oczekujaca' && $stara['status'] === 'oczekuje_na_platnosc' ? $stara['status'] : $p['status'];
    $zadatek = $p['zadatek_status'] === 'brak' && $stara['zadatek_status'] === 'oczekuje' ? 'oczekuje' : $p['zadatek_status'];

    baza()->prepare(
        'UPDATE rezerwacje SET klient_imie_nazwisko=?, klient_telefon=?, klient_email=?, atrakcja_id=?, liczba_osob=?,
         lokalizacja=?, data_rezerwacji=?, godzina_start=?, godzina_koniec=?, uwagi=?, instrukcje=?, dodatki_json=?,
         status=?, zadatek_status=?, zadatek_data_oplacenia=? WHERE id=?'
    )->execute([
        $p['klient_imie_nazwisko'], $p['klient_telefon'], $p['klient_email'], $p['atrakcja_id'], $p['liczba_osob'],
        $p['lokalizacja'], $p['data_rezerwacji'], $p['godzina_start'], $p['godzina_koniec'], $p['uwagi'], $p['instrukcje'],
        $p['dodatki_json'], $status, $zadatek, $dataOplacenia, $id,
    ]);
    odpowiedz(['ok' => true, 'rezerwacja' => rezerwacja_dla_aplikacji(wczytaj_rezerwacje($id), $u)]);
}

/** POST rezerwacja_usun {id} — jak w PWA: usuwa też logi maili tej rezerwacji. */
function akcja_rezerwacja_usun(array $u, array $d): void
{
    wymagaj_pelnej_roli($u);
    $id = liczba_calk($d, 'id', 1, PHP_INT_MAX);
    wlasna_rezerwacja($u, $id);
    $pdo = baza();
    $pdo->beginTransaction();
    $pdo->prepare('DELETE FROM logi_maili WHERE rezerwacja_id = ?')->execute([$id]);
    $pdo->prepare('DELETE FROM rezerwacje WHERE id = ?')->execute([$id]);
    $pdo->commit();
    odpowiedz(['ok' => true]);
}

/** POST zadatek {id, oplacony} */
function akcja_zadatek(array $u, array $d): void
{
    wymagaj_pelnej_roli($u);
    $id = liczba_calk($d, 'id', 1, PHP_INT_MAX);
    wlasna_rezerwacja($u, $id);
    $op = prawda($d, 'oplacony');
    baza()->prepare('UPDATE rezerwacje SET zadatek_status = ?, zadatek_data_oplacenia = ? WHERE id = ?')
        ->execute([$op ? 'oplacony' : 'brak', $op ? date('Y-m-d H:i:s') : null, $id]);
    odpowiedz(['ok' => true, 'rezerwacja' => rezerwacja_dla_aplikacji(wczytaj_rezerwacje($id), $u)]);
}

/** POST potwierdzenie {id, potwierdzona}. Poprawka: tylko „potwierdzona” albo „oczekujaca” (PWA przyjmowało dowolny tekst). */
function akcja_potwierdzenie(array $u, array $d): void
{
    wymagaj_pelnej_roli($u);
    $id = liczba_calk($d, 'id', 1, PHP_INT_MAX);
    wlasna_rezerwacja($u, $id);
    baza()->prepare('UPDATE rezerwacje SET status = ? WHERE id = ?')
        ->execute([prawda($d, 'potwierdzona') ? 'potwierdzona' : 'oczekujaca', $id]);
    odpowiedz(['ok' => true, 'rezerwacja' => rezerwacja_dla_aplikacji(wczytaj_rezerwacje($id), $u)]);
}

/** Lista dodatków rezerwacji jako HTML do maila (jak w PWA). */
function dodatki_html(array $r): string
{
    $ids = array_map('intval', json_decode((string)($r['dodatki_json'] ?? '[]'), true) ?: []);
    $html = '';
    if ($ids) {
        $st = baza()->prepare('SELECT nazwa FROM dodatki WHERE id IN (' . implode(',', array_fill(0, count($ids), '?')) . ')');
        $st->execute($ids);
        foreach ($st->fetchAll(PDO::FETCH_COLUMN) as $n) $html .= '&bull; ' . htmlspecialchars((string)$n) . '<br>';
    }
    return $html === '' ? '&mdash;' : $html;
}

/** POST mail_zadatek {id} — „Zadatek potwierdzony” do klienta. Poprawka: tylko własna marka (jak przyciski w PWA). */
function akcja_mail_zadatek(array $u, array $d): void
{
    wymagaj_pelnej_roli($u);
    $id = liczba_calk($d, 'id', 1, PHP_INT_MAX);
    $r = wlasna_rezerwacja($u, $id);
    if (trim((string)$r['klient_email']) === '') throw new BladApi('brak_emaila', 'Brak e-maila klienta');
    $nr = '#' . str_pad((string)$id, 4, '0', STR_PAD_LEFT);
    $ok = wyslij_mail_klient((string)$r['klient_email'], "Potwierdzenie rezerwacji {$nr} — SILT Paintball", tresc_mail_zadatek($r, dodatki_html($r)));
    if (!$ok) throw new BladApi('mail', 'Nie udało się wysłać maila. Spróbuj ponownie za chwilę.', 502);
    baza()->prepare('INSERT INTO logi_maili (rezerwacja_id, typ, odbiorca, wyslany) VALUES (?, ?, ?, 1)')->execute([$id, 'zadatek_otrzymany', $r['klient_email']]);
    baza()->prepare('UPDATE rezerwacje SET sms_wyslany = 1, mail_zadatek_wyslany = 1 WHERE id = ?')->execute([$id]);
    odpowiedz(['ok' => true, 'rezerwacja' => rezerwacja_dla_aplikacji(wczytaj_rezerwacje($id), $u)]);
}

/** POST mail_potwierdzenie {id} — „Potwierdzenie przed imprezą” do klienta. */
function akcja_mail_potwierdzenie(array $u, array $d): void
{
    wymagaj_pelnej_roli($u);
    $id = liczba_calk($d, 'id', 1, PHP_INT_MAX);
    $r = wlasna_rezerwacja($u, $id);
    if (trim((string)$r['klient_email']) === '') throw new BladApi('brak_emaila', 'Brak e-maila klienta');
    $nr = '#' . str_pad((string)$id, 4, '0', STR_PAD_LEFT);
    $ok = wyslij_mail_klient((string)$r['klient_email'], "Potwierdzenie rezerwacji {$nr} — SILT Paintball", tresc_mail_potwierdzenie($r, dodatki_html($r)));
    if (!$ok) throw new BladApi('mail', 'Nie udało się wysłać maila. Spróbuj ponownie za chwilę.', 502);
    baza()->prepare('INSERT INTO logi_maili (rezerwacja_id, typ, odbiorca, wyslany) VALUES (?, ?, ?, 1)')->execute([$id, 'potwierdzenie', $r['klient_email']]);
    baza()->prepare('UPDATE rezerwacje SET mail_potw_wyslany = 1 WHERE id = ?')->execute([$id]);
    odpowiedz(['ok' => true, 'rezerwacja' => rezerwacja_dla_aplikacji(wczytaj_rezerwacje($id), $u)]);
}
