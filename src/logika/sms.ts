/**
 * SMS z potwierdzeniem do klienta — wysyłany z telefonu pracownika (jego aplikacja SMS), nie przez SMSAPI.
 * Bez importów React Native — testy w Node.
 */

export const TRESC_SMS_POTWIERDZENIA =
  'Dziękuję uprzejmie za rozmowę oraz potwierdzenie rezerwacji. Przypominam o zabraniu wody do picia oraz wygodnego obuwia, ' +
  'punktualnym przybyciu oraz płatności tylko gotówką. Pozdrawiam serdecznie Kuba SILT Paintball & ASG.';

/** Adres otwierający aplikację SMS z numerem i treścią: „sms:+48501234567?body=…” (null, gdy brak numeru). */
export function adresSms(telefon: string | null | undefined, tresc: string): string | null {
  const numer = (telefon ?? '').replace(/[^\d+]/g, '');
  if (numer.replace(/\D/g, '').length < 6) return null;
  return `sms:${numer}?body=${encodeURIComponent(tresc)}`;
}
