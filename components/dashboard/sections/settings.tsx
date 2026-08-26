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
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  async function onSubmit(e: FormEvent) {
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
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="font-semibold">Profile</h3>
        <Row label="Unique ID" value={user.unique_id} />
        <Row label="Name" value={user.name} />
        <Row label="Role" value={user.role || "—"} />
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Status</span>
          <StatusBadge status={user.status} />
        </div>
        <Row label="Phone" value={user.phone || "—"} />
        <Row label="Email" value={user.email || "—"} />
      </div>

      <form onSubmit={onSubmit} className="bg-card border border-border rounded-xl p-5 space-y-3">
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
        <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">
          Update password
        </Button>
      </form>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}
