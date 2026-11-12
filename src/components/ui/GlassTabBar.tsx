import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import { Animated, PanResponder, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../constants/colors';
import { themedStyles } from '../../theme/runtime';
import { Glass } from './Glass';
import { haptics } from '../../utils/haptics';

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
const BAR_SIDE_MARGIN = 16;
const BAR_PADDING = 4;

const barBottom = (insetBottom: number): number => Math.max(insetBottom, 16) + 4;

/** Platz, den Screens unten für die schwebende Leiste freihalten müssen. */
export const useTabBarClearance = (): number => {
  const insets = useSafeAreaInsets();

  return barBottom(insets.bottom) + BAR_HEIGHT + 14;
};

export const GlassTabBar = ({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();
  const detachedIndex = state.routes.findIndex((route) => route.name === DETACHED_ROUTE);
  const barIndexes = state.routes.map((_, index) => index).filter((index) => index !== detachedIndex);
  const detachedFocused = detachedIndex >= 0 && state.index === detachedIndex;
  /** Platz des aktiven Tabs in der Leiste; -1, wenn die abgesetzte Taste aktiv ist. */
  const focusedSlot = barIndexes.indexOf(state.index);

  const [tabWidth, setTabWidth] = useState(0);
  /** Platz unter dem Finger, solange die Markierung gezogen wird. */
  const [dragSlot, setDragSlot] = useState<number | null>(null);
  const pillX = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const pillPlaced = useRef(false);

  const pressTab = (routeIndex: number) => {
    const route = state.routes[routeIndex];
    const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });

    if (state.index !== routeIndex && !event.defaultPrevented) {
      haptics.light();
      navigateToTab(route.key);
    }
  };

  // Der PanResponder wird nur einmal gebaut und liest den aktuellen Stand hier.
  const live = useRef({ tabWidth, barIndexes, focusedSlot, pressTab, dragSlot: 0 });
  Object.assign(live.current, { tabWidth, barIndexes, focusedSlot, pressTab });

  const springPillTo = (slot: number, width: number) => {
    Animated.spring(pillX, {
      toValue: slot * width,
      useNativeDriver: true,
      damping: 20,
      stiffness: 260,
      mass: 0.8,
    }).start();
  };

  // Die Markierung gleitet zum aktiven Tab, statt zu springen.
  useEffect(() => {
    if (tabWidth === 0 || focusedSlot < 0) {
      return;
    }

    if (!pillPlaced.current) {
      pillPlaced.current = true;
      pillX.setValue(focusedSlot * tabWidth);
      return;
    }

    springPillTo(focusedSlot, tabWidth);
  }, [focusedSlot, tabWidth]);

  const panResponder = useMemo(() => {
    const setLift = (toValue: number) =>
      Animated.spring(lift, { toValue, useNativeDriver: true, damping: 18, stiffness: 300 }).start();

    const follow = (pageX: number) => {
      const { tabWidth: width, barIndexes: slots } = live.current;
      const fingerX = pageX - BAR_SIDE_MARGIN - BAR_PADDING;
      const x = Math.min((slots.length - 1) * width, Math.max(0, fingerX - width / 2));
      const slot = Math.round(x / width);

      pillX.setValue(x);

      if (slot !== live.current.dragSlot) {
        // Tick bei jedem Tab, über den die Markierung gleitet (nicht beim Aufsetzen).
        if (live.current.dragSlot >= 0) {
          haptics.selection();
        }

        live.current.dragSlot = slot;
        setDragSlot(slot);
      }
    };

    const finish = (commit: boolean) => {
      const { dragSlot: slot, focusedSlot: current, tabWidth: width, barIndexes: slots } = live.current;
      const target = commit ? slot : current;

      setLift(0);
      setDragSlot(null);

      if (target >= 0) {
        Animated.spring(pillX, {
          toValue: target * width,
          useNativeDriver: true,
          damping: 20,
          stiffness: 260,
          mass: 0.8,
        }).start();
      }

      if (commit && slot !== current) {
        live.current.pressTab(slots[slot]);
      }
    };

    return PanResponder.create({
      // Nur seitliches Ziehen übernimmt; ein Tipp bleibt bei den Tasten.
      onMoveShouldSetPanResponderCapture: (_event, gesture) =>
        live.current.tabWidth > 0 &&
        Math.abs(gesture.dx) > 6 &&
        Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (_event, gesture) => {
        live.current.dragSlot = -1;
        pillX.stopAnimation();
        setLift(1);
        follow(gesture.moveX || gesture.x0);
      },
      onPanResponderMove: (_event, gesture) => follow(gesture.moveX),
      onPanResponderRelease: () => finish(true),
      onPanResponderTerminate: () => finish(false),
    });
  }, [lift, pillX]);

  const renderTab = (routeIndex: number, detached: boolean) => {
    const route = state.routes[routeIndex];
    const focused = state.index === routeIndex;
    const label = String(descriptors[route.key].options.title ?? route.name);
    // Beim Ziehen hebt sich der Tab unter dem Finger hervor, nicht der aktive.
    const highlighted =
      detached || dragSlot === null ? focused : barIndexes[dragSlot] === routeIndex;
    const tint =
      detached && focused ? colors.onAccent : highlighted ? colors.textPrimary : colors.textSecondary;

    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={label}
        onPress={() => pressTab(routeIndex)}
        style={detached ? styles.detachedTab : styles.tab}
      >
        <Ionicons name={icons[route.name] ?? 'ellipse-outline'} size={24} color={tint} />
        {detached ? null : (
          <Text style={[styles.label, { color: tint }, highlighted ? styles.labelFocused : null]}>
            {label}
          </Text>
        )}
      </Pressable>
    );
  };

  const pillVisible = tabWidth > 0 && (focusedSlot >= 0 || dragSlot !== null);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { bottom: barBottom(insets.bottom) }]}
    >
      <Glass
        radius={32}
        style={styles.bar}
        onLayout={(event) =>
          setTabWidth(
            (event.nativeEvent.layout.width - BAR_PADDING * 2) / Math.max(1, barIndexes.length),
          )
        }
        {...panResponder.panHandlers}
      >
        {pillVisible ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pill,
              {
                width: tabWidth,
                transform: [
                  { translateX: pillX },
                  { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
                ],
              },
            ]}
          />
        ) : null}
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
    left: BAR_SIDE_MARGIN,
    right: BAR_SIDE_MARGIN,
    height: BAR_HEIGHT,
    flexDirection: 'row',
    gap: 10,
  },
  bar: {
    flex: 1,
    flexDirection: 'row',
    padding: BAR_PADDING,
  },
  // Gleitende Markierung hinter dem aktiven Tab.
  pill: {
    position: 'absolute',
    top: BAR_PADDING,
    bottom: BAR_PADDING,
    left: BAR_PADDING,
    borderRadius: 28,
    backgroundColor: colors.track,
  },
  tab: {
    flex: 1,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
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
