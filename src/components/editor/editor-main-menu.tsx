"use client";

import type { ReactNode } from "react";
import { MainMenu } from "@excalidraw/excalidraw";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { Download, FileImage, FilePlus, Files, LogIn, LogOut, Moon, Save, Sun } from "lucide-react";
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
  const { setCurrentFile, openAuth, toggleSidebarFn, forceSaveFn, excalidrawApi, currentName } =
    useEditorStore();
  const createFile = useCreateFile();

  const isAuthed = Boolean(session?.user);
  const isDark = theme === "dark";

  async function handleNew() {
    if (isAuthed) {
      const file = await createFile.mutateAsync("Untitled");
      setCurrentFile(file.id, file.name);
    } else {
      setCurrentFile(null, "Untitled");
    }
  }

  async function handleExport(format: "png" | "svg") {
    if (!excalidrawApi) {
      toast.error("Editor is not ready yet.");
      return;
    }
    try {
      const safeName =
        (currentName || "drawing")
          .replace(/[^\w-]+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "") || "drawing";
      await exportScene(excalidrawApi, format, safeName);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch {
      toast.error(`Could not export as ${format.toUpperCase()}.`);
    }
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
