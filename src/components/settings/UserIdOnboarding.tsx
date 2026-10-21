import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { getLocalDataSummary } from '../../db/repositories/localDataRepository';
import { downsyncEntries } from '../../services/sync/downsyncService';
import { validateAndNormalizeUserId, requiresNewIdentityWarning } from '../../services/settings/userIdentity';
import { createUuid } from '../../utils/uuid';
import { useSettingsStore } from '../../store/settingsStore';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';

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
      try {
        await downsyncEntries();
      } catch {
        // The identity is saved even when the first sync is offline.
      }
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
      <View style={styles.card}>
        <Text style={styles.title}>Sync einrichten</Text>
        <Text style={styles.description}>
          Ohne userId bleibt die App lokal nutzbar. Der Sync ist dann noch nicht aktiv.
        </Text>
        <View style={styles.modeRow}>
          <Button
            label="Bestehende ID eintragen"
            variant={mode === 'existing' ? 'primary' : 'secondary'}
            onPress={() => setMode('existing')}
          />
          <Button
            label="Neue ID erzeugen"
            variant={mode === 'new' ? 'primary' : 'secondary'}
            onPress={() => setMode('new')}
          />
        </View>
        {mode === 'existing' ? (
          <TextField
            label="userId"
            value={value}
            onChangeText={setValue}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />
        ) : (
          <Text style={styles.description}>Eine neue UUID wird für dieses Gerät erzeugt.</Text>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}>
          <Button label="Speichern und synchronisieren" onPress={() => void handleSave()} disabled={isSaving} />
          <Button label="Später" variant="ghost" onPress={onComplete} disabled={isSaving} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.overlay,
  },
  card: {
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: '700' },
  description: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  modeRow: { gap: spacing.sm },
  actions: { gap: spacing.sm },
  error: { color: colors.danger, fontSize: 14 },
});
