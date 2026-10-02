<?php
// Rezerwacje — treść maili do klientów. Skopiowane 1:1 z api.php PWA (rezerwacjaapp/api.php),
// żeby klient dostawał dokładnie ten sam mail niezależnie od tego, czy wysłano go z PWA, czy z aplikacji.
// Zmiana treści = zmiana w OBU miejscach (PWA i tu), inaczej maile będą się różnić.

declare(strict_types=1);

/** Mail „Zadatek potwierdzony”. $r = wiersz rezerwacji + atrakcja_nazwa, $d2_html = lista dodatków (HTML). */
function tresc_mail_zadatek(array $r, string $d2_html): string
{
    $rez_nr  = '#' . str_pad((string)$r['id'], 4, '0', STR_PAD_LEFT);
    $data_pl = date('d.m.Y', strtotime($r['data_rezerwacji']));
    $body = '<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:20px 16px;">
<div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
<div style="background:#1a1a1a;padding:24px 32px;text-align:center;">
  <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:2px;">SILT <span style="font-weight:300;color:#aaaaaa;">paintball</span></div>
  <div style="font-size:11px;color:#888888;letter-spacing:1px;margin-top:4px;">www.paintball.silt.pl</div>
</div>
<div style="background:#2C6E3F;padding:10px 32px;text-align:center;">
  <span style="font-size:11px;color:rgba(255,255,255,0.9);letter-spacing:2px;text-transform:uppercase;">Zadatek potwierdzony</span>
</div>
<div style="background:#ffffff;padding:28px 32px;">
  <p style="font-size:15px;color:#1a1a1a;margin:0 0 8px;">Dzień dobry <strong>' . htmlspecialchars($r['klient_imie_nazwisko']) . '</strong>,</p>
  <p style="font-size:14px;color:#444444;margin:0 0 20px;line-height:1.6;">Zadatek otrzymaliśmy, dziękujemy — rezerwacja potwierdzona w 100%!</p>
  <div style="background:#f9f9f9;border-radius:10px;padding:18px 22px;margin-bottom:20px;border-left:4px solid #2C6E3F;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888888;margin-bottom:12px;">Szczegóły rezerwacji</div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;color:#1a1a1a;">
      <tr><td style="padding:6px 0;color:#888888;width:150px;">Numer</td><td style="padding:6px 0;font-weight:600;">' . $rez_nr . '</td></tr>
      <tr style="border-top:1px solid #eeeeee;"><td style="padding:6px 0;color:#888888;">Data</td><td style="padding:6px 0;">' . $data_pl . '</td></tr>
      <tr style="border-top:1px solid #eeeeee;"><td style="padding:6px 0;color:#888888;">Godzina</td><td style="padding:6px 0;">' . substr($r['godzina_start'],0,5) . '</td></tr>
      <tr style="border-top:1px solid #eeeeee;"><td style="padding:6px 0;color:#888888;">Liczba osób</td><td style="padding:6px 0;">' . $r['liczba_osob'] . '</td></tr>
      <tr style="border-top:1px solid #eeeeee;"><td style="padding:6px 0;color:#888888;">Atrakcja</td><td style="padding:6px 0;">' . htmlspecialchars($r['atrakcja_nazwa']) . '</td></tr>
      <tr style="border-top:1px solid #eeeeee;"><td style="padding:6px 0;color:#888888;vertical-align:top;">Dodatki</td><td style="padding:6px 0;">' . $d2_html . '</td></tr>
      ' . (!empty($r['uwagi']) ? '<tr style="border-top:1px solid #eeeeee;"><td style="padding:6px 0;color:#888888;vertical-align:top;">Uwagi</td><td style="padding:6px 0;">' . htmlspecialchars($r['uwagi']) . '</td></tr>' : '') . '
      <tr style="border-top:1px solid #eeeeee;"><td style="padding:6px 0;color:#888888;">Zadatek</td><td style="padding:6px 0;color:#2C6E3F;font-weight:600;">&#10003; 100 zł — opłacony</td></tr>
      <tr style="border-top:1px solid #eeeeee;"><td style="padding:6px 0;color:#888888;">Status rezerwacji</td><td style="padding:6px 0;"><span style="background:#e8f5e9;color:#2C6E3F;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;">&#10003; Potwierdzona</span></td></tr>
    </table>
  </div>
  <div style="background:#e8f5e9;border-radius:8px;padding:14px 18px;margin-bottom:16px;">
    <div style="font-size:12px;color:#2C6E3F;font-weight:600;margin-bottom:8px;">Ważne informacje</div>
    <div style="font-size:13px;color:#444444;line-height:1.9;">
      &bull; Prosimy o punktualne przybycie<br>
      &bull; Wygodne obuwie sportowe<br>
      &bull; Warto wziąć coś do picia<br>
      &bull; W przypadku płatności na miejscu &ndash; gotówka<br>
      &bull; Zakaz spożywania alkoholu przed i w trakcie gry<br>
      &bull; Najpóźniej dzień przed imprezą skontaktujemy się w sprawie potwierdzenia szczegółów. W przypadku braku kontaktu z naszej strony prosimy o kontakt z nami.
    </div>
  </div>
  <div style="background:#f9f9f9;border-radius:8px;padding:12px 18px;margin-bottom:16px;text-align:center;">
    <div style="font-size:11px;color:#888888;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Dokładna lokalizacja pola</div>
    <a href="https://maps.app.goo.gl/84nn2tBMvNfWUZWB8" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:9px 22px;border-radius:8px;font-size:12px;font-weight:600;">&#128205; Otwórz w Mapach Google</a>
  </div>
  <div style="text-align:center;">
    <a href="tel:+48503414175" style="display:inline-block;background:#2C6E3F;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">&#128222; 503 41 41 75</a>
  </div>
</div>
<div style="background:#1a1a1a;padding:18px 32px;text-align:center;">
  <p style="font-size:11px;color:#666666;margin:0 0 4px;">SILT Paintball &nbsp;&middot;&nbsp; kontakt@silt.pl &nbsp;&middot;&nbsp; 503 41 41 75</p>
  <p style="font-size:10px;color:#444444;margin:0;">paintball.silt.pl</p>
</div>
</div></div></body></html>';
    return $body;
}

