import { ReactNode } from 'react';
import type { ComponentProps } from 'react';
import { Platform, View } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

import { getPalette } from '../../theme/runtime';

/** Natives Liquid Glass gibt es nur ab iOS 26; überall sonst greift die Ersatzdarstellung. */
export const hasNativeGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();

interface GlassProps extends Omit<ComponentProps<typeof View>, 'style' | 'children'> {
  children?: ReactNode;
  style?: ComponentProps<typeof View>['style'];
  radius?: number;
  /** Reagiert auf Berührung (für Tasten). Nur mit nativem Glas wirksam. */
  interactive?: boolean;
  /** Färbt die Fläche ein, z. B. für die Haupttaste. */
  tint?: string;
}

const webBlur =
  Platform.OS === 'web'
    ? ({
        backdropFilter: 'blur(28px) saturate(160%)',
        WebkitBackdropFilter: 'blur(28px) saturate(160%)',
      } as object)
    : null;

export const Glass = ({
  children,
  style,
  radius = 26,
  interactive = false,
  tint,
  ...viewProps
}: GlassProps) => {
  const palette = getPalette();

  if (hasNativeGlass) {
    return (
      <GlassView
        {...viewProps}
        glassEffectStyle="regular"
        colorScheme={palette.scheme}
        isInteractive={interactive}
        tintColor={tint}
        style={[{ borderRadius: radius, overflow: 'hidden' }, style]}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <View
      {...viewProps}
      style={[
        {
          borderRadius: radius,
          borderWidth: 1,
          borderColor: palette.line,
          backgroundColor: tint ?? palette.glass,
          boxShadow: palette.scheme === 'light' ? '0 4px 18px rgba(20,25,40,0.10)' : undefined,
        },
        webBlur,
        style,
      ]}
    >
      {children}
    </View>
  );
};
