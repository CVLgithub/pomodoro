export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagInput {
  name: string;
  color: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
}

export interface TagDeletePayload {
  id: string;
  deletedAt: string;
  isDeleted: true;
}

