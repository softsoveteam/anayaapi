"use client";

import { useCallback, useEffect, useState } from "react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { SessionLogs, WorkSessionHero, useWorkSession } from "@/components/dashboard/work-session-panel";
import { WorkSiteCard } from "@/components/dashboard/site-mark";
import { MousePointerClick, Users, ClipboardList, Monitor, Timer } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { isStaff } from "@/lib/types";
import type { Pace, TeamPace } from "@/lib/pace";
import { liveExpectedRemaining, liveTeamRemaining } from "@/lib/pace";
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
    expected_remaining?: number;
    expected_today?: number;
  };
  pending_eod?: { id: number; unique_id: string; name: string }[];
  unscheduled?: { id: number; unique_id: string; name: string }[];
  trend?: { date: string; clicks: number }[];
  top_performers?: { employee_id: number; name: string; unique_id: string; clicks: number }[];
  assignments?: {
    id: number;
    site_name: string;
    site_url?: string | null;
    site_domain?: string | null;
    site_favicon?: string | null;
    keyword: string;
    click_count: number | null;
  }[];
  attendance?: Attendance;
  expected?: Pace | TeamPace;
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

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}

function isTeamPace(value: Pace | TeamPace | undefined): value is TeamPace {
  return Boolean(value && "data" in value && Array.isArray(value.data));
}

export function OverviewSection() {
  const { role } = useAuth();
  const staff = isStaff(role);
  const [data, setData] = useState<Dashboard | null>(null);
  const now = useNow(1000);

  const loadDashboard = useCallback(() => {
    api<Dashboard>("/dashboard").then(setData).catch(() => setData(null));
  }, []);

  useEffect(() => {
    loadDashboard();
    const id = window.setInterval(loadDashboard, 15000);
    return () => window.clearInterval(id);
  }, [loadDashboard]);

  const session = useWorkSession(loadDashboard, !staff);

  if (!data) {
    return <div className="text-muted-foreground">Loading dashboard...</div>;
  }

  const change = data.metrics.clicks_change ?? 0;
  const employeePace = !isTeamPace(data.expected) ? data.expected : undefined;
  const teamPace = isTeamPace(data.expected) ? data.expected : undefined;
  const expectedLeft = employeePace
    ? liveExpectedRemaining(employeePace, now)
    : liveTeamRemaining(teamPace?.data, now);
  const perSession = session.payload?.pace?.clicks_per_session ?? employeePace?.clicks_per_session ?? 0;

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
            title="Expected till 6pm"
            value={expectedLeft.toLocaleString()}
            change={perSession ? `${perSession} per session` : "computers × tabs"}
            changeType="neutral"
            icon={Timer}
            delay={1}
          />
          <MetricCard
            title="My computers"
            value={String(employeePace?.computers ?? data.metrics.computers_assigned ?? 0)}
            change={`${employeePace?.tabs ?? employeePace?.sites ?? data.assignments?.length ?? 0} tabs`}
            changeType="neutral"
            icon={Monitor}
            delay={2}
          />
          <MetricCard
            title="Yesterday"
            value={(data.metrics.yesterday_clicks ?? 0).toLocaleString()}
            change="clicks"
            changeType="neutral"
            icon={ClipboardList}
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
              {employeePace?.multiple_keywords
                ? `Open the domain, then search the keyword in its own tab on every computer. Each finished ${employeePace.session_minutes}-min session adds ${employeePace.computers} click${employeePace.computers === 1 ? "" : "s"} per keyword.`
                : `Open the domain on every computer (one tab per site). Each finished ${employeePace?.session_minutes ?? 5}-min session adds ${employeePace?.computers ?? 0} click${employeePace?.computers === 1 ? "" : "s"} per site.`}
            </p>
            {(data.assignments || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No work assigned today.</p>
            ) : (
              <div className="space-y-3">
                {data.assignments?.map((a) => (
                  <WorkSiteCard
                    key={a.id}
                    siteName={a.site_name}
                    siteUrl={a.site_url}
                    siteDomain={a.site_domain}
                    siteFavicon={a.site_favicon}
                    keyword={a.keyword}
                    clicks={a.click_count}
                    hint={
                      employeePace?.multiple_keywords
                        ? `+${employeePace.computers} / session`
                        : "counted per site"
                    }
                  />
                ))}
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
          title="Expected till 6pm"
          value={expectedLeft.toLocaleString()}
          change="live · computers × tabs"
          changeType="neutral"
          icon={Timer}
          delay={1}
        />
        <MetricCard
          title="Joined employees"
          value={String(data.metrics.active_employees ?? 0)}
          change="active"
          changeType="neutral"
          icon={Users}
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
          <h3 className="text-base font-semibold mb-4">Top today</h3>
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

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold">Live expected till 6:00 PM</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Remaining sessions × computers × tabs (sites, or every keyword when Multiple keywords is on).
          </p>
        </div>
        {(teamPace?.data || []).length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">No joined employees.</p>
        ) : (
          <div className="divide-y divide-border">
            {teamPace?.data.map((row) => {
              const left = liveExpectedRemaining(row, now);
              return (
                <div key={row.employee_id} className="px-5 py-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">{row.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.unique_id} · {row.computers} computer{row.computers === 1 ? "" : "s"} × {row.tabs ?? row.sites} tab{(row.tabs ?? row.sites) === 1 ? "" : "s"} = {row.clicks_per_session}/session
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold tabular-nums">{left.toLocaleString()} left</div>
                    <div className="text-xs text-muted-foreground">{row.done.toLocaleString()} done</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
