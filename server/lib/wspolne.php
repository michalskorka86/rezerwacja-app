<?php
// Rezerwacje — API aplikacji: funkcje wspólne (konfiguracja, baza, odpowiedzi JSON).
// PHP 7.4+ (hosting LH.pl), MariaDB. Bez frameworka.

declare(strict_types=1);

// config.php leży obok api.php (a on wczytuje config.php PWA piętro wyżej). Testy wskazują inny plik zmienną REZ_CONFIG.
$__cfg = getenv('REZ_CONFIG') ?: dirname(__DIR__) . '/config.php';
if (!is_file($__cfg)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'kod' => 'konfiguracja', 'msg' => 'Brak pliku config.php na serwerze (skopiuj config.example.php)'], JSON_UNESCAPED_UNICODE);
    exit;
}
require_once $__cfg;

// Wartości domyślne — gdy czegoś nie ma w config.php (PWA albo aplikacji).
if (!defined('DB_CHARSET'))     define('DB_CHARSET', 'utf8mb4');
if (!defined('OTHER_COLOR'))    define('OTHER_COLOR', '#1A73E8');
if (!defined('SMSAPI_TOKEN'))   define('SMSAPI_TOKEN', '');
if (!defined('SMSAPI_URL'))     define('SMSAPI_URL', 'https://api.smsapi.pl/sms.do');
if (!defined('WA_PHONE'))       define('WA_PHONE', '');
if (!defined('CRON_KEY'))       define('CRON_KEY', '');
if (!defined('APK_REPO'))       define('APK_REPO', 'michalskorka86/rezerwacja-app');
if (!defined('APK_BAZA_URL'))   define('APK_BAZA_URL', 'https://github.com/' . APK_REPO . '/releases/latest/download/');
if (!defined('EXPO_PUSH_URL'))  define('EXPO_PUSH_URL', 'https://exp.host/--/api/v2/push/send');
if (!defined('EXPO_POTWIERDZENIA_URL')) define('EXPO_POTWIERDZENIA_URL', 'https://exp.host/--/api/v2/push/getReceipts');
if (!defined('APK_PLIK'))       define('APK_PLIK', 'rezerwacje.apk');
if (!defined('PHPMAILER_DIR'))  define('PHPMAILER_DIR', dirname(__DIR__, 2) . '/phpmailer');
if (!defined('MAIL_DO_PLIKU'))  define('MAIL_DO_PLIKU', '');   // tylko testy: maile zapisywane do folderu zamiast wysyłki

date_default_timezone_set('Europe/Warsaw');

/** Błąd, który ma trafić do aplikacji jako czytelny komunikat po polsku. */
class BladApi extends Exception
{
    public $kod;
    public $http;
    public function __construct(string $kod, string $msg, int $http = 400)
    {
        parent::__construct($msg);
        $this->kod = $kod;
        $this->http = $http;
    }
}

function baza(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        // Bez zmiany strefy czasu połączenia — tak samo jak PWA (te same znaczniki `utworzona`).
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET,
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]
        );
    }
    return $pdo;
}

