"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import type { EmployeeStatus, Role, User } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth-context";

const emptyForm = {
  unique_id: "",
  name: "",
  email: "",
  phone: "",
  address: "",
  emergency_contact: "",
  status: "interview" as EmployeeStatus,
  interview_date: "",
  joining_date: "",
  notes: "",
  password: "",
  role: "employee" as Role,
};

export function EmployeesSection() {
  const { role } = useAuth();
  const [employees, setEmployees] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await api<{ data: User[] }>(`/employees?search=${encodeURIComponent(search)}`);
    setEmployees(res.data);
  }

  useEffect(() => {
    load().catch((e) => toast.error(errorMessage(e)));
  }, [search]);

  async function openCreate() {
    setEditing(null);
    const next = await api<{ unique_id: string }>("/employees/next-id");
    setForm({ ...emptyForm, unique_id: next.unique_id });
    setOpen(true);
  }

  function openEdit(user: User) {
    setEditing(user);
    setForm({
      unique_id: user.unique_id,
      name: user.name,
      email: user.email || "",
      phone: user.phone || "",
      address: user.address || "",
      emergency_contact: user.emergency_contact || "",
      status: user.status,
      interview_date: user.interview_date || "",
      joining_date: user.joining_date || "",
      notes: user.notes || "",
      password: "",
      role: user.role || "employee",
    });
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...form };
      if (!payload.password) delete payload.password;
      if (role !== "admin") delete payload.role;

      if (editing) {
        await api(`/employees/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        if (form.password) {
          await api(`/employees/${editing.id}/password`, {
            method: "PATCH",
            body: JSON.stringify({
              password: form.password,
              password_confirmation: form.password,
            }),
          });
        }
        toast.success("Employee updated");
      } else {
        await api("/employees", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Employee added");
      }
      setOpen(false);
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(user: User, status: EmployeeStatus) {
    try {
      await api(`/employees/${user.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success("Status updated");
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <Input
          placeholder="Search name, ID, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={openCreate} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="w-4 h-4" /> Add employee
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unique ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Computers</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-mono text-xs">{e.unique_id}</TableCell>
                <TableCell className="font-medium">{e.name}</TableCell>
                <TableCell>{e.phone || "—"}</TableCell>
                <TableCell>
                  <Select
                    value={e.status}
                    onValueChange={(v) => setStatus(e, v as EmployeeStatus)}
                  >
                    <SelectTrigger className="w-[160px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_LABELS) as EmployeeStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="capitalize">{e.role}</TableCell>
                <TableCell>{e.computers?.length ?? 0}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit employee" : "Add employee"}</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6 space-y-3">
            {editing ? <StatusBadge status={form.status} /> : null}
            <Field label="Unique ID">
              <Input value={form.unique_id} onChange={(e) => setForm({ ...form, unique_id: e.target.value })} />
            </Field>
            <Field label="Full name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Address">
              <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
            <Field label="Emergency contact">
              <Input value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} />
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as EmployeeStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABELS) as EmployeeStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Interview date">
                <Input type="date" value={form.interview_date} onChange={(e) => setForm({ ...form, interview_date: e.target.value })} />
              </Field>
              <Field label="Joining date">
                <Input type="date" value={form.joining_date} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} />
              </Field>
            </div>
            {role === "admin" ? (
              <Field label="Role">
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
            <Field label={editing ? "Reset password (optional)" : "Password (optional until onboard)"}>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            <Field label="Notes">
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
