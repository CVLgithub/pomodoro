# Pomodoro Local-First

## 1. Architekturuebersicht

- Expo Router fuer Navigation mit 5 Haupttabs und Detail-Screens.
- SQLite (`expo-sqlite`) als primaere Datenquelle fuer Tasks, Tags, Sessions, Sync-Queue und Timer-State.
- Zustand fuer modulare Stores (`tasks`, `tags`, `sessions`, `timer`, `sync`, `ui`).
- Push- und Downsync ueber `fetch`: lokale Aenderungen werden ueber die Sync-Queue an das Backend gesendet, gespeicherte Eintraege koennen ueber `/entries` zurueckgeladen werden.
- Timer mit persistiertem State, Resume-basierter Restzeitberechnung und lokaler Session-Speicherung.

## 2. Verwendete Pakete mit Installationsbefehlen

```bash
npm install
```

Falls du das Projekt lieber manuell aufsetzen willst:

```bash
npm install expo expo-router expo-sqlite expo-clipboard expo-status-bar react react-native react-native-calendars react-native-get-random-values react-native-safe-area-context react-native-screens zustand uuid @expo/vector-icons @react-native-picker/picker @react-native-community/datetimepicker
npm install -D typescript @types/react @babel/core
```

## 3. Projektstruktur

```text
app/
  _layout.tsx
  index.tsx
  (tabs)/
    _layout.tsx
    today.tsx
    timer.tsx
    calendar.tsx
    tasks.tsx
    stats.tsx
  task/
    [id].tsx
  tag/
    [id].tsx
  settings.tsx

src/
  components/
    ui/
    timer/
    tasks/
    calendar/
    stats/
    sync/
  constants/
    config.ts
    colors.ts
    spacing.ts
  db/
    client.ts
    schema.ts
    migrations.ts
    repositories/
      tasksRepository.ts
      tagsRepository.ts
      sessionsRepository.ts
      syncQueueRepository.ts
      timerStateRepository.ts
  hooks/
    useAppResume.ts
    useTodayData.ts
    useTimer.ts
  services/
    api/
      client.ts
      entriesService.ts
      pushService.ts
    sync/
      downsyncService.ts
      payloads.ts
      syncManager.ts
    timer/
      timerEngine.ts
      timerResume.ts
  store/
    sessionsStore.ts
    settingsStore.ts
    timerStore.ts
    tasksStore.ts
    tagsStore.ts
    syncStore.ts
    uiStore.ts
  theme/
    index.ts
  types/
    api.ts
    settings.ts
    session.ts
    sync.ts
    tag.ts
    task.ts
    timer.ts
  utils/
    clipboard.ts
    date.ts
    duration.ts
    uuid.ts
```

## 4. Zentrale Dateien

- `app/_layout.tsx`: App-Bootstrap, DB-Initialisierung, Store-Hydration, Resume-Refresh.
- `app/(tabs)/timer.tsx`: Timer-UI, Moduswahl, Wheel-Picker, Session-Zuordnung.
- `src/store/timerStore.ts`: Persistenter Timer-State, Resume-Abschluss, Session-Erzeugung.
- `src/services/timer/timerEngine.ts`: Reine Timer-Logik fuer Start/Pause/Resume/Reset/Complete.
- `src/services/sync/syncManager.ts`: Queue-Eintrag anlegen, Push ausfuehren, Status aktualisieren und fehlgeschlagene Eintraege erneut senden.
- `src/services/sync/downsyncService.ts`: Eintraege ueber `/entries` laden und mit der lokalen SQLite-Datenbank abgleichen.

## 5. SQLite-Schema + Migrationen

- `src/db/schema.ts` erzeugt alle Tabellen und Indizes.
- `src/db/migrations.ts` nutzt `PRAGMA user_version` fuer einfache Versionierung.
- Es werden automatisch `Allgemein` und ein initialer `timer_state` angelegt.

## 6. Repositories

- `tasksRepository.ts`: CRUD, Tagesabfragen, Delete mit Rueckgabe betroffener Sessions.
- `tagsRepository.ts`: CRUD, Schutz fuer `Allgemein`, Reassignment auf Default-Tag.
- `sessionsRepository.ts`: Session-Anlage, Neu-Zuordnung, Sync-Status.
- `syncQueueRepository.ts`: Queue-Historie und Retry-Status.
- `timerStateRepository.ts`: Singleton-Persistenz fuer Timer-Konfiguration und Laufzustand.

