export interface Tag {
  id: string;
  name: string;
  color: string;
  groupName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagInput {
  name: string;
  color: string;
  groupName?: string | null;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
  groupName?: string | null;
}

export interface TagDeletePayload {
  id: string;
  deletedAt: string;
  isDeleted: true;
}
