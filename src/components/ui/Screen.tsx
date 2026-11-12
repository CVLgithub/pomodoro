import { ReactNode } from 'react';
import type { ComponentProps } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { colors } from '../../constants/colors';
import { getPalette, themedStyles } from '../../theme/runtime';
import { Backdrop } from './Backdrop';
import { CircleButton } from './CircleButton';
import { useTabBarClearance } from './GlassTabBar';

interface ScreenShellProps {
  children: ReactNode;
  style?: ComponentProps<typeof View>['style'];
}

/** Grundgerüst jedes Screens: Hintergrund, Statusleiste und sicherer Bereich oben. */
export const ScreenShell = ({ children, style }: ScreenShellProps) => (
  <View style={styles.root}>
    <Backdrop />
    <StatusBar style={getPalette().scheme === 'light' ? 'dark' : 'light'} />
    <SafeAreaView style={[styles.safeArea, style]} edges={['top']}>
      {children}
    </SafeAreaView>
  </View>
);

interface ScreenHeaderProps {
  title: string;
  right?: ReactNode;
  /** Zeigt links eine Zurück-Taste (für Screens außerhalb der Tabs). */
  onBack?: () => void;
}

/** Kopfzeile: links der Titel, rechts höchstens eine Status- oder Aktionsfläche. */
export const ScreenHeader = ({ title, right, onBack }: ScreenHeaderProps) => (
  <View style={styles.header}>
    {onBack ? <CircleButton icon="chevron-back" label="Zurück" onPress={onBack} /> : null}
    <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
      {title}
    </Text>
    {right ? <View style={styles.headerRight}>{right}</View> : null}
  </View>
);

interface ScreenProps {
  title: string;
  /** Kurzer Hinweis unter dem Titel; nur setzen, wenn er etwas Nötiges erklärt. */
  subtitle?: string;
  headerRight?: ReactNode;
  /** Zeigt links eine Zurück-Taste (für Screens außerhalb der Tabs). */
  onBack?: () => void;
  footer?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
  contentContainerStyle?: ComponentProps<typeof View>['style'];
}

export const Screen = ({
  title,
  subtitle,
  headerRight,
  onBack,
  footer,
  children,
  scroll = true,
  contentContainerStyle,
}: ScreenProps) => {
  const clearance = useTabBarClearance();

  return (
  <ScreenShell>
    <View style={styles.headerInset}>
      <ScreenHeader title={title} right={headerRight} onBack={onBack} />
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
    {scroll ? (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: clearance }, contentContainerStyle]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    ) : (
      <View style={[styles.container, styles.content, { paddingBottom: clearance }, contentContainerStyle]}>
        {children}
      </View>
    )}
    {footer ? <View style={[styles.footer, { bottom: clearance }]}>{footer}</View> : null}
  </ScreenShell>
  );
};

const styles = themedStyles(() => ({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  headerInset: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    paddingHorizontal: 4,
    color: colors.textPrimary,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  subtitle: {
    paddingHorizontal: 4,
    paddingTop: 4,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 12,
  },
  footer: {
    position: 'absolute',
    right: 0,
    left: 0,
    paddingHorizontal: 16,
  },
}));
