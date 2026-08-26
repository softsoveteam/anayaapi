"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import type { TodayTask, User } from "@/lib/types";
import { isStaff } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SessionLogs, useWorkSession } from "@/components/dashboard/work-session-panel";
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
  const session = useWorkSession(() => {
    load().catch(() => undefined);
  });

  async function load() {
    const res = await api<TodayPayload>("/my/today");
    setPayload(res);
  }

  useEffect(() => {
    load().catch((e) => toast.error(errorMessage(e)));
  }, []);

  if (!payload) return <div className="text-muted-foreground">Loading today's work...</div>;

  if (payload.data.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
          No sites assigned today. If your manager did not schedule you, yesterday's work is copied overnight.
        </div>
        <SessionLogs logs={session.payload?.logs ?? []} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Clicks are counted from the Work Start timer on Overview. You cannot add numbers by hand.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-sm text-muted-foreground">Today's clicks</div>
          <div className="text-3xl font-bold mt-1 text-accent">{payload.total_clicks.toLocaleString()}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-sm text-muted-foreground">Sessions today</div>
          <div className="text-3xl font-bold mt-1">{session.payload?.today_sessions ?? 0}</div>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-semibold">Today's sites and keywords</h3>
        {payload.data.map((row) => {
          const done = row.click_count ?? 0;
          return (
            <div key={row.assignment_id} className="rounded-xl border border-border p-4 space-y-2">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Site</div>
                  <div className="font-semibold">{row.site_name || "Untitled site"}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Keyword</div>
                  <div className="font-medium">{row.keyword || "—"}</div>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span>Clicks today</span>
                <span className="tabular-nums font-medium">{done}</span>
              </div>
            </div>
          );
        })}
      </div>
      <SessionLogs logs={session.payload?.logs ?? []} />
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
