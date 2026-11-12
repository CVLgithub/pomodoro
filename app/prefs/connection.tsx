import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../src/components/ui/Button';
import { Screen } from '../../src/components/ui/Screen';
import { SectionCard } from '../../src/components/ui/SectionCard';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { TextField } from '../../src/components/ui/TextField';
import { colors } from '../../src/constants/colors';
import { DEFAULT_BACKEND_URL } from '../../src/constants/config';
import { clearLocalDataAndQueue } from '../../src/db/repositories/localDataRepository';
import { validateAndNormalizeUserId } from '../../src/services/settings/userIdentity';
import { syncAndReload } from '../../src/services/sync/fullSync';
import { useSettingsStore } from '../../src/store/settingsStore';
import { themedStyles } from '../../src/theme/runtime';
import { copyToClipboard } from '../../src/utils/clipboard';
import { confirmAction } from '../../src/utils/confirm';

const normalizeUrl = (value: string): string => value.trim().replace(/\/+$/, '');

export default function ConnectionScreen() {
  const router = useRouter();
  const userId = useSettingsStore((state) => state.userId);
  const isDevUserId = useSettingsStore((state) => state.isDevUserId);
  const backendUrl = useSettingsStore((state) => state.backendUrl);
  const saveUserId = useSettingsStore((state) => state.saveUserId);
  const saveBackendUrl = useSettingsStore((state) => state.saveBackendUrl);
  const [urlInput, setUrlInput] = useState(backendUrl);
  const [userIdInput, setUserIdInput] = useState('');
  const [isEditingUserId, setIsEditingUserId] = useState(false);
  const [userIdError, setUserIdError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    setUrlInput(backendUrl);
  }, [backendUrl]);

  const urlChanged = normalizeUrl(urlInput) !== normalizeUrl(backendUrl);

  const saveUrl = async () => {
    setIsBusy(true);
    try {
      await saveBackendUrl(urlInput);
    } catch (error) {
      Alert.alert(
        'Adresse konnte nicht gespeichert werden',
        error instanceof Error ? error.message : 'Unbekannter Fehler',
      );
    } finally {
      setIsBusy(false);
    }
  };

  const changeUserId = async () => {
    let normalized: string;
    try {
      normalized = validateAndNormalizeUserId(userIdInput);
    } catch (error) {
      setUserIdError(error instanceof Error ? error.message : 'Ungültige UUID.');
      return;
    }

    // Ohne bisherige Identität gibt es keine fremden Daten, die verworfen würden.
    const confirmed =
      !userId ||
      (await confirmAction({
        title: 'userId ändern?',
        message:
          'Alle lokalen Daten und noch nicht gesendeten Änderungen werden verworfen. Danach wird der Bestand der neuen userId geladen.',
        confirmLabel: 'Ändern',
      }));

    if (!confirmed) {
      return;
    }

    setIsBusy(true);
    try {
      if (userId) {
        await clearLocalDataAndQueue();
      }
      await saveUserId(normalized);
      await syncAndReload();
      setIsEditingUserId(false);
      setUserIdInput('');
    } catch (error) {
      Alert.alert(
        'userId konnte nicht geändert werden',
        error instanceof Error ? error.message : 'Unbekannter Fehler',
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Screen title="Verbindung" onBack={() => router.back()}>
      <SectionCard>
        <SectionHeader
          title="userId"
          subtitle="Geräte mit derselben userId teilen sich einen Datenbestand."
        />
        {userId ? (
          <Text style={styles.value} selectable>
            {userId}
          </Text>
        ) : (
          <Text style={styles.warning}>
            Noch keine userId. Die App funktioniert lokal, synchronisiert aber nicht.
          </Text>
        )}
        {isDevUserId ? <Text style={styles.warning}>Diese userId stammt aus der Dev-Variable.</Text> : null}

        {isEditingUserId ? (
          <>
            <TextField
              label={userId ? 'Neue userId' : 'userId'}
              value={userIdInput}
              onChangeText={(value) => {
                setUserIdInput(value);
                setUserIdError(null);
              }}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {userIdError ? (
              <Text style={styles.error} accessibilityRole="alert">
                {userIdError}
              </Text>
            ) : null}
            <View style={styles.actions}>
              <View style={styles.action}>
                <Button
                  label="Abbrechen"
                  variant="secondary"
                  onPress={() => setIsEditingUserId(false)}
                  disabled={isBusy}
                />
              </View>
              <View style={styles.action}>
                <Button
                  label="Übernehmen"
                  onPress={() => void changeUserId()}
                  disabled={!userIdInput.trim() || isBusy}
                />
              </View>
            </View>
          </>
        ) : (
          <View style={styles.actions}>
            {userId ? (
              <View style={styles.action}>
                <Button
                  label="Kopieren"
                  variant="secondary"
                  onPress={() => void copyToClipboard(userId)}
                />
              </View>
            ) : null}
            <View style={styles.action}>
              <Button
                label={userId ? 'Ändern' : 'Eintragen'}
                variant="secondary"
                onPress={() => setIsEditingUserId(true)}
              />
            </View>
          </View>
        )}
      </SectionCard>

      <SectionCard>
        <SectionHeader title="Server" subtitle="Adresse, mit der die App synchronisiert." />
        <TextField
          label="Adresse"
          value={urlInput}
          onChangeText={setUrlInput}
          placeholder="https://example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <View style={styles.actions}>
          <View style={styles.action}>
            <Button
              label="Standard"
              variant="secondary"
              onPress={() => setUrlInput(DEFAULT_BACKEND_URL)}
              disabled={isBusy || normalizeUrl(urlInput) === normalizeUrl(DEFAULT_BACKEND_URL)}
            />
          </View>
          <View style={styles.action}>
            <Button label="Sichern" onPress={() => void saveUrl()} disabled={!urlChanged || isBusy} />
          </View>
        </View>
      </SectionCard>
    </Screen>
  );
}

const styles = themedStyles(() => ({
  value: {
    color: colors.textPrimary,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  warning: {
    color: colors.warning,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  action: {
    flex: 1,
  },
}));
