import {
  DEFAULT_TIMER_DURATIONS,
  DEFAULT_BACKEND_URL,
  DEFAULT_AUTO_SWITCH_TO_BREAKS,
  GENERAL_TAG_ID,
  GENERAL_TAG_NAME,
  GENERAL_TAG_GROUP_ID,
  GENERAL_TAG_GROUP_NAME,
} from '../constants/config';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../constants/notifications';
import { toLocalIsoString } from '../utils/date';

export const buildSchemaStatements = (): string[] => {
  const now = toLocalIsoString();

  return [
    `
      CREATE TABLE IF NOT EXISTS tag_groups (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        isDeleted INTEGER NOT NULL DEFAULT 0,
        deletedAt TEXT
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL COLLATE NOCASE UNIQUE,
        color TEXT NOT NULL,
        groupId TEXT,
        groupName TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        isDeleted INTEGER NOT NULL DEFAULT 0,
        deletedAt TEXT
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        date TEXT,
        tagId TEXT NOT NULL,
        isCompleted INTEGER NOT NULL DEFAULT 0,
        completedAt TEXT,
        recurrenceType TEXT NOT NULL DEFAULT 'none',
        recurrenceDays TEXT NOT NULL DEFAULT '[]',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        isDeleted INTEGER NOT NULL DEFAULT 0,
        deletedAt TEXT,
        FOREIGN KEY (tagId) REFERENCES tags (id) ON DELETE RESTRICT
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS task_occurrence_completions (
        taskId TEXT NOT NULL,
        date TEXT NOT NULL,
        completedAt TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        PRIMARY KEY (taskId, date),
        FOREIGN KEY (taskId) REFERENCES tasks (id) ON DELETE CASCADE
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        startTime TEXT NOT NULL,
        endTime TEXT NOT NULL,
        durationMinutes INTEGER NOT NULL,
        taskId TEXT,
        tagId TEXT NOT NULL,
        syncStatus TEXT NOT NULL DEFAULT 'pending',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        isDeleted INTEGER NOT NULL DEFAULT 0,
        deletedAt TEXT,
        FOREIGN KEY (taskId) REFERENCES tasks (id) ON DELETE SET NULL,
        FOREIGN KEY (tagId) REFERENCES tags (id) ON DELETE RESTRICT
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY NOT NULL,
        entityType TEXT NOT NULL,
        entityId TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        method TEXT NOT NULL,
        payloadJson TEXT NOT NULL,
        status TEXT NOT NULL,
        errorMessage TEXT,
        retryCount INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS timer_state (
        id TEXT PRIMARY KEY NOT NULL,
        activeMode TEXT NOT NULL,
        status TEXT NOT NULL,
        sessionStartedAt TEXT,
        startedAt TEXT,
        expectedEndAt TEXT,
        pausedRemainingSeconds INTEGER,
        selectedTaskId TEXT,
        selectedTagId TEXT NOT NULL,
        completedFocusCountInCycle INTEGER NOT NULL DEFAULT 0,
        focusMinutes INTEGER NOT NULL,
        shortBreakMinutes INTEGER NOT NULL,
        longBreakMinutes INTEGER NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (selectedTaskId) REFERENCES tasks (id) ON DELETE SET NULL,
        FOREIGN KEY (selectedTagId) REFERENCES tags (id) ON DELETE RESTRICT
      );
    `,
    'CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks (date);',
    'CREATE INDEX IF NOT EXISTS idx_tasks_tag_id ON tasks (tagId);',
    'CREATE INDEX IF NOT EXISTS idx_tasks_is_completed ON tasks (isCompleted);',
    'CREATE INDEX IF NOT EXISTS idx_tags_is_deleted ON tags (isDeleted);',
    'CREATE INDEX IF NOT EXISTS idx_tasks_is_deleted ON tasks (isDeleted);',
    'CREATE INDEX IF NOT EXISTS idx_sessions_is_deleted ON sessions (isDeleted);',
    'CREATE INDEX IF NOT EXISTS idx_tag_groups_is_deleted ON tag_groups (isDeleted);',
    'CREATE INDEX IF NOT EXISTS idx_task_occurrence_completions_date ON task_occurrence_completions (date);',
    'CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions (date DESC);',
    'CREATE INDEX IF NOT EXISTS idx_sessions_sync_status ON sessions (syncStatus);',
    'CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue (status, updatedAt DESC);',
    `
      INSERT OR IGNORE INTO app_settings (key, value, updatedAt)
      VALUES ('backendUrl', '${DEFAULT_BACKEND_URL}', '${now}');
    `,
    `
      INSERT OR IGNORE INTO app_settings (key, value, updatedAt)
      VALUES ('notifyOnFocusEnd', '${String(DEFAULT_NOTIFICATION_PREFERENCES.notifyOnFocusEnd)}', '${now}');
    `,
    `
      INSERT OR IGNORE INTO app_settings (key, value, updatedAt)
      VALUES ('notifyOnBreakEnd', '${String(DEFAULT_NOTIFICATION_PREFERENCES.notifyOnBreakEnd)}', '${now}');
    `,
    `
      INSERT OR IGNORE INTO app_settings (key, value, updatedAt)
      VALUES ('dailyFocusGoalHours', 'off', '${now}');
    `,
    `
      INSERT OR IGNORE INTO app_settings (key, value, updatedAt)
      VALUES ('autoSwitchToBreaks', '${String(DEFAULT_AUTO_SWITCH_TO_BREAKS)}', '${now}');
    `,
    `
      INSERT OR IGNORE INTO tags (id, name, color, groupId, groupName, createdAt, updatedAt, isDeleted, deletedAt)
      VALUES ('${GENERAL_TAG_ID}', '${GENERAL_TAG_NAME}', '#5EA2FF', '${GENERAL_TAG_GROUP_ID}', NULL, '${now}', '${now}', 0, NULL);
    `,
    `
      INSERT OR IGNORE INTO tag_groups (id, name, createdAt, updatedAt)
      VALUES ('${GENERAL_TAG_GROUP_ID}', '${GENERAL_TAG_GROUP_NAME}', '${now}', '${now}');
    `,
    `
      INSERT OR IGNORE INTO timer_state (
        id,
        activeMode,
        status,
        sessionStartedAt,
        startedAt,
        expectedEndAt,
        pausedRemainingSeconds,
        selectedTaskId,
        selectedTagId,
        completedFocusCountInCycle,
        focusMinutes,
        shortBreakMinutes,
        longBreakMinutes,
        updatedAt
      )
      VALUES (
        'default',
        'focus',
        'idle',
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        '${GENERAL_TAG_ID}',
        0,
        ${DEFAULT_TIMER_DURATIONS.focusMinutes},
        ${DEFAULT_TIMER_DURATIONS.shortBreakMinutes},
        ${DEFAULT_TIMER_DURATIONS.longBreakMinutes},
        '${now}'
      );
    `,
    `
      INSERT OR IGNORE INTO app_settings (key, value, updatedAt)
      VALUES ('userId', '', '${now}');
    `,
  ];
};
