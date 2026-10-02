<?php
// Rezerwacje — wynajem sprzętu (jak w PWA, sprzęt jako JSON {nazwa: ilość}).

declare(strict_types=1);

/** Lista sprzętu do wynajmu — przeniesiona z kalendarz.php (SPRZET_LISTA). */
const SPRZET_WYNAJEM = ['Marker 0,68 CAL', 'Marker Emek 0,50 CAL', 'Marker Sportowy', 'ASG', 'Gotcha', 'Gelblaster', 'Maska', 'Bateria', 'Mundur'];

function wynajem_dla_aplikacji(array $w): array
{
    $sprzet = json_decode((string)($w['sprzet_json'] ?? '{}'), true);
    unset($w['sprzet_json']);
    $w['id'] = (int)$w['id'];
    $w['dodane_przez'] = $w['dodane_przez'] === null ? null : (int)$w['dodane_przez'];
    $w['kwota'] = (float)$w['kwota'];
    $w['zaplacono'] = !empty($w['zaplacono']);
    $w['zwrocono'] = !empty($w['zwrocono']);
    $w['sprzet'] = is_array($sprzet) && $sprzet ? $sprzet : new stdClass();
    $w['przeterminowany'] = !$w['zwrocono'] && $w['data_zwrotu'] && $w['data_zwrotu'] < date('Y-m-d');
    return $w;
}

/** {nazwa: ilość} z aplikacji → tylko dodatnie liczby całkowite. */
function sprzet_pole(array $d): string
{
    $s = $d['sprzet'] ?? [];
    if (!is_array($s)) throw new BladApi('zle_dane', 'Zły sprzęt');
    $wynik = [];
    foreach ($s as $nazwa => $ile) {
        $nazwa = mb_substr(trim((string)$nazwa), 0, 60);
        $ile = (int)$ile;
        if ($nazwa !== '' && $ile > 0 && $ile <= 1000) $wynik[$nazwa] = $ile;
    }
    return json_encode($wynik, JSON_UNESCAPED_UNICODE);
}

function platnosc_pole(array $d): string
{
    $p = tekst($d, 'platnosc', 20);
    return in_array($p, ['Gotówka', 'Przelew', 'Karta'], true) ? $p : 'Gotówka';
}

/** GET wynajmy &status=aktywne|zwrocone|wszystkie &marka=wszystkie|silt|arsenal */
function akcja_wynajmy(): void
{
    $status = (string)($_GET['status'] ?? 'aktywne');
    $marka = (string)($_GET['marka'] ?? 'wszystkie');
    $w = ['1=1'];
    if ($status === 'aktywne') $w[] = 'zwrocono = 0';
    if ($status === 'zwrocone') $w[] = 'zwrocono = 1';
    if ($marka === 'silt') $w[] = "marka = 'silt'";
    if ($marka === 'arsenal') $w[] = "marka = 'arsenal'";
    $rows = baza()->query('SELECT * FROM wynajmy WHERE ' . implode(' AND ', $w) . ' ORDER BY data_wynajmu DESC, id DESC LIMIT 500')->fetchAll();
    odpowiedz(['ok' => true, 'wynajmy' => array_map('wynajem_dla_aplikacji', $rows)]);
}

function wlasny_wynajem(array $u, int $id): array
{
    $st = baza()->prepare('SELECT * FROM wynajmy WHERE id = ?');
    $st->execute([$id]);
    $w = $st->fetch();
    if (!$w) throw new BladApi('nie_ma', 'Tego wynajmu już nie ma — odśwież listę', 404);
    if ($w['marka'] !== $u['marka']) throw new BladApi('uprawnienia', 'Możesz zmieniać tylko wynajmy swojej marki', 403);
    return $w;
}

function wczytaj_wynajem(int $id): array
{
    $st = baza()->prepare('SELECT * FROM wynajmy WHERE id = ?');
    $st->execute([$id]);
    return wynajem_dla_aplikacji($st->fetch());
}

