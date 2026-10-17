import { ReactNode } from 'react';
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';

interface ScreenProps {
  title: string;
  subtitle?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export const Screen = ({
  title,
  subtitle,
  headerRight,
  children,
  scroll = true,
  contentContainerStyle,
}: ScreenProps) => {
  const content = (
    <>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {headerRight ? <View>{headerRight}</View> : null}
      </View>
      {children}
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.backgroundOrbPrimary} />
      <View style={styles.backgroundOrbSecondary} />
      {scroll ? (
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.content, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        <View style={[styles.container, styles.content, contentContainerStyle]}>{content}</View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['3xl'],
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
  },
  backgroundOrbPrimary: {
    position: 'absolute',
    top: -80,
    right: -40,
    width: 300,
    height: 300,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 107, 74, 0.10)',
  },
  backgroundOrbSecondary: {
    position: 'absolute',
    bottom: 80,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(95, 211, 141, 0.05)',
  },
});

