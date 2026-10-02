/**
 * Ustawienia — sprawdzanie formularzy (renderDodajUzytkownika / renderZmienHaslo w PWA).
 * Bez importów React Native — testy w Node.
 */

export type StanUzytkownika = { imie: string; login: string; haslo: string; rola: 'admin' | 'instruktor'; marka: 'silt' | 'arsenal' };

export const nowyUzytkownik = (): StanUzytkownika => ({ imie: '', login: '', haslo: '', rola: 'admin', marka: 'silt' });

export function bladUzytkownika(s: StanUzytkownika): string | null {
  if (!s.imie.trim() || !s.login.trim() || !s.haslo.trim()) return 'Wypełnij wszystkie pola';
  if (s.haslo.trim().length < 6) return 'Hasło min. 6 znaków';
  return null;
}

export const daneUzytkownika = (s: StanUzytkownika) => ({
  imie: s.imie.trim(),
  login: s.login.trim(),
  haslo: s.haslo.trim(),
  rola_nazwa: s.rola,
  marka: s.marka,
});

/** Zmiana hasła: po resecie przez admina stare hasło nie jest potrzebne. */
export function bladHasla(p: { stare: string; nowe: string; nowe2: string; reset: boolean }): string | null {
  if ((!p.reset && !p.stare) || !p.nowe || !p.nowe2) return 'Wypełnij wszystkie pola';
  if (p.nowe !== p.nowe2) return 'Hasła nie są identyczne';
  if (p.nowe.length < 6) return 'Hasło min. 6 znaków';
  return null;
}
