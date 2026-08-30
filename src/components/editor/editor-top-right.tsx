"use client";

import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { Check, CloudOff, Database, Loader2, LogIn, LogOut, Moon, Sun } from "lucide-react";

import { useEditorStore, type SaveStatus } from "@/stores/editor-store";
import { useStorageUsage } from "@/hooks/use-files";
import { formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/editor/user-avatar";

const saveStatusMeta: Record<
  SaveStatus,
  { label: string; icon: React.ReactNode; className: string }
> = {
  idle: { label: "", icon: null, className: "" },
  saving: {
    label: "Saving…",
    icon: <Loader2 className="size-3 animate-spin" />,
    className: "text-muted-foreground",
  },
  saved: {
    label: "Saved",
    icon: <Check className="size-3" />,
    className: "text-emerald-600 dark:text-emerald-400",
  },
  error: {
    label: "Save failed",
    icon: <CloudOff className="size-3" />,
    className: "text-destructive",
  },
};

export function EditorTopRight() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const { saveStatus, openAuth } = useEditorStore();
  const { data: usage } = useStorageUsage(Boolean(session?.user));

  const isAuthed = Boolean(session?.user);
  const isDark = theme === "dark";
  const status = saveStatusMeta[saveStatus];

  return (
    <div className="flex items-center gap-2">
      {status.icon && (
        <span
          className={`flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-xs font-medium ${status.className}`}
        >
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <UserAvatar
                name={session?.user?.name}
                email={session?.user?.email}
                className="size-8"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="font-medium">{session?.user?.name ?? "Account"}</span>
              {session?.user?.email && (
                <span className="truncate text-xs font-normal text-muted-foreground">
                  {session.user.email}
                </span>
              )}
            </DropdownMenuLabel>
            {usage && (
              <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
                <Database className="size-3.5" />
                <span>
                  {formatBytes(usage.bytes)} · {usage.count} drawing{usage.count === 1 ? "" : "s"}
                </span>
              </div>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setTheme(isDark ? "light" : "dark")}>
              {isDark ? <Sun className="mr-2 size-4" /> : <Moon className="mr-2 size-4" />}
              {isDark ? "Light mode" : "Dark mode"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => signOut()}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button size="sm" variant="outline" onClick={() => openAuth("signin")}>
          <LogIn className="mr-1 size-4" />
          Sign in
        </Button>
      )}
    </div>
  );
}
