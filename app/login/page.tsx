"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { IdCard, Lock, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/logo";
import { LoginBackground } from "@/components/brand/login-background";

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [uniqueId, setUniqueId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-background">
        <LoginBackground />
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center gap-4">
          <Logo variant="mark" className="h-16" />
          <p className="text-muted-foreground text-sm">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (user) {
    router.replace("/");
    return null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(uniqueId.trim(), password);
      router.replace("/");
    } catch (err) {
      setError(errorMessage(err, "Could not sign in"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <LoginBackground />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div
          className="w-full max-w-[420px]"
          style={{ animation: "login-card-in 0.7s ease-out both" }}
        >
          <div className="flex flex-col items-center mb-8">
            <Logo className="h-[72px] w-full max-w-[280px]" />
            <p className="mt-4 text-sm tracking-[0.22em] uppercase text-muted-foreground">
              Project Anaya
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            className="bg-card border border-border rounded-xl p-7 space-y-5"
          >
            <div>
              <h1 className="text-xl font-semibold text-foreground">Welcome back</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Sign in with your unique ID to continue.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="unique_id">Unique ID</Label>
                <div className="relative">
                  <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="unique_id"
                    value={uniqueId}
                    onChange={(e) => setUniqueId(e.target.value)}
                    placeholder="ANAYA-0001"
                    autoComplete="username"
                    required
                    className="h-11 pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    className="h-11 pl-10"
                  />
                </div>
              </div>
              {error ? (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full h-11" disabled={submitting}>
                {submitting ? "Signing in..." : "Sign in"}
                {!submitting ? <ArrowRight className="w-4 h-4" /> : null}
              </Button>
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Softsove · Building the future with AI
          </p>
        </div>
      </div>
    </div>
  );
}
