import { Platform } from 'react-native';
import type { NativeStackNavigationOptions } from 'expo-router';

import { colors } from '../../constants/colors';
import { hasNativeGlass } from './Glass';

/**
 * Stack-Optionen für jede Sheet-Route.
 *
 * iOS und Android zeigen die Route als natives Sheet des Systems. Greifer,
 * Ziehen, Wisch zum Schließen, Antippen der Abdunklung und das Ausweichen vor
 * der Tastatur kommen damit vom System und verhalten sich wie in jeder
 * anderen App. `fitToContents` macht das Sheet genau so hoch wie seinen
 * Inhalt, höchstens aber bildschirmhoch.
 *
 * Im Web gibt es kein Sheet; dort liegt die Route durchsichtig über dem
 * Screen und zeichnet ihre Karte selbst (siehe `Sheet.web.tsx`).
 *
 * Die Funktion liest Farben der aktiven Farbwelt und muss deshalb beim
 * Rendern aufgerufen werden, nicht auf Modulebene.
 */
export const sheetScreenOptions = (): NativeStackNavigationOptions => {
  if (Platform.OS === 'web') {
    return {
      presentation: 'transparentModal',
      headerShown: false,
      contentStyle: { backgroundColor: 'transparent' },
    };
  }

  return {
    presentation: 'formSheet',
    headerShown: false,
    sheetAllowedDetents: 'fitToContents',
    sheetGrabberVisible: true,
    // Mit durchsichtigem Inhalt zeichnet iOS 26 das Sheet selbst als Liquid
    // Glass mit den passenden Eckenradien. Ohne natives Glas braucht das Sheet
    // eine deckende Fläche und eigene Ecken.
    ...(hasNativeGlass ? null : { sheetCornerRadius: 28 }),
    contentStyle: { backgroundColor: hasNativeGlass ? 'transparent' : colors.sheet },
  };
};
