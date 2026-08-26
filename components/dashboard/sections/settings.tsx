"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { authApi, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Logo } from "@/components/brand/logo";

export function SettingsSection() {
  const { user, refresh } = useAuth();
  const [uniqueId, setUniqueId] = useState(user?.unique_id ?? "");
  const [name, setName] = useState(user?.name ?? "");
  const [profilePassword, setProfilePassword] = useState("");
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

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

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-card border border-border rounded-xl p-5">
        <Logo className="h-12 max-w-xs" />
        <p className="text-sm text-muted-foreground mt-3">Project Anaya · Softsove</p>
      </div>

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
