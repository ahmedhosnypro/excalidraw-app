"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { LogOut, Moon, PencilLine, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { AuthDialog, type AuthMode } from "@/components/auth/auth-dialog";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");

  const isDark = theme === "dark";

  function openAuth(mode: AuthMode) {
    setAuthMode(mode);
    setAuthOpen(true);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2 font-semibold">
          <PencilLine className="size-5" />
          Excalidraw App
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          {status === "authenticated" && session?.user ? (
            <>
              <span className="text-sm text-muted-foreground">
                {session.user.name ?? session.user.email}
              </span>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                <LogOut className="mr-2 size-4" />
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => openAuth("signin")}>
                Sign in
              </Button>
              <Button size="sm" onClick={() => openAuth("signup")}>
                Sign up
              </Button>
            </>
          )}
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Draw, save, switch.</h1>
        <p className="max-w-md text-muted-foreground">
          A self-hosted Excalidraw with cloud-saved drawings. The editor lands in the next milestone
          — for now, create an account to get started.
        </p>
      </main>

      <footer className="mt-auto border-t px-4 py-3 text-center text-xs text-muted-foreground">
        Excalidraw App — open-source alternative to Excalidraw+ cloud features.
      </footer>

      <AuthDialog
        mode={authMode}
        open={authOpen}
        onOpenChange={setAuthOpen}
        onModeChange={setAuthMode}
      />
    </div>
  );
}
