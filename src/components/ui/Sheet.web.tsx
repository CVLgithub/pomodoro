import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { useSheetClose } from '../../hooks/useSheet';
import { themedStyles } from '../../theme/runtime';
import { CircleButton } from './CircleButton';
import type { SheetProps } from './Sheet';

/**
 * Web-Variante: Der Browser kennt kein Sheet. Die Route liegt durchsichtig
 * über dem Screen und zeichnet Abdunklung und Karte selbst.
 */
export const Sheet = ({ title, maxBodyHeightRatio, children }: SheetProps) => {
  const close = useSheetClose();
  const { height: windowHeight } = useWindowDimensions();

  return (
    <View style={styles.root}>
      <Pressable
        style={[StyleSheet.absoluteFill, styles.overlay]}
        onPress={close}
        accessibilityRole="button"
        accessibilityLabel="Schließen"
      />
      <View style={styles.card} accessibilityViewIsModal>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
          <CircleButton icon="close" label="Schließen" onPress={close} />
        </View>
        <ScrollView
          style={[
            styles.scroll,
            maxBodyHeightRatio === undefined
              ? null
              : { maxHeight: Math.round(windowHeight * maxBodyHeightRatio) },
          ]}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = themedStyles(() => ({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  overlay: {
    backgroundColor: colors.overlay,
  },
  card: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '88%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.sheet,
  },
  header: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    flexShrink: 1,
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  // Ohne `flexGrow: 0` füllt eine Scroll-Ansicht die ganze erlaubte Höhe der
  // Karte, auch wenn ihr Inhalt viel kleiner ist.
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  body: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing['2xl'],
    gap: spacing.lg,
  },
}));
