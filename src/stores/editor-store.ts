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
  /** Folder id of the current drawing (null = root). */
  currentFolderId: string | null;
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
  /** Move-to-folder dialog target (file id + name + current folderId). */
  moveDialog: { fileId: string; name: string; folderId: string | null } | null;
  /** Folder filter active in the sidebar: null = "All", "none" = root (no folder), id = that folder. */
  folderFilter: string | null;
  /** Keyboard shortcuts dialog open. */
  shortcutsOpen: boolean;
  /** Account settings dialog open. */
  accountSettingsOpen: boolean;
  /** Batch selection: set of selected file ids in the sidebar. */
  selectedFileIds: Set<string>;
  setCurrentFile: (
    id: string | null,
    name: string,
    shareToken?: string | null,
    folderId?: string | null
  ) => void;
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
  openMoveDialog: (fileId: string, name: string, folderId: string | null) => void;
  closeMoveDialog: () => void;
  setFolderFilter: (filter: string | null) => void;
  openShortcuts: () => void;
  closeShortcuts: () => void;
  openAccountSettings: () => void;
  closeAccountSettings: () => void;
  toggleFileSelection: (id: string) => void;
  clearSelection: () => void;
  openAuth: (mode: AuthMode) => void;
  closeAuth: () => void;
  setAuthMode: (mode: AuthMode) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  currentFileId: null,
  currentName: "Untitled",
  currentShareToken: null,
  currentFolderId: null,
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
  moveDialog: null,
  folderFilter: null,
  shortcutsOpen: false,
  accountSettingsOpen: false,
  selectedFileIds: new Set<string>(),
  setCurrentFile: (id, name, shareToken = null, folderId = null) =>
    set({
      currentFileId: id,
      currentName: name,
      currentShareToken: shareToken,
      currentFolderId: folderId,
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
  openMoveDialog: (fileId, name, folderId) => set({ moveDialog: { fileId, name, folderId } }),
  closeMoveDialog: () => set({ moveDialog: null }),
  setFolderFilter: (folderFilter) => set({ folderFilter }),
  openShortcuts: () => set({ shortcutsOpen: true }),
  closeShortcuts: () => set({ shortcutsOpen: false }),
  openAccountSettings: () => set({ accountSettingsOpen: true }),
  closeAccountSettings: () => set({ accountSettingsOpen: false }),
  toggleFileSelection: (id) =>
    set((state) => {
      const next = new Set(state.selectedFileIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedFileIds: next };
    }),
  clearSelection: () => set({ selectedFileIds: new Set<string>() }),
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
