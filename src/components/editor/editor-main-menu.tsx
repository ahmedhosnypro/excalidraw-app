"use client";

import type { ReactNode } from "react";
import { MainMenu } from "@excalidraw/excalidraw";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  Braces,
  Download,
  FileImage,
  FilePlus,
  Files,
  History,
  LogIn,
  LogOut,
  Moon,
  Save,
  Share2,
  Sun,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { useCreateFile } from "@/hooks/use-files";
import { useEditorStore } from "@/stores/editor-store";
import { exportScene } from "@/lib/export";

function Icon({ children }: { children: ReactNode }) {
  return <span className="flex size-4 items-center justify-center">{children}</span>;
}

export function EditorMainMenu() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const {
    setCurrentFile,
    openAuth,
    toggleSidebarFn,
    forceSaveFn,
    excalidrawApi,
    currentName,
    currentFileId,
    openShareDialog,
    openHistoryDialog,
  } = useEditorStore();
  const createFile = useCreateFile();

  const isAuthed = Boolean(session?.user);
  const isDark = theme === "dark";
  const canShare = isAuthed && currentFileId !== null;

  async function handleNew() {
    if (isAuthed) {
      const file = await createFile.mutateAsync("Untitled");
      setCurrentFile(file.id, file.name);
    } else {
      setCurrentFile(null, "Untitled");
    }
  }

  function sanitizeFileName(name: string): string {
    return (
      name
        .replace(/[^\w-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "drawing"
    );
  }

  async function handleExport(format: "png" | "svg") {
    if (!excalidrawApi) {
      toast.error("Editor is not ready yet.");
      return;
    }
    try {
      await exportScene(excalidrawApi, format, sanitizeFileName(currentName));
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch {
      toast.error(`Could not export as ${format.toUpperCase()}.`);
    }
  }

  function handleExportJson() {
    if (!excalidrawApi) {
      toast.error("Editor is not ready yet.");
      return;
    }
    try {
      const elements = excalidrawApi.getSceneElements();
      const appState = excalidrawApi.getAppState();
      const files = excalidrawApi.getFiles();
      const json = JSON.stringify(
        { type: "excalidraw", version: 2, source: "excalidraw-app", elements, appState, files },
        null,
        2
      );
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${sanitizeFileName(currentName)}.excalidraw`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Exported as JSON");
    } catch {
      toast.error("Could not export as JSON.");
    }
  }

  function handleImportJson() {
    if (!excalidrawApi) {
      toast.error("Editor is not ready yet.");
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".excalidraw,.json,application/json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string) as {
            elements?: unknown[];
            appState?: Record<string, unknown>;
          };
          if (!Array.isArray(parsed.elements)) {
            throw new Error("Invalid Excalidraw file");
          }
          excalidrawApi.updateScene({
            elements: parsed.elements as Parameters<
              typeof excalidrawApi.updateScene
            >[0]["elements"],
            appState: parsed.appState as Parameters<
              typeof excalidrawApi.updateScene
            >[0]["appState"],
          });
          toast.success(`Imported "${file.name}"`);
        } catch {
          toast.error("Could not parse the file — is it a valid Excalidraw export?");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  return (
    <MainMenu>
      <MainMenu.Item
        onSelect={handleNew}
        icon={
          <Icon>
            <FilePlus />
          </Icon>
        }
      >
        New drawing
      </MainMenu.Item>
      <MainMenu.Item
        onSelect={() => toggleSidebarFn?.()}
        icon={
          <Icon>
            <Files />
          </Icon>
        }
      >
        My drawings
      </MainMenu.Item>
      <MainMenu.Item
        onSelect={() => forceSaveFn?.()}
        icon={
          <Icon>
            <Save />
          </Icon>
        }
        shortcut="Ctrl+S"
      >
        Save now
      </MainMenu.Item>
      {canShare && (
        <MainMenu.Item
          onSelect={openShareDialog}
          icon={
            <Icon>
              <Share2 />
            </Icon>
          }
        >
          Share
        </MainMenu.Item>
      )}
      {canShare && (
        <MainMenu.Item
          onSelect={openHistoryDialog}
          icon={
            <Icon>
              <History />
            </Icon>
          }
        >
          Version history
        </MainMenu.Item>
      )}
      <MainMenu.Group title="Export">
        <MainMenu.Item
          onSelect={() => handleExport("png")}
          icon={
            <Icon>
              <FileImage />
            </Icon>
          }
        >
          Export as PNG
        </MainMenu.Item>
        <MainMenu.Item
          onSelect={() => handleExport("svg")}
          icon={
            <Icon>
              <Download />
            </Icon>
          }
        >
          Export as SVG
        </MainMenu.Item>
        <MainMenu.Item
          onSelect={handleExportJson}
          icon={
            <Icon>
              <Braces />
            </Icon>
          }
        >
          Export as JSON
        </MainMenu.Item>
      </MainMenu.Group>
      <MainMenu.Group title="Import">
        <MainMenu.Item
          onSelect={handleImportJson}
          icon={
            <Icon>
              <Upload />
            </Icon>
          }
        >
          Import from file
        </MainMenu.Item>
      </MainMenu.Group>
      <MainMenu.Separator />
      <MainMenu.Item
        onSelect={() => setTheme(isDark ? "light" : "dark")}
        icon={<Icon>{isDark ? <Sun /> : <Moon />}</Icon>}
      >
        {isDark ? "Light mode" : "Dark mode"}
      </MainMenu.Item>
      <MainMenu.Separator />
      {isAuthed ? (
        <MainMenu.Item
          onSelect={() => signOut()}
          icon={
            <Icon>
              <LogOut />
            </Icon>
          }
        >
          Sign out{session?.user?.name ? ` (${session.user.name})` : ""}
        </MainMenu.Item>
      ) : (
        <MainMenu.Item
          onSelect={() => openAuth("signin")}
          icon={
            <Icon>
              <LogIn />
            </Icon>
          }
        >
          Sign in / Sign up
        </MainMenu.Item>
      )}
    </MainMenu>
  );
}
