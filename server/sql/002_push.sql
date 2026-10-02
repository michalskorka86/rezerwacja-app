-- Rezerwacje — powiadomienia push (wgrać RAZ po 001_aplikacja.sql: phpMyAdmin → Import → ten plik).
-- Token push telefonu jest już w app_tokeny.push_token (z pliku 001). Tu tylko znacznik „wysłano”,
-- żeby powiadomienie o tej samej rezerwacji nie poszło dwa razy (tabel PWA nie zmieniamy).
CREATE TABLE IF NOT EXISTS `app_push_wyslane` (
  `rezerwacja_id` int(11) NOT NULL,
  `czas` datetime NOT NULL,
  `telefonow` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`rezerwacja_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
