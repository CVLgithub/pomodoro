import { useCallback, useEffect, useRef } from 'react';
import type { ComponentRef, RefObject } from 'react';
import type { TextInput } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import type { Href, NativeStackNavigationProp } from 'expo-router';

import { routes } from '../constants/routes';
import { haptics } from '../utils/haptics';

/**
 * Öffnet eine Sheet-Route. Der leichte Impuls bestätigt das Antippen in dem
 * Moment, in dem das Sheet hochkommt. Beim Ziehen und Schließen bleibt das
 * Sheet wie jedes Systemsheet ohne Haptik.
 */
export const useOpenSheet = (): ((href: Href) => void) => {
  const router = useRouter();

  return useCallback(
    (href: Href) => {
      haptics.light();
      router.push(href);
    },
    [router],
  );
};

/**
 * Schließt das Sheet, in dem die Komponente liegt. Wirkt nur einmal: Ein
 * zweiter Aufruf (Doppeltipp, Sichern und Schließen kurz nacheinander) würde
 * sonst auch den Screen darunter verlassen.
 */
export const useSheetClose = (): (() => void) => {
  const router = useRouter();
  const isClosing = useRef(false);

  return useCallback(() => {
    if (isClosing.current) {
      return;
    }

    isClosing.current = true;

    if (router.canGoBack()) {
      router.back();
    } else {
      // Direkt aufgerufen (etwa per Adresse im Web) liegt kein Screen darunter.
      router.replace(routes.timer);
    }
  }, [router]);
};

/** Spätester Zeitpunkt für den Fokus, falls kein Übergangsende gemeldet wird (z. B. im Web). */
const FOCUS_FALLBACK_MS = 700;

/**
 * Setzt den Fokus in ein Textfeld, sobald das Sheet fertig hochgefahren ist.
 * `autoFocus` würde die Tastatur schon während der Einblendung holen; das Sheet
 * müsste dann gleichzeitig hochfahren und seine Höhe an die Tastatur anpassen.
 */
export const useSheetAutoFocus = (
  inputRef: RefObject<ComponentRef<typeof TextInput> | null>,
): void => {
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();

  useEffect(() => {
    let isDone = false;

    const focus = () => {
      if (isDone) {
        return;
      }

      isDone = true;
      inputRef.current?.focus();
    };

    const unsubscribe = navigation.addListener('transitionEnd', (event) => {
      if (!event.data.closing) {
        focus();
      }
    });
    const fallback = setTimeout(focus, FOCUS_FALLBACK_MS);

    return () => {
      isDone = true;
      unsubscribe();
      clearTimeout(fallback);
    };
  }, [inputRef, navigation]);
};
