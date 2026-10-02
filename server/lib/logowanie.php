<?php
// Rezerwacje — logowanie telefonów (login + hasło z tabeli uzytkownicy, te same co w PWA).
//
// Telefon loguje się raz → dostaje własny token. Każde kolejne zapytanie ma nagłówki:
//   X-Token:       <token>   (nie Authorization — część hostingów go wycina)
//   X-App-Wersja:  1.2.3     (starsza niż ustawienie app_min_wersja = blokada zapisu)
// Konto dezaktywowane w PWA albo tutaj → token przestaje działać od razu.

declare(strict_types=1);

const PROBY_LOGOWANIA = 5;    // po tylu błędnych hasłach z jednego IP…
const BLOKADA_MINUT   = 15;   // …blokada na tyle minut

/** Pola użytkownika, które dostaje aplikacja (bez hasła). */
function dane_uzytkownika(array $u): array
{
    return [
        'id' => (int)$u['id'],
        'imie' => (string)$u['imie'],
        'login' => (string)$u['login'],
        'marka' => (string)$u['marka'],
        'rola' => (string)($u['rola'] ?? 'pelny'),
        'rola_nazwa' => (string)($u['rola_nazwa'] ?? 'admin'),
        'haslo_reset' => !empty($u['haslo_reset']),
    ];
}

/** Sprawdza hasło jak index.php PWA (bcrypt; stare konta: zwykły tekst — od razu zamieniany na bcrypt). */
function haslo_pasuje(array $u, string $haslo): bool
{
    $hash = (string)$u['haslo_hash'];
    if (strpos($hash, '$2y$') === 0) return password_verify($haslo, $hash);
    if ($hash === '' || !hash_equals($hash, $haslo)) return false;
    baza()->prepare('UPDATE uzytkownicy SET haslo_hash = ? WHERE id = ?')->execute([password_hash($haslo, PASSWORD_DEFAULT), $u['id']]);
    return true;
}

function akcja_zaloguj(array $body): void
{
    $pdo = baza();
    $ip = ip_klienta();

    $st = $pdo->prepare('SELECT COUNT(*) FROM app_logowania_bledne WHERE ip = ? AND czas > NOW() - INTERVAL ' . BLOKADA_MINUT . ' MINUTE');
    $st->execute([$ip]);
    if ((int)$st->fetchColumn() >= PROBY_LOGOWANIA) {
        throw new BladApi('blokada', 'Za dużo błędnych prób. Spróbuj ponownie za ' . BLOKADA_MINUT . ' minut.', 429);
    }

    $login = tekst($body, 'login', 50);
    $haslo = (string)($body['haslo'] ?? '');
    if ($login === '' || $haslo === '') throw new BladApi('zle_dane', 'Wpisz login i hasło.');

    $st = $pdo->prepare('SELECT * FROM uzytkownicy WHERE login = ? AND aktywny = 1');
    $st->execute([$login]);
    $u = $st->fetch();
    if (!$u || !haslo_pasuje($u, $haslo)) {
        $pdo->prepare('INSERT INTO app_logowania_bledne (ip, login, czas) VALUES (?, ?, NOW())')->execute([$ip, $login]);
        throw new BladApi('zle_haslo', 'Nieprawidłowy login lub hasło.', 401);
    }

    $token = bin2hex(random_bytes(32));
    $pdo->prepare(
        'INSERT INTO app_tokeny (uzytkownik_id, token_hash, urzadzenie, model, wersja_app, utworzony, ostatnio)
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())'
    )->execute([
        $u['id'], hash('sha256', $token),
        tekst($body, 'urzadzenie', 40), tekst($body, 'model', 60),
        mb_substr(naglowek('X-App-Wersja'), 0, 20),
    ]);
    $pdo->prepare('DELETE FROM app_logowania_bledne WHERE ip = ?')->execute([$ip]);
    $pdo->exec('DELETE FROM app_logowania_bledne WHERE czas < NOW() - INTERVAL 1 DAY');

    odpowiedz(['ok' => true, 'token' => $token, 'uzytkownik' => dane_uzytkownika($u)]);
}

