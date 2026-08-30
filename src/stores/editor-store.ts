import { create } from "zustand";

import type { AuthMode } from "@/components/auth/auth-dialog";

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
  setCurrentFile: (id: string | null, name: string) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setSidebarOpen: (open: boolean) => void;
  setToggleSidebarFn: (fn: (() => void) | null) => void;
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
  setCurrentFile: (id, name) => set({ currentFileId: id, currentName: name, saveStatus: "idle" }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setToggleSidebarFn: (toggleSidebarFn) => set({ toggleSidebarFn }),
  openAuth: (authMode) => set({ authOpen: true, authMode }),
  closeAuth: () => set({ authOpen: false }),
  setAuthMode: (authMode) => set({ authMode }),
}));