/** POST wynajem_dodaj — jak dodaj_wynajem w PWA (SMS do zespołu wg ustawienia sms_wynajem). */
function akcja_wynajem_dodaj(array $u, array $d): void
{
    wymagaj_pelnej_roli($u);
    $imie = tekst($d, 'imie_nazwisko', 150);
    $tel = telefon_pole($d, 'telefon');
    if ($imie === '' || $tel === '') throw new BladApi('zle_dane', 'Wypełnij wymagane pola');
    $dataW = data_pole($d, 'data_wynajmu');
    $dataZ = data_pole($d, 'data_zwrotu', false);
    $kw = kwota($d, 'kwota');
    $sprzet = sprzet_pole($d);

    $pdo = baza();
    $pdo->prepare(
        'INSERT INTO wynajmy (klient_imie_nazwisko, klient_telefon, data_wynajmu, data_zwrotu, kwota, zaplacono, sprzet_json, uwagi,
         platnosc, faktura_nazwa, faktura_nip, faktura_email, dodane_przez, marka) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    )->execute([
        $imie, $tel, $dataW, $dataZ, $kw, prawda($d, 'zaplacono') ? 1 : 0, $sprzet, tekst($d, 'uwagi', 5000),
        platnosc_pole($d), tekst($d, 'faktura_nazwa', 200), tekst($d, 'faktura_nip', 20), email_pole($d, 'faktura_email'),
        $u['id'], $u['marka'],
    ]);
    $id = (int)$pdo->lastInsertId();

    if (ustawienia_sms()['sms_wynajem']) {
        $lista = json_decode($sprzet, true) ?: [];
        $sprzetTxt = implode(', ', array_map(function ($k, $v) { return "{$v}× {$k}"; }, array_keys($lista), $lista));
        wyslij_sms_zespol('Wynajem sprzetu #' . str_pad((string)$id, 4, '0', STR_PAD_LEFT) . "\n"
            . "Klient: {$imie}\nTel: {$tel}\nData wynajmu: {$dataW}\nZwrot: " . ($dataZ ?: 'brak') . "\n"
            . "Sprzet: {$sprzetTxt}\nKwota: " . (0 + $kw) . ' zl');
    }
    odpowiedz(['ok' => true, 'id' => $id, 'wynajem' => wczytaj_wynajem($id)]);
}

/** POST wynajem_edytuj. Poprawka: tylko wynajem własnej marki (PWA nie sprawdzało). */
function akcja_wynajem_edytuj(array $u, array $d): void
{
    wymagaj_pelnej_roli($u);
    $id = liczba_calk($d, 'id', 1, PHP_INT_MAX);
    wlasny_wynajem($u, $id);
    $imie = tekst($d, 'imie_nazwisko', 150);
    $tel = telefon_pole($d, 'telefon');
    if ($imie === '' || $tel === '') throw new BladApi('zle_dane', 'Wypełnij wymagane pola');
    baza()->prepare(
        'UPDATE wynajmy SET klient_imie_nazwisko=?, klient_telefon=?, data_wynajmu=?, data_zwrotu=?, kwota=?, zaplacono=?,
         zwrocono=?, sprzet_json=?, platnosc=?, uwagi=? WHERE id=?'
    )->execute([
        $imie, $tel, data_pole($d, 'data_wynajmu'), data_pole($d, 'data_zwrotu', false), kwota($d, 'kwota'),
        prawda($d, 'zaplacono') ? 1 : 0, prawda($d, 'zwrocono') ? 1 : 0, sprzet_pole($d), platnosc_pole($d),
        tekst($d, 'uwagi', 5000), $id,
    ]);
    odpowiedz(['ok' => true, 'wynajem' => wczytaj_wynajem($id)]);
}

function akcja_wynajem_zwroc(array $u, array $d): void
{
    wymagaj_pelnej_roli($u);
    $id = liczba_calk($d, 'id', 1, PHP_INT_MAX);
    wlasny_wynajem($u, $id);
    baza()->prepare('UPDATE wynajmy SET zwrocono = 1 WHERE id = ?')->execute([$id]);
    odpowiedz(['ok' => true, 'wynajem' => wczytaj_wynajem($id)]);
}

function akcja_wynajem_usun(array $u, array $d): void
{
    wymagaj_pelnej_roli($u);
    $id = liczba_calk($d, 'id', 1, PHP_INT_MAX);
    wlasny_wynajem($u, $id);
    baza()->prepare('DELETE FROM wynajmy WHERE id = ?')->execute([$id]);
    odpowiedz(['ok' => true]);
}
