import { create } from "zustand";

import type { AuthMode } from "@/components/auth/auth-dialog";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface EditorState {
  /** Currently open drawing id, or null for a guest (unsaved) canvas. */
  currentFileId: string | null;
  /** Name of the current drawing (mirrored for the canvas title). */
  currentName: string;
  saveStatus: SaveStatus;
  sidebarOpen: boolean;
  authOpen: boolean;
  authMode: AuthMode;
  /** Imperative sidebar toggle (wired from excalidrawAPI in the editor). */
  toggleSidebarFn: (() => void) | null;
  /** Imperative force-save (wired from the editor's debounced-save logic). */
  forceSaveFn: (() => void) | null;
  /** Imperative Excalidraw API (for export, scene access). */
  excalidrawApi: ExcalidrawImperativeAPI | null;
  /** Pending delete confirmation target (id + name) — set by FileListItem. */
  pendingDelete: { id: string; name: string } | null;
  setCurrentFile: (id: string | null, name: string) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setSidebarOpen: (open: boolean) => void;
  setToggleSidebarFn: (fn: (() => void) | null) => void;
  setForceSaveFn: (fn: (() => void) | null) => void;
  setExcalidrawApi: (api: ExcalidrawImperativeAPI | null) => void;
  setPendingDelete: (target: { id: string; name: string } | null) => void;
  openAuth: (mode: AuthMode) => void;
  closeAuth: () => void;
  setAuthMode: (mode: AuthMode) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  currentFileId: null,
  currentName: "Untitled",
  saveStatus: "idle",
  sidebarOpen: false,
  authOpen: false,
  authMode: "signin",
  toggleSidebarFn: null,
  forceSaveFn: null,
  excalidrawApi: null,
  pendingDelete: null,
  setCurrentFile: (id, name) => set({ currentFileId: id, currentName: name, saveStatus: "idle" }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setToggleSidebarFn: (toggleSidebarFn) => set({ toggleSidebarFn }),
  setForceSaveFn: (forceSaveFn) => set({ forceSaveFn }),
  setExcalidrawApi: (excalidrawApi) => set({ excalidrawApi }),
  setPendingDelete: (pendingDelete) => set({ pendingDelete }),
  openAuth: (authMode) => set({ authOpen: true, authMode }),
  closeAuth: () => set({ authOpen: false }),
  setAuthMode: (authMode) => set({ authMode }),
}));

/** Derive up to two uppercase initials from a user's name or email. */
export function getUserInitials(name?: string | null, email?: string | null): string {
  const source = (name || email || "").trim();
  if (!source) {
    return "?";
  }
  if (source.includes(" ")) {
    const parts = source.split(/\s+/).filter(Boolean);
    return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  }
  return source[0] ?? "?";
}
