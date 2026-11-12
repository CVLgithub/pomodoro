import type { ReactNode } from 'react';
import { Platform, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { useSheetClose } from '../../hooks/useSheet';
import { themedStyles } from '../../theme/runtime';
import { CircleButton } from './CircleButton';

export interface SheetProps {
  title: string;
  /**
   * Größter Anteil der Bildschirmhöhe, den der scrollende Inhalt einnehmen
   * darf (0 bis 1). Für Listen beliebiger Länge: Das Sheet bleibt kompakt und
   * die Liste scrollt in ihm. Ohne Angabe wächst das Sheet mit seinem Inhalt
   * bis zur vollen Höhe.
   */
  maxBodyHeightRatio?: number;
  children: ReactNode;
}

/**
 * Inhalt einer Sheet-Route. Das Sheet selbst stellt das System (siehe
 * `sheetScreenOptions`): Es bringt Greifer, Zieh- und Wischgesten, Abdunklung
 * und die Tastaturanpassung mit und ist genau so hoch wie sein Inhalt.
 *
 * Der Aufbau ist dafür fest vorgegeben: Kopfzeile und Scroll-Ansicht müssen
 * direkt nebeneinander an oberster Stelle der Route liegen, ohne umschließende
 * View. Nur so findet das native Sheet die Scroll-Ansicht, begrenzt sie auf
 * seine Höhe und gibt eine Ziehbewegung am Listenanfang an sich selbst weiter.
 * Eine Sheet-Route gibt deshalb immer genau ein `<Sheet>` zurück.
 */
export const Sheet = ({ title, maxBodyHeightRatio, children }: SheetProps) => {
  const close = useSheetClose();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const isIos = Platform.OS === 'ios';
  // iOS begrenzt die Höhe nativ auf das Sheet. Android braucht die Grenze im
  // Layout, damit ein langer Inhalt scrollt, statt abgeschnitten zu werden.
  const platformLimit = isIos ? Infinity : windowHeight - insets.top - HEADER_HEIGHT_ESTIMATE;
  const requestedLimit =
    maxBodyHeightRatio === undefined ? Infinity : Math.round(windowHeight * maxBodyHeightRatio);
  const maxBodyHeight = Math.min(platformLimit, requestedLimit);

  return (
    <>
      {/* `collapsable={false}` hält die Kopfzeile als eigene native View, damit
          das Sheet ihre Höhe von der Scroll-Ansicht abziehen kann. */}
      <View collapsable={false} style={[styles.header, isIos ? styles.headerIos : null]}>
        {/* iOS zeichnet den Greifer selbst. */}
        {isIos ? null : <View style={styles.handle} />}
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
          <CircleButton icon="close" label="Schließen" onPress={close} />
        </View>
      </View>
      <ScrollView
        style={Number.isFinite(maxBodyHeight) ? { maxHeight: maxBodyHeight } : null}
        contentContainerStyle={[
          styles.body,
          // iOS berücksichtigt den sicheren Bereich unten selbst.
          isIos ? null : { paddingBottom: spacing.xl + insets.bottom },
        ]}
        // Passt der Inhalt ganz hinein, federt nichts nach: Jede Ziehbewegung
        // gehört dann dem Sheet.
        alwaysBounceVertical={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {children}
      </ScrollView>
    </>
  );
};

/** Grobe Höhe der Kopfzeile samt Abstand zur Statusleiste; nur für die Höhengrenze auf Android. */
const HEADER_HEIGHT_ESTIMATE = 96;

const styles = themedStyles(() => ({
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  // Platz für den Greifer, den iOS oben in das Sheet zeichnet.
  headerIos: {
    paddingTop: spacing['2xl'],
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.track,
  },
  titleRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    flexShrink: 1,
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  body: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
}));
