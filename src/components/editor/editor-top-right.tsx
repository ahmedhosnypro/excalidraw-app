"use client";

import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { Check, CloudOff, Loader2, LogIn, Moon, Sun } from "lucide-react";

import { useEditorStore, type SaveStatus } from "@/stores/editor-store";
import { Button } from "@/components/ui/button";

const saveStatusMeta: Record<SaveStatus, { label: string; icon: React.ReactNode }> = {
  idle: { label: "", icon: null },
  saving: { label: "Saving…", icon: <Loader2 className="size-3 animate-spin" /> },
  saved: { label: "Saved", icon: <Check className="size-3" /> },
  error: { label: "Save failed", icon: <CloudOff className="size-3" /> },
};

export function EditorTopRight() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const { saveStatus, openAuth } = useEditorStore();

  const isAuthed = Boolean(session?.user);
  const isDark = theme === "dark";
  const status = saveStatusMeta[saveStatus];

  return (
    <div className="flex items-center gap-2">
      {status.icon && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {status.icon}
          {status.label}
        </span>
      )}
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle theme"
        onClick={() => setTheme(isDark ? "light" : "dark")}
      >
        {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </Button>
      {isAuthed ? (
        <span className="max-w-[10rem] truncate text-sm text-muted-foreground">
          {session?.user?.name ?? session?.user?.email}
        </span>
      ) : (
        <Button size="sm" variant="outline" onClick={() => openAuth("signin")}>
          <LogIn className="mr-1 size-4" />
          Sign in
        </Button>
      )}
    </div>
  );
}
