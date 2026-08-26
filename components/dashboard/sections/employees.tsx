"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, Plus } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import type { EmployeeStatus, Role, User } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";
import { inr } from "@/lib/money";
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
import { sortEmployees } from "@/lib/employee-order";

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
  monthly_salary: "",
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
  const [viewing, setViewing] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await api<{ data: User[] }>(`/employees?search=${encodeURIComponent(search)}`);
    setEmployees(sortEmployees(res.data ?? []));
  }

  useEffect(() => {
    load().catch((e) => toast.error(errorMessage(e)));
  }, [search]);

  function upsertEmployee(user: User) {
    setEmployees((prev) => sortEmployees([...prev.filter((e) => e.id !== user.id), user]));
  }

  async function openCreate() {
    setEditing(null);
    const next = await api<{ unique_id: string }>("/employees/next-id");
    setForm({ ...emptyForm, unique_id: next.unique_id });
    setOpen(true);
  }

  function openEdit(user: User) {
    setViewing(null);
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
      monthly_salary: user.monthly_salary != null ? String(user.monthly_salary) : "",
      notes: user.notes || "",
      password: "",
      role: user.role || "employee",
    });
    setOpen(true);
  }

  async function openView(user: User) {
    setViewing(user);
    try {
      const res = await api<{ data: User }>(`/employees/${user.id}`);
      setViewing(res.data);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function save() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...form };
      if (!payload.password) delete payload.password;
      if (role !== "admin") delete payload.role;
      payload.monthly_salary = form.monthly_salary === "" ? null : Number(form.monthly_salary);
      if (editing) delete payload.unique_id;

      if (editing) {
        const res = await api<{ data: User }>(`/employees/${editing.id}`, {
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
        if (res.data) upsertEmployee(res.data);
        toast.success("Employee updated");
      } else {
        const res = await api<{ data: User }>("/employees", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (res.data) upsertEmployee(res.data);
        toast.success("Employee added");
      }
      setOpen(false);
      setEditing(null);
      if (search) {
        setSearch("");
      } else {
        await load();
      }
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(user: User, status: EmployeeStatus) {
    try {
      const res = await api<{ data: User }>(`/employees/${user.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      if (res.data) upsertEmployee(res.data);
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
              <TableHead>Salary</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Computers</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-mono text-xs">{e.unique_id}</TableCell>
                <TableCell className="font-medium">
                  <button
                    type="button"
                    className="text-left hover:underline underline-offset-2"
                    onClick={() => openView(e)}
                  >
                    {e.name}
                  </button>
                </TableCell>
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
                <TableCell>{e.monthly_salary != null ? inr(e.monthly_salary) : "—"}</TableCell>
                <TableCell className="capitalize">{e.role}</TableCell>
                <TableCell>{e.computers?.length ?? 0}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openView(e)}>
                      <Eye className="w-4 h-4" />
                      View
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>
                      Edit
                    </Button>
                  </div>
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
              <Input
                value={form.unique_id}
                readOnly
                className="font-mono bg-secondary/50"
              />
              <p className="text-xs text-muted-foreground">
                {editing ? "IDs are assigned in sequence and cannot be changed." : "Next ID is assigned automatically."}
              </p>
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
            <Field label="Monthly salary (₹)">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.monthly_salary}
                onChange={(e) => setForm({ ...form, monthly_salary: e.target.value })}
                placeholder="30000"
              />
            </Field>
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

      <Sheet open={Boolean(viewing)} onOpenChange={(next) => { if (!next) setViewing(null); }}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          {viewing ? (
            <>
              <SheetHeader>
                <SheetTitle>Employee details</SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-6 space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold leading-tight">{viewing.name}</div>
                    <div className="font-mono text-xs text-muted-foreground mt-1">{viewing.unique_id}</div>
                  </div>
                  <StatusBadge status={viewing.status} />
                </div>

                <DetailGroup title="Contact">
                  <DetailRow label="Phone" value={viewing.phone} />
                  <DetailRow label="Email" value={viewing.email} />
                  <DetailRow label="Address" value={viewing.address} />
                  <DetailRow label="Emergency contact" value={viewing.emergency_contact} />
                </DetailGroup>

                <DetailGroup title="Employment">
                  <DetailRow label="Role" value={viewing.role} capitalize />
                  <DetailRow label="Status" value={STATUS_LABELS[viewing.status] || viewing.status} />
                  <DetailRow label="Interview date" value={formatDate(viewing.interview_date)} />
                  <DetailRow label="Joining date" value={formatDate(viewing.joining_date)} />
                  <DetailRow
                    label="Monthly salary"
                    value={viewing.monthly_salary != null ? inr(viewing.monthly_salary) : null}
                  />
                </DetailGroup>

                <DetailGroup title="Computers">
                  {(viewing.computers?.length ?? 0) === 0 ? (
                    <p className="text-sm text-muted-foreground">No computer assigned.</p>
                  ) : (
                    <ul className="space-y-2">
                      {viewing.computers?.map((c) => (
                        <li key={c.assignment_id} className="text-sm flex justify-between gap-3">
                          <span className="font-mono">{c.unique_number}</span>
                          <span className="text-muted-foreground text-right">
                            {c.label || "Computer"}
                            {c.assigned_at ? ` · since ${formatDate(c.assigned_at)}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </DetailGroup>

                <DetailGroup title="Notes">
                  <p className="text-sm whitespace-pre-wrap">{viewing.notes || "—"}</p>
                </DetailGroup>

                <DetailGroup title="Record">
                  <DetailRow label="Added" value={formatDateTime(viewing.created_at)} />
                  <DetailRow label="Updated" value={formatDateTime(viewing.updated_at)} />
                </DetailGroup>

                <Button
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                  onClick={() => openEdit(viewing)}
                >
                  Edit employee
                </Button>
              </div>
            </>
          ) : null}
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

function DetailGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="rounded-xl border border-border bg-secondary/20 p-3 space-y-2">{children}</div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string | null | undefined;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`text-right ${capitalize ? "capitalize" : ""} ${value ? "" : "text-muted-foreground"}`}>
        {value || "—"}
      </span>
    </div>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
