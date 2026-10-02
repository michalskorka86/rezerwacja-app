<?php
// ============================================================
// Rezerwacje — podgląd zgłoszeń błędów z telefonów (awarie aplikacji, „📨 Zgłoś problem”).
//   https://filedops.pl/rezerwacjaapp/aplikacja-api/bledy.php?key=CRON_KEY
// Pokazuje ostatnie 200 zgłoszeń (serwer trzyma je 180 dni).
// ============================================================

declare(strict_types=1);

require_once __DIR__ . '/lib/wspolne.php';

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');
if (CRON_KEY === '' || !hash_equals(CRON_KEY, (string)($_GET['key'] ?? ''))) {
    http_response_code(403);
    exit('Brak dostępu');
}

$h = function ($s): string {
    return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
};

$wiersze = baza()->query(
    'SELECT b.*, u.imie FROM app_bledy b LEFT JOIN uzytkownicy u ON u.id = b.uzytkownik_id ORDER BY b.id DESC LIMIT 200'
)->fetchAll();
?>
<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Rezerwacje — zgłoszenia błędów</title>
<style>
  body { font-family: 'DM Sans', system-ui, sans-serif; background: #F5F5F2; color: #1A1A18; margin: 0; padding: 16px; max-width: 900px; }
  h1 { font-size: 20px; color: #2C6E3F; margin: 0 0 4px; }
  p.info { color: #6B6B65; font-size: 13px; margin: 0 0 16px; }
  .b { background: #fff; border: 1px solid #E4E4DF; border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; }
  .b.zgl { border-left: 5px solid #1A73E8; }
  .b.aw { border-left: 5px solid #C0392B; }
  .m { color: #6B6B65; font-size: 12px; margin-bottom: 6px; }
  .k { font-weight: 700; font-size: 15px; white-space: pre-wrap; word-break: break-word; }
  details { margin-top: 6px; } summary { cursor: pointer; color: #6B6B65; font-size: 12px; }
  pre { white-space: pre-wrap; word-break: break-all; font-size: 11px; background: #F5F5F2; padding: 8px; border-radius: 8px; }
</style>
</head>
<body>
<h1>Zgłoszenia błędów z aplikacji Rezerwacje</h1>
<p class="info">Niebieskie — „📨 Zgłoś problem” od pracownika. Czerwone — awarie aplikacji. Najnowsze na górze (<?= count($wiersze) ?>).</p>
<?php if (!$wiersze): ?><p>Brak zgłoszeń 🎉</p><?php endif; ?>
<?php foreach ($wiersze as $b):
    $zgl = strpos($b['komunikat'], 'Zgłoszenie:') === 0; ?>
  <div class="b <?= $zgl ? 'zgl' : 'aw' ?>">
    <div class="m">
      <?= $h(date('d.m.Y H:i', strtotime($b['czas']))) ?> ·
      <?= $h($b['imie'] ?: 'niezalogowany') ?> ·
      <?= $h($b['model'] ?: ($b['urzadzenie'] ?: 'telefon ?')) ?> ·
      wersja <?= $h($b['wersja_app'] ?: '?') ?>
      <?= $b['ekran'] ? ' · ekran ' . $h($b['ekran']) : '' ?>
    </div>
    <div class="k"><?= $h($b['komunikat']) ?></div>
    <?php if ($b['stos']): ?><details><summary>szczegóły techniczne</summary><pre><?= $h($b['stos']) ?></pre></details><?php endif; ?>
  </div>
<?php endforeach; ?>
</body>
</html>
