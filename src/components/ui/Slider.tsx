import { useMemo, useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';

import { colors } from '../../constants/colors';
import { themedStyles } from '../../theme/runtime';
import { haptics } from '../../utils/haptics';

const THUMB_SIZE = 28;

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  /** Läuft während des Ziehens mit jedem neuen Rastwert. */
  onChange?: (value: number) => void;
  /** Läuft einmal beim Loslassen mit dem endgültigen Wert. */
  onCommit: (value: number) => void;
  accessibilityLabel: string;
  /** Ausgeschriebener Wert für Screenreader, z. B. „2 Stunden“. */
  formatValue: (value: number) => string;
}

/** Schieberegler mit Rastwerten. Antippen der Schiene springt dorthin. */
export const Slider = ({
  value,
  min,
  max,
  step,
  onChange,
  onCommit,
  accessibilityLabel,
  formatValue,
}: SliderProps) => {
  const [width, setWidth] = useState(0);
  const [dragValue, setDragValue] = useState<number | null>(null);
  // Der PanResponder wird nur einmal gebaut und liest den aktuellen Stand hier.
  const live = useRef({ width, min, max, step, onChange, onCommit, startX: 0, current: value });

  Object.assign(live.current, { width, min, max, step, onChange, onCommit });

  const panResponder = useMemo(() => {
    const valueAt = (x: number): number => {
      const { width: trackWidth, min: low, max: high, step: stepSize } = live.current;
      const usable = Math.max(1, trackWidth - THUMB_SIZE);
      const ratio = Math.min(1, Math.max(0, (x - THUMB_SIZE / 2) / usable));
      const stepped = low + Math.round((ratio * (high - low)) / stepSize) * stepSize;

      return Math.min(high, Math.max(low, Number(stepped.toFixed(4))));
    };

    const moveTo = (x: number) => {
      const next = valueAt(x);

      if (next !== live.current.current) {
        live.current.current = next;
        haptics.selection();
        setDragValue(next);
        live.current.onChange?.(next);
      }
    };

    const finish = () => {
      setDragValue(null);
      live.current.onCommit(live.current.current);
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > Math.abs(gesture.dy),
      // Die umgebende Scroll-Ansicht darf den Griff nicht mitten im Ziehen übernehmen.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => {
        live.current.startX = event.nativeEvent.locationX;
        setDragValue(live.current.current);
        moveTo(live.current.startX);
      },
      onPanResponderMove: (_event, gesture) => moveTo(live.current.startX + gesture.dx),
      onPanResponderRelease: finish,
      onPanResponderTerminate: finish,
    });
  }, []);

  const shown = dragValue ?? value;

  if (dragValue === null) {
    live.current.current = value;
  }

  const ratio = max > min ? (shown - min) / (max - min) : 0;
  const thumbLeft = ratio * Math.max(0, width - THUMB_SIZE);

  const nudge = (direction: 1 | -1) => {
    const next = Math.min(max, Math.max(min, Number((value + direction * step).toFixed(4))));

    if (next !== value) {
      onCommit(next);
    }
  };

  return (
    <View
      style={styles.root}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: formatValue(shown) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => nudge(event.nativeEvent.actionName === 'increment' ? 1 : -1)}
      {...panResponder.panHandlers}
    >
      {/* Kinder nehmen keine Berührung an, damit locationX immer zur Schiene gehört. */}
      <View pointerEvents="none" style={styles.track}>
        <View style={[styles.fill, { width: thumbLeft + THUMB_SIZE / 2 }]} />
      </View>
      <View
        pointerEvents="none"
        style={[styles.thumb, dragValue !== null ? styles.thumbActive : null, { left: thumbLeft }]}
      />
    </View>
  );
};

const styles = themedStyles(() => ({
  root: {
    height: 44,
    justifyContent: 'center',
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.track,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    backgroundColor: colors.textPrimary,
  },
  thumb: {
    position: 'absolute',
    top: (44 - THUMB_SIZE) / 2,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.glassLine,
    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
  },
  thumbActive: {
    transform: [{ scale: 1.12 }],
  },
}));
