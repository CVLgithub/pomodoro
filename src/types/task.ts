export interface Task {
  id: string;
  title: string;
  date: string | null;
  tagId: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  date?: string | null;
  tagId?: string;
}

export interface UpdateTaskInput {
  title?: string;
  date?: string | null;
  tagId?: string;
  isCompleted?: boolean;
}

export interface TaskDeletePayload {
  id: string;
  deletedAt: string;
  isDeleted: true;
}

