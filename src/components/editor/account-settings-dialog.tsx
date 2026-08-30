"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { KeyRound, Loader2, User } from "lucide-react";
import { toast } from "sonner";

import { useChangePassword, useUpdateName } from "@/hooks/use-files";
import { useEditorStore } from "@/stores/editor-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AccountSettingsDialog() {
  const { accountSettingsOpen, closeAccountSettings } = useEditorStore();
  const { data: session, update: updateSession } = useSession();

  return (
    <Dialog open={accountSettingsOpen} onOpenChange={(o) => (o ? null : closeAccountSettings())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Account settings</DialogTitle>
          <DialogDescription>Update your display name or change your password.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="name" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="name">Name</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
          </TabsList>
          <TabsContent value="name" className="mt-4">
            <NameTab
              currentName={session?.user?.name ?? ""}
              onNameChanged={async (name) => {
                await updateSession({ name });
                closeAccountSettings();
              }}
            />
          </TabsContent>
          <TabsContent value="password" className="mt-4">
            <PasswordTab onDone={closeAccountSettings} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function NameTab({
  currentName,
  onNameChanged,
}: {
  currentName: string;
  onNameChanged: (name: string) => Promise<void>;
}) {
  const updateName = useUpdateName();
  const [name, setName] = useState(currentName);

  useEffect(() => {
    setName(currentName);
  }, [currentName]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name cannot be empty.");
      return;
    }
    try {
      const result = await updateName.mutateAsync(trimmed);
      toast.success("Name updated.");
      await onNameChanged(result.name);
    } catch {
      toast.error("Could not update name.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name" className="flex items-center gap-1.5">
          <User className="size-3.5" />
          Display name
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
      </div>
      <Button type="submit" className="w-full" disabled={updateName.isPending}>
        {updateName.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
        Save name
      </Button>
    </form>
  );
}

function PasswordTab({ onDone }: { onDone: () => void }) {
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      toast.success("Password changed.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onDone();
    } catch {
      toast.error("Current password is incorrect.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="current" className="flex items-center gap-1.5">
          <KeyRound className="size-3.5" />
          Current password
        </Label>
        <Input
          id="current"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new">New password</Label>
        <Input
          id="new"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirm new password</Label>
        <Input
          id="confirm"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      <Button type="submit" className="w-full" disabled={changePassword.isPending}>
        {changePassword.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
        Change password
      </Button>
    </form>
  );
}
