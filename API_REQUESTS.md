# API-Anfragen & Sync-Payloads (Aktueller Stand)

Diese Datei dokumentiert alle HTTP-Anfragen, die die App aktuell an das Backend sendet bzw. vom Backend erwartet.

## Relevante Quelldateien

- HTTP-Client (`POST`): `src/services/api/client.ts`
- Push-Endpunkte: `src/services/api/pushService.ts`
- Downsync-Abruf (`GET /entries`): `src/services/api/entriesService.ts`
- Payload-Normalisierung & Sync-Queue: `src/services/sync/syncManager.ts`
- Payload-Builder: `src/services/sync/payloads.ts`
- Downsync-Verarbeitung: `src/services/sync/downsyncService.ts`
- TypeScript-Typen: `src/types/api.ts`

---

## 1. Allgemeines & Header

Alle Anfragen gehen an `<backendUrl><endpoint>` (konfiguriert im `settingsStore`).

### Header bei `POST`-Anfragen (`src/services/api/client.ts`)
```http
POST <backendUrl><endpoint> HTTP/1.1
Content-Type: application/json
X-User-Id: <userId>
```

### Header bei `GET /entries` (`src/services/api/entriesService.ts`)
```http
GET <backendUrl>/entries HTTP/1.1
X-User-Id: <userId>
```

---

## 2. Push-Endpunkte (`POST`)

### 2.1 Tag erstellen / aktualisieren / abschließen: `POST /push/tag`

Typ: `PushTagPayload` (`src/types/api.ts`)

```json
{
  "id": "8f14e45f-ceea-467a-a839-000000000001",
  "name": "Mathe",
  "color": "#4F46E5",
  "groupId": "2c918082-0000-4000-8000-000000000001",
  "isCompleted": true,
  "completedAt": "2026-11-15T18:30:00.000",
  "createdAt": "2026-11-10T09:00:00.000",
  "updatedAt": "2026-11-15T18:30:00.000",
  "isDeleted": false,
  "deletedAt": null
}
```

> **Neu durch Tag-Rework:** `isCompleted: boolean` und `completedAt: string | null`.

#### Tag löschen (Tombstone an `POST /push/tag`)
Typ: `TagDeletePayload` (`src/services/sync/payloads.ts`)

```json
{
  "id": "8f14e45f-ceea-467a-a839-000000000001",
  "deletedAt": "2026-11-15T18:30:00.000",
  "updatedAt": "2026-11-15T18:30:00.000",
  "isDeleted": true
}
```

---

### 2.2 Tag-Gruppe erstellen / aktualisieren / abschließen / löschen: `POST /push/tag-group`

Typ: `PushTagGroupPayload` (`src/types/api.ts`)

```json
{
  "id": "2c918082-0000-4000-8000-000000000001",
  "name": "Studium",
  "isCompleted": true,
  "completedAt": "2026-11-15T18:30:00.000",
  "createdAt": "2026-11-10T09:00:00.000",
  "updatedAt": "2026-11-15T18:30:00.000",
  "isDeleted": false,
  "deletedAt": null
}
```

> **Neu durch Tag-Rework:** `isCompleted: boolean` und `completedAt: string | null`.
> Wenn eine gesamte Gruppe in der App abgeschlossen oder wieder geöffnet wird, sendet die App:
> 1. `POST /push/tag-group` für die Gruppe selbst
> 2. `POST /push/tag` für jedes nicht gelöschte Tag innerhalb dieser Gruppe

---

### 2.3 Aufgabe erstellen / aktualisieren: `POST /push/task`

Typ: `PushTaskPayload` (`src/types/api.ts`)

```json
{
  "id": "4a8b9c10-1234-4567-89ab-000000000001",
  "title": "Übungsblatt 4",
  "date": "2026-11-15",
  "tagId": "8f14e45f-ceea-467a-a839-000000000001",
  "isCompleted": false,
  "recurrenceType": "weekly",
  "recurrenceDays": [1, 3, 5],
  "createdAt": "2026-11-10T09:00:00.000",
  "updatedAt": "2026-11-15T18:30:00.000",
  "isDeleted": false,
  "deletedAt": null
}
```

