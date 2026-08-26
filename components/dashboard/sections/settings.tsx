"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, authApi, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { isStaff } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Logo } from "@/components/brand/logo";

export function SettingsSection() {
  const { user, refresh, role } = useAuth();
  const staff = isStaff(role);
  const [name, setName] = useState(user?.name ?? "");
  const [profilePassword, setProfilePassword] = useState("");
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [sessionMinutes, setSessionMinutes] = useState("5");
  const [multipleKeywords, setMultipleKeywords] = useState(false);
  const [savingMinutes, setSavingMinutes] = useState(false);
  const [savingKeywords, setSavingKeywords] = useState(false);

  useEffect(() => {
    if (!staff) return;
    api<{ session_minutes: number; multiple_keywords?: boolean }>("/app-settings")
      .then((res) => {
        setSessionMinutes(String(res.session_minutes));
        setMultipleKeywords(Boolean(res.multiple_keywords));
      })
      .catch(() => undefined);
  }, [staff]);

  async function onProfile(e: FormEvent) {
    e.preventDefault();
    try {
      await authApi.profile({
        name: name.trim(),
        current_password: profilePassword,
      });
      toast.success("Name updated");
      setProfilePassword("");
      await refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function onPassword(e: FormEvent) {
    e.preventDefault();
    try {
      await authApi.password({
        current_password: current,
        password,
        password_confirmation: confirm,
      });
      toast.success("Password updated");
      setCurrent("");
      setPassword("");
      setConfirm("");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function onSessionMinutes(e: FormEvent) {
    e.preventDefault();
    setSavingMinutes(true);
    try {
      const res = await api<{ message: string; session_minutes: number; multiple_keywords?: boolean }>("/app-settings", {
        method: "PUT",
        body: JSON.stringify({ session_minutes: Number(sessionMinutes) }),
      });
      setSessionMinutes(String(res.session_minutes));
      if (res.multiple_keywords != null) setMultipleKeywords(Boolean(res.multiple_keywords));
      toast.success(`Work sessions are now ${res.session_minutes} minutes`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingMinutes(false);
    }
  }

  async function onMultipleKeywords(checked: boolean) {
    setMultipleKeywords(checked);
    setSavingKeywords(true);
    try {
      const res = await api<{ message: string; multiple_keywords?: boolean }>("/app-settings", {
        method: "PUT",
        body: JSON.stringify({ multiple_keywords: checked }),
      });
      setMultipleKeywords(Boolean(res.multiple_keywords));
      toast.success(
        checked
          ? "Multiple keywords on — each keyword is a tab and a click per computer"
          : "Multiple keywords off — one tab and one click per site per computer"
      );
    } catch (err) {
      setMultipleKeywords(!checked);
      toast.error(errorMessage(err));
    } finally {
      setSavingKeywords(false);
    }
  }

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-card border border-border rounded-xl p-5">
        <Logo className="h-12 max-w-xs" />
        <p className="text-sm text-muted-foreground mt-3">Project Anaya · Softsove</p>
      </div>

      {staff ? (
        <form onSubmit={onSessionMinutes} className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="font-semibold">Employee work timer</h3>
          <p className="text-sm text-muted-foreground">
            Employees press Work Start on their dashboard. When this reverse timer finishes, clicks are counted
            automatically. They cannot enter clicks by hand.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label>Session length (minutes)</Label>
              <Input
                type="number"
                min={1}
                max={180}
                value={sessionMinutes}
                onChange={(e) => setSessionMinutes(e.target.value)}
                className="w-36"
                required
              />
            </div>
            <Button type="submit" disabled={savingMinutes}>
              {savingMinutes ? "Saving..." : "Save timer"}
            </Button>
          </div>
        </form>
      ) : null}

      {staff ? (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold">Multiple keywords</h3>
              <p className="text-sm text-muted-foreground mt-1">
                When on, the employee opens every assigned keyword in its own tab. Clicks = keywords × computers.
                Example: soundbuttons.com with 2 keywords on 3 computers = 6 clicks per session.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                When off, they open one tab per site. Extra keywords on the same site do not add extra clicks.
              </p>
            </div>
            <Switch
              checked={multipleKeywords}
              disabled={savingKeywords}
              onCheckedChange={onMultipleKeywords}
              className="data-[state=checked]:bg-accent"
            />
          </div>
        </div>
      ) : null}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="font-semibold">Account</h3>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Role</span>
            <span className="font-medium capitalize">{user.role || "—"}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <StatusBadge status={user.status} />
          </div>
          <div className="space-y-1.5">
            <Label>Unique ID</Label>
            <Input value={user.unique_id} readOnly className="font-mono bg-secondary/50" />
            <p className="text-xs text-muted-foreground">Assigned automatically in sequence. It cannot be changed.</p>
          </div>
          {staff ? (
            <form onSubmit={onProfile} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Current password</Label>
                <Input
                  type="password"
                  value={profilePassword}
                  onChange={(e) => setProfilePassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit">Update name</Button>
            </form>
          ) : (
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={user.name} readOnly className="bg-secondary/50" />
            </div>
          )}
        </div>

        <form onSubmit={onPassword} className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="font-semibold">Change password</h3>
          <div className="space-y-1.5">
            <Label>Current password</Label>
            <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>New password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <div className="space-y-1.5">
            <Label>Confirm</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          <Button type="submit">Update password</Button>
        </form>
      </div>
    </div>
  );
}
