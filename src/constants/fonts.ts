import { Platform } from 'react-native';

// Schrift fuer Titel/Ueberschriften. Hier zentral aendern (z. B. 'Georgia', 'Optima', 'Gill Sans').
// Ziffern der Uhr bleiben bewusst in der System-Schrift (stabile, gleich breite Ziffern).
export const fonts = {
  display: Platform.select({ ios: 'Avenir Next', default: undefined }),
} as const;
