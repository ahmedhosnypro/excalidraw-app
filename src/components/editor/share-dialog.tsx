"use client";

import { useState } from "react";
import { Check, Copy, Eye, Link2, Link2Off, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useEnableShare, useRevokeShare } from "@/hooks/use-files";
import { useEditorStore } from "@/stores/editor-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ShareDialog() {
  const { shareDialog, closeShareDialog, setShareToken } = useEditorStore();
  const enableShare = useEnableShare();
  const revokeShare = useRevokeShare();
  const [copied, setCopied] = useState(false);

  const open = shareDialog !== null;
  const fileId = shareDialog?.fileId ?? "";
  const token = shareDialog?.token ?? null;

  const shareUrl =
    token && typeof window !== "undefined" ? `${window.location.origin}/?share=${token}` : "";

  async function handleEnable() {
    try {
      const summary = await enableShare.mutateAsync(fileId);
      setShareToken(summary.shareToken);
      toast.success("Sharing enabled — link ready to copy.");
    } catch {
      toast.error("Could not enable sharing.");
    }
  }

  async function handleRevoke() {
    try {
      await revokeShare.mutateAsync(fileId);
      setShareToken(null);
      toast.success("Sharing revoked — the link no longer works.");
    } catch {
      toast.error("Could not revoke sharing.");
    }
  }

  async function handleCopy() {
    if (!shareUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the link.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : closeShareDialog())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="size-4" />
            Share drawing
          </DialogTitle>
          <DialogDescription>
            {shareDialog?.name ? (
              <>
                Share <span className="font-medium text-foreground">{shareDialog.name}</span> as a
                read-only link. Anyone with the link can view it — no sign-in required.
              </>
            ) : (
              "Share this drawing as a read-only link."
            )}
          </DialogDescription>
        </DialogHeader>

        {token ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={shareUrl}
                className="text-sm"
                onFocus={(e) => e.target.select()}
              />
              <Button size="icon" variant="outline" onClick={handleCopy} aria-label="Copy link">
                {copied ? (
                  <Check className="size-4 text-emerald-600" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
              <Eye className="size-3.5 shrink-0" />
              <span>
                This drawing is publicly viewable. Revoking the link stops access immediately.
              </span>
            </div>
            <Button
              variant="outline"
              onClick={handleRevoke}
              disabled={revokeShare.isPending}
              className="w-full text-destructive hover:text-destructive"
            >
              {revokeShare.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Link2Off className="mr-2 size-4" />
              )}
              Revoke share link
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Sharing is currently disabled. Enable it to generate a public read-only link.
            </p>
            <Button onClick={handleEnable} disabled={enableShare.isPending} className="w-full">
              {enableShare.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Link2 className="mr-2 size-4" />
              )}
              Enable sharing
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
