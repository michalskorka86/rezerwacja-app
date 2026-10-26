/**
 * SMS z potwierdzeniem do klienta — wysyłany z telefonu pracownika (jego aplikacja SMS), nie przez SMSAPI.
 * Bez importów React Native — testy w Node.
 */

import type { Rezerwacja } from './typy';

const WSTEP =
  'Dziękuję uprzejmie za rozmowę oraz potwierdzenie rezerwacji. Przypominam o zabraniu wody do picia oraz wygodnego obuwia, ' +
  'punktualnym przybyciu oraz płatności tylko gotówką.';

/** Mapy dojazdu na pola Arsenału (link do Google Maps). */
export const LOKALIZACJA_ARSENAL = {
  rembert: 'https://maps.app.goo.gl/RpSe5EiiZUAXUjxs5',
  wolomin: 'https://maps.app.goo.gl/zXBoVDCzrsSiesdE8',
} as const;

/** Treść SMS-a: SILT — podpis Kuby; Arsenał — link do lokalizacji pola (Rembertów / Wołomin) i podpis Pawła. */
export function trescSmsPotwierdzenia(r: Pick<Rezerwacja, 'marka' | 'lokalizacja'>): string {
  if (r.marka === 'arsenal') {
    const mapa = r.lokalizacja === 'wolomin' ? LOKALIZACJA_ARSENAL.wolomin : r.lokalizacja === 'rembert' ? LOKALIZACJA_ARSENAL.rembert : null;
    return [WSTEP, mapa ? `Lokalizacja pola: ${mapa}` : null, 'Pozdrawiam serdecznie Paweł Arsenał Paintball.'].filter(Boolean).join('\n');
  }
  return `${WSTEP} Pozdrawiam serdecznie Kuba SILT Paintball & ASG.`;
}

/** Adres otwierający aplikację SMS z numerem i treścią: „sms:+48501234567?body=…” (null, gdy brak numeru). */
export function adresSms(telefon: string | null | undefined, tresc: string): string | null {
  const numer = (telefon ?? '').replace(/[^\d+]/g, '');
  if (numer.replace(/\D/g, '').length < 6) return null;
  return `sms:${numer}?body=${encodeURIComponent(tresc)}`;
}