function odpowiedz(array $dane, int $http = 200): void
{
    http_response_code($http);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($dane, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function tresc_zadania(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') return [];
    $j = json_decode($raw, true);
    if (!is_array($j)) throw new BladApi('zle_dane', 'Nieczytelne dane (oczekiwano JSON)');
    return $j;
}

function ip_klienta(): string
{
    return substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45);
}

function naglowek(string $nazwa): string
{
    $k = 'HTTP_' . strtoupper(str_replace('-', '_', $nazwa));
    return trim((string)($_SERVER[$k] ?? ''));
}

function ustawienie(string $klucz, string $domyslna = ''): string
{
    $st = baza()->prepare('SELECT wartosc FROM ustawienia WHERE klucz = ?');
    $st->execute([$klucz]);
    $v = $st->fetchColumn();
    return $v === false ? $domyslna : (string)$v;
}

// ── Pola z aplikacji ────────────────────────────────────────

/** Tekst z limitem długości (przycięty). */
function tekst(array $d, string $pole, int $max = 255): string
{
    $v = $d[$pole] ?? '';
    if (is_int($v) || is_float($v)) $v = (string)$v;
    if (!is_string($v)) throw new BladApi('zle_dane', 'Złe pole: ' . $pole);
    return mb_substr(trim($v), 0, $max);
}

function liczba_calk(array $d, string $pole, int $min = 0, int $max = 100000): int
{
    $v = $d[$pole] ?? 0;
    if (is_string($v) && preg_match('/^-?\d+$/', trim($v))) $v = (int)trim($v);
    if ($v === '' || $v === null) $v = 0;
    if (!is_int($v)) throw new BladApi('zle_dane', 'Złe pole: ' . $pole);
    if ($v < $min || $v > $max) throw new BladApi('zle_dane', 'Zła wartość: ' . $pole);
    return $v;
}

function kwota(array $d, string $pole): float
{
    $v = $d[$pole] ?? 0;
    if (is_string($v)) $v = str_replace([' ', ','], ['', '.'], trim($v));
    if ($v === '' || $v === null) return 0.0;
    if (!is_numeric($v)) throw new BladApi('zle_dane', 'Zła kwota');
    $f = round((float)$v, 2);
    if ($f < 0 || $f > 999999) throw new BladApi('zle_dane', 'Zła kwota');
    return $f;
}

function prawda(array $d, string $pole): bool
{
    $v = $d[$pole] ?? false;
    return $v === true || $v === 1 || $v === '1' || $v === 'true';
}

/** Data RRRR-MM-DD (poprawna kalendarzowo) albo null, gdy pusta i $wymagana = false. */
function data_pole(array $d, string $pole, bool $wymagana = true): ?string
{
    $v = tekst($d, $pole, 10);
    if ($v === '') {
        if ($wymagana) throw new BladApi('zle_dane', 'Wybierz datę');
        return null;
    }
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $v, $m) || !checkdate((int)$m[2], (int)$m[3], (int)$m[1])) {
        throw new BladApi('zle_dane', 'Zła data');
    }
    return $v;
}

/** Godzina GG:MM → 'GG:MM:00' albo null, gdy pusta i $wymagana = false. */
function godzina_pole(array $d, string $pole, bool $wymagana = true): ?string
{
    $v = tekst($d, $pole, 8);
    if ($v === '' || $v === '--:--') {
        if ($wymagana) throw new BladApi('zle_dane', 'Wybierz godzinę');
        return null;
    }
    if (!preg_match('/^([01]\d|2[0-3]):([0-5]\d)(:00)?$/', $v, $m)) throw new BladApi('zle_dane', 'Zła godzina');
    return $m[1] . ':' . $m[2] . ':00';
}

/** Telefon: pusty albo cyfry/spacje/+/-, 6–20 znaków. */
function telefon_pole(array $d, string $pole): string
{
    $v = tekst($d, $pole, 20);
    if ($v !== '' && !preg_match('/^\+?[0-9 \-]{6,20}$/', $v)) throw new BladApi('zle_dane', 'Zły numer telefonu');
    return $v;
}

function email_pole(array $d, string $pole): string
{
    $v = tekst($d, $pole, 150);
    if ($v !== '' && !filter_var($v, FILTER_VALIDATE_EMAIL)) throw new BladApi('zle_dane', 'Zły adres e-mail');
    return $v;
}

/** Porównanie wersji aplikacji 1.2.3 (brak/nieczytelna = 0.0.0). */
function wersja_mniejsza(string $a, string $b): bool
{
    $n = function (string $w): string {
        return preg_match('/^\d+(\.\d+){0,2}$/', $w) ? $w : '0.0.0';
    };
    return version_compare($n($a), $n($b), '<');
}
