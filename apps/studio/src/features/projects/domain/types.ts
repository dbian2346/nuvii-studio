import type { EditorProject } from "@/features/editor/domain/types";

export interface ProjectRecord {
  id: string;
  createdAt: string;
  modifiedAt: string;
  project: EditorProject;
}

export type ProjectSort = "modified" | "name";

export interface ProjectsRepository {
  create(project: EditorProject): ProjectRecord;
  delete(projectId: string): void;
  duplicate(projectId: string): ProjectRecord | null;
  ensureActive(projectFactory: () => EditorProject): ProjectRecord;
  list(): ProjectRecord[];
  open(projectId: string): ProjectRecord | null;
  rename(projectId: string, name: string): ProjectRecord | null;
  saveActive(project: EditorProject): ProjectRecord;
}
