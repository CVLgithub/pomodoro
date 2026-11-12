import { ReactNode } from 'react';
import type { ComponentProps } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../constants/colors';
import { themedStyles } from '../../theme/runtime';
import { Glass } from './Glass';

interface ListGroupProps {
  /** Kleine Überschrift über der Fläche. */
  title?: string;
  /** Kurze Erklärung unter der Fläche. */
  footer?: string;
  children: ReactNode;
}

/** Glasfläche für zusammengehörige Zeilen. Trennlinien setzen die Zeilen selbst. */
export const ListGroup = ({ title, footer, children }: ListGroupProps) => (
  <View style={styles.group}>
    {title ? (
      <Text style={styles.groupTitle} accessibilityRole="header">
        {title}
      </Text>
    ) : null}
    <Glass radius={26}>{children}</Glass>
    {footer ? <Text style={styles.groupFooter}>{footer}</Text> : null}
  </View>
);

interface ListRowProps {
  label: string;
  /** Zweite Zeile unter der Bezeichnung. */
  detail?: string;
  /** Aktueller Wert rechts. */
  value?: string;
  /** Farbpunkt vor der Bezeichnung, z. B. die Tag-Farbe. */
  dotColor?: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  onPress?: () => void;
  /** Zeichnet eine Trennlinie über der Zeile (für alle außer der ersten). */
  separated?: boolean;
  /** `action` hebt die Zeile als Aktion hervor, `danger` als löschende Aktion. */
  tone?: 'default' | 'action' | 'danger';
  disabled?: boolean;
  /** Eigener Inhalt rechts anstelle von Wert und Pfeil. */
  right?: ReactNode;
}

export const ListRow = ({
  label,
  detail,
  value,
  dotColor,
  icon,
  onPress,
  separated = false,
  tone = 'default',
  disabled = false,
  right,
}: ListRowProps) => {
  const content = (
    <>
      {icon ? (
        <Ionicons
          name={icon}
          size={20}
          color={tone === 'danger' ? colors.danger : colors.textPrimary}
        />
      ) : null}
      {dotColor ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
      <View style={styles.copy}>
        <Text
          style={[
            styles.label,
            tone === 'action' ? styles.labelAction : null,
            tone === 'danger' ? styles.labelDanger : null,
          ]}
        >
          {label}
        </Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
      {right ?? (
        <>
          {value ? (
            <Text style={styles.value} numberOfLines={1}>
              {value}
            </Text>
          ) : null}
          {onPress && tone === 'default' ? (
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          ) : null}
        </>
      )}
    </>
  );
  const rowStyle = [styles.row, separated ? styles.separated : null, disabled ? styles.disabled : null];

  if (!onPress) {
    return <View style={rowStyle}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [...rowStyle, pressed ? styles.pressed : null]}
    >
      {content}
    </Pressable>
  );
};

interface ToggleRowProps {
  label: string;
  detail?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  separated?: boolean;
  disabled?: boolean;
}

export const ToggleRow = ({
  label,
  detail,
  value,
  onValueChange,
  separated = false,
  disabled = false,
}: ToggleRowProps) => (
  <ListRow
    label={label}
    detail={detail}
    separated={separated}
    disabled={disabled}
    right={
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.track, true: colors.success }}
      />
    }
  />
);

const styles = themedStyles(() => ({
  group: {
    gap: 8,
  },
  groupTitle: {
    paddingHorizontal: 8,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  groupFooter: {
    paddingHorizontal: 8,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  separated: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  copy: {
    flex: 1,
    gap: 1,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 17,
  },
  labelAction: {
    fontWeight: '600',
  },
  labelDanger: {
    color: colors.danger,
    fontWeight: '600',
  },
  detail: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  value: {
    maxWidth: '55%',
    color: colors.textSecondary,
    fontSize: 16,
  },
}));