## 7. Zustand-Stores

- `tasksStore.ts`: lokale Task-Aktionen plus Push und Session-Nachpflege bei Deletes.
- `tagsStore.ts`: lokale Tag-Aktionen plus Reassignment-/Push-Folgen.
- `sessionsStore.ts`: Session-Historie und nachtraegliche Task-Zuordnung.
- `timerStore.ts`: Herzstueck fuer Timer-Status, Persistenz und Resume-Finalisierung.
- `syncStore.ts`: Queue-Ansicht und manuelle Retries.

## 8. Timer-Engine + Resume-Logik

- Beim Start werden `sessionStartedAt`, `startedAt` und `expectedEndAt` persistiert.
- Beim Resume prueft `reconcileWithClock`, ob die Session logisch schon abgelaufen ist.
- Fokus-Sessions werden lokal gespeichert und anschliessend gepusht.
- Nach 4 Fokus-Sessions wird eine lange Pause angeboten, aber nie automatisch gestartet.

## 9. API-Client + Push-Service + Sync-Queue

- `src/services/api/client.ts` kapselt die Backend-Anfragen per `fetch`.
- `src/services/api/entriesService.ts` laedt den Backend-Bestand ueber `GET /entries`.
- `src/services/api/pushService.ts` mappt auf `/push/task`, `/push/tag`, `/push/tag-groups`, `/push/session`.
- `src/services/sync/downsyncService.ts` verarbeitet den manuellen und automatischen Downsync.
- `src/services/sync/syncManager.ts` legt fuer jeden Push einen Queue-Eintrag an und markiert `synced` oder `failed`.
- Delete-Operationen fuer Tags und Tasks werden als Tombstone-JSON gepusht.

## 10. Screens und zentrale UI-Komponenten

- `today.tsx`: Tagesfokus, Schnellanlage, Timer-Sprung, heutige Fokuszeit.
- `timer.tsx`: Modus, Dauer, Task-/Tag-Zuordnung vor, waehrend und nach Sessions.
- `calendar.tsx`: Monatsansicht, Tagwahl, geplante Aufgaben pro Datum.
- `tasks.tsx`: offene und erledigte Aufgaben, gruppiert nach Tags.
- `stats.tsx`: Tagesgruppen abgeschlossener Fokus-Sessions plus Summenkarten.
- `settings.tsx`: Backend-Hinweis, Tag-Verwaltung, Sync-Queue mit JSON-Ansicht und Retry.
- `downsync.tsx`: Manueller Abruf und Abgleich der Eintraege vom Backend.

## 11. Startanleitung

```bash
npm install
npm run start
```

Dann in Expo fuer iOS starten, z. B. mit `i`.

Optional:

```bash
$env:EXPO_PUBLIC_BACKEND_URL='http://localhost:8000'
npm run start
```

Die Standardadresse des Frontends ist aktuell `http://localhost:3000`. Fuer das mitgelieferte
Backend auf dem Standardport muss die Backend-Adresse in den Einstellungen auf
`http://localhost:8000` gesetzt werden. Eine gesetzte `EXPO_PUBLIC_BACKEND_URL` wird als
Startwert verwendet.

## 12. Synchronisation

Lokale Aenderungen werden direkt beziehungsweise ueber die lokale Sync-Queue an das Backend
gepusht. Unterstuetzte Push-Endpunkte sind:

- `POST /push/tag`
- `POST /push/tag-groups`
- `POST /push/task`
- `POST /push/session`

Beim App-Start, beim Zurueckkehren in die App und ueber den Downsync-Screen kann der Bestand
mit `GET /entries` vom Backend geladen und lokal eingepflegt werden. Der automatische Downsync
laedt beim App-Start den gesamten Bestand und aktualisiert beim Zurueckkehren offene Tasks.
Fehlerhafte Pushes bleiben in der Queue und koennen in den Einstellungen erneut versucht werden.

## 13. Sinnvolle naechste Schritte

- Tests fuer Timer-Resume, Tag-Delete-Reassignment und Sync-Queue ergaenzen.
- Error-Handling pro Screen mit Toast oder Inline-Feedback verfeinern.
- Optional E2E-Flows fuer iPhone-Layout und Edge Cases einfuehren.
