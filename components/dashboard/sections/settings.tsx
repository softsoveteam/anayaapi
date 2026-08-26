"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, authApi, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { isStaff } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Logo } from "@/components/brand/logo";

export function SettingsSection() {
  const { user, refresh, role } = useAuth();
  const staff = isStaff(role);
  const [uniqueId, setUniqueId] = useState(user?.unique_id ?? "");
  const [name, setName] = useState(user?.name ?? "");
  const [profilePassword, setProfilePassword] = useState("");
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [sessionMinutes, setSessionMinutes] = useState("5");
  const [savingMinutes, setSavingMinutes] = useState(false);

  useEffect(() => {
    if (!staff) return;
    api<{ session_minutes: number }>("/app-settings")
      .then((res) => setSessionMinutes(String(res.session_minutes)))
      .catch(() => undefined);
  }, [staff]);

  async function onProfile(e: FormEvent) {
    e.preventDefault();
    try {
      await authApi.profile({
        unique_id: uniqueId.trim(),
        name: name.trim(),
        current_password: profilePassword,
      });
      toast.success("ID and name updated");
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
      const res = await api<{ message: string; session_minutes: number }>("/app-settings", {
        method: "PUT",
        body: JSON.stringify({ session_minutes: Number(sessionMinutes) }),
      });
      setSessionMinutes(String(res.session_minutes));
      toast.success(`Work sessions are now ${res.session_minutes} minutes`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingMinutes(false);
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
            Employees press Work Start on their dashboard. When this reverse timer finishes, each assigned site
            automatically receives 1 click. They cannot enter clicks by hand.
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

      <div className="grid md:grid-cols-2 gap-6">
        <form onSubmit={onProfile} className="bg-card border border-border rounded-xl p-5 space-y-3">
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
            <Input value={uniqueId} onChange={(e) => setUniqueId(e.target.value)} required />
          </div>
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
          <Button type="submit">Update ID</Button>
        </form>

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
