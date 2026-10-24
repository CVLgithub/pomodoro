import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
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
import {
  GestureHandlerRootView,
  PanGestureHandler,
  PanGestureHandlerStateChangeEvent,
  State,
} from 'react-native-gesture-handler';

import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';

type ModalSheetSwipeAreaProps = {
  children: ReactNode;
  style?: ComponentProps<typeof View>['style'];
};

type ModalSheetRenderProps = {
  SwipeArea: ({ children, style }: ModalSheetSwipeAreaProps) => ReactNode;
};

type ModalSheetChildren = ReactNode | ((props: ModalSheetRenderProps) => ReactNode);

interface ModalSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ModalSheetChildren;
  swipeToClose?: boolean;
}

export const ModalSheet = ({
  visible,
  title,
  onClose,
  children,
  swipeToClose = false,
}: ModalSheetProps) => {
  const [isMounted, setIsMounted] = useState(visible);
  const { height: windowHeight } = useWindowDimensions();
  const hiddenTranslateY = Math.max(windowHeight, 720);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(hiddenTranslateY)).current;
  const onCloseRef = useRef(onClose);

  onCloseRef.current = onClose;

  const sheetDisplayTranslateY = useMemo(
    () =>
      sheetTranslateY.interpolate({
        inputRange: [0, hiddenTranslateY],
        outputRange: [0, hiddenTranslateY],
        extrapolate: 'clamp',
      }),
    [hiddenTranslateY, sheetTranslateY],
  );

  const resetSheetPosition = useCallback((velocityY = 0) => {
    Animated.spring(sheetTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      damping: 28,
      stiffness: 320,
      mass: 0.9,
      velocity: velocityY,
      overshootClamping: true,
    }).start();
  }, [sheetTranslateY]);

  const handleSwipeGesture = useMemo(
    () =>
      Animated.event(
        [
          {
            nativeEvent: {
              translationY: sheetTranslateY,
            },
          },
        ],
        { useNativeDriver: true },
      ),
    [sheetTranslateY],
  );

  const handleSwipeStateChange = useCallback(
    (event: PanGestureHandlerStateChangeEvent) => {
      const { state, translationY, velocityY } = event.nativeEvent;

      if (state === State.BEGAN) {
        sheetTranslateY.stopAnimation();
        return;
      }

      if (state !== State.END && state !== State.CANCELLED && state !== State.FAILED) {
        return;
      }

      if (translationY > 76 || velocityY > 900) {
        onCloseRef.current();
        return;
      }

      resetSheetPosition(velocityY);
    },
    [resetSheetPosition, sheetTranslateY],
  );

  const SwipeArea = useMemo(
    () =>
      ({ children: areaChildren, style }: ModalSheetSwipeAreaProps) => {
        if (!swipeToClose) {
          return <View style={style}>{areaChildren}</View>;
        }

        return (
          <PanGestureHandler
            activeOffsetY={8}
            failOffsetX={[-24, 24]}
            onGestureEvent={handleSwipeGesture}
            onHandlerStateChange={handleSwipeStateChange}
          >
            <Animated.View style={style}>{areaChildren}</Animated.View>
          </PanGestureHandler>
        );
      },
    [handleSwipeGesture, handleSwipeStateChange, swipeToClose],
  );
  const renderedChildren =
    typeof children === 'function' ? children({ SwipeArea }) : children;

  useEffect(() => {
    if (visible) {
      setIsMounted(true);

      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();

      return;
    }

    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: hiddenTranslateY,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
      }
    });
  }, [hiddenTranslateY, overlayOpacity, sheetTranslateY, visible]);

  return (
    <Modal transparent animationType="none" visible={isMounted} onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.modalRoot}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <Animated.View
            style={[
              styles.sheet,
              {
                transform: [{ translateY: sheetDisplayTranslateY }],
              },
            ]}
          >
            {swipeToClose ? (
              <SwipeArea style={styles.dragHandleArea}>
                <View style={styles.dragHandle} />
              </SwipeArea>
            ) : null}
            <SwipeArea style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <Pressable onPress={onClose}>
                <Text style={styles.close}>Fertig</Text>
              </Pressable>
            </SwipeArea>
            {renderedChildren}
          </Animated.View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing['3xl'],
    gap: spacing.lg,
  },
  dragHandleArea: {
    alignItems: 'center',
    paddingBottom: spacing.xs,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  close: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
});
