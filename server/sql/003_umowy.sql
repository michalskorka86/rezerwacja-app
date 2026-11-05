-- Rezerwacje — umowy najmu sprzętu (wgrać RAZ: phpMyAdmin → Import → ten plik). Tabel PWA nie zmieniamy.
-- Dane umowy (najemca, dowód, kwoty, sprzęt z modelami, podpisy jako ścieżki SVG) w jednym polu JSON.
-- Dostęp tylko przez aplikację po zalogowaniu. Przy usunięciu wynajmu umowy też są usuwane.
CREATE TABLE IF NOT EXISTS `app_umowy` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `wynajem_id` int(11) NOT NULL,
  `dane_json` mediumtext NOT NULL,
  `utworzona` datetime NOT NULL,
  `utworzyl` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `wynajem_id` (`wynajem_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
