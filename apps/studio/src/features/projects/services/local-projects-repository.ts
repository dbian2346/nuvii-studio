import type { EditorProject } from "@/features/editor/domain/types";
import {
  PROJECT_STORAGE_KEY,
  parseStoredProject,
  writeStoredProject,
} from "@/features/editor/services/project-storage";
import type {
  ProjectRecord,
  ProjectsRepository,
} from "../domain/types";

export const PROJECT_LIBRARY_STORAGE_KEY = "nuvii-studio-project-library";

export class ProjectLibraryStorageError extends Error {
  constructor() {
    super("The saved project library is malformed or uses an unsupported schema.");
    this.name = "ProjectLibraryStorageError";
  }
}

interface StoredProjectLibrary {
  schemaVersion: 1;
  activeProjectId: string | null;
  projects: ProjectRecord[];
}

interface RepositoryOptions {
  createId?: () => string;
  now?: () => Date;
}

const EMPTY_LIBRARY: StoredProjectLibrary = {
  schemaVersion: 1,
  activeProjectId: null,
  projects: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validDate(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  return Number.isNaN(Date.parse(value)) ? fallback : value;
}

function parseProjectRecord(value: unknown, fallbackDate: string): ProjectRecord | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  const project = parseStoredProject(JSON.stringify(value.project));
  if (!project) return null;
  const createdAt = validDate(value.createdAt, fallbackDate);
  return {
    id: value.id,
    createdAt,
    modifiedAt: validDate(value.modifiedAt, createdAt),
    project,
  };
}

function parseLibrary(raw: string, fallbackDate: string): StoredProjectLibrary | null {
  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (
    !isRecord(value)
    || value.schemaVersion !== 1
    || !Array.isArray(value.projects)
  ) return null;
  const parsedProjects = value.projects.map((record) =>
    parseProjectRecord(record, fallbackDate),
  );
  if (parsedProjects.some((record) => record === null)) return null;
  const projects = parsedProjects.filter(
    (record): record is ProjectRecord => record !== null,
  );
  const activeProjectId =
    typeof value.activeProjectId === "string" &&
    projects.some((record) => record.id === value.activeProjectId)
      ? value.activeProjectId
      : null;
  return { schemaVersion: 1, activeProjectId, projects };
}

function legacySavedAt(raw: string, fallback: string): string {
  try {
    const value = JSON.parse(raw) as unknown;
    return isRecord(value) ? validDate(value.savedAt, fallback) : fallback;
  } catch {
    return fallback;
  }
}

function nextCopyName(records: readonly ProjectRecord[], sourceName: string): string {
  const names = new Set(records.map((record) => record.project.name.toLocaleLowerCase()));
  const base = `${sourceName} Copy`;
  if (!names.has(base.toLocaleLowerCase())) return base;
  let suffix = 2;
  while (names.has(`${base} ${suffix}`.toLocaleLowerCase())) suffix += 1;
  return `${base} ${suffix}`;
}

export class LocalProjectsRepository implements ProjectsRepository {
  private readonly createId: () => string;
  private readonly now: () => Date;

  constructor(
    private readonly storage: Storage,
    options: RepositoryOptions = {},
  ) {
    this.createId = options.createId ?? (() => crypto.randomUUID());
    this.now = options.now ?? (() => new Date());
  }

  private timestamp(): string {
    return this.now().toISOString();
  }

  private read(): StoredProjectLibrary {
    const now = this.timestamp();
    const raw = this.storage.getItem(PROJECT_LIBRARY_STORAGE_KEY);
    if (raw) {
      const library = parseLibrary(raw, now);
      if (!library) throw new ProjectLibraryStorageError();
      return library;
    }

    const legacyRaw = this.storage.getItem(PROJECT_STORAGE_KEY);
    const legacyProject = legacyRaw ? parseStoredProject(legacyRaw) : null;
    if (!legacyRaw || !legacyProject) {
      this.write(EMPTY_LIBRARY);
      return EMPTY_LIBRARY;
    }

    const modifiedAt = legacySavedAt(legacyRaw, now);
    const migrated: ProjectRecord = {
      id: this.createId(),
      createdAt: modifiedAt,
      modifiedAt,
      project: legacyProject,
    };
    const library = {
      schemaVersion: 1 as const,
      activeProjectId: migrated.id,
      projects: [migrated],
    };
    this.write(library);
    return library;
  }

