import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { getLocalDataSummary } from '../../db/repositories/localDataRepository';
import { syncAndReload } from '../../services/sync/fullSync';
import { validateAndNormalizeUserId, requiresNewIdentityWarning } from '../../services/settings/userIdentity';
import { createUuid } from '../../utils/uuid';
import { useSettingsStore } from '../../store/settingsStore';
import { Button } from '../ui/Button';
import { Segmented } from '../ui/Segmented';
import { TextField } from '../ui/TextField';
import { themedStyles } from '../../theme/runtime';

export const UserIdOnboarding = ({ onComplete }: { onComplete: () => Promise<void> }) => {
  const saveUserId = useSettingsStore((state) => state.saveUserId);
  const [value, setValue] = useState('');
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const finish = async (userId: string): Promise<void> => {
    setIsSaving(true);
    setError(null);
    try {
      await saveUserId(userId);
      // Die userId bleibt gespeichert, auch wenn der erste Abgleich offline scheitert.
      await syncAndReload();
      await onComplete();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'userId konnte nicht gespeichert werden.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    if (mode === 'existing') {
      try {
        await finish(validateAndNormalizeUserId(value));
      } catch (validationError) {
        setError(validationError instanceof Error ? validationError.message : 'Ungültige UUID.');
      }
      return;
    }

    const summary = await getLocalDataSummary();
    const newId = createUuid();
    if (requiresNewIdentityWarning(summary.dataCount, summary.queueCount)) {
      Alert.alert(
        'Neue Identität verwenden?',
        'Alle lokalen Daten würden unter einer neuen Identität hochgeladen.',
        [
          { text: 'Abbrechen', style: 'cancel' },
          { text: 'Fortfahren', style: 'destructive', onPress: () => void finish(newId) },
        ],
      );
      return;
    }
    await finish(newId);
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.card} accessibilityViewIsModal>
        <Text style={styles.title} accessibilityRole="header">
          Sync einrichten
        </Text>
        <Text style={styles.description}>
          Geräte mit derselben userId teilen sich einen Datenbestand. Ohne userId bleibt die App
          lokal nutzbar; du kannst sie später in den Einstellungen unter „Verbindung“ eintragen.
        </Text>
        <Segmented label="Art der userId" options={MODE_OPTIONS} value={mode} onChange={setMode} />
        {mode === 'existing' ? (
          <TextField
            label="userId"
            value={value}
            onChangeText={(text) => {
              setValue(text);
              setError(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />
        ) : (
          <Text style={styles.description}>
            Für dieses Gerät wird eine neue userId erzeugt. Du findest sie danach in den
            Einstellungen und kannst sie auf weiteren Geräten eintragen.
          </Text>
        )}
        {error ? (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Button
            label={isSaving ? 'Wird eingerichtet …' : 'Einrichten und synchronisieren'}
            onPress={() => void handleSave()}
            disabled={isSaving || (mode === 'existing' && !value.trim())}
          />
          <Button label="Später" variant="secondary" onPress={() => void onComplete()} disabled={isSaving} />
        </View>
      </View>
    </View>
  );
};

const MODE_OPTIONS = [
  { value: 'existing', label: 'Vorhandene ID' },
  { value: 'new', label: 'Neue ID' },
] as const;

const styles = themedStyles(() => ({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: colors.overlay,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    gap: 14,
    padding: 22,
    borderRadius: 34,
    backgroundColor: colors.sheet,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
  },
  actions: {
    gap: 10,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
}));
