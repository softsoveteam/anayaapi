"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type ReportIndex = {
  from: string;
  to: string;
  totals: { clicks: number; reports: number; employees: number };
  by_employee: { employee_id: number; name: string; unique_id: string; clicks: number }[];
  by_site: { site_id: number; name: string; clicks: number }[];
  by_day: { date: string; clicks: number }[];
};

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function AnalyticsSection() {
  const [report, setReport] = useState<ReportIndex | null>(null);

  useEffect(() => {
    const from = daysAgo(13);
    const to = new Date().toISOString().slice(0, 10);
    api<ReportIndex>(`/reports?from=${from}&to=${to}`)
      .then(setReport)
      .catch((e) => toast.error(errorMessage(e)));
  }, []);

  if (!report) return <div className="text-muted-foreground">Loading analytics...</div>;

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-sm text-muted-foreground">Last 14 days</div>
          <div className="text-2xl font-bold mt-1">{report.totals.clicks.toLocaleString()} clicks</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-sm text-muted-foreground">Employees reporting</div>
          <div className="text-2xl font-bold mt-1">{report.totals.employees}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-sm text-muted-foreground">Report lines</div>
          <div className="text-2xl font-bold mt-1">{report.totals.reports}</div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 h-[360px]">
        <h3 className="font-semibold mb-4">Clicks by day</h3>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={report.by_day}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.005 260)" />
            <XAxis dataKey="date" tick={{ fill: "oklch(0.65 0 0)", fontSize: 12 }} />
            <YAxis tick={{ fill: "oklch(0.65 0 0)", fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                background: "oklch(0.12 0.005 260)",
                border: "1px solid oklch(0.22 0.005 260)",
                borderRadius: 8,
              }}
            />
            <Bar dataKey="clicks" fill="oklch(0.7 0.18 145)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-3">By employee</h3>
          {report.by_employee.map((r) => (
            <div key={r.employee_id} className="flex justify-between text-sm py-1.5 border-b border-border last:border-0">
              <span>{r.name} <span className="text-muted-foreground">{r.unique_id}</span></span>
              <span className="font-medium">{r.clicks.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-3">By site</h3>
          {report.by_site.map((r) => (
            <div key={r.site_id} className="flex justify-between text-sm py-1.5 border-b border-border last:border-0">
              <span>{r.name}</span>
              <span className="font-medium">{r.clicks.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
