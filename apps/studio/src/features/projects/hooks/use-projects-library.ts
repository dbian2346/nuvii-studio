"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createInitialProject } from "@/features/editor/domain/editor-data";
import type { ProjectRecord } from "../domain/types";
import { createProjectsRepository } from "../services/local-projects-repository";

export function useProjectsLibrary() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(() => {
    try {
      const repository = createProjectsRepository(window.localStorage);
      setProjects(repository.list());
      setError("");
    } catch {
      setError(
        "Nuvii couldn't load projects from browser storage. Your saved projects were not changed. Allow site storage, then reload this page.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(timeout);
  }, [refresh]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 4_500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const createProject = useCallback((name: string) => {
    try {
      const repository = createProjectsRepository(window.localStorage);
      repository.create({
        ...createInitialProject(),
        name: name.trim(),
        collectionName: "My Projects",
      });
      router.push("/");
    } catch {
      setError(
        "Nuvii couldn't create the project. No project was added, and your existing projects are safe. Allow browser storage, then try again.",
      );
    }
  }, [router]);

  const openProject = useCallback((projectId: string) => {
    try {
      const repository = createProjectsRepository(window.localStorage);
      if (!repository.open(projectId)) {
        setError(
          "Nuvii couldn't find that project. Your other projects are safe. Refresh the gallery, then choose a project that is still listed.",
        );
        refresh();
        return;
      }
      router.push("/");
    } catch {
      setError(
        "Nuvii couldn't open the project. The saved project was not changed. Allow browser storage, then try again.",
      );
    }
  }, [refresh, router]);

  const renameProject = useCallback((projectId: string, name: string) => {
    try {
      const renamed = createProjectsRepository(window.localStorage).rename(projectId, name);
      if (!renamed) {
        setError(
          "Nuvii couldn't find the project to rename. Your projects were not changed. Refresh the gallery, then try again.",
        );
        refresh();
        return;
      }
      setNotice(`Renamed project to “${renamed.project.name}”.`);
      refresh();
    } catch {
      setError(
        "Nuvii couldn't rename the project. The original name is still saved. Allow browser storage, then try again.",
      );
    }
  }, [refresh]);

  const duplicateProject = useCallback((projectId: string) => {
    try {
      const duplicate = createProjectsRepository(window.localStorage).duplicate(projectId);
      if (!duplicate) {
        setError(
          "Nuvii couldn't find the project to duplicate. Your projects were not changed. Refresh the gallery, then try again.",
        );
        refresh();
        return;
      }
      setNotice(`Created “${duplicate.project.name}”.`);
      refresh();
    } catch {
      setError(
        "Nuvii couldn't duplicate the project. No copy was added, and the original is safe. Allow browser storage, then try again.",
      );
    }
  }, [refresh]);

  const deleteProject = useCallback((projectId: string) => {
    try {
      const projectName = projects.find((record) => record.id === projectId)?.project.name;
      createProjectsRepository(window.localStorage).delete(projectId);
      setNotice(projectName ? `Deleted “${projectName}”.` : "Project deleted.");
      refresh();
    } catch {
      setError(
        "Nuvii couldn't delete the project. It remains saved. Allow browser storage, then try again.",
      );
    }
  }, [projects, refresh]);

  return {
    createProject,
    deleteProject,
    duplicateProject,
    error,
    loading,
    notice,
    openProject,
    projects,
    renameProject,
  };
}