#### Aufgabe löschen (Tombstone an `POST /push/task`)
Typ: `TaskDeletePayload` (`src/services/sync/payloads.ts`)

```json
{
  "id": "4a8b9c10-1234-4567-89ab-000000000001",
  "deletedAt": "2026-11-15T18:30:00.000",
  "updatedAt": "2026-11-15T18:30:00.000",
  "isDeleted": true
}
```

---

### 2.4 Fokus-Session erstellen / aktualisieren / löschen: `POST /push/session`

Typ: `PushSessionPayload` (`src/types/api.ts`)

```json
{
  "id": "9d3e1122-5555-4444-8888-000000000001",
  "title": "Freie Fokus-Session",
  "date": "2026-11-15",
  "startTime": "2026-11-15T18:00:00.000",
  "endTime": "2026-11-15T18:25:00.000",
  "durationMinutes": 25,
  "taskId": null,
  "tagId": "8f14e45f-ceea-467a-a839-000000000001",
  "createdAt": "2026-11-15T18:25:00.000",
  "updatedAt": "2026-11-15T18:25:00.000",
  "isDeleted": false,
  "deletedAt": null
}
```

---

## 3. Downsync-Endpunkt (`GET /entries`)

Beim Abruf über `GET /entries` erwartet die App folgendes JSON-Format (`EntriesResponse` in `src/types/api.ts`):

```json
{
  "tagGroups": [
    {
      "id": "2c918082-0000-4000-8000-000000000001",
      "name": "Studium",
      "isCompleted": false,
      "completedAt": null,
      "createdAt": "2026-11-10T09:00:00.000",
      "updatedAt": "2026-11-15T18:30:00.000",
      "isDeleted": false,
      "deletedAt": null
    }
  ],
  "tags": [
    {
      "id": "8f14e45f-ceea-467a-a839-000000000001",
      "name": "Mathe",
      "color": "#4F46E5",
      "groupId": "2c918082-0000-4000-8000-000000000001",
      "isCompleted": false,
      "completedAt": null,
      "createdAt": "2026-11-10T09:00:00.000",
      "updatedAt": "2026-11-15T18:30:00.000",
      "isDeleted": false,
      "deletedAt": null
    }
  ],
  "tasks": [
    {
      "id": "4a8b9c10-1234-4567-89ab-000000000001",
      "title": "Übungsblatt 4",
      "date": "2026-11-15",
      "tagId": "8f14e45f-ceea-467a-a839-000000000001",
      "isCompleted": false,
      "recurrenceType": "none",
      "recurrenceDays": [],
      "createdAt": "2026-11-10T09:00:00.000",
      "updatedAt": "2026-11-15T18:30:00.000",
      "isDeleted": false,
      "deletedAt": null
    }
  ],
  "sessions": [
    {
      "id": "9d3e1122-5555-4444-8888-000000000001",
      "title": "Freie Fokus-Session",
      "date": "2026-11-15",
      "startTime": "2026-11-15T18:00:00.000",
      "endTime": "2026-11-15T18:25:00.000",
      "durationMinutes": 25,
      "taskId": null,
      "tagId": "8f14e45f-ceea-467a-a839-000000000001",
      "createdAt": "2026-11-15T18:25:00.000",
      "updatedAt": "2026-11-15T18:25:00.000",
      "isDeleted": false,
      "deletedAt": null
    }
  ]
}
```

> **Abwärtskompatibilität beim Downsync:** Falls das Backend `isCompleted` oder `completedAt` bei `tags` oder `tagGroups` (noch) weglässt, behandelt `normalizeEntries` in `src/services/sync/downsyncService.ts` fehlende Werte automatisch als `isCompleted: false` und `completedAt: null`.
