"use client";

import { useEffect, useState } from "react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MousePointerClick, Users, ClipboardList, Monitor } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { isStaff } from "@/lib/types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Dashboard = {
  today: string;
  metrics: {
    today_clicks: number;
    yesterday_clicks: number;
    clicks_change: number | null;
    active_employees?: number;
    pending_eod?: number;
    computers_assigned?: number;
    computers_available?: number;
    assignments?: number;
    submitted?: number;
  };
  pending_eod?: { id: number; unique_id: string; name: string }[];
  unscheduled?: { id: number; unique_id: string; name: string }[];
  trend?: { date: string; clicks: number }[];
  top_performers?: { employee_id: number; name: string; unique_id: string; clicks: number }[];
  assignments?: { id: number; site_name: string; keyword: string; target_clicks: number | null; click_count: number | null }[];
};

function changeType(n: number | null | undefined): "positive" | "negative" | "neutral" {
  if (n == null || n === 0) return "neutral";
  return n > 0 ? "positive" : "negative";
}

export function OverviewSection() {
  const { role } = useAuth();
  const staff = isStaff(role);
  const [data, setData] = useState<Dashboard | null>(null);

  useEffect(() => {
    api<Dashboard>("/dashboard").then(setData).catch(() => setData(null));
  }, []);

  if (!data) {
    return <div className="text-muted-foreground">Loading dashboard...</div>;
  }

  const change = data.metrics.clicks_change ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Today's clicks"
          value={data.metrics.today_clicks.toLocaleString()}
          change={`${change > 0 ? "+" : ""}${change}%`}
          changeType={changeType(change)}
          icon={MousePointerClick}
          delay={0}
        />
        {staff ? (
          <>
            <MetricCard
              title="Joined employees"
              value={String(data.metrics.active_employees ?? 0)}
              change="active"
              changeType="neutral"
              icon={Users}
              delay={1}
            />
            <MetricCard
              title="Pending EOD"
              value={String(data.metrics.pending_eod ?? 0)}
              change="not submitted"
              changeType={(data.metrics.pending_eod ?? 0) > 0 ? "negative" : "positive"}
              icon={ClipboardList}
              delay={2}
            />
            <MetricCard
              title="Computers assigned"
              value={String(data.metrics.computers_assigned ?? 0)}
              change={`${data.metrics.computers_available ?? 0} free`}
              changeType="neutral"
              icon={Monitor}
              delay={3}
            />
          </>
        ) : (
          <>
            <MetricCard
              title="Yesterday"
              value={(data.metrics.yesterday_clicks ?? 0).toLocaleString()}
              change="clicks"
              changeType="neutral"
              icon={ClipboardList}
              delay={1}
            />
            <MetricCard
              title="Today's tasks"
              value={String(data.metrics.assignments ?? 0)}
              change={`${data.metrics.submitted ?? 0} reported`}
              changeType="neutral"
              icon={Users}
              delay={2}
            />
            <MetricCard
              title="My computers"
              value={String(data.metrics.computers_assigned ?? 0)}
              change="assigned"
              changeType="neutral"
              icon={Monitor}
              delay={3}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 h-[360px]">
          <h3 className="text-base font-semibold mb-4">Click trend</h3>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={data.trend || []}>
              <defs>
                <linearGradient id="clicks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.7 0.18 145)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="oklch(0.7 0.18 145)" stopOpacity={0} />
                </linearGradient>
              </defs>
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
              <Area type="monotone" dataKey="clicks" stroke="oklch(0.7 0.18 145)" fill="url(#clicks)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-base font-semibold mb-4">
            {staff ? "Top today" : "Today's assignments"}
          </h3>
          {staff ? (
            <div className="space-y-3">
              {(data.top_performers || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No reports yet today.</p>
              ) : (
                data.top_performers?.map((p, i) => (
                  <div key={p.employee_id} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{i + 1}. {p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.unique_id}</div>
                    </div>
                    <div className="font-semibold text-accent">{p.clicks.toLocaleString()}</div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {(data.assignments || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No work assigned today.</p>
              ) : (
                data.assignments?.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{a.site_name}</div>
                      <div className="text-xs text-muted-foreground">{a.keyword}</div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {a.click_count ?? "—"} / {a.target_clicks ?? "—"}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {staff ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-base font-semibold mb-3">Pending EOD</h3>
            {(data.pending_eod || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Everyone assigned today has submitted.</p>
            ) : (
              <ul className="space-y-2">
                {data.pending_eod?.map((p) => (
                  <li key={p.id} className="text-sm flex justify-between">
                    <span>{p.name}</span>
                    <span className="text-muted-foreground">{p.unique_id}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-base font-semibold mb-3">Unscheduled today</h3>
            {(data.unscheduled || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">All joined employees have work today.</p>
            ) : (
              <ul className="space-y-2">
                {data.unscheduled?.map((p) => (
                  <li key={p.id} className="text-sm flex justify-between">
                    <span>{p.name}</span>
                    <span className="text-muted-foreground">{p.unique_id}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
