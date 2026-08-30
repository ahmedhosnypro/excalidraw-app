"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type AuthMode = "signin" | "signup";

function makeAuthSchema(mode: AuthMode) {
  return z
    .object({
      name: z.string().max(100).optional(),
      email: z.string().email("Enter a valid email"),
      password: z
        .string()
        .min(
          mode === "signup" ? 8 : 1,
          mode === "signup" ? "Password must be at least 8 characters" : "Password is required"
        ),
    })
    .refine((val) => mode !== "signup" || (!!val.name && val.name.trim().length > 0), {
      path: ["name"],
      message: "Name is required",
    });
}

type AuthValues = z.infer<ReturnType<typeof makeAuthSchema>>;

interface AuthDialogProps {
  mode: AuthMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: AuthMode) => void;
}

export function AuthDialog({ mode, open, onOpenChange, onModeChange }: AuthDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const isSignUp = mode === "signup";

  const form = useForm<AuthValues>({
    resolver: zodResolver(makeAuthSchema(mode)),
    defaultValues: { name: "", email: "", password: "" },
  });

  function reset() {
    form.reset();
  }

  async function onSubmit(values: AuthValues) {
    setSubmitting(true);
    try {
      if (isSignUp) {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: values.name?.trim() || undefined,
            email: values.email.trim().toLowerCase(),
            password: values.password,
          }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          toast.error(data.error ?? "Sign up failed");
          return;
        }
      }

      const result = await signIn("credentials", {
        email: values.email.trim().toLowerCase(),
        password: values.password,
        redirect: false,
      });

      if (!result || result.error) {
        toast.error(isSignUp ? "Account created — please sign in." : "Invalid email or password");
        if (isSignUp) {
          reset();
          onModeChange("signin");
        }
        return;
      }

      toast.success(isSignUp ? "Account created — welcome!" : "Welcome back!");
      onOpenChange(false);
      reset();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isSignUp ? "Create an account" : "Sign in"}</DialogTitle>
          <DialogDescription>
            {isSignUp
              ? "Save your drawings to the cloud and switch between them on any device."
              : "Sign in to save your drawings to the cloud and access them anywhere."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {isSignUp && (
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input autoComplete="name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete={isSignUp ? "new-password" : "current-password"}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isSignUp ? "Create account" : "Sign in"}
            </Button>
          </form>
        </Form>
        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? "Already have an account? " : "Don't have an account? "}
          <button
            type="button"
            className="font-medium text-foreground underline-offset-4 hover:underline"
            onClick={() => {
              reset();
              onModeChange(isSignUp ? "signin" : "signup");
            }}
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </p>
      </DialogContent>
    </Dialog>
  );
}
