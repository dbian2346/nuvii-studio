"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { ProjectRecord, ProjectSort } from "../domain/types";
import { useProjectsLibrary } from "../hooks/use-projects-library";
import { DeleteProjectDialog, ProjectNameDialog } from "./project-dialogs";
import { ProjectPreview } from "./project-preview";
import styles from "./projects.module.css";

function modifiedLabel(isoDate: string): string {
  const date = new Date(isoDate);
  const elapsed = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(elapsed / 60_000));
  if (minutes < 1) return "Modified just now";
  if (minutes < 60) return `Modified ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Modified ${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Modified ${days} day${days === 1 ? "" : "s"} ago`;
  return `Modified ${new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  }).format(date)}`;
}

interface ProjectCardProps {
  onDelete: (trigger: HTMLButtonElement) => void;
  onDuplicate: () => void;
  onOpen: () => void;
  onRename: (trigger: HTMLButtonElement) => void;
  record: ProjectRecord;
}

function ProjectCard({ onDelete, onDuplicate, onOpen, onRename, record }: ProjectCardProps) {
  return (
    <article className={styles.projectCard} data-project-id={record.id}>
      <button
        aria-label={`Open ${record.project.name}`}
        className={styles.previewButton}
        onClick={onOpen}
        type="button"
      >
        <ProjectPreview project={record.project} />
        <span className={styles.openHint}>Open project</span>
      </button>
      <div className={styles.cardDetails}>
        <div className={styles.cardTitleGroup}>
          <h2>{record.project.name}</h2>
          <time dateTime={record.modifiedAt} title={new Date(record.modifiedAt).toLocaleString()}>
            {modifiedLabel(record.modifiedAt)}
          </time>
        </div>
        <div aria-label={`Actions for ${record.project.name}`} className={styles.cardActions}>
          <Button aria-label={`Rename ${record.project.name}`} onClick={(event) => onRename(event.currentTarget)} size="compact" variant="ghost">Rename</Button>
          <Button aria-label={`Duplicate ${record.project.name}`} onClick={onDuplicate} size="compact" variant="ghost">Duplicate</Button>
          <Button aria-label={`Delete ${record.project.name}`} className={styles.deleteAction} onClick={(event) => onDelete(event.currentTarget)} size="compact" variant="ghost">
            Delete
          </Button>
        </div>
      </div>
    </article>
  );
}

function LoadingGallery() {
  return (
    <div aria-label="Loading projects" className={styles.projectGrid} role="status">
      {[0, 1, 2].map((index) => (
        <div className={`${styles.projectCard} ${styles.skeletonCard}`} key={index}>
          <span className={styles.skeletonPreview} />
          <span className={styles.skeletonLine} />
          <span className={styles.skeletonLineShort} />
        </div>
      ))}
    </div>
  );
}

