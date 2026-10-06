<?php
// Rezerwacje — zadania okresowe: SMS i push o nowych rezerwacjach z www, push o rezerwacjach wpisanych w PWA.
// Uruchamiane z dwóch miejsc (każde wystarczy, oba naraz są bezpieczne — znaczniki w bazie pilnują powtórek):
//   1. cron.php (panel LH.pl co 5 min albo adres z kluczem),
//   2. przy okazji odświeżania na telefonach (akcja licznik) — najwyżej raz na minutę, jak PWA przy count_new.

declare(strict_types=1);

/** Jeden przebieg. $skad = 'panel' | 'adres' | 'aplikacja' (widać w teście powiadomień). */
function wykonaj_okresowe(string $skad): array
{
    zapisz_ustawienie('app_cron_ostatnio', date('Y-m-d H:i:s') . " ($skad)");
    try {
        $sms = wyslij_sms_nowe_www();
        $push = wyslij_push_nowe_www();
        $pushZespol = wyslij_push_nowe_panel();
        $bledy = [];
        if (!empty($sms['nieudane'])) $bledy[] = 'SMS: ' . ($sms['blad'] ?? '?');
        if (!empty($GLOBALS['push_blad'])) $bledy[] = 'push: ' . $GLOBALS['push_blad'];
        zapisz_ustawienie('app_cron_blad', $bledy ? date('Y-m-d H:i:s') . ' ' . implode(' | ', $bledy) : '');
        return ['ok' => true, 'czas' => date('Y-m-d H:i:s'), 'sms' => $sms, 'push' => $push, 'push_zespol' => $pushZespol];
    } catch (Throwable $e) {
        error_log('Rezerwacje okresowe: ' . $e->getMessage());
        try { zapisz_ustawienie('app_cron_blad', date('Y-m-d H:i:s') . ' ' . $e->getMessage()); } catch (Throwable $e2) { /* baza niedostępna */ }
        return ['ok' => false, 'msg' => 'Błąd: ' . $e->getMessage()];
    }
}

/**
 * Z API (licznik): najwyżej raz na minutę dla wszystkich telefonów razem — „zajęcie” terminu w bazie jednym UPDATE,
 * więc dwa telefony naraz nie uruchomią dwóch przebiegów. Odpowiedź do telefonu idzie wcześniej (finish_request).
 */
function okresowe_przy_okazji(): void
{
    try {
        $pdo = baza();
        $pdo->exec("INSERT IGNORE INTO ustawienia (klucz, wartosc) VALUES ('app_okresowe_api', '2000-01-01 00:00:00')");
        $st = $pdo->prepare("UPDATE ustawienia SET wartosc = DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s')
            WHERE klucz = 'app_okresowe_api' AND wartosc < DATE_FORMAT(NOW() - INTERVAL 60 SECOND, '%Y-%m-%d %H:%i:%s')");
        $st->execute();
        if ($st->rowCount() === 0) return;
        wykonaj_okresowe('aplikacja');
    } catch (Throwable $e) {
        error_log('Rezerwacje okresowe (aplikacja): ' . $e->getMessage());
    }
}
