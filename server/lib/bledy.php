<?php
// Rezerwacje — zgłoszenia błędów z aplikacji (awarie i „📨 Zgłoś problem”).

declare(strict_types=1);

/** POST blad {ekran, komunikat, stos, urzadzenie, model} — działa też bez logowania (np. awaria na ekranie logowania). */
function akcja_blad(?array $u, array $d): void
{
    $komunikat = tekst($d, 'komunikat', 500);
    if ($komunikat === '') throw new BladApi('zle_dane', 'Brak opisu błędu');
    $pdo = baza();

    // bez logowania: najwyżej 30 zgłoszeń na godzinę z jednego urządzenia (żeby nikt nie zasypał bazy)
    if (!$u) {
        $st = $pdo->prepare('SELECT COUNT(*) FROM app_bledy WHERE uzytkownik_id IS NULL AND urzadzenie = ? AND czas > NOW() - INTERVAL 1 HOUR');
        $st->execute([tekst($d, 'urzadzenie', 40)]);
        if ((int)$st->fetchColumn() >= 30) odpowiedz(['ok' => true, 'pominiete' => true]);
    }

    $pdo->prepare('INSERT INTO app_bledy (czas, uzytkownik_id, urzadzenie, model, wersja_app, ekran, komunikat, stos) VALUES (NOW(),?,?,?,?,?,?,?)')
        ->execute([
            $u ? $u['id'] : null, tekst($d, 'urzadzenie', 40), tekst($d, 'model', 60), mb_substr(naglowek('X-App-Wersja'), 0, 20),
            tekst($d, 'ekran', 100), $komunikat, tekst($d, 'stos', 20000),
        ]);
    $pdo->exec('DELETE FROM app_bledy WHERE czas < NOW() - INTERVAL 180 DAY');
    odpowiedz(['ok' => true]);
}