/** Sprawdza token. Zwraca wiersz użytkownika + token_id. */
function wymagaj_uzytkownika(): array
{
    $token = naglowek('X-Token');
    if ($token === '') throw new BladApi('zaloguj', 'Zaloguj się', 401);
    $st = baza()->prepare(
        'SELECT u.*, t.id AS token_id, t.ostatnio AS token_ostatnio FROM app_tokeny t
         JOIN uzytkownicy u ON u.id = t.uzytkownik_id
         WHERE t.token_hash = ?'
    );
    $st->execute([hash('sha256', $token)]);
    $u = $st->fetch();
    if (!$u) throw new BladApi('zaloguj', 'Zaloguj się ponownie', 401);
    if (empty($u['aktywny'])) throw new BladApi('zaloguj', 'Konto jest wyłączone. Zapytaj administratora.', 401);

    // „ostatnio” najwyżej raz na 5 minut — mniej zapisów przy odświeżaniu co 30 s
    if (strtotime((string)$u['token_ostatnio']) < time() - 300) {
        baza()->prepare('UPDATE app_tokeny SET ostatnio = NOW(), wersja_app = ? WHERE id = ?')
            ->execute([mb_substr(naglowek('X-App-Wersja'), 0, 20), $u['token_id']]);
    }
    return $u;
}

/** Zapis wymaga pełnej roli (rola „podglad” tylko ogląda — jak w PWA). */
function wymagaj_pelnej_roli(array $u): void
{
    if (($u['rola'] ?? 'pelny') === 'podglad') {
        throw new BladApi('uprawnienia', 'Brak uprawnień — tryb tylko do podglądu', 403);
    }
}

function wymagaj_admina(array $u): void
{
    if (($u['rola_nazwa'] ?? 'admin') !== 'admin') throw new BladApi('uprawnienia', 'Brak uprawnień', 403);
}

/** Stara wersja aplikacji nie może zapisywać (ustawienie app_min_wersja w tabeli ustawienia). */
function wymagaj_aktualnej_wersji(): void
{
    $min = ustawienie('app_min_wersja', '0.0.0');
    if (wersja_mniejsza(naglowek('X-App-Wersja'), $min)) {
        throw new BladApi('stara_wersja', 'Ta wersja aplikacji jest za stara. Zaktualizuj aplikację.', 426);
    }
}

function akcja_wyloguj(array $u): void
{
    baza()->prepare('DELETE FROM app_tokeny WHERE id = ?')->execute([$u['token_id']]);
    odpowiedz(['ok' => true]);
}

/** Usuwa wszystkie logowania użytkownika (poza jednym — np. bieżącym telefonem przy zmianie hasła). */
function wyloguj_wszedzie(int $uzytkownikId, int $zostawTokenId = 0): void
{
    baza()->prepare('DELETE FROM app_tokeny WHERE uzytkownik_id = ? AND id <> ?')->execute([$uzytkownikId, $zostawTokenId]);
}

/** GET ja → użytkownik + ustawienia aplikacji (to, co PWA wpisywało w kalendarz.php). */
function akcja_ja(array $u): void
{
    $marka = (string)$u['marka'];
    odpowiedz([
        'ok' => true,
        'uzytkownik' => dane_uzytkownika($u),
        'ustawienia' => [
            'min_wersja' => ustawienie('app_min_wersja', '0.0.0'),
            'inny_kolor' => OTHER_COLOR,
            'logo' => $marka === 'silt'
                ? 'https://paintball.silt.pl/wp-content/uploads/logo.png'
                : 'https://paintball.silt.pl/wp-content/uploads/logo-arsenal.png',
            'sprzet_wynajem' => SPRZET_WYNAJEM,
            'platnosci' => ['Gotówka', 'Przelew', 'Karta'],
        ],
    ]);
}
