/**
 * Kolory i wymiary przeniesione 1:1 z PWA (rezerwacjaapp/style.css, :root).
 * Zmieniaj tylko tutaj — ekrany korzystają wyłącznie z tych wartości. Zmiana wyglądu = po uzgodnieniu z Michałem.
 */

export const C = {
  bg: '#F5F5F2',
  surface: '#FFFFFF',
  border: '#E4E4DF',
  text: '#1A1A18',
  text2: '#6B6B65',
  text3: '#AAAAA4',
  green: '#2C6E3F',
  greenL: '#EDF7F0',
  red: '#C0392B',
  redL: '#FEF0EE',
  blue: '#1A73E8',
  blueL: '#e8f0fe',
  /** czerwony licznik / znaczek NEW (#e53935 w kalendarz.php) */
  alarm: '#e53935',
  /** pomarańczowy z PWA: „Niedoszłe”, instrukcje dla instruktora */
  pomarancz: '#e65100',
  swieto: '#fff8f8',
} as const;

export const Size = {
  /** --radius */
  radius: 14,
  /** --rs */
  rs: 9,
} as const;

/** DM Sans jak w PWA (Google Fonts, wagi 400–700). */
export const Fonts = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
} as const;

/** box-shadow: 0 1px 3px rgba(0,0,0,.08) itp. — na Androidzie elevation */
export const cien = (poziom: 1 | 2 | 3) =>
  ({
    shadowColor: '#000',
    shadowOpacity: poziom === 1 ? 0.08 : poziom === 2 ? 0.12 : 0.2,
    shadowRadius: poziom === 1 ? 3 : poziom === 2 ? 8 : 20,
    shadowOffset: { width: 0, height: poziom === 3 ? 4 : 1 },
    elevation: poziom === 1 ? 1 : poziom === 2 ? 3 : 8,
  }) as const;
