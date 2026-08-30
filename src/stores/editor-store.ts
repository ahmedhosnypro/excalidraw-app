import { create } from "zustand";

import type { AuthMode } from "@/components/auth/auth-dialog";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface EditorState {
  /** Currently open drawing id, or null for a guest (unsaved) canvas. */
  currentFileId: string | null;
  /** Name of the current drawing (mirrored for the canvas title). */
  currentName: string;
  /** Share token of the current drawing (null = not shared / guest). */
  currentShareToken: string | null;
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
  /** Share dialog open state + target file (id + name + current token). */
  shareDialog: { fileId: string; name: string; token: string | null } | null;
  /** Version history dialog open state + target file (id + name). */
  historyDialog: { fileId: string; name: string } | null;
  setCurrentFile: (id: string | null, name: string, shareToken?: string | null) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setSidebarOpen: (open: boolean) => void;
  setToggleSidebarFn: (fn: (() => void) | null) => void;
  setForceSaveFn: (fn: (() => void) | null) => void;
  setExcalidrawApi: (api: ExcalidrawImperativeAPI | null) => void;
  setPendingDelete: (target: { id: string; name: string } | null) => void;
  openShareDialog: () => void;
  closeShareDialog: () => void;
  setShareToken: (token: string | null) => void;
  openHistoryDialog: () => void;
  closeHistoryDialog: () => void;
  openAuth: (mode: AuthMode) => void;
  closeAuth: () => void;
  setAuthMode: (mode: AuthMode) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  currentFileId: null,
  currentName: "Untitled",
  currentShareToken: null,
  saveStatus: "idle",
  sidebarOpen: false,
  authOpen: false,
  authMode: "signin",
  toggleSidebarFn: null,
  forceSaveFn: null,
  excalidrawApi: null,
  pendingDelete: null,
  shareDialog: null,
  historyDialog: null,
  setCurrentFile: (id, name, shareToken = null) =>
    set({
      currentFileId: id,
      currentName: name,
      currentShareToken: shareToken,
      saveStatus: "idle",
    }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setToggleSidebarFn: (toggleSidebarFn) => set({ toggleSidebarFn }),
  setForceSaveFn: (forceSaveFn) => set({ forceSaveFn }),
  setExcalidrawApi: (excalidrawApi) => set({ excalidrawApi }),
  setPendingDelete: (pendingDelete) => set({ pendingDelete }),
  openShareDialog: () =>
    set((state) =>
      state.currentFileId
        ? {
            shareDialog: {
              fileId: state.currentFileId,
              name: state.currentName,
              token: state.currentShareToken,
            },
          }
        : {}
    ),
  closeShareDialog: () => set({ shareDialog: null }),
  setShareToken: (token) =>
    set((state) => ({
      currentShareToken: token,
      ...(state.shareDialog ? { shareDialog: { ...state.shareDialog, token } } : {}),
    })),
  openHistoryDialog: () =>
    set((state) =>
      state.currentFileId
        ? { historyDialog: { fileId: state.currentFileId, name: state.currentName } }
        : {}
    ),
  closeHistoryDialog: () => set({ historyDialog: null }),
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
