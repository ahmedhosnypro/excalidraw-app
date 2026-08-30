"use client";

import { useEffect } from "react";
import { Keyboard } from "lucide-react";

import { useEditorStore } from "@/stores/editor-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SHORTCUTS: { keys: string; description: string }[] = [
  { keys: "Ctrl/Cmd + S", description: "Save now (force-save, bypasses debounce)" },
  { keys: "?", description: "Show this shortcuts dialog" },
  { keys: "V or 1", description: "Selection tool" },
  { keys: "H", description: "Hand (panning) tool" },
  { keys: "R or 2", description: "Rectangle" },
  { keys: "D or 3", description: "Diamond" },
  { keys: "O or 4", description: "Ellipse" },
  { keys: "A or 5", description: "Arrow" },
  { keys: "L or 6", description: "Line" },
  { keys: "P or 7", description: "Draw (freehand)" },
  { keys: "T or 8", description: "Text" },
  { keys: "9", description: "Insert image" },
  { keys: "E", description: "Eraser" },
  { keys: "Ctrl/Cmd + Z", description: "Undo" },
  { keys: "Ctrl/Cmd + Shift + Z", description: "Redo" },
  { keys: "Ctrl/Cmd + D", description: "Duplicate selection" },
  { keys: "Shift + ?", description: "Open help (Excalidraw's own)" },
];

export function ShortcutsDialog() {
  const { shortcutsOpen, closeShortcuts, openShortcuts } = useEditorStore();

  // Global "?" key handler (when not typing in an input).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "?") {
        return;
      }
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      openShortcuts();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openShortcuts]);

  return (
    <Dialog open={shortcutsOpen} onOpenChange={(o) => (o ? null : closeShortcuts())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-4" />
            Keyboard shortcuts
          </DialogTitle>
          <DialogDescription>Speed up your workflow with these shortcuts.</DialogDescription>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto">
          <dl className="divide-y">
            {SHORTCUTS.map((s) => (
              <div key={s.keys} className="flex items-center justify-between gap-4 py-1.5 text-sm">
                <dt className="text-muted-foreground">{s.description}</dt>
                <dd className="shrink-0">
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">
                    {s.keys}
                  </kbd>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </DialogContent>
    </Dialog>
  );
}
