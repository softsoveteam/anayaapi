"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { api, ApiError, errorMessage } from "@/lib/api";
import type { Computer, User } from "@/lib/types";
import { isStaff } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export function ComputersSection() {
  const { role } = useAuth();
  const staff = isStaff(role);
  const [computers, setComputers] = useState<Computer[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState<Computer | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [form, setForm] = useState({ unique_number: "", label: "", notes: "" });
  const [nextBusy, setNextBusy] = useState(false);

  async function load() {
    const path = staff ? "/computers" : "/my/computers";
    const res = await api<{ data: Computer[] }>(path);
    setComputers(res.data);
    if (staff) {
      const emps = await api<{ data: User[] }>("/employees");
      setEmployees(emps.data);
    }
  }

  useEffect(() => {
    load().catch((e) => toast.error(errorMessage(e)));
  }, [staff]);

  async function openCreate() {
    setForm({ unique_number: "", label: "", notes: "" });
    setOpen(true);
    setNextBusy(true);
    try {
      const next = await api<{ unique_number: string; label: string }>("/computers/next-number");
      setForm({ unique_number: next.unique_number, label: next.label, notes: "" });
    } catch (e) {
      toast.error(errorMessage(e));
      setOpen(false);
    } finally {
      setNextBusy(false);
    }
  }

  async function create() {
    try {
      const res = await api<{ data: Computer }>("/computers", {
        method: "POST",
        body: JSON.stringify({ notes: form.notes || null }),
      });
      toast.success(`Computer ${res.data.unique_number} added`);
      setOpen(false);
      setForm({ unique_number: "", label: "", notes: "" });
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function assign(force = false) {
    if (!assignOpen || !employeeId) return;
    try {
      await api(`/computers/${assignOpen.id}/assign`, {
        method: "POST",
        body: JSON.stringify({ employee_id: Number(employeeId), force }),
      });
      toast.success("Computer assigned");
      setAssignOpen(null);
      await load();
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        const data = e.data as { over_limit?: boolean };
        if (data.over_limit) {
          if (confirm("This employee already has 3 computers. Assign another anyway?")) {
            await assign(true);
            return;
          }
        }
      }
      toast.error(errorMessage(e));
    }
  }

  async function unassign(computer: Computer) {
    try {
      await api(`/computers/${computer.id}/unassign`, { method: "POST" });
      toast.success("Unassigned");
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="space-y-4">
      {staff ? (
        <div className="flex justify-end">
          <Button onClick={openCreate} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="w-4 h-4" /> Add computer
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Machines currently assigned to you.</p>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unique number</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned to</TableHead>
              {staff ? <TableHead /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {computers.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono">{c.unique_number}</TableCell>
                <TableCell>{c.label || "—"}</TableCell>
                <TableCell className="capitalize">{c.status}</TableCell>
                <TableCell>
                  {c.assigned_to ? `${c.assigned_to.name} (${c.assigned_to.unique_id})` : "—"}
                </TableCell>
                {staff ? (
                  <TableCell className="space-x-2">
                    {c.assigned_to ? (
                      <Button variant="ghost" size="sm" onClick={() => unassign(c)}>
                        Unassign
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => { setEmployeeId(""); setAssignOpen(c); }}>
                        Assign
                      </Button>
                    )}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add computer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>PC number</Label>
              <Input value={nextBusy ? "Assigning..." : form.unique_number} readOnly className="font-mono bg-secondary/50" />
              <p className="text-xs text-muted-foreground">Assigned automatically. Next machine gets the next number.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input value={nextBusy ? "Assigning..." : form.label} readOnly className="font-mono bg-secondary/50" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={create} disabled={nextBusy || !form.unique_number} className="bg-accent text-accent-foreground hover:bg-accent/90">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!assignOpen} onOpenChange={() => setAssignOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign {assignOpen?.unique_number}</DialogTitle>
          </DialogHeader>
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
            <SelectContent>
              {employees.filter((e) => e.role === "employee").map((e) => (
                <SelectItem key={e.id} value={String(e.id)}>
                  {e.name} ({e.unique_id}) · {e.computers?.length ?? 0}/3 PCs
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button onClick={() => assign(false)} className="bg-accent text-accent-foreground hover:bg-accent/90">
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