  private write(library: StoredProjectLibrary): void {
    this.storage.setItem(PROJECT_LIBRARY_STORAGE_KEY, JSON.stringify(library));
  }

  list(): ProjectRecord[] {
    return this.read().projects.toSorted((a, b) =>
      b.modifiedAt.localeCompare(a.modifiedAt),
    );
  }

  ensureActive(projectFactory: () => EditorProject): ProjectRecord {
    const library = this.read();
    const active = library.projects.find(
      (record) => record.id === library.activeProjectId,
    );
    if (active) return active;
    return this.create(projectFactory());
  }

  create(project: EditorProject): ProjectRecord {
    const library = this.read();
    const timestamp = this.timestamp();
    const record: ProjectRecord = {
      id: this.createId(),
      createdAt: timestamp,
      modifiedAt: timestamp,
      project,
    };
    this.write({
      schemaVersion: 1,
      activeProjectId: record.id,
      projects: [record, ...library.projects],
    });
    writeStoredProject(this.storage, project);
    return record;
  }

  open(projectId: string): ProjectRecord | null {
    const library = this.read();
    const record = library.projects.find((candidate) => candidate.id === projectId);
    if (!record) return null;
    this.write({ ...library, activeProjectId: projectId });
    writeStoredProject(this.storage, record.project);
    return record;
  }

  saveActive(project: EditorProject): ProjectRecord {
    const library = this.read();
    const activeIndex = library.projects.findIndex(
      (record) => record.id === library.activeProjectId,
    );
    if (activeIndex < 0) return this.create(project);
    const active = library.projects[activeIndex];
    const record: ProjectRecord = {
      ...active,
      modifiedAt: this.timestamp(),
      project,
    };
    const projects = library.projects.with(activeIndex, record);
    this.write({ ...library, projects });
    writeStoredProject(this.storage, project);
    return record;
  }

  rename(projectId: string, name: string): ProjectRecord | null {
    const cleanName = name.trim();
    if (!cleanName) return null;
    const library = this.read();
    const index = library.projects.findIndex((record) => record.id === projectId);
    if (index < 0) return null;
    const current = library.projects[index];
    const record: ProjectRecord = {
      ...current,
      modifiedAt: this.timestamp(),
      project: { ...current.project, name: cleanName },
    };
    this.write({ ...library, projects: library.projects.with(index, record) });
    if (library.activeProjectId === projectId) {
      writeStoredProject(this.storage, record.project);
    }
    return record;
  }

  duplicate(projectId: string): ProjectRecord | null {
    const library = this.read();
    const source = library.projects.find((record) => record.id === projectId);
    if (!source) return null;
    const timestamp = this.timestamp();
    const record: ProjectRecord = {
      id: this.createId(),
      createdAt: timestamp,
      modifiedAt: timestamp,
      project: {
        ...structuredClone(source.project),
        name: nextCopyName(library.projects, source.project.name),
      },
    };
    this.write({ ...library, projects: [record, ...library.projects] });
    return record;
  }

  delete(projectId: string): void {
    const library = this.read();
    const projects = library.projects.filter((record) => record.id !== projectId);
    const activeProjectId =
      library.activeProjectId === projectId
        ? (projects[0]?.id ?? null)
        : library.activeProjectId;
    this.write({ ...library, activeProjectId, projects });
    const nextActive = projects.find((record) => record.id === activeProjectId);
    if (nextActive) writeStoredProject(this.storage, nextActive.project);
  }
}

export function createProjectsRepository(storage: Storage): ProjectsRepository {
  return new LocalProjectsRepository(storage);
}
