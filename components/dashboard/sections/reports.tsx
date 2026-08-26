"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import type { TodayTask, User } from "@/lib/types";
import { isStaff } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type TodayPayload = {
  date: string;
  total_clicks: number;
  submitted: boolean;
  data: TodayTask[];
};

type ReportIndex = {
  from: string;
  to: string;
  totals: { clicks: number; reports: number; employees: number };
  by_employee: { employee_id: number; name: string; unique_id: string; clicks: number }[];
  by_site: { site_id: number; name: string; clicks: number }[];
  data: {
    id: number;
    employee_name: string;
    unique_id: string;
    site_name: string;
    keyword: string;
    work_date: string;
    click_count: number;
  }[];
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function ReportsSection() {
  const { role } = useAuth();
  const staff = isStaff(role);

  if (staff) return <ManagerReports />;
  return <EmployeeReport />;
}

function EmployeeReport() {
  const [payload, setPayload] = useState<TodayPayload | null>(null);
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await api<TodayPayload>("/my/today");
    setPayload(res);
    const next: Record<number, string> = {};
    res.data.forEach((row) => {
      next[row.assignment_id] = row.click_count != null ? String(row.click_count) : "";
    });
    setCounts(next);
  }

  useEffect(() => {
    load().catch((e) => toast.error(errorMessage(e)));
  }, []);

  async function submit() {
    if (!payload) return;
    setSaving(true);
    try {
      await api("/my/reports", {
        method: "POST",
        body: JSON.stringify({
          date: payload.date,
          items: payload.data.map((row) => ({
            assignment_id: row.assignment_id,
            click_count: Number(counts[row.assignment_id] || 0),
          })),
        }),
      });
      toast.success("Report submitted");
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (!payload) return <div className="text-muted-foreground">Loading today's work...</div>;

  if (payload.data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
        No sites assigned today. If your manager did not schedule you, yesterday's work is copied overnight.
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <p className="text-sm text-muted-foreground">
        Enter clicks for each assigned site, then submit at end of day. You can update today's numbers until midnight.
      </p>
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        {payload.data.map((row) => (
          <div key={row.assignment_id} className="grid grid-cols-[1fr_140px] gap-4 items-end">
            <div>
              <div className="font-medium">{row.site_name}</div>
              <div className="text-xs text-muted-foreground">{row.keyword}</div>
              {row.target_clicks ? (
                <div className="text-xs text-muted-foreground mt-1">Target {row.target_clicks}</div>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>Clicks</Label>
              <Input
                type="number"
                min={0}
                value={counts[row.assignment_id] ?? ""}
                onChange={(e) => setCounts({ ...counts, [row.assignment_id]: e.target.value })}
              />
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-muted-foreground">
            Total{" "}
            <span className="text-foreground font-semibold">
              {payload.data.reduce((sum, row) => sum + Number(counts[row.assignment_id] || 0), 0)}
            </span>
          </div>
          <Button onClick={submit} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {saving ? "Saving..." : payload.submitted ? "Update report" : "Submit EOD"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ManagerReports() {
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [employeeId, setEmployeeId] = useState("all");
  const [employees, setEmployees] = useState<User[]>([]);
  const [report, setReport] = useState<ReportIndex | null>(null);

  async function load() {
    const qs = new URLSearchParams({ from, to });
    if (employeeId !== "all") qs.set("employee_id", employeeId);
    const res = await api<ReportIndex>(`/reports?${qs.toString()}`);
    setReport(res);
  }

  useEffect(() => {
    api<{ data: User[] }>("/employees").then((r) => setEmployees(r.data)).catch(() => undefined);
  }, []);

  useEffect(() => {
    load().catch((e) => toast.error(errorMessage(e)));
  }, [from, to, employeeId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1.5">
          <Label>From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1.5">
          <Label>To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1.5">
          <Label>Employee</Label>
          <select
            className="h-9 rounded-md border border-input bg-input px-3 text-sm"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            <option value="all">All</option>
            {employees.filter((e) => e.role === "employee").map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
      </div>

      {report ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Stat label="Total clicks" value={report.totals.clicks.toLocaleString()} />
            <Stat label="Line items" value={String(report.totals.reports)} />
            <Stat label="Employees" value={String(report.totals.employees)} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold mb-3">By employee</h3>
              {report.by_employee.map((r) => (
                <div key={r.employee_id} className="flex justify-between text-sm py-1">
                  <span>{r.name}</span>
                  <span className="font-medium">{r.clicks.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold mb-3">By site</h3>
              {report.by_site.map((r) => (
                <div key={r.site_id} className="flex justify-between text-sm py-1">
                  <span>{r.name}</span>
                  <span className="font-medium">{r.clicks.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Keyword</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.work_date}</TableCell>
                    <TableCell>{r.employee_name}</TableCell>
                    <TableCell>{r.site_name}</TableCell>
                    <TableCell>{r.keyword}</TableCell>
                    <TableCell className="text-right font-medium">{r.click_count.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
