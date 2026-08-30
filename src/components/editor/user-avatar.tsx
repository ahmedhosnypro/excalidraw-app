"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getUserInitials } from "@/stores/editor-store";

interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  className?: string;
}

/** Circular avatar showing the user's initials (up to 2 characters, uppercase). */
export function UserAvatar({ name, email, className }: UserAvatarProps) {
  const initials = getUserInitials(name, email);
  return (
    <Avatar className={className}>
      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
