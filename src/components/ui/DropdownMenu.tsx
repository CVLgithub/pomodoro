import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../constants/colors';
import { themedStyles } from '../../theme/runtime';
import { Glass, hasNativeGlass } from './Glass';
import { haptics } from '../../utils/haptics';

const MENU_WIDTH = 250;
const MENU_RADIUS = 30;
const ROW_HEIGHT = 50;
const MENU_PADDING = 8;
const EDGE_MARGIN = 12;
const ANCHOR_GAP = 6;

/** Lage der auslösenden Zeile im Fenster, wie `measureInWindow` sie liefert. */
export interface MenuAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DropdownMenuProps<T extends string | number> {
  /** `null` heißt: Menü geschlossen. */
  anchor: MenuAnchor | null;
  options: readonly { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
  onClose: () => void;
}

/**
 * Aufklappmenü im Stil der iOS-Kontextmenüs: eine Glasfläche, die aus der
 * auslösenden Zeile herauswächst; der gewählte Eintrag trägt einen Haken.
 */
export const DropdownMenu = <T extends string | number>({
  anchor,
  options,
  selected,
  onSelect,
  onClose,
}: DropdownMenuProps<T>) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  // Hält die letzte Lage fest, solange das Menü noch zuklappt.
  const [shownAnchor, setShownAnchor] = useState<MenuAnchor | null>(anchor);
  const progress = useRef(new Animated.Value(0)).current;
  const transitionId = useRef(0);

  useEffect(() => {
    const id = ++transitionId.current;

    if (anchor) {
      setShownAnchor(anchor);
      haptics.light();
      // Unterdämpft, damit das Menü kurz über seine Größe hinausfedert.
      Animated.spring(progress, {
        toValue: 1,
        useNativeDriver: true,
        damping: 17,
        stiffness: 300,
        mass: 0.8,
      }).start();

      return;
    }

    Animated.timing(progress, {
      toValue: 0,
      duration: 150,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      if (transitionId.current === id) {
        setShownAnchor(null);
      }
    });
  }, [anchor, progress]);

  const placed = anchor ?? shownAnchor;
  const menuHeight = options.length * ROW_HEIGHT + MENU_PADDING * 2;
  // Reicht der Platz darunter nicht, klappt das Menü nach oben auf.
  const opensUpward =
    placed !== null &&
    placed.y + placed.height + ANCHOR_GAP + menuHeight > windowHeight - EDGE_MARGIN;
  const position = placed
    ? {
        left: Math.max(
          EDGE_MARGIN,
          Math.min(windowWidth - MENU_WIDTH - EDGE_MARGIN, placed.x + placed.width - MENU_WIDTH),
        ),
        top: opensUpward
          ? Math.max(EDGE_MARGIN, placed.y - ANCHOR_GAP - menuHeight)
          : placed.y + placed.height + ANCHOR_GAP,
      }
    : null;

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });
  const dim = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  // Natives Glas verträgt keine Durchsichtigkeit am Elternteil; dort trägt die
  // Skalierung die Bewegung allein.
  const menuOpacity = hasNativeGlass
    ? 1
    : progress.interpolate({ inputRange: [0, 0.6], outputRange: [0, 1], extrapolate: 'clamp' });

  return (
    <Modal
      transparent
      statusBarTranslucent
      animationType="none"
      visible={shownAnchor !== null}
      onRequestClose={onClose}
    >
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.dim, { opacity: dim }]}
      />
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Menü schließen"
      />
      {position ? (
        <Animated.View
          style={[
            styles.frame,
            position,
            {
              opacity: menuOpacity,
              transformOrigin: opensUpward ? 'bottom right' : 'top right',
              transform: [{ scale }],
            },
          ]}
        >
          <Glass
            radius={MENU_RADIUS}
            interactive
            style={[styles.menu, hasNativeGlass ? null : { backgroundColor: colors.sheet }]}
            accessibilityRole="menu"
          >
            {options.map((option) => {
              const isSelected = option.value === selected;

              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    haptics.selection();
                    onSelect(option.value);
                  }}
                  style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
                >
                  <View style={styles.check}>
                    {isSelected ? (
                      <Ionicons name="checkmark" size={18} color={colors.textPrimary} />
                    ) : null}
                  </View>
                  <Text style={[styles.label, isSelected ? styles.labelSelected : null]} numberOfLines={1}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </Glass>
        </Animated.View>
      ) : null}
    </Modal>
  );
};

const styles = themedStyles(() => ({
  dim: {
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  frame: {
    position: 'absolute',
    width: MENU_WIDTH,
    borderRadius: MENU_RADIUS,
    boxShadow: '0 14px 44px rgba(0,0,0,0.38)',
  },
  menu: {
    padding: MENU_PADDING,
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    borderRadius: MENU_RADIUS - MENU_PADDING,
  },
  rowPressed: {
    backgroundColor: colors.track,
    transform: [{ scale: 0.98 }],
  },
  check: {
    width: 22,
    alignItems: 'center',
  },
  label: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 17,
  },
  labelSelected: {
    fontWeight: '600',
  },
}));
