import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import type { StyleProp, TextStyle } from 'react-native';

import { C } from '@/constants/theme';

export type NazwaIkony = ComponentProps<typeof Ionicons>['name'];

/**
 * Jednolite cienkie ikony (Ionicons, wbudowane w Expo — bez nowego APK) zamiast emoji
 * (uzgodnione z Michałem 04.11: emoji wyglądały różnie na każdym telefonie).
 */
export function Ikona({ nazwa, rozmiar = 20, kolor = C.text, style }: { nazwa: NazwaIkony; rozmiar?: number; kolor?: string; style?: StyleProp<TextStyle> }) {
  return <Ionicons name={nazwa} size={rozmiar} color={kolor} style={style} accessibilityElementsHidden importantForAccessibility="no" />;
}
