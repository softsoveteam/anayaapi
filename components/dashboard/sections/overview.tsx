"use client";

import { useCallback, useEffect, useState } from "react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { SessionLogs, WorkSessionHero, useWorkSession } from "@/components/dashboard/work-session-panel";
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
    sessions_needed?: number;
  };
  pending_eod?: { id: number; unique_id: string; name: string }[];
  unscheduled?: { id: number; unique_id: string; name: string }[];
  trend?: { date: string; clicks: number }[];
  top_performers?: { employee_id: number; name: string; unique_id: string; clicks: number }[];
  assignments?: {
    id: number;
    site_name: string;
    site_url?: string | null;
    keyword: string;
    target_clicks: number | null;
    click_count: number | null;
    remaining?: number | null;
  }[];
  attendance?: Attendance;
};

type Attendance = {
  status: string;
  label: string;
  in_at: string | null;
  last_at: string | null;
  late: boolean;
  remaining_seconds?: number;
};

function changeType(n: number | null | undefined): "positive" | "negative" | "neutral" {
  if (n == null || n === 0) return "neutral";
  return n > 0 ? "positive" : "negative";
}

export function OverviewSection() {
  const { role } = useAuth();
  const staff = isStaff(role);
  const [data, setData] = useState<Dashboard | null>(null);

  const loadDashboard = useCallback(() => {
    api<Dashboard>("/dashboard").then(setData).catch(() => setData(null));
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const session = useWorkSession(loadDashboard, !staff);

  if (!data) {
    return <div className="text-muted-foreground">Loading dashboard...</div>;
  }

  const change = data.metrics.clicks_change ?? 0;

  if (!staff) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Today's clicks"
            value={String(session.payload?.today_clicks ?? data.metrics.today_clicks)}
            change="auto counted"
            changeType="neutral"
            icon={MousePointerClick}
            delay={0}
          />
          <MetricCard
            title="Yesterday"
            value={(data.metrics.yesterday_clicks ?? 0).toLocaleString()}
            change="clicks"
            changeType="neutral"
            icon={ClipboardList}
            delay={1}
          />
          <MetricCard
            title="Still needed"
            value={String(data.metrics.sessions_needed ?? data.assignments?.reduce((s, a) => s + (a.remaining ?? 0), 0) ?? 0)}
            change="to hit targets"
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {data.attendance ? <AttendanceBanner attendance={data.attendance} /> : null}
            <WorkSessionHero
              payload={session.payload}
              remaining={session.remaining}
              busy={session.busy}
              onStart={session.start}
            />
          </div>
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-base font-semibold mb-1">Today's work</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Each finished Work Start adds 1 click to every site + keyword below.
            </p>
            {(data.assignments || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No work assigned today.</p>
            ) : (
              <div className="space-y-3">
                {data.assignments?.map((a) => {
                  const done = a.click_count ?? 0;
                  const target = a.target_clicks;
                  const remaining = a.remaining ?? (target != null ? Math.max(0, target - done) : null);
                  const pct = target ? Math.min(100, (done / target) * 100) : 0;
                  return (
                    <div key={a.id} className="rounded-xl border border-border p-3 space-y-2">
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Site</div>
                        <div className="text-sm font-semibold leading-tight">{a.site_name || "Untitled site"}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Keyword</div>
                        <div className="text-sm text-foreground">{a.keyword || "—"}</div>
                      </div>
                      <div className="flex items-end justify-between gap-2">
                        <div>
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Done / target</div>
                          <div className="text-sm font-medium tabular-nums">
                            {done} / {target ?? "no target"}
                          </div>
                        </div>
                        <div className="text-right">
                          {remaining != null && remaining > 0 ? (
                            <div className="text-xs font-medium text-warning">Need {remaining} more</div>
                          ) : target != null ? (
                            <div className="text-xs font-medium text-accent">Target met</div>
                          ) : (
                            <div className="text-xs text-muted-foreground">No target</div>
                          )}
                        </div>
                      </div>
                      {target ? (
                        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <SessionLogs logs={session.payload?.logs ?? []} />
      </div>
    );
  }

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
            Top today
          </h3>
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
        </div>
      </div>

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
    </div>
  );
}

function AttendanceBanner({ attendance }: { attendance: Attendance }) {
  const tone =
    attendance.status === "on_timer"
      ? "border-accent/40 bg-accent/10 text-accent"
      : attendance.status === "idle" || attendance.late
        ? "border-warning/40 bg-warning/10 text-warning"
        : attendance.status === "on_leave" || attendance.status === "holiday"
          ? "border-chart-3/40 bg-chart-3/10"
          : "border-border bg-card";

  return (
    <div className={`rounded-2xl border px-4 py-3 flex flex-wrap items-center justify-between gap-2 ${tone}`}>
      <div>
        <div className="text-xs uppercase tracking-wide opacity-80">Today</div>
        <div className="font-semibold">{attendance.label}</div>
      </div>
      <div className="text-sm text-muted-foreground">
        {attendance.in_at
          ? `In ${new Date(attendance.in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
          : "Not started"}
        {attendance.late ? " · Late after 9:15" : ""}
      </div>
    </div>
  );
}
