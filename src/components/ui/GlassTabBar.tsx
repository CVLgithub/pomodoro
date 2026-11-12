import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../constants/colors';
import { themedStyles } from '../../theme/runtime';
import { Glass } from './Glass';

type IconName = ComponentProps<typeof Ionicons>['name'];
type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/** Route, die als eigene runde Taste neben der Leiste sitzt. */
const DETACHED_ROUTE = 'settings';

const icons: Record<string, IconName> = {
  today: 'stopwatch-outline',
  timer: 'hourglass-outline',
  tasks: 'checkbox-outline',
  stats: 'bar-chart-outline',
  settings: 'options-outline',
};

const BAR_HEIGHT = 64;

const barBottom = (insetBottom: number): number => Math.max(insetBottom, 16) + 4;

/** Platz, den Screens unten für die schwebende Leiste freihalten müssen. */
export const useTabBarClearance = (): number => {
  const insets = useSafeAreaInsets();

  return barBottom(insets.bottom) + BAR_HEIGHT + 14;
};

export const GlassTabBar = ({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();

  const renderTab = (routeIndex: number, detached: boolean) => {
    const route = state.routes[routeIndex];
    const focused = state.index === routeIndex;
    const label = String(descriptors[route.key].options.title ?? route.name);
    const tint = detached && focused ? colors.onAccent : focused ? colors.textPrimary : colors.textSecondary;

    const onPress = () => {
      const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });

      if (!focused && !event.defaultPrevented) {
        navigateToTab(route.key);
      }
    };

    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={label}
        onPress={onPress}
        style={[
          detached ? styles.detachedTab : styles.tab,
          focused && !detached ? styles.tabFocused : null,
        ]}
      >
        <Ionicons name={icons[route.name] ?? 'ellipse-outline'} size={24} color={tint} />
        {detached ? null : (
          <Text style={[styles.label, { color: tint }, focused ? styles.labelFocused : null]}>
            {label}
          </Text>
        )}
      </Pressable>
    );
  };

  const detachedIndex = state.routes.findIndex((route) => route.name === DETACHED_ROUTE);
  const barIndexes = state.routes.map((_, index) => index).filter((index) => index !== detachedIndex);
  const detachedFocused = detachedIndex >= 0 && state.index === detachedIndex;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { bottom: barBottom(insets.bottom) }]}
    >
      <Glass radius={32} style={styles.bar}>
        {barIndexes.map((index) => renderTab(index, false))}
      </Glass>
      {detachedIndex >= 0 ? (
        <Glass
          radius={32}
          interactive
          tint={detachedFocused ? colors.accent : undefined}
          style={styles.detached}
        >
          {renderTab(detachedIndex, true)}
        </Glass>
      ) : null}
    </View>
  );
};

const styles = themedStyles(() => ({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: BAR_HEIGHT,
    flexDirection: 'row',
    gap: 10,
  },
  bar: {
    flex: 1,
    flexDirection: 'row',
    padding: 4,
  },
  tab: {
    flex: 1,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabFocused: {
    backgroundColor: colors.track,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
  labelFocused: {
    fontWeight: '700',
  },
  detached: {
    width: 64,
    height: 64,
  },
  detachedTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
