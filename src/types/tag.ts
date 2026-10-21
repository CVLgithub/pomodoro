export interface Tag {
  id: string;
  name: string;
  color: string;
  groupId: string | null;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  deletedAt: string | null;
}

export interface CreateTagInput {
  name: string;
  color: string;
  groupId?: string | null;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
  groupId?: string | null;
}

export interface TagDeletePayload {
  id: string;
  updatedAt: string;
  deletedAt: string;
  isDeleted: true;
}
