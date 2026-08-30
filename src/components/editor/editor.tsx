"use client";

import { useCallback, useEffect, useRef } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { AuthDialog } from "@/components/auth/auth-dialog";
import { EditorMainMenu } from "@/components/editor/editor-main-menu";
import { EditorSidebar } from "@/components/editor/editor-sidebar";
import { EditorTopRight } from "@/components/editor/editor-top-right";
import { useCreateFile, loadFileContent, saveFileContent, touchFile } from "@/hooks/use-files";
import { useEditorStore } from "@/stores/editor-store";

type ExcalidrawProps = React.ComponentProps<typeof Excalidraw>;
type OnChange = NonNullable<ExcalidrawProps["onChange"]>;
type ExcalidrawApi = Parameters<NonNullable<ExcalidrawProps["excalidrawAPI"]>>[0];
type InitialDataState = NonNullable<
  Awaited<Extract<NonNullable<ExcalidrawProps["initialData"]>, Promise<unknown>>>
>;

const GUEST_STORAGE_KEY = "excalidraw-app:guest";
const EMPTY_SCENE: InitialDataState = { elements: [], appState: {} };

function parseScene(raw: string | null | undefined): InitialDataState {
  if (!raw) {
    return EMPTY_SCENE;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<InitialDataState>;
    return { elements: parsed.elements ?? [], appState: parsed.appState ?? {} };
  } catch {
    return EMPTY_SCENE;
  }
}

export function Editor() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();
  const {
    currentFileId,
    currentName,
    authOpen,
    authMode,
    saveStatus,
    setCurrentFile,
    setSaveStatus,
    setToggleSidebarFn,
    closeAuth,
    setAuthMode,
  } = useEditorStore();
  const createFile = useCreateFile();

  const apiRef = useRef<ExcalidrawApi | null>(null);
  const latestScene = useRef<string>("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const migratedRef = useRef(false);

  const isAuthed = status === "authenticated" && Boolean(session?.user);
  const fileId = isAuthed ? currentFileId : null;

  const loadInitialData = useCallback((): Promise<InitialDataState> => {
    if (isAuthed && fileId) {
      return loadFileContent(fileId).then((raw) => parseScene(raw));
    }
    if (!isAuthed) {
      return Promise.resolve(parseScene(localStorage.getItem(GUEST_STORAGE_KEY)));
    }
    return Promise.resolve(EMPTY_SCENE);
  }, [fileId, isAuthed]);

  const handleChange = useCallback<OnChange>(
    (elements, appState) => {
      latestScene.current = JSON.stringify({ elements, appState });
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
      saveTimer.current = setTimeout(async () => {
        const scene = latestScene.current;
        if (!scene) {
          return;
        }
        setSaveStatus("saving");
        try {
          if (isAuthed && fileId) {
            await saveFileContent(fileId, scene);
          } else if (!isAuthed) {
            localStorage.setItem(GUEST_STORAGE_KEY, scene);
          }
          setSaveStatus("saved");
        } catch {
          setSaveStatus("error");
        }
      }, 1500);
    },
    [fileId, isAuthed, setSaveStatus]
  );

  // Mark the active drawing as opened + auto-pick the most recent on first auth.
  useEffect(() => {
    if (isAuthed && fileId) {
      void touchFile(fileId);
    }
  }, [isAuthed, fileId]);

  // Guest -> cloud migration: when a guest signs in with an unsaved drawing,
  // persist it as a new cloud file so no work is lost. The ref guard + synchronous
  // localStorage removal prevent re-entry from creating duplicate files.
  useEffect(() => {
    if (!isAuthed || currentFileId || migratedRef.current) {
      return;
    }
    const guestScene = localStorage.getItem(GUEST_STORAGE_KEY);
    if (!guestScene) {
      migratedRef.current = true;
      return;
    }
    // Only migrate when the guest actually drew something (skip empty autosaves).
    let hasContent = false;
    try {
      const parsed = JSON.parse(guestScene) as { elements?: unknown[] };
      hasContent = Array.isArray(parsed.elements) && parsed.elements.length > 0;
    } catch {
      hasContent = false;
    }
    migratedRef.current = true;
    localStorage.removeItem(GUEST_STORAGE_KEY);
    if (!hasContent) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const file = await createFile.mutateAsync("Imported drawing");
        await saveFileContent(file.id, guestScene);
        if (!cancelled) {
          setCurrentFile(file.id, file.name);
          toast.success("Your drawing was saved to the cloud.");
        }
      } catch {
        if (!cancelled) {
          toast.error("Could not import your guest drawing.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthed, currentFileId, createFile, setCurrentFile]);

  // Reset the migration guard when the user signs out (allows re-migration next sign-in).
  useEffect(() => {
    if (!isAuthed) {
      migratedRef.current = false;
    }
  }, [isAuthed]);

  // Auto-clear the "saved" indicator after a moment.
  useEffect(() => {
    if (saveStatus !== "saved") {
      return;
    }
    const t = setTimeout(() => setSaveStatus("idle"), 2500);
    return () => clearTimeout(t);
  }, [saveStatus, setSaveStatus]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
  }, []);

  return (
    <div className="h-screen w-screen">
      <Excalidraw
        key={fileId ?? "guest"}
        initialData={loadInitialData()}
        onChange={handleChange}
        excalidrawAPI={(api) => {
          apiRef.current = api;
          setToggleSidebarFn(() => () => api.toggleSidebar({ name: "my-drawings" }));
        }}
        theme={theme === "dark" ? "dark" : "light"}
        name={currentName}
        renderTopRightUI={() => <EditorTopRight />}
        UIOptions={{
          canvasActions: {
            changeViewBackgroundColor: true,
            clearCanvas: true,
            export: { saveFileToDisk: true },
            loadScene: true,
            saveToActiveFile: true,
            toggleTheme: true,
          },
        }}
      >
        <EditorMainMenu />
        <EditorSidebar />
      </Excalidraw>

      <AuthDialog
        mode={authMode}
        open={authOpen}
        onOpenChange={(open) => (open ? null : closeAuth())}
        onModeChange={setAuthMode}
      />
    </div>
  );
}