export function ProjectsScreen() {
  const {
    createProject,
    deleteProject,
    duplicateProject,
    error,
    loading,
    notice,
    openProject,
    projects,
    renameProject,
  } = useProjectsLibrary();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ProjectSort>("modified");
  const [nameDialog, setNameDialog] = useState<ProjectRecord | "create" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectRecord | null>(null);
  const [dialogReturnFocus, setDialogReturnFocus] = useState<HTMLElement | null>(null);
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase());
  const dialogOpen = nameDialog !== null || deleteTarget !== null;
  const visibleProjects = useMemo(() => {
    const filtered = deferredQuery
      ? projects.filter((record) =>
          record.project.name.toLocaleLowerCase().includes(deferredQuery),
        )
      : projects;
    return filtered.toSorted((a, b) =>
      sort === "name"
        ? a.project.name.localeCompare(b.project.name)
        : b.modifiedAt.localeCompare(a.modifiedAt),
    );
  }, [deferredQuery, projects, sort]);

  return (
    <main className={styles.projectsViewport} data-nuvii-ui>
      <div
        aria-hidden={dialogOpen || undefined}
        className={styles.projectsShell}
        inert={dialogOpen || undefined}
      >
        <header className={styles.projectsTopbar}>
          <Link className={styles.projectsWordmark} href="/">NUVII STUDIO</Link>
          <span className={styles.libraryLocation}>
            <Icon size="small" src="/icons/nuvii/folder.svg" />
            Projects
          </span>
          <span aria-label="Nuvii profile" className={styles.projectsProfile} role="img">
            <Icon size="large" src="/icons/nuvii/person.svg" />
          </span>
        </header>

        <section className={styles.libraryContent}>
          <div className={styles.libraryIntro}>
            <div>
              <p className={styles.eyebrow}>Your studio</p>
              <h1>Projects</h1>
              <p>Return to a saved set or begin a new ten-nail composition.</p>
            </div>
            <Button
              onClick={(event) => {
                setDialogReturnFocus(event.currentTarget);
                setNameDialog("create");
              }}
              variant="accent"
            >
              <Icon size="small" src="/icons/nuvii/add.svg" />
              New Project
            </Button>
          </div>

          {projects.length > 0 ? (
            <div className={styles.libraryControls}>
              <label className={styles.searchControl}>
                <span className={styles.visuallyHidden}>Search projects</span>
                <input
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search projects"
                  type="search"
                  value={query}
                />
              </label>
              <label className={styles.sortControl}>
                <span>Sort</span>
                <select onChange={(event) => setSort(event.target.value as ProjectSort)} value={sort}>
                  <option value="modified">Last modified</option>
                  <option value="name">Name</option>
                </select>
              </label>
            </div>
          ) : null}

          {error ? <p className={styles.libraryError} role="alert">{error}</p> : null}
          {notice ? <p className={styles.libraryNotice} role="status">{notice}</p> : null}
          {loading ? <LoadingGallery /> : null}
          {!loading && projects.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyArtwork}>
                <Icon size="large" src="/icons/nuvii/sparkle.svg" />
              </span>
              <p className={styles.eyebrow}>A fresh canvas</p>
              <h2>Create your first nail set</h2>
              <p>Your projects will appear here as visual sets, ready to reopen and refine.</p>
              <Button
                onClick={(event) => {
                  setDialogReturnFocus(event.currentTarget);
                  setNameDialog("create");
                }}
                variant="accent"
              >
                New Project
              </Button>
            </div>
          ) : null}
          {!loading && projects.length > 0 && visibleProjects.length === 0 ? (
            <div className={styles.noResults}>
              <h2>No matching projects</h2>
              <p>Try another name or clear the search.</p>
              <Button onClick={() => setQuery("")} size="compact" variant="ghost">Clear search</Button>
            </div>
          ) : null}
          {!loading && visibleProjects.length > 0 ? (
            <div className={styles.projectGrid}>
              {visibleProjects.map((record) => (
                <ProjectCard
                  key={record.id}
                  onDelete={(trigger) => {
                    setDialogReturnFocus(trigger);
                    setDeleteTarget(record);
                  }}
                  onDuplicate={() => duplicateProject(record.id)}
                  onOpen={() => openProject(record.id)}
                  onRename={(trigger) => {
                    setDialogReturnFocus(trigger);
                    setNameDialog(record);
                  }}
                  record={record}
                />
              ))}
            </div>
          ) : null}
        </section>
      </div>

      {nameDialog ? (
        <ProjectNameDialog
          initialName={nameDialog === "create" ? "" : nameDialog.project.name}
          mode={nameDialog === "create" ? "create" : "rename"}
          onClose={() => setNameDialog(null)}
          onSubmit={(name) => {
            if (nameDialog === "create") createProject(name);
            else renameProject(nameDialog.id, name);
            setNameDialog(null);
          }}
          returnFocusTo={dialogReturnFocus}
        />
      ) : null}
      {deleteTarget ? (
        <DeleteProjectDialog
          name={deleteTarget.project.name}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => {
            deleteProject(deleteTarget.id);
            setDeleteTarget(null);
          }}
          returnFocusTo={dialogReturnFocus}
        />
      ) : null}
    </main>
  );
}