/** Mail „Potwierdzenie przed imprezą”. $dodatki_html = lista dodatków (HTML). */
function tresc_mail_potwierdzenie(array $r, string $dodatki_html): string
{
    $rez_nr  = '#' . str_pad((string)$r['id'], 4, '0', STR_PAD_LEFT);
    $data_pl = date('d.m.Y', strtotime($r['data_rezerwacji']));
    $body = '<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:20px 16px;">
<div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
<div style="background:#1a1a1a;padding:24px 32px;text-align:center;">
  <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:2px;">SILT <span style="font-weight:300;color:#aaaaaa;">paintball</span></div>
  <div style="font-size:11px;color:#888888;letter-spacing:1px;margin-top:4px;">www.paintball.silt.pl</div>
</div>
<div style="background:#2C6E3F;padding:10px 32px;text-align:center;">
  <span style="font-size:11px;color:rgba(255,255,255,0.9);letter-spacing:2px;text-transform:uppercase;">Potwierdzenie przed imprezą</span>
</div>
<div style="background:#ffffff;padding:28px 32px;">
  <p style="font-size:15px;color:#1a1a1a;margin:0 0 8px;">Dzień dobry <strong>' . htmlspecialchars($r['klient_imie_nazwisko']) . '</strong>,</p>
  <p style="font-size:14px;color:#444444;margin:0 0 20px;line-height:1.6;">Dziękujemy za potwierdzenie rezerwacji. Poniżej znajdziesz aktualne szczegóły ustalone podczas rozmowy.</p>
  <div style="background:#f9f9f9;border-radius:10px;padding:18px 22px;margin-bottom:20px;border-left:4px solid #2C6E3F;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888888;margin-bottom:12px;">Podsumowanie rezerwacji</div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;color:#1a1a1a;">
      <tr><td style="padding:6px 0;color:#888888;width:150px;">Numer</td><td style="padding:6px 0;font-weight:600;">' . $rez_nr . '</td></tr>
      <tr style="border-top:1px solid #eeeeee;"><td style="padding:6px 0;color:#888888;">Data</td><td style="padding:6px 0;">' . $data_pl . '</td></tr>
      <tr style="border-top:1px solid #eeeeee;"><td style="padding:6px 0;color:#888888;">Godzina</td><td style="padding:6px 0;">' . substr($r['godzina_start'],0,5) . '</td></tr>
      <tr style="border-top:1px solid #eeeeee;"><td style="padding:6px 0;color:#888888;">Liczba osób</td><td style="padding:6px 0;">' . $r['liczba_osob'] . '</td></tr>
      <tr style="border-top:1px solid #eeeeee;"><td style="padding:6px 0;color:#888888;">Atrakcja</td><td style="padding:6px 0;">' . htmlspecialchars($r['atrakcja_nazwa']) . '</td></tr>
      <tr style="border-top:1px solid #eeeeee;"><td style="padding:6px 0;color:#888888;vertical-align:top;">Dodatki</td><td style="padding:6px 0;">' . $dodatki_html . '</td></tr>
      ' . (!empty($r['uwagi']) ? '<tr style="border-top:1px solid #eeeeee;"><td style="padding:6px 0;color:#888888;vertical-align:top;">Uwagi</td><td style="padding:6px 0;">' . htmlspecialchars($r['uwagi']) . '</td></tr>' : '') . '
      <tr style="border-top:1px solid #eeeeee;"><td style="padding:6px 0;color:#888888;">Zadatek</td><td style="padding:6px 0;color:#2C6E3F;font-weight:600;">&#10003; 100 zł — opłacony</td></tr>
      <tr style="border-top:1px solid #eeeeee;"><td style="padding:6px 0;color:#888888;">Status rezerwacji</td><td style="padding:6px 0;"><span style="background:#e8f5e9;color:#2C6E3F;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;">&#10003; Potwierdzona</span></td></tr>
    </table>
  </div>
  <div style="background:#e8f5e9;border-radius:8px;padding:14px 18px;margin-bottom:16px;">
    <div style="font-size:12px;color:#2C6E3F;font-weight:600;margin-bottom:8px;">Ważne informacje</div>
    <div style="font-size:13px;color:#444444;line-height:1.9;">
      &bull; Prosimy o punktualne przybycie<br>
      &bull; Wygodne obuwie sportowe<br>
      &bull; Warto wziąć coś do picia<br>
      &bull; W przypadku płatności na miejscu &ndash; gotówka<br>
      &bull; Zakaz spożywania alkoholu przed i w trakcie gry
    </div>
  </div>
  <div style="background:#f9f9f9;border-radius:8px;padding:12px 18px;margin-bottom:16px;text-align:center;">
    <div style="font-size:11px;color:#888888;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Dokładna lokalizacja pola</div>
    <a href="https://maps.app.goo.gl/84nn2tBMvNfWUZWB8" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:9px 22px;border-radius:8px;font-size:12px;font-weight:600;">&#128205; Otwórz w Mapach Google</a>
  </div>
  <div style="text-align:center;">
    <a href="tel:+48503414175" style="display:inline-block;background:#2C6E3F;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">&#128222; 503 41 41 75</a>
  </div>
</div>
<div style="background:#1a1a1a;padding:18px 32px;text-align:center;">
  <p style="font-size:11px;color:#666666;margin:0 0 4px;">SILT Paintball &nbsp;&middot;&nbsp; kontakt@silt.pl &nbsp;&middot;&nbsp; 503 41 41 75</p>
  <p style="font-size:10px;color:#444444;margin:0;">paintball.silt.pl</p>
</div>
</div></div></body></html>';
    return $body;
}
