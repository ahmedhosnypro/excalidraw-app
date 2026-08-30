"use client";

import { useCallback, useEffect, useRef } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";

import { AuthDialog } from "@/components/auth/auth-dialog";
import { EditorMainMenu } from "@/components/editor/editor-main-menu";
import { EditorSidebar } from "@/components/editor/editor-sidebar";
import { EditorTopRight } from "@/components/editor/editor-top-right";
import { loadFileContent, saveFileContent, touchFile } from "@/hooks/use-files";
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
    setSaveStatus,
    setToggleSidebarFn,
    closeAuth,
    setAuthMode,
  } = useEditorStore();

  const apiRef = useRef<ExcalidrawApi | null>(null);
  const latestScene = useRef<string>("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
