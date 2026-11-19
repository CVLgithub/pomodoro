import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../constants/colors';
import { useUiStore } from '../../store/uiStore';
import { themedStyles } from '../../theme/runtime';

const VISIBLE_MS = 3500;
const VISIBLE_WITH_ACTION_MS = 5500;

/**
 * Kurze Rückmeldung oben am Bildschirm. Verschwindet von selbst; mit Aktion
 * bleibt sie etwas länger stehen, damit man sie erreicht.
 */
export const Toast = () => {
  const toast = useUiStore((state) => state.toast);
  const hideToast = useUiStore((state) => state.hideToast);
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) {
      return;
    }

    AccessibilityInfo.announceForAccessibility(toast.message);
    progress.setValue(0);
    Animated.spring(progress, {
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
      damping: 18,
      stiffness: 220,
    }).start();

    const timeout = setTimeout(
      () => {
        Animated.timing(progress, {
          toValue: 0,
          duration: 180,
          useNativeDriver: Platform.OS !== 'web',
        }).start(() => hideToast(toast.id));
      },
      toast.actionLabel ? VISIBLE_WITH_ACTION_MS : VISIBLE_MS,
    );

    return () => clearTimeout(timeout);
  }, [hideToast, progress, toast]);

  if (!toast) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          top: insets.top + 8,
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) },
          ],
        },
      ]}
    >
      <View style={styles.toast} accessibilityLiveRegion="polite">
        {toast.tone === 'success' ? (
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${toast.message}. Schließen`}
          onPress={() => hideToast(toast.id)}
          style={styles.messageArea}
        >
          <Text style={styles.message} numberOfLines={2}>
            {toast.message}
          </Text>
        </Pressable>
        {toast.actionLabel && toast.onAction ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              hideToast(toast.id);
              toast.onAction?.();
            }}
            hitSlop={8}
            style={({ pressed }) => [styles.action, pressed ? styles.pressed : null]}
          >
            <Text style={styles.actionLabel}>{toast.actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
};

const styles = themedStyles(() => ({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 20,
    alignItems: 'center',
  },
  toast: {
    width: '100%',
    maxWidth: 480,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 6,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.glassLine,
    backgroundColor: colors.sheet,
    shadowColor: colors.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  messageArea: {
    flex: 1,
    paddingVertical: 6,
  },
  message: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  action: {
    minHeight: 40,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.surfaceElevated,
  },
  actionLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
}));
