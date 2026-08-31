import assert from "node:assert/strict";
import test from "node:test";
import { createInitialProject } from "../src/features/editor/domain/editor-data";
import { writeStoredProject } from "../src/features/editor/services/project-storage";
import {
  LocalProjectsRepository,
  ProjectLibraryStorageError,
  PROJECT_LIBRARY_STORAGE_KEY,
} from "../src/features/projects/services/local-projects-repository";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

let id = 0;
let minute = 0;

function repository(storage: Storage) {
  return new LocalProjectsRepository(storage, {
    createId: () => `project-${++id}`,
    now: () => new Date(Date.UTC(2026, 7, 29, 12, minute++)),
  });
}

test("migrates the legacy single project into the project library once", () => {
  const storage = new MemoryStorage();
  const legacy = { ...createInitialProject(), name: "Legacy manicure" };
  writeStoredProject(storage, legacy);

  const firstRepository = repository(storage);
  const active = firstRepository.ensureActive(createInitialProject);

  assert.equal(active.project.name, "Legacy manicure");
  assert.equal(firstRepository.list().length, 1);
  assert.ok(storage.getItem(PROJECT_LIBRARY_STORAGE_KEY));

  const reopenedRepository = repository(storage);
  assert.equal(reopenedRepository.list().length, 1);
  assert.equal(reopenedRepository.ensureActive(createInitialProject).project.name, "Legacy manicure");
});

test("supports create, save, close, reopen, rename, duplicate, open, and delete", () => {
  const storage = new MemoryStorage();
  const firstRepository = repository(storage);
  const first = firstRepository.create({
    ...createInitialProject(),
    name: "Editorial pink",
  });
  firstRepository.saveActive({
    ...first.project,
    nails: {
      ...first.project.nails,
      "right-index": {
        ...first.project.nails["right-index"],
        baseColor: "#d1e0d6",
      },
    },
  });

  const reopenedRepository = repository(storage);
  const reopened = reopenedRepository.ensureActive(createInitialProject);
  assert.equal(reopened.id, first.id);
  assert.equal(reopened.project.nails["right-index"].baseColor, "#d1e0d6");

  const renamed = reopenedRepository.rename(first.id, "Sage editorial");
  assert.equal(renamed?.project.name, "Sage editorial");

  const duplicate = reopenedRepository.duplicate(first.id);
  assert.equal(duplicate?.project.name, "Sage editorial Copy");
  assert.notEqual(duplicate?.id, first.id);
  assert.deepEqual(duplicate?.project.nails, renamed?.project.nails);

  assert.equal(reopenedRepository.open(duplicate?.id ?? "")?.id, duplicate?.id);
  reopenedRepository.delete(first.id);
  assert.deepEqual(
    reopenedRepository.list().map((record) => record.id),
    [duplicate?.id],
  );

  reopenedRepository.delete(duplicate?.id ?? "");
  assert.equal(reopenedRepository.list().length, 0);
  assert.equal(reopenedRepository.ensureActive(createInitialProject).project.name, "Gradient Base Set");
});

test("preserves malformed project-library data instead of replacing it", () => {
  const storage = new MemoryStorage();
  const malformed = JSON.stringify({
    schemaVersion: 1,
    activeProjectId: "damaged-project",
    projects: [{ id: "damaged-project", project: "not-a-project" }],
  });
  storage.setItem(PROJECT_LIBRARY_STORAGE_KEY, malformed);

  assert.throws(
    () => repository(storage).list(),
    ProjectLibraryStorageError,
  );
  assert.equal(storage.getItem(PROJECT_LIBRARY_STORAGE_KEY), malformed);
});
