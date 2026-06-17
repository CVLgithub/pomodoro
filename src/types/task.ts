export type TaskRecurrenceType = 'none' | 'weekly';
export type TaskWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Task {
  id: string;
  title: string;
  date: string | null;
  tagId: string;
  isCompleted: boolean;
  completedAt: string | null;
  recurrenceType: TaskRecurrenceType;
  recurrenceDays: TaskWeekday[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  date?: string | null;
  tagId?: string;
  completedAt?: string | null;
  recurrenceType?: TaskRecurrenceType;
  recurrenceDays?: TaskWeekday[];
}

export interface UpdateTaskInput {
  title?: string;
  date?: string | null;
  tagId?: string;
  isCompleted?: boolean;
  completedAt?: string | null;
  recurrenceType?: TaskRecurrenceType;
  recurrenceDays?: TaskWeekday[];
}

export interface TaskDeletePayload {
  id: string;
  deletedAt: string;
  isDeleted: true;
}

export interface TaskOccurrenceCompletion {
  taskId: string;
  date: string;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResolvedTaskOccurrence {
  key: string;
  task: Task;
  occurrenceDate: string;
  isCompleted: boolean;
  completedAt: string | null;
}
